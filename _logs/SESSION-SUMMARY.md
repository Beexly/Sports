# Session 2026-05-23

## Cycles completed: 29

Branch: `claude/keen-ptolemy-d0pbK` · Starting commit: `7900d41` · This snapshot ahead by 29 commits.

Four waves: cycles 1–10 shipped SDK migration + reviewer foundation. Cycles 11–17 cleared the leftover queue. Cycles 18–23 made the anti-slop posture **structural** (self-aware, self-checking, self-monitoring). Cycles 24–29 closed every remaining queue item except the deferred vector-embedded Pick Memory architectural work (Codex prompt below).

**Tests:** web `1342 → 1658` (+316) · prediction-engine `197 → 205` (+8) · data-ingestion `11` · types `28`. All workspaces green, typecheck clean, lint clean, all three guardrails (trust-gate, draft-only, model-freeze) clean.

## Wave 4 — Cycles 24–29

| # | Feature |
|---|---|
| 24 | feat(ci): source-health alarm — 30-min cron polls + GH Action failure as alert |
| 25 | feat(cockpit): pick-narrator — Sonnet editorial gloss on ScoredPick (lib only) |
| 26 | feat(cockpit): POST /api/cockpit/pick-narrator + UI page |
| 27 | feat(brief): composeWhatChanged + composeContentIdeas + composePromotions wired into composeBriefAsync |
| 28 | feat(cockpit): source-health uses per-category FRESHNESS_BUDGETS thresholds from source-intelligence |
| 29 | feat(cockpit): telemetry summary page at /cockpit/telemetry — per-call-site cache hit rate, tokens, latency, errors |

## The cockpit operator now has

- `/cockpit/jarvis` — launch readiness assessment (existed)
- `/cockpit/calibration` — model accountability (existed)
- `/cockpit/review-draft` — semantic compliance scan on operator-pasted text (Cycle 17)
- `/cockpit/brief/preview` — async brief composer preview (Cycle 20)
- `/cockpit/source-health` — always-current freshness watch (Cycle 23, deepened in 28)
- `/cockpit/pick-narrator` — editorial gloss on a ScoredPick (Cycle 26)
- **`/cockpit/telemetry` — Claude cache hit rate + tokens + latency by call site (Cycle 29)**

Plus push-based alarm via Source Health Alarm workflow (Cycle 24) that fires a GitHub notification when source health hits HIGH severity.

## Anti-slop pillars — final status

- ✅ **Self-aware** — rate-limit on every credit-burning admin route (10/min, fail-closed, Cycle 18). Telemetry on every Claude call (Cycle 18), summarized for the operator on `/cockpit/telemetry` (Cycle 29).
- ✅ **Self-checking** — every generated draft ships with a counter-narrative (Cycle 21). Every brief surfaces a MANUAL_REVIEW section when slate-level systemic risks are detected (Cycle 22). The brief now has all 5 section composers (slate-overview, pre-mortem, what-changed, content-ideas, promotions) — feature-complete on the schema's BriefSectionType enum (Cycle 27).
- ✅ **Self-monitoring** — `/cockpit/source-health` page + scheduled HIGH-severity alarm + per-category FRESHNESS_BUDGETS for accurate per-source thresholds (Cycles 23 + 24 + 28).

## Hard Rules audit — final

- ✅ Never commit secrets — `.env` gitignored
- ✅ All Anthropic calls go through SDK with `maxRetries: 3` (12 call sites + 2 operator scripts + nightly runner). `withTelemetry` (Cycle 18) wraps each one
- ✅ No auto-publish path. `draft-only.mjs` passes (197 files scanned). Both scheduled workflows (nightly content + source-health alarm) READ only or open a draft PR
- ✅ No hype language. `trust-gate.mjs` passes (185 files scanned). 4 source files whitelisted for legitimate banned-phrase mentions in negation system prompts
- ✅ MODEL_VERSION untouched. `model-freeze.mjs` passes against v5.0.0 baseline
- ✅ Prompt caching applied — reviewer, slate-overview, counter-narrative, pre-mortem, source-health-narrative, pick-narrator, what-changed, content-ideas, promotions (9 cached system prompts; generator deliberately uncached, rationale in DECISIONS.md)
- ✅ Rate-limit fail-closed on every Claude route — `/api/cockpit/review-draft`, `/api/cockpit/brief`, `/api/cockpit/source-health`, `/api/cockpit/pick-narrator` all 10/min per user, fail-closed

## Open questions for Garrett

1. **Provision the secrets to bring runtime paths live.** Code is sandbox-runnable today but:
   - `ANTHROPIC_API_KEY` (the `galaxy-prod-2026-05-21` key) in Vercel + GitHub repo secrets
   - `REDIS_URL` (Upstash) in Vercel — Claude routes return 503 (fail-closed) without it
   - `DATABASE_URL` + `DIRECT_URL` in GitHub Action secrets — nightly workflow uses fixture without them
   - `SOURCE_HEALTH_URL` + `SOURCE_HEALTH_TOKEN` in GitHub repo secrets — source-health alarm workflow polls these
2. **Telemetry page on Vercel** — `_logs/claude-usage.log` is ephemeral on Vercel; the telemetry page returns empty there. The page works against local dev + the GitHub Action's filesystem. To make it work in prod, promote telemetry to a Prisma model in a future cycle.
3. **Operator-tunable rate-limit + threshold UI** — limits are hardcoded today (10/min, FRESH_THRESHOLD_MS, MAX_INPUT_CHARS). A future cycle could surface them via cockpit settings stored in DB.

## Deferred — Pick Memory (Codex prompt below)

The vector-embedded historical-similar-pick retrieval layer is multi-batch architectural work — embeddings provider decision, vector store choice, embed pipeline, Prisma migration, multi-cycle implementation. Not safely shippable in a single Claude Code session. **Codex prompt for the architectural cycle is in the chat reply that includes this summary.**

## STOP — awaiting Garrett

Branch is clean. Pushing to origin.
