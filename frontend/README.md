# Profit Copilot — Frontend

Business-facing React app for the AI Profit & Risk Analyzer platform.

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

The Vite dev server proxies `/api` → `http://localhost:8080` automatically.

## Environment

Copy `.env.example` to `.env`:

```env
VITE_API_BASE_URL=
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

Leave `VITE_API_BASE_URL` empty to use the dev proxy. Set Google client ID to enable Google sign-in.

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Login (Google OAuth + demo) |
| `/upload` | Protected | CSV upload |
| `/dashboard` | Protected | KPIs, forecast chart, SKU table |
| `/copilot` | Protected | AI chat |

## Backend integration

Uses existing Spring Boot endpoints:

- `POST /api/auth/login` — authentication
- `GET /api/profit-summary` — SKU profit data
- `GET /api/forecast/{skuId}` — demand forecast
- `GET /api/risky-products` — return risk overlay
- `GET /api/chat` — AI copilot

When the backend is offline, the UI falls back to demo data gracefully.

## Multi-tenant

Users see a fixed **Company: Clean Co** label (no tenant dropdown). Tenant ID is resolved from the authenticated session internally (tenant 3 for demo).

## Production build

```bash
npm run build
npm run preview
```
