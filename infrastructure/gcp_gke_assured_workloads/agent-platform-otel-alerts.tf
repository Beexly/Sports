# Agent Platform OpenTelemetry & Online Monitor Alerting Policies (agent-platform-alert-configuration)
# Provider >= 6.0.0 required for condition_sql.
# Enforces dynamic multi-resource grouping (`by (gen_ai_agent_name)` and `GROUP BY agent_id`)
# without single-resource pinning, and `ALIGN_PERCENTILE_50` on DELTA distribution scores.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0.0"
    }
  }
}

variable "project_id" {
  type        = string
  description = "Target Google Cloud Project ID for Agent Platform OTel alerting"
  default     = "gse-enterprise-prod"
}

variable "log_dataset_table" {
  type        = string
  description = "Linked BigQuery/Log Analytics _AllLogs table identifier"
  default     = "gse-enterprise-prod.default_log_bucket._AllLogs"
}

variable "notification_channels" {
  type        = list(string)
  description = "Optional notification channels (left empty by default until confirmed by user)"
  default     = []
}

# 1. Reliability (1/5): Agent Invocation Latency Anomaly Monitoring
resource "google_monitoring_alert_policy" "reliability_latency_anomaly" {
  project               = var.project_id
  display_name          = "Agent Platform - Invocation Latency Anomaly (Dynamic Multi-Agent)"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "p95 Invoke Agent Duration Rate by gen_ai_agent_name"
    condition_prometheus_query_language {
      query    = "sum(rate(workload_googleapis_com:gen_ai_invoke_agent_duration_sum{monitored_resource=\"generic_node\"}[5m])) by (gen_ai_agent_name) / sum(rate(workload_googleapis_com:gen_ai_invoke_agent_duration_count{monitored_resource=\"generic_node\"}[5m])) by (gen_ai_agent_name) > 5"
      duration = "300s"
    }
  }
}

# 2. Reliability (2/5): Error Rate - Fast Burn SLO (1-Hour Window)
resource "google_monitoring_alert_policy" "reliability_error_rate_fast_burn_1h" {
  project               = var.project_id
  display_name          = "Agent Platform - Error Rate Fast Burn SLO (1h Window)"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Fast Burn Ratio Error Rate (1h) by gen_ai_agent_name"
    condition_prometheus_query_language {
      query    = "sum(rate(workload_googleapis_com:gen_ai_invoke_agent_duration_count{monitored_resource=\"generic_node\", status=\"ERROR\"}[1h])) by (gen_ai_agent_name) / sum(rate(workload_googleapis_com:gen_ai_invoke_agent_duration_count{monitored_resource=\"generic_node\"}[1h])) by (gen_ai_agent_name) > 0.144"
      duration = "120s"
    }
  }
}

# 3. Reliability (3/5): Error Rate - Slow Burn SLO (3-Day Window)
resource "google_monitoring_alert_policy" "reliability_error_rate_slow_burn_3d" {
  project               = var.project_id
  display_name          = "Agent Platform - Error Rate Slow Burn SLO (3d Window)"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Slow Burn Ratio Error Rate (72h) by gen_ai_agent_name"
    condition_prometheus_query_language {
      query    = "sum(rate(workload_googleapis_com:gen_ai_invoke_agent_duration_count{monitored_resource=\"generic_node\", status=\"ERROR\"}[72h])) by (gen_ai_agent_name) / sum(rate(workload_googleapis_com:gen_ai_invoke_agent_duration_count{monitored_resource=\"generic_node\"}[72h])) by (gen_ai_agent_name) > 0.01"
      duration = "900s"
    }
  }
}

# 4. Reliability (4/5): Model Call Error Rate (SQL-Based Observability Analytics)
resource "google_monitoring_alert_policy" "reliability_model_call_error_rate_sql" {
  project               = var.project_id
  display_name          = "Agent Platform - Downstream Model Call Error Rate (SQL)"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Downstream Model Call Error Ratio Grouped by Agent & Model"
    condition_sql {
      query = <<-EOT
        SELECT
          JSON_VALUE(resource.attributes, '$."cloud.resource_id"') AS agent_id,
          JSON_VALUE(attributes, '$."gen_ai.request.model"') AS model_name,
          COUNTIF(status.code != 0) / COUNT(*) AS error_ratio
        FROM `${var.log_dataset_table}`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE)
        GROUP BY agent_id, model_name
        HAVING error_ratio > 0.05
      EOT
      minutes {
        periodicity = 5
      }
    }
  }
}

# 5. Reliability (5/5): Tool Call Error Rate (SQL-Based Observability Analytics)
resource "google_monitoring_alert_policy" "reliability_tool_call_error_rate_sql" {
  project               = var.project_id
  display_name          = "Agent Platform - Downstream Tool Call Error Rate (SQL)"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Downstream Tool Call Error Ratio Grouped by Agent & Tool"
    condition_sql {
      query = <<-EOT
        SELECT
          JSON_VALUE(resource.attributes, '$."cloud.resource_id"') AS agent_id,
          JSON_VALUE(attributes, '$."gen_ai.tool.name"') AS tool_name,
          COUNTIF(status.code != 0) / COUNT(*) AS error_ratio
        FROM `${var.log_dataset_table}`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE)
        GROUP BY agent_id, tool_name
        HAVING error_ratio > 0.05
      EOT
      minutes {
        periodicity = 5
      }
    }
  }
}

