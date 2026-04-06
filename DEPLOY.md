# Deploying TapThat to Google Cloud

## 1. Prerequisites

- [Google Cloud account](https://cloud.google.com/) (free tier is fine)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed
- [Docker](https://www.docker.com/products/docker-desktop/) installed

## 2. One-time Google Cloud Setup

```bash
# Login
gcloud auth login

# Create a project
gcloud projects create tapthat-app --name="TapThat"
gcloud config set project tapthat-app

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## 3. Set Up Cloud SQL (PostgreSQL)

```bash
# Create a PostgreSQL instance (free tier eligible — db-f1-micro)
gcloud sql instances create tapthat-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1

# Set password
gcloud sql users set-password postgres \
  --instance=tapthat-db \
  --password=YOUR_SECURE_PASSWORD_HERE

# Create database
gcloud sql databases create tapthat --instance=tapthat-db
```

## 4. Deploy Backend to Cloud Run

```bash
# From project root
cd backend

# Build and push
gcloud builds submit --tag gcr.io/tapthat-app/backend

# Deploy
gcloud run deploy tapthat-backend \
  --image gcr.io/tapthat-app/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances tapthat-app:us-central1:tapthat-db \
  --set-env-vars "POSTGRES_HOST=/cloudsql/tapthat-app:us-central1:tapthat-db" \
  --set-env-vars "POSTGRES_USER=postgres" \
  --set-env-vars "POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE" \
  --set-env-vars "POSTGRES_DB=tapthat" \
  --set-env-vars "CORS_ORIGINS=https://tapthat.info"
```

## 5. Deploy Frontend to Cloud Run

```bash
cd frontend

# Build and push
gcloud builds submit --tag gcr.io/tapthat-app/frontend

# Deploy
gcloud run deploy tapthat-frontend \
  --image gcr.io/tapthat-app/frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL/api"
```

## 6. Run Data Ingestion

```bash
# Connect to Cloud SQL and run the ingestion script
gcloud run jobs create tapthat-ingest \
  --image gcr.io/tapthat-app/backend \
  --command "python,-m,scripts.ingest_epa_data" \
  --add-cloudsql-instances tapthat-app:us-central1:tapthat-db \
  --set-env-vars "POSTGRES_HOST=/cloudsql/tapthat-app:us-central1:tapthat-db,POSTGRES_USER=postgres,POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE,POSTGRES_DB=tapthat"

# Run it
gcloud run jobs execute tapthat-ingest
```

## 7. Domain Setup (tapthat.info)

### Buy the domain
- Namecheap, Google Domains, or Cloudflare Registrar
- `.info` domains are usually $5-15/year

### Point to Cloud Run
```bash
# Map your custom domain
gcloud beta run domain-mappings create \
  --service tapthat-frontend \
  --domain tapthat.info \
  --region us-central1
```

Then add the DNS records shown in the output to your domain registrar.

## 8. Set Up Weekly Data Refresh

Use Cloud Scheduler to re-run ingestion weekly:

```bash
gcloud scheduler jobs create http tapthat-weekly-ingest \
  --schedule="0 3 * * 1" \
  --uri="https://YOUR_REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/tapthat-app/jobs/tapthat-ingest:run" \
  --http-method=POST \
  --oauth-service-account-email=YOUR_SERVICE_ACCOUNT
```

## Cost Estimate (Free Tier)

| Service | Free Tier | Expected Usage |
|---------|-----------|----------------|
| Cloud Run | 2M requests/month | Well within |
| Cloud SQL (db-f1-micro) | Not free (~$7/mo) | Cheapest option |
| Cloud Build | 120 min/day | Well within |
| Cloud Scheduler | 3 jobs free | 1 job |

**Total: ~$7-10/month** (Cloud SQL is the only cost)

### Even Cheaper Alternative
Use [Supabase](https://supabase.com) for free PostgreSQL hosting (500MB, plenty for this data) and deploy frontend to Vercel (free). Backend stays on Cloud Run free tier. **Total: $0/month.**
