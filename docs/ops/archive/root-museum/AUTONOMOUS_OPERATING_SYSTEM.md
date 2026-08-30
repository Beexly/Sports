# GSN — The Autonomous Operating System (2026)

**Purpose:** the design spec for GSN as an autonomous back office under tight human approval gates.
**Method:** grounded in repo source (cited by path) + 2026 orchestration research (cited by URL).
**Labels:** `verified` (read in this repo) · `inferred` (derived from code, not run) · `recommended` (design proposal).
**Companion docs:** `REPO_INTELLIGENCE_REPORT.md` (§6 model-orchestration finding), `COMPETITIVE_INTELLIGENCE.md` (trust wedge), `CLAUDE.md` (non-negotiables).

> Doctrine in one line: **every agent drafts; only a human commits anything externally visible.** This is already enforced — `AGENTS[*].externalActions: "NONE"` and the agent-registry header both state it (`apps/web/lib/cockpit/agents.ts:8`, `:24`). `verified` This document keeps that invariant and builds *leverage*, not autonomy-for-its-own-sake.

---

## 0. What already exists (verified baseline — do not rebuild)

- **Six operator agents** as an enum + static registry: JARVIS/SARAH/TAL/SCOUT/AVA/BOBBY (`packages/db/prisma/schema.prisma:831`, `apps/web/lib/cockpit/agents.ts:27`). They are *roles that produce drafts*, with `externalActions: "NONE"`. `verified`
- **Task/decision state machine** with an allow-list and append-only log: `CockpitTaskStatus {NEW, ROUTED, DRAFTED, NEEDS_REVIEW, APPROVED, REJECTED, BLOCKED, ARCHIVED}` (`schema.prisma:840`); `transitionTask()` validates against `TRANSITIONS`, refuses anything else, and writes a `CockpitDecision` row in the same transaction (`apps/web/lib/cockpit/transitions.ts:32`, `:101`). `verified`
- **Risk/compliance flags** on every task: `CockpitRiskLevel {LOW, MODERATE, HIGH, COMPLIANCE_HOLD}`, `CockpitComplianceStatus {NOT_APPLICABLE, CLEAR, REVIEW_REQUIRED, HOLD, REJECTED}` (`schema.prisma:851`, `:858`). `verified`
- **Media never auto-publishes:** `CockpitMediaItem.scheduledFor` is "metadata only. There is no worker that reads it" (`schema.prisma:823`). `verified`
- **Jarvis synthesizer** — pure, I/O-free launch-readiness assessment; rules explicitly forbid auto-bet/auto-publish and emit "unknown" rather than fabricate (`apps/web/lib/cockpit/jarvis.ts:14`, `synthesizeJarvis` `:342`, `JARVIS_VERSION="v1.1"` `:128`). `verified`
- **Cost ledger + budget governor:** every Claude call is recorded (`recordClaudeApiCall`, `apps/web/lib/claude-api/usage-store.ts:91`); per-surface monthly budgets with yellow/orange/red/hard_cap thresholds and an override (`cost-monitor.ts:55`, `:127`; `budget-store.ts:32`). Spend is **measured, not optimized**. `verified`
- **The gap (R6):** every call site hardcodes `model ?? "claude-sonnet-4-6"` (six places: `messages.ts:48`, `content-generator.ts:105`, `studio/claude.ts:65`, `journal/claude.ts:43`, `intelligence-graph/model-court/answer.ts:112`, `calibration-training/claude.ts:73`), and **no prompt caching** is sent. `verified` Repo pricing constant ($3/$15 per M, `cost-monitor.ts:122`) equals real Sonnet-4.6 pricing, confirming Sonnet is today's baseline. `verified-ext`

---

## 1. The six operator agents (GSN-specific specs)

