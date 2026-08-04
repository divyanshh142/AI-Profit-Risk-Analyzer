# Profit Intelligence Platform — Local Dev Starter

This is Phase 0 + the start of Phase 1 of the build plan. It gets you a real,
running database with the canonical schema in it — the foundation every
other piece (models, backend, frontend, agent) will sit on top of.

## What's in here and why

```
profit-copilot/
  docker-compose.yml            # Spins up Postgres+pgvector locally. Why pgvector
                                 # in the same DB instead of a separate vector store:
                                 # one less service to run/debug for a solo project.
  db/
    001_canonical_schema.sql    # The ONE shape all data sources map into.
                                 # Auto-runs the first time you start the container.
  ingestion/
    mapping_configs/
      olist_mapping.json        # Declares how Olist's raw columns become
                                 # canonical columns. Add a new tenant by adding
                                 # a new JSON file here — not new code.
    load_data.py                # Generic loader that reads any mapping config
                                 # and previews the rename. (Currently prints a
                                 # preview — the real DB insert logic is the
                                 # next thing we build together.)
    requirements.txt
  backend/                      # Empty — Spring Boot goes here in Phase 3
  ml-service/                   # Empty — FastAPI goes here in Phase 2
  frontend/                     # Empty — React goes here in Phase 4
```

## Why this structure (the core idea of the whole project)

Olist, DataCo, and your own synthetic data all have *different* column names
and don't share any real join key. Instead of writing custom import code for
each one, every source gets a small JSON "mapping config" that says how its
columns become canonical columns. Every downstream piece — models, API,
dashboard, the AI agent — only ever talks to the canonical schema and never
needs to know where the data originally came from. That one idea is what
makes this a real multi-tenant platform instead of a one-off script.

## Step 1: Get it running (do this first)

```bash
cd profit-copilot
docker compose up -d
```

Then check:
- `http://localhost:5050` → pgadmin (login: admin@local.dev / admin) —
  connect to host `postgres`, user `copilot`, password `copilot_dev_pw`,
  db `profit_copilot`
- You should see all the canonical tables already created (tenants, products,
  orders, order_items, demand_forecasts, etc.) — the schema SQL auto-ran.

## Step 2: Verify the real datasets (don't skip this)

The DataCo columns you have came from a web search, not the real file.
Before we build the DataCo mapping config:

1. Download the real CSVs:
   - Olist: https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce
   - DataCo: https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis
2. Put Olist CSVs in `ingestion/raw_data/olist/`
3. Run, in a venv:
   ```bash
   pip install -r ingestion/requirements.txt
   python ingestion/load_data.py --config ingestion/mapping_configs/olist_mapping.json --raw-dir ingestion/raw_data/olist
   ```
4. For DataCo, open it in pandas and check `df.columns`, `df.isna().sum()`,
   and specifically whether any column represents an actual return/cancellation
   — not just `Late_delivery_risk`. Report back what you find and we'll write
   its mapping config next.

## Known gap to design around, not ignore

**Neither Olist nor DataCo has a genuine row-level "was this returned"
label.** The plan is:
- Olist → derive a *weak proxy* (`review_score <= 2` → `is_returned_proxy = TRUE`)
- Your own **synthetic tenant generator** (not built yet — this is the next
  real piece of code we need to write) → the actual source of ground-truth
  `is_returned` labels for training the return-risk model
- DataCo → optional third tenant, useful for delivery/profit, not returns

## What's next (in order)

1. ✅ Repo + local Postgres + canonical schema (this delivery)
2. ⬜ Verify DataCo's real columns, confirm the no-return-label finding
3. ⬜ Write the real insert logic in `load_data.py` (currently just previews)
4. ⬜ Build the synthetic tenant generator (Tenant A/B/C, 3 different schemas,
   with real `is_returned`, `return_reason`, `net_profit` labels)
5. ⬜ Start the FastAPI ml-service skeleton (Phase 2)

Tell me when Step 1 and Step 2 above are done (or if `docker compose up`
throws an error) and we'll build the synthetic generator + real ingestion
logic together next.
