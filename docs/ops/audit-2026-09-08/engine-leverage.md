# Engine leverage audit: what the engine computes and never uses

Dimension: WHAT THE ENGINE COMPUTES AND NEVER USES.
Scope: `packages/prediction-engine/src/**`, `packages/feature-store/**`, and the two code paths
that actually mint a published `Pick`.
Posture: read only. No source edited, no git write, no database access, no gate or threshold touched.
Date of evidence: 2026-09-08, against the working tree at `/home/user/Sports`.

This is an inventory of leverage, not a tuning pass. Nothing here proposes changing
`MODEL_VERSION`, a frozen constant, a floor, a gate, or a test.

---

## What I checked (with commands run)

Files read in full or in the cited ranges:

- `packages/prediction-engine/src/scoring.ts` (1232 lines, all three scorers)
- `packages/prediction-engine/src/game-context.ts` (752 lines, all nine context signals)
- `packages/prediction-engine/src/edge-engine.ts` (the independent-edge assessor)
- `packages/prediction-engine/src/ranking-prob.ts`
- `packages/prediction-engine/src/constants.ts`
- `packages/prediction-engine/src/readiness.ts`, `platform-config.ts`
- `packages/prediction-engine/src/signal-snapshot.ts`
- `packages/prediction-engine/src/evidence-readiness-matrix.ts`
- `packages/prediction-engine/src/ml-estimator.ts` (feature vector + schema hash)
- `packages/prediction-engine/src/shin-devig.ts`, `honesty/devig-method-compare.ts`
- `packages/prediction-engine/src/team-rates.ts`, `elo-estimator.ts` (home advantage constants)
- `packages/ingestion-pipeline/src/process-sport.ts` (context build + pick persistence)
- `packages/ingestion-pipeline/src/generate-signal-slate.ts` (the second generator)
- `packages/ingestion-pipeline/src/build-independent-fair-values.ts`
- `packages/feature-store/src/**` (all 7 non-test source files)
- `packages/types/src/index.ts` (`FactorBreakdown`, `GameContextInput`, `IndependentMarketFairValue`, `computePickGrade`)
- `packages/db/prisma/schema.prisma` (`model Pick`, `model GateDecision`)
- `apps/web/app/api/picks/route.ts`, `apps/web/lib/calibration/selective-publish*.ts`
- `apps/web/components/picks/pick-card.tsx`, `apps/web/lib/pick-explainer/grounding.ts`
- `apps/web/lib/ops/shadow-evaluation-pass.ts`, `apps/web/lib/ops/shadow-vs-live-report.ts`
- `apps/web/lib/correlation/evaluate.ts`, `apps/web/lib/performance/clv-segments.ts`

Commands run (all read only):

```bash
find packages/prediction-engine/src packages/feature-store -type f -name "*.ts" | wc -l   # 592 incl. tests
wc -l packages/prediction-engine/src/**/*.ts | sort -rn | head -60
grep -rn "prediction-engine" --include=*.ts apps/web/lib apps/web/app workers packages/ingestion-pipeline
grep -rn "@sports/feature-store" --include=*.ts --include=*.tsx apps packages workers scripts   # 0 hits
grep -rn "gateDecision\." --include=*.ts apps packages scripts workers                          # reads only
grep -rn "assessEdge(" packages apps --include=*.ts
grep -rn "expectedClv|agreementRatio|trueEvScore|marketFairShinProb|rankingP" ... (per-symbol reader sweeps)
awk '/^model Pick /,/^}/' packages/db/prisma/schema.prisma
```

Three static analyses, each a short Python pass over the repo (scripts kept in the session
scratchpad, not written into the repo):

1. Import-graph reachability inside `packages/prediction-engine/src` from `scoring.ts`.
2. Same graph, entry set widened to every module that defines a symbol the pick pipeline calls
   (`scoreGames`, the seven independent-fair-value builders, `buildPickSignalSnapshot`,
   `buildPickProofReceipt`, `calculatePickResult`, `selectGradingLine`, `resolvePublishTimeMarketP`).
3. Same graph, entry set = every module exporting one of the 187 engine symbols that any file
   outside `packages/prediction-engine` actually imports (the 187 were extracted by regex over
   every non-test `.ts`/`.tsx` in `apps`, `workers`, `packages`).

One dynamic probe, run with `npx tsx` from the session scratchpad importing
`/home/user/Sports/packages/prediction-engine/src/scoring.js` by absolute path. No repo file was
created or modified. Outputs are quoted verbatim in the findings below.

---

## Findings

### F1. The "Pricing Edge" component cannot be positive on a real book, so the public Edge Index measures the vig, and three of four pick grades are unreachable. BLOCKER

`packages/prediction-engine/src/scoring.ts:280-320` (`computeEdgeScore`).

`rawEdge = pickedSideFairProb - offeredProb`. Both sides of that subtraction are derived from the
same set of books in the same call:

- `fairProb` comes from `removeVig(homeImpliedAvg, awayImpliedAvg)`
  (`scoring.ts:441-447` spread, `scoring.ts:750-757` totals, `scoring.ts:957-961` moneyline),
  which is `pickedImplied / twoSidedImpliedSum`.
- `offeredProb` is `americanToImpliedProbability(pickedSideAvgPrice)`, which is `pickedImplied`
  (exactly so on moneyline, where `averageAmericanPrices` averages in probability space,
  `scoring.ts:972-975`).

So `rawEdge = pickedImplied * (1/sum - 1)`, which is strictly negative whenever the book charges
vig (`sum > 1`), and the sub-vig guard at `scoring.ts:302-305` clamps the only case that could be
positive to zero. The normalisation `clamp((rawEdge + 0.05) / 0.10, 0, 1)` therefore never exceeds
0.5, and `edgeScore = round(edgeComponentScore / 25 * 100)` never exceeds 50.

Verified by running the real scorer (10 books, NFL spread `-3.5`, varying juice):

