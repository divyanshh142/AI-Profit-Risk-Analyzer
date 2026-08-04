"""
Synthetic multi-schema tenant generator.

Generates ONE realistic underlying dataset (with genuine is_returned labels
and real unit costs, unlike Olist/DataCo which lack these), then exports it
THREE times in three different column layouts:

  Tenant A - "clean_co"   : full, clearly-named columns
  Tenant B - "messy_mart" : renamed/abbreviated columns (realistic messy export)
  Tenant C - "mini_shop"  : minimal columns, some fields missing entirely

This is what proves the schema-mapping story, not three unrelated datasets.

Usage:
    python generate_synthetic_data.py
"""
import os
import random
from datetime import date, timedelta

import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

N_VENDORS = 25
N_PRODUCTS = 200
N_CUSTOMERS = 800
N_ORDERS = 3000
CATEGORIES = ["electronics", "apparel", "home", "beauty", "toys", "sports"]

OUT_DIR = "synthetic_data"


def generate_base_data():
    vendors = pd.DataFrame({
        "vendor_id": [f"V{100+i}" for i in range(N_VENDORS)],
        "reliability": np.random.beta(5, 2, N_VENDORS),
    })

    products = pd.DataFrame({
        "product_id": [f"SKU{1000+i}" for i in range(N_PRODUCTS)],
        "category": np.random.choice(CATEGORIES, N_PRODUCTS),
        "unit_cost": np.round(np.random.uniform(5, 150, N_PRODUCTS), 2),
    })
    products["list_price"] = np.round(products["unit_cost"] * np.random.uniform(1.3, 2.5, N_PRODUCTS), 2)
    base_return_rate = products["category"].map({
        "apparel": 0.22, "electronics": 0.15, "home": 0.08,
        "beauty": 0.10, "toys": 0.07, "sports": 0.09,
    })
    products["return_propensity"] = base_return_rate

    customers = pd.DataFrame({
        "customer_id": [f"C{2000+i}" for i in range(N_CUSTOMERS)],
        "region": np.random.choice(["North", "South", "East", "West"], N_CUSTOMERS),
    })

    order_rows = []
    item_rows = []
    start_date = date(2025, 1, 1)

    for i in range(N_ORDERS):
        order_id = f"O{5000+i}"
        customer = customers.sample(1).iloc[0]
        order_date = start_date + timedelta(days=int(np.random.uniform(0, 365)))

        n_items = np.random.choice([1, 1, 1, 2, 2, 3], 1)[0]
        order_rows.append({
            "order_id": order_id,
            "customer_id": customer["customer_id"],
            "order_date": order_date,
        })

        for j in range(n_items):
            product = products.sample(1).iloc[0]
            vendor = vendors.sample(1).iloc[0]

            discount_rate = round(np.random.choice([0, 0, 0, 0.1, 0.15, 0.25]), 2)
            selling_price = round(product["list_price"] * (1 - discount_rate), 2)
            quantity = np.random.choice([1, 1, 1, 2, 3])
            shipping_cost = round(np.random.uniform(3, 15), 2)

            promised_days = np.random.choice([3, 5, 7])
            estimated_delivery = order_date + timedelta(days=int(promised_days))
            delay = np.random.poisson(lam=(1 - vendor["reliability"]) * 5)
            actual_delivery = estimated_delivery + timedelta(days=int(delay))
            is_late = actual_delivery > estimated_delivery

            return_prob = product["return_propensity"] + (0.08 if is_late else 0) + discount_rate * 0.1
            is_returned = np.random.random() < min(return_prob, 0.9)
            return_reason = None
            if is_returned:
                return_reason = np.random.choice(
                    ["wrong_size", "damaged", "not_as_described", "changed_mind", "late_arrival"]
                )

            item_rows.append({
                "order_id": order_id,
                "order_line_id": f"{order_id}-{j}",
                "product_id": product["product_id"],
                "vendor_id": vendor["vendor_id"],
                "quantity": int(quantity),
                "selling_price": selling_price,
                "discount_rate": discount_rate,
                "shipping_cost": shipping_cost,
                "unit_cost": product["unit_cost"],
                "estimated_delivery_date": estimated_delivery,
                "actual_delivery_date": actual_delivery,
                "is_late_delivery": bool(is_late),
                "is_returned": bool(is_returned),
                "return_reason": return_reason,
            })

    orders = pd.DataFrame(order_rows)
    order_items = pd.DataFrame(item_rows)
    return products.drop(columns=["return_propensity"]), vendors, customers, orders, order_items


