# GSE Signal Architecture, 2026-09-18

Author: Fable (architect session). Status: PROPOSED. Supersedes nothing; it sequences
what already exists.

This document answers one instruction: we have a large research corpus, a large engine
and a small amount of verified truth, so put it together into one architecture where
every signal has a place, a rank, an owner and a way to die. It is built from nine
read-only maps of this repository plus an independent map of the pre-2026-09-17 intake
stack, three competing designs scored by three judges, and an adversarial verification
pass. Where the verification contradicted the design, the verification won and the
change is marked.

Every path cited resolves on `origin/main` at `ac299ab07` unless marked BRANCH,
PROPOSED or NEW. Paths given in short form (`edge-lab/logistic.ts`) are relative to
`packages/prediction-engine/src/`. The engine is, and remains, deterministic
statistical modeling: factor models, logistic heads, conformal and Venn-Abers
intervals, settled-outcome labels. Nothing here is an AI system and nothing may be
described as one.

## Plan changes against the standing notes, one line each

- No separate v5.2.8 bump. Its display half is already live (section 2.3). Its
  IMPLEMENTED flip and MODEL_VERSION change fold into one founder-named bump,
  recommended v6.0.0. C-107 stays CLAIMED until the founder decides.
- v5.3.0's "aligned to a prop means boost" and "confidence becomes calibrated_p inside
  the composite" are rejected. Nothing outside the head may raise a probability, and
  the head changes only under a bump.
- "No shadow period" is honored by purged, game-grouped walk-forward on settled rows
  plus the 1999+ `HistoricalGame` archive, not by a calendar wait. What cannot be
  backtested does not ship.
- Beat desk, prop alignment and narrative or incentive signals enter as capture-first,
  withhold-only gates, never as features, until as-of logs exist.
- FTN charting-derived columns (CC-BY-SA share-alike) are model-ineligible by
  construction until the founder rules.
- TOTAL picks become market-read-only now and publish nothing after the bump until a
  totals feature earns lift. NFL, NBA and NCAA spreads have no independent estimator at
  all, so no edge veto can fire on them today.
- A signal-path row with no market probability is a read, not a pick.
- The engine already contains the registry contract this document needs
  (`evidence-readiness-matrix.ts`, 13 factor keys with trust, sample and age floors).
  It has no runtime caller. We wire it rather than invent a second one.

---

## 1. Verdict

Today the engine is two disjoint generators writing one `picks` table. The book path
(`packages/ingestion-pipeline/src/process-sport.ts` into `scoring.ts`) tiers, ranks and
displays an additive heuristic `confidence` that is anti-predictive at the top: at
confidence 80 and above, n 235, it claims 0.8663 and realizes 0.5191, z of -10.7, with
a Brier of 0.3617 against 0.25 for a constant 0.5 forecast
(`docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md`
section 3b). Fifty of its points are fixed before the game is read, because
`consensusScore` caps at 30 and `marketDepthScore` at 20 and both saturate on a deep
board (`scoring.ts:258-288`). The signal path (`generate-signal-slate.ts`) blends
independents that collapse to a single Elo source on NFL, stretches the result by 1.12,
and never compares against a market at all (`marketFairProb: null`, `expectedClv: 0`).
The only number on the platform measured calibrated is the de-vigged market
probability.

It becomes a calibration-first engine. One certified probability per (sport, market,
side) at a stamped as-of time, produced by a per-stratum logistic head whose base term
is the market probability entered as a fixed offset, whose other inputs are
market-blind independents and features that passed a pre-registered test with a kill
line written first, and whose output carries a cross-Venn-Abers interval. Edge, tier,
rank, publish and display all derive from that probability and its interval. Everything
after the head may only withhold. Every research signal in the corpus is exactly one of
four things: a candidate feature that must earn a coefficient, a gate that must prove
its withheld set grades worse, a display number carrying a source and an n, or content
that never touches a pick.

Two numbers have to move, and they are not the same number:

1. Per stratum, the head's paired out-of-fold log-loss lower bound over a
   market-only baseline must be positive, and its own out-of-fold rows must clear the
   byte-identical floors (n 100, Brier 0.22, debiased ECE 0.05, Murphy 0.05,
   `apps/web/lib/ops/calibration-eligibility.ts:131-136`). That certifies we own a
   probability better than the market's.
2. Beat-close on a same-book basis must reach 0.524 at the bootstrap fifth percentile
   over at least 500 graded rows clustered by fixture. Today it reads 23.0 percent on a
   consensus-versus-consensus basis across drifting book sets, so it cannot yet be
   attributed to the model or to the ruler.

The board gets thinner before it gets better. That is the cost of certifying what we
publish, and it is the only honest order of operations.

**The one-sentence version.** We do not have a signal shortage, we have a measurement
shortage: 299 engine source files, 87 of them with no non-test importer, a 40-plus
signal research corpus, and exactly one signal on the platform whose calibration has
been measured.

---

## 2. Inventory of what exists

Status vocabulary: WIRED (reached from a production cron, route or mint path), PARTIAL
(wired behind an env gate or to a non-pick surface), SHADOW (runs in production, writes
nothing a pick reads), DIAGNOSTIC (reached only from the calibration cron or a cockpit
page), SCRIPTS-ONLY (reached only from `scripts/*`, never CI or cron), ORPHAN (no
non-test importer), DEAD-CHAIN (imported only by orphans), BRANCH (not on main).
Measured counts: 299 non-test files under `packages/prediction-engine/src`, 80 with an
external value importer, 87 ORPHAN, 48 DEAD-CHAIN.

### 2.1 Mint path

| Module | Path | Status | Note |
|---|---|---|---|
| Book-path scorer | `scoring.ts` | WIRED | three per-market scorers; confidence sums at `:576-584`, `:861-867`, `:1145-1151`; vetoes at `:430-482`, `:586`, `:599-604`, `:1112-1197`; TOTAL has no independent and no market veto (`:918-920`) |
| Edge engine | `edge-engine.ts` | WIRED | SPEAK 0.025, LEAN 0.012 (`:46-47`); PASS on CONTRADICTS, direction at or below zero, or shrunk edge below LEAN (`:219-223`); `expectedClv` is the shrunk edge |
| Ranking probability | `ranking-prob.ts` | WIRED | 0.7 trueProb plus 0.3 confidence/100 (`:57-107`), pinned by `__tests__/ranking-prob.test.ts` |
| Game context terms | `game-context.ts` | WIRED | line movement, rest, form, venue, cross-market, schedule, data quality (`:96-605`); freshness default grants full credit when omitted (`:269-289`) |
| Published line | `published-line.ts` | WIRED | posted-line snap, ties resolve against us |
| Constants | `constants.ts` | WIRED | MODEL_VERSION v5.2.7 (`:25`); PREMIUM 70, MIN_PUBLISH 50 (`:30-31`); MIN_BOOKMAKERS 2 (`:105`) |
| Shared predicates | `packages/types/src/index.ts` | WIRED | `pricesWorseThanMarket` (`:86-90`), `computePickGrade` (`:247-255`), FactorBreakdown shape (`:47-136`) |
| Orchestrator | `packages/ingestion-pipeline/src/process-sport.ts` | WIRED | pick create `:1219-1364`; refresh rewrites tier, grade and confidence `:1268-1305`; snapshot `:1369-1394`; receipt `:1409-1454`; never sets `isPublished` |
| Independent assembly | `packages/ingestion-pipeline/src/build-independent-fair-values.ts` | WIRED | order `:480-668`; Kalshi dead `:205-208`; FPI rights-gated `:236`; NFL EPA depends on `TeamGameEfficiency` `:355-380` |
| Signal slate | `packages/ingestion-pipeline/src/generate-signal-slate.ts` | WIRED | moneyline only; 1.12 stretch `:122-125`; no snapshot, no receipt; `isPublished` from the gate on create |
| Signal snapshot | `signal-snapshot.ts` | WIRED (book path only) | boolean `hadX` flags, not values; 8 of 15 are structurally false |
| Proof receipt | `pick-proof-receipt.ts` | WIRED (book path only) | `proportional_devig_v1` (`:79`) |
| Shadow evidence | `process-sport.ts:177-205`, rendered `scoring.ts:142-159` | WIRED but inert | every book-path pick carries 8 constant `BLOCKED_MISSING_SOURCE` records, `sourceName: "not-configured"`, trust 0, weight 0 |
| Kickoff and fixture guards | `packages/ingestion-pipeline/src/in-play-guard.ts`, `fixture-confirmation.ts` | WIRED | C-299, C-111 |
| Founder picks | `apps/web/lib/founder-picks/{create,record,types}.ts` | WIRED | `founder-v1`, rankingP null, never in calibration |
| Founder factor engine | `apps/web/lib/founder-picks/factors.ts` | ORPHAN | consensus factor boosts both directions (`:222`), a real defect if ever wired |
| Pick-generation worker | `workers/pick-generation/src/index.ts` | no-op stub | |

### 2.2 Independent estimators and the research ensemble

| Module | Path | Status |
|---|---|---|
| Elo from results (K 20, HFA 65) | `elo-from-results.ts` | WIRED via `build-independent-fair-values.ts:641` |
| Poisson, team rates, Dixon-Coles, Skellam cover | `poisson.ts`, `team-rates.ts`, `dixon-coles.ts`, `skellam.ts` | WIRED for soccer, hockey, baseball only (`skellam.ts:30`) |
| MLB standings Bradley-Terry | `standings-strength.ts` | WIRED |
| NFL opponent-adjusted EPA | `opponent-adjusted.ts`, `nfl-epa-fair-value.ts` | WIRED, liveness unverified; reads `TeamGameEfficiency`, written by `apps/web/lib/ingestion/team-efficiency.ts` on the 07:15 cron |
| NFL EPA path status probe | `edge-lab/nfl-epa-path.ts` | ORPHAN; its own header says that if the table is empty the nflverse EPA branch is dead |
| ESPN Power Index | `espn-powerindex.ts`, `packages/ingestion-pipeline/src/independent-source-rights.ts:22` | PARTIAL, rights-gated, default closed |
| Kalshi via PredExon, Polymarket | `packages/data-ingestion/src/galaxy-kalshi-book.ts`, `polymarket-independent-client.ts` | PARTIAL (env), compliance hold |
| NFL margin mixture (key numbers) | `nfl/margin-mixture-model.ts` | ORPHAN. This is the missing spread independent |
| Own EP, WP, CPOE, RYOE, xYAC | `expected-metrics/*` | WIRED to one route only; not read by scoring |
| Shadow ensemble | `pipeline/live-orchestrator.ts`, `team-strength-filter.ts` (bootstrap particle filter), `hawkes-steam.ts`, `information-edge-bits.ts`, `ensemble/*` | SHADOW via `apps/web/lib/ops/shadow-evaluation-pass.ts`; errors swallowed at `refresh-odds/route.ts:130-145` |
| Shadow store | `apps/web/lib/ops/shadow-signal-store.ts`, `ShadowSignal` (`schema.prisma:1341-1363`) | WIRED; one row per (gameId, modelVersion), a single home-win probability. It is NOT pick-shaped and cannot hold per-pick head output |
| ML estimator, Thompson, SimHash, phi, parlay adjuster, referee consensus | `ml-estimator.ts`, `linear-thompson.ts`, `simhash.ts`, `dispersion/estimate-phi.ts`, `parlay/correlationAdjuster.ts`, `consensus.ts` | ORPHAN |

### 2.3 Read surfaces and display filters

