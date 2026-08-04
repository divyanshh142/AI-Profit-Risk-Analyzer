"""
Generic tenant loader — full version.

Loads a tenant's raw CSVs into the canonical schema, in FK-safe order:
products -> vendors -> customers -> orders -> order_items.

Usage:
    python load_data.py --config mapping_configs/olist_mapping.json --raw-dir raw_data/olist
"""

import argparse
import json
import os
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://copilot:copilot_dev_pw@localhost:5432/profit_copilot",
)


def load_config(config_path: str) -> dict:
    with open(config_path) as f:
        return json.load(f)


def get_or_create_tenant(engine, name: str, source_type: str, currency: str) -> int:
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT tenant_id FROM tenants WHERE name = :name"), {"name": name}
        ).fetchone()
        if row:
            return row[0]
        result = conn.execute(
            text(
                "INSERT INTO tenants (name, source_type, currency) "
                "VALUES (:name, :source_type, :currency) RETURNING tenant_id"
            ),
            {"name": name, "source_type": source_type, "currency": currency},
        )
        return result.fetchone()[0]


def rename_and_select(df: pd.DataFrame, column_map: dict) -> pd.DataFrame:
    df = df.rename(columns=column_map)
    keep_cols = [c for c in column_map.values() if c in df.columns]
    return df[keep_cols]


def fetch_pk_map(engine, table: str, pk_col: str, natural_key_col: str, tenant_id: int) -> dict:
    """Build {natural_key_value: primary_key} for foreign-key lookups."""
    with engine.begin() as conn:
        rows = conn.execute(
            text(f"SELECT {natural_key_col}, {pk_col} FROM {table} WHERE tenant_id = :tid"),
            {"tid": tenant_id},
        ).fetchall()
    return {r[0]: r[1] for r in rows}


def clean_order_items(df: pd.DataFrame) -> pd.DataFrame:
    """Basic validation/cleaning before data reaches the DB and models."""
    before = len(df)

    if "selling_price" in df.columns:
        df = df[df["selling_price"] > 0]
        df = df[df["selling_price"] < 50000]
    if "shipping_cost" in df.columns:
        df = df[df["shipping_cost"] >= 0]

    if "estimated_delivery_date" in df.columns:
        df["estimated_delivery_date"] = pd.to_datetime(df["estimated_delivery_date"], errors="coerce")

    after = len(df)
    print(f"    [clean] dropped {before - after} invalid rows ({before} -> {after})")
    return df


# ---------------------------------------------------------------- products
def insert_products(engine, tenant_id: int, products_df: pd.DataFrame):
    with engine.begin() as conn:
        for _, row in products_df.iterrows():
            weight_kg = None
            if "weight_kg_raw_grams" in row and pd.notna(row.get("weight_kg_raw_grams")):
                weight_kg = row["weight_kg_raw_grams"] / 1000
            conn.execute(
                text("""
                    INSERT INTO products (tenant_id, sku_id, category, weight_kg)
                    VALUES (:tenant_id, :sku_id, :category, :weight_kg)
                    ON CONFLICT (tenant_id, sku_id) DO NOTHING
                """),
                {
                    "tenant_id": tenant_id,
                    "sku_id": row["sku_id"],
                    "category": row.get("category"),
                    "weight_kg": weight_kg,
                },
            )
    print(f"    -> inserted/verified {len(products_df)} products")


# ----------------------------------------------------------------- vendors
def insert_vendors(engine, tenant_id: int, order_items_df: pd.DataFrame):
    vendor_ids = order_items_df["vendor_id"].dropna().unique()
    with engine.begin() as conn:
        for vid in vendor_ids:
            conn.execute(
                text("""
                    INSERT INTO vendors (tenant_id, vendor_id)
                    VALUES (:tenant_id, :vendor_id)
                    ON CONFLICT (tenant_id, vendor_id) DO NOTHING
                """),
                {"tenant_id": tenant_id, "vendor_id": vid},
            )
    print(f"    -> inserted/verified {len(vendor_ids)} vendors")


# --------------------------------------------------------------- customers
def insert_customers(engine, tenant_id: int, customers_df: pd.DataFrame):
    with engine.begin() as conn:
        for _, row in customers_df.iterrows():
            conn.execute(
                text("""
                    INSERT INTO customers (tenant_id, customer_id, region)
                    VALUES (:tenant_id, :customer_id, :region)
                    ON CONFLICT (tenant_id, customer_id) DO NOTHING
                """),
                {
                    "tenant_id": tenant_id,
                    "customer_id": row["customer_id"],
                    "region": row.get("region"),
                },
            )
    print(f"    -> inserted/verified {len(customers_df)} customers")


# ------------------------------------------------------------------ orders
def insert_orders(engine, tenant_id: int, orders_df: pd.DataFrame):
    customer_pk_map = fetch_pk_map(engine, "customers", "customer_pk", "customer_id", tenant_id)

    with engine.begin() as conn:
        for _, row in orders_df.iterrows():
            customer_pk = customer_pk_map.get(row["customer_id"])
            if customer_pk is None:
                continue  # skip orders whose customer wasn't loaded
            conn.execute(
                text("""
                    INSERT INTO orders (tenant_id, order_id, customer_pk, order_date)
                    VALUES (:tenant_id, :order_id, :customer_pk, :order_date)
                    ON CONFLICT (tenant_id, order_id) DO NOTHING
                """),
                {
                    "tenant_id": tenant_id,
                    "order_id": row["order_id"],
                    "customer_pk": customer_pk,
                    "order_date": row.get("order_date"),
                },
            )
    print(f"    -> inserted/verified {len(orders_df)} orders")