```
-110/-110          conf=67 edgeIdx=26 grade=LEAN | Market price appears 2.4% overvalued
-105/-105          conf=69 edgeIdx=38 grade=LEAN | Market price appears 1.2% overvalued
-102/-102          conf=71 edgeIdx=45 grade=LEAN | Near fair value
+100/+100          conf=73 edgeIdx=50 grade=SOLID_PLAY | Near fair value
-400/+340          conf=67 edgeIdx=29 grade=LEAN | Market price appears 2.1% overvalued
subvig -100/+105   conf=73 edgeIdx=50 grade=SOLID_PLAY | Near fair value
```

Consequences that are all live today:

- The public 0 to 100 "Edge Index" (`toEdgeIndex`, `scoring.ts:100-105`; rendered by
  `apps/web/components/picks/pick-card.tsx:287` as "Pricing Edge", max 25) is a strictly decreasing
  function of the book's hold. A pick at a tighter market scores higher for having a cheaper price,
  not for having an opinion. The free tier's stated trust signal is this number
  (`apps/web/app/api/picks/route.ts:243-246` comment: "The free trust signal on the teaser is the
  Edge Index, not the confidence number").
- `computePickGrade` (`packages/types/src/index.ts:234-242`) needs `edgeScore >= 80` for
  `ELITE_PLAY` and `>= 65` for `STRONG_PLAY`. Neither is reachable. `SOLID_PLAY` needs `>= 50`,
  reachable only at zero or negative hold. In practice every book-path pick is `LEAN`.
- `isFeatured` (`packages/ingestion-pipeline/src/process-sport.ts:1115-1119`) requires
  `ELITE_PLAY`, or `STRONG_PLAY` with confidence >= 80. Unreachable. The other generator hardcodes
  `isFeatured: false` (`generate-signal-slate.ts:694`). No other writer sets it true
  (grep over `apps packages scripts`). So `Pick.isFeatured` is permanently false, while
  `apps/web/app/api/picks/route.ts:158` orders the public board by `isFeatured: "desc"` first and
  `FEATURED_PICK_PROMOTION_ENABLED` (`platform-config.ts:168`) gates a promotion that cannot fire.

What is wrong: the component named "Pricing Edge" is not an edge measurement. It is the pick's
share of the book's overround, sign-flipped and rescaled. Twenty-five of the hundred confidence
points, the entire public Edge Index, the whole pick-grade ladder above LEAN, and one env gate all
hang off it.

### F2. Every independent estimator the platform runs is excluded from confidence, grade, tier and the factor weights. MAJOR

`packages/prediction-engine/src/scoring.ts:542-556` (spread) and `1016-1041` (moneyline).
`assessIndependentEdge` runs, then `deriveRankingProbability` produces `rankingScore` and
`rankingP`, and the resulting factor is pushed with `weight: rank.priced ? round(rankingScore -
confidence) : 0` (`scoring.ts:568`, `1056`). The `confidence` sum at `scoring.ts:527-535` and
`1024-1031` contains no independent term. This is deliberate and documented
(`scoring.ts:163-170`), so the finding is not that it is a bug, it is where the leverage sits.

Verified with the real scorer (10 books, `-400/+340` moneyline):

```
no context                         conf=54 rankScore=54 edgeIdx=29 grade=LEAN rankSrc=confidence          rankP=0.540
indep 0.90 (far above market)      conf=54 rankScore=79 edgeIdx=29 grade=LEAN rankSrc=blend_indep_conf    rankP=0.792
indep 0.40 (contradicts the side)  conf=54 rankScore=44 edgeIdx=29 grade=LEAN rankSrc=blend_indep_conf    rankP=0.442
2 indeps 0.90 + 0.88               conf=54 rankScore=79 edgeIdx=29 grade=LEAN rankSrc=blend_indep_conf    rankP=0.785
```

Confidence is 54 in all four. An independent model that says the market has the side at 0.90 and
one that says 0.40 produce the identical published confidence, the identical grade, and therefore
the identical `tier` (`PREMIUM` at confidence >= 70, `scoring.ts:1069`) and the identical paywall
placement. The nine estimators listed at
`packages/ingestion-pipeline/src/build-independent-fair-values.ts:4-22` (Kalshi, ESPN FPI, ClubElo,
Dixon-Coles, Poisson, Skellam cover, MLB standings win pct, Elo, NFL opponent-adjusted EPA) reach
the product only through `rankingP`, which feeds two things: the in-memory sort order at
`scoring.ts:1215` and `1234`, and the public selective filter.

The sort order is inert at generation: `process-sport.ts:1088-1090` iterates the sorted array and
persists every element, with no top-N cut. `Pick` has no `rankingScore` column
(`packages/db/prisma/schema.prisma`, `model Pick`), so the sort survives only inside
`factorBreakdown.rankingP`.

That leaves the selective filter as the single real effect. `apps/web/app/api/picks/route.ts:174-203`
reads `rankingP` out of `factorBreakdown` and passes it to `passesPublicSelectiveFilterAsync`;
`apps/web/lib/calibration/selective-publish-runtime.ts:306-331` prefers `rankingP` over
`rankingScore` over `confidence`, and `apps/web/lib/calibration/selective-publish.ts:64-79` applies
`|p - 0.5| >= delta`. So a contradicting independent demotes a pick out of the public list without
changing anything the pick says about itself.

### F3. Freshness has no reachable expression in confidence once book coverage is adequate. MAJOR

`packages/prediction-engine/src/game-context.ts:277-296`. `qualityScore = coverage(0-40) +
freshness(0-30) + markets(0-30)`, and the penalty bands are `< 30` giving `-15`, `< 50` giving
`-8`, `>= 50` giving `0`. With 10 or more books, coverage alone is 40, and one present market type
adds 10. The floor is exactly 50, which is the first no-penalty band, so freshness cannot pull the
score into a penalty band no matter how old the snapshot is.

Verified with the real scorer, 10 books, one market:

```
stale 89min, no indep              conf=54
stale 100000min, no indep          conf=54
```

Both readings are identical. `computeDataQuality`'s own docstring warns that the
`dataFreshnessMinutes` default of 0 is "freshest possible, not unknown"
(`game-context.ts:262-272`), and `process-sport.ts:998` does pass a real measured age, so the input
is honest. The scale is what absorbs it. CLAUDE.md rule 5 ("no stale data") is enforced at read
boundaries (`FORCE_NO_BET_IF_STALE`, `readiness.ts`) and not in the score.

Note the honest half of this: at the free spine's typical low book count the freshness term does
bite, because coverage is small. The finding is that the term is fully substitutable by book count,
so the two most different failure modes (a deep stale market and a thin fresh one) can produce the
same number.

### F4. On moneyline, the line-movement component is structurally zero, and the moneyline market has no opening price in the context type at all. MAJOR

`packages/prediction-engine/src/game-context.ts:629-652`: `lineMovementScore` is assigned only
inside `if (marketType === "SPREAD")` and `else if (marketType === "TOTAL")`. For `"MONEYLINE"` it
stays 0.

`packages/prediction-engine/src/scoring.ts:1005` reads `ctx?.lineMovementScore ?? 0` and
`scoring.ts:1027` adds it to moneyline confidence. `scoring.ts:1069` passes it to
`computeRiskLevel`, whose first branch is `Math.abs(lineMovementScore) >= 12 -> "LINE_STEAM"`
(`scoring.ts:120-122`). Both are dead on moneyline.

The data does not exist either: `GameContextInput` (`packages/types/src/index.ts:366-409`) carries
`openingSpread`, `currentSpread`, `openingTotal`, `currentTotal`, and no moneyline equivalent.

The pick card still renders a "Line Movement" bar with max 15 for every pick type
(`apps/web/components/picks/pick-card.tsx:288`), so a moneyline pick shows an empty bar for a
signal that is not merely absent for this game but cannot exist for this market.

### F5. Moneyline confidence is moved up to 20 points by against-the-spread cover records, which answer a different question. MAJOR

`packages/prediction-engine/src/scoring.ts:1027-1028` adds `historicalFormScore` (range -10..+10),
`venueFormScore` (-5..+5) and `headToHeadScore` (-5..+5) to moneyline confidence.

Those three come from `computeGameContext` with `marketType: "MONEYLINE"`
(`scoring.ts:986-999`), and their inputs are ATS buckets:
`getAtsForm` filters `atsResult: { in: ["WIN", "LOSS", "PUSH"] }`
(`packages/data-ingestion/src/context-enrichment.ts:222-234`) and `getHeadToHeadForm` does the same
(`context-enrichment.ts:266-274`). `computeHistoricalFormScore`
(`game-context.ts:189-247`) buckets the raw cover rate at 0.65 / 0.58 / 0.42 / 0.35 with no
opponent adjustment, no line adjustment, and no shrinkage beyond a five-decided-game floor.

A team's rate of covering a spread is not its rate of winning outright. On a moneyline pick the
engine is adding a cover statistic to a win-probability score, at up to a fifth of the total scale.

These three terms are gated off entirely unless `DERIVED_MODEL_HISTORY_ENABLED` is true
(`process-sport.ts:975-990`, default `false` at `platform-config.ts:165`). Whether it is true in
production is NOT VERIFIED (see the last section). `scripts/check-deploy-readiness.mjs:434`
requires it to be on before `PUBLIC_PICKS_ENABLED`, which suggests it is on, but I did not observe
the environment.

### F6. Eight context categories are hardcoded to "not-configured", and eight snapshot booleans are therefore permanently false. MAJOR

`packages/ingestion-pipeline/src/process-sport.ts:157-183`. `SHADOW_CONTEXT_CATEGORIES` is a
literal list: `PLAYER_AVAILABILITY`, `OFFICIALS`, `VENUE_ENVIRONMENT`, `PACE`, `TEAM_RATES`,
`STANDINGS`, `DIVISION_CONTEXT`, `MILESTONES`. `buildMissingContextEvidence` emits one
`EvidenceRecord` per category with `sourceName: "not-configured"`, `trustLevel: 0`,
`activationStatus: "BLOCKED_MISSING_SOURCE"`, `freshnessStatus: "MISSING"`.

Those records become factor rows with `weight: 0` (`scoring.ts:141-158`), so every published pick
carries eight zero-weight "Shadow ..." entries in its factor trail.

`packages/prediction-engine/src/signal-snapshot.ts:119-124` builds `activeShadowCategories` from
records whose `activationStatus === "ACTIVE"`. Since the only producer sets
`BLOCKED_MISSING_SOURCE`, that set is always empty, so `hadWeatherSignal`, `hadInjurySignal`,
`hadRatingsSignal`, `hadPlayerSignal`, `hadOfficialsSignal`, `hadVenueEnvironmentSignal`,
`hadPaceSignal` and `hadMilestoneSignal` (`signal-snapshot.ts:172-185`) are written `false` on
every `PickSignalSnapshot` row, forever, by construction. Two dashboards read them and display a
coverage matrix off them (`apps/web/app/api/admin/dashboard/route.ts:387-399`,
`apps/web/lib/cockpit/jarvis-data.ts:245-265`).

The honest part is real and worth keeping: the code says out loud that these are shadow-only and
"cannot affect confidence". The finding is that the shadow lane has no producer at all, so it is
eight columns of constant false rather than a collection channel.

### F7. Nothing in the repository measures any individual factor against outcomes. MAJOR

Thirteen distinct terms enter confidence (see the inventory table below). I searched for any
surface that regresses, segments or scores any of them against settled results:

- `apps/web/lib/correlation/evaluate.ts:9-20` defines `CorrelationPickRow` with exactly
  `sport, pickType, riskLevel, pickGrade, confidence, edgeScore, consensusPct, bookmakerCount,
  result, modelVersion`. No component score is exposed, so the correlation tool cannot slice by
  line movement, rest, form, venue, H2H, cross-market, schedule stress, or either penalty.
- `apps/web/lib/performance/clv-segments.ts:21-27` segments realized CLV by `sport`, `pickType`,
  `clvKind`, `confidence` and `modelVersion` only.
- Per-symbol reader sweep: `restAdvantageScore` and `historicalFormScore` appear outside
  `game-context.ts`/`scoring.ts` only inside `packages/prediction-engine/src/ml-estimator.ts`
  (see F8). `scheduleStressScore`, `venueFormScore`, `headToHeadScore`, `crossMarketScore`,
  `uncertaintyPenalty` appear only in the pick card, the LLM grounding prompt
  (`apps/web/lib/pick-explainer/grounding.ts:114-131`) and `ml-estimator.ts`.

So the factor weights (`packages/prediction-engine/src/constants.ts:46-88`) are hand-set constants
that no code path has ever compared against a settled result, and there is no surface that could
tell an operator which of them helps. That is the single largest leverage gap in this dimension:
the product's positioning is "math you can read", and the math is readable but unmeasured.

### F8. The learner that would fix F7 already exists, is exported, and has zero consumers. MAJOR

`packages/prediction-engine/src/ml-estimator.ts` (591 lines) defines `MlFeatureVector`
(`ml-estimator.ts:82-137`) with exactly the fourteen fields a weight-learning pass would need:
`marketFairProbHome, spreadLine, bookHoldPct, bookCount, spreadMovementPts, lineMovementScore,
homeRestDays, awayRestDays, restAdvantageScore, scheduleStressScore, historicalFormScore,
headToHeadScore, venueFormScore, crossMarketScore` (`ml-estimator.ts:141-156`), plus a
deterministic `computeFeatureSchemaHash` so a stale model fails a provenance gate rather than
serving silently (`ml-estimator.ts:158-175`).

`packages/prediction-engine/src/index.ts:993-1008` exports `predictWinProb`, `toMlFairValue`,
`fitReferenceModel`, `computeFeatureSchemaHash`, `FEATURE_SCHEMA_HASH`, `MIN_SAMPLE_SIZE`,
`MODEL_MAX_AGE_DAYS` and five types. A grep for each of those twelve names across
`apps`, `workers`, `packages/ingestion-pipeline`, `packages/stats-api` (excluding tests) returns
**0 hits for all twelve**.

Nothing fits it, nothing serves it, nothing schedules it. It is the exact inventory of leverage this
audit was asked for, already written down in the repo, unwired.

### F9. Expected CLV is computed per pick, realized CLV is stored per pick, and nothing joins them. MAJOR

`packages/prediction-engine/src/edge-engine.ts:206-208` computes `expectedClv` and the rationale at
`edge-engine.ts:240-243` states it to the reader ("If correct, the close should move our way:
expected CLV +X%"). It is persisted inside `factorBreakdown.independentEdge.expectedClv`
(`scoring.ts:205`).

`Pick.clvValue`, `clvVerdict`, `clvLockLine`, `clvClosePrice` etc. are graded at settlement
(`packages/db/prisma/schema.prisma`, `model Pick`, CLV block;
`packages/ingestion-pipeline/src/settle-sport.ts`).

The only file in the repo that mentions both `expectedClv` and `clvValue` is
`apps/web/lib/pick-explainer/grounding.ts` (and its test), and there it is prompt-string assembly
at `grounding.ts:143`, not a comparison. Beating the close is the product's central claim, the
engine states a per-pick expectation for it, the outcome is recorded on the same row, and no code
scores the one against the other.

### F10. The GateDecision table has no writer anywhere in the repository, and four surfaces read it. MAJOR

`packages/db/prisma/schema.prisma`, `model GateDecision` (status, reason, reasonCode, edgeIndex,
confidence, modelVersion, evidenceRefs, four indexes).

Every Prisma call against it in `apps`, `packages`, `scripts`, `workers` (tests and fixtures
excluded) is a read:

- `apps/web/lib/board/passes.ts:146` (`findMany`), `:237` (`groupBy`)
- `apps/web/lib/board/state.ts:468` (`findMany`)
- `apps/web/lib/bot-outbox/load.ts:80` (`findMany`)
- `apps/web/lib/engine/load-engine-story.ts:103` (`groupBy`)

No `create`, `createMany`, `upsert` or raw insert exists. The Pass List, the board state, the bot
outbox and the engine story therefore read from a table this codebase never populates. Whether
production rows exist from some earlier or external writer is NOT VERIFIED (no database access).

Related: the whole selective-gate / abstention apparatus that would produce such decisions
(`edge-lab/selective-gate.ts` 566 lines, `certificate/decision-certificate.ts`,
`conformal/mondrian.ts`) is reachable only from `apps/web/app/board/gate/page.tsx`, which defaults
to an explicitly labelled illustrative input set and requires `LIVE_BOARD_GATE_SLATE=1` to read the
real slate (`apps/web/lib/board/load-gate-slate.ts:38-47`). The gate that decides what a subscriber
actually sees is the one-line `|p - 0.5| >= delta` in `selective-publish.ts:64-79`.

### F11. `@sports/feature-store` has zero importers, and its only store is in-memory. MAJOR

`grep -rn "@sports/feature-store" --include=*.ts --include=*.tsx apps packages workers scripts`
returns no hits outside the package's own files. The single declared dependency is
`packages/stats-api/package.json:13`, and `packages/stats-api` does not import it.

The package is 1438 lines including tests, 7 non-test source files. Its contract is exactly what a
serious model needs (`packages/feature-store/src/types.ts:25-38`: `asOf`, `pitCorrect`,
`sourceRights`, `publicApiEligible`, `calibrationCohort`, `modelVersion`, `provenanceHash`), and it
implements point-in-time correctness with a refuse-default (`store.ts:36-50`). The only
implementation is `InMemoryFeatureStore` (`store.ts:29`), a `Map` with no persistence.

So the platform has a written point-in-time feature contract and no feature store: the picks are
built from an ad-hoc context object assembled inline in `process-sport.ts:1027-1069`.

### F12. A second, better-instrumented engine runs on every refresh cycle and its comparison against the shipped engine is only reachable from an owner-run script. MAJOR

`apps/web/app/api/cron/refresh-odds/route.ts:141` calls `runShadowEvaluationPass(sport.key)` every
cycle. That pass (`apps/web/lib/ops/shadow-evaluation-pass.ts:99-175`) restores a persisted particle
filter, runs `LiveOrchestrator` (which wires the Hawkes steam detector,
`packages/prediction-engine/src/pipeline/live-orchestrator.ts:39`), runs `BAEEEnsemble`, absorbs
newly settled results, and writes `ShadowSignal` and `FilterStateSnapshot` rows. It explicitly never
touches a `Pick` (`shadow-evaluation-pass.ts:29-31`).

`apps/web/lib/ops/shadow-vs-live-report.ts:62` defines `buildShadowVsLiveReport`, the function that
would say whether the shadow engine beats the shipped one. Grep across `apps` finds no caller: no
route, no cron, no page. The only consumer of settled `ShadowSignal` rows outside the pass itself is
`scripts/ops/compare-shadow-vs-live.ts:22`, an owner-run script, plus
`scripts/ops/verify-shadow-pipeline.ts` (row counts).

So the measurement runs continuously and the verdict is produced only if a human runs a script.

### F13. Two generators write moneyline picks with incompatible definitions of `confidence`, under one `MODEL_VERSION`. MAJOR

Path A, `packages/ingestion-pipeline/src/process-sport.ts` (cron `refresh-odds`): confidence is the
market-echo composite of `scoring.ts:1024-1031`.

Path B, `packages/ingestion-pipeline/src/generate-signal-slate.ts` (crons `generate-signal-slate`,
`board-fill`, and twice inside `refresh-odds` at `apps/web/app/api/cron/refresh-odds/route.ts:72`
and `:123`): `const confidence = Math.round(trueProb * 100)`
(`generate-signal-slate.ts:432`), where `trueProb` is the independent blend. Its factor breakdown
sets `consensusScore: 0, marketDepthScore: 0, lineMovementScore: 0, volatilityPenalty: 0,
marketFairProb: null` (`generate-signal-slate.ts:510-524`) and its `dataQualityScore` is
`Math.min(100, 60 + independents.length * 15)` (`generate-signal-slate.ts:525`), which is a count
of sources wearing the name of the data-quality score the other path computes from coverage,
freshness and market breadth.

Both stamp `modelVersion: MODEL_VERSION` (`generate-signal-slate.ts:621`, `scoring.ts:1140`). Both
land in the same `Pick` table on the same unique key `(gameId, MONEYLINE)`, and both feed the same
calibration sample. `generate-signal-slate.ts:588-591` correctly refuses to overwrite a book-priced
row, so they do not clobber each other, but the resulting population is a mixture of two models
that a per-version calibration read cannot separate. This is the mechanism behind the already
established fact that 89 percent of published moneyline picks carry no `marketFairProb`.

Path B also applies a blend that Path A does not: a sharpness weight `|p - 0.5| + 0.05`
(`generate-signal-slate.ts:138-141`), which gives a source more say for being more confident rather
than for being more accurate, followed by a fixed `x1.12` stretch away from 0.5
(`generate-signal-slate.ts:148-152`). Path A blends the same sources with an unweighted mean
(`scoring.ts:181-186` passes no `weight`, so `assessEdge` defaults each to 1 at
`edge-engine.ts:170`).

### F14. `Pick.bookDisagreementAtLock` is written on every pick and read by nothing. MINOR

Written write-once at creation (`process-sport.ts:1219-1222`), documented as the liquidity regressor
for `clv-decomposition.ts`. `decomposeClv` (`packages/prediction-engine/src/clv-decomposition.ts:146`)
is exported at `index.ts:427` and has no consumer outside the package (it is not among the 187
externally imported symbols). No Prisma select anywhere reads the column
(`grep -rn "bookDisagreementAtLock: true"` returns nothing).

### F15. Fields computed by the edge engine and then discarded or reduced to prompt text. MINOR

- `EdgeAssessment.agreementRatio` (`edge-engine.ts:186, 251`) is computed and not copied into
  `IndependentEdgeSummary` (`scoring.ts:198-210`). It reaches nothing.
- `IndependentEdgeSummary.conviction` (`scoring.ts:206`) is persisted; the only other occurrence of
  `.conviction` in `apps`/`packages` is that assignment. Never rendered, never read.
- `expectedClv` reaches only the LLM grounding prompt (F9).
- `EdgeInput.uncertainty` (`edge-engine.ts:71`) is a declared shrink input that no caller ever
  supplies, so `uncertaintyFactor` is always 1 (`edge-engine.ts:144`). Meanwhile
  `computeUncertaintyPenalty` produces a real conflict signal in the same scoring pass
  (`game-context.ts:566-608`) and is only added to confidence, never routed into the edge shrink.
- `IndependentEstimate.weight` (`edge-engine.ts:61`) is never supplied by
  `assessIndependentEdge`, so all independents are equally trusted regardless of source.
- `IndependentMarketFairValue.capturedAt` (`packages/types/src/index.ts:420`) is set by every
  builder (`build-independent-fair-values.ts:658, 674, 691, 719`) and read by no scoring code. The
  engine applies a freshness scale to book odds and none at all to independent estimates.

### F16. `factorBreakdown` fields that no consumer reads. MINOR

- `marketPriceShapeScore` is set to the identical value as `edgeScore` in all three scorers
  (`scoring.ts:623, 838, 1112`). Its only other appearance is `generate-signal-slate.ts:513`
  setting it to 0. Nothing reads it.
- `trueEvScore` (`scoring.ts:624, 839, 1113`) has no reader in `apps` at all.
- `fairProbability` is read in exactly one place, `apps/web/lib/calibration/proven-path-rows.ts:120`,
  for the calibration sample.
- `marketFairShinProb` (`scoring.ts:639, 848, 1128`) is display only, as its own doc comment states
  (`packages/types/src/index.ts:115-121`), rendered at
  `apps/web/components/picks/pick-card.tsx:364-365`. The full Shin de-vig
  (`packages/prediction-engine/src/shin-devig.ts`) and the three-method comparison
  (`honesty/devig-method-compare.ts`, whose header says "Not wired into pick minting") exist, and
  `marketFairMethod` is hardcoded `"proportional"` on every path.

### F17. Two confidence components have no representation in the factor trail at all. MINOR

`FactorBreakdown` (`packages/types/src/index.ts:79-124`) has fields for `consensusScore`,
`marketDepthScore`, `edgeScore`, `lineMovementScore`, `volatilityPenalty`, `headToHeadScore`,
`venueFormScore`, `uncertaintyPenalty`, `crossMarketScore`, `scheduleStressScore`,
`dataQualityScore`. It has none for `restAdvantageScore` or `historicalFormScore`, both of which are
summed into confidence at `scoring.ts:530` and `1027` with ranges of -10..+10 each.

They surface only as a free-text `FactorDetail` when non-zero, and the LLM grounding component list
(`apps/web/lib/pick-explainer/grounding.ts:114-127`) omits both. A reader reconstructing the
confidence number from the breakdown fields is short by up to 20 points with no way to see it.

### F18. The `+10` base term is invisible everywhere. MINOR

`scoring.ts:532`, `806`, `1028` each add a literal `10` to confidence. It is not a named constant in
`constants.ts`, it emits no `FactorDetail`, it has no `FactorBreakdown` field, and the pick card's
four ScoreBars (`pick-card.tsx:285-288`) sum to at most 90 of the 100 the number is on. On the
positioning claim of "math you can read", ten percent of the scale is not readable.

### F19. `RiskLevel.INJURY_RISK` is unreachable. MINOR

`computeRiskLevel` (`scoring.ts:118-139`) can return `LINE_STEAM`, `HIGH_VARIANCE`, `LOW_RISK`,
`MODERATE`. `INJURY_RISK` is declared (`packages/types/src/index.ts:17`), labelled "Injury Sensitive"
(`types/src/index.ts:255`), coloured on the card (`pick-card.tsx:42`), assigned a severity of 0.78 in
`apps/web/lib/slate-twin/get-slate-twin.ts:71`, and cited in a PUBLIC trust claim's review note
(`apps/web/lib/trust-claims.ts:158`). No producer exists, because no injury input exists (F6). The
public copy for that claim does not promise injury awareness, so this is a dead enum rather than a
false claim, but the review note points at a state the engine cannot produce.

### F20. Latent asymmetries in which context terms each scorer reads. MINOR

`computeGameContext` returns ten values. `scoreTotalPick` reads two of them
(`scoring.ts:797-799`: `lineMovementScore`, `dataQualityPenalty`, plus `dataQualityScore`) and
drops `headToHeadScore`, `venueFormScore`, `uncertaintyPenalty`, `crossMarketScore`,
`scheduleStressScore`, `restAdvantageScore`, `historicalFormScore`. `scoreMoneylinePick` reads all
except `crossMarketScore` (`scoring.ts:1026-1028`).

Today the dropped values are all structurally 0 for those market types (the guards at
`game-context.ts:656-663`, `:686-697`, `:702-706`, `:718-720` and `computeCrossMarketScore`'s
`marketType !== "SPREAD"` early return at `:451-453` see to that), so nothing is currently lost.
The finding is that the drop is by omission rather than by guard: if any of those guards is later
relaxed, two scorers will silently ignore a live signal the third one prices.

### F21. Sixty-two percent of the engine's source is not reachable from anything outside the package. MINOR (context, not a defect on its own)

Measured by the third static pass described above: 299 non-test source files, 65,234 lines. Files
reachable from at least one of the 187 symbols any external file imports: 99. Not reachable: **200
files, 40,678 lines, 62 percent of engine source.**

A stricter cut: reachable from `scoring.ts` alone is **10 files** (`constants`, `edge-engine`,
`game-context`, `honesty/devig-method-compare`, `poisson`, `ranking-prob`, `scoring`, `shin-devig`,
`skellam`, `team-rates`). Widening the entry set to the whole pick pipeline (the seven independent
fair-value builders, the signal snapshot, the proof receipt, settlement and grading-line selection)
reaches **22 of 299**.

A separate pass found **61 files unreachable even from `index.ts`**, that is, reachable only from
their own tests. They include the complete leak-free NFL situational feature set:
`edge-lab/features/nfl-weather.ts`, `edge-lab/features/nfl-body-clock.ts`,
`edge-lab/features/nfl-regime-detector.ts`, `edge-lab/features/nfl-incentive-calendar.ts`,
`edge-lab/features/nfl-team-form.ts`, `edge-lab/schedule-features.ts`, plus
`edge-lab/props-context-bind.ts` (their only importer, itself unreachable), the whole `promotion/`
directory (8 files, the challenger-model promotion gate), `research/nb-rbpf.ts` and
`research/synthetic-nb.ts` (the negative-binomial model that carries explicit team, pitcher, park
and umpire effects), and `edge-lab/ledger-chain.ts`.

Modules that are reachable from `index.ts` but export nothing any external file imports include
`hawkes-steam.ts` (866 lines, steam detection, reached only through the shadow orchestrator),
`information-edge-bits.ts` (625), `robust-kelly.ts` (509) with `calibration-kelly-bridge.ts` (202),
`historical-replay.ts` (502), `evidence-readiness-matrix.ts` (535), `linear-thompson.ts` (325),
`simhash.ts` (325), `clv-decomposition.ts` (223), `coverage-self-audit.ts` (167),
`conformal/mondrian.ts` (145) and the three `gse-score/` modules (493 combined).

`evidence-readiness-matrix.ts` deserves a line of its own: it is the repository's own formal
inventory of the missing inputs, with per-factor trust floors, sample floors, max ages, activation
requirements and named failure modes (`evidence-readiness-matrix.ts:80-249`). `buildEvidenceReadinessMatrix`
is exported at `index.ts:154` and called by nothing.

---

## Inventory: every signal the engine can compute for a published pick

### Confidence components (the only terms that move the published number)

| # | Term | Range | Source | SPREAD | TOTAL | MONEYLINE | Live effect today |
|---|---|---|---|---|---|---|---|
| 1 | `consensusScore` | 0..30 | `scoring.ts:214-247` | yes | yes | yes | Spread/total: share of books on the side. Moneyline: the de-vigged fair probability itself (`scoring.ts:965`), so "consensus" is the market price |
| 2 | `marketDepthScore` | 0..20 | `scoring.ts:253-269` | yes | yes | yes | Book count / 10 |
| 3 | `edgeComponentScore` | 0..25 | `scoring.ts:280-320` | yes | yes | yes | Bounded to 0..12.5 in practice; see F1 |
| 4 | `volatilityPenalty` | -15..0 | `scoring.ts:326-364` | yes | yes | yes (always 0: called with dispersion 0, `scoring.ts:986`) | Thin market plus line dispersion |
| 5 | `lineMovementScore` | -15..+15 | `game-context.ts:59-119` | yes | yes | **structurally 0** (F4) | Opening vs current, linear in delta, saturates at 3 points |
| 6 | `restAdvantageScore` | -10..+10 | `game-context.ts:127-179` | yes | no | yes | Gated by `DERIVED_MODEL_HISTORY_ENABLED`? No: rest comes from the enriched game row, not ATS, so it is live whenever `restDaysHome/Away` are populated |
| 7 | `historicalFormScore` | -10..+10 | `game-context.ts:189-247` | yes | no | yes | ATS cover record. Gated by `DERIVED_MODEL_HISTORY_ENABLED` (`process-sport.ts:975`) |
| 8 | `headToHeadScore` | -5..+5 | `game-context.ts:329-390` | yes | no | yes | ATS, same gate |
| 9 | `venueFormScore` | -5..+5 | `game-context.ts:398-455` | yes | no | yes | ATS, same gate |
| 10 | `crossMarketScore` | -3..+4 | `game-context.ts:466-490` | yes | no | **not read** (F20) | Spread side vs moneyline fair, needs \|p-0.5\| >= 0.05 |
| 11 | `scheduleStressScore` | -5..+5 | `game-context.ts:507-556` | yes | no (guarded) | yes | Games in last 7 days, fires only at a 2+ game gap |
| 12 | `uncertaintyPenalty` | -8..0 | `game-context.ts:566-608` | yes | no | yes | Three hardcoded conflict rules |
| 13 | `dataQualityPenalty` | -15..0 | `game-context.ts:277-296` | yes | yes | yes | Unreachable at 10+ books; see F3 |
| 14 | Base `+10` | +10 | `scoring.ts:532, 806, 1028` | yes | yes | yes | Invisible in the factor trail (F18) |

Clamped to 0..100. Note that terms 1 to 3 plus 5 plus 14 already sum to a maximum of exactly 100,
so on a strong pick every one of the intelligence-layer terms 6 to 12 is absorbed by the clamp.

### Computed, stored, and read by nothing that affects a pick

| Signal | Written at | Read by |
|---|---|---|
| `rankingScore` (ScoredPick field) | `scoring.ts:1136` etc. | In-memory sort only. No `Pick` column exists |
| `dataQualityScore` (ScoredPick field) | `scoring.ts:1143` | Not in `pickUpdateData` (`process-sport.ts:1096-1112`); survives only inside `factorBreakdown` and the snapshot |
| `marketPriceShapeScore` | `scoring.ts:623, 838, 1112` | Nothing |
| `trueEvScore` | `scoring.ts:624, 839, 1113` | Nothing in `apps` |
| `marketFairShinProb` | `scoring.ts:639, 848, 1128` | Display only, `pick-card.tsx:365` |
| `independentEdge.conviction` | `scoring.ts:206` | Nothing |
| `independentEdge.expectedClv` | `scoring.ts:205` | LLM prompt only, `grounding.ts:143` |
| `EdgeAssessment.agreementRatio` | `edge-engine.ts:251` | Dropped at `scoring.ts:198-210` |
| `Pick.bookDisagreementAtLock` | `process-sport.ts:1219` | Nothing (F14) |
| `PickSignalSnapshot.hadWeather/Injury/Ratings/Player/Officials/VenueEnvironment/Pace/Milestone` | `signal-snapshot.ts:172-185` | Two dashboards, always false (F6) |
| Shadow evidence factors (8 per pick, weight 0) | `scoring.ts:141-158` | Factor trail text only |

---

## Inputs the engine does not take

Everything below is absent from both generators. The repository's own list of most of these, with
trust floors and failure modes, is `packages/prediction-engine/src/evidence-readiness-matrix.ts:80-249`,
which nothing calls.

| Input | Status in this repo |
|---|---|
| Injuries, player availability | No provider. Hardcoded `BLOCKED_MISSING_SOURCE` (`process-sport.ts:157-183`). Matrix key `player.availability` requires trust 0.85 and a 6h max age |
| Lineup / starter confirmation, probable pitcher | Nothing outside `research/synthetic-nb.ts` and `research/nb-rbpf.ts`, both unreachable |
| Weather | `edge-lab/features/nfl-weather.ts` is a complete leak-free forecast feature builder with NWS and Open-Meteo rights notes. Unreachable from `index.ts` |
| Venue environment, roof, surface, park factors | Matrix keys `venue.environment` and `venue.history`. No provider. Park effects exist only in `research/synthetic-nb.ts` |
| Officials / referee tendencies | Matrix key `official.tendencies`, min sample 20. No provider. Umpire effects only in `research/` |
| Travel, time zone, body clock | Not in the readiness matrix at all. `edge-lab/features/nfl-body-clock.ts` implements it (static team-to-zone table, standard-time offsets) and is unreachable |
| Pace / possessions | Matrix key `team.pace`, min sample 8. No provider |
| Rest | Present, terms 6 and 11 above. This is the one situational input the engine does take |
| Home-field advantage | Not a scorer term. It exists only inside two independent estimators, as single global constants: Elo `homeAdvantage = 65` (`elo-estimator.ts:30`) applied to every sport, since the call site passes only `{ now }` (`build-independent-fair-values.ts:737-742`); and Poisson `DEFAULT_HOME_ADVANTAGE = 1.1` (`team-rates.ts:46`) whose own comment says it is uncalibrated and applies across soccer, hockey and baseball alike |
| Opponent adjustment on form | None. ATS buckets are raw counts (`context-enrichment.ts:222-242`) |
| Opening moneyline price | Not representable: `GameContextInput` has no field for it (F4) |
| Point-in-time feature store | Written and unwired (F11) |

---

## What I checked and found CORRECT

- **The refusals are real and well argued.** Three-way soccer moneylines are suppressed rather than
  published with a two-way number (`scoring.ts:936-939`), and the same guard is repeated in the
  second generator (`generate-signal-slate.ts:355-358`). Baseball spreads off the run-line ladder
  are refused rather than repaired (`scoring.ts:900-935`), with the measured production count in
  the comment. An all-pick-em spread board yields no pick (`scoring.ts:400-402`). A missing chosen
  side price is refused rather than defaulted to -110 (`scoring.ts:419-437`).
- **One book set per price-derived value.** Both `scoreSpreadPick` and `scoreTotalPick` restrict
  every price and depth value to books quoting both sides (`scoring.ts:381-393`, `:729-741`), while
  deliberately keeping line-only books in the line consensus. The reasoning for why mixed sets
  would manufacture edge is stated in the comments and is correct.
- **`averageAmericanPrices` averages in probability space** (`scoring.ts:56-61`), which is the right
  fix for the discontinuity at plus or minus 100.
- **`line` is stored in home-team perspective** with the settlement convention spelled out
  (`scoring.ts:657-666`).
- **Settled picks are frozen and side flips are refused** rather than silently reversed
  (`process-sport.ts:1121-1156`), and the same in the second generator
  (`generate-signal-slate.ts:594-604`).
- **Proof receipts refuse to mint `modelProb` from `confidence/100`** (`process-sport.ts:1272`),
  which is exactly the trap this product's premise forbids.
- **ATS windows are bounded as-of the fixture's own kickoff** (`process-sport.ts:978-989`, C-187),
  which prevents lookahead on reprocess.
- **Form buckets gate on decided games, not sample size**, so a mostly-push bucket cannot mint a
  full-strength signal (`game-context.ts:200-205`, `:340-345`, `:412-417`).
- **The sub-vig guard is present in both the scorer and the edge engine**
  (`scoring.ts:302-305`, `edge-engine.ts:178`), and `assessEdge` fails closed to a PASS on
  non-finite or non-positive total weight rather than propagating NaN (`edge-engine.ts:163-167`).
- **`PickSignalSnapshot` quantities are genuinely consumed** by the audit, explain, premortem and
  loss-autopsy surfaces (`apps/web/app/api/picks/[id]/audit/route.ts:286-288`,
  `apps/web/lib/premortem/fragility.ts:70-73`), so the snapshot is not a write-only table even
  though eight of its booleans are constant.
- **`deriveRankingProbability` never uses edge as a probability**, which is stated as a law and
  honoured (`ranking-prob.ts:1-14`, and the blend at `:88-99` is a probability blend throughout).
- **Determinism is documented precisely**, including that `fetchedAt` is the sole nondeterministic
  input and that production callers must pass the real ingestion timestamp
  (`scoring.ts:1160-1185`); `process-sport.ts:1085` does pass it.
- **The two generators do not clobber each other.** `isSignalSlateRow` prevents the signal slate
  from overwriting a book-priced row, with the measured consequence of the old behaviour recorded
  in the comment (`generate-signal-slate.ts:580-591`).
- **`isPublished` is written one-directionally**, so an operator's unpublish is not silently
  reversed by the next run while the gate keeps its power to close
  (`generate-signal-slate.ts:626-640`).

---

## What I could not check and why

- **Production environment values.** `.env*` is Read-denied for agent sessions (AGENTS.md law 2)
  and I have no database or Vercel access. So the following are code defaults, not observed
  production state, and are marked NOT VERIFIED as production facts:
  `DERIVED_MODEL_HISTORY_ENABLED` (default false, `platform-config.ts:165`),
  `CALIBRATION_ADJUSTMENTS_ENABLED` (default false, `:173`),
  `FEATURED_PICK_PROMOTION_ENABLED` (default false, `:169`),
  `PUBLIC_PICKS_ENABLED` (default false, `:165`),
  `SELECTIVE_PUBLISH_ENABLED` (default ON, `selective-publish-runtime.ts:36-43`),
  `LIVE_BOARD_GATE_SLATE` (default off, `load-gate-slate.ts:47`),
  `ESPN_POWERINDEX_LICENSED` (default closed).
  F5's live impact depends on the first of these.
- **Whether `gate_decisions` holds rows in production.** F10 establishes only that no code in this
  repository writes them. NOT VERIFIED whether rows exist from an earlier writer or an external
  process.
- **Actual distributions of published picks.** I did not query the database, so statements like
  "in practice every book-path pick is LEAN" are derived from the arithmetic in F1 plus the probe,
  not from counting rows. The probe covers six juice configurations, not the live board.
- **Which independent estimators actually return values in production.** `buildIndependentFairValues`
  soft-fails each source; whether Kalshi, FPI, ClubElo, MLB standings or nflverse EPA return
  anything on a given cycle depends on network, rights gates and stored rows. NOT VERIFIED.
- **The 62 percent unreachable figure is a static measure.** It uses relative-path imports inside
  the package plus the 187 externally imported symbol names, extracted by regex. It does not follow
  `export ... from` re-export chains through third files, and it does not cover imports made from
  `scripts/*.mjs` against built output. It is therefore approximate; the direction and order of
  magnitude are what the finding relies on. The 10-file and 22-file reachability numbers from
  `scoring.ts` are exact, because those graphs are small enough to read in full and are listed
  above.
- **I did not run the test suite, typecheck, lint or guardrails.** This is a read-only audit and
  none of those were required to establish any claim above.
- **`packages/stats-api` declares `@sports/feature-store` as a dependency.** I confirmed it does not
  import it in any non-test `.ts`, but I did not audit `packages/stats-api` in full.
