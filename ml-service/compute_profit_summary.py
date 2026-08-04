"""
Profit engine: combines demand forecast + observed selling price/shipping
cost + return-proxy rate into an expected net profit per SKU.

expected_net_profit =
    forecast_demand * avg_selling_price
    - expected_returns * avg_selling_price      (lost revenue on predicted returns)
    - forecast_demand * avg_shipping_cost

This is intentionally simple arithmetic, not a model — matches the plan's
"keep the profit engine explainable" decision.

Usage:
    python compute_profit_summary.py --tenant-id 1
"""
import argparse
import os
from datetime import date

import pandas as pd
from sqlalchemy import create_engine, text

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://copilot:copilot_dev_pw@localhost:5432/profit_copilot",
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", type=int, default=1)
    args = parser.parse_args()

    engine = create_engine(DB_URL)

    # Per-SKU historical averages: price, shipping cost, return-proxy rate
    stats_query = text("""
        SELECT
            product_pk,
            AVG(selling_price) AS avg_selling_price,
            AVG(shipping_cost) AS avg_shipping_cost,
            AVG(CASE WHEN is_returned_proxy THEN 1.0 ELSE 0.0 END) AS return_rate_proxy
        FROM order_items
        WHERE tenant_id = :tenant_id
        GROUP BY product_pk
    """)

    # Latest forecast per SKU (from the demand model we already trained)
    forecast_query = text("""
        SELECT DISTINCT ON (product_pk) product_pk, week_start, predicted_demand
        FROM demand_forecasts
        WHERE tenant_id = :tenant_id
        ORDER BY product_pk, week_start DESC
    """)

    with engine.begin() as conn:
        stats_df = pd.read_sql(stats_query, conn, params={"tenant_id": args.tenant_id})
        forecast_df = pd.read_sql(forecast_query, conn, params={"tenant_id": args.tenant_id})

    merged = forecast_df.merge(stats_df, on="product_pk", how="inner")
    print(f"Computing profit summary for {len(merged)} SKUs (have both forecast + pricing history)")

    merged["expected_returns"] = merged["predicted_demand"] * merged["return_rate_proxy"]
    merged["expected_shipping_cost"] = merged["predicted_demand"] * merged["avg_shipping_cost"]
    merged["expected_net_profit"] = (
        merged["predicted_demand"] * merged["avg_selling_price"]
        - merged["expected_returns"] * merged["avg_selling_price"]
        - merged["expected_shipping_cost"]
    )

    period = date.today().replace(day=1)  # tag this run with the current month

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM sku_profit_summary WHERE tenant_id = :tid"), {"tid": args.tenant_id})
        for _, row in merged.iterrows():
            conn.execute(
                text("""
                    INSERT INTO sku_profit_summary (
                        tenant_id, product_pk, period,
                        forecast_demand, expected_returns,
                        expected_shipping_cost, expected_net_profit
                    ) VALUES (
                        :tenant_id, :product_pk, :period,
                        :forecast_demand, :expected_returns,
                        :expected_shipping_cost, :expected_net_profit
                    )
                """),
                {
                    "tenant_id": args.tenant_id,
                    "product_pk": int(row["product_pk"]),
                    "period": period,
                    "forecast_demand": float(row["predicted_demand"]),
                    "expected_returns": float(row["expected_returns"]),
                    "expected_shipping_cost": float(row["expected_shipping_cost"]),
                    "expected_net_profit": float(row["expected_net_profit"]),
                },
            )

    print(f"Wrote {len(merged)} sku_profit_summary rows.")
    print("\nTop 5 most profitable SKUs (predicted):")
    top = merged.sort_values("expected_net_profit", ascending=False).head(5)
    print(top[["product_pk", "predicted_demand", "expected_net_profit"]])

    print("\nBottom 5 (losing money predicted):")
    bottom = merged.sort_values("expected_net_profit").head(5)
    print(bottom[["product_pk", "predicted_demand", "expected_net_profit"]])


if __name__ == "__main__":
    main()