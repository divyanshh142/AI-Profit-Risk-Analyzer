-- ============================================================
-- Canonical schema: every tenant (Olist / DataCo / synthetic /
-- a future client CSV) maps into THESE tables. Models, APIs,
-- and the agent only ever talk to this schema — never the raw
-- source columns directly.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id       SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    source_type     TEXT,              -- 'olist' | 'dataco' | 'synthetic' | 'client_upload'
    currency        TEXT DEFAULT 'USD',
    created_at      TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    product_pk      SERIAL PRIMARY KEY,
    tenant_id       INT REFERENCES tenants(tenant_id),
    sku_id          TEXT NOT NULL,
    category        TEXT,
    list_price      NUMERIC,
    unit_cost       NUMERIC,
    weight_kg       NUMERIC,
    launch_date     DATE,
    UNIQUE(tenant_id, sku_id)
);

CREATE TABLE IF NOT EXISTS vendors (
    vendor_pk       SERIAL PRIMARY KEY,
    tenant_id       INT REFERENCES tenants(tenant_id),
    vendor_id       TEXT NOT NULL,
    name            TEXT,
    reliability_score       NUMERIC,
    shipping_cost_per_kg    NUMERIC,
    UNIQUE(tenant_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS customers (
    customer_pk     SERIAL PRIMARY KEY,
    tenant_id       INT REFERENCES tenants(tenant_id),
    customer_id     TEXT NOT NULL,
    region          TEXT,
    segment         TEXT,
    UNIQUE(tenant_id, customer_id)
);

CREATE TABLE IF NOT EXISTS orders (
    order_pk        SERIAL PRIMARY KEY,
    tenant_id       INT REFERENCES tenants(tenant_id),
    order_id        TEXT NOT NULL,
    customer_pk     INT REFERENCES customers(customer_pk),
    order_date      DATE,
    UNIQUE(tenant_id, order_id)
);

CREATE TABLE IF NOT EXISTS order_items (
    order_line_pk   SERIAL PRIMARY KEY,
    tenant_id       INT REFERENCES tenants(tenant_id),
    order_pk        INT REFERENCES orders(order_pk),
    order_line_id   TEXT,
    product_pk      INT REFERENCES products(product_pk),
    vendor_pk       INT REFERENCES vendors(vendor_pk),
    quantity        INT,
    selling_price   NUMERIC,
    discount_rate   NUMERIC DEFAULT 0,
    shipping_cost   NUMERIC,
    estimated_delivery_date DATE,
    actual_delivery_date    DATE,
    is_late_delivery        BOOLEAN,
    is_returned             BOOLEAN,
    is_returned_proxy       BOOLEAN DEFAULT FALSE,  -- TRUE when derived (e.g. from review score), not ground truth
    return_reason           TEXT,
    gross_revenue   NUMERIC,
    product_cost    NUMERIC,
    net_profit      NUMERIC
);

-- ---------- Model output tables (written by training/inference jobs) ----------

CREATE TABLE IF NOT EXISTS demand_forecasts (
    id SERIAL PRIMARY KEY,
    tenant_id INT, product_pk INT,
    week_start DATE, predicted_demand NUMERIC,
    model_version TEXT, created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_risk_scores (
    id SERIAL PRIMARY KEY,
    tenant_id INT, product_pk INT,
    risk_score NUMERIC, model_version TEXT, created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_risk_scores (
    id SERIAL PRIMARY KEY,
    tenant_id INT, vendor_pk INT,
    late_rate NUMERIC, risk_score NUMERIC, created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sku_profit_summary (
    id SERIAL PRIMARY KEY,
    tenant_id INT, product_pk INT, period DATE,
    forecast_demand NUMERIC, expected_returns NUMERIC,
    expected_shipping_cost NUMERIC, expected_net_profit NUMERIC,
    created_at TIMESTAMP DEFAULT now()
);

-- ---------- RAG: nightly SKU report text + embedding ----------

CREATE TABLE IF NOT EXISTS sku_report_embeddings (
    id SERIAL PRIMARY KEY,
    tenant_id INT, product_pk INT,
    report_text TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMP DEFAULT now()
);
