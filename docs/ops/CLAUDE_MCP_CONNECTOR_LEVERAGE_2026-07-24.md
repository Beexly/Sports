# Claude MCP / Plugin / Connector Leverage Map — Galaxy Sports Edge
**Date:** 2026-07-24  
**Author:** Grok team (with Harper, Benjamin, Lucas)  
**Purpose:** Maximize every ounce of leverage from the full Claude connector/plugin/skill list for the GSE website, prediction engine, competitive intel, and local/personal workflows. This document is the durable source of truth so conversation length limits never erase progress.

## 1. Conversation Length Navigation (Immediate Fix)
- This chat and all future ones start clean.
- Persist all state here + in Linear/Notion + existing CLAUDE handoffs.
- New chats begin with: "Continue from docs/ops/CLAUDE_MCP_CONNECTOR_LEVERAGE_2026-07-24.md + latest EXECUTION_LEDGER".
- Use tools (GitHub, Notion, Linear) instead of pasting history.
- When approaching limit: emit a short handoff note into this file or a new dated one.

## 2. Project Snapshot (Confirmed)
- **Live:** https://www.galaxysportsedge.com (Board, Lab ~140k rows, Intelligence 500+ settled, Fantasy, No-Bet Gate, proof receipts).
- **Monorepo:** Beexly/Sports — Next.js 14, Prisma, BullMQ, Stripe, Anthropic (content only), heavy guardrails.
- **Research:** Beexly/gse-competitive-intel — Glass Ledger + Edge Engine HANDOFF (Phase 0 leak-free → honesty engine → Glass Ledger → real edges).
- **Prediction-engine status:** Already contains sophisticated edge-lab (placebo, walk-forward, conformal, Kelly, GSE scoring, Pedersen-style proof, extensive metrics). Placebo gate matches HANDOFF Phase 0 closely.
- **Key gap (RESOLVED 2026-07-24):** Explicit "display-only-substantiated-results" render guard (HANDOFF §1) now exists as a dedicated, tested module: `packages/prediction-engine/src/guards/display-substantiated.ts` (`isDisplaySubstantiated` / `assertDisplaySubstantiated` / `displayIfSubstantiated` / `wilsonLowerBound`), re-exported from the package barrel. A companion Inductive Venn-Abers Predictor (`packages/prediction-engine/src/calibration/ivap.ts`) landed alongside it for multiprobability calibration. See §6 for wiring status.

## 3. Optimized Connector / Plugin / Skill Matrix

### Tier 1 — Critical (keep active, configure tightly, use daily)
| Tool | Leverage for GSE | Concrete Action |
|------|------------------|-----------------|
| GitHub Integration + plugins | Full code, PRs, issues, tree, create/update files | Already authenticated as Beexly. Use for every change. |
| Vercel | Deploy, env, previews, analytics of live site | List projects, monitor deploys, gate production. |
| Stripe | Subs, webhooks, entitlements, pricing | Already wired. Monitor + experiment. |
| Notion | Knowledge base, competitive dossiers, living handoffs, skill definitions | Create GSE workspace pages; store phase status. |
| Linear | Task board mirroring cockpit + Phase tracking | Create issues for remaining HANDOFF gaps. |
| Ahrefs + Semrush | Competitive SEO, content gaps, keyword intel | Ongoing competitor monitoring (FantasyPros, Scores24, etc.). |
| PostHog / Sentry | Product analytics + error monitoring | Wire if not already; track board/lab usage. |
| Exa / Tavily | Research, competitor teardowns, legal public data | Feed into competitive intel package. |
| Anthropic / Claude skills (skill-creator, brand-guidelines, doc-coauthoring, algorithmic-art, mcp-builder, etc.) | Generate GSE-specific skills, maintain brand voice, build custom MCPs | Create "GSE Honesty Guard", "Glass Ledger Recompute", "Phase-0 Runner" skills. |
| Desktop Commander + Claude in Chrome | Local execution, browser automation, personal workflows | Local analysis, notebook runs, private model experiments. |

### Tier 2 — High value (configure next)
- Airtable (structured competitive / ops data)
- Gmail + Google Calendar + Drive (ops alerts, sharing)
- Figma / Canva / Gamma (design system, marketing)
- Zapier / Make (glue between the above)
- Hugging Face / local model tools
- Cloudflare (edge/CDN if used)
- X Ads (promotion once Glass Ledger is public)
- Mem0-style memory layers

