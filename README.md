# AI Profit & Risk Analyzer

A multi-tenant e-commerce analytics platform that ingests datasets with different schemas, converts them into one canonical PostgreSQL schema, and produces demand, return-risk, vendor-risk, and profit insights.

The project includes:

- A PostgreSQL + pgvector database running through Docker Compose
- Canonical multi-tenant data schema
- Dataset ingestion through mapping configurations
- Synthetic tenant data with genuine return labels
- Python ML/FastAPI service for predictions and summaries
- Spring Boot backend with authentication and RAG support
- React + TypeScript frontend dashboard
- Airflow DAG definitions for future orchestration

## Architecture

```text
Raw CSV datasets
    |
    |-- Olist
    |-- Synthetic Tenant A
    |-- Synthetic Tenant B
    |-- Synthetic Tenant C
    |-- DataCo (optional, requires validated mapping)
    |
    v
Ingestion + mapping configuration
    |
    v
Canonical PostgreSQL schema
    |
    |-- products
    |-- customers
    |-- vendors
    |-- orders
    |-- order_items
    |-- tenant_capabilities
    |
    v
ML service and analytics jobs
    |
    |-- Demand forecast
    |-- Return-risk score
    |-- Vendor-risk score
    |-- SKU profit summary
    |
    v
Spring Boot API + React dashboard
```

## Project structure

```text
AI-Profit-Risk-Analyzer/
├── backend/
│   └── backend/                 # Spring Boot backend, JWT security, RAG support
├── db/
│   └── 001_canonical_schema.sql # Canonical PostgreSQL schema
├── dags/                        # Airflow DAG definitions
├── frontend/                    # React, TypeScript, Vite, Tailwind UI
├── ingestion/
│   ├── mapping_configs/         # Dataset-to-canonical-column mappings
│   ├── load_data.py             # Generic loader for mapped datasets
│   ├── load_synthetic_tenant.py # Loader for full synthetic tenant data
│   └── apply_return_proxy.py    # Olist weak return-label proxy
├── ml-service/
│   ├── main.py                  # FastAPI analytics endpoints
│   ├── train_demand_forecast.py
│   ├── train_return_risk.py
│   ├── compute_vendor_risk.py
│   └── compute_profit_summary.py
├── docker-compose.yml
└── .env.example
```

## Requirements

Install:

- Docker Desktop
- Python 3.10 or later
- Node.js 18 or later
- Java 17 or later
- Git

Create a local `.env` file from `.env.example` and provide local credentials there.

```bash
cp .env.example .env
```

Never commit `.env`, API keys, passwords, service-account files, or generated model files.

## Start the database

From the project root:

### Windows CMD

```cmd
docker compose up -d
docker compose ps
```

Docker Compose starts the services defined in `docker-compose.yml`; the `-d` option leaves them running in the background. [web:501][web:512]

To reset all local database data:

```cmd
docker compose down -v
docker compose up -d
```

Warning: `docker compose down -v` deletes Compose-managed database volumes and permanently removes local database data.

## Database access

If pgAdmin is enabled in your `docker-compose.yml`, open:

```text
http://localhost:5050
```

Use the database values defined in your local `.env` or Compose configuration. Do not put real usernames or passwords in this README.

The canonical schema is initialized from:

```text
db/001_canonical_schema.sql
```

## Dataset ingestion

All source datasets are mapped into the same canonical schema. This lets downstream analytics work without needing dataset-specific code.

### Olist

Download the Brazilian E-Commerce Public Dataset by Olist and place the CSV files in a local directory.

From the project root:

```cmd
.venv\Scripts\Activate.bat
python ingestion\load_data.py --config ingestion\mapping_configs\olist_mapping.json --raw-dir D:\path\to\olist
python ingestion\apply_return_proxy.py --raw-dir D:\path\to\olist --tenant-id 1
```

Olist does not provide a genuine row-level return label. The project creates a weak return proxy from low review scores for profit estimation only. It should not be used as ground truth to train the return-risk classifier.

### Synthetic Tenant A

Synthetic Tenant A contains full product, customer, order, vendor, delivery, cost, and genuine return-label data.

```cmd
python ingestion\load_synthetic_tenant.py --config ingestion\mapping_configs\synthetic_a_mapping.json --raw-dir D:\path\to\synthetic_data\tenant_A_full
```

Tenant A supports:

- Demand forecasting
- Return-risk training and scoring
- Vendor-risk scoring
- Late-delivery analysis
- Profit summaries

### Synthetic Tenant B

Tenant B is a partial sales export with order date, SKU, quantity, price, ETA, and delivered date.

It can support:

- Demand forecasting
- Late-delivery analysis

It cannot support genuine return-risk training or vendor-risk scoring because it has no return or vendor fields. A preprocessing adapter is required before it can use the full synthetic loader because its source schema differs from Tenant A.

### Synthetic Tenant C

Tenant C is a minimal sales export with date, item ID, units, and price.

It supports:

- Basic demand forecasting

It does not support return risk, vendor risk, late-delivery analysis, or real profit analysis because cost, shipping, delivery, vendor, and return fields are absent. A preprocessing adapter is required before ingestion.

### DataCo

DataCo is optional. Before loading it, inspect the real CSV headers and create a validated mapping configuration. Do not assume source columns or return labels without checking the downloaded dataset.

## ML jobs

Activate the Python environment and move to the ML service directory:

```cmd
cd /d D:\path\to\AI-Profit-Risk-Analyzer\ml-service
```

Run jobs with an explicit tenant ID.

### Tenant 1: Olist

```cmd
python train_demand_forecast.py --tenant-id 1
python compute_vendor_risk.py --tenant-id 1
python compute_profit_summary.py --tenant-id 1
```

Do not train the return-risk model on Olist because its return signal is only a proxy.

### Tenant 2: Synthetic Tenant A

```cmd
python train_demand_forecast.py --tenant-id 2
python train_return_risk.py --tenant-id 2
python compute_vendor_risk.py --tenant-id 2
python compute_profit_summary.py --tenant-id 2
```

Run equivalent jobs for other tenants only when their available fields support those jobs.

## Start the ML API

From `ml-service`:

```cmd
uvicorn main:app --reload --port 8000
```

Check health:

```cmd
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

Useful endpoint example:

```text
GET http://localhost:8000/profit-summary?tenant_id=2&limit=10&order=top
```

## Start the frontend

From the project root:

```cmd
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, commonly:

```text
http://localhost:5173
```

## Start the backend

From the Spring Boot backend directory:

```cmd
cd backend\backend
```

Run the application using your local Maven wrapper or IDE configuration.

Keep credentials in environment variables or local `.env` files. The backend must never contain committed API keys.

## Airflow DAGs

The `dags/` directory contains workflow definitions for ingestion and ML tasks. In Airflow, a DAG defines tasks and their execution dependencies. [web:509][web:263]

The current DAGs should remain paused until paths, tenant arguments, credentials, and runtime environment are parameterized and tested. Manual ingestion and ML runs are the supported development workflow.

