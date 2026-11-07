# ==============================================================================
# OpenRouter Stealth-Skeleton Provider & Infrastructure-as-Code (Terraform)
# Reference: https://openrouter.ai/docs/guides/overview/terraform
#            https://openrouter.ai/docs/guides/providers/integration
#            https://openrouter.ai/docs/guides/providers/traffic-routing
#            https://openrouter.ai/docs/guides/overview/mcp-server
# ==============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
    restapi = {
      source  = "Mastercard/restapi"
      version = "~> 1.20"
    }
  }
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID hosting the GSE Stealth-Skeleton Provider Worker and RLHF Queue."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare Zone ID for galaxysportsedge.com."
}

variable "openrouter_provisioning_api_key" {
  type        = string
  sensitive   = true
  description = "OpenRouter Provisioning / Provider Management API Key for declarative key, limit, and endpoint management."
}

variable "openrouter_provider_secret" {
  type        = string
  sensitive   = true
  description = "Shared secret for OpenRouter Private Endpoint validation (/validate, /activate)."
}

variable "openrouter_provider_slug" {
  type        = string
  default     = "gse"
  description = "Registered OpenRouter provider slug for GSE Stealth-Skeleton."
}

variable "monthly_credit_limit_usd" {
  type        = number
  default     = 50
  description = "Hard monthly USD credit ceiling enforced on provisioned OpenRouter workhorse keys (Zero-Waste Cost Doctrine)."
}

# ------------------------------------------------------------------------------
# 1. OpenRouter Provisioning & Provider Management REST API Provider
# ------------------------------------------------------------------------------
provider "restapi" {
  uri                  = "https://openrouter.ai/api/v1"
  write_returns_object = true
  headers = {
    Authorization = "Bearer ${var.openrouter_provisioning_api_key}"
    Content-Type  = "application/json"
  }
}

# Declarative OpenRouter Scoped API Key for GSE Workhorse & Evaluation Routing
resource "restapi_object" "openrouter_gse_workhorse_key" {
  path         = "/keys"
  id_attribute = "data/hash"

  data = jsonencode({
    name              = "gse-stealth-skeleton-workhorse-prod"
    limit             = var.monthly_credit_limit_usd
    limit_reset       = "monthly"
    include_byok_in_limit = true
  })
}

# Declarative OpenRouter Provider Links & Metadata (Section 13 Management API)
resource "restapi_object" "openrouter_provider_metadata" {
  path         = "/providers/${var.openrouter_provider_slug}"
  id_attribute = "slug"
  update_method = "PATCH"

  data = jsonencode({
    terms_of_service_url = "https://www.galaxysportsedge.com/terms"
    privacy_policy_url   = "https://www.galaxysportsedge.com/privacy"
    status_page_url      = "https://stealth.galaxysportsedge.com/v1/providers/health"
  })
}

# ------------------------------------------------------------------------------
# 2. Cloudflare Queue for Execution-Verified DPO/GRPO Crowd-RLHF
# ------------------------------------------------------------------------------
resource "cloudflare_queue" "crowd_rlhf_queue" {
  account_id = var.cloudflare_account_id
  name       = "gse-crowd-rlhf-dpo-grpo-queue"
}

# ------------------------------------------------------------------------------
# 3. Cloudflare Worker: GSE Stealth-Skeleton Provider Gateway + MCP Server
# ------------------------------------------------------------------------------
resource "cloudflare_workers_script" "stealth_skeleton_provider" {
  account_id         = var.cloudflare_account_id
  name               = "gse-stealth-skeleton-provider"
  content            = file("${path.module}/../../workers/stealth-skeleton-provider/src/index.ts")
  module             = true
  compatibility_date = "2026-11-01"

  plain_text_binding {
    name = "STEALTH_SKELETON_PHASE"
    text = "dual"
  }

  plain_text_binding {
    name = "STEALTH_SKELETON_RATE_LIMIT_SHED"
    text = "false"
  }

  secret_text_binding {
    name = "OPENROUTER_PROVIDER_SECRET"
    text = var.openrouter_provider_secret
  }

  queue_binding {
    binding = "CROWD_RLHF_QUEUE"
    queue   = cloudflare_queue.crowd_rlhf_queue.name
  }
}

resource "cloudflare_workers_route" "stealth_skeleton_gateway_route" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "stealth.galaxysportsedge.com/*"
  script_name = cloudflare_workers_script.stealth_skeleton_provider.name
}

# ------------------------------------------------------------------------------
# 4. Outputs
# ------------------------------------------------------------------------------
output "stealth_provider_models_endpoint" {
  description = "OpenRouter Provider Integration v2.4 List Models endpoint."
  value       = "https://stealth.galaxysportsedge.com/v1/models"
}

output "stealth_provider_health_endpoint" {
  description = "OpenRouter Provider SLA, Sinkhorn convergence, and PageIndex health endpoint."
  value       = "https://stealth.galaxysportsedge.com/v1/providers/health"
}

output "stealth_provider_mcp_endpoint" {
  description = "JSON-RPC 2.0 Model Context Protocol (MCP 2024-11-05) endpoint."
  value       = "https://stealth.galaxysportsedge.com/mcp"
}
