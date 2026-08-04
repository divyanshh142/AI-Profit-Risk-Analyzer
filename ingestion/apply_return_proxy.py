"""
Applies the return-risk proxy: order_items belonging to orders with a
review_score <= 2 get is_returned_proxy = TRUE.

Usage:
    python apply_return_proxy.py --raw-dir raw_data/olist
"""
import argparse
import os
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://copilot:copilot_dev_pw@localhost:5432/profit_copilot",
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-dir", required=True)
    parser.add_argument("--tenant-id", type=int, default=1)
    args = parser.parse_args()

    csv_path = Path(args.raw_dir) / "olist_order_reviews_dataset.csv"
    reviews_df = pd.read_csv(csv_path)

    bad_review_order_ids = reviews_df.loc[
        reviews_df["review_score"] <= 2, "order_id"
    ].unique().tolist()

    print(f"Found {len(bad_review_order_ids)} orders with review_score <= 2")

    engine = create_engine(DB_URL)
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                UPDATE order_items
                SET is_returned_proxy = TRUE
                FROM orders
                WHERE order_items.order_pk = orders.order_pk
                  AND orders.tenant_id = :tenant_id
                  AND orders.order_id = ANY(:order_ids)
            """),
            {"tenant_id": args.tenant_id, "order_ids": bad_review_order_ids},
        )
        print(f"Updated {result.rowcount} order_items rows with is_returned_proxy = TRUE")


if __name__ == "__main__":
    main()