| Module | Path | Status | Note |
|---|---|---|---|
| Picks API | `apps/web/app/api/picks/route.ts` | WIRED | filters `:124-233` |
| Board state | `apps/web/lib/board/state.ts` | WIRED | published lane `:721-735`, `:848-861`; gated lane built from GAMES `:900-922`; `todayBounds` in the process zone `:305` |
| Board passes | `apps/web/lib/board/passes.ts` | WIRED on its fallback path only | `gate_decisions` has no writer; UTC date stamps at `:126`, `:277`, `:361`, `:366` |
| Adverse-edge suppression | `apps/web/lib/picks/adverse-edge-suppression.ts` | WIRED | imports the predicate from `@sports/types` (`:59`), the correct pattern |
| Model-signal coherence | `apps/web/lib/picks/model-signal-coherence.ts` | WIRED | |
| Ranking sort key | `apps/web/lib/ranking/sort-key.ts` | WIRED | isFeatured, then rankingP, then rankingScore, then confidence (`:15-28`) |
| Selective filter | `apps/web/lib/calibration/selective-publish-runtime.ts` | WIRED | delta 0.1 on rankingP |
| Market-implied display | `apps/web/lib/picks/market-implied-display.ts`, `apps/web/components/picks/pick-card.tsx:191-207` | WIRED | **rendered to every tier already.** The standing note that it is gated on `canSeeConfidence` is stale. The real gap is SPREAD and TOTAL coverage, enforced server-side |
| Calibration report | `apps/web/lib/calibration/compute.ts` | WIRED | still publishes `expectedFromConfidence = confidence / 100` as the forecast (`:260-262`) |
| Public confidence calibrator | `apps/web/lib/calibration/public-confidence.ts`, `honest-confidence.ts` | PARTIAL, flag default false | isotonic on confidence/100, which cannot invert a non-monotone score |

### 2.4 Gates, calibration and promotion

| Module | Path | Status |
|---|---|---|
| Conviction gate | `apps/web/lib/conviction/gate-contract.ts`, `registry.ts`, `signals/*` | ORPHAN. Zero importers outside its own directory; `requireEvidence` defaults false |
| Evidence readiness matrix | `evidence-readiness-matrix.ts` | ORPHAN with a runtime contract. 13 factor keys, per-factor trust, sample and age floors (`:18-31`, `:82-252`, `:388-452`). Exported from the barrel at `index.ts:168`, called by nothing |
| Display calibrator | `calibration-apply.ts` | PARTIAL, flag off; PAVA, monotone by construction |
| Venn-Abers | `calibration/{pav,ivap,cvap,aggregation}.ts` | PARTIAL via the selective gate |
| Selective gate | `edge-lab/selective-gate.ts` | research page only; `MIN_STRATUM_CALIBRATION` 100 |
| CQR | `apps/web/lib/calibration/cqr.ts:12-15` | ORPHAN, default off. **Clamps the finite-sample rank into range instead of refusing**, verified this session |
| Conformal calibration | `apps/web/lib/calibration/conformal-calibration.ts:174` | WIRED read-only; returns positive infinity below minN 20, which is the correct pattern |
| Eligibility gate | `apps/web/lib/ops/calibration-eligibility.ts`, `calibration-eligibility-durable.ts` | WIRED; floors `:131-136`; streak 3; basis `market_anchored_v4` |
| In-play exclusion | `apps/web/lib/calibration/in-play-exclusion.ts:60-66` | WIRED. **A null on either clock keeps the row**, verified this session: a leakage hole |
| Debiased ECE | `apps/web/lib/calibration/ece-debiased.ts` | WIRED, per-bin variance corrected |
| Promotion gate | `promotion/{evaluate,empirical-bernstein,clv-non-inferiority,integrity,window-hash}.ts` | DARK. Bounds assume independent draws; `integrity.ts` dedups on pickId, not fixture |
| Model freeze | `scripts/guardrails/model-freeze.mjs` | WIRED in CI. Accepts a version via a seeded IMPLEMENTED proposal, a proposal doc, or the `frozen:` line in `docs/calibration-proposals/FROZEN.md` |

### 2.5 Edge-lab harness

The harness for everything this document proposes already exists and has never run on a
schedule or in CI.

| Module | Path | Status |
|---|---|---|
| As-of store, walk-forward (purge, embargo, sealed holdout), placebo, ridge logistic, logit pool, trials registry with BH-FDR, calibration blend, recompute verifier | `edge-lab/{asof-store,walk-forward,placebo,logistic,logit-pool,trials-registry,calibration-blend,recompute-verifier}.ts` | SCRIPTS-ONLY. Only `gate:phase-c` is an npm script; no CI job |
| Prior null already recorded | `edge-lab/features/nfl-team-form.ts:1-11` | schedule-derived reference features carry no information beyond the closing price: mutual-information probe p 0.060, logit-pool beta CI spans zero, verdict FIRE_NOTHING |
| Candidate feature builders | `edge-lab/features/{nfl-body-clock,nfl-weather,nfl-incentive-calendar,nfl-regime-change}.ts` | ORPHAN or DEAD-CHAIN |
| Props stack | `edge-lab/props-hb*.ts` and about 30 related files | SCRIPTS-ONLY or ORPHAN; the one wired consumer reads a fictional sample pool |
| De-vig conventions | `market-read.ts`, `shin-devig.ts`, `devig/oracle.ts`, `edge-lab/devig.ts`, receipt proportional | four conventions in the tree |
| CLV | `clv.ts`, `clv-capture.ts`, `apps/web/lib/settlement/free-path-clv.ts`, `apps/web/lib/clv/clv-sample-policy.ts` | WIRED. `clv-capture.ts:90-144` reads an Odds batch with **no book identifier**, so book-mix drift is scored as market movement |
| NFL advanced modules | `nfl-adv/{index,lab-filters,percentile,charting-refused,composite-qb,formation-usage,pressure-to-sack,epa-rush-gap,dfs-leverage,survivor-ev,first-down-quadrants}.ts` | BRANCH `origin/hermes/nfl-adv-metrics-2026-09-17`, ORPHAN there; barrel export only; 18 of 18 tests pass from the package directory, 3 fail from the repo root on a CSV path |

### 2.6 Data plane and the pre-2026-09-17 intake stack

This is the part most at risk of being rebuilt by someone who has not read it.

| Layer | Path | Status |
|---|---|---|
| Cron schedule | `apps/web/vercel.json`, 22 entries | WIRED; the manifest header at `apps/web/lib/ops/cron-schedule-manifest.ts:4` says 20 |
| Odds refresh and providers | `packages/ingestion-pipeline/src/refresh-odds.ts`, `board-fill.ts`; `packages/data-ingestion/src/{odds-provider-adapter,espn-odds-client,rundown-client}.ts` | WIRED; `espn_public` is one book |
| Line archive | `packages/ingestion-pipeline/src/line-archive.ts` | PARTIAL behind `LINE_ARCHIVE_ENABLED`; the `{in:}` filter bug was fixed 2026-09-13; `OddsLineSnapshot` **does** carry a `book` column (`schema.prisma:467`) |
| nflverse unified intake | `packages/data-ingestion/src/nflverse-source.ts` (20 dataset keys), `nflverse-cache.ts`, `nflverse-season.ts`, `nflverse-currency-probe.ts`, `nflverse-id-crosswalk.ts`, `nflverse-ngs.ts` | WIRED. Header states wiring a dataset into scoring is a founder-gated MODEL_VERSION step |
| Persisted nflverse ingesters | `apps/web/lib/ingestion/{player-stats,snap-counts,injuries,depth-charts,next-gen-stats,team-efficiency}.ts` | WIRED (crons 09:00, every 30 minutes, 07:15; satellites once daily in a 10:00 UTC window) |
| Orphan persisters | `apps/web/lib/ingestion/{pfr-adv-stats,team-week-stats,rush-tendencies}.ts` | ORPHAN: the functions exist, nothing calls them, so `PfrAdvStat` and `TeamWeekStat` are never written. PFR is additionally denied by the app rights registry |
| Unscheduled ingesters | `apps/web/lib/ingestion/{historical-games,backfill-player-data}.ts` | routes exist, no cron entry: `HistoricalGame` is manual-only |
| Ad-hoc nflverse loaders | `apps/web/lib/nflverse/*` (16 modules) | WIRED to premium routes; **none reaches an engine pick**; nothing persisted |
| Season resolution | `packages/data-ingestion/src/nflverse-season.ts:486-492, 533-540` | floors at the last completed season unless a database probe is supplied; only `refresh-player-stats` passes the probe, so read-only surfaces show the prior season all year |
| Feature store | `packages/feature-store/src/*` | ORPHAN but correct: point-in-time validated `FeatureRecord` with `sourceRights`, `pitCorrect`, `publicApiEligible`; in-memory only; no registered features; the sole reference is a `package.json` dependency line in `packages/stats-api` with zero source imports |
| Clearance | `apps/web/lib/scraping/{clearance-engine,source-rights-registry}.ts` (19 entries), `packages/data-ingestion/src/source-registry.ts` (41 sources) | WIRED, and the two registries disagree on open-meteo, clubelo and nws-weather |
| Weather | `apps/web/lib/weather/game-weather.ts` (NWS), `free-adapters/open-meteo.ts` | PARTIAL; no table, no `GameSignal` writer, reaches no pick |
| News | `apps/web/lib/news/{rss,wire,impact}.ts` | PARTIAL; the demo wire is fictional; dark unless `NEWS_RSS_FEEDS` is set |
| Reliability monitors | `apps/web/lib/data-reliability/*`, `apps/web/lib/health/*`, `apps/web/lib/ops/{scheduler-liveness,health-alert-decision}.ts` | WIRED, and **nothing monitors `odds_line_snapshots`**, which is how a three-week archive outage went unnoticed |

**Tables with a gap, verified:**

| Table | Gap |
|---|---|
| `GateDecision` (`schema.prisma:665-687`) | no writer anywhere; 5 readers on fallback paths; `isBootstrap` defaults **true**, so a writer that omits it produces rows the lane never shows |
| `Signal` (`:3156-3182`) | no writer and no reader. The "universal signal ledger" of the older strategy doc exists only as DDL |
| `GameSignal` (`:775-794`) | one writer, `packages/data-ingestion/src/context-enrichment.ts:328-374`, emitting exactly two keys (`schedule_density_7d_home/away`). No injury, weather, officials, ratings or milestone row has ever been written |
| `PfrAdvStat`, `TeamWeekStat` | writer modules exist, no caller, no reader |
| `NextGenStat` | written daily, read by one reconstruction module |
| `HistoricalGame` (`:2874-2897`) | writer is manual-only; stores **closing** lines only, no opening line |
| `CalibrationProposal`, `SourceCoverageReport` | no writer |

### 2.7 Coordination

| Item | Status |
|---|---|
| `docs/ops/AGENT_LEDGER.md` and `scripts/ops/check-agent-ledger.mjs` | **RED on main**, verified this session: exit 1, one violation, row M-1 carries owner `motif` which is not an allowed owner. Law 1 forbids the agent push that would fix it |
| Partial engine mocks | 22 files under `apps/web` call `vi.mock("@sports/prediction-engine")`, measured this session. The standing note says 19. The count drifts, so the guard must be an enumerating test, not a number in a document |
| `docs/research/move37/` | NOT on main; only on `origin/docs/move37-research-corpus`, so the standing AGENTS.md paths do not resolve |
| Founder research binaries | on BRANCH at commit `f04127861`, about 9.6 MB of .docx, .xlsx and JSON including a Firecrawl activity log that contains personal search history. No ledger row |

---

## 3. The architecture: seven layers with invariants

Cross-cutting rule, stated because all three candidate designs broke it: `packages/*`
never imports `apps/web`. The workspace dependency graph does not allow it. Anything the
mint path needs from the web app (the conviction lane, a loader) is injected as a
function by the cron route or `board-fill.ts`. Anything both sides share crosses through
`@sports/types`, the boundary that the 22 partial mocks already leave intact.

### L0. Labels and the as-of feature ledger

Purpose: one loader that yields a training row, meaning features stamped before
`commenceTime`, the market probability at the same as-of, the settled outcome, and CLV
where a close exists, with every exclusion counted by reason.

Existing: `apps/web/lib/calibration/{live-calibration-p,in-play-exclusion,publish-time-market-p}.ts`;
`edge-lab/asof-store.ts` (`assertNoLookahead`); `signal-snapshot.ts`;
`pick-proof-receipt.ts`; `clv-capture.ts` with the close stamped at
`packages/ingestion-pipeline/src/settle-sport.ts:867`; `HistoricalGame`.

Missing: a persisted per-pick feature vector at mint (PROPOSED table
`pick_feature_vectors`); signal-path snapshots; a scheduled `backfill-historical-games`;
the null-clock audit.