Schedule/trigger note: GSN's job substrate is **BullMQ + Redis** with `workers/` (data-refresh, pick-generation, content-publishing) plus Vercel cron (`CLAUDE.md`; `REPO_INTELLIGENCE_REPORT.md §2`). Agents below are `recommended` orchestrations layered on the **existing** task/decision machine — they enqueue `CockpitTask` rows and stop at `NEEDS_REVIEW`. None gain `externalActions`.

### JARVIS — Orchestrator / Chief of Staff
- **Mission:** route incoming work to the right agent, surface readiness, recommend next actions (`agents.ts:31`). `verified`
- **Inputs:** `synthesizeJarvis` inputs — gates, ingestion/settlement health, history counts, signal coverage, layer statuses (`jarvis.ts:106`); `OperatorPulse` task/risk aggregates (`lib/cockpit/intelligence.ts:26`). `verified`
- **Outputs:** `JarvisAssessment` (launch status, safety warnings, `recommendedNextActions`) + proposed routing for `NEW` tasks. `verified`
- **Tools:** read-only DB aggregates; `pickModelForSurface()` router (`recommended`, §2). **Memory:** stateless per run; durable memory = `CockpitDecision` log + saved Jarvis audit (`serializeJarvisAudit`, referenced `jarvis.ts:438`). `verified`
- **Schedule:** every 15 min + on task create. **Triggers:** new task, ingestion RED, settlement >12h amber/>36h red (`classifySettlement` `jarvis.ts:205`). `recommended`
- **Self-audit:** never claim `LAUNCH_READY` while a safety warning is active → downgrades to `NOT_READY_SAFETY` (`jarvis.ts:455`). `verified`
- **Escalation / HUMAN GATE:** Jarvis only *routes* (`NEW→ROUTED`); it cannot approve. **Hard gate:** publish/launch decisions require operator. `verified`
- **Failure recovery:** missing input → `UNKNOWN`, not a guess (`jarvis.ts:529`). **Metrics:** routing latency, % tasks aging >24h/>72h (`OperatorPulse.tasksAging*`). `verified`

### SARAH — Support & Review Queue
- **Mission:** draft support replies, triage into review; **never sends** (`agents.ts:41`). `verified`
- **Inputs:** support tickets, prior decisions. **Outputs:** draft reply (`DRAFTED`) + triage annotations. **Tools:** Haiku draft + banned-phrase scan (reuse `public-copy-scan`/`metadata-banned-phrases` suites, `REPO_INTELLIGENCE_REPORT.md §7`). `recommended`/`verified`
- **Memory:** ticket thread + `CockpitDecision` history. **Schedule:** on inbound ticket. **Triggers:** new ticket, SLA breach.
- **Self-audit:** every draft passes the copy-scan before `NEEDS_REVIEW`; a banned phrase forces `BLOCKED`/`COMPLIANCE_HOLD`. **Escalation:** refund/billing tickets → route to BOBBY + `riskLevel=HIGH`.
- **HUMAN GATE:** no message leaves without operator `APPROVED`. **Failure recovery:** model error → keep `ROUTED`, retry next cycle. **Metrics:** draft acceptance rate, time-to-first-draft.

### TAL — Engineering
- **Mission:** repo audits, bug triage, failing-test comments, *minor* impl drafts (`agents.ts:53`). `verified`
- **Inputs:** CI failures, typecheck/lint output, issue text. **Outputs:** investigation notes, draft diffs (as task payload, not commits). **Tools:** Sonnet (code reasoning); Opus only for cross-cutting refactors. **Memory:** task payload + decision log.
- **Schedule:** on CI red / nightly audit. **Triggers:** failing test, `npm run typecheck` error.
- **Self-audit:** a task is not `APPROVED` until "tests pass, types pass, build succeeds" (`CLAUDE.md` Autonomous Loop). `verified`
- **HARD STOPS:** **no prod deploy, no destructive DB op, no migration auto-apply.** Maps to `canApplyCalibrationAdjustments` being a hardcoded `false` (`jarvis.ts:52`; `REPO_INTELLIGENCE_REPORT.md §3`). `verified` **Escalation:** schema/migration changes → operator. **Metrics:** green-CI rate, mean-time-to-triage.

