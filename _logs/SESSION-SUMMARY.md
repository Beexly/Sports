# Session 2026-05-23

## Cycles completed: 23

Branch: `claude/keen-ptolemy-d0pbK` · Starting commit: `7900d41` · Ending commit at this snapshot: ahead by 23 commits.

Three waves: cycles 1–10 shipped the SDK migration + reviewer foundation. Cycles 11–17 cleared the leftover queue items. Cycles 18–23 made the platform's anti-slop posture **structural** — self-aware (rate-limit + telemetry), self-checking (counter-narrative + pre-mortem), and self-monitoring (source-health agent).

**Tests:** web `1342 → 1557` (+215) · prediction-engine `197 → 205` (+8) · data-ingestion `11` · types `28`. All four workspaces green, typecheck clean, lint clean, all three guardrails (trust-gate, draft-only, model-freeze) clean.

## Shipped — full list

| # | Commit | Feature |
|---|---|---|
| 1 | `3df11bc` | feat(content): migrate Claude blog generator to official `@anthropic-ai/sdk` |
| 2 | `f66baa9` | feat(content): semantic draft reviewer (Haiku 4.5) |
| 3 | `c796977` | feat(cockpit): admin-gated POST `/api/cockpit/review-draft` |
| 4 | `b5a6496` | feat(content): `generateAndReviewBlogPost` wrapper |
| 5 | `cdcb026` | feat(prediction-engine): `extractPickSources` |
| 6 | `b1730bd` | feat(content): blog generator cites pick sources |
| 7 | `970c606` | chore(scripts): operator scripts migrated to `@anthropic-ai/sdk` |
| 8 | `feb1b8e` | feat(content): blog generator parameterized on content kind |
| 9 | `e9af6ed` | feat(brief): `composeSlateOverview` — first slice of brief composer |
| 10 | `f069252` | chore(_logs): session summary checkpoint |
| 11 | `918a6c6` | refactor(ai): extract `makeAnthropicHolder()` factory |
| 12 | `d6cd75e`* | feat(ci): nightly content workflow opens an operator PR |
| 13 | `e52e604` | feat(content): add 6 remaining content kinds |
| 14 | `56c1007` | feat(ai): ephemeral prompt caching on draft-reviewer + slate-overview |
| 15 | `abc7e19` | feat(brief): `composeBriefAsync` |
| 16 | `79d4a2d` | feat(cockpit): POST `/api/cockpit/brief` composes a real preview |
| 17 | `cd6c1aa` | feat(cockpit): UI page wires the semantic draft reviewer |
| 18 | `<this>` | **feat(ai): ioredis rate-limit + withTelemetry foundation** |
| 19 | `<this>` | **feat(ci): DB-backed nightly + self-documenting PR body** |
| 20 | `<this>` | **feat(cockpit): brief preview UI at /cockpit/brief/preview** |
| 21 | `<this>` | **feat(content): counter-narrative companion (anti-slop pillar)** |
| 22 | `<this>` | **feat(brief): pre-mortem on the pick slate (self-checking pillar)** |
| 23 | `<this>` | **feat(cockpit): source-health agent (self-monitoring pillar)** |

*Commit hashes for 11+ visible via `git log --oneline`.

## Anti-slop pillar status check

- ✅ **Self-aware** — Cycle 18. Rate-limit on every credit-burning admin route (10/min per user, fail-closed). Telemetry on every Claude call (4 sites + nightly script) capturing cache hit rate, latency, token usage.
- ✅ **Self-checking** — Cycle 21 (counter-narrative) + Cycle 22 (pre-mortem). Every generated draft surfaces alongside a skeptical counter-take with redFlags. Every brief surfaces a MANUAL_REVIEW section when slate-level systemic risks are detected.
- ✅ **Self-monitoring** — Cycle 23. `/cockpit/source-health` page renders always-current per-source freshness + Claude-narrated operator read + structured alerts when sources degrade.

The platform now observes its own behavior, challenges its own celebratory framing, and watches its data sources — at the structural level, not as policy.