Invariants:
- Every feature carries `observedAt < commenceTime` or fails `assertNoLookahead`.
- The market probability is a feature and the comparator, never the fit target.
- In-play rows are excluded and counted. For training, an unreadable clock is also
  excluded, which is stricter than the eligibility sample and is stated as such.
- `founder-v1`, bootstrap and seed rows never enter.
- Exclusions are chosen by rule, never by outcome.
- **A row whose `factorBreakdown` was rewritten after settlement is excluded.** This is
  the correction the statistical verification forced, and it is not optional: the
  six-hourly calibration cron runs `backfillIndependentTrueProb`, which selects settled
  WIN or LOSS rows and rewrites `independentEdge.trueProb` by calling
  `buildIndependentFairValues` at backfill time
  (`packages/ingestion-pipeline/src/backfill-independent-trueprob.ts:96-101, 172-183,
  235-257`). Two of the independents it blends are not as-of: the MLB standings fetch has
  no date, and the NFL EPA read uses whole-season efficiency. A settled row therefore
  carries a probability computed with knowledge of the outcome. Any head or test that
  reads `independentEdge.trueProb` from such a row is fitting on the answer. The training
  loader excludes them under reason `backfilled_post_settlement` and counts them, and the
  rationale string those rows carry ("Retrospective ...") is the discriminator until a
  proper as-of column exists.
- Pushes are excluded from the binary head and reported separately.
- Every row carries `labelBasis`: spreads and totals settled before 2026-09-11 were
  graded against the consensus mean, after it against the posted book line nearest the
  mean with ties against us (`published-line.ts:11-23`). These are two label definitions
  with different push exposure and they are never pooled without the flag.
- A basis-tag change restarts every streak that reads it.

### L1. The market base

Purpose: the de-vigged consensus probability of the selection at as-of. The head's
identity fixed point.

Existing: `scoring.ts` de-vig, `pick-proof-receipt.ts:79` (`proportional_devig_v1`),
`live-calibration-p.ts`, `market-read.ts`.

Missing: a second cleared book on most fixtures; one canonical de-vig entry point, since
four conventions exist in the tree; a measured share of settled rows carrying a genuine
two-book price at both mint and close.

Invariants:
- The method stays `proportional_devig_v1`. The paired Shin comparison on 2026-09-13
  read t 1.80, which is not a reason to swap.
- A single-book price may publish free-tier rows only. Premium needs at least two books.
- **4 hours binds at mint and at serve** (`packages/data-ingestion/src/config.ts:131-132`).
  The 6-hour figure elsewhere is the research gate-slate loader's ceiling and is never a
  publish gate. Implementing 6 hours at mint would loosen a guard.
- The receipt's market probability is not interchangeable with the odds table's. It
  measured 0.169 above the odds table's de-vigged consensus at generation time on
  average, with 15 of 46 receipted rows more than 0.15 off, which is why the eligibility
  cron refuses receipt-only rows as unverifiable. Any test that needs a market
  probability uses the odds table at generation time, verifiable-only.

### L2. Independent estimators, the market-blind referees

Purpose: probabilities that did not read a sportsbook price. The first features of every
head and the only source of a raw edge.

Existing: `build-independent-fair-values.ts:480-668`; Elo; Poisson, Dixon-Coles and
Skellam; MLB standings; NFL opponent-adjusted EPA; the agreement labels in
`edge-engine.ts`; `nfl/margin-mixture-model.ts` (ORPHAN); the shadow posterior.

Missing: an Elo-margin cover probability for NFL, NBA and NCAA spreads, so those
strata have no independent at all and no edge veto can fire on them; a dropback and rush
split on `TeamGameEfficiency`; a liveness readout for the NFL EPA branch.

Invariants:
- Each independent is one logit feature with a missingness indicator.
- No independent is stretched. The 1.12 multiplier retires under the bump and not before.
- An estimator that read a book price (market-regressed Elo, market-anchored power
  ratings) is a benchmark, not a referee, and can never produce a confirming vote.
- Single-source agreement is a feature, not a veto, but it caps tier.

### L3. Calibration heads, the trainer

Purpose: per sport and market heads that replace the weighted confidence sum.

**Head form, corrected by the statistical verification.** The head is
`logit(p) = logit(q) + f(x)`, where `logit(q)` enters as an **offset with its
coefficient fixed at 1** and `f(x)` is ridge-penalized toward zero with its intercept
also penalized. The existing trainer (`edge-lab/logistic.ts:59-101`) standardizes every
feature on the training fold and penalizes every coefficient toward zero with an
unpenalized intercept, so its shrinkage limit is the base rate, not the market. A head
built naively on it would not reproduce the market as its null, which is the entire
safety property. The identity test becomes: as the penalty grows without bound, the head
reproduces the market probability exactly.

Shrinkage is hierarchical: global, then sport, then sport by market
(`metrics/core/shrinkage.ts` is reusable).

Existing: `edge-lab/{logistic,walk-forward,logit-pool,calibration-blend}.ts`,
`probability-calibration.ts`, `apps/web/lib/calibration/{ece-debiased,metric-slices}.ts`,
`calibration/{cvap,ivap,pav}.ts`, `conformal/sports-taxonomy.ts`,
`edge-lab/selective-gate.ts`.

Missing: `packages/prediction-engine/src/heads/{spec,fit,shrink,serve,artifact}.ts`
(PROPOSED); a head registry (PROPOSED table `model_heads`; interim, a versioned JSON
artifact in the durable snapshot store the eligibility gate already uses); the identity
and oracle tests.

Invariants:
- A head exists only where at least 100 decided rows with a market price sit in the
  stratum. Below that it shrinks to its parent. Below 100 for a market globally there is
  no head and no pick.
- **Certification reads the debiased point estimate and the ninety-fifth percentile
  bootstrap bound against the 0.05 floor.** The fifth-percentile lower bound in
  `metric-slices.ts` exists so a deployed slice is not failed for small sample, a
  benefit-of-the-doubt rule for non-demotion. Certifying a probability shown to a paying
  customer is an acceptance, not a non-demotion, and must read the conservative end. The
  binding skill criterion is the paired out-of-fold log-loss lower bound over the
  market-only baseline being positive. Brier 0.22 is a sanity floor, not a skill test: a
  constant base-rate forecast clears it.
- Every bound is clustered by fixture, never by row. A game contributes up to three
  markets whose outcomes move together, so a bound computed on n rows overstates the
  evidence.
- Selection and certification are nested. Feature selection and penalty tuning run on
  inner folds; certification metrics come from the outer out-of-fold rows, computed once
  per proposal; the final numbers for the version proposal come from the sealed forward
  holdout, which `edge-lab/walk-forward.ts:143-210` already implements and which throws
  without the founder's token. Reporting selection and evaluation from one sample is how
  a search gets reported as a result.
- Fitting never reads CLV, closing lines, or anything observed after `commenceTime`.
- Head coefficients are the only place a signal can add probability.
- The fit runs inside the six-hourly calibration cron under a stated time budget, or from
  an owner-only admin route. Never from an agent shell.

### L4. Feature admission, the only door

Purpose: the single route a research signal can take to reach a served probability.

Existing: `edge-lab/trials-registry.ts` (hash chain, Benjamini-Hochberg),
`edge-lab/placebo.ts`, `edge-lab/logit-pool.ts`, `scripts/edge-lab/feature-admission.ts`.

Invariants:
- **Pre-registration is a committed file, not a runtime timestamp.** The registry's
  `recordedAt` is caller-supplied and the only existing runner stamps it at execution
  time, so "the chain timestamp precedes the result" is satisfied by construction by
  every run including one that peeked. Pre-registration is a JSON file per candidate
  (hypothesis, exact feature definition and code hash, stratum list, kill line with its
  confidence level and n floor, family id, false-discovery level, placebo spec) whose
  git commit must be an ancestor of HEAD before the harness will run that candidate.
- Two admission reports per candidate, not one. The existing harness conditions on the
  **closing** price (`edge-lab/placebo.ts:53-56, 390-414`). That is a different and
  stronger null than conditioning on the price at decision time. A feature the market
  absorbs by kickoff passes the as-of test and fails the close test. The as-of report
  governs whether it may enter the probability; the close report governs whether it may
  be claimed as closing-line value. A feature admitted on the first only is labelled
  display-edge-only and cannot raise tier.
- The family for multiple-comparison control is the whole batch, every candidate by
  every stratum, with the level stated in the pre-registration. Roughly 15 candidates
  across roughly 12 strata is about 180 tests, and a caller-chosen family key would
  defeat the correction by splitting it.
- A feature is dropped on the **first** refit whose interval crosses zero.
  Re-admission requires a new pre-registration naming the prior kill.
- A signal that passes is admitted and enters the next refit. It touches no served
  number until the bump.

### L5. The decision layer

Purpose: derive every customer-facing quantity from the head probability, its interval
and the market, and write every decision down.

Invariants:
- Nothing after L3 may raise a probability, a tier or a rank.
- Never publish a row whose independent-edge decision is a pass or whose expected closing
  value is negative. Import both predicates from `@sports/types`, never restate them.
- Never rank on confidence, including as a last-resort fallback.
- The head probability is displayed only for certified heads. The market probability is
  public arithmetic and is displayed to every tier.
- A row with no market price is a read, not a pick.
- Tier moves only downward once published.
- Every publish and every withhold writes one gate-decision row with a reason code,
  evidence references and `isBootstrap: false`, because the column defaults to true and
  the readers filter on it.

### L6. Measurement and promotion

Invariants:
- Floors stay byte-identical. The eligibility gate reads `market_anchored_v4` until the
  bump; after it, the head basis, with the streak restarting by design.
- Promotion outputs eligibility only. The bump and the IMPLEMENTED flip are the
  founder's.
- Three consecutive green runs is necessary, not sufficient.
- A gate is promoted with a board-share cap **at promotion time only**: a gate that would
  withhold more than the pre-registered share of the board fails promotion. It is never a
  runtime limit, because a runtime cap would publish a contradicted row once the cap was
  reached, which the gate contract forbids.

### L7. Observability, rights and provenance

Invariants:
- A silent catch that returns a row count is not monitoring. That pattern is exactly how
  the line archive died for three weeks with no alarm.
- Every table the head reads gets a freshness reading on the truth surface.
- A source must resolve in both registries with compatible verdicts before a signal
  reading it can be live, and the more restrictive verdict wins. Share-alike rows are
  model-ineligible by construction.
- A signal whose source breaches its freshness service level goes silent, meaning it
  returns null and gets no vote. It never degrades to neutral, because neutral is a vote.
- Every step in the build order is a ledger row with an allowed owner before work starts.

---

## 4. Signal taxonomy, evidence tiers, promotion path, kill rule

### Roles

- **feature**: enters the head probability through a coefficient. The only route that
  can raise a probability. Requires admission and a refit under a founder bump.
- **gate-veto**: a withhold-only vote after the head. Any contradicting vote holds the
  pick; a null is never a vote; a signal that throws is silent
  (`apps/web/lib/conviction/gate-contract.ts:169-241`). It may never raise anything.
- **display**: shown on a surface with its source and its n. Affects no decision.
- **content-only**: edge sheets, posts, fantasy tools. Never on a pick.

Two substrates are not signals and carry no role: **labels** (settled outcome, with
closing-line value as auxiliary) and **width inputs** (book count, dispersion, interval
width, which define the stratum and the tier and never the point estimate).

### Evidence tiers

- **T0, live and validated**: read by a served number today and measured calibrated on
  settled rows. Today exactly one, the market probability, and even that number needs
  re-measuring on the current builder before it is cited again (section 8, step 1).
- **T1, computable from a live feed**: computable as-of from data the platform persists
  or fetches on a schedule today, so the admission test can run now, or would run once a
  capture-first log reaches the n floor (marked T1-capture).
- **T2, lab-only**: computed once in `docs/research/2026-09-17/gse-lab` or the props
  workstream from nflverse play-by-play with documented filters. Not on any live feed.
  Testable only after a scheduled in-repo job reproduces it against pinned values.
- **T3, research-only**: named in the dossiers or the founder's audit documents with no
  computation in the repo. Enters as a hypothesis with an unblocking condition.
- **REJECTED**: killed by measurement or by a structural rule. Not re-promotable without
  a new pre-registration that names the prior kill.