def export_tenant_a(products, vendors, customers, orders, order_items):
    d = f"{OUT_DIR}/tenant_a"
    os.makedirs(d, exist_ok=True)
    products.to_csv(f"{d}/products.csv", index=False)
    customers.to_csv(f"{d}/customers.csv", index=False)
    orders.to_csv(f"{d}/orders.csv", index=False)
    order_items.to_csv(f"{d}/order_items.csv", index=False)
    print(f"Tenant A (clean_co) written to {d}/")


def export_tenant_b(products, vendors, customers, orders, order_items):
    d = f"{OUT_DIR}/tenant_b"
    os.makedirs(d, exist_ok=True)

    products_b = products.rename(columns={
        "product_id": "sku", "category": "cat", "unit_cost": "cost", "list_price": "price",
    })
    customers_b = customers.rename(columns={"customer_id": "cust_no", "region": "geo"})
    orders_b = orders.rename(columns={
        "order_id": "txn_id", "customer_id": "cust_no", "order_date": "txn_date",
    })
    items_b = order_items.rename(columns={
        "order_id": "txn_id", "order_line_id": "line_no", "product_id": "sku",
        "vendor_id": "supplier_code", "quantity": "qty", "selling_price": "unit_price",
        "discount_rate": "disc_pct", "shipping_cost": "freight", "unit_cost": "cost",
        "estimated_delivery_date": "promised_date", "actual_delivery_date": "delivered_date",
        "is_late_delivery": "late_flag", "is_returned": "returned_flag",
        "return_reason": "return_cause",
    })

    products_b.to_csv(f"{d}/products.csv", index=False)
    customers_b.to_csv(f"{d}/customers.csv", index=False)
    orders_b.to_csv(f"{d}/orders.csv", index=False)
    items_b.to_csv(f"{d}/order_items.csv", index=False)
    print(f"Tenant B (messy_mart) written to {d}/")


def export_tenant_c(products, vendors, customers, orders, order_items):
    d = f"{OUT_DIR}/tenant_c"
    os.makedirs(d, exist_ok=True)

    products_c = products[["product_id", "category"]].rename(
        columns={"product_id": "item_code", "category": "type"}
    )

    orders_c = orders.rename(columns={"order_id": "order_ref", "order_date": "date"})
    orders_c = orders_c.drop(columns=["customer_id"])

    items_c = order_items[[
        "order_id", "product_id", "selling_price", "actual_delivery_date", "is_returned"
    ]].rename(columns={
        "order_id": "order_ref", "product_id": "item_code", "selling_price": "price",
        "actual_delivery_date": "delivered", "is_returned": "returned",
    })

    products_c.to_csv(f"{d}/products.csv", index=False)
    orders_c.to_csv(f"{d}/orders.csv", index=False)
    items_c.to_csv(f"{d}/order_items.csv", index=False)
    print(f"Tenant C (mini_shop) written to {d}/ (minimal columns, no customers/vendors/cost)")


def main():
    print("Generating base synthetic dataset...")
    products, vendors, customers, orders, order_items = generate_base_data()
    print(f"  {len(products)} products, {len(vendors)} vendors, {len(customers)} customers, "
          f"{len(orders)} orders, {len(order_items)} order_items")
    print(f"  True return rate: {order_items['is_returned'].mean():.1%}")
    print(f"  True late-delivery rate: {order_items['is_late_delivery'].mean():.1%}")

    export_tenant_a(products, vendors, customers, orders, order_items)
    export_tenant_b(products, vendors, customers, orders, order_items)
    export_tenant_c(products, vendors, customers, orders, order_items)

    print("\nDone. Check the synthetic_data/ folder for tenant_a, tenant_b, tenant_c.")


if __name__ == "__main__":
    main()