### SCOUT — Sports Research
- **Mission:** watch odds movement, injury/news, schedule signals; draft research notes (`agents.ts:65`). `verified`
- **Inputs:** The Odds API ingestion (7 sports × 3 markets, 1h freshness, `REPO_INTELLIGENCE_REPORT.md §4`), `SourceSnapshot` raw payloads, line-movement fields. `verified`
- **Outputs:** line-movement flags, context annotations on picks (feeds `factorBreakdown`). **Tools:** **Haiku** for classify/extract (cheap, high-volume); Sonnet for narrative note. **Memory:** immutable `PickSignalSnapshot` (`schema §3`). `verified`
- **Schedule:** every ingestion cycle. **Triggers:** line move beyond threshold, stale source (`SourceFreshnessStatus`). **Self-audit:** cite source snapshot or emit nothing — no fabricated stats (`CLAUDE.md` rule 2). `verified`
- **HUMAN GATE / HARD STOP:** **never auto-bet, never alter a published pick's line** (source-of-truth is structured odds, `CLAUDE.md`). **Failure recovery:** ingestion fail → flag, don't infer. **Metrics:** stale-source count, % picks with snapshot coverage.

### AVA — Content / Media
- **Mission:** draft blog/newsletter/short-form **strictly from approved data**; never publishes; waits in media queue (`agents.ts:77`). `verified`
- **Inputs:** approved picks, `factorBreakdown`, source coverage. **Outputs:** `CockpitMediaItem` draft (`qaStatus=DRAFT`, `complianceStatus=REVIEW_REQUIRED`, `approved=false` — schema defaults, `schema.prisma:911`). `verified`
- **Tools:** Sonnet draft → **Haiku** banned-phrase/SEO scan; **Opus** only for flagship long-form. **Memory:** brief + draft history. **Schedule:** on approved-pick batch / editorial calendar. **Triggers:** new featured pick.
- **Self-audit:** banned-phrase + no-fake-percentages + trust-claims suites must pass before `NEEDS_REVIEW` (`REPO_INTELLIGENCE_REPORT.md §7`). `verified`
- **HARD STOP:** **no publish/send without approval** — `scheduledFor` is inert metadata (`schema.prisma:823`); compliance-gated render still required (`Promotion` gates, §7). `verified` **Metrics:** draft→approved ratio, compliance-block rate.

### BOBBY — Funnel / Subscription / Analytics
- **Mission:** surface conversion/churn observations as review items; flag pricing experiments (`agents.ts:89`). `verified`
- **Inputs:** Stripe-derived subscription telemetry, funnel metrics. **Outputs:** anomaly observations (`NEEDS_REVIEW`). **Tools:** Haiku for metric classification; Sonnet for the written insight. **Memory:** decision log.
- **Schedule:** daily. **Triggers:** churn/conversion anomaly. **Self-audit:** observation, never an action — "flag pricing experiments **for review**" (`agents.ts:97`). `verified`
- **HARD STOPS:** **no Stripe live mutation** (no subscription change/refund/price edit), **no pricing change** without operator. Entitlement remains server-side only (`CLAUDE.md` rule 3; paywall `app/api/picks/route.ts`, `REPO_INTELLIGENCE_REPORT.md §8`). `verified` **Metrics:** anomaly precision (accepted/total flags).

---

## 2. Model orchestration & cost plan