### Tier 3 — De-prioritize / disconnect
Most pure legal, bio, clinical, Azure, Snowflake/BigQuery (unless scaling analytics), e-commerce, HR, pure sales tools. They burn context and add noise. Keep only compliance-relevant ones.

## 4. Highest-Leverage Coding & Automation Targets (Execute Now)
1. **Display-only-substantiated-results guard** (HANDOFF §1) — ✅ DONE 2026-07-24
   - Pure function + render-layer assertion refusing any win-rate / ROI / confidence / "proven" number lacking: coverage denominator, Wilson/Clopper-Pearson LCB, CLV-or-market-relative backing (where applicable), walk-forward provenance.
   - Location: `packages/prediction-engine/src/guards/display-substantiated.ts`, re-exported from `packages/prediction-engine/src/index.ts`.
   - Tests: `packages/prediction-engine/src/guards/__tests__/display-substantiated.test.ts` (26 tests) + `packages/prediction-engine/src/calibration/__tests__/ivap.test.ts` (11 tests) for the companion IVAP module. A real validation gap (a `NaN` `boundLevel` silently passed the range check) was found and fixed during test-writing.
   - IMPORTANT: this is a NEW, generic, reusable primitive. The codebase already has mature, heavily-tested, surface-specific gates — `apps/web/lib/performance/public-performance-policy.ts` (`evaluatePublicPerformancePolicy`, gates `/dashboard` + Jarvis win-rate on sample size/bootstrap, locked in by ~15 existing test files including `policy-only-winrate.test.ts` and `no-fake-percentages.test.ts`) and `apps/web/lib/ledger/display-guard.ts` (`assertSubstantiated`/`renderableMetricOrNull`, already wired into `/glass-ledger`). Those were deliberately NOT touched or duplicated — wiring targeted genuine gaps only. See the wiring status below.

2. **Phase-0 verification script / CI gate**
   - Wire `shuffledTimePlacebo` + `conditionalMiProbe` into a runnable CLI or GitHub Action that fails the build if the gate fails.

3. **Glass Ledger / recompute hardening**
   - Ensure open `recompute` surface and pre-kickoff hash commitments are production-ready and founder-gated.

4. **Custom Claude skills** (via skill-creator)
   - GSE Honesty Guard skill
   - Competitor Teardown skill (Ahrefs + Exa + Notion)
   - Phase Status Reporter
   - Brand Voice + Content Draft skill (respecting CLAUDE.md rules)

5. **Competitive monitoring automation**
   - Scheduled Exa/Tavily + Ahrefs pulls → Notion dossier + Linear issues for material changes.

6. **Local / personal leverage**
   - Desktop Commander workflows for offline placebo runs, feature store inspection, private notebooks.

## 5. Phase Mapping (Current vs Remaining)
- **Phase 0 (Leak-free foundation):** Largely implemented (as-of store, placebo, walk-forward, line archive patterns). Verification + CI gate still high value.
- **Phase 1 (Honesty engine):** Calibration, conformal selective gate, market-blend truth test, portfolio Kelly with CLV deflator — substantial code present; display guard + full acceptance tests remaining.
- **Phase 2 (Glass Ledger):** Pedersen / proof receipts / commitment patterns exist. Public `/ledger` + open recompute + independent verification still need hardening and founder gate.
- **Phase 3+ (Real edges):** Hierarchical-Bayes props, closing-line distillation, residual GBM — research package + edge-lab provide substrate; selective volume engine is the product volume lever.

## 6. Immediate Next Actions for This Session
- [x] Push this document (done).
- [x] Implement the display-substantiated guard as a testable module (`packages/prediction-engine/src/guards/display-substantiated.ts` + IVAP companion at `packages/prediction-engine/src/calibration/ivap.ts`, both re-exported and tested — 2026-07-24).
- [ ] Create corresponding Linear issue(s) if team exists.
- [ ] Generate 1–2 custom skill prompts ready for Claude Desktop.
- [ ] Optionally wire a simple competitive monitor skeleton.