# 6. Quality (1/3): Final Response Quality (Vertex AI Online Evaluator - ALIGN_PERCENTILE_50)
resource "google_monitoring_alert_policy" "quality_final_response" {
  project               = var.project_id
  display_name          = "Agent Platform - Final Response Quality Degradation"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Online Evaluator Final Response Quality p50 < 0.75"
    condition_threshold {
      filter          = "resource.type = \"aiplatform.googleapis.com/OnlineEvaluator\" AND metric.type = \"aiplatform.googleapis.com/online_evaluator/scores\" AND metric.labels.metric_name = \"final_response_quality\""
      comparison      = "COMPARISON_LT"
      threshold_value = 0.75
      duration        = "300s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_50"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.online_evaluator_id"]
      }
    }
  }
}

# 7. Quality (2/3): Tool Use Quality (Vertex AI Online Evaluator - ALIGN_PERCENTILE_50)
resource "google_monitoring_alert_policy" "quality_tool_use" {
  project               = var.project_id
  display_name          = "Agent Platform - Tool Use Quality Degradation"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Online Evaluator Tool Use Quality p50 < 0.80"
    condition_threshold {
      filter          = "resource.type = \"aiplatform.googleapis.com/OnlineEvaluator\" AND metric.type = \"aiplatform.googleapis.com/online_evaluator/scores\" AND metric.labels.metric_name = \"tool_use_quality\""
      comparison      = "COMPARISON_LT"
      threshold_value = 0.80
      duration        = "300s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_50"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.online_evaluator_id"]
      }
    }
  }
}

# 8. Quality (3/3): Hallucination (Vertex AI Online Evaluator - ALIGN_PERCENTILE_50)
resource "google_monitoring_alert_policy" "quality_hallucination" {
  project               = var.project_id
  display_name          = "Agent Platform - Grounding / Hallucination Score Degradation"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Online Evaluator Hallucination Groundedness p50 < 0.85"
    condition_threshold {
      filter          = "resource.type = \"aiplatform.googleapis.com/OnlineEvaluator\" AND metric.type = \"aiplatform.googleapis.com/online_evaluator/scores\" AND metric.labels.metric_name = \"hallucination\""
      comparison      = "COMPARISON_LT"
      threshold_value = 0.85
      duration        = "300s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_50"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.online_evaluator_id"]
      }
    }
  }
}

# 9. Cost (1/1): Rapid Token Burn Rate (Anomaly Monitoring)
resource "google_monitoring_alert_policy" "cost_rapid_token_burn_rate" {
  project               = var.project_id
  display_name          = "Agent Platform - Rapid Token Burn Rate Anomaly"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Token Usage Rate by gen_ai_agent_name"
    condition_prometheus_query_language {
      query    = "sum(rate(workload_googleapis_com:gen_ai_client_token_usage_sum{monitored_resource=\"generic_node\"}[5m])) by (gen_ai_agent_name) > 5000"
      duration = "300s"
    }
  }
}

# 10. Safety (1/1): High Model Armor Safety Policy Trigger Rate (SQL-Based)
resource "google_monitoring_alert_policy" "safety_model_armor_trigger_rate_sql" {
  project               = var.project_id
  display_name          = "Agent Platform - High Model Armor Safety Policy Trigger Rate (SQL)"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Model Armor Blocked Prompt/Response Ratio by Agent"
    condition_sql {
      query = <<-EOT
        SELECT
          JSON_VALUE(resource.attributes, '$."cloud.resource_id"') AS agent_id,
          COUNTIF(JSON_VALUE(json_payload, '$.safety_verdict') = 'BLOCKED') / COUNT(*) AS block_ratio
        FROM `${var.log_dataset_table}`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE)
        GROUP BY agent_id
        HAVING block_ratio > 0.05
      EOT
      minutes {
        periodicity = 5
      }
    }
  }
}

# 11. Security (1/1): High IAM Permission Denied Trigger Rate (SQL-Based)
resource "google_monitoring_alert_policy" "security_iam_permission_denied_rate_sql" {
  project               = var.project_id
  display_name          = "Agent Platform - High IAM Permission Denied Trigger Rate (SQL)"
  combiner              = "OR"
  notification_channels = var.notification_channels

  conditions {
    display_name = "Cloud Audit Logs status.code = 7 (PERMISSION_DENIED) by Agent Principal"
    condition_sql {
      query = <<-EOT
        SELECT
          proto_payload.audit_log.authentication_info.principal_subject AS agent_id,
          COUNTIF(proto_payload.audit_log.status.code = 7) AS permission_denied_count
        FROM `${var.log_dataset_table}`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE)
        GROUP BY agent_id
        HAVING permission_denied_count >= 5
      EOT
      minutes {
        periodicity = 5
      }
    }
  }
}
