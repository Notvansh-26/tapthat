# TapThat 💧

**Know what's in your tap.** — US water quality dashboard built on real EPA data.

Live: [tapthat.info](https://tapthat.info)

## What It Does

- **Search by ZIP** — Enter any US ZIP code to see water quality, contaminants, and violations
- **Interactive Map** — Explore water systems across all 50 states, color-coded by risk level
- **Compare ZIP Codes** — Side-by-side comparison of up to 5 areas
- **Risk Indicators** — Safe / Caution / At Risk ratings based on EPA compliance data

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Leaflet, Recharts |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL 16 |
| Data Source | EPA ECHO + SDWIS (no API keys needed) |
| Deployment | Google Cloud Run + Cloud SQL |
| Local Dev | Docker Compose |

## Quick Start (Local)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/tapthat.git
cd tapthat

# 2. Copy env file
cp .env.example .env

# 3. Start everything
docker-compose up --build

# 4. Ingest EPA data (first time only — takes ~5 minutes)
docker-compose exec backend python -m scripts.ingest_epa_data
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs (Swagger UI)
- Database: localhost:5432

### Without Docker

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

You'll need a PostgreSQL instance running locally — update `.env` accordingly.

## Project Structure

```
tapthat/
├── backend/
│   ├── app/
│   │   ├── api/routes.py          # FastAPI endpoints
│   │   ├── models/                # SQLAlchemy models
│   │   ├── schemas/water.py       # Pydantic response schemas
│   │   ├── services/              # Business logic
│   │   ├── config.py              # Settings from env vars
│   │   ├── database.py            # DB connection
│   │   └── main.py                # FastAPI app
│   ├── scripts/
│   │   └── ingest_epa_data.py     # EPA data pipeline
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js pages
│   │   ├── components/            # React components
│   │   ├── lib/api.ts             # API client
│   │   └── styles/globals.css     # Tailwind + custom styles
│   └── package.json
├── docker/                        # Dockerfiles
├── docker-compose.yml
├── .env.example
└── DEPLOY.md                      # Google Cloud deployment guide
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/{zip}` | Water quality report for a ZIP code |
| GET | `/api/compare?zips=X&zips=Y` | Compare multiple ZIP codes |
| GET | `/api/systems` | List water systems (filterable) |
| GET | `/api/contaminants/{pwsid}` | All contaminants for a system |
| GET | `/api/history/{pwsid}` | Violation timeline for a system |
| GET | `/api/map/systems` | All systems with coordinates for map |
| GET | `/health` | Health check |

## Data Sources

All data is free and public — no API keys required.

- **EPA ECHO SDW API** — Water system compliance, violations, enforcement
- **EPA Envirofacts SDWIS** — Geographic areas, violation details, Lead/Copper results

Data is cached in PostgreSQL and refreshed weekly via the ingestion script.

## License

MIT
