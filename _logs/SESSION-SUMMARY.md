# Session 2026-05-23 → 2026-05-24

## Cycles completed: 35

Branch: `claude/keen-ptolemy-d0pbK` · All 35 cycles committed and pushed.

Five waves: cycles 1–10 shipped SDK migration + reviewer foundation. Cycles 11–17 cleared the leftover queue. Cycles 18–23 made the anti-slop posture **structural** (self-aware, self-checking, self-monitoring). Cycles 24–29 closed every remaining queue item. Cycles 30–35 hardened the production layer (cost ceiling, pulse strip, error/loading boundaries, daily digest, DB telemetry, cost pre-flight).

**Tests:** 1799 passing (136 test files). Full workspace typecheck clean. Lint clean (`--max-warnings=0`). All three guardrails (trust-gate, draft-only, model-freeze) exit 0.

## Wave 5 — Cycles 30–35

| # | Feature |
|---|---|
| 30 | feat(guardrails): AI daily cost ceiling — fails CI when est. spend > $2/day |
| 31 | feat(cockpit): pulse strip at top of /cockpit — 24h calls, cache hit, USD, active sites |
| 32 | feat(ui): error.tsx + loading.tsx across 6 public segments + global loading |
| 33 | feat(ci): daily digest workflow — pure-template, zero-Claude-spend operator skim |
| 34 | feat(telemetry): ClaudeUsageLog Prisma model — DB-backed telemetry, works on Vercel |
| 35 | feat(guardrails): DB-backed cost pre-flight in nightly runner — ceiling breach → exit 0 |

## The cockpit operator now has

- `/cockpit` — Jarvis launch assessment + Pulse strip (calls/cache/USD/sites)
- `/cockpit/history` — Pick forensic ledger
- `/cockpit/calibration` — Model accountability
- `/cockpit/review-draft` — Semantic compliance scan on operator-pasted text (Cycle 17)
- `/cockpit/brief/preview` — Async brief composer preview (Cycle 20)
- `/cockpit/source-health` — Always-current freshness watch with per-category thresholds (Cycles 23, 28)
- `/cockpit/pick-narrator` — Editorial gloss on a ScoredPick (Cycle 26)
- `/cockpit/telemetry` — Claude cache hit rate + tokens + latency by call site (Cycle 29) **now DB-backed (Cycle 34)**

Plus push-based alarm via Source Health Alarm workflow (Cycle 24) — fires a GitHub notification on HIGH severity.
Plus daily digest workflow (Cycle 33) — zero-Claude, template-only, opens a PR at 23:55 UTC.

## Anti-slop pillars — final status

- ✅ **Self-aware** — rate-limit on every credit-burning admin route (10/min, fail-closed, Cycle 18). Telemetry on every Claude call (Cycle 18), persisted to Postgres `claude_usage_logs` (Cycle 34), summarized for the operator on `/cockpit/telemetry` (Cycle 29). Pulse strip on `/cockpit` landing (Cycle 31). AI daily cost ceiling guards CI (Cycle 30).
- ✅ **Self-checking** — every generated draft ships with a counter-narrative (Cycle 21). Every brief surfaces a MANUAL_REVIEW section when slate-level systemic risks are detected (Cycle 22). The brief has all 5 section composers (slate-overview, pre-mortem, what-changed, content-ideas, promotions) — feature-complete on the schema's BriefSectionType enum (Cycle 27).
- ✅ **Self-monitoring** — `/cockpit/source-health` page + scheduled HIGH-severity alarm + per-category FRESHNESS_BUDGETS for accurate per-source thresholds (Cycles 23 + 24 + 28). Nightly runner skips generation gracefully when daily DB cost hits ceiling (Cycle 35).

## Hard Rules audit

- ✅ Never commit secrets — `.env` gitignored
- ✅ All Anthropic calls go through SDK with `maxRetries: 3`. `withTelemetry` (Cycle 18) wraps each one; persists to DB (Cycle 34)
- ✅ No auto-publish path. `draft-only.mjs` passes (218 files scanned). All scheduled workflows READ only or open a draft PR
- ✅ No hype language. `trust-gate.mjs` passes (208 files scanned). Files whitelisted for legitimate negation system prompts
- ✅ MODEL_VERSION untouched. `model-freeze.mjs` passes against v5.0.0 baseline
- ✅ Prompt caching applied on 9 call sites — reviewer, slate-overview, counter-narrative, pre-mortem, source-health-narrative, pick-narrator, what-changed, content-ideas, promotions
- ✅ Rate-limit fail-closed on all four Claude routes (10/min per user)
- ✅ Cost ceiling $2/day: fails CI (Cycle 30) + skips nightly generation gracefully (Cycle 35)

## Open questions for Garrett

1. **Provision secrets to bring runtime paths live:**
   - `ANTHROPIC_API_KEY` (galaxy-prod-2026-05-21) in Vercel + GitHub repo secrets
   - `REDIS_URL` (Upstash) in Vercel — Claude routes return 503 (fail-closed) without it
   - `DATABASE_URL` + `DIRECT_URL` in GitHub Action secrets — nightly workflow uses fixture without them; also needed for cost pre-flight (Cycle 35)
   - `SOURCE_HEALTH_URL` + `SOURCE_HEALTH_TOKEN` — source-health alarm workflow polls these
2. **Run `npm run db:push`** after merging this branch — the `claude_usage_logs` table (Cycle 34) won't exist in production until the schema is pushed. No migration file needed; `prisma db push` handles it.
3. **Pick Memory (Codex)** — vector-embedded historical similar-pick retrieval. Handed to Codex to work in parallel. Key open question for Garrett: embeddings provider (Voyage vs OpenAI vs Cohere vs self-hosted). Codex was instructed to ask before committing to a provider.

## Deferred / future cycles

- **Audit drawer → pick-narrator integration** — wire the editorial narrative into the existing `EvidenceAuditDrawer` for cockpit admin users. Currently the narrator has its own page (`/cockpit/pick-narrator`) but doesn't appear inline in the history/picks views.
- **Operator-tunable thresholds** — rate-limit ceiling, cost ceiling, freshness budgets are hardcoded. A future cycle could surface them via cockpit settings stored in DB.
- **ClaudeUsageLog pruning job** — the table grows unbounded. A cron or Prisma soft-delete after 90 days would cap storage.
- **Telemetry: p95 latency trend** — today we show per-call-site p95 in the dashboard but there's no time-series view. A sparkline of p95 over 7 days would make regression detection visual.