# ------------------------------------------------------------- order_items
def insert_order_items(engine, tenant_id: int, order_items_df: pd.DataFrame, orders_raw_df: pd.DataFrame):
    order_pk_map = fetch_pk_map(engine, "orders", "order_pk", "order_id", tenant_id)
    product_pk_map = fetch_pk_map(engine, "products", "product_pk", "sku_id", tenant_id)
    vendor_pk_map = fetch_pk_map(engine, "vendors", "vendor_pk", "vendor_id", tenant_id)

    # actual_delivery_date lives in the RAW orders file, not order_items —
    # merge it in by order_id before inserting.
    delivery_lookup = orders_raw_df.set_index("order_id")["order_delivered_customer_date"].to_dict()

    inserted = 0
    with engine.begin() as conn:
        for _, row in order_items_df.iterrows():
            order_pk = order_pk_map.get(row["order_id"])
            product_pk = product_pk_map.get(row["sku_id"])
            vendor_pk = vendor_pk_map.get(row["vendor_id"])
            if None in (order_pk, product_pk, vendor_pk):
                continue  # skip rows we can't fully resolve yet

            est_date = row.get("estimated_delivery_date")
            actual_date = delivery_lookup.get(row["order_id"])

            is_late = None
            if pd.notna(est_date) and actual_date and pd.notna(actual_date):
                is_late = pd.to_datetime(actual_date) > pd.to_datetime(est_date)

            selling_price = row.get("selling_price") or 0
            shipping_cost = row.get("shipping_cost") or 0
            gross_revenue = selling_price
            net_profit = selling_price - shipping_cost  # cost data not available yet, refine later

            conn.execute(
                text("""
                    INSERT INTO order_items (
                        tenant_id, order_pk, order_line_id, product_pk, vendor_pk,
                        selling_price, shipping_cost, estimated_delivery_date,
                        actual_delivery_date, is_late_delivery,
                        gross_revenue, net_profit
                    ) VALUES (
                        :tenant_id, :order_pk, :order_line_id, :product_pk, :vendor_pk,
                        :selling_price, :shipping_cost, :estimated_delivery_date,
                        :actual_delivery_date, :is_late_delivery,
                        :gross_revenue, :net_profit
                    )
                """),
                {
                    "tenant_id": tenant_id,
                    "order_pk": order_pk,
                    "order_line_id": row.get("order_line_id"),
                    "product_pk": product_pk,
                    "vendor_pk": vendor_pk,
                    "selling_price": selling_price,
                    "shipping_cost": shipping_cost,
                    "estimated_delivery_date": est_date if pd.notna(est_date) else None,
                    "actual_delivery_date": actual_date if actual_date and pd.notna(actual_date) else None,
                    "is_late_delivery": bool(is_late) if is_late is not None else None,
                    "gross_revenue": gross_revenue,
                    "net_profit": net_profit,
                },
            )
            inserted += 1
    print(f"    -> inserted {inserted} order_items (of {len(order_items_df)} rows seen)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--raw-dir", required=True)
    args = parser.parse_args()

    config = load_config(args.config)
    engine = create_engine(DB_URL)

    tenant_id = get_or_create_tenant(
        engine, config["tenant"], config["source_type"], config["currency"]
    )
    print(f"Tenant '{config['tenant']}' -> tenant_id={tenant_id}")

    mapped = {}
    raw_orders_df = None

    for table_name, table_cfg in config["tables"].items():
        csv_path = Path(args.raw_dir) / table_cfg["source_file"]
        if not csv_path.exists():
            print(f"  [skip] {csv_path} not found")
            continue

        raw_df = pd.read_csv(csv_path)
        if table_name == "orders":
            raw_orders_df = raw_df.copy()  # keep raw version for actual_delivery_date later

        mapped_df = rename_and_select(raw_df, table_cfg["column_map"])
        mapped_df["tenant_id"] = tenant_id
        mapped[table_name] = mapped_df
        print(f"  [{table_name}] mapped {len(mapped_df)} rows")

    # Insert in FK-safe order
    if "products" in mapped:
        print("  Inserting products...")
        insert_products(engine, tenant_id, mapped["products"])

    if "order_items" in mapped:
        print("  Inserting vendors (derived from order_items)...")
        insert_vendors(engine, tenant_id, mapped["order_items"])

    if "customers" in mapped:
        print("  Inserting customers...")
        insert_customers(engine, tenant_id, mapped["customers"])

    if "orders" in mapped:
        print("  Inserting orders...")
        insert_orders(engine, tenant_id, mapped["orders"])

    if "order_items" in mapped and raw_orders_df is not None:
        print("  Cleaning order_items...")
        mapped["order_items"] = clean_order_items(mapped["order_items"])
        print("  Inserting order_items...")
        insert_order_items(engine, tenant_id, mapped["order_items"], raw_orders_df)

    print("\nDone. Check pgAdmin to see the row counts in each canonical table.")


if __name__ == "__main__":
    main()