- **DEFERRED**: real but sequenced behind a dependency, a founder decision or a rights
  ruling, and carries its unblocking condition.

### Promotion path

1. T3 to T2: someone computes it with a pinned test against a stated convention on
   nflverse CC-BY 4.0 data.
2. T2 to T1: a scheduled in-repo job writes it as-of to a persisted table with a
   freshness service level, and the stratum reaches at least 100 labelled rows with the
   feature non-null.
3. T1 to ADMITTED: pre-registered hypothesis, feature definition, shared test set and
   kill line; purged fixture-grouped walk-forward; shuffled-time placebo null; logit-pool
   coefficient significant over the market plus the current head; out-of-fold log-loss
   lower bound above zero; false-discovery control across the batch; hash-chained record.
   An admitted feature changes no served number.
4. ADMITTED to T0: only inside a head refit that clears certification and the promotion
   legs, under a founder version bump.
5. A gate follows a parallel path: log-only, meaning its reads are recorded on the
   gate-decision row with zero effect, then gate, meaning it may withhold, and only after
   its withheld set grades worse than its kept set on same-book closing value and
   realized outcome over at least 100 fixture-clustered decisions with a lower bound
   above zero, false-discovery controlled across gates in the batch, and a promotion-time
   board-share cap.

### Kill rule

A T0 feature whose coefficient interval crosses zero on a refit, or whose ablation does
not worsen out-of-fold log-loss, returns to T1 with its numbers recorded. A gate whose
withheld set is not worse than its kept set over at least 100 decisions is demoted to
display. A signal whose source breaches its freshness service level or loses rights
parity goes silent immediately. Every registry row's kill criterion is written before its
first test and stored with the trial.

### Where the founder's audit documents and this repository disagree

Read from the four .docx research audits on the founder's branch. The CQR document is
excluded because the audit document that cites it marks it unread.

| Topic | Audit document | Repo | Decision and reason |
|---|---|---|---|
| Small-sample conformal | refuse when the required rank exceeds n; at n 5 and alpha 0.1 the clamp yields 83.33 percent coverage while claiming 90 | `apps/web/lib/calibration/cqr.ts:12-15` clamps the rank into range | **Audit wins on the math.** Fix it to refuse. The basis is the finite-sample argument, not the test's comment, which concerns a different clip |
| Venn-Abers width refusal | refuse above 0.20 | 0.12 diagnostic width in `certificate/selective-abstention.ts:50` | **Neither is adopted.** Neither number is data-derived. The width threshold comes out of the disjoint-fold procedure and is recorded with its fold |
| Public win-rate display floor | withhold until n 30 | 25 decided picks | **Repo stands.** Neither is derived from our data and the interval already accompanies the rate. Raising it is a tightening the founder may order |
| Market lines as features | decouple the model from market lines; closing lines leak | the eligibility basis is market-anchored and the head uses the market as its fixed point | **Both, by separating two models.** The independents are market-blind and closing value grades them. The head is the calibrated display probability and reads the market at as-of as its offset. The close is a label, never a training feature for either |
| Gate strength | bootstrap the gate and clear the ninety-fifth percentile; three green windows can flatter | point floors on the pool, a fifth-percentile bound on the deployed slice, streak 3 | **Audit wins on head certification** (section 3, L3) and the repo stands on the existing eligibility gate. Extending the conservative bound to the pool is a tightening that restarts the streak: a founder decision, not taken here |
| Training loss and model family | Brier-loss base training, rank clustering, per-sport state-space | none in repo | **Deferred** until re-baselined. The cited numbers come from an August snapshot that no longer describes production |
| Repo description | ensemble Kalman filters, cross-domain solvers and agent swarms "at the heart of the predictive layer" | a bootstrap particle filter that runs in shadow and is read by nothing | **Repo wins.** This section is keyword inflation and is rejected, as is its framing |

---

## 5. Signal registry

Columns: Signal, Family, Role, Tier, Source and license, Code path or NONE, Evidence,
Kill criterion, Owner. Agent sessions claim ledger rows as `claude`.

Evidence cells marked RE-MEASURE carry a number that was computed on a population the
repo has since ruled unsafe (no in-play exclusion, receipt-sourced market prices, or
rows rewritten after settlement). They are cited with that caveat and re-measured in
step 1 before any of them is used as a baseline.

