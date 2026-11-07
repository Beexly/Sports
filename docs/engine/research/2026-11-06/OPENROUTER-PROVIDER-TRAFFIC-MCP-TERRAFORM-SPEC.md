# OpenRouter Provider Integration, Traffic Routing, MCP Server & Terraform Specification

**Date:** 2026-11-06  
**Bucket:** `docs/engine/research/2026-11-06/`  
**Implementation Targets:**
- `workers/stealth-skeleton-provider/src/index.ts`
- `workers/stealth-skeleton-provider/src/__tests__/stealth-skeleton-provider.test.ts`
- `infra/terraform/openrouter-stealth-skeleton.tf`

---

## 1. OpenRouter Provider Integration (`https://openrouter.ai/docs/guides/providers/integration`)

The GSE Stealth-Skeleton Provider Gateway (`workers/stealth-skeleton-provider/src/index.ts`) implements the OpenRouter Provider Integration v2.4 specification across all 5 model endpoints:
1. `gse/stealth-skeleton-alpha` (Free evaluation tier, Auto Exacto tool-calling, DPO/GRPO Crowd-RLHF compiler when `data_collection !== "deny"`)
2. `gse/skeleton-v1` (Sovereign production reasoning model, ZDR enforced)
3. `gse/skeleton-v1-fast` (Option 1 `-fast` priority service tier)
4. `gse/skeleton-v1` (`variant: "batch"`, 50% batch discount)
5. `gse/skeleton-flash` (Ultra-low-latency fast reasoning endpoint with PageIndex tree navigation)

### Enriched `/v1/models` & `/v1/providers/health` Contract
- `GET /v1/models` serves all 5 models with:
  - `schema_version: "2.4"`
  - `quantization: "fp16"`
  - `tokenizer: "GSE-Hybrid-BPE"`
  - `architecture: { modality: "text->text", input_modalities: ["text"], output_modalities: ["text"], tokenizer: "GSE-Hybrid-BPE", instruct_type: "chatml" }`
  - `top_provider: { context_length: 131072, max_completion_tokens: 16384, is_moderated: false }`
  - `supported_parameters`: `["temperature", "top_p", "max_tokens", "stop", "tools", "tool_choice", "response_format", "structured_outputs", "reasoning"]`
- `GET /v1/providers/health` returns `200 OK` with live SLA status (`uptime_target: 0.999`, `ttft_p95_ms`, `exacto_tool_calling_accuracy`), live Sinkhorn-Knopp optimal transport convergence audit (`l1_marginal_residual`, `l_inf_marginal_residual`), PageIndex document-tree readiness, and active model IDs.

---

## 2. OpenRouter Traffic Routing (`https://openrouter.ai/docs/guides/providers/traffic-routing`)

`resolveOpenRouterTrafficRouting(requestedModel, provider)` parses the optional `provider` routing object in `POST /v1/chat/completions`:
- `order?: string[]` — Filters ordered provider slugs against `ignore?: string[]`.
- `allow_fallbacks?: boolean` — Controls fallback eligibility across sovereign and backup endpoints.
- `require_parameters?: boolean` — Enforces strict parameter support verification.
- `data_collection?: "allow" | "deny"` — When `"deny"` is specified, enforces Zero Data Retention (`zero_data_retention_enforced: true`) and bypasses `CROWD_RLHF_QUEUE` persistence even on `gse/stealth-skeleton-alpha`.
- `quantizations?: string[]` — Filters quantization targets (default `["fp16"]`).
- `sort?: "price" | "throughput" | "latency"`:
  - `"latency"` routes requests to `gse/skeleton-flash` (`latency_flash_lane`, 2 speculative lanes).
  - `"throughput"` routes requests to `gse/skeleton-v1-fast` (`throughput_parallel_speculative_lane`, 4 speculative lanes).
  - `"price"` (or constrained `max_price`) routes requests to `price_zero_waste_workhorse_lane` (`gse/stealth-skeleton-alpha` when `max_price` enforces `$0.00`).
- Resolved routing telemetry is returned in `x_gse_skeleton.openrouter_traffic_routing` and `gse_metadata.openrouter_traffic_routing`.

---

## 3. OpenRouter MCP Server (`https://openrouter.ai/docs/guides/overview/mcp-server`)

`GET /mcp` and `POST /mcp` implement the JSON-RPC 2.0 Model Context Protocol (`protocolVersion: "2024-11-05"`):
- `initialize`: Returns `serverInfo: { name: "gse-stealth-skeleton-mcp", version: "2.4.0" }` and `capabilities: { tools: {} }`.
- `tools/list`: Exposes 5 domain-specialized MCP tools:
  1. `gse_skeleton_reason` — First-principles mathematical, spectral PDE, conformal, and situational reasoning with PageIndex tree RAG and Sinkhorn-Knopp verification.
  2. `gse_predict_game_360` — 360-degree full-board game & prop evaluation (`1Q–4Q`, `1H/2H`, kicking, IDP, TDs, skill props) with Romano CQR 90% bands and Kadavath $P(\text{IK})$ pass-discipline gate.
  3. `gse_build_dfs_lineup` — Correlation-aware DraftKings/FanDuel GPP & cash lineup construction using Sinkhorn optimal transport stack weights.
  4. `gse_generate_content_pack` — Customer-facing film & matchup copy generation behind the 3-Class Crown IP and paywall firewall.
  5. `gsi_evaluate_biomechanics_trauma` — Athlete acute-to-chronic workload ratio (ACWR), soft-tissue re-injury hazard, and second-half fatigue decay evaluation.
- `tools/call`: Executes the requested tool deterministically and returns MCP-compliant `content: [{ type: "text", text: JSON.stringify(...) }]`.

---

## 4. OpenRouter Terraform Infrastructure-as-Code (`https://openrouter.ai/docs/guides/overview/terraform`)

`infra/terraform/openrouter-stealth-skeleton.tf` codifies:
1. OpenRouter Provisioning API scoped key resource (`restapi_object.openrouter_gse_workhorse_key`) with hard monthly USD spend ceilings (`limit_reset = "monthly"`).
2. OpenRouter Provider Management metadata (`restapi_object.openrouter_provider_metadata`) linking Terms of Service, Privacy Policy, and `/v1/providers/health` status page.
3. Cloudflare Worker (`cloudflare_workers_script.stealth_skeleton_provider`) + RLHF Queue (`cloudflare_queue.crowd_rlhf_queue`) + custom route (`stealth.galaxysportsedge.com/*`).
