# Site-Wide Autonomous Workflow & Multi-Council Census (2026-11-13)

## Executive Sequencing Mandate
- **Mind-First & Wire-First Compliance:** Week 10 slate generation and tuning are **HELD** (`WEEK10_HELD_FOR_CORPUS_COMPLETION`) while Sovereign corpus extraction, canonical placement, cognitive router wiring, MCP/prediction-engine bridges, and OOF Empirical-Bayes corpus prior calibration run to completion.
- **Zero Static Truth Regressions:** Existing registry tests pinning `AGENT_COUNCIL` (`23` seats), `AGENT_OS_REGISTRY` (`23` seats), `WORKFLOW_REGISTRY` (`14` workflows), and `externalActions === "NONE"` remain intact. Live scheduled autonomy wraps them via `apps/web/lib/autonomy/site-wide-workflow-fabric.ts` and `intelligence/ops/gse_autonomous_platform_fabric.py`.

## Full Census of Autonomous Agents & Orchestrators

| Surface / Registry | Count | Source Module | Governing Status / Safeguard |
|---|---:|---|---|
| Jarvis Agent Council (`AGENT_COUNCIL`) | 23 | `apps/web/lib/jarvis/agent-council.ts` | Statuses preserved (`DRAFT_ONLY` / `MANUAL` / `NOT_WIRED`); `externalActions: "NONE"` |
| Agent OS Registry (`AGENT_OS_REGISTRY`) | 23 | `apps/web/lib/agents/agent-registry.ts` | Mapped 1:1 with cockpit surfaces + `evaluateAgentRun` contract enforcement |
| Seat SubagentTemplates | 21 | `apps/web/lib/jarvis/agent-council.ts` (`subagentTemplates`) | Narrow tier 0/1 specialists (`requiresParentReview: true`) |
| AI Council Adversarial DESTROY Seats | 10 | `packages/ai-council/src/seats.ts` | Executes `runDestroyPass(GSE_PUBLIC_CORPUS)` for FTC/NAD/compliance blocks |
| War Room Signal Watchers (`AGENTS`) | 8 | `apps/web/lib/war-room/agents.ts` | `line`, `sharp`, `public`, `injury`, `matchup`, `disagree`, `narrative`, `responsible` |
| Governed Workflows (`WORKFLOW_REGISTRY`) | 14 | `apps/web/lib/workflows/workflow-registry.ts` | Scheduled via `site-wide-workflow-fabric.ts`; `picks-intelligence` gated until corpus complete |
| Scheduled Vercel Crons (`vercel.json`) | 40 | `apps/web/vercel.json`, `vercel.json`, `cron-schedule-manifest.ts` | Includes `/api/cron/site-wide-workflows` (`12 0,3,6,13,16,19,22 * * *`), Bearer-only auth, Neon quiet-window safe |
| Google Jules REST (`v1alpha`) | 28 sources / 167 sessions (cached baseline) | `intelligence/ops/openai_ecosystem_jules_and_opendots_engine.py` | Polled live when `--jules-audit` + `JULES_API_KEY` set; continuity archiving enabled |

## Pluggable Model & Inference Routing Matrix

Implemented in `apps/web/lib/inference/multi-provider-router.ts`, `intelligence/ops/gse_gsi_qwencloud_free_router.py`, `intelligence/foundry_bridge/multi_lane_sovereign_extractor.py`, and `intelligence/ops/gse_autonomous_platform_fabric.py`:

1. **`free` / `hybrid_auto` (Default, `$0.00` Spend):**
   - Primary Dual-Cloud Alibaba QwenCloud Model Studio (`DASHSCOPE_API_KEY` / `QWEN_GSE_API_KEY`, Singapore `ap-southeast-1` `1M`-token free pools, `$0.00`): `qwen-flash-character`, `qwen-plus-character` (expiring `2026-11-18`), `kimi-k2.7-code`, `deepseek-v4-flash-0731`, `deepseek-v4-pro-0813`, `qwen3-coder-flash`.
   - Secondary Dual-Cloud NVIDIA NIM Serverless (`NVIDIA_GSE_API_KEY` / `NVIDIA_API_KEY`, Beexly `40 RPM` free developer tier, `$0.00`): `nvidia/nemotron-3-ultra-550b-a55b` (plus `minimaxai/minimax-m3.1-flash` and `nvidia/nemotron-3.5-lightning-30b-a3b`).
   - Tertiary `ModelScope` (`MODELSCOPE_API_KEY`, `$0.00` — currently returns HTTP 401 `Please bind your Alibaba Cloud account before use` until bound in console; `APIMart` currently returns HTTP 402 `Payment Required`, so both are bypassed cleanly).
   - Last-resort `$0.00` fallback: `OpenRouter :free` (`cohere/north-mini-code:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`, `@preset/gse-free-content-lane`, `$0.00`), followed by deterministic CI offline fallback (`$0.00`) when no remote provider is reachable.
2. **`gcp_credit` (Credit-Backed Pool, `$103.11` GCP Credits):**
   - Opt-in Vertex OpenAI-compatible Gemini endpoint (`google/gemini-2.5-flash`) with auto-fallback to free lanes if credits/quota constrain.
3. **`deepseek_1017` (Explicit Capped Opt-In — Strictly Disabled Unless Authorized):**
   - OpenRouter `deepseek/deepseek-v4.1-flash-1017` (`GSE_ENABLE_PAID_DEEPSEEK_1017=true` AND `max_cost_usd > 0`) or AWS Bedrock `deepseek.v3.2` bridge (`GSE_ENABLE_BEDROCK_DEEPSEEK=true`). Kept disabled by default to preserve Garrett's remaining `$7.19` OpenRouter balance at `$0.00` paid spend.
4. **`jules` & Automated Media Synthesis (`JSON2Video`):**
   - Google Jules `v1alpha` (`JULES_API_KEY`) for repository-wide async engineering verification & patch intake.
   - `JSON2VIDEO_API_KEY` (`primary` + `secondary`, stored strictly outside git in local `.env`) wired into `detect_configured_model_lanes()` (`media_endpoints_ready`) for automated pick-free slate/film-room video assembly.

## Scheduling Topology (Neon Autosuspend Protected)
- **Neon Quiet Window Guard:** All scheduled workflows skip Neon DB writes during `02:30-06:30 America/Chicago` (`08:30-12:30 UTC`) using `isNeonQuietWindow`.
- **Vercel Cron #40:** `/api/cron/site-wide-workflows` at `12 0,3,6,13,16,19,22 * * *` (Bearer-only auth via `cronAuthErrorBearerOnly`).
- **GitHub Actions:** `.github/workflows/gse-site-wide-autonomous-fabric.yml` (`12 0,4,13,17,21 * * *` UTC + manual `workflow_dispatch`, dynamic `--week auto`).
- **Windows Task Scheduler + GCP Cloud Scheduler Always-Free:** `scripts/ops/register_gse_autonomous_tasks.ps1` registers `GSE-SiteWide-Autonomous-Fabric` (`2h` cadence) and `GSE-Foundry-ShardA-4to7-Worker` (`45m` cadence, `--lane free`) locally, and supports `-ConfigureGcpScheduler` for up to 2 Cloud Scheduler jobs (`<= 3` Always-Free limit).
