#!/usr/bin/env bash
# infra/gcp/scripts/bootstrap-gcp-free-tier.sh
# Bootstraps GSE scale-to-zero GCP primitives in project `galaxysportsedge`.
# Strictly free-tier / scale-to-zero: NO GKE, NO always-on VMs, NO Cloud SQL migration.

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-galaxysportsedge}"
REGION="${GCP_REGION:-us-central1}"

echo "[INFO] Configuring project $PROJECT_ID ($REGION)..."
gcloud config set project "$PROJECT_ID"

# Enable only required serverless/analytics/observability APIs
gcloud services enable \
  pubsub.googleapis.com \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  bigquery.googleapis.com \
  monitoring.googleapis.com \
  language.googleapis.com

# Create Pub/Sub ingestion topic + dead-letter topic (free tier)
gcloud pubsub topics create gse-game-events || echo "[INFO] Topic gse-game-events exists"
gcloud pubsub topics create gse-game-events-dlq || echo "[INFO] Topic gse-game-events-dlq exists"

# Create BigQuery dataset + partitioned tables
bq --location=US mk --dataset "${PROJECT_ID}:gse_analytics" || echo "[INFO] Dataset gse_analytics exists"
bq query --use_legacy_sql=false < infra/gcp/bigquery/schema_and_bqml_baseline.sql

# Verify zero idle GKE clusters or Compute Engine VMs exist
echo "[AUDIT] Active GKE clusters:"
gcloud container clusters list --format="table(name,location,status)" || true
echo "[AUDIT] Active Compute Engine VMs:"
gcloud compute instances list --format="table(name,zone,status)" || true

echo "[DONE] GCP scale-to-zero foundation ready."
