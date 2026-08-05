"""
Trains a return-risk classifier on the SYNTHETIC tenant's genuine
is_returned labels, and writes per-product risk scores.

Usage:
    python train_return_risk.py --tenant-id 2
"""
import argparse
import os

import joblib
import pandas as pd
from lightgbm import LGBMClassifier
from sqlalchemy import create_engine, text

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://copilot:copilot_dev_pw@localhost:5432/profit_copilot",
)


def mark_capability(engine, tenant_id: int, column: str):
    """Flip one supports_* flag on in tenant_capabilities once this job succeeds."""
    with engine.begin() as conn:
        conn.execute(
            text(f"""
                INSERT INTO tenant_capabilities (tenant_id, {column})
                VALUES (:tid, TRUE)
                ON CONFLICT (tenant_id) DO UPDATE SET {column} = TRUE
            """),
            {"tid": tenant_id},
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", type=int, default=2)
    args = parser.parse_args()

    engine = create_engine(DB_URL)
    query = text("""
        SELECT
            oi.product_pk, p.category, oi.discount_rate,
            oi.is_late_delivery, oi.is_returned
        FROM order_items oi
        JOIN products p ON oi.product_pk = p.product_pk
        WHERE oi.tenant_id = :tid AND oi.is_returned IS NOT NULL
    """)
    with engine.begin() as conn:
        df = pd.read_sql(query, conn, params={"tid": args.tenant_id})

    print(f"Loaded {len(df)} labeled rows, true return rate: {df['is_returned'].mean():.1%}")

    df["category"] = df["category"].astype("category")
    df["is_late_delivery"] = df["is_late_delivery"].fillna(False).astype(int)
    X = df[["category", "discount_rate", "is_late_delivery"]]
    y = df["is_returned"].astype(int)

    split = int(len(df) * 0.85)
    X_train, X_val, y_train, y_val = X.iloc[:split], X.iloc[split:], y.iloc[:split], y.iloc[split:]

    model = LGBMClassifier(n_estimators=150, learning_rate=0.05, random_state=42)
    model.fit(X_train, y_train, categorical_feature=["category"])

    val_acc = (model.predict(X_val) == y_val).mean()
    print(f"Validation accuracy: {val_acc:.1%}")

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/return_risk_v1.pkl")

    # per-product average risk score
    df["risk_score"] = model.predict_proba(X)[:, 1]
    product_scores = df.groupby("product_pk")["risk_score"].mean().reset_index()

    with engine.begin() as conn:
        for _, row in product_scores.iterrows():
            conn.execute(
                text("""
                    INSERT INTO return_risk_scores (tenant_id, product_pk, risk_score, model_version)
                    VALUES (:tid, :pid, :score, 'v1')
                """),
                {"tid": args.tenant_id, "pid": int(row["product_pk"]), "score": float(row["risk_score"])},
            )
    print(f"Wrote {len(product_scores)} return_risk_scores rows.")

    mark_capability(engine, args.tenant_id, "supports_return_risk")
    print(f"Marked tenant_id={args.tenant_id} as supports_return_risk=TRUE. Done.")


if __name__ == "__main__":
    main()