| Signal | Family | Role | Tier | Source, license | Code path | Evidence | Kill criterion | Owner |
|---|---|---|---|---|---|---|---|---|
| Market de-vigged probability | market | feature (offset) and display | T0 | odds table at as-of; Odds API licensed; `espn_public` use-with-caution | `scoring.ts` de-vig; `pick-proof-receipt.ts:79`; `market-implied-display.ts` | monotone, every band within 0.07, n 622 (RE-MEASURE) | Never the base of anything else. A method swap needs a paired comparison on the same rows | prediction-engine |
| Shin de-vig | market | display diagnostic | T1 | same | `honesty/devig-method-compare.ts` | paired difference 0.0022, t 1.80 | Decided: no swap. Reopen only with a lower bound above zero on at least 1,000 rows | prediction-engine |
| Closing line | market | label, not a signal | T1 | `odds_line_snapshots` phase CLOSE; `settle-sport.ts:867` | `line-archive.ts`; `clv-capture.ts` (reads a batch with no book id) | archive held only four days when last measured | n/a. The fix is per-book closes from the archive | data-ingestion |
| Same-book closing value | market | label, auxiliary, promotion leg | T1 | as above | `clv.ts`, `clv-capture.ts`, `free-path-clv.ts` | 23.0 percent against a 0.524 requirement, on a basis that mixes book sets | Report the correlation with realized Brier on our own rows first. If absent, the leg is reported, not binding. Never the head's fit target | prediction-engine |
| Historical archive, 1999+ | market | label substrate | T1 | nflverse schedules CC-BY 4.0 | `apps/web/lib/ingestion/historical-games.ts`; `market-backtest.ts` | stores closing lines only, no opening line; writer unscheduled | NFL heads train only on covered seasons and the report states the close-versus-lock shift | data-ingestion |
| Bookmaker count and depth | market | width, never probability | T0 | odds table | `scoring.ts:287-288` | 20 points constant on any deep board | Retired as a confidence term at the bump; kept as a threshold and a stratum | prediction-engine |
| Book dispersion | market | width | T1 | odds table | `scoring.ts:369-388` | none | Does not predict squared residual within strata: then it leaves the interval too | prediction-engine |
| Side-agreement share | market | feature | T1 | odds table | `scoring.ts:434-441` (line-agreement today) | MLB run-line consensus pinned at 1.0000 by construction | Coefficient test. The line-agreement version retires regardless, and the card copy stops claiming consensus on it now | prediction-engine |
| Line movement since open | market | feature | T1 | `OpeningLine` plus game columns | `game-context.ts:96-102` | none measured | Coefficient test against the market at as-of, which already encodes the current line | prediction-engine |
| Market movement and adverse steam | market | gate-veto | T1 | `odds_line_snapshots` | `conviction/signals/market-movement.ts`; `hawkes-steam.ts` shadow | no rows to evaluate; no staleness monitor | Withheld-versus-published test after the monitor and four weeks of same-book data | data-ingestion |
| Cross-market consistency | market | feature | T1 | odds table | `game-context.ts` cross-market term | none | Coefficient test | prediction-engine |
| Second cleared book, multi-book consensus | market | feature quality | DEFERRED | TheRundown rationed; Kalshi via PredExon needs env and key | `market-read.ts`; `galaxy-kalshi-book.ts` | corpus found no public sharp-book numbers | Paired Brier of multi-book against single-book not better: keep single | data-ingestion, founder |
| Exchange prices (Kalshi, Polymarket) | market | feature | DEFERRED (rights) / REJECTED (compliance hold) | see registries | `polymarket-independent-client.ts` | direct Kalshi path can never fire under current rights | Rights first, then a coefficient test | founder |
| Public money splits | market | feature | DEFERRED | no cleared source | `founder-picks/factors.ts` consensus input | never fabricate a consensus number | Cleared source first. The both-directions boost defect is fixed before any wiring | founder |
| Elo from results | independent | feature | T1, served and unvalidated | `TeamGameLog` | `elo-from-results.ts` | signal path buckets 60-69 at 57.0 percent n 423, 70-79 at 66.0 percent n 247 (RE-MEASURE); six NFL home teams inside 0.6036 to 0.6399, which is home advantage with a rounding wobble | Per-stratum coefficient test. Single-source Elo never sells at premium | prediction-engine |
| Poisson, Dixon-Coles, Skellam cover | independent | feature | T1, served | `TeamGameLog`, last 20, minimum 5 | `poisson.ts`, `dixon-coles.ts`, `skellam.ts` | implemented 2026-08-22; no out-of-fold lift number exists | Coefficient test per stratum; the correlation parameter refit under walk-forward or dropped | prediction-engine |
| MLB standings strength | independent | feature | T1 | MLB Stats API (registry parity needed) | `standings-strength.ts` | none | Coefficient test over market plus Elo. **The current loader is not as-of and must be dated before it can be a feature** | prediction-engine |
| NFL opponent-adjusted EPA v1 | independent | feature | T1, liveness unverified | `TeamGameEfficiency`, nflverse CC-BY 4.0 | `opponent-adjusted.ts`, `nfl-epa-fair-value.ts` | every NFL signal pick on 2026-09-13 was single-source Elo, consistent with an empty table | Probe first. If empty it is T1-capture until the cron proves it writes. **The whole-season read must become season-to-date as-of** | data-ingestion |
| NFL EPA v2: dropback and rush split, non-scripted, turnover-occurrence regression, early-season shrinkage | independent | feature | T2 | nflverse play-by-play CC-BY 4.0; charting columns excluded | `gse-lab/compute_team_metrics.py`; NONE for the split | passing efficiency correlates with wins at 0.53 to 0.61 against 0.13 to 0.19 for rushing (dossier, not peer-reviewed) | Shadow independent; paired Brier against v1 with a lower bound above zero. The rushing coefficient is expected near zero and is dropped if its interval crosses. Never labelled with a vendor's metric name | prediction-engine |
| Elo-margin cover for NFL, NBA, NCAA spreads | independent | feature | T1 | settled margins plus Elo | `nfl/margin-mixture-model.ts` ORPHAN | those spread strata rank on confidence today and no edge veto can fire | Coefficient test on the spread head. No lift means those strata stay market-only and publish nothing | prediction-engine |
| Totals independent | independent | feature | DEFERRED, none exists | `TeamGameLog`, play-by-play, weather | `poisson.ts` over-under only | MLB totals n 535 at .456; NFL totals n 14 at .357 | Totals publish at free tier and trail now, and nothing after the bump until a totals feature earns lift | prediction-engine |
| ESPN Power Index | independent | feature | DEFERRED (rights) | licence flag default closed | `espn-powerindex.ts` | market-anchored prior, so partly the market | If licensed: display, or a feature only if its divergence from the market is material and the coefficient test passes | founder |
| ClubElo | independent | feature | DEFERRED (registries disagree) | package says use-with-caution, app says permission required | `build-independent-fair-values.ts:258` | none | Parity resolution, then a coefficient test | founder |
| Market-regressed Elo (public nfelo style) | independent | display benchmark | REJECTED as referee | open source | NONE | regressed toward market spreads by construction | n/a | prediction-engine |
| Shadow team-strength posterior, steam, information bits | independent | feature candidate | T1, persisted per game | `ShadowSignal` | `pipeline/live-orchestrator.ts` | never read by anything | Coefficient test on persisted rows. No lift after 100 rows per stratum: retire the shadow pass, because a pass nobody reads hides its own failures | prediction-engine |
| Own expected points, win probability, completion, rush yards, YAC | independent component | feature substrate | T1 | nflverse CC-BY 4.0 | `expected-metrics/*` | validated against tracking aggregates; wired to one route | Enters only as a term of EPA v2 or the quarterback feature, and dies with them | prediction-engine |
| Legacy composite confidence | legacy | display score only | REJECTED as feature | `picks.confidence` | `scoring.ts` three sums | at 80 and above, n 235, claims .8663 and realizes .5191, z -10.7; peaks at 75-79 (.6146) and falls to .4643 at 90-94 | Retired from tier, rank and display at the bump regardless of any test | founder (bump) |
| Ranking blend (0.7 independent plus 0.3 confidence) | legacy | selective-delta input | T1 until the bump | `ranking-prob.ts` | monotone overall, yet it ordered the smallest positive edge first on the 2026-09-13 slate | Replaced by the head probability. Its pinning tests are rewritten to the new rule, never weakened | prediction-engine |
| Isotonic calibrator on confidence | legacy | display | REJECTED | settled picks | `calibration-apply.ts` | pooled-adjacent-violators is monotone; the score is inverted at the top | Never flipped on. Retired with the badge | founder (flag stays off) |
| Logistic head on the confidence vector (v5.3.0 prototype) | legacy | ranking candidate | DEFERRED | `factorBreakdown` | NONE in repo | test log-loss 0.6678 against 0.7608 for identity, never compared against the market on the same rows | Superseded by the market-based head. Built only if its paired Brier against the market is not worse | prediction-engine |
| Cross-Venn-Abers interval and selective fire | method | width and gate | T1 | head out-of-fold rows | `edge-lab/selective-gate.ts`, `calibration/cvap.ts` | both candidate width thresholds are un-derived | **Corrected criterion:** the multiprobability is not a prediction interval, so "coverage below nominal" is not falsifiable. The tests are: each served endpoint is not worse-calibrated than the point estimate on out-of-fold rows by the debiased upper bound; a width sanity check against isotonic; and an exchangeability check by time-split, since the validity argument assumes exchangeability and a drifting pick stream violates it | prediction-engine |
| Conformalized quantile regression | method | width | DEFERRED behind the defect | head residuals | `apps/web/lib/calibration/cqr.ts:12-15` | at n 5 and alpha 0.1 the clamp claims 90 and delivers 83.33 | Fix to refuse. Never for a binary side | prediction-engine |
| Kelly and stake sizing | method | none public | REJECTED from public surfaces | n/a | `kelly.ts`, `robust-kelly.ts` | n/a | n/a | founder |
| Move-37 families | method | research | REJECTED (W1 to W4, IRL) / open (T3, T7, T9) | corpus on an unmerged branch | NONE on main | the overnight battery returned no survivor; the inverse-reinforcement family measured 73.70 percent against a 79.07 percent positional baseline | A family enters only as a lab observation with a won pre-registered duel | founder |
| Rest, back-to-back, seven-day density | schedule | feature | NFL REJECTED; NBA and MLB T1 | game columns | `game-context.ts:129-176`; `apps/web/lib/nba/rest.ts` ORPHAN | the bye-week edge vanished after the 2011 agreement; schedule-derived reference features returned FIRE_NOTHING in this repo's own harness | One spine, the games table. Re-test only with a new pre-registration naming that kill | prediction-engine |
| Travel, time zones, altitude | schedule | gate at most | REJECTED as feature | static table | `conviction/signals/rest-travel.ts` | no verified coefficient; cannot discriminate in week 1 because every prior game is preseason | Withheld set not worse over 100 decisions: demote to display | prediction-engine |
| Against-the-spread form, head to head, venue | schedule | feature | T1, env-gated | `TeamGameLog` | `game-context.ts:195-224` | flag state unknown | Coefficient test with a leakage check that no form row includes the scored game | prediction-engine |
| Injuries: official status, quarterback-out indicator | availability | feature (QB out) and gate | T1-capture | nflverse injuries CC-BY 4.0 | `apps/web/lib/ingestion/injuries.ts`; only reader is the fantasy composite | persisted daily since C-244; no engine consumer; the snapshot flag is structurally false | Gate: log-only four weeks, then the withheld-versus-published test. Feature: coefficient test after 100 as-of rows. **A report from the wrong season is not a signal** | data-ingestion |
| Weather at kickoff | weather | feature (totals) and gate | T1-capture | NWS public domain; the hosted alternative's tier is disputed between registries | `apps/web/lib/weather/game-weather.ts`; no signal writer | the market prices weather by kickoff; the cold-and-wind interaction hypothesis was killed with the sign reversed | After 100 as-of rows, a totals coefficient test. Never a flat wind-to-points term | data-ingestion |
| Barometric pressure, humidity | weather | feature | DEFERRED | NWS | NONE | one analyst's early-career signature only | Opens only after wind survives its own test | prediction-engine |
| Beat and coach reports | news | gate only | T1-capture | RSS, dark unless configured; the demo wire is fictional | `apps/web/lib/news/impact.ts`; `conviction/signals/beat-report.ts` | hand-set magnitudes; the classifier fires on generic verbs | Never a feature until as-of items persist and pass admission. The demo wire may never reach a gate | data-ingestion |
| Narrative and incentive | narrative | log only | DEFERRED; revenge REJECTED | tracker file, five entries, zero weight | `conviction/signals/narrative-incentive.ts`, inert | the revenge-game effect ran opposite to the hypothesis, interval excluding zero; game-level compounding was not detectable | Cannot open without a sourced as-of feed and 100 rows. The module never infers a narrative | founder |
| Scheme, coverage, box counts | trenches | gate or feature | DEFERRED (rights and data) | charting, share-alike | `conviction/signals/scheme-matchup.ts`, inert | the gap-label validity caveat applies to the whole genre | Rights and data first | founder |
| Officials and referee tendencies | situational | feature at best | T1-capture | nflverse officials, no table | mapper exists with no caller | none | Capture first; opens after opponent adjustment and weather | data-ingestion |
| Book agreement | gate | gate | T1 | odds table | `conviction/signals/book-agreement.ts` | thresholds hand-set; the scorer already requires a consensus floor, so a contradiction rarely fires | If it never changes a verdict over 100 rows it is marked redundant | prediction-engine |
| Prop alignment | gate | gate | DEFERRED | prop rows in the archive | `conviction/signals/prop-alignment.ts` | the wired fantasy props surface carries a fictional pool | Withheld-versus-published test after the prop archive holds 100 games, restricted to the archive | data-ingestion |
| Team EPA per play, dropback and rush | efficiency | display and feature substrate | T2 | nflverse CC-BY 4.0 | `gse-lab/team_metrics_*.csv` | computed this lab cycle with documented filters | Pinned reproduction test in the scheduled job. Rushing is never a strength driver | data-ingestion |
| Success rate | efficiency | display and feature | T2 | nflverse | lab CSVs use one convention, `expected-metrics/success-rate.ts` uses another | stabilizes faster than EPA, correlates lower | The convention id is stored per row and mixing conventions is rejected at write | data-ingestion |
| CPOE and average depth of target | quarterback | feature | T2 | nflverse | `gse-lab/qb_aggressiveness_*.csv` | the upstream completion-probability feature list is unverified | Coefficient test over market plus team EPA, with the throwaway handling documented | prediction-engine |
| Composite quarterback score | quarterback | content-only | T2 (BRANCH) | nflverse | `nfl-adv/composite-qb.ts` | an equal-weight composite invented here, no backtest | Never sold as a ranking and never claimed to reproduce anyone's published metric | frontend-app |
| Opponent adjustment and strength of schedule | efficiency | feature | T1 overall, T2 split | `TeamGameEfficiency`; market win totals for the forward version | `opponent-adjusted.ts` | the single highest-value structural upgrade in the corpus | Label it opponent-adjusted, never with a vendor's name. The split promotes only through a refit | prediction-engine |
| Early-season shrinkage toward a prior, defense shrunk harder | head design | hyperparameter | T3 | own ratings plus market | NONE; `metrics/core/shrinkage.ts` is reusable | one vendor blends 83 percent prior on offense and 98 percent on defense in week 1 | Fitted shrinkage near zero, or worse out-of-fold log-loss in weeks 1 to 6 | prediction-engine |
| Vendor metrics: grades, charted win rates, total points, coverage grades, catchable air yards, time to pressure, read progression | proprietary | benchmark only | REJECTED (rights) | vendor terms | `nfl-adv/charting-refused.ts` (BRANCH) | we read and learn from public posts and never republish a vendor's output | Not before the free stack has out-of-fold results. A subscription is the founder's call afterward | founder |
| Pressure proxy and four-man rush rate | trenches | feature, labelled proxy | T2; the rush-count column is share-alike and model-ineligible | nflverse plus charting | `gse-lab/rush_pressure_*.csv`; `nfl-adv/pressure-to-sack.ts` (BRANCH) | the proxy has no hurry column and runs two to three points high against a public chart | Always labelled a proxy. Never extrapolate sacks from it | data-ingestion |
| Pressure-to-sack conversion, individual sack props | trenches | none | REJECTED as feature | charting | NONE | conversion luck explains under half a percent of variance | Applies as a veto on sack props, never as a signal | n/a |
| Explosive-play rate and differential | situational | feature | T2 | nflverse | lab CSVs | qualitative only | Coefficient test with the threshold convention pinned | prediction-engine |
| EPA distributions and chunk share | situational | display and content | T2 | nflverse | `gse-lab/epa_distributions_*.csv` | none | Display only until a tail-shape feature is pre-registered | data-ingestion |
| Expected turnover differential | turnover | feature | T2 | nflverse | `gse-lab/turnover_luck_*.csv` | recovery is near-pure noise year to year; occurrence is weakly repeatable; one 2025 team forced 19 fumbles and recovered 26.3 percent against a league 46.3 | Coefficient test. Raw turnover margin and recovered fumbles never enter | prediction-engine |
| Interception-worthy throw rate | turnover | display and research | T2, model-ineligible (share-alike) | charting via nflverse | lab CSV | 52.3 percent of flagged throws became interceptions in the measured sample | Founder rules on share-alike. A season with no data is silent, never zero | founder |
| Stuff rate, computed tackles for loss, havoc components | trenches | display | T2 | nflverse | lab CSVs | there is no standard havoc definition | Havoc as a named metric is rejected until a definition is pinned | data-ingestion |
| Drive-outcome rates | situational | feature (totals) | T2 | nflverse, unfiltered | `gse-lab/drive_stats_*.csv` | league 2.10 points per drive, 24.0 percent touchdown, 20.4 percent three-and-out | Totals coefficient test | prediction-engine |
| Situation-neutral pace | situational | feature (totals) | T3, not computed | nflverse | NONE | rated high for totals, no number | Totals coefficient test with the filter pre-registered | prediction-engine |
| Early-down success, late-and-close EPA, air versus yards-after-catch split | situational | feature, content, feature | T2 | nflverse | `gse-lab/down_splits_*.csv` | early-down efficiency predicts; raw third-down conversion is near-meaningless; late-and-close carries 50 to 80 plays a season | Raw third-down conversion is rejected. Late-and-close is content only and always carries its n | prediction-engine |
| Weekly form and unit matchups | situational | feature (expected null) and display | T2 | nflverse | `gse-lab/weekly_trends_2025.csv` | recency is systematically over-weighted | Coefficient test against season-to-date opponent-adjusted EPA | prediction-engine |
| League percentiles | display | display | T2, BLOCKED | lab CSVs | `compute_advanced_metrics.py:41-50` | **double inversion confirmed this session**: for a lower-is-better metric the rank is computed descending and then inverted again, so the worst team reads 100 | Regenerate from a fixed script. Re-verify every percentile claim made from these files | testing-qa |
| Special-teams EPA | special teams | feature | T2, low priority | nflverse | `gse-lab/special_teams_*.csv` | about a 2 percent error improvement in one published study | Coefficient test after opponent adjustment. The return figures are bundled play EPA, not isolated return skill, and must be labelled so | prediction-engine |
| Kicker distance buckets | special teams | content-only | T2 | nflverse | `gse-lab/kicker_metrics_*.csv` | league 85.6 percent field goals, 95.9 percent extra points | The engine has no prop market. Never a pick input | data-ingestion |
| Script-adjusted volume, garbage-time ratio | situational | content-only (props) | T2 | nflverse | props workstream | measured 8 to 12 point swings | Props lane only, after a backtest against closing prop lines | data-ingestion |
| Coaching aggressiveness prior | situational | feature | DEFERRED | nflverse plus own win probability | `expected-metrics/win-probability.ts` | the cited points-per-game figure has no primary source | Coefficient test when opened | prediction-engine |
| Red-zone trip rate | situational | feature | DEFERRED | nflverse | NONE | conversion is near-noise, trip rate is the sticky part | Coefficient test when computed | prediction-engine |
| Formation usage, EPA by run gap | situational | content-only | T2 (BRANCH) | nflverse | `nfl-adv/{formation-usage,epa-rush-gap}.ts` | gap labels do not identify the responsible blocker and mislabel outside-zone runs | The gap chart never ships without that caveat; attribution corrected before merge | prediction-engine |
| First-down quadrants, ownership leverage, survivor expected value | player and content | content-only | T2 (BRANCH) / DEFERRED | branch modules | `nfl-adv/*` | documentation and code disagree on one statistic | Survivor value consumes the head probability or the market, never confidence | frontend-app |
| Tracking summary columns | player | display | T1, written and unread | `NextGenStat` | `apps/web/lib/ingestion/next-gen-stats.ts` | rushing efficiency weakly predicts wins | Freshness service level or silent. Player lane only | data-ingestion |
| Fantasy points over expectation, similarity projections, air-yards decomposition | player | content-only | DEFERRED | nflverse reproducible; share-alike derivatives barred | NONE | the props workstream produced 12 leans, all inside their bands, nothing actionable | Built on nflverse only. Fantasy lane. Never a pick input | frontend-app |
| Props hierarchical-Bayes stack | props | props lane | DEFERRED, wire or quarantine | prop rows | about 30 files with no live consumer | no closing-line backtest exists | Founder decides. A backtest against closing prop lines precedes any claim of an edge | founder |
| Baseball underlying (batted-ball quality, sprint speed) | independent (MLB) | feature | T1-capture | Savant, use-with-caution, absent from the app registry | `apps/web/lib/statcast/index.ts` ORPHAN | none | Registry entry first, then a coefficient test after 100 as-of rows with a starting-pitcher join | data-ingestion |
| Basketball rest and minutes loader | schedule | feature | T1-capture | ESPN public | `apps/web/lib/nba/rest.ts` ORPHAN | none | Folds into the games-table rest spine or is deleted | data-ingestion |
| Founder factor engine | founder lane | display | T2 candidate, ORPHAN | store rows | `apps/web/lib/founder-picks/factors.ts` | weights unbacktested; the consensus factor boosts in both directions | Never attaches model confidence to a founder pick. The both-directions defect is fixed before any wiring | frontend-app |
| Founder picks | separate track | separate track | out of registry | owner input | `apps/web/lib/founder-picks/create.ts` | decided-only record | Never in head training and never in eligibility | founder |
| Unreachable proprietary indices and wrappers | legacy | none | REJECTED, quarantine | n/a | `metrics/**`, `gse-score/**`, `nfl/*` wrappers, `no-bet-adversary.ts` | customer-facing vocabularies with no reachable computation | Removed from the barrel or moved under research, re-registered only with a source and a test | testing-qa |
| Social sentiment and analyst reads | social | content-only | REJECTED for the engine | public posts | NONE | proprietary charts are not republishable | n/a | founder |

