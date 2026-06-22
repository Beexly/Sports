# GSE 2026 — Master Handoff (research + code)

> **Paste-into-a-fresh-Claude-chat brief.** This is the single source of truth for the overnight R&D
> built on branch `claude/happy-goodall-8lkxrb` of the Galaxy Sports Edge / Galaxy Sports Network
> repo. It tells the next agent exactly what exists, where it lives, how to verify it, and how to wire
> it to live data.

---

## 0. One-paragraph context

GSE is a production sports decision-intelligence platform (Next.js 14 / TypeScript / Prisma / Postgres,
monorepo: `apps/web`, `packages/*`, `workers/*`). Over six R&D sprints a new layer was added at
**`apps/web/lib/gse/`**: 25 typed modules (7,394 LOC), 118 passing unit tests, ~15 modeling/forecasting
primitives, 25 scoring systems, and 15 internal (admin-only) cockpit pages, plus 26 research docs in
`docs/research/GSE_2026_*.md`. **Everything is pure/typed and DB-free by necessity** (the build
container has no DB or secrets) — proven by unit tests, but not yet wired to the live odds feed or the
database. That wiring is the next job and is now small because the math is built and tested.

## 1. How to verify (run these first)

```bash
npm install                                   # fresh clone
npm run db:generate                           # generate Prisma client (else unrelated files error)
npm run typecheck --workspace=apps/web        # tsc --noEmit → exit 0 (whole app)
npm run test --workspace=apps/web -- lib/gse/ # 118 GSE tests → all pass
npm run test:brand-safety --workspace=apps/web   # 2164 pass (banned-language guards)
npm run test:cockpit --workspace=apps/web        # cockpit gating green
npm run lint --workspace=apps/web -- lib/gse  # eslint --max-warnings=0 → clean
```

Cockpit pages render live computations on illustrative inputs at `/cockpit/*` (admin-gated).

## 2. The strategic thesis (why all of this)

Web research across 40+ competitors (DFS optimizers, betting analytics, fantasy platforms, pick/model
sites, data providers, AI assistants) found one durable gap: **no one ships an auditable, calibrated,
per-pick track record.** DRatings is the only one that publishes calibration, and it has weak UX/reach.
GSE already builds toward this (Trust Ledger + calibration). **The moat = show the evidence AND the
counter-case, FREEZE the claim before the result, and PUBLISH calibration once the sample is honest.**
Competitors sell confidence, tools, or contest-volume; GSE sells *decision quality with a receipt*.

## 3. Code inventory — `apps/web/lib/gse/` (all pure, all tested)

**Decision-intelligence layer (Sprint 1):**
- `gse-scoring-systems.ts` — the shared `GseScore` primitive (`makeScore`, `toBand`, `weightedAverage`) + a registry of all **25** scoring systems.
- `data-excellence.ts` — `scoreDataQuality`, `scoreSourceIntegrity`, `scoreCalibrationHealth`, `summarizeDataHealth`, lineage. Rights vocab imported from `lib/scraping`.
- `decision-ontology.ts` — 53 entities / 8 domains / 20 edges; `groupDecisionEntitiesByDomain`.
- `evidence-engine.ts` — Claim→Evidence→CounterEvidence→Falsifier→Verdict; `scoreEvidenceStrength`, `scoreCounterEvidenceSeverity`, `scoreFalsifierRisk`, `scoreRecommendationConfidence`, `scoreDecisionFragility`, `buildVerdict`, 10 courtroom templates.
- `claim-safety.ts` — `scorePublicClaimSafety` (reuses `lib/trust-claims` banned-phrase scanner), `scoreSourceRightsRisk`, `isRightsHardStop`.
- `cognitive-operating-model.ts` — 10 principles, 10 user modes, 15-command palette, `scoreUserBiasRisk`, `scoreCognitiveLoad`.
- `jarvis-decision-copilot.ts` — 13 Jarvis mode contracts, `scoreJarvisReadiness`, the 5s/30s/deep-dive answer contract.
- `memory-policy.ts` — 6 memory-type policies, `scoreMemoryUsefulness` (consent + confirmed hard gates).
- `agent-orchestration.ts` — 23 constrained agent roles + orchestration objects, `scoreAgentTrust`.
- `revenue-intelligence-os.ts` — funnel, trust-safe copy, `scoreRevenueReadiness` (banned copy hard-caps).
- `product-operating-system.ts` — `scoreProductOpportunity`, `scoreLaunchReadiness`, `scoreMoat`, roadmap, `summarizeProductOSPriorities`.
- `thinking-page-contracts.ts` — 21 page contracts, `scorePageIntelligence`.

