# Changelog

Append-only. One line per cycle.

2026-05-23 · #1 · feat(content): migrate Claude blog generator to official @anthropic-ai/sdk · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #2 · feat(content): add Claude semantic draft reviewer for trust-claim paraphrases · vitest `apps/web/__tests__/draft-reviewer.test.ts`
2026-05-23 · #3 · feat(cockpit): expose draft reviewer at POST /api/cockpit/review-draft · vitest `apps/web/__tests__/cockpit-review-draft-api.test.ts`
2026-05-23 · #4 · feat(content): pair generator with reviewer via generateAndReviewBlogPost wrapper · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #5 · feat(prediction-engine): add extractPickSources for top-level sources[] aggregation · vitest `packages/prediction-engine/src/__tests__/pick-sources.test.ts`
2026-05-23 · #6 · feat(content): cite pick sources in generated blog posts · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #7 · chore(scripts): migrate operator scripts to @anthropic-ai/sdk · vitest `apps/web/__tests__/operator-scripts-sdk.test.ts`
2026-05-23 · #8 · feat(content): parameterize blog generator on content kind (DAILY_PICKS / WEEKLY_RECAP) · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #9 · feat(brief): add Claude composeSlateOverview as first restored slice of the brief composer · vitest `apps/web/__tests__/slate-overview.test.ts`
2026-05-23 · #11 · refactor(ai): extract makeAnthropicHolder() factory used by all 3 Claude call sites · vitest `apps/web/__tests__/ai-client.test.ts`
2026-05-23 · #12 · feat(ci): nightly content workflow drafts + reviews + opens an operator PR · vitest `apps/web/__tests__/nightly-content-workflow.test.ts`
2026-05-23 · #13 · feat(content): add 6 remaining content kinds (METHODOLOGY / MATCHUP / PROMOTION / PERFORMANCE / RESPONSIBLE / MODEL_CHANGE) · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #14 · feat(ai): ephemeral prompt caching on draft-reviewer + slate-overview · vitest `apps/web/__tests__/draft-reviewer.test.ts` + `slate-overview.test.ts`
2026-05-23 · #15 · feat(brief): add composeBriefAsync that populates the brief via composeSlateOverview · vitest `apps/web/__tests__/brief-compose-async.test.ts`
2026-05-23 · #16 · feat(cockpit): POST /api/cockpit/brief now composes a real preview via composeBriefAsync · vitest `apps/web/__tests__/cockpit-brief-compose-api.test.ts`
2026-05-23 · #17 · feat(cockpit): UI page wires the semantic draft reviewer at /cockpit/review-draft · vitest `apps/web/__tests__/cockpit-review-draft-page.test.ts`
2026-05-23 · #18 · feat(ai): ioredis rate-limit + withTelemetry foundation, applied to both Claude routes + all 4 SDK call sites · vitest `apps/web/__tests__/rate-limit.test.ts` + `ai-telemetry.test.ts`
2026-05-23 · #19 · feat(ci): DB-backed nightly content + self-documenting PR body · vitest `apps/web/__tests__/nightly-content-workflow.test.ts`
2026-05-23 · #20 · feat(cockpit): brief preview UI at /cockpit/brief/preview · vitest `apps/web/__tests__/cockpit-brief-preview-page.test.ts`
2026-05-23 · #21 · feat(content): counter-narrative companion (anti-slop pillar) · vitest `apps/web/__tests__/counter-narrative.test.ts` + `content-generator.test.ts`
2026-05-23 · #22 · feat(brief): pre-mortem on the pick slate (self-checking pillar) · vitest `apps/web/__tests__/pre-mortem.test.ts` + `brief-compose-async.test.ts`
2026-05-23 · #23 · feat(cockpit): source-health agent (self-monitoring pillar) at /cockpit/source-health · vitest `apps/web/__tests__/source-health.test.ts`
2026-05-23 · #24 · feat(ci): source-health alarm — 30-min cron polls the endpoint and fails the run on HIGH alerts · vitest `apps/web/__tests__/source-health-alarm.test.ts`
2026-05-23 · #25 · feat(cockpit): pick-narrator — Sonnet editorial gloss on ScoredPick for operator review (lib only) · vitest `apps/web/__tests__/pick-narrator.test.ts`
2026-05-23 · #26 · feat(cockpit): POST /api/cockpit/pick-narrator + UI page at /cockpit/pick-narrator · vitest `apps/web/__tests__/cockpit-pick-narrator-page.test.ts`
2026-05-23 · #27 · feat(brief): three more section composers (what-changed / content-ideas / promotions) wired into composeBriefAsync · vitest `apps/web/__tests__/brief-sections.test.ts` + `brief-compose-async.test.ts`
2026-05-23 · #28 · feat(cockpit): source-health uses per-category FRESHNESS_BUDGETS thresholds from source-intelligence · vitest `apps/web/__tests__/source-health.test.ts`
2026-05-23 · #29 · feat(cockpit): telemetry summary page at /cockpit/telemetry — per-call-site cache hit rate, tokens, latency, errors · vitest `apps/web/__tests__/telemetry-summary.test.ts`
2026-05-23 · #30 · feat(guardrails): AI daily cost ceiling — fails CI when est. daily Anthropic spend exceeds $2 (configurable) · vitest `apps/web/__tests__/ai-cost.test.ts`
2026-05-23 · #31 · feat(cockpit): pulse strip at top of /cockpit — calls 24h, cache hit rate, today USD, active sites + nav to new pages · vitest `apps/web/__tests__/cockpit-pulse.test.ts`
2026-05-23 · #32 · feat(ui): error.tsx + loading.tsx across 6 public segments + global app/loading.tsx · vitest `apps/web/__tests__/route-boundaries.test.ts`
2026-05-23 · #33 · feat(ci): daily digest workflow — pure-template, zero-Claude-spend operator skim of what shipped · vitest `apps/web/__tests__/daily-digest.test.ts`
2026-05-24 · #34 · feat(telemetry): persist Claude usage to Postgres via ClaudeUsageLog — cockpit telemetry now live on Vercel · vitest `apps/web/__tests__/claude-usage-log.test.ts`
2026-05-24 · #35 · feat(guardrails): DB-backed cost pre-flight in nightly runner — exits 0 gracefully when ceiling breached · vitest `apps/web/__tests__/nightly-content-workflow.test.ts`
2026-05-24 · #36 · feat(ops): telemetry log retention — prune-claude-usage-logs.mjs + weekly GitHub Actions workflow · vitest `apps/web/__tests__/telemetry-prune.test.ts`
2026-05-24 · #37 · feat(cockpit): GET /api/cockpit/pick-narrator/[id] — narrate pick by DB ID + Narrate links in history page · vitest `apps/web/__tests__/cockpit-pick-narrator-by-id.test.ts`
2026-05-24 � #38 � feat(cockpit): add admin pick provenance endpoint with source?factor?confidence chain � vitest `apps/web/__tests__/cockpit-pick-provenance.test.ts`
