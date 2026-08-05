"""
Loads a synthetic tenant (A, B, or C) into the canonical schema, including
the fields Olist doesn't have: unit_cost, discount_rate, quantity, and
GENUINE is_returned / return_reason. Includes a basic data-cleaning step
before order_items are inserted.

Usage:
    python load_synthetic_tenant.py --config mapping_configs/synthetic_a_mapping.json --raw-dir synthetic_data/tenant_a
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


def load_config(path):
    with open(path) as f:
        return json.load(f)


def mark_capability(engine, tenant_id: int, column: str):
    """Flip one supports_* flag on in tenant_capabilities."""
    with engine.begin() as conn:
        conn.execute(
            text(f"""
                INSERT INTO tenant_capabilities (tenant_id, {column})
                VALUES (:tid, TRUE)
                ON CONFLICT (tenant_id) DO UPDATE SET {column} = TRUE
            """),
            {"tid": tenant_id},
        )


def get_or_create_tenant(engine, name, source_type, currency):
    with engine.begin() as conn:
        row = conn.execute(text("SELECT tenant_id FROM tenants WHERE name = :n"), {"n": name}).fetchone()
        if row:
            return row[0]
        result = conn.execute(
            text("INSERT INTO tenants (name, source_type, currency) VALUES (:n, :s, :c) RETURNING tenant_id"),
            {"n": name, "s": source_type, "c": currency},
        )
        return result.fetchone()[0]


def rename_and_select(df, column_map):
    df = df.rename(columns=column_map)
    keep = [c for c in column_map.values() if c in df.columns]
    return df[keep]


def fetch_pk_map(engine, table, pk_col, key_col, tenant_id):
    with engine.begin() as conn:
        rows = conn.execute(
            text(f"SELECT {key_col}, {pk_col} FROM {table} WHERE tenant_id = :tid"), {"tid": tenant_id}
        ).fetchall()
    return {r[0]: r[1] for r in rows}


def clean_order_items(df: pd.DataFrame) -> pd.DataFrame:
    """Basic validation/cleaning before data reaches the DB and models."""
    before = len(df)

    if "selling_price" in df.columns:
        df = df[df["selling_price"] > 0]
        df = df[df["selling_price"] < 50000]
    if "quantity" in df.columns:
        df = df[df["quantity"] > 0]
    if "shipping_cost" in df.columns:
        df = df[df["shipping_cost"] >= 0]

    if "category" in df.columns:
        df["category"] = df["category"].astype(str).str.strip().str.lower()

    if "estimated_delivery_date" in df.columns:
        df["estimated_delivery_date"] = pd.to_datetime(df["estimated_delivery_date"], errors="coerce")
    if "actual_delivery_date" in df.columns:
        df["actual_delivery_date"] = pd.to_datetime(df["actual_delivery_date"], errors="coerce")

    after = len(df)
    print(f"    [clean] dropped {before - after} invalid rows ({before} -> {after})")
    return df


def insert_products(engine, tenant_id, df):
    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(
                text("""
                    INSERT INTO products (tenant_id, sku_id, category, unit_cost, list_price)
                    VALUES (:tenant_id, :sku_id, :category, :unit_cost, :list_price)
                    ON CONFLICT (tenant_id, sku_id) DO NOTHING
                """),
                {
                    "tenant_id": tenant_id,
                    "sku_id": row["sku_id"],
                    "category": row.get("category"),
                    "unit_cost": row.get("unit_cost"),
                    "list_price": row.get("list_price"),
                },
            )
    print(f"    -> {len(df)} products")


def insert_vendors(engine, tenant_id, order_items_df):
    if "vendor_id" not in order_items_df.columns:
        print("    -> no vendor_id in this tenant, skipping vendors")
        return
    ids = order_items_df["vendor_id"].dropna().unique()
    with engine.begin() as conn:
        for vid in ids:
            conn.execute(
                text("""
                    INSERT INTO vendors (tenant_id, vendor_id) VALUES (:t, :v)
                    ON CONFLICT (tenant_id, vendor_id) DO NOTHING
                """),
                {"t": tenant_id, "v": vid},
            )
    print(f"    -> {len(ids)} vendors")


def insert_customers(engine, tenant_id, df):
    if df is None or "customer_id" not in df.columns:
        print("    -> no customers table for this tenant, skipping")
        return
    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(
                text("""
                    INSERT INTO customers (tenant_id, customer_id, region) VALUES (:t, :c, :r)
                    ON CONFLICT (tenant_id, customer_id) DO NOTHING
                """),
                {"t": tenant_id, "c": row["customer_id"], "r": row.get("region")},
            )
    print(f"    -> {len(df)} customers")


def insert_orders(engine, tenant_id, df):
    cust_map = fetch_pk_map(engine, "customers", "customer_pk", "customer_id", tenant_id)
    with engine.begin() as conn:
        for _, row in df.iterrows():
            customer_pk = cust_map.get(row["customer_id"]) if "customer_id" in df.columns else None
            conn.execute(
                text("""
                    INSERT INTO orders (tenant_id, order_id, customer_pk, order_date)
                    VALUES (:t, :o, :c, :d)
                    ON CONFLICT (tenant_id, order_id) DO NOTHING
                """),
                {"t": tenant_id, "o": row["order_id"], "c": customer_pk, "d": row.get("order_date")},
            )
    print(f"    -> {len(df)} orders")


def insert_order_items(engine, tenant_id, df):
    order_map = fetch_pk_map(engine, "orders", "order_pk", "order_id", tenant_id)
    product_map = fetch_pk_map(engine, "products", "product_pk", "sku_id", tenant_id)
    vendor_map = fetch_pk_map(engine, "vendors", "vendor_pk", "vendor_id", tenant_id) if "vendor_id" in df.columns else {}

    inserted = 0
    late_delivery_known = 0  # rows where the source actually gave us is_late_delivery
    with engine.begin() as conn:
        for _, row in df.iterrows():
            order_pk = order_map.get(row["order_id"])
            product_pk = product_map.get(row["sku_id"])
            if order_pk is None or product_pk is None:
                continue
            vendor_pk = vendor_map.get(row.get("vendor_id")) if vendor_map else None

            if row.get("is_late_delivery") is not None and pd.notna(row.get("is_late_delivery")):
                late_delivery_known += 1

            selling_price = row.get("selling_price") or 0
            quantity = row.get("quantity") or 1
            unit_cost = row.get("unit_cost")
            shipping_cost = row.get("shipping_cost") or 0
            product_cost = (unit_cost * quantity) if unit_cost is not None else None
            gross_revenue = selling_price * quantity
            net_profit = (gross_revenue - product_cost - shipping_cost) if product_cost is not None else (gross_revenue - shipping_cost)

            conn.execute(
                text("""
                    INSERT INTO order_items (
                        tenant_id, order_pk, order_line_id, product_pk, vendor_pk,
                        quantity, selling_price, discount_rate, shipping_cost,
                        estimated_delivery_date, actual_delivery_date, is_late_delivery,
                        is_returned, return_reason, gross_revenue, product_cost, net_profit
                    ) VALUES (
                        :tenant_id, :order_pk, :order_line_id, :product_pk, :vendor_pk,
                        :quantity, :selling_price, :discount_rate, :shipping_cost,
                        :est_date, :act_date, :is_late,
                        :is_returned, :return_reason, :gross_revenue, :product_cost, :net_profit
                    )
                """),
                {
                    "tenant_id": tenant_id,
                    "order_pk": order_pk,
                    "order_line_id": row.get("order_line_id"),
                    "product_pk": product_pk,
                    "vendor_pk": vendor_pk,
                    "quantity": int(quantity),
                    "selling_price": selling_price,
                    "discount_rate": row.get("discount_rate"),
                    "shipping_cost": shipping_cost,
                    "est_date": row.get("estimated_delivery_date"),
                    "act_date": row.get("actual_delivery_date"),
                    "is_late": row.get("is_late_delivery"),
                    "is_returned": row.get("is_returned"),
                    "return_reason": row.get("return_reason"),
                    "gross_revenue": gross_revenue,
                    "product_cost": product_cost,
                    "net_profit": net_profit,
                },
            )
            inserted += 1
    print(f"    -> {inserted} order_items (of {len(df)} rows seen)")
    return inserted, late_delivery_known


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--raw-dir", required=True)
    args = parser.parse_args()

    config = load_config(args.config)
    engine = create_engine(DB_URL)
    tenant_id = get_or_create_tenant(engine, config["tenant"], config["source_type"], config["currency"])
    print(f"Tenant '{config['tenant']}' -> tenant_id={tenant_id}")

    mapped = {}
    for table_name, table_cfg in config["tables"].items():
        path = Path(args.raw_dir) / table_cfg["source_file"]
        if not path.exists():
            print(f"  [skip] {path} not found")
            continue
        raw_df = pd.read_csv(path)
        mapped[table_name] = rename_and_select(raw_df, table_cfg["column_map"])
        print(f"  [{table_name}] mapped {len(mapped[table_name])} rows")

    # FK-safe order: products -> vendors -> customers -> orders -> order_items
    if "products" in mapped:
        print("  Inserting products...")
        insert_products(engine, tenant_id, mapped["products"])

    if "order_items" in mapped:
        print("  Inserting vendors...")
        insert_vendors(engine, tenant_id, mapped["order_items"])

    print("  Inserting customers...")
    insert_customers(engine, tenant_id, mapped.get("customers"))

    if "orders" in mapped:
        print("  Inserting orders...")
        insert_orders(engine, tenant_id, mapped["orders"])

    if "order_items" in mapped:
        print("  Cleaning order_items...")
        mapped["order_items"] = clean_order_items(mapped["order_items"])
        print("  Inserting order_items...")
        _, late_delivery_known = insert_order_items(engine, tenant_id, mapped["order_items"])
        if late_delivery_known > 0:
            mark_capability(engine, tenant_id, "supports_late_delivery")
            print(f"  Marked tenant_id={tenant_id} as supports_late_delivery=TRUE "
                  f"({late_delivery_known} rows had is_late_delivery).")

    print("\nDone.")


if __name__ == "__main__":
    main()