**Principle (2026):** cost-aware routing — cheap models for simple/structured work, reserve frontier reasoning for hard tasks; reported **30–70% cost cuts** with no quality loss ([Maxim, Top-5 routing](https://www.getmaxim.ai/articles/top-5-llm-routing-techniques/); [MindStudio, AI model router](https://www.mindstudio.ai/blog/what-is-ai-model-router-optimize-cost-llm-providers)). Layer **prompt caching** on the static system prompts: cache reads cost **0.1×** input and cut cost up to **90%** / latency up to **85%** ([Anthropic prompt-caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching); [Anthropic announce](https://www.anthropic.com/news/prompt-caching)). Note the **default TTL dropped 1h→5min on 2026-03-06** ([DEV.to, 5-min TTL](https://dev.to/whoffagents/claude-prompt-caching-in-2026-the-5-minute-ttl-change-thats-costing-you-money-4363)) — so caching wins only on bursty same-surface traffic (Studio batches, Scout cycles); set the explicit 1h TTL for periodic single-shots (journal/weekly insight).

**2026 lineup pricing (per M in/out, `verified-ext`):** Haiku 4.5 **$1/$5**, Sonnet 4.6 **$3/$15**, Opus 4.7 **$5/$25** ([CloudZero](https://www.cloudzero.com/blog/claude-api-pricing/); [TLDL](https://www.tldl.io/resources/anthropic-api-pricing)). The repo's hardcoded pricing matches Sonnet exactly (`cost-monitor.ts:122`). Haiku is ~3× cheaper input / 3× cheaper output than Sonnet; Opus ~1.67× the Sonnet input.

### Model-routing table (surface → model → why → est. relative cost vs Sonnet baseline = 1.0×)

| Surface (real `ClaudeApiSurface` / agent) | Model | Why | Est. rel. cost |
|---|---|---|---|
| Copy/banned-phrase scan, SEO check (SARAH/AVA self-audit) | **Haiku 4.5** | Structured classification; deterministic rubric; high volume | **~0.33×** |
| News/line-movement classification, signal extraction (SCOUT) | **Haiku 4.5** | Short structured I/O, runs every ingestion cycle | **~0.33×** |
| Funnel/metric anomaly tagging (BOBBY) | **Haiku 4.5** | Tabular classification, not prose | **~0.33×** |
| `BLOG_GENERATION`, `STUDIO_GENERATION` (AVA) | **Sonnet 4.6** (cached system prompt) | Quality prose, reused static instructions → cache hits | **~1.0× → ~0.6×** w/ cache on bursts |
| `MODEL_JOURNAL_DRAFT` (weekly) | **Sonnet 4.6** | Mid-complexity reasoning; cache w/ 1h TTL | **~1.0×** |
| `PRE_MORTEM_SUMMARY` | **Sonnet 4.6** | Bounded synthesis from factor data | **~1.0×** |
| `MODEL_COURT_ANSWER` (evidence-grounded "ask why") | **Opus 4.7** | Deepest reasoning, public-facing, must not hallucinate; already temp 0.1 (`answer.ts:143`) | **~1.4–1.7×** |
| `CALIBRATION_WEEKLY_INSIGHT` | **Opus 4.7** | Statistical nuance (Brier/discrimination); highest trust stakes (`REPO §5`) | **~1.4–1.7×** |

Today **everything is Sonnet** (`verified`). Expected blended effect: high-volume scan/classify surfaces fall to ~0.33×, the two flagship reasoning surfaces rise modestly, net spend drops materially while raising quality where it matters — exactly the R6 recommendation (`REPO_INTELLIGENCE_REPORT.md §6`, §11 P1). Budgets already differ by surface (Studio $500, Model Court $2000, `cost-monitor.ts:61`,`:71`) so routing makes those envelopes go further. `verified`

**Where the policy lives:** one auditable `pickModelForSurface(surface)` function (§7), consumed by the six call sites via their existing `options.model ?? …` slot — no call-site rewrites required. **Eval guardrail:** treat model swaps as a change requiring the existing policy/copy-scan test suites to stay green, plus an LLM-as-judge spot-check on Haiku-downgraded surfaces before flip ([futureagi judges](https://futureagi.com/blog/best-llm-judge-models-2026/)). `recommended`

---

## 3. Task / decision state machine & where automation stops

**Lifecycle (`verified`, `transitions.ts:32`):**
```
NEW ──Jarvis routes──▶ ROUTED ──agent drafts──▶ DRAFTED ──self-audit/scan──▶ NEEDS_REVIEW
                                                                              │
                                            ┌── operator ──▶ APPROVED ──▶ ARCHIVED
NEEDS_REVIEW ──────────────────────────────┤
                                            └── operator ──▶ REJECTED ──▶ (ROUTED | ARCHIVED)
any ──blocker──▶ BLOCKED ──▶ (ROUTED | ARCHIVED)      ARCHIVED = terminal (no transitions)
```
- **Automation owns:** `NEW→ROUTED→DRAFTED→NEEDS_REVIEW` and `*→BLOCKED`. These are internal record changes only — "No transition implies any external action" (`transitions.ts:16`). `verified`
- **Human owns the gate:** **`NEEDS_REVIEW→APPROVED|REJECTED`.** Note the allow-list deliberately has **no path from DRAFTED→APPROVED** — work *cannot* skip review (`transitions.ts:35`). `verified`
- **Every move is logged:** `transitionTask()` writes a `CockpitDecision {toStatus, reviewer, note, evidence}` in the same transaction; `reviewer` is free-text (`manual:garrett` | `system` | `agent:tal`) so attribution is explicit (`transitions.ts:123`; `schema.prisma:890`). `verified`
- **Compliance overlay:** `complianceStatus=HOLD|REJECTED` or `riskLevel=COMPLIANCE_HOLD` keeps an item out of approval regardless of status (`schema.prisma:851`). `verified`/`recommended` (enforce in the review route).

This is the 2026 best-practice shape: agents free to act on low-risk internal steps, **human approval required for any high-risk/external action**, full trajectory auditable ([Furmanets, AI agents 2026](https://andriifurmanets.com/blogs/ai-agents-2026-practical-architecture-tools-memory-evals-guardrails)).

---

## 4. The hard stops (non-negotiable, named)

1. **No destructive DB ops / no auto-migration.** TAL drafts; operator runs `db:migrate`. `canApplyCalibrationAdjustments` is permanently `false` in code (`jarvis.ts:52`). `verified`
2. **No Stripe live mutation.** BOBBY observes only; no subscription/refund/price changes. Entitlements stay server-side (`CLAUDE.md` rule 3). `verified`
3. **No prod deploy by an agent.** "A task is NOT complete until tests pass, types pass, build succeeds" — and the *deploy* is an operator decision (`CLAUDE.md`; `REPO §9` R1). `verified`
4. **No publish / no message send without approval.** AVA media is inert (`scheduledFor` unread, `schema.prisma:823`); SARAH never sends (`agents.ts:45`); promos require compliance-gated render + `APPROVED_PARTNER` registry class (`operator-registry.ts:97`). `verified`
5. **No fabricated data/stats.** Cite a snapshot or emit "unknown" (Jarvis rule, `jarvis.ts:14`; `CLAUDE.md` rules 1–2). `verified`
6. **No secret in code.** Keys via env only; `callClaudeMessages` takes `apiKey` as an arg, never reads a literal (`messages.ts:46`; `CLAUDE.md` rule 4). `verified`

These map cleanly onto the brief's named stops; nothing in this design weakens them.

---

## 5. Prioritized automation roadmap

- **P0 — Settlement reliability (R1).** Monitor the shared `settleSport()` path; add a "stale unsettled picks" alert feeding a JARVIS RED. *Proof:* picks settle within N hours of final (`REPO §9`/§11). `verified`/`recommended`
- **P0 — Calibration semantics (R2, human-gated).** Persist modeled win-probability distinct from the confidence UX score; make proposals market-aware; bump `MODEL_VERSION`. Operator sign-off required (`REPO §5`). `verified`/`recommended`
- **P1 — Model routing + caching (R6).** Ship `pickModelForSurface()` + opt-in caching (§2, §7). *Proof:* per-surface cost in `ClaudeApiCallRecord` drops. `recommended`
- **P1 — Agent-eval harness.** Deterministic policy/copy-scan tests in CI + LLM-as-judge rubric on Haiku-downgraded surfaces before flip ([Galileo eval platforms](https://galileo.ai/blog/best-ai-agent-evaluation-platforms)). `recommended`
- **P1 — CLV capture** (closing-line value) — the sharp's gold-standard, GSN already stores opening lines (`COMPETITIVE_INTELLIGENCE §4`). `recommended`
- **P2 — Integration tests vs disposable Postgres (R3); odds failover (R5); dependency/vuln triage (R4); repo hygiene (R7).** `verified`

---

## 6. Cross-cutting metrics (the autonomous-company dashboard)

- **Trust:** Brier + discrimination + (new) CLV, publicly graded (`COMPETITIVE_INTELLIGENCE §3`). `verified`
- **Cost:** $/surface and $/approved-artifact from `ClaudeApiCallRecord`; cache-hit ratio post-§7. `verified`/`recommended`
- **Throughput:** tasks `NEW→APPROVED` median; % aging >24h/>72h (`OperatorPulse`, `intelligence.ts`). `verified`
- **Safety:** count of active Jarvis `safetyWarnings`; compliance-block rate; zero hard-stop violations (current state per `REPO §9`). `verified`
- **Quality:** draft→approved acceptance per agent; LLM-judge score on downgraded surfaces. `recommended`

---

## 7. THE single highest-leverage SAFE code improvement

**File:** `apps/web/lib/claude-api/messages.ts` (plus a tiny sibling `model-router.ts`).

**What (additive, behavior-preserving):**
1. Add an exported pure router **next to** the client:
   ```ts
   export type ClaudeRouteTier = "haiku" | "sonnet" | "opus";
   // Default map keeps EVERY surface on today's Sonnet baseline → zero behavior change.
   export function pickModelForSurface(surface: ClaudeApiSurface): string {
     // returns "claude-sonnet-4-6" for all surfaces until an operator opts a surface in.
   }
   ```
2. Extend `ClaudeMessagesRequest` with **one optional** field `readonly cache?: { system?: boolean; ttl?: "5m" | "1h" }`. When `cache.system` is true, send the `system` field as a structured block carrying `cache_control` (`{type:"ephemeral"}`, optional `ttl`) per Anthropic's API ([prompt-caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). When omitted, send the **exact current string body** — unchanged.

**Why:** centralizes the model policy in one auditable function (the §2 plan, R6 in `REPO_INTELLIGENCE_REPORT.md §6`) and unlocks 0.1× cache reads on the static system prompts already present at every call site (`SYSTEM_PROMPT` in `model-court/answer.ts:143`, and the `model ?? "claude-sonnet-4-6"` slot in all six callers). It changes **no behavior by default**: the router returns Sonnet for every surface, and caching is opt-in per call.

**How to verify (no new behavior, no broken tests):**
- `npm run typecheck` — new field is optional, new function is pure. `verified`-pattern.
- `npm run test` — `apps/web/__tests__/claude-api-messages.test.ts` passes a request **without** `cache` and asserts only the URL + headers (not the body shape); an off-by-default field cannot break it (read at `claude-api-messages.test.ts:32`). Add one unit test asserting (a) `pickModelForSurface(x) === "claude-sonnet-4-6"` for all surfaces, and (b) with `cache.system:true` the request body's `system` carries a `cache_control` block while the no-cache call body is byte-identical to today.
- `npm run build` — no call sites change, so the build is unaffected.

Net: one safe, reviewable seam that makes the entire §2 routing/caching roadmap incremental and per-surface opt-in, respecting every hard stop.