## Hard Rules audit — final

- ✅ Never commit secrets — `.env` gitignored; stub `.env` files in apps/web + packages/db never tracked
- ✅ All Anthropic calls go through the SDK (now 5 call sites: content-generator, draft-reviewer, slate-overview, counter-narrative, pre-mortem, source-health-narrative + 2 operator scripts + nightly runner = 8 total). Every one of them uses `maxRetries: 3` and the `makeAnthropicHolder()` factory or its inline mirror.
- ✅ No auto-publish path. `draft-only.mjs` passes (190 files scanned). Nightly workflow opens PR + stops; operator clicks merge.
- ✅ No hype language. `trust-gate.mjs` passes (182 files scanned). Two source files whitelisted for legitimate banned-phrase mentions in their system prompts.
- ✅ MODEL_VERSION untouched. `model-freeze.mjs` passes against `v5.0.0` baseline.
- ✅ Prompt caching applied — reviewer (system + banned-list prefix), slate-overview (system), counter-narrative (system), pre-mortem (system), source-health-narrative (system). Generator deliberately uncached (no stable user prefix; per-pick data varies); rationale in DECISIONS.md.
- ✅ Rate-limit fail-closed on credit-burning routes — `/api/cockpit/review-draft`, `/api/cockpit/brief`, `/api/cockpit/source-health` all 10/min per user, fail-closed.

## Open questions for Garrett

1. **Provision the secrets to bring the runtime paths live.** Code is sandbox-runnable today but the live paths don't activate until:
   - `ANTHROPIC_API_KEY` (the `galaxy-prod-2026-05-21` key) in Vercel + GitHub repo secrets
   - `REDIS_URL` (Upstash) in Vercel — without it, both Claude-route POSTs return 503 (fail-closed)
   - `DATABASE_URL` + `DIRECT_URL` in the GitHub Action's secrets — without them, the nightly workflow uses the fixture
2. **Pre-mortem severity calibration.** The "should this be a MANUAL_REVIEW section" gate is "any HIGH or MEDIUM risk." Tighter (HIGH only) or looser (any non-empty risks) might fit your operator pace better. Easy to tune.
3. **Source-health thresholds.** FRESH ≤ 30min, AGING ≤ 4h, STALE > 4h are sensible global defaults. Per-category thresholds (e.g. INJURY_NEWS = 6h, ODDS = 30min) are wired into source-intelligence already; surfacing them as the source-health thresholds is a future cycle.
4. **The `/cockpit/source-health` cron.** No automated alerting yet — operators visit the page. A future cycle adds a workflow that posts to Slack/PR when an alert hits HIGH severity. Wanted next session?
5. **Pick-narrator library + audit-drawer wiring.** Pushed out of this batch (tactical capability, non-foundational). Top of the queue for next session.

## Recommended next-session queue

1. **Cron alerting on source-health HIGH severity** — small GitHub Action that polls the endpoint and posts to Slack/PR when alerts fire. The push-based half of self-monitoring.
2. **Pick-narrator library + audit-drawer wiring** — operator-only Sonnet narrative layered on top of the deterministic pick reasoning. Strictly cockpit display.
3. **Remaining brief sections — `composeWhatChanged`, `composeContentIdeas`, `composePromotions`** — each mirrors `composePreMortem` shape. Three small cycles or one batched cycle.
4. **Per-category source-health thresholds** — surface the existing `FRESHNESS_BUDGETS` per category from `source-intelligence` into the agent's threshold logic. Currently global defaults only.
5. **Prompt-caching telemetry surface in cockpit** — Cycle 18 captures the data; build a `/cockpit/telemetry` page that summarizes cache hit rate per call site by reading `_logs/claude-usage.log`. Validates the Cycle 14 forward investment.
6. **Vector-embedded "Pick Memory"** — multi-batch architectural cycle. Historical similar-pick retrieval with embeddings so any future Claude call can ground reasoning in actual precedent. Real new capability worth scoping properly.

## STOP — awaiting Garrett

Branch is clean. Pushing to origin. Ready for next direction.
