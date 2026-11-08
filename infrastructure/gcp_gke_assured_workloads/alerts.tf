# alerts.tf — GKE Four Golden Signals & Multi-Window Burn Rate (MWMBR) SLO Alerts
# Enforces Tier 1 zero-KSM-surcharge native/cAdvisor metrics (`kubernetes.io/*`, `container_*`)
# and `condition_prometheus_query_language` on `google_monitoring_alert_policy`.

# 1. Golden Signal: Latency (P95 > threshold for 5m)
resource "google_monitoring_alert_policy" "gse_gke_latency_p95" {
  project      = var.project_id
  display_name = "GSE GKE Engine P95 Latency High (${var.cluster_name})"
  combiner     = "OR"
  enabled      = true

  user_labels = {
    created-with-google-skill = "gke-alert-configuration"
    golden-signal             = "latency"
    cost-tier                 = "tier-1-zero-surcharge"
  }

  conditions {
    display_name = "P95 Request Latency > ${var.latency_p95_threshold_seconds}s"
    condition_prometheus_query_language {
      query             = <<-EOT
        histogram_quantile(0.95,
          sum by (le, cluster, namespace_name) (
            rate(http_request_duration_seconds_bucket{cluster="${var.cluster_name}", namespace_name="${var.namespace}"}[5m])
          )
        ) > ${var.latency_p95_threshold_seconds}
      EOT
      duration          = "300s"
      evaluation_interval = "60s"
    }
  }

  notification_channels = var.notification_channels
}

# 2. Golden Signal: Errors — Fast-Burn Multi-Window Multi-Burn-Rate (14.4x over 1h AND 5m, duration = "0s")
resource "google_monitoring_alert_policy" "gse_gke_error_budget_fast_burn" {
  project      = var.project_id
  display_name = "GSE GKE Error Budget Fast Burn 14.4x (${var.cluster_name})"
  combiner     = "OR"
  enabled      = true

  user_labels = {
    created-with-google-skill = "google-cloud-slo-alert-configuration"
    secondary-skill           = "gke-alert-configuration"
    golden-signal             = "errors"
    burn-rate-window          = "1h-5m-14-4x"
  }

  conditions {
    display_name = "Fast Burn 14.4x (1h and 5m windows both exceeding error budget)"
    condition_prometheus_query_language {
      query             = <<-EOT
        (
          (
            sum(rate(http_requests_total{cluster="${var.cluster_name}", namespace_name="${var.namespace}", status=~"5.."}[1h]))
            /
            clamp_min(sum(rate(http_requests_total{cluster="${var.cluster_name}", namespace_name="${var.namespace}"}[1h])), 1e-9)
          ) > (14.4 * (1 - ${var.slo_target}))
        )
        and
        (
          (
            sum(rate(http_requests_total{cluster="${var.cluster_name}", namespace_name="${var.namespace}", status=~"5.."}[5m]))
            /
            clamp_min(sum(rate(http_requests_total{cluster="${var.cluster_name}", namespace_name="${var.namespace}"}[5m])), 1e-9)
          ) > (14.4 * (1 - ${var.slo_target}))
        )
      EOT
      duration          = "0s"
      evaluation_interval = "60s"
    }
  }

  notification_channels = var.notification_channels
}

# 3. Golden Signal: Traffic Drop / Complete Blackhole (`default 0 == 0` guard)
resource "google_monitoring_alert_policy" "gse_gke_traffic_drop_zero" {
  project      = var.project_id
  display_name = "GSE GKE Traffic Complete Drop (${var.cluster_name})"
  combiner     = "OR"
  enabled      = true

  user_labels = {
    created-with-google-skill = "gke-alert-configuration"
    golden-signal             = "traffic"
    cost-tier                 = "tier-1-zero-surcharge"
  }

  conditions {
    display_name = "Request Traffic Dropped to Zero (or absent series)"
    condition_prometheus_query_language {
      query             = <<-EOT
        (sum(rate(http_requests_total{cluster="${var.cluster_name}", namespace_name="${var.namespace}"}[5m])) or vector(0)) == 0
      EOT
      duration          = "300s"
      evaluation_interval = "60s"
    }
  }

  notification_channels = var.notification_channels
}

# 4. Golden Signal: Saturation — Memory Working Set vs Container Limit ONLY (never page solely on CPU throttling)
resource "google_monitoring_alert_policy" "gse_gke_memory_saturation" {
  project      = var.project_id
  display_name = "GSE GKE Container Memory Saturation > 90% (${var.cluster_name})"
  combiner     = "OR"
  enabled      = true

  user_labels = {
    created-with-google-skill = "gke-alert-configuration"
    golden-signal             = "saturation"
    cost-tier                 = "tier-1-zero-surcharge"
  }

  conditions {
    display_name = "Container Memory Working Set / Limit > 0.90"
    condition_prometheus_query_language {
      query             = <<-EOT
        (
          sum by (cluster, namespace_name, pod_name, container_name) (
            container_memory_working_set_bytes{cluster="${var.cluster_name}", namespace_name="${var.namespace}", container_name!=""}
          )
          /
          clamp_min(
            sum by (cluster, namespace_name, pod_name, container_name) (
              container_spec_memory_limit_bytes{cluster="${var.cluster_name}", namespace_name="${var.namespace}", container_name!=""}
            ),
            1
          )
        ) > 0.90
      EOT
      duration          = "300s"
      evaluation_interval = "60s"
    }
  }

  notification_channels = var.notification_channels
}