### 2026-07-24 — Coding-agent verification + wiring pass (this session)
- [x] Confirmed `ivap.ts` and `display-substantiated.ts` compile cleanly and export correctly; added both to `packages/prediction-engine/src/index.ts`'s public barrel (safe — neither imports `node:crypto` or anything server-only, so the client-bundle constraint noted in that file for the promotion-gate module doesn't apply here).
- [x] Fixed a real validation bug found while testing: `boundLevel: NaN` previously passed `collectFailures` silently (`NaN < 0.8` and `NaN > 1` are both `false`); added an explicit `Number.isFinite` check.
- [x] Added 37 tests total: empty calibration, extreme scores, monotonicity, synthetic-exchangeable coverage, width-vs-sample-size for IVAP; missing/invalid-field blocking, rate/LCB consistency, `displayIfSubstantiated` null/value branching, and a `wilsonLowerBound` reference-value check for the display guard.
- [x] Mounted `PushAlertOptIn` (`apps/web/components/push/push-alert-opt-in.tsx`, previously built/tested but unmounted) into the watchlist page's Elite `AlertsBanner` (`apps/web/app/watchlist/page.tsx`) — the natural "follow loop" surface. No changes to the hook's gating states or the server-side `WATCHLIST_ALERTS_ENABLED` kill switch.
- [x] Ran a 4-agent gap audit across Board/Intelligence, Lab (Trend Lab/Parlay MRI/StatKing/calibration), Marketing/proof-receipt, and API/CLV/ROI surfaces before wiring anything, specifically to avoid duplicating the mature gates already in place. Confirmed clean (no gap): `evaluatePublicPerformancePolicy` (dashboard/Jarvis), `lib/ledger/display-guard.ts` (`/glass-ledger`), `lib/intelligence/hit-rate-display.ts` (engine-view.tsx's rendered hit-rate cells), `lib/performance/public-clv-policy.ts` + `public-roi-policy.ts` (`/api/clv`, most rigorous code in the repo — BCa/studentized-bootstrap/empirical-Bernstein/anytime-valid e-process), `lib/claims/public-claim-compiler.ts` + `trust-claims.ts` + `media-revenue/claim-safety.ts` (marketing/media copy claim-safety layer), and Board (no aggregate claim exists on that surface at all).
  - Three LIVE gaps found and fixed (public JSON export served a raw unguarded number even though the corresponding *rendered page* was already correctly gated — the API boundary was the actual leak):
    1. **`apps/web/app/api/calibration/route.ts`** (the headline finding — an unauthenticated public endpoint): `computeCalibration()`'s bucket `observedWinRate`/`delta` are always computed for internal use (proposals/discrimination/Brier — `computeCalibration` itself is intentionally left untouched), and every rendered page (`calibration-panel.tsx`, `proof-explorer.tsx`, `calibration-curve.tsx`) already gates on `sufficientSample` before showing a bucket — but the raw JSON route served every bucket unredacted. Added `redactUnpublishableBuckets()`/`redactUnpublishableReport()` to null `observedWinRate`/`delta` server-side for any bucket below the existing `MIN_PUBLISH_BUCKET_SAMPLE` floor. 4 new tests (`__tests__/calibration-public-api-redaction.test.ts`).
    2. **`apps/web/app/api/intelligence/predictiveness/route.ts`**: per-split `buyLowHitRate`/`sellHighHitRate` had no floor at all (a 2-3 call sample could print a bare 100%), reachable via the prominent "JSON" export link on `/intelligence/engines?engine=proof` — the DEFAULT_ENGINE. `components/intelligence/engine-view.tsx` already gates the rendered version through `lib/intelligence/hit-rate-display.ts`'s `describeHitRate()`/`MIN_HIT_RATE_SAMPLE=25`; added `redactThinHitRates()`/`redactUnpublishedPredictiveness()` (covering `overall`, `byPosition`, `yearOverYear(ByPosition)`, `stacked(ByPosition)`) to apply the identical floor at the API boundary, reusing the existing `MIN_HIT_RATE_SAMPLE` constant rather than inventing a new threshold. 7 new tests.
    3. **`apps/web/app/api/intelligence/clv-calibration/route.ts`**: `rollupClv()`'s `beatCloseRate`/`meanClv` had zero sample floor (n=1 could yield a confident "beat the close 100%" + a directional `note` asserting it) — not currently rendered by `ClvView`, but reachable via the same "JSON" export pattern. Added `redactThinClvRollup()`/`redactUnpublishedClvBacktest()`, reusing `MIN_HIT_RATE_SAMPLE`, and replaced the directional `note` with an honest "too few graded games" message below the floor (nulling only the number while leaving a confident sentence next to it would have been a loophole). 7 new tests.
  - All three fixes redact ONLY at the public API-serialization boundary, never inside the shared "compute" functions (`computeCalibration`, `summarize`/`buildPairs`, `rollupClv`) — those are reused by internal consumers (proposals engine, cron backtest jobs, `predictiveness.test.ts`'s designed-data assertions, `clv-calibration.test.ts`'s exact-value assertions at n=1/n=3) that need the raw, ungated value. This mirrors the codebase's own established pattern (`computeCalibration`'s docstring: "always computed for internal use... every public renderer gates on this flag").
  - Deliberately did NOT force these three fixes through the new `packages/prediction-engine` guard's full `DisplayClaim`/`SubstantiationEvidence` contract (`provenanceId`, `walkForwardProtocol`, `boundLevel`) — synthesizing those fields for data that doesn't actually carry that exact metadata shape would itself be a small dishonesty. Instead each fix reuses the codebase's own already-established, already-tested sample-floor constants (`MIN_PUBLISH_BUCKET_SAMPLE`, `MIN_HIT_RATE_SAMPLE`) at the serialization boundary — the same principle as `display-substantiated.ts`, applied via the tool already fit for this exact shape.
  - Two LATENT (not-yet-live) gaps noted for whoever wires them up next, not fixed now (per "wire into every surface that *currently* emits" — these don't, yet): `apps/web/lib/performance/clv-anchor.ts`'s `rollupAnchorClv()` and `apps/web/lib/tracker/clv.ts`'s `publicClvArtifact()` — both compute ungated aggregate CLV numbers but are called only from their own test files today (verified via repo-wide grep), with docstrings framing them as future "public track record" features. Also noted, lower-priority: `lib/calibration/elo-backtest.ts` and `market-backtest.ts` (public but unrendered methodology backtests, no sample floor) and `app/api/performance/route.ts` (has a floor but no Wilson LCB, deliberately left alone since a pinned test — `policy-only-winrate.test.ts` — already special-cases its intentional duplication of `public-performance-policy.ts`'s logic).
  - Full gate set after all wiring: root `typecheck` (13 workspaces) passed, root `lint` (`apps/web` eslint, 0 warnings) passed, root `guardrails` (all 19 checks, including `guard:performance-claims`) passed, `git diff --check` passed, full `apps/web` Vitest passed (682 files / 9565 tests, 12 files intentionally skipped), full `prediction-engine` Vitest passed (153 files / 1535 tests).