---

## 6. Labels, splits and training

### 6.1 Labels

Primary outcome in {0, 1} from the settled result on decided rows. Pushes (13 of 2,654
in the September baseline) are excluded from the binary head and reported separately; a
three-class head waits until pushes alone reach the n floor. Auxiliary: the same-book
beat-close indicator and the signed closing value, in probability points for moneylines
and in line points for spreads and totals, never pooled. Closing value is the threshold
tuning target and a promotion leg, never the head's fit target, and only after its
correlation with realized Brier on our own rows is reported.

Every training row carries `labelBasis`, because the settlement line for spreads and
totals changed on 2026-09-11 and the two definitions carry different push exposure.

### 6.2 Exclusions, counted by reason, never chosen by outcome

In-play generation; unreadable clock; `founder-v1`; bootstrap; seed; three-way markets;
no market price at as-of; unconfirmed fixture; void; the archive gap window, which
carries no closing value; the known corrupted cohorts; and
`backfilled_post_settlement`, the exclusion the statistical verification forced
(section 3, L0).

### 6.3 Features

The market logit as a fixed offset; the logit of each independent with a missingness
indicator; log book count; dispersion; admitted features.

Provenance basis `train_v1_lastrefresh`: `factorBreakdown` is rewritten on every pending
refresh, so it is the last pre-kickoff state, which is legitimate for a head served at
the same cadence but is not mint-time. The basis becomes `train_v2_asof` when a persisted
per-pick feature vector exists, and every streak that reads it restarts.

Model version enters as a stratum or an indicator. The independents' semantics changed
across versions as sources were added and the signal-path multiplier moved, so one
coefficient fitted across those regimes is fitting different quantities. Heads fit on
current-version rows first, and the report states whether adding earlier versions moves
any coefficient beyond its interval.

### 6.4 Two biases the training set carries, named so nobody hides them

**Selection.** Every live settled row is a pick the old gate chose to publish, at a
confidence floor, a consensus floor and a fair-probability floor. Heads fitted on that
population describe the old gate's output, not the population of games. Mitigations: the
historical archive covers all NFL games; gate-decision shadow records start capturing
withheld fixtures with their entry price so the withheld set becomes gradeable; and the
certification report states the selected-sample caveat on every stratum until shadow
coverage reaches the n floor.

**Serving shift.** The archive's market price is a closing line; the served price is a
read hours earlier. A head certified on closes is not certified on locks. The archive
has no opening line at all, so this cannot be measured inside the archive. Step 10 is
therefore scoped to certifying the head **form** and the feature definitions offline, and
live certification waits for at least 100 live as-of rows per stratum.

### 6.5 Splits and sample rules

Time-ordered, grouped by fixture so every market and side of a game sits in one fold,
purged and embargoed by the longest pending horizon; leave-one-season-out for the NFL
archive; never random or play-level splits.

**Fixture grouping is PROPOSED, not existing.** The current splitter sorts by decision
time and cuts folds by row index with no group key; same-game rows are kept out of the
training side only by a purge that assumes every row carries the fixture's final whistle.
The step that builds the head adds a group key and pins a test that no fixture appears in
both the training and test side of any fold.

A stratum head fits only with at least 100 decided rows carrying a market price,
otherwise it shrinks to sport, then to the global market head; a market under 100 rows
globally has no head and no picks. A slice interval needs at least 30 rows or reports
null. A Venn-Abers stratum needs at least 100 calibration rows or does not fire.

Certification: the head serves only when its own out-of-fold rows clear n 100, Brier
0.22, debiased ECE 0.05 read at the point estimate **and the ninety-fifth percentile
bound**, Murphy 0.05, and its paired out-of-fold log-loss lower bound beats the
market-only baseline, with every bound clustered by fixture.

Refit cadence: weekly in season inside the calibration cron, plus a refit on any basis
change. A refit never changes the served artifact until a founder-approved promotion.

### 6.6 How confidence becomes a probability

It does not. The head's output is the probability, and it is served with its interval.

**Correction to the draft design:** post-bump rows leave `Pick.confidence` null and store
the probability in the factor-breakdown fields. Writing a probability into that column
re-creates the exact hazard the repo bans, since every reader would have to partition by
model version to know what the number means, and `computePickGrade` would grade the new
rows on score thresholds. The grade derivation is rewritten in the same step as part of
the decision-layer change.

### 6.7 Who runs the fit

Never an agent shell. The training-set builder and the fit run inside the calibration
cron under a stated time budget, or from an owner-only admin route that writes the same
durable artifact. The trainer is proposed at
`packages/prediction-engine/src/heads/{spec,fit,shrink,serve,artifact}.ts` over the
existing harness; the loader at `apps/web/lib/calibration/training-set.ts`; the artifact
is versioned JSON carrying a feature-schema hash, coefficients, the out-of-fold report,
and a status of candidate, certified or retired.

This is the single largest execution risk in the plan. The edge-lab harness has existed
for months and has never run, because it lives in scripts that nobody schedules. If the
fit is not inside a cron or an owner route, this document repeats that failure.

---

## 7. The publish decision, in order, and the ranking rule

Two phases. Phase 0 is withhold-only and display-side and ships without a bump, on the
precedent that the adverse-price refusal was added at mint as a withhold. Phase 1 is the
post-bump decision.

Every outcome of every step writes one gate-decision row with a status, a reason code,
evidence references, `isBootstrap: false` and the model version. For a withheld fixture
that had a selection, the evidence references carry the shadow record (selection, entry
price, edge assessment, veto keys) so the withheld set becomes gradeable. Retention is a
founder decision before the writer ships, because the writer produces rows per candidate
per fifteen-minute cycle.

### Reason codes

`UNCONFIRMED_FIXTURE`, `KICKED_OFF`, `HORIZON`, `STALE_ODDS`, `NO_BOOKS`,
`NO_MARKET_P`, `DQ_BELOW_70`, `CONSENSUS_BELOW_FLOOR`, `CONFIDENCE_BELOW_FLOOR` (phase 0
only), `LINE_INTEGRITY`, `EDGE_PASS`, `EDGE_ADVERSE`, `CONTRADICTS`, `SOLO_CAP`,
`HEAD_UNCERTIFIED` (phase 1), `STRATUM_THIN` (phase 1), `EDGE_BELOW_TAU` (phase 1),
`VETO_<signal>`.

Customer strings, which never use the withheld-word this repo bans and never carry an em
dash: no books maps to "Not enough sportsbooks are pricing this game yet."; low data
quality to "We don't have enough reliable data on this one."; uncertified head, thin
stratum and consensus floor to "We haven't scored this game yet."; every edge refusal to
"We passed. No edge at this price."; kicked off to "This one is under way."; an injury
veto to "We passed. A key player's status changed."

### Phase 0, now

1. Input guards unchanged: odds freshness at 4 hours, fixture confirmation fail-closed,
   kickoff guard, data-quality floor, in season.
2. Horizon: start time within 7 days, applied on the odds-input selection, never on the
   freshness predicate and never on generation time, which was the 2026-09-05 defect.
3. Book gate: at least one priced real book. With none, the fixture goes to the passed
   lane. Signal-path rows attach the same-batch market price when one exists; with none
   they are reads, not picks.
4. Existing scorer vetoes unchanged in value.
5. Edge vetoes, imported from `@sports/types`: the adverse-price predicate, plus a new
   refusal when the independent-edge decision is a pass, on both paths. **The regression
   specimen is a pass row whose expected value is at or above zero**, which still mints
   today, not the often-cited moneyline row whose negative expected value the existing
   predicate already refuses.
6. Single-source cap: single-source or split agreement publishes at free tier and lean
   grade, never premium, never featured. Totals publish at free tier. Tier moves only
   downward on refresh. **This is a tier-policy change a paying customer sees and it
   carries a founder sign-off dependency, separate from the withhold-only work.**
7. Veto lane, injected, log-only first.
8. Write: pick with write-once published terms, snapshot and receipt, lock price and
   line from the same batch, gate-decision row, shadow record for withheld fixtures.

**Correction on signal-path snapshots.** Writing learning-eligible snapshots for
signal-path rows would silently widen the eligibility sample, because the canonical
learning predicate requires that flag and signal rows are structurally outside the pooled
floors today. Signal-path snapshots are therefore written with the learning flag false
and counted under a stated exclusion reason until the founder rules on a basis change.
This is a gate input, and a gate input moves only on the founder's word.

### Phase 1, after the bump

Steps 1 to 3 as above, then: a certified head must exist for the stratum or its parent;
a pre-kickoff market price must be present; the head serves its probability and interval
from its stratum; the imported hard vetoes apply; selective fire on the lower endpoint
minus the market against a threshold tuned on a disjoint fold; the veto lane; tier
premium only when the edge clears its threshold, the interval is no wider than the
stratum's limit, and at least two books priced it. All three values come from the
disjoint-fold procedure and are recorded in the proposal with their fold.

### Ranking rule

Phase 0: among rows with a finite positive expected closing value, sort descending, tie
by the model-minus-market difference, then by recency. Rows without one trail as a block.
Confidence is never a sort key at any level, including the final fallback branch that
exists today.

Stated caveat, and it is load-bearing: the expected closing value is a shrunk edge
computed with hand-set thresholds whose magnitude has never been measured. Ranking on it
is better than ranking on a number measured anti-predictive, and it is still an unmeasured
number. Step 1 decides whether it carries information at all. If that test is null, the
Phase 0 ordering is documented as a provisional ordering of engine reads and the founder
decides whether anything publishes above free tier before the bump.

