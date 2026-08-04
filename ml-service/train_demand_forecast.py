"""
Trains a weekly SKU-level demand forecasting model on real order data,
and writes predictions into the demand_forecasts table.

Usage:
    python train_demand_forecast.py --tenant-id 1
"""
import argparse
import os

import joblib
import pandas as pd
from lightgbm import LGBMRegressor
from sqlalchemy import create_engine, text

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://copilot:copilot_dev_pw@localhost:5432/profit_copilot",
)

MIN_WEEKS_HISTORY = 8  # skip SKUs with too little history to learn a pattern


def load_weekly_demand(engine, tenant_id: int) -> pd.DataFrame:
    query = text("""
        SELECT
            p.product_pk,
            p.sku_id,
            p.category,
            date_trunc('week', o.order_date)::date AS week_start,
            COUNT(*) AS units_sold
        FROM order_items oi
        JOIN orders o ON oi.order_pk = o.order_pk
        JOIN products p ON oi.product_pk = p.product_pk
        WHERE oi.tenant_id = :tenant_id
        GROUP BY p.product_pk, p.sku_id, p.category, week_start
        ORDER BY p.product_pk, week_start
    """)
    with engine.begin() as conn:
        df = pd.read_sql(query, conn, params={"tenant_id": tenant_id})
    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["product_pk", "week_start"]).copy()

    # Only keep SKUs with enough history to make lag features meaningful
    counts = df.groupby("product_pk")["week_start"].transform("count")
    df = df[counts >= MIN_WEEKS_HISTORY].copy()

    df["lag_1"] = df.groupby("product_pk")["units_sold"].shift(1)
    df["lag_4"] = df.groupby("product_pk")["units_sold"].shift(4)
    df["rolling_mean_4"] = (
        df.groupby("product_pk")["units_sold"]
        .shift(1)
        .rolling(4)
        .mean()
        .reset_index(level=0, drop=True)
    )
    df["week_of_year"] = pd.to_datetime(df["week_start"]).dt.isocalendar().week.astype(int)
    df["category"] = df["category"].astype("category")

    return df.dropna(subset=["lag_1", "lag_4", "rolling_mean_4"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", type=int, default=1)
    args = parser.parse_args()

    engine = create_engine(DB_URL)

    print("Loading weekly demand from Postgres...")
    raw = load_weekly_demand(engine, args.tenant_id)
    print(f"  {len(raw)} (sku, week) rows across {raw['product_pk'].nunique()} SKUs")

    print("Building features...")
    features = build_features(raw)
    print(f"  {len(features)} rows usable for training after lag/history filtering")

    if len(features) < 50:
        print("Not enough data to train yet. Stopping here.")
        return

    feature_cols = ["lag_1", "lag_4", "rolling_mean_4", "week_of_year", "category"]
    X = features[feature_cols]
    y = features["units_sold"]

    # time-based split: last 15% of rows (by week_start order) held out as validation
    split_idx = int(len(features) * 0.85)
    X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_val = y.iloc[:split_idx], y.iloc[split_idx:]

    print(f"Training LightGBM on {len(X_train)} rows, validating on {len(X_val)}...")
    model = LGBMRegressor(n_estimators=200, learning_rate=0.05, random_state=42)
    model.fit(X_train, y_train, categorical_feature=["category"])

    val_preds = model.predict(X_val)
    mae = (val_preds - y_val).abs().mean()
    print(f"Validation MAE: {mae:.2f} units/week")

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/demand_forecast_v1.pkl")
    print("Saved model -> models/demand_forecast_v1.pkl")

    # Predict next week for every SKU using its most recent row as input
    latest = features.sort_values("week_start").groupby("product_pk").tail(1)
    next_week_preds = model.predict(latest[feature_cols])
    next_week_preds = next_week_preds.clip(min=0)
    latest = latest.copy()
    latest["predicted_demand"] = next_week_preds
    latest["next_week_start"] = pd.to_datetime(latest["week_start"]) + pd.Timedelta(weeks=1)

    print("Writing predictions to demand_forecasts table...")
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM demand_forecasts WHERE tenant_id = :tid"), {"tid": args.tenant_id})
        for _, row in latest.iterrows():
            conn.execute(
                text("""
                    INSERT INTO demand_forecasts (tenant_id, product_pk, week_start, predicted_demand, model_version)
                    VALUES (:tenant_id, :product_pk, :week_start, :predicted_demand, 'v1')
                """),
                {
                    "tenant_id": args.tenant_id,
                    "product_pk": int(row["product_pk"]),
                    "week_start": row["next_week_start"].date(),
                    "predicted_demand": float(row["predicted_demand"]),
                },
            )
    print(f"Wrote {len(latest)} forecast rows. Done.")


if __name__ == "__main__":
    main()