**Research → scored contracts (Sprint 2):**
- `competitor-intelligence.ts` — 30+ competitors, `FEATURE_GAPS`, `scoreFeatureGap`, `prioritizeGaps`.
- `open-source-ledger.ts` — rights-aware adoption registry, `scoreAdoptionValue`, `rankAdoption`, `adoptableNow` (non-commercial licenses hard-gated).
- `analytics-methods.ts` — method registry (HAVE/PARTIAL/GAP) + primitives: `linearOpinionPool`, `logOpinionPool`, `extremize`, `splitConformalHalfWidth`, `fitReliabilityCalibration` (isotonic/PAVA).
- `self-learning.ts` — autonomy ladder (L0–L5, no L5), `maxAutonomyAllowed`, `populationStabilityIndex`, `scoreDriftRisk`, `scoreModelPromotionReadiness`, `canPromoteModel`, `scoreActiveLearningPriority`, loop validator.

**Executable models + the trust loop (Sprints 3–6):**
- `projection-models.ts` — `glicko2Update` (**verified vs Glickman's canonical example**), `blackLittermanBlend`, `dixonColesTau`, `conformalProjectionInterval`, `americanToImpliedProb`, `removeVigProportional`.
- `trust-loop.ts` — `runTrustLoop` (devig→blend→evidence→verdict→receipt), `gradeClv`, `freezeReceipt`/`verifyReceipt` (FNV-1a tamper-evident).
- `forecasting.ts` — `logLoss`, `brierDecomposition`, `crpsGaussian`/`crpsEnsemble`, `plattScale`/`applyPlatt`, `temperatureScale`/`applyTemperature`, `kalmanFilterSeries`, `ucb1Select`.
- `scoreline-model.ts` — `dixonColesScorelineGrid`, `matchOutcomeProbs` (1X2), `overUnderProbs`, `bttsProbs`, `topScorelines`, `dixonColesMatch`.
- `dfs-portfolio.ts` — `riskParityWeights`, `buildCorrelationMatrix`, `covarianceFromCorrelation`, `lineupOverlap`, `portfolioUniqueness`, `exposureCounts`, `withinExposureCaps`.
- `shrinkage.ts` — `empiricalBayesShrink`, `jamesSteinEstimate`, `shrinkCovariance`.
- `injury-model.ts` — `assessInjury` (miss prob + games-missed + durability; **illustrative base rates**).
- `survivor-optimizer.ts` — `planSurvivor` (future-equity survivor path).
- `query-engine.ts` — `runQuery`, `matchesPredicate`, `serializeQuery`/`deserializeQuery` (Stathead-style Finder).
- `index.ts` — barrel (import everything from `@/lib/gse`).

**Test files:** `gse-contracts.test.ts`, `gse-research-contracts.test.ts`, `gse-models-trust.test.ts`,
`gse-forecasting-scoreline.test.ts`, `gse-dfs-portfolio.test.ts`, `gse-remaining-models.test.ts`.

## 4. Cockpit pages — `apps/web/app/cockpit/` (admin-gated, pure, browse the contracts)

`decision-os` (hub), `data-excellence`, `decision-graph`, `evidence-engine`, `jarvis-os`, `agents-os`,
`revenue-os`, `product-os`, `page-intelligence`, `claim-safety`, `build-board` (ranked next moves),
`competitor-intel`, `autonomy`, `trust-loop` (runs the full loop live), `forecasting-lab`. Shared shell
in `app/cockpit/_gse/shell.tsx`. **Adding a page requires a matching `href` in `app/cockpit/layout.tsx`
NAV** (enforced by `cockpit-nav-coverage.test.ts`).

## 5. Research docs — `docs/research/GSE_2026_*.md` (26 files)

Decision layer: UNIVERSAL_DECISION_INTELLIGENCE_LAB, DATA_EXCELLENCE_SYSTEM, DECISION_GRAPH_ONTOLOGY,
EVIDENCE_ENGINE, COGNITIVE_OPERATING_MODEL, JARVIS_DECISION_COPILOT, MEMORY_AND_PERSONALIZATION,
AGENT_ORCHESTRATION, REVENUE_INTELLIGENCE_OS, PRODUCT_OPERATING_SYSTEM, THINKING_WEBSITE_CONTRACTS,
SCORING_SYSTEMS, SOURCE_RIGHTS_AND_CLAIM_SAFETY, RED_TEAM_REVIEW, UNIVERSAL_DECISION_HANDOFF,
UNIVERSAL_DECISION_OWNER_REPORT. Research+models: COMPETITOR_DEEP_DIVE (40+),
OPEN_SOURCE_AND_DATA_LEDGER (~45, licenses verified), ANALYTICS_AND_PROJECTION_METHODS (~33),
AUTONOMY_AND_SELF_LEARNING, MONETIZATION_DEEP_DIVE, HIGHEST_VALUE_IMPROVEMENTS (computed action board),
TRUST_LOOP_AND_MODELS, FORECASTING_AND_SCORELINE, DFS_PORTFOLIO, REMAINING_MODELS, and this MASTER_HANDOFF.

## 6. Research → code mapping (proof the research was built, not just written)

| Research finding | Shipped code |
|---|---|
| No competitor exposes a calibrated track record | `trust-loop.ts` (frozen hashed receipts + CLV) |
| Model⊕market fusion is the #1 analytics gap | `projection-models.ts` `blackLittermanBlend` |
| Uncertainty-aware ratings | `glicko2Update` (verified vs canonical) |
| Calibration is the moat | `forecasting.ts` (CRPS, Brier decomp, Platt/temp, isotonic) |
| Soccer coverage gap post-FBref/Opta | `scoreline-model.ts` (Dixon-Coles 1X2/OU/BTTS) |
| SaberSim "Dupes" / exposure | `dfs-portfolio.ts` (risk parity, uniqueness, caps) |
| Draft Sharks injury predictor (black box) | `injury-model.ts` (transparent, rationale) |
| TeamRankings survivor optimizer | `survivor-optimizer.ts` |
| Stathead Finder (UX gold standard) | `query-engine.ts` |
| Drift/champion-challenger from ML practice | `self-learning.ts` |
| 40+ competitors, open-source licenses | `competitor-intelligence.ts` + `open-source-ledger.ts` |

## 7. ⭐ THE INTEGRATION PLAN (wiring to live data — the next agent's job)

Everything below is pure today; the work is fetching data and calling these functions. Recommended order:

**(A) Safety wins first (no model risk, pure upside):**
1. Call `scoreDataQuality` (from `data-excellence.ts`) on each ingested item in
   `packages/data-ingestion` / the refresh worker; reject/flag low scores.
2. Call `scoreSourceRightsRisk` / `isRightsHardStop` (`claim-safety.ts`) in the scraping clearance path
   so a `permission_required`/`excluded` source can't reach production.
3. Add a nightly **drift job**: bucket a feature's distribution, `populationStabilityIndex(expected, actual)`
   → `scoreDriftRisk` → alert when band ≥ high. (Cheapest guard protecting every downstream claim.)

**(B) Close the trust loop (the moat, made live):**
4. In the pick pipeline: fetch two-way odds → `americanToImpliedProb` → `removeVigProportional` →
   `blackLittermanBlend(marketFair, modelProb, marketPrecision, modelPrecision)`.
5. Build `Evidence`/`CounterEvidence`/`Falsifier` objects from real signals/sources, then call
   `runTrustLoop(input)` → it returns the verdict + a **frozen `TrustReceipt`**. Persist the receipt
   (new Prisma model `TrustReceipt { hash, claim, action, confidence, fragility, asOf }`) BEFORE kickoff.
6. After settlement: `gradeClv(entryOdds, closeOdds)` and record the outcome against the receipt.

**(C) Calibration + self-learning loop:**
7. Periodically compute `brierDecomposition(predictedProbs, outcomes)` and
   `fitReliabilityCalibration(points)`; apply `applyReliabilityCalibration` / `applyPlatt` /
   `applyTemperature` to recalibrate displayed confidence.
8. Gate public stats with `scoreCalibrationHealth` (caps below 100 settled outcomes — matches the
   existing `PERFORMANCE_STATS_ENABLED` gate).
9. Champion/challenger: train a challenger offline, run it in shadow, then
   `scoreModelPromotionReadiness` / `canPromoteModel` decides promotion (hard-gates regressions + small
   samples + unfinished shadow period). Pick which model to trust with `ucb1Select`.

**(D) Ratings, projections, sport coverage:**
10. Run `glicko2Update` over results to get uncertainty-aware team ratings (feeds spreads/totals).
11. Stabilize early-season player projections with `empiricalBayesShrink` / `jamesSteinEstimate`.
12. Soccer: derive `λ`/`μ` (expected goals) from ratings → `dixonColesMatch` → 1X2/OU/BTTS markets.
13. DFS: `buildCorrelationMatrix` → `shrinkCovariance` → `riskParityWeights` for exposure;
    `portfolioUniqueness` for leverage; `withinExposureCaps` to enforce caps.

**(E) New product surfaces (from the ranked feature gaps):**
14. Cross-platform league/draft sync overlay; Stathead Finder UI on `query-engine.ts`; injury cards on
    `injury-model.ts` (replace illustrative base rates with sourced data first); survivor tool on
    `survivor-optimizer.ts`.

## 8. Remaining gaps (need heavier infra than pure TS)

- `matrix_fact` (player-similarity comps) and `gbm` (gradient boosting) — train in a **Python worker**,
  export to **ONNX**, infer in Node via `onnxruntime` (already in the open-source ledger as a candidate).
- Full Monte-Carlo slate simulation against a modeled field (marked `partial`).
- Replace `injury-model.ts` illustrative base rates with sourced injury data.
- Reconcile the **pre-existing Free-tier drift**: `lib/pricing/value-architecture.ts` ("two free picks/day
  with confidence scores") vs CLAUDE.md ("1/day, no scores"). Decide deliberately.

## 9. Non-negotiable integrity rules (preserve these)

- No fabricated data/odds/projections/track records. Label illustrative/modeled/unverified.
- Never re-implement the banned-phrase list — import `scanForBannedPhrases` from `lib/trust-claims`.
- Risk-oriented scores (drift, fragility, source-rights, counter-severity, bias, cognitive load) must
  render with the **flipped palette** (high = red). Cockpit `ScoreBadge` takes `riskOriented`.
- No contract here ever *unlocks* a source or adds scraping evasion. Owner-gated actions (publish, price,
  bet) stay owner-gated; autonomy never reaches L5.
- Calibration is published only past the settled-sample floor. "Passes the scanner" ≠ "safe" — humans
  still review public copy.

## 10. Highest-leverage next move (one line)

Close the trust loop on live data (steps B4–B6 + C7–C8) and **make the calibration receipt the product's
headline** — it's the white space the entire field leaves open, and the math is already built and tested.
