"""
FastAPI service — exposes demand forecast, return risk, vendor risk, and
profit summary as REST endpoints, reading precomputed predictions from Postgres.

Run:
    uvicorn main:app --reload --port 8000
Then open http://localhost:8000/docs for interactive testing.
"""
import os

from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://copilot:copilot_dev_pw@localhost:5432/profit_copilot",
)

app = FastAPI(title="Supply Chain Copilot API")
engine = create_engine(DB_URL)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/forecast/{sku_id}")
def get_forecast(sku_id: str, tenant_id: int = 1):
    query = text("""
        SELECT df.week_start, df.predicted_demand, df.model_version
        FROM demand_forecasts df
        JOIN products p ON df.product_pk = p.product_pk
        WHERE p.sku_id = :sku_id AND df.tenant_id = :tid
        ORDER BY df.week_start DESC LIMIT 1
    """)
    with engine.begin() as conn:
        row = conn.execute(query, {"sku_id": sku_id, "tid": tenant_id}).fetchone()
    if not row:
        raise HTTPException(404, f"No forecast found for sku_id={sku_id}")
    return {"sku_id": sku_id, "week_start": row[0], "predicted_demand": row[1], "model_version": row[2]}


@app.get("/return-risk/{sku_id}")
def get_return_risk(sku_id: str, tenant_id: int = 2):
    query = text("""
        SELECT rr.risk_score, rr.model_version
        FROM return_risk_scores rr
        JOIN products p ON rr.product_pk = p.product_pk
        WHERE p.sku_id = :sku_id AND rr.tenant_id = :tid
        ORDER BY rr.created_at DESC LIMIT 1
    """)
    with engine.begin() as conn:
        row = conn.execute(query, {"sku_id": sku_id, "tid": tenant_id}).fetchone()
    if not row:
        raise HTTPException(404, f"No return-risk score found for sku_id={sku_id}")
    return {"sku_id": sku_id, "risk_score": row[0], "model_version": row[1]}


@app.get("/vendor-risk/{vendor_id}")
def get_vendor_risk(vendor_id: str, tenant_id: int = 1):
    query = text("""
        SELECT vr.late_rate, vr.risk_score
        FROM vendor_risk_scores vr
        JOIN vendors v ON vr.vendor_pk = v.vendor_pk
        WHERE v.vendor_id = :vendor_id AND vr.tenant_id = :tid
        ORDER BY vr.created_at DESC LIMIT 1
    """)
    with engine.begin() as conn:
        row = conn.execute(query, {"vendor_id": vendor_id, "tid": tenant_id}).fetchone()
    if not row:
        raise HTTPException(404, f"No risk score found for vendor_id={vendor_id}")
    return {"vendor_id": vendor_id, "late_rate": row[0], "risk_score": row[1]}


@app.get("/profit-summary")
def get_profit_summary(tenant_id: int = 1, limit: int = 10, order: str = "top"):
    direction = "DESC" if order == "top" else "ASC"
    query = text(f"""
        SELECT p.sku_id, s.forecast_demand, s.expected_returns,
               s.expected_shipping_cost, s.expected_net_profit
        FROM sku_profit_summary s
        JOIN products p ON s.product_pk = p.product_pk
        WHERE s.tenant_id = :tid
        ORDER BY s.expected_net_profit {direction}
        LIMIT :limit
    """)
    with engine.begin() as conn:
        rows = conn.execute(query, {"tid": tenant_id, "limit": limit}).fetchall()
    return [
        {
            "sku_id": r[0], "forecast_demand": r[1], "expected_returns": r[2],
            "expected_shipping_cost": r[3], "expected_net_profit": r[4],
        }
        for r in rows
    ]


@app.get("/risky-products")
def risky_products(tenant_id_forecast: int = 1, tenant_id_risk: int = 2, limit: int = 10):
    """Blends Olist demand forecast with synthetic-model category-level return risk
    (can't match by SKU ID across tenants — different catalogs — so we match by category)."""
    query = text("""
        SELECT p.sku_id, p.category, df.predicted_demand, cat_risk.avg_risk_score
        FROM demand_forecasts df
        JOIN products p ON df.product_pk = p.product_pk AND p.tenant_id = df.tenant_id
        LEFT JOIN (
            SELECT p2.category, AVG(rr.risk_score) AS avg_risk_score
            FROM return_risk_scores rr
            JOIN products p2 ON rr.product_pk = p2.product_pk
            WHERE rr.tenant_id = :tid_risk
            GROUP BY p2.category
        ) cat_risk ON cat_risk.category = p.category
        WHERE df.tenant_id = :tid_forecast
        ORDER BY cat_risk.avg_risk_score DESC NULLS LAST
        LIMIT :limit
    """)
    with engine.begin() as conn:
        rows = conn.execute(
            query, {"tid_forecast": tenant_id_forecast, "tid_risk": tenant_id_risk, "limit": limit}
        ).fetchall()
    return [{"sku_id": r[0], "category": r[1], "predicted_demand": r[2], "category_return_risk": r[3]} for r in rows]