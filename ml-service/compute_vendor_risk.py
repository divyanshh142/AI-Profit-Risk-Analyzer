"""
Computes late-delivery risk per vendor from data already loaded, and writes
scores into vendor_risk_scores. No new model training needed for v1 — this
is a rolling rate, which is honest and explainable (the plan deliberately
avoids overbuilding this one).

Usage:
    python compute_vendor_risk.py --tenant-id 1
"""
import argparse
import os

import pandas as pd
from sqlalchemy import create_engine, text

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://copilot:copilot_dev_pw@localhost:5432/profit_copilot",
)

MIN_ORDERS_FOR_SCORE = 5  # don't score vendors with too few orders to be meaningful


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", type=int, default=1)
    args = parser.parse_args()

    engine = create_engine(DB_URL)

    query = text("""
        SELECT
            vendor_pk,
            COUNT(*) AS total_orders,
            COUNT(*) FILTER (WHERE is_late_delivery = TRUE) AS late_orders
        FROM order_items
        WHERE tenant_id = :tenant_id
          AND is_late_delivery IS NOT NULL
        GROUP BY vendor_pk
        HAVING COUNT(*) >= :min_orders
    """)

    with engine.begin() as conn:
        df = pd.read_sql(
            query, conn, params={"tenant_id": args.tenant_id, "min_orders": MIN_ORDERS_FOR_SCORE}
        )

    print(f"Scoring {len(df)} vendors with >= {MIN_ORDERS_FOR_SCORE} orders each")

    df["late_rate"] = df["late_orders"] / df["total_orders"]
    # risk_score: same as late_rate for v1 — kept as a separate column so we
    # can layer in order volume / trend weighting later without changing the schema
    df["risk_score"] = df["late_rate"]

    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(
                text("""
                    INSERT INTO vendor_risk_scores (tenant_id, vendor_pk, late_rate, risk_score)
                    VALUES (:tenant_id, :vendor_pk, :late_rate, :risk_score)
                """),
                {
                    "tenant_id": args.tenant_id,
                    "vendor_pk": int(row["vendor_pk"]),
                    "late_rate": float(row["late_rate"]),
                    "risk_score": float(row["risk_score"]),
                },
            )

    print(f"Wrote {len(df)} vendor risk scores.")
    print("\nTop 5 riskiest vendors:")
    print(df.sort_values("risk_score", ascending=False).head(5)[["vendor_pk", "total_orders", "late_rate"]])


if __name__ == "__main__":
    main()