- Investigated the "previously flagged binary-corrupted" `packages/prediction-engine/src/edge-lab/asof-store.ts`: it contains exactly one literal NUL byte (offset 4463), used intentionally as a `Map` key separator inside `seriesKey(entityId, featureKey)` — `` `${entityId}\0${featureKey}` `` written as a raw control character rather than the `\0` escape. This is why `file`/`grep` misreport it as binary; it is not corruption, and `tsc --noEmit` + the full prediction-engine test suite (153 files / 1535 tests) pass. Left unchanged per "report evidence before changing" — a trivial, behavior-identical fix (swap the raw byte for the `\0` escape) is available if the founder wants it.
- Read-only inventory of the open PR disposition backlog (no action taken, per "do not bulk-merge without founder instruction"): 19 open PRs, all but 3 still in draft — #204, #203, #202, #201, #190, #180, #154, #153, #151, #150, #146, #130, #129, #127, #125, #112 (draft), and #124, #123, #121, #52 (ready for review). This needs founder-directed, one-at-a-time evaluation against current `main`, not a bulk pass.
- Fantasy Engine 10x (Task #13) and the draft-PR disposition pass were not attempted this session — both are large, separate bodies of work (the Late-Swap slice specifically needs a frozen contract before any port, per the handoff's own warning about the stranded branch's inverted lock/scratch semantics) and are better scoped as their own follow-up sessions rather than rushed alongside the verification+wiring mandate.

## 7. How to Use This Document Going Forward
Any new Claude or Grok session starts by reading this file + the latest EXECUTION_LEDGER + CLAUDE.md. All connector decisions, skill creations, and coding priorities flow from here. This keeps value compounding even when context windows reset.

---
*This is the durable leverage map. Execute, do not just describe.*