Phase 1: the lower endpoint minus the market, descending; tie by narrower interval; then
recency.

### Display

The market probability already renders to every tier on two-way moneyline rows with at
least two books; extend it to spreads and totals where a receipt carries a cover
probability. The head probability with its interval renders only on rows from certified
heads. The score badge is removed at the bump; until then it keeps its existing framing
that it is not a win probability. The calibration page buckets new rows on the head
probability and old rows on their own basis, partitioned by model version, and stops
publishing the confidence score as a forecast for new rows. The consensus copy stops
claiming full bookmaker consensus on run lines now, because on a run line that number is
true by construction.

### Eligibility

Unchanged and market-anchored until the bump. After it, the head basis, byte-identical
floors, streak restarting by design, and the proven claim re-earned on the number the
customer actually sees.

---

## 8. Build order

Owners are the subagent roles from `CLAUDE.md`; ledger rows use `claude` for agent
sessions. Every step requires typecheck 0, lint 0, its touched suites green, guardrails
green, and a ledger row with a real commit. No step pushes.

**Definition-of-done split.** Several steps end in a number that only a production run
can produce. Those have two halves: the agent half is the script, the pre-registration
and the tests, which can be marked done with a commit; the founder or cron half is the
run, recorded by whoever ran it. Until then the result field reads NOT RUN. An agent that
marks the second half done without the run has broken law 5.

**Step 0. Read-only production probe.** Owner: founder or the browser agent holding the
read-only role. No agent touches the database. Questions: row counts and maximum dates
for team efficiency, historical games (moneyline coverage by season), line snapshots
since 2026-09-13, tracking stats and injuries; the current eligibility reading; the share
of settled rows with a two-book price at mint and at close; the count of published
pending rows whose independent-edge decision is a pass with expected value at or above
zero; the count of settled picks with a null start time; and the count of settled rows
whose factor breakdown was rewritten after settlement. Result: `docs/ops/PROBE_2026-09-18.md`
(NEW). Depends: none. Bump: no.

**Step 1. Re-measure the baselines, then Question Zero.** Owner: prediction-engine.
Two parts, in order.

Part A, re-measurement: every calibration number this document cites for the market
probability, the signal path and the ranking blend was measured on a population that
predates the in-play exclusion, the verifiable-only market rule, or the
post-settlement-rewrite exclusion. Rebuild them with the current builder, per sport and
market, and replace the registry's evidence cells. Nothing downstream may cite the old
numbers.

Part B, Question Zero: does the independent blend minus the market carry information
beyond the market at all? Pre-registered in
`docs/calibration-proposals/feature-trials/q0-independent-edge.json` (NEW) and committed
before the run, with the hypothesis, the kill line, its confidence level as the harness
actually computes it, the false-discovery level, the test set and the placebo spec. The
test set is verifiable-only odds-table prices at generation time, fixture-grouped and
time-ordered, with post-settlement-rewrite rows excluded. Harness:
`scripts/calibration/question-zero.ts` (NEW) over the existing logit pool and placebo
modules. Run by the founder or the owner route.

Agent done: script, pre-registration committed, tests green. Founder done: the run and
its numbers. Depends: 0. Bump: no.

**Step 2. Ledger, CI and the branch re-land.** Owner: testing-qa; the push is the
founder's. Add rows for every step below with unique titles. Re-land the two code commits
from the research branch on a fresh branch without the binary commit, resolve the test's
CSV path from the package root, correct two unsourced attributions to their sources or to
UNVERIFIED, and reconcile the documentation and code disagreement in one branch module.
Add `apps/web/__tests__/engine-barrel-imports.test.ts` (NEW) that enumerates the partial-mock
files, currently 22, and asserts the board state module and the picks route import nothing
new from the engine barrel.

**Correction:** row M-1 carries owner `motif`, and ledger rule 2 forbids editing a row you
do not own. Re-owning it as `claude` would also misattribute another agent's work. M-1 is
founder-only: the founder re-owns it or cancels it with a reason. The agent's pull request
names the ask. Everything else in this step proceeds.

Depends: none. Bump: no.

**Step 3. Same-book closing value and the archive alarm.** Owner: prediction-engine for
capture, data-ingestion for the monitor. Add per-book close derivation from the archive,
which carries a book column, and grade on a stated basis. Add
`apps/web/lib/data-reliability/line-archive-staleness.ts` (NEW) reading the maximum
capture time per in-season sport against a service level, wired into the capability
probes, the alert decision and a truth-surface block.

**Correction:** the existing closing-value columns keep their existing basis. The
same-book grade is persisted alongside, per row, with an explicit basis field, and both
shares are reported side by side. Those columns feed the public milestone, so overwriting
their semantics in place would mix two rulers in one denominator, which is a gate-input
change and therefore the founder's call.

Depends: 0. Bump: no.

**Step 4. Table-freshness manifest and rights parity.** Owner: data-ingestion. A manifest
of table, family, service level, observation column and in-season flag for the six tables
the head will depend on, wired into the probes and the alert decision. A shared license
tag in `@sports/types` and `apps/web/__tests__/registry-parity.test.ts` (NEW) asserting
every source id used by the independent assembly, the score router and the conviction
signals resolves in both registries with compatible verdicts, most restrictive winning,
with the three known disagreements emitted as a report for the founder. Correct the cron
manifest header count to 22. Depends: 2. Bump: no.

**Step 5a. Withhold-only mint rules and the gate-decision writer.** Owner:
prediction-engine; frontend-app for the pass copy. Refuse to mint when the independent
edge decision is a pass, via a predicate exported from `@sports/types` next to the
existing one, never restated. Apply the seven-day horizon on the odds-input selection.
Write one gate-decision row per evaluated fixture per cycle with the reason code, the
evidence references and the bootstrap flag explicitly false. Move the day-boundary helper
to Central through one shared function and fix the date stamps that currently use UTC.
Map the reason codes to the customer strings in section 7.

Regression tests: a pass row with expected value in the non-negative band never mints; a
contradicted row at zero never mints; the nine known adverse rows never mint; a zero-book
signal row is refused with the no-books code; a January fixture is refused on horizon;
one gate-decision row per fixture per cycle; the boundary test at the Central evening
cutover; the 22 partial-mock files green.

Depends: 2, and the founder's retention decision for the gate-decision table. Bump: no.

**Step 5b. Tier policy.** Owner: prediction-engine. Single-source and split agreement cap
at free tier and lean grade; totals at free tier; tier moves only downward. Re-tiered rows
carry a policy tag in the factor breakdown so the record partitions cleanly before and
after. Depends: 5a **and founder sign-off**, because this changes what a paying customer
receives under one version label and nothing in CI would catch it. Bump: no.

**Step 5c. Signal-path provenance.** Owner: prediction-engine. Attach the same-batch
market price, write the snapshot and the receipt, with the learning-eligibility flag
false and a counted exclusion reason. The probability and confidence math stay
byte-identical, pinned by a golden test. Depends: 5a. Bump: no. Founder decides later
whether these rows ever enter the eligibility sample, which is a basis change.

**Step 6. Rank on the engine's edge, fix the display claims.** Owner: frontend-app.
Apply the Phase 0 ranking rule and remove the confidence fallback branch. Stop claiming
bookmaker consensus on run lines. Extend the market-implied display to spreads and totals
where a receipt carries a cover probability. Retitle the confidence section of the
calibration page as score buckets and stop treating the score as a forecast there.
Fixture test: on the 2026-09-13 slate, the largest-edge row sorts first and the row that
led the board that day sorts last among priced rows. Depends: 5a. Bump: no.

**Step 7. Veto lane and the first real signal, log-only.** Owner: prediction-engine for
the seam, data-ingestion for the writers. Add
`packages/ingestion-pipeline/src/veto-lane.ts` (NEW) as an injected function type; the
cron route and the board filler build the lane from the conviction registry in log-only
mode; absence of a lane means no veto. Add an injury-out signal and the game-signal
writers that make the injury and weather snapshot flags stop being permanently false.

**Correction:** use the existing signal categories. There is no injury-news category in
the enum and adding one is a schema edit an agent may not make.

Also in this step: wire `buildEvidenceReadinessMatrix`, which already encodes 13 factor
keys with trust, sample and age floors and has no caller, as the readiness read behind
the lane. We do not need a second registry contract; we need the one we have to run.

Test: log-only leaves the published set byte-identical in a replay while the evidence
references carry the reads; a throwing signal is silent; the fictional wire and the
fictional props pool cannot reach any signal. Depends: 4, 5a. Bump: no.

**Step 8. Training-set loader with counted exclusions.** Owner: prediction-engine. Build
`apps/web/lib/calibration/training-set.ts` (NEW) over the existing as-of and exclusion
modules, including the post-settlement-rewrite exclusion and the null-clock audit, with
per sport and market counts and market-price coverage. Depends: 1, 3, 5a. Bump: no.

**Step 9. Head trainer, offline.** Owner: prediction-engine. Build the head modules with
the market logit as a fixed offset and penalized feature terms, hierarchical shrinkage,
a fixture group key on the splitter, and out-of-fold reports with fixture-clustered
bounds. Tests: the identity fixed point, meaning the head reproduces the market as the
penalty grows; an oracle test recovering synthetic coefficients; a fold test that no
fixture appears on both sides. Nothing imports it from scoring or a route. Depends: 8.
Bump: no.

**Step 10. Offline certification of the head form on the archive.** Owner:
prediction-engine and data-ingestion. Schedule the historical backfill weekly, with the
founder approving the cron addition. Certify the head **form** and the feature
definitions on the archive with leave-one-season-out reporting.

**Correction:** the opening-versus-closing degradation test cannot run on this archive,
which stores closing lines only. Live certification waits for at least 100 live as-of
rows per stratum, and the report states that the archive certifies form, not serving.

Depends: 0, 9. Bump: no.

**Step 11. Make the admission harness runnable, then the first batch.** Owner:
testing-qa for the harness, prediction-engine for the trials. Add the npm entry and run
admission inside the calibration cron as its own block, so it actually runs. Batch 1 is
all T1 candidates: line movement, dispersion, side-agreement share, cross-market, rest
for the sports where it is not already killed, form terms, NFL EPA v1, the Elo-margin
cover, MLB standings once dated, the shadow posterior, expected turnover differential,
early-down success, explosive rate, and the drive and pace terms for totals. Each gets a
committed pre-registration whose commit must be an ancestor of HEAD, two reports (as-of
and close), and false-discovery control across the whole batch. Agent done: harness,
pre-registrations, tests. Founder or cron done: the runs. Depends: 8, 9. Bump: no.

**Step 12. Port the lab families to a scheduled job; fix the percentile inversion.**
Owner: data-ingestion. Port the 15 families to TypeScript sharing the branch filter
module, persisted to game signals and to the proposed feature table when it exists,
silent until then. Fix the double inversion in the lab script and pin the regression
tests.

**Correction:** regeneration of the CSVs needs the multi-gigabyte play-by-play directory
and a Python environment, neither of which an agent session may install. The agent fixes
the script and pins the tests; the regeneration and its changelog line are lab-run and
read NOT RUN until then.

Depends: 2, 4. Bump: no.

**Step 13. Shadow serving and parallel measurement.** Owner: prediction-engine. Serve the
head after scoring and write its output into the factor breakdown as an extra key for
minted rows and into the gate-decision evidence for withheld ones. Add a head-calibration
block to the calibration cron on its own basis, diagnostic only, and prove by test that it
cannot change eligibility or any gate. Measure and log the added per-fixture cost of the
fifteen-minute cycle.

**Correction:** the shadow-signal table is one row per game and model version and cannot
hold per-pick head output. The proposed tables are the proper home; the factor-breakdown
key is the interim.

Depends: 9. Bump: no.

**Step 14. Conformal refusal fix.** Owner: prediction-engine. Refuse instead of clamping
when the finite-sample rank exceeds the calibration set, and on an empty set. Rewrite the
test to pin refusal, which is a narrower intent, not a weakened guard. The basis is the
finite-sample argument, not the test's comment, which concerns a different clip. Depends:
none. Bump: no.

