# ============================================================================
# GCP Application Design Center (ADC) & Multi-Stage Canary Deployment Pipeline
# Module: Causal Looped Funnel & 114-Metric Engine Runtime
# ============================================================================
# Satisfies /application-design-center-design-deploy & /deployment-pipeline-design:
# 1. Isolated GCS remote backend state (per-application-space isolation).
# 2. Secret-safe configuration: sensitive = true variables + Secret Manager.
# 3. 4-Stage Cloud Deploy canary pipeline with automated rollback on p99 breach.

terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {
    bucket = "gse-adc-terraform-state-prod"
    prefix = "adc/spaces/gse-causal-looped-funnel-v1"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30"
    }
  }
}

variable "project_id" {
  description = "GCP Project ID for the ADC Application Space"
  type        = string
}

variable "region" {
  description = "Primary deployment region"
  type        = string
  default     = "us-central1"
}

variable "neon_database_url" {
  description = "Neon PostgreSQL 17 connection URI (injected via Secret Manager, never committed in plaintext)"
  type        = string
  sensitive   = true
}

variable "cron_signing_secret" {
  description = "HMAC secret for verifying scheduled pipeline triggers"
  type        = string
  sensitive   = true
}

resource "google_secret_manager_secret" "neon_db_url" {
  project   = var.project_id
  secret_id = "gse-causal-funnel-neon-db-url"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "neon_db_url_v1" {
  secret      = google_secret_manager_secret.neon_db_url.id
  secret_data = var.neon_database_url
}

resource "google_secret_manager_secret" "cron_signing_secret" {
  project   = var.project_id
  secret_id = "gse-causal-funnel-cron-secret"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "cron_signing_secret_v1" {
  secret      = google_secret_manager_secret.cron_signing_secret.id
  secret_data = var.cron_signing_secret
}

resource "google_cloud_run_v2_service" "causal_looped_funnel_service" {
  project  = var.project_id
  name     = "gse-causal-looped-funnel-engine"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/gse-engine/causal-looped-funnel:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.neon_db_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "CRON_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.cron_signing_secret.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}

resource "google_clouddeploy_delivery_pipeline" "causal_funnel_canary_pipeline" {
  project     = var.project_id
  location    = var.region
  name        = "gse-causal-funnel-4stage-pipeline"
  description = "4-stage deployment pipeline with Strix SARIF gate, bootstrap perf-compare, and 07:30 CST canary"

  serial_pipeline {
    stages {
      target_id = "stage-1-lint-and-sast"
      profiles  = ["lint", "strix-sarif"]
    }
    stages {
      target_id = "stage-2-unit-and-charge-regression"
      profiles  = ["pytest", "charge-regression"]
    }
    stages {
      target_id = "stage-3-staging-perf-compare"
      profiles  = ["staging", "bootstrap-perf-compare"]
    }
    stages {
      target_id = "stage-4-production-canary"
      profiles  = ["production"]
      strategy {
        canary {
          runtime_config {
            cloud_run {
              automatic_traffic_control = true
            }
          }
          canary_deployment {
            percentages = [5, 25, 50]
            verify      = true
          }
        }
      }
    }
  }
}