**Step 15. The version proposal and promotion evaluation.** Owner: prediction-engine.
Write the proposal with the out-of-fold tables, the certified strata, the three
thresholds with their folds, the deployed-slice and streak-reset consequences, and the
list of retired rules. Evaluate promotion with fixture-clustered bounds and report the
correlation between closing value and realized Brier before treating closing value as a
binding leg. The final numbers come from the sealed holdout, opened once by the founder.
Depends: 10, 11, 13. Bump: no, it prepares one.

**Step 16. Decision-layer rewrite, behind the bump.** Owner: prediction-engine; the
founder edits the version constant and flips the proposal. Serve the head in the three
scorers; retire the composite as a tier and rank source; reduce the ranking blend to the
head probability; remove the signal-path multiplier; require a market price; extend the
factor-breakdown shape; rewrite the two pinning tests to the new rule rather than
weakening them; rewrite the grade derivation, since the grade currently reads the score
column. Depends: 15 eligible and founder approval. Bump: YES, one bump, founder-only.

**Step 17. Display and eligibility on the head basis.** Owner: frontend-app and
prediction-engine. Remove the score badge; render the head probability with its interval
only for certified heads and only to viewers entitled to it; partition the calibration
page by model version; move the eligibility basis. Negative test: an uncertified head
renders no model percentage. Depends: 16. Bump: no.

**Step 18. Quarantine what is not wired.** Owner: prediction-engine; the founder decides
the props stack. Remove barrel exports for the unreachable index families and wrappers,
move them under a research path with a README, and add a test that every barrel export
has a non-test importer or a research path. Depends: 2. Bump: no.

### Why this order

Steps 0 through 3 are the measurement fixes. They are first because every number in this
document that could justify a model change is currently measured on a ruler we know is
wrong: the closing-value basis mixes book sets, the market-probability calibration
predates the exclusions, and the training rows include probabilities rewritten after the
outcome was known. Building a head on those numbers would produce a confident result
about nothing.

Steps 5a through 7 are the withhold-only work. They ship value without a bump, they are
the direction the repo's own precedent allows, and they start the shadow capture that the
selection-bias problem needs.

Steps 8 through 15 build and certify. Step 16 is the only bump.

---

## 9. Founder-only actions

Nothing in this list may be done from an agent session.

1. Run or delegate the step-0 read-only probe. No agent touches the database.
2. Approve and name the single version bump, edit the version constant, flip the
   proposal to implemented after the promotion evaluation reads eligible, and accept that
   the proven streak restarts on the new basis. Decide whether the pending display
   proposal closes into it.
3. Re-own or cancel ledger row M-1, and push the ledger fix so CI turns green. Law 1
   forbids the agent push.
4. Decide the gate-decision table's retention rule before its writer ships, and confirm
   the revive decision this document takes.
5. Sign off the tier policy a paying customer sees: the single-source cap, totals at free
   tier, the pass refusal, and at the bump the removal of the signal-path multiplier.
6. Decide whether signal-path rows ever enter the eligibility sample, which is a basis
   change and restarts the streak.
7. Migrations, from agent-authored proposal SQL placed under `docs/ops/proposals/` and
   never under the migrations directory: per-pick feature vectors, head registry,
   closing-value grades, feature values and runs, and the dropback and rush split columns
   on team efficiency.
8. Environment and keys: the exchange ingest flag and key, the power-index licence flag,
   the news feed list, the archive flags, and the conviction evidence requirement, the
   last only after a withheld-set test reads out.
9. Rights rulings: share-alike charting into any served probability; the two registry
   disagreements; the scoreboard storage question; the relayed single-book price as the
   free board's book; and whether a paid charting subscription is worth evaluating, which
   this document says is only after the free stack has out-of-fold results.
10. Approve the three cron additions: the weekly historical backfill, the weekly lab job,
    and the admission run inside the calibration cron.
11. Decide the research-branch merge scope. The recommendation is code only: about 9.6 MB
    of documents and logs stay out of git history, and the activity log in particular
    contains personal search history that should not be committed at all.
12. Decide whether the unmerged research corpus branch merges, so the standing document
    paths resolve.
13. Run the owner-only remediation tools for the known corrupted and stale pick cohorts.
14. Decide the props stack: wire it or quarantine it. About 30 files currently have no
    live consumer.
15. Accept the volume consequence: totals and the football and basketball spread strata
    publish nothing above a market read until a feature earns lift, and signal rows
    without a book are reads.
16. Provide, if they are to be cited anywhere, the local artifacts the research notes
    reference but the repository does not contain.

---

## 10. Do-not list

- Do not fit any monotone map to the composite confidence and call it calibration. The
  score is inverted at the top and a monotone map cannot invert it.
- Do not bump the version, flip a proposal to implemented, or add a frozen line from an
  agent session.
- Do not flip or repurpose any public gate or ingest flag, or the conviction evidence
  requirement.
- Do not use a closing price, or anything observed after kickoff, as a fit feature. The
  market at as-of is the base and the comparator; the close is a label.
- Do not admit an estimator that read a book price as a market-blind referee.
- Do not split training rows at random or at play level. Every fold is fixture-grouped,
  time-ordered, purged and embargoed, and every bound is fixture-clustered.
- Do not fit or serve a head below the floor of 100 decided rows with a market price, and
  do not let a stratum pass on fewer rows by shrinking the wrong way.
- Do not certify a head on a lower bound that exists to prevent demotion. Certification
  reads the conservative end.
- Do not report selection and evaluation from the same fold. The sealed holdout opens
  once, at sign-off.
- Do not read a probability from a row whose factor breakdown was rewritten after
  settlement.
- Do not display a head probability for an uncertified head, and do not display
  confidence as a percent or a win rate anywhere.
- Do not rank on confidence, including as a last-resort fallback, and do not rank on the
  legacy blend after the bump.
- Do not publish a row with no market price, a row whose independent-edge decision is a
  pass, or a row whose expected closing value is negative. Import the predicates, never
  restate them. Do not gate on the pass label at display time, because contradicted rows
  carry a zero.
- Do not import the engine barrel into the board state module or the picks route. The
  partial-mock count drifts, so the guard is an enumerating test, not a number.
- Do not let `packages/*` import `apps/web`. Inject lanes and loaders from the cron route.
- Do not let any gate or signal add conviction, raise a tier, or move a rank. Do not
  unpublish an already-published row from a gate: hiding a row we should not have offered
  is honest, erasing it from the record is not.
- Do not treat the shadow-signal table as a per-pick store.
- Do not author files under the Prisma schema or migrations directory. Proposals go under
  `docs/ops/proposals/`.
- Do not feed share-alike charting columns into a served probability until the founder
  rules.
- Do not re-promote a killed signal without a new pre-registration that names the prior
  kill. The current kill list: NFL rest and bye effects, schedule-derived reference
  features, travel and altitude, raw third-down conversion, rushing efficiency as a
  strength driver, red-zone conversion, fumble recovery as a skill, sack extrapolation,
  raw turnover margin, scripted-drive efficiency, the revenge-game hypothesis, the
  cold-and-wind interaction, game-level compounding, and the four killed discovery
  families.
- Do not fabricate weather, consensus counts, narrative facts, injuries from a stale
  season, or ownership shares. Absent means the feature does not fire and the gate has no
  vote. A signal never defaults to neutral.
- Do not let the demo wire, the illustrative fantasy pool, or fictional props reach any
  gate, feature, or training row.
- Do not clamp a small-sample conformal quantile, and do not ship a conformal interval for
  a binary side. Refuse instead.
- Do not label an opponent-adjusted implementation with a vendor's metric name, and do not
  republish any vendor's chart or table.
- Do not run a calendar shadow period as the evidence. The evidence is the out-of-fold
  report, and what cannot be backtested does not ship. Do not treat three consecutive
  green runs as proof.
- Do not bound the public selection on generation time. Bound the horizon on start time.
- Do not pool spread and total line points with moneyline probability in one closing-value
  figure.
- Do not swallow a head-serving, shadow-pass, or archive failure into a warning. Count it
  and surface it. That pattern is how a three-week outage went unseen.
- Do not edit a ledger row you do not own, write an owner outside the allowed set, or mark
  a step done when only its agent half is done.
- Do not fix the percentile inversion by hand-editing CSVs. Fix the script and regenerate.
- Do not run a cron with a real secret, search for credentials, touch a database, or
  install packages from an agent session.
- Do not put a banned phrase, a retired tagline, or an em dash in any customer string
  these steps produce.
- Do not describe any part of this engine as AI, in code, copy, documents, or commit
  messages.

---

## 11. Open questions

1. Everything in step 0. The plan has branches that are dead on arrival if the team
   efficiency table is empty, the archive did not resume, or the historical archive lacks
   moneyline coverage.
2. Question Zero's answer. If the independent blend carries no information beyond the
   market per stratum, the engine has no edge to rank today, and the founder decides what,
   if anything, publishes above free tier before the bump. This is the single question
   that decides whether the rest of the plan is a build or a retraction.
3. What the 23 percent measures. Whether it is the model or the ruler is unknown until the
   same-book basis re-baselines it.
4. Whether beat-close correlates with realized Brier on our own rows. If not, the second
   promotion leg is reported, not binding, and the established requirement needs a founder
   re-read.
5. The three threshold values per stratum. Neither candidate width figure in the corpus is
   data-derived.
6. How much of the selection bias the withheld-fixture shadow records remove, and how long
   until coverage per stratum reaches the floor.
7. Whether the serverless budget holds the weekly lab job and the head fit inside the
   calibration cron. If not, the owner route is the runner and the founder sets its
   cadence.
8. Whether the shadow ensemble pass earns its cron time. Step 11 is its one trial.
9. Whether pushes justify a three-class head anywhere.
10. Three numeric inconsistencies inside the research corpus itself, which need an owner
    before any of those numbers is pinned by a test.
11. Whether the eventual displayed probability should be a precision-weighted blend of
    model and market. This document's answer is that the head already is that blend, with
    the market as its fixed point and the market-blind independents as the referees that
    closing value grades.

---

## 12. Verification record

This document was produced by nine read-only repository maps, one independent map of the
pre-2026-09-17 intake stack, three competing architectures scored by three judges, and an
adversarial verification pass. Reporting what was and was not verified is part of the
deliverable.

**Ran and passed:**

- Two adversarial verifiers completed: law and gate compliance, and statistical validity.
  Both returned findings, and every blocker and major finding is applied above and marked
  as a correction.
- Path feasibility, run by hand this session: 365 distinct paths cited across the design
  material. All resolve, except those explicitly marked NEW, PROPOSED or BRANCH. The four
  wrong-directory paths the judges found in the candidate designs were corrected before
  this document.
- Copy compliance, run by hand: zero em dashes; zero banned-phrase hits against the
  machine-readable positioning vocabulary, other than two entries that are the approved
  replacements this document is supposed to use.
- Repository facts spot-checked directly: the ledger guard exits 1 on one violation; 22
  files partially mock the engine; the conformal module clamps rather than refuses; the
  in-play partition keeps a row when either clock is null; the market-implied block
  already renders to every tier; the gate-decision bootstrap column defaults true; the
  signal-category enum has no injury-news member; the lab percentile function inverts
  twice for lower-is-better metrics; the evidence readiness matrix has no runtime caller.

**Did not run:**

- Three adversarial verifiers and the completeness critic terminated on usage limits:
  feasibility, copy, ordering, and completeness. Their mechanical parts were re-run by
  hand as described above; their judgment parts were not. Ordering and completeness were
  reconstructed from the judges' reports, which covered both at length, but no independent
  pass confirmed them.
- No production database was read. Every number in this document that describes production
  comes from a repository document or a prior measurement recorded there, and each is
  marked RE-MEASURE where its population is now known to be unsafe.
- No test suite, typecheck or guardrail run was executed for this change, because this
  change is a document. The steps above carry their own definitions of done.

**What would most change this document:** the step-0 probe and Question Zero. If the
independent blend carries no information beyond the market, sections 3 through 8 become a
plan to publish market reads honestly rather than a plan to publish an edge, and that is a
materially different product. The architecture is built so that finding out costs one
script and one run, not a quarter.
