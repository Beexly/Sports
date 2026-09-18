# GSE Signal Architecture, 2026-09-18

> **SUPERSESSION NOTICE.** Sections 4 through 8 of this document are superseded by
> `docs/architecture/2026-09-18-parallel-build-plan.md`. The founder rejected this
> document's serial shape as compressing the business, and he was right: it put the
> honesty gate at the build boundary when that gate belongs only at the publish
> boundary. The parallel plan rebuilds the registry and the build order as seven
> concurrent tracks with 76 work items, 64 of 81 registry rows active immediately, and
> 10 genuinely blocked. Sections 1, 2, 3 and 9 through 12 below still stand: the
> inventory, the layer invariants, the founder actions, the do-not list and the
> verification record are unchanged and are the input the parallel plan builds on.

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

## 3. The architecture: seven layers, and where the one gate sits

The first version of this document put the honesty gate at the build boundary. That was
the error, and it is worth naming precisely because it is easy to repeat: a rule that
says "we may not publish an uncertified probability" was read as "we may not build,
capture, compute or instrument anything whose probability is not yet certified." Those
are different sentences. The first is a law. The second is a retraction dressed as
rigour.

The gate is a predicate on one value: the number a customer reads as a probability. It
constrains L5 serve and nothing else. Everything upstream of that predicate, every
capture, every table, every estimator, every head fit, every shadow score, every
admission test, runs at full width and starts now.

**Where the boundary sits, layer by layer.**

| Layer | What it does | Constrained by the certification gate |
|---|---|---|
| L0 | Labels and the as-of feature ledger | No. Capture and label everything, always. |
| L1 | The market base | No. It is already the one measured number. |
| L2 | Independent estimators | No. They are market-blind referees, they publish nothing by themselves. |
| L3 | Calibration heads, the trainer | No for fitting, scoring, shadow serving and promotion. Yes only at the serve hop. |
| L4 | Feature admission | No. Admission is a statistical verdict, not a publication. |
| L5 | The decision layer | **Yes. This is the boundary.** |
| L6 | Measurement and promotion | No. It reports eligibility; the founder acts on it. |
| L7 | Observability, rights and provenance | No, and it is the one layer that must be widest of all. |

Read the table the other way and it says the useful thing: six of seven layers have no
certification constraint at all. The engine can be enormous before a single new number
reaches a customer, and it should be, because a signal that is not captured today has no
sample tomorrow.

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

---

## 4. The one held line, and the vocabulary that replaces deferral

### 4.1 The certification predicate, written once

Everything in this architecture is negotiable except this predicate. It is deliberately
narrow, and it is written as a predicate rather than a principle so that it can be
audited by a test rather than argued about in a review.

> A number may be presented to a customer as a probability, a win rate, a percentage
> chance, or anything a reasonable reader would take for one, only if it is either
> (a) the de-vigged market probability, labelled as the market's number and carrying its
> book count, or (b) the output of a head whose stratum has passed certification.
>
> A stratum passes certification when, on fixture-clustered out-of-fold rows from a
> purged, embargoed, time-ordered split: its paired log-loss lower bound over a
> market-only baseline is positive, and its own rows clear the four standing floors of
> n 100, Brier 0.22, debiased expected calibration error 0.05 and Murphy reliability 0.05
> (`apps/web/lib/ops/calibration-eligibility.ts:131-136`), read at the conservative end.
>
> Nothing else is a probability. A score is a score, an edge rank is an edge rank, a
> factor sum is a factor sum, and none of them may be rendered with a percent sign.

Three consequences follow immediately and none of them constrains the engine:

1. **Uncertified heads still run.** They fit, they score, they are promoted into shadow,
   they accumulate an out-of-fold record, and their numbers are visible to us. They are
   simply not printed on a card.
2. **Uncertified signals still enter heads.** Admission (L4) is a statistical verdict
   about whether a feature carries information. It is not a publication. A feature can
   be admitted, fitted and shadow-scored for months before any head it belongs to serves.
3. **Display numbers that are not probabilities are not gated at all.** A sourced count,
   a percentile with its n, a rest differential, a pressure rate, an air-yards split: all
   of these can be shown today, with a source and an n, because none of them is a claim
   about the chance of an outcome.

The board does get thinner at the moment of the bump, and that is the honest cost of
(a) and (b). It does not get thinner beforehand, and the engine behind it gets larger
continuously from today.

### 4.2 Roles

- **feature**: enters the head probability through a coefficient. The only route that
  can raise a probability. Requires admission and a refit under a founder bump.
- **gate-veto**: a withhold-only vote after the head. Any contradicting vote holds the
  pick; a null is never a vote; a signal that throws is silent
  (`apps/web/lib/conviction/gate-contract.ts`). It may never raise anything.
- **display**: shown on a surface with its source and its n. Affects no decision, and is
  not constrained by the certification predicate unless it is a probability.
- **content-only**: edge sheets, posts, fantasy tools. Never on a pick.

Two substrates are not signals and carry no role: **labels** (settled outcome, with
closing-line value as auxiliary) and **width inputs** (book count, dispersion, interval
width, which define the stratum and the tier and never the point estimate).

### 4.3 Evidence tiers

- **T0, live and validated**: read by a served number today and measured calibrated on
  settled rows. Today exactly one, the market probability, and even that number needs
  re-measuring on the current builder before it is cited again.
- **T1, computable from a live feed**: computable as-of from data the platform persists
  or fetches on a schedule today, so the admission test can run now.
- **T1-capture**: the source is available and the log does not exist yet. The log starts
  today and the test runs when n arrives. This tier is the reason capture is not
  sequenced behind anything.
- **T2, lab-only**: computed once in `docs/research/2026-09-17/gse-lab` or the props
  workstream from nflverse play-by-play with documented filters. Not on any live feed.
  Testable only after a scheduled in-repo job reproduces it against pinned values.
- **T3, research-only**: named in the dossiers or the founder's audit documents with no
  computation in the repo. Enters as a hypothesis with an unblocking condition.
- **REJECTED**: killed by measurement or by a structural rule. Not re-promotable without
  a new pre-registration that names the prior kill.

### 4.4 The verdict vocabulary, which replaces DEFERRED

The first version of this document had a DEFERRED status and put most of the research
corpus in it. DEFERRED is abolished. It confused two unrelated facts, that a signal
cannot be published yet and that a signal cannot be worked on yet, and it was the
mechanism by which the plan compressed the business. Every registry row now carries
exactly one of five verdicts.

| Verdict | Meaning | Who acts | When |
|---|---|---|---|
| **BUILDING-NOW** | An agent starts building it today. | agent | now |
| **CAPTURING-NOW** | Its as-of log starts today and accrues sample in wall-clock time. It cannot be tested until n arrives, and waiting to start the log only moves that date further away. | agent | now |
| **SHADOW-NOW** | It computes today and writes to a store no published number reads. Costs nothing, blocks nothing, accrues a record. | agent | now |
| **FOUNDER-BLOCKED** | Blocked by exactly one of three things: a founder rights ruling, a founder environment flag, or a genuinely absent source. The blocker is named on the row. | founder | on the founder's word |
| **KILLED** | Killed by a recorded measurement or a structural rule, with the measurement named. | nobody | permanent until re-registered |

**The rule that governs the table.** "Nobody has built it yet" is a build task with an
owner. It is never a reason to park a row. A row may leave the first three verdicts only
by naming a founder rights ruling, a founder environment flag, or a genuinely absent
source, or by dying with a number attached. There is no fourth excuse.

### 4.5 Promotion path

Capture, then compute, then shadow, then pre-register, then admit, then fit, then
certify, then serve. Only the last hop is founder-gated, and only the last hop touches a
customer. A signal can travel the first seven hops without a single founder action and
without a single MODEL_VERSION change.

### 4.6 Kill rule

Every row carries a kill line, written as a number, before any test runs, on the same
line as the prediction. A feature is dropped on the **first** refit whose interval
crosses zero. Re-admission requires a new pre-registration naming the prior kill. A null
result is recorded, kept and published internally, because the corpus of what does not
work is the only thing that stops the next agent re-running it.

---

## 5. Signal registry, re-adjudicated

Every row in the corpus, re-adjudicated against the verdict vocabulary in section 4.4.
The prior revision of this table parked most of these behind three measurement fixes.
That is the shape the founder rejected and it is gone.

**The count is the argument.** Of 98 rows: **77 are BUILDING-NOW**, 8 are CAPTURING-NOW,
3 are SHADOW-NOW, **only 2 are FOUNDER-BLOCKED** and 8 are KILLED by a recorded
measurement. **81 of 98 begin capturing today.** Eighty-eight rows are active work this
week, and the only two a founder decision gates are the exchange-price rights ruling and
the unset power-index licence flag.

The table grew during assembly rather than shrinking, and that is the point. It opened at
81 rows; an adversarial compression pass (section 5.2) found eleven capabilities named in
the founder's own benchmark notes that had no row at all, and one row that had compressed
a twelve-family research programme into a single dead line.

Columns: the original nine, plus Verdict, Track and Capture. `Capture` reads `now` when
the row's as-of log starts today whatever else is true of it, which is the whole point of
section 8.2. Evidence cells marked RE-MEASURE carry a number computed on a population the
repo has since ruled unsafe (no in-play exclusion, receipt-sourced market prices, or rows
rewritten after settlement); they are cited with that caveat and re-measured before any of
them is used as a baseline.

| Signal | Verdict | Track | Capture | Family | Role | Tier | Source, license | Code path | Evidence | Kill line | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Market de-vigged probability | BUILDING-NOW | C | now | market | feature | T0 | odds table at as-of; Odds API licensed; `espn_public` use-with-caution | `scoring.ts` de-vig; `pick-proof-receipt.ts:79`; `market-implied-display.ts` | monotone, every band within 0.07, n 622 (RE-MEASURE) | Paired Brier lower bound at or below 0 vs the current de-vig, n at least 1000: no method swap. | prediction-engine |
| Closing line | BUILDING-NOW | A | now | market | label | T1 | `odds_line_snapshots` phase CLOSE; `settle-sport.ts:867` | `line-archive.ts`; `clv-capture.ts` (reads a batch with no book id) | archive held only four days when last measured | Any label join excludes a snapshot more than 24 hours stale; a season the archive does not fully cover excludes that season from NFL head training entirely. | data-ingestion |
| Same-book closing value | BUILDING-NOW | A | now | market | label | T1 | as above | `clv.ts`, `clv-capture.ts`, `free-path-clv.ts` | 23.0 percent against a 0.524 requirement, on a basis that mixes book sets | Beat-close bootstrap fifth percentile below 0.524 over at least 500 fixture-clustered rows: the leg stays reported, never the head's fit target. | prediction-engine |
| Historical archive, 1999+ | BUILDING-NOW | A | now | market | label | T1 | nflverse schedules CC-BY 4.0 | `apps/web/lib/ingestion/historical-games.ts`; `market-backtest.ts` | stores closing lines only, no opening line; writer unscheduled | Zero tolerance for a season with no opening-line rows: exclude that season from NFL head training and state the close-versus-lock shift for every included season. | data-ingestion |
| Bookmaker count and depth | BUILDING-NOW | C | now | market | width-input | T0 | odds table | `scoring.ts:287-288` | 20 points constant on any deep board | Zero marginal information by measurement: the term contributes a constant 20 points on any board past the depth floor, removed from the confidence sum unconditionally, no further test needed. | prediction-engine |
| Book dispersion | BUILDING-NOW | C | now | market | width-input | T1 | odds table | `scoring.ts:369-388` | none | 95 percent CI on the coefficient against squared out-of-fold residual crosses 0: drop it from the interval width model. | prediction-engine |
| Side-agreement share | BUILDING-NOW | C | now | market | feature | T1 | odds table | `scoring.ts:434-441` (line-agreement today) | MLB run-line consensus pinned at 1.0000 by construction | 95 percent CI on the coefficient crosses 0: drop the feature. | prediction-engine |
| Line movement since open | BUILDING-NOW | C | now | market | feature | T1 | `OpeningLine` plus game columns | `game-context.ts:96-102` | none measured | 95 percent CI crosses 0 after controlling for the market price at as-of: drop, since the current line already prices the move. | prediction-engine |
| Cross-market consistency | BUILDING-NOW | C | now | market | feature | T1 | odds table | `game-context.ts` cross-market term | none | 95 percent CI on the coefficient crosses 0: drop. | prediction-engine |
| Public money splits | BUILDING-NOW | A | n/a | market | feature | T3 | no cleared source | `founder-picks/factors.ts` consensus input | never fabricate a consensus number | Zero weight whenever no cleared source is flowing, by construction, never fabricated, for as long as that lasts. | founder |
| Elo from results | BUILDING-NOW | E | now | independent | feature | T1 | `TeamGameLog` | `elo-from-results.ts` | signal path buckets 60-69 at 57.0 percent n 423, 70-79 at 66.0 percent n 247 (RE-MEASURE); six NFL home teams inside 0.6036 to 0.6399, which is home advantage with a rounding wobble | Per-stratum 95 percent CI crosses 0: drop that stratum. Solo-source Elo, agreement SOLO, is barred from a Premium-tier claim regardless of the coefficient result. | prediction-engine |
| Poisson, Dixon-Coles, Skellam cover | BUILDING-NOW | E | now | independent | feature | T1 | `TeamGameLog`, last 20, minimum 5 | `poisson.ts`, `dixon-coles.ts`, `skellam.ts` | implemented 2026-08-22; no out-of-fold lift number exists | Per-stratum 95 percent CI crosses 0 under purged, fixture-grouped walk-forward: drop; the Dixon-Coles correlation term fixes at 0 unless its own CI excludes 0. | prediction-engine |
| MLB standings strength | BUILDING-NOW | E | now | independent | feature | T1-capture | MLB Stats API (registry parity needed) | `standings-strength.ts` | none | 95 percent CI crosses 0 over market plus Elo, computed only on properly as-of-dated rows: drop. | prediction-engine |
| NFL opponent-adjusted EPA v1 | BUILDING-NOW | E | now | independent | feature | T1-capture | `TeamGameEfficiency`, nflverse CC-BY 4.0 | `opponent-adjusted.ts`, `nfl-epa-fair-value.ts` | every NFL signal pick on 2026-09-13 was single-source Elo, consistent with an empty table | 0 rows in TeamGameEfficiency at the probe keeps this capture-only until at least 100 as-of rows exist; once populated, a 95 percent CI crossing 0 drops it. | data-ingestion |
| NFL EPA v2: dropback and rush split, non-scripted, turnover-occurrence regression, early-season shrinkage | BUILDING-NOW | E | now | independent | feature | T2 | nflverse play-by-play CC-BY 4.0; charting columns excluded | `gse-lab/compute_team_metrics.py`; NONE for the split | passing efficiency correlates with wins at 0.53 to 0.61 against 0.13 to 0.19 for rushing (dossier, not peer-reviewed) | Paired Brier against v1 with a lower bound at or below 0: no promotion. The rushing term's own 95 percent CI crossing 0 drops the rushing term specifically. | prediction-engine |
| Elo-margin cover for NFL, NBA, NCAA spreads | BUILDING-NOW | E | now | independent | feature | T1 | settled margins plus Elo | `nfl/margin-mixture-model.ts` ORPHAN | those spread strata rank on confidence today and no edge veto can fire | 95 percent CI on the coefficient crosses 0 on the spread head: no lift, those strata stay market-only. | prediction-engine |
| Totals independent | BUILDING-NOW | E | now | independent | feature | T1 | `TeamGameLog`, play-by-play, weather | `poisson.ts` over-under only | MLB totals n 535 at .456; NFL totals n 14 at .357 | Hit-rate lower bound at or below 0.524 at n at least 100 keeps totals market-read-only past the bump; today's .456 MLB (n 535) and .357 NFL (n 14) are retrospective, not pre-registered, and the NFL figure at n 14 is far too small to read a sign from. | prediction-engine |
| ClubElo | BUILDING-NOW | E | n/a | independent | feature | T1 | package says use-with-caution, app says permission required | `build-independent-fair-values.ts:258` | none | Reconcile to one registry entry, fail-closed to permission-required until ClubElo's terms are actually read; once cleared, a 95 percent CI crossing 0 over market plus Elo plus EPA drops it. | founder |
| Own expected points, win probability, completion, rush yards, YAC | BUILDING-NOW | E | now | independent component | feature | T1 | nflverse CC-BY 4.0 | `expected-metrics/*` | validated against tracking aggregates; wired to one route | No standalone test: this substrate dies automatically if EPA v2 and the quarterback feature both drop it; if ever used standalone, a 95 percent CI crossing 0 drops it. | prediction-engine |
| Cross-Venn-Abers interval and selective fire | BUILDING-NOW | D | now | method | gate-veto | T1 | head out-of-fold rows | `edge-lab/selective-gate.ts`, `calibration/cvap.ts` | both candidate width thresholds are un-derived | Any positive excess of debiased out-of-fold miscalibration over the point estimate's own, greater than 0, fails the interval and reverts to the point estimate alone. | prediction-engine |
| Conformalized quantile regression | BUILDING-NOW | E | now | method | width-input | T1 | head residuals | `apps/web/lib/calibration/cqr.ts:12-15` | at n 5 and alpha 0.1 the clamp claims 90 and delivers 83.33 | Required rank exceeds n: refuse, 0 tolerance for a clamp. At n 5, alpha 0.1 that means refusing rather than the 83.33 percent the current clamp delivers against a claimed 90 percent. | prediction-engine |
| Rest, back-to-back, seven-day density | BUILDING-NOW | B feature store | now | schedule | feature | T1 | game columns | `game-context.ts:129-176`; `apps/web/lib/nba/rest.ts` ORPHAN | the bye-week edge vanished after the 2011 agreement; schedule-derived reference features returned FIRE_NOTHING in this repo's own harness | NFL bundle already killed: MI probe p equals 0.060 (not below 0.05) and the logit-pool beta 95 percent CI spans 0, per edge-lab/features/nfl-team-form.ts:1-11 citing schedule-features.ts's SCHEDULE_FEATURE_KEYS run (rolling_wr_diff, rolling_pd_diff, sched:rest_diff), verdict FIRE_NOTHING. For NBA and MLB: kill if the out-of-fold log-loss lower bound over the market-only baseline is not above zero at n greater than or equal to 100 fixture-clustered rows per sport, or an MI probe returns p greater than or equal to 0.05. | prediction-engine |
| Travel, time zones, altitude | BUILDING-NOW | D gate | now | schedule | gate-veto | T1-capture | static table | `conviction/signals/rest-travel.ts` | no verified coefficient; cannot discriminate in week 1 because every prior game is preseason | Gate: kill, demote to display, if the withheld set is not worse than the kept set over at least 100 fixture-clustered decisions (section 4 promotion path). Feature: no in-repo test has run, so no kill exists yet; a future test kills it if the coefficient's 95 percent CI includes 0 at n greater than or equal to 100. | prediction-engine |
| Against-the-spread form, head to head, venue | BUILDING-NOW | F trainer | n/a | schedule | feature | T1 | `TeamGameLog` | `game-context.ts:195-224` | flag state unknown | Kill if the coefficient's out-of-fold log-loss lower bound over the market-only baseline is not above zero at n greater than or equal to 100 fixture-clustered rows, or if the leakage check finds any row whose own scored game leaked into its form window. | prediction-engine |
| Injuries: official status, quarterback-out indicator | BUILDING-NOW | A capture | now | availability | feature | T1-capture | nflverse injuries CC-BY 4.0 | `apps/web/lib/ingestion/injuries.ts`; only reader is the fantasy composite | persisted daily since C-244; no engine consumer; the snapshot flag is structurally false | Kill (feature) if the QB-out coefficient's 95 percent CI includes 0 at n greater than or equal to 100 games with a confirmed starter-out flag. Kill (gate) if the withheld set is not worse than the kept set over at least 100 decisions. | data-ingestion |
| Barometric pressure, humidity | BUILDING-NOW | A capture | now | weather | feature | T3 | NWS | NONE | one analyst's early-career signature only | Kill if the field cannot be read from any free NWS endpoint within one build cycle, a genuine absence rather than merely unbuilt. Once captured: kill if the coefficient's 95 percent CI includes 0 at n greater than or equal to 100 rows over the wind-only baseline. | prediction-engine |
| Beat and coach reports | BUILDING-NOW | D gate | now | news | gate-veto | T1-capture | RSS, dark unless configured; the demo wire is fictional | `apps/web/lib/news/impact.ts`; `conviction/signals/beat-report.ts` | hand-set magnitudes; the classifier fires on generic verbs | Never a feature. As a gate: kill, demote to display, if the withheld set is not worse than the kept set over at least 100 fixture-clustered decisions, counting only corroborated (two or more distinct source) Insider, Beat or Verified items; a sample-marked row never enters the count. | data-ingestion |
| Narrative and incentive | BUILDING-NOW | D gate | now | narrative | gate-veto | T1-capture | tracker file, five entries, zero weight | `conviction/signals/narrative-incentive.ts`, inert | the revenge-game effect ran opposite to the hypothesis, interval excluding zero; game-level compounding was not detectable | Milestones and record chases: kill if a backtest against settled rows shows no effect at p greater than or equal to 0.05, the same test that already killed the revenge-game sub-case (effect ran opposite to the pre-registration, interval excluding zero). Contract incentives: no kill line can be written before a real source exists. Birthdays: kill if a backtest shows no effect at p greater than or equal to 0.05. | founder |
| Scheme, coverage, box counts | BUILDING-NOW | A capture | now | trenches | gate-veto | T1-capture | charting, share-alike | `conviction/signals/scheme-matchup.ts`, inert | the gap-label validity caveat applies to the whole genre | Kill if the withheld set is not worse than the kept set over at least 100 fixture-clustered decisions once nflverse coverage columns are reachable; a rate computed on fewer than MIN_SAMPLE_PLAYS snaps never votes regardless of the outcome. | founder |
| Officials and referee tendencies | BUILDING-NOW | A capture | now | situational | feature | T1-capture | nflverse officials, no table | mapper exists with no caller | none | Kill if a coefficient test over market plus team EPA returns a 95 percent CI including 0 at n greater than or equal to 100 officiated games with a named crew. | data-ingestion |
| Book agreement | BUILDING-NOW | D gate | now | gate | gate-veto | T1 | odds table | `conviction/signals/book-agreement.ts` | thresholds hand-set; the scorer already requires a consensus floor, so a contradiction rarely fires | Kill, mark redundant, if it never changes a verdict over 100 logged fixture-clustered decisions once gate_decisions actually persists reads. | prediction-engine |
| Team EPA per play, dropback and rush | BUILDING-NOW | A capture | now | efficiency | feature | T2 | nflverse CC-BY 4.0 | `gse-lab/team_metrics_*.csv` | computed this lab cycle with documented filters | Kill, as a candidate coefficient, if the EPA per play coefficient's out-of-fold log-loss lower bound over the market-only baseline is not above zero at n greater than or equal to 100 rows per stratum. Rush EPA specifically is expected near zero and is dropped the moment its interval crosses zero. | data-ingestion |
| Success rate | BUILDING-NOW | A capture | now | efficiency | feature | T2 | nflverse | lab CSVs use one convention, `expected-metrics/success-rate.ts` uses another | stabilizes faster than EPA, correlates lower | Kill if, on the one pinned convention, the coefficient's 95 percent CI includes 0 at n greater than or equal to 100 rows over market plus team EPA. A row computed under a second convention is refused at write, never silently mixed with the first. | data-ingestion |
| CPOE and average depth of target | BUILDING-NOW | A capture | now | quarterback | feature | T2 | nflverse | `gse-lab/qb_aggressiveness_*.csv` | the upstream completion-probability feature list is unverified | Kill if the CPOE and aDOT coefficients' 95 percent CI includes 0 at n greater than or equal to 100 rows over market plus team EPA, with throwaway attempts excluded from comp percent, expected comp percent and CPOE exactly as documented, since cp is NA on every throwaway in nflverse. | prediction-engine |
| Composite quarterback score | BUILDING-NOW | G surfaces | n/a | quarterback | content-only | T2 | nflverse | `nfl-adv/composite-qb.ts` | an equal-weight composite invented here, no backtest | Content-only, no probability kill line applies under rule 1. It is retired only if it is ever presented as a ranking, or claimed to reproduce a named vendor's published metric; either is an immediate pull, not a backtest question. | frontend-app |
| Opponent adjustment and strength of schedule | BUILDING-NOW | C engine | n/a | efficiency | feature | T1 | `TeamGameEfficiency`; market win totals for the forward version | `opponent-adjusted.ts` | the single highest-value structural upgrade in the corpus | Kill if the opponent-adjusted EPA coefficient's out-of-fold log-loss lower bound over Elo plus market is not above zero at n greater than or equal to 100 rows per stratum. The dropback and rush split promotes separately, only through a refit, and is expected to show rush near zero. | prediction-engine |
| Early-season shrinkage toward a prior, defense shrunk harder | BUILDING-NOW | F trainer | n/a | head design | feature | T3 | own ratings plus market | NONE; `metrics/core/shrinkage.ts` is reusable | one vendor blends 83 percent prior on offense and 98 percent on defense in week 1 | Kill if the fitted shrinkage strength (priorStrength) is statistically indistinguishable from zero, 95 percent CI includes 0, or if out-of-fold log-loss in weeks 1 to 6 with shrinkage applied is not better than the unshrunk feature, per section 4's kill rule. | prediction-engine |
| Vendor metrics: grades, charted win rates, total points, coverage grades, catchable air yards, time to pressure, read progression | BUILDING-NOW | E rulers | now | proprietary | display | REJECTED | vendor terms | `nfl-adv/charting-refused.ts` (BRANCH) | we read and learn from public posts and never republish a vendor's output | Permanently REJECTED as an engine feature or a redistribution product, 0 exceptions, since PFF grades, ESPN's internal win-rate methodology and SIS Total Points have no licensed feed. The internal benchmark ledger itself carries no feature kill line, it is a spot-check log, not a predictive claim, and continues as long as public analyst posts exist to compare against. | founder |
| Pressure proxy and four-man rush rate | BUILDING-NOW | B feature store | now | trenches | feature | T2 | nflverse plus charting | `gse-lab/rush_pressure_*.csv`; `nfl-adv/pressure-to-sack.ts` (BRANCH) | the proxy has no hurry column and runs two to three points high against a public chart | Coefficient 95 percent interval crosses zero, or the fixture-clustered out-of-fold log-loss lower bound versus team EPA v1 alone is at or below 0, at n at least 100. Proxy already measured running 2 to 3 points high against a public chart with no hurry column, so any use stays labelled a proxy and sacks are never extrapolated from it. | data-ingestion |
| Explosive-play rate and differential | BUILDING-NOW | B feature store | now | situational | feature | T2 | nflverse | lab CSVs | qualitative only | Coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound at or below 0 versus team EPA v1, at n at least 100, with the yardage threshold convention fixed before the first test. | prediction-engine |
| EPA distributions and chunk share | BUILDING-NOW | G surfaces | now | situational | display | T2 | nflverse | `gse-lab/epa_distributions_*.csv` | none | Stays display only until a tail-shape hypothesis is pre-registered with n at least 100 fixture-clustered rows and its own kill line. Data-integrity check: 0 discrepancy tolerance between the persisted n column and the filtered play count used to build team_metrics for the same team and season. | data-ingestion |
| Expected turnover differential | BUILDING-NOW | B feature store | now | turnover | feature | T2 | nflverse | `gse-lab/turnover_luck_*.csv` | recovery is near-pure noise year to year; occurrence is weakly repeatable; one 2025 team forced 19 fumbles and recovered 26.3 percent against a league 46.3 | Coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound at or below 0, at n at least 100. Recovery share is regressed to the measured league mean of 46.3 percent and never carried forward as skill; raw turnover margin and recovered fumbles never enter as a feature. | prediction-engine |
| Interception-worthy throw rate | BUILDING-NOW | G surfaces | now | turnover | display | T2 | charting via nflverse | lab CSV | 52.3 percent of flagged throws became interceptions in the measured sample | 52.3 percent of flagged throws became interceptions in the measured sample (already recorded). Stays display and research only, permanently, under the L7 share-alike model-ineligibility rule, never re-tested as a feature unless the founder changes the commercial posture on FTN-derived share-alike content in a served feature. | founder |
| Stuff rate, computed tackles for loss, havoc components | BUILDING-NOW | G surfaces | now | trenches | display | T2 | nflverse | lab CSVs | there is no standard havoc definition | Stuff rate and computed TFL ship now, 0 blockers. Havoc as a named composite is pinned only once one convention is fixed; if two independently computed havoc conventions on the same week disagree on more than 15 percent of classified plays, the havoc label is pulled from display until one convention is pinned. | data-ingestion |
| Drive-outcome rates | BUILDING-NOW | B feature store | now | situational | feature | T2 | nflverse, unfiltered | `gse-lab/drive_stats_*.csv` | league 2.10 points per drive, 24.0 percent touchdown, 20.4 percent three-and-out | Coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound for totals at or below 0, at n at least 100. League baseline already measured: 2.10 points per drive, 24.0 percent touchdown rate, 20.4 percent three-and-out rate, 11.1 percent turnover-drive rate. | prediction-engine |
| Situation-neutral pace | BUILDING-NOW | B feature store | now | situational | feature | T3 | nflverse | NONE | rated high for totals, no number | Totals coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound for totals at or below 0, at n at least 100, using one pre-registered neutral-script filter, for example score differential within 8 points and outside the final 2 minutes of either half, fixed before the first test. | prediction-engine |
| Early-down success, late-and-close EPA, air versus yards-after-catch split | BUILDING-NOW | B feature store | now | situational | feature | T2 | nflverse | `gse-lab/down_splits_*.csv` | early-down efficiency predicts; raw third-down conversion is near-meaningless; late-and-close carries 50 to 80 plays a season | Early-down success and the air versus YAC split: coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound at or below 0, at n at least 100. Late-and-close EPA stays content only, carrying its own n (50 to 80 plays per team per season measured), never promoted below n equals 100 fixture-clustered rows. Raw third-down conversion stays permanently rejected as a feature, 0 exceptions. | prediction-engine |
| Weekly form and unit matchups | BUILDING-NOW | B feature store | now | situational | feature | T2 | nflverse | `gse-lab/weekly_trends_2025.csv` | recency is systematically over-weighted | Kill, expected result, if the weekly-form term's 95 percent interval crosses zero once season-to-date opponent-adjusted EPA is already in the model, at n at least 100 fixture-clustered rows. Recency is already suspected of being systematically over-weighted, so a null result here is the expected outcome, not a surprise. | prediction-engine |
| League percentiles | BUILDING-NOW | G surfaces | now | display | display | T2 | lab CSVs | `compute_advanced_metrics.py:41-50` | **double inversion confirmed this session**: for a lower-is-better metric the rank is computed descending and then inverted again, so the worst team reads 100 | Retract every existing percentile claim from these files until regenerated. Regression test must assert the best team reads 100 for both higher-is-better and lower-is-better metrics with 0 tolerance. | testing-qa |
| Special-teams EPA | BUILDING-NOW | B feature store | now | special teams | feature | T2 | nflverse | `gse-lab/special_teams_*.csv` | about a 2 percent error improvement in one published study | Kill if the paired improvement in out-of-fold log-loss after opponent adjustment does not clear the approximately 1.9 percent RMSE-improvement benchmark from the cited Wharton study, at n at least 100 fixture-clustered rows. | prediction-engine |
| Kicker distance buckets | BUILDING-NOW | G surfaces | now | special teams | content-only | T2 | nflverse | `gse-lab/kicker_metrics_*.csv` | league 85.6 percent field goals, 95.9 percent extra points | Stays content only permanently, never a pick input, while the engine's pick-type enum carries no prop market, a structural fact, not a founder-blocked item. League baseline already measured: 85.6 percent field goal rate, 95.9 percent extra point rate; re-verify on each refresh with 0 percentage-point tolerance for a stale reproduction. | data-ingestion |
| Script-adjusted volume, garbage-time ratio | BUILDING-NOW | G surfaces | now | situational | content-only | T2 | nflverse | props workstream | measured 8 to 12 point swings | Promotion from a lean to an edge requires out-of-sample correlation at least 0.15 between the measured 8 to 12 point swing and closing-line error, over n at least 100 player-games backtested against 2025 Weeks 1 to 18 closing prop lines. Until then leans stay labelled hypotheses, 0 edge claims. | data-ingestion |
| Coaching aggressiveness prior | BUILDING-NOW | B feature store | now | situational | feature | T1 | nflverse plus own win probability | `expected-metrics/win-probability.ts` | the cited points-per-game figure has no primary source | The cited 0.5 to 1.5 points per game estimate is NOT VERIFIED, no primary source located. Pre-register a fresh kill line before the first test: coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound at or below 0, at n at least 100. Never cite the unverified points-per-game figure as fact again. | prediction-engine |
| Red-zone trip rate | BUILDING-NOW | B feature store | now | situational | feature | T3 | nflverse | NONE | conversion is near-noise, trip rate is the sticky part | Trip rate only, never conversion rate, since conversion is near-noise per the cited critique. Coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound at or below 0, at n at least 100. | prediction-engine |
| Formation usage, EPA by run gap | BUILDING-NOW | G surfaces | now | situational | content-only | T2 | nflverse | `nfl-adv/{formation-usage,epa-rush-gap}.ts` | gap labels do not identify the responsible blocker and mislabel outside-zone runs | Never ships without the gap-mislabel caveat (NFL gamebook gap calls mislabel outside-zone runs). If the re-land introduces a second, disagreeing gap-labeling convention, the chart is pulled until one convention is pinned, 0 tolerance for silent convention drift. | prediction-engine |
| First-down quadrants, ownership leverage, survivor expected value | BUILDING-NOW | G surfaces | now | player and content | content-only | T2 | branch modules | `nfl-adv/*` | documentation and code disagree on one statistic | Re-land blocked until the documentation-versus-code disagreement on the one flagged statistic resolves to a single number, and the 3 repo-root test failures (a CSV path issue) go to 0. Survivor expected value must consume the market or the head probability only, never raw confidence, checked by a negative-control test. | frontend-app |
| Tracking summary columns | BUILDING-NOW | A capture | now | player | display | T1 | `NextGenStat` | `apps/web/lib/ingestion/next-gen-stats.ts` | rushing efficiency weakly predicts wins | If NextGenStat capture goes stale beyond its cron window with no monitor catching it, the same failure mode that let the line archive die silently for 3 weeks, the reader must go silent, return null, never neutral, 0 tolerance for a silent stale read. | data-ingestion |
| Fantasy points over expectation, similarity projections, air-yards decomposition | BUILDING-NOW | G surfaces | now | player | content-only | T2 | nflverse reproducible; share-alike derivatives barred | NONE | the props workstream produced 12 leans, all inside their bands, nothing actionable | The props workstream's 12 leans over the Bills-Lions sample were all inside uncertainty bands, nothing actionable (recorded fact). Stays content only until a backtest against 2025 Weeks 1 to 18 closing prop lines shows out-of-sample correlation at least 0.15 between the gap and line error, over n at least 100 player-games. | frontend-app |
| Founder factor engine | BUILDING-NOW | G surfaces | now | founder lane | display | T2 | store rows | `apps/web/lib/founder-picks/factors.ts` | weights unbacktested; the consensus factor boosts in both directions | Fix the both-directions consensus-boost defect, confirmed present in factors.ts, before any wiring. Weights stay unbacktested and display-only, never attaching model confidence to a founder pick, until a backtest shows the factor engine's own ranking beats a random baseline at n at least 30 founder-graded picks. | frontend-app |
| Unreachable proprietary indices and wrappers | BUILDING-NOW | C engine | n/a | legacy | content-only | REJECTED | n/a | `metrics/**`, `gse-score/**`, `nfl/*` wrappers, `no-bet-adversary.ts` | customer-facing vocabularies with no reachable computation | 0 non-test importers today for 3 of the 4 named groups, confirmed this session by a barrel-export grep against packages/prediction-engine/src/index.ts. Kill, permanently quarantine, never rebuild under the old name, any wrapper that, once moved to a research path with a README, still has 0 source and 0 test within one build cycle. Re-entry requires a real source and a test, never a name alone. | testing-qa |
| Social sentiment and analyst reads | BUILDING-NOW | G surfaces | now | social | content-only | REJECTED | public posts | NONE | proprietary charts are not republishable | Permanently REJECTED as an engine feature, 0 exceptions, since proprietary charts are not republishable. The content-only citation log has no feature kill line, it is attribution bookkeeping, not a predictive claim, and it retires only if the content pipeline that would consume it is itself retired. | founder |
| Ranking blend (0.7 independent plus 0.3 confidence) | BUILDING-NOW | D | now | legacy | feature | T1 | internal, derived from the independents and the legacy composite | `ranking-prob.ts` | monotone overall, yet it ordered the smallest positive edge first on the 2026-09-13 slate | Any single observed rank inversion, a lower-edge row outranking a higher-edge row, such as confidence 91 at plus 0.0217 edge outranking confidence 85 at plus 0.2257 edge, freezes further tuning; fully superseded once the market-anchored head ships. | prediction-engine |
| Market movement and adverse steam | CAPTURING-NOW | D | now | market | gate-veto | T1-capture | `odds_line_snapshots` | `conviction/signals/market-movement.ts`; `hawkes-steam.ts` shadow | no rows to evaluate; no staleness monitor | Over at least 100 fixture-clustered decisions, a withheld-set lower bound at or below 0 relative to the kept set demotes this to display. | data-ingestion |
| Second cleared book, multi-book consensus | CAPTURING-NOW | A | now | market | feature | T1-capture | TheRundown rationed; Kalshi via PredExon needs env and key | `market-read.ts`; `galaxy-kalshi-book.ts` | corpus found no public sharp-book numbers | Paired Brier of multi-book against single-book at or below 0: keep single-book. | data-ingestion, founder |
| Weather at kickoff | CAPTURING-NOW | A capture | now | weather | feature | T1-capture | NWS public domain; the hosted alternative's tier is disputed between registries | `apps/web/lib/weather/game-weather.ts`; no signal writer | the market prices weather by kickoff; the cold-and-wind interaction hypothesis was killed with the sign reversed | Kill (totals feature) if the wind-mph coefficient's 95 percent CI includes 0 at n greater than or equal to 100 outdoor-venue rows, or if ablation does not worsen out-of-fold log-loss on totals. Never a flat wind-to-points term regardless of the result. | data-ingestion |
| Props hierarchical-Bayes stack | CAPTURING-NOW | C engine | now | props | content-only | T1-capture | prop rows | about 30 files with no live consumer | no closing-line backtest exists | If the stack's projected prop probabilities show no out-of-sample correlation with closing-line error, r below 0.15, over n at least 100 player-game props once the archive holds enough weeks, the stack is retired from the wire-candidate list and kept as a research artifact only. | founder |
| Baseball underlying (batted-ball quality, sprint speed) | CAPTURING-NOW | A capture | now | independent (MLB) | feature | T1-capture | Savant, use-with-caution, absent from the app registry | `apps/web/lib/statcast/index.ts` ORPHAN | none | Coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound at or below 0, at n at least 100 as-of rows with a starting-pitcher join. | data-ingestion |
| Basketball rest and minutes loader | CAPTURING-NOW | A capture | now | schedule | feature | T1-capture | ESPN public | `apps/web/lib/nba/rest.ts` ORPHAN | none | Kill, delete the module, if it cannot be folded into the shared games-table rest spine without duplicating game-context.ts's rest logic within one build cycle. Once folded and capturing, coefficient 95 percent interval crosses zero, or fixture-clustered out-of-fold log-loss lower bound at or below 0, at n at least 100, kills the feature itself. | data-ingestion |
| Founder picks | CAPTURING-NOW | G surfaces | now | separate track | content-only | T1 | owner input | `apps/web/lib/founder-picks/create.ts` | decided-only record | n/a for head training or eligibility, by permanent structural rule, not a block: this track never enters either. The only live metric, the decided-only win rate, needs n at least 30 graded founder picks before it is meaningfully reported; currently n equals 1 (the 2026-09-13 Mooney call, VOID and ungraded, never posted). | founder |
| Shin de-vig | SHADOW-NOW | F | now | market | display | T1 | same | `honesty/devig-method-compare.ts` | paired difference 0.0022, t 1.80 | Reopen the method swap only if the paired lower bound rises above 0 at n at least 1000; today's t of 1.80 keeps the swap decided against. | prediction-engine |
| Shadow team-strength posterior, steam, information bits | SHADOW-NOW | E | now | independent | feature | T1 | `ShadowSignal` | `pipeline/live-orchestrator.ts` | never read by anything | After at least 100 rows per stratum, a lower bound at or below 0 on paired Brier against the current head retires the shadow pass. | prediction-engine |
| Exchange prices (Kalshi, Polymarket) | FOUNDER-BLOCKED | A | n/a | market | feature | REJECTED | see registries | `polymarket-independent-client.ts` | direct Kalshi path can never fire under current rights | Stays closed at 0 until a rights ruling reopens it; the legal PredExon-mediated route is a different source, tracked at the second-cleared-book row, not this row. | founder |
| ESPN Power Index | FOUNDER-BLOCKED | E | n/a | independent | feature | T1 | licence flag default closed | `espn-powerindex.ts` | market-anchored prior, so partly the market | Stays inert at 0 until ESPN_POWERINDEX_LICENSED is set; once licensed, a display, or a feature only if divergence from the market is material and a 95 percent CI excludes 0. | founder |
| Prop alignment | BUILDING-NOW | D gate | now | gate | gate-veto | T1-capture | prop rows in the archive | `conviction/signals/prop-alignment.ts` | the wired fantasy props surface carries a fictional pool | No kill line can run before EVENT_ODDS_INGEST_ENABLED and LINE_ARCHIVE_ENABLED are both true and at least 100 games of real, non-illustrative prop lines exist in OddsLineSnapshot. Once that sample exists: kill if the withheld set is not worse than the kept set over it. | data-ingestion |
| Market-regressed Elo (public nfelo style) | KILLED | E | n/a | independent | display | REJECTED | open source | NONE | regressed toward market spreads by construction | 0 additional evidence required: regressed toward market spreads by construction, so it cannot serve as a market-blind referee, a structural disqualification, not a data test. | prediction-engine |
| Legacy composite confidence | KILLED | C | n/a | legacy | display | REJECTED | `picks.confidence` | `scoring.ts` three sums | at 80 and above, n 235, claims .8663 and realizes .5191, z -10.7; peaks at 75-79 (.6146) and falls to .4643 at 90-94 | Already crossed: z equals negative 10.7 at confidence 80 and above, n 235; realized win rate falls from 0.6146 at 75 to 79 to 0.4643 at 90 to 94, an inversion at the top. | founder (bump) |
| Isotonic calibrator on confidence | KILLED | F | n/a | legacy | display | REJECTED | settled picks | `calibration-apply.ts` | pooled-adjacent-violators is monotone; the score is inverted at the top | 0, structural: pooled-adjacent-violators regression is monotone non-decreasing by construction, and the input score is inverted at the top, so it cannot repair what it is given. No amount of additional data changes this. | founder (flag stays off) |
| Logistic head on the confidence vector (v5.3.0 prototype) | KILLED | F | n/a | legacy | feature | REJECTED | `factorBreakdown` | NONE in repo | test log-loss 0.6678 against 0.7608 for identity, never compared against the market on the same rows | 0: structurally rejected by this document's own section 1 plan changes, which reject confidence becoming the calibrated probability inside the composite. Its only input, Legacy composite confidence, already measures z equals negative 10.7. | prediction-engine |
| Kelly and stake sizing | KILLED | G | n/a | method | content-only | REJECTED | n/a | `kelly.ts`, `robust-kelly.ts` | n/a | 0: permanently zero public surfaces. A policy kill matching the product's standing responsible-gambling posture, not a data test that could someday pass. | founder |
| Move-37: W1 spectral EPA, W2 Wasserstein play-mix, W4 adaptive coaching | KILLED | F | n/a | research | feature | REJECTED | nflverse play-by-play, lab-computed | `docs/research/move37/` (BRANCH) | each crossed its own pre-registered kill line: W1 test increment -0.0212 sign reversed, W2 test r 0.0112 against a required 0.15, W4 test -0.031 at 2.6 sd sign reversed | Already crossed. Re-admission needs a new pre-registration naming the prior kill | prediction-engine |
| Move-37: W3 Fisher-Rao tempo | KILLED | F | n/a | research | feature | REJECTED | nflverse play-by-play | `docs/research/move37/` (BRANCH) | accepted as killed WITHOUT COMPUTE, per the family table | Re-run once before the kill is treated as measured. A kill without compute is a decision, not a measurement | prediction-engine |
| Move-37: IRL Prelec probability weighting | SHADOW-NOW | F | now | research | feature | T2 | nflverse play-by-play, lab | `docs/research/move37/` (BRANCH), REPAIR-03 `move37_irl_prelec.py` | QUARANTINED, repair supplied, lab executing; the prior CARA design returned 73.70 percent accuracy against a 79.07 percent position baseline, NULL | Pre-registered: alpha in [0.5, 0.9]; kill if alpha outside (0, 1.5] or absolute alpha minus 1 below 0.02 | prediction-engine |
| Move-37: T3 HMM form regimes | BUILDING-NOW | F | now | research | feature | T2 | nflverse play-by-play | `docs/research/move37/` (BRANCH) | READY FOR LAB REVIEW; D1 to D8 repaired, prior art cited | Lab AIC/BIC plus a shuffle gate. Dies if it fails either | prediction-engine |
| Move-37: T7 persistent homology | BUILDING-NOW | F | now | research | feature | T2 | nflverse play-by-play | `docs/research/move37/` (BRANCH) | READY FOR LAB REVIEW, likely null by the theorist's own estimate | Run once with Null A and Null B. Do not rescue | prediction-engine |
| Move-37: T9 causal forest fourth-down | BUILDING-NOW | F | now | research | feature | T2 | nflverse play-by-play | `docs/research/move37/` (BRANCH) | READY FOR LAB REVIEW; Y is play-level WPA, punt and FG split | Gate 2.5e-5, which needs pilot verification first because N-46 and N-47 are unsourced | prediction-engine |
| Move-37: W5 Wasserstein barycenter, W6 DFA, W7 intrinsic dimension, W8 permutation entropy | BUILDING-NOW | F | now | research | feature | T3 | nflverse play-by-play | `docs/research/move37/` (BRANCH) | NEW, proposed, awaiting lab review; W8 is the theorist's own weak bet | Each carries its own pre-registered duel and kill: W5 below 0.02 R2 vs rolling-EPA(4), W6 below 0.01 vs mean-EPA, W7 below 0.02 vs distinct play-type count, W8 below 0.02 vs pass_oe | prediction-engine |
| Pressure-to-sack conversion, individual sack props | KILLED | D gate | n/a | trenches | gate-veto | REJECTED | charting | NONE | conversion luck explains under half a percent of variance | R squared below 0.005 (PFF measurement, cited repeatedly in AGENTS.md). Re-admission requires a new pre-registration naming this kill and citing a different measured R squared at or above 0.05. | n/a |

| Mixed-effects EPA attribution (QB, coaching, opponent, supporting cast) | BUILDING-NOW | C | now | efficiency | feature | T1 | nflverse play-by-play, CC-BY-4.0, model training allowed | NEW `packages/prediction-engine/src/nfl/epa-attribution.ts` | named in AGENTS.md ENGINE BENCHMARK: SP+ AND MIXED-EFFECTS EPA ATTRIBUTION; no decomposition exists in the engine today | Random-effect variance for the QB term indistinguishable from zero, or no out-of-fold log-loss gain over team EPA alone | prediction-engine |
| SP+ style forward rating with weekly-decaying preseason prior | BUILDING-NOW | C | now | efficiency | feature | T1 | nflverse, plus a market-derived preseason prior | NEW | tempo and opponent adjusted, priors phase out weekly; three citable early-season schemes exist (DVOA 50/30/20, DAVE 83/98, the coverage 83 percent fade) | Prior schedule that beats none of the three on out-of-fold log-loss dies | prediction-engine |
| Coverage-defender grades: opponent-adjusted yards per route allowed | FOUNDER-BLOCKED | C | n/a | coverage | feature | T3 | GENUINELY ABSENT. Needs per-defender route counts and targets faced. nflverse does not carry defender routes, and FTN charting is play-grain (play action, RPO, screen, motion, defenders in box), not defender-route grain | NONE | AGENTS.md ENGINE BENCHMARK: COVERAGE DEFENDER GRADES describes a third-party product, not a dataset we hold | Cannot be tested. Unblocks only if a cleared source carrying defender routes is found; the 83 percent early-season fade blend is portable to our own splits regardless | data-ingestion |
| Box-count and personnel matchup features (RB vs front, pass rate vs box) | BUILDING-NOW | C | now | trenches | feature | T1 | FTN charting and pbp_participation via nflverse, CC-BY-SA-4.0, internal modeling clean per the 2026-07-16 verdict | NEW | defenders in box and personnel are CONFIRMED columns of both datasets; this is the half of the old combined row that the data actually supports | Coefficient interval crosses zero on the first refit, or plays per matchup cell below the stated floor | prediction-engine |
| Receiver versus defender matchup features (WR vs CB) | FOUNDER-BLOCKED | C | n/a | coverage | feature | T3 | GENUINELY ABSENT. Needs per-defender route and coverage assignment data that neither nflverse nor the FTN subset carries | NONE | separated from the box-count row above, which IS buildable; combining them hid the fact that only one half has data | Cannot be tested until a cleared assignment-level source exists | data-ingestion |
| Time to pressure, as an OL versus DL timing feature | FOUNDER-BLOCKED | C | n/a | trenches | feature | T3 | GENUINELY ABSENT. Requires snap-to-pressure timing. AGENTS.md:2277-2279 records that there are NO hurries in nflverse or FTN, so our pressure measure is a sack-and-hit FLOOR proxy with no timing dimension | NONE | the FTN-branded leaderboard in the benchmark notes is a vendor product we cannot reproduce from the data we hold | Cannot be tested. Unblocks only with a cleared timing source | data-ingestion |
| QB read progression, primary versus secondary reads | CAPTURING-NOW | A | now | quarterback | feature | T1-capture | FTN or FantasyPoints charting; read number is NOT in nflverse | NEW capture only | AGENTS.md ENGINE BENCHMARK: QB READ DISTRIBUTION; the scramble-counting convention differs between vendors and must be pinned before any comparison | Log first, test when n arrives. Dies if the coefficient interval crosses zero at the stated n | data-ingestion |
| Formation usage by efficiency (under centre versus shotgun and pistol) | BUILDING-NOW | C | now | efficiency | feature | T1 | nflverse carries shotgun and no_huddle flags today | NEW | AGENTS.md ENGINE BENCHMARK: UNDER-CENTER USAGE X EFFICIENCY; the splits were never built although the flags exist | Coefficient interval crosses zero on the first refit | prediction-engine |
| Multi-book vig-free consensus, synthetic hold, arbitrage and middle scanner | BUILDING-NOW | E | now | market | width-input and display | T1 | the odds table, already persisted per book | NEW | AGENTS.md ENGINE BENCHMARK: VIG-FREE CONSENSUS AND MARKET TOOLING; the conjunction gate compares against ONE de-vigged source and there is no multi-book consensus feed | Not a probability, so no kill line applies; it dies if synthetic hold cannot be computed per book | prediction-engine |
| Draft-pick value priced by second-contract salary outcomes | BUILDING-NOW | C | now | roster | content-only | T3 | OverTheCap style public salary data, rights unread | NEW | AGENTS.md ENGINE BENCHMARK: FITZGERALD-SPIELBERGER DRAFT VALUE CHART; never touches a pick | Content only. Dies if the salary source has no clearance | content-publishing |
| Survivor and best-ball expected value from a weekly win-probability grid | BUILDING-NOW | G | now | product | display | T1 | our own ratings | NEW | AGENTS.md ranked build target 5; we have no forward win-probability surface to power it | Display only, carries its own n; never presented as a certified probability | frontend-app |
| DFS ownership leverage (projected optimal share minus projected ownership) | BUILDING-NOW | G | now | product | display | T2 | our own projections plus a public ownership source, rights unread | NEW | AGENTS.md ENGINE BENCHMARK: DFS OWNERSHIP LEVERAGE MODEL; we have no ownership modelling at all | Display only. Dies if no cleared ownership source exists, in which case the factor does not fire | frontend-app |

### 5.1 Every blocked and killed row, with its blocker named

A row may leave BUILDING-NOW, CAPTURING-NOW or SHADOW-NOW only by naming a founder
rights ruling, a founder environment flag, a genuinely absent source, or a recorded
measurement. Here is every one of the ten, with its reason. If a future revision parks a
row without an entry in this list, that revision is wrong.

- Exchange prices (Kalshi, Polymarket): founder rights ruling. Direct Kalshi access is barred by Kalshi Developer Agreement section 3, and Polymarket sits under a standing compliance hold per this repo's polymarket-hold skill; the legal PredExon-mediated route is tracked separately under Second cleared book, multi-book consensus.
- ESPN Power Index: founder env flag. ESPN_POWERINDEX_LICENSED is unset and the module is gated fail-closed by design; only the founder may set it.
- Market-regressed Elo (public nfelo style): recorded measurement kill. By construction it is regressed toward market spreads, so it cannot serve as a market-blind referee; a structural disqualification, not a data test.
- Legacy composite confidence: recorded measurement kill. At confidence 80 and above, n 235, it claims 0.8663 and realizes 0.5191, z equals negative 10.7, and realized win rate falls from 0.6146 at 75 to 79 to 0.4643 at 90 to 94, an inversion at the top.
- Isotonic calibrator on confidence: recorded measurement kill, structural. Pooled-adjacent-violators regression is monotone non-decreasing by construction and the input score is inverted at the top, so it cannot repair what it is given; a mathematical property, not an empirical result awaiting more data.
- Logistic head on the confidence vector (v5.3.0 prototype): recorded measurement kill. Its only input, Legacy composite confidence, already measures z equals negative 10.7, and this document's own section 1 plan changes already reject confidence becoming the calibrated probability inside the composite.
- Kelly and stake sizing: recorded measurement kill, structural and policy. Rejected from every public surface by the product's standing responsible-gambling posture; a policy rule, not a data test.
- Move-37 families: recorded measurement kill. Four of eight named sub-families already crossed their own pre-registered kill line: IRL 73.70 percent accuracy against a 79.07 percent position baseline, NULL; W1 test increment negative 0.0212, sign reversed; W2 test r 0.0112 against a required 0.15; W4 test negative 0.031 at 2.6 standard deviations, sign reversed. The remaining T3, T7, T9 sub-families are not killed and are tracked as a separate BUILDING-NOW lab-review task in this row's note.
- Prop alignment: founder env flag. EVENT_ODDS_INGEST_ENABLED and LINE_ARCHIVE_ENABLED are both unset in Vercel Production, named as still-open founder actions in AGENTS.md. apps/web/lib/conviction/signals/prop-alignment.ts returns null on every candidate and cannot hold or publish anything until both flip and a caller constructs it with live:true. Code, contract and tests are otherwise complete, confirmed by reading the file.
- Pressure-to-sack conversion, individual sack props: a recorded measurement kill. PFF's measurement shows pressure-to-sack conversion luck explains under 0.5 percent of variance (R squared below 0.005), cited repeatedly in AGENTS.md, so it is retained only as a veto rule against individual sack props and never as a predictive signal; re-admission requires a new pre-registration naming this kill and citing a different measured R squared at or above a stated floor.

### 5.2 What an adversarial compression pass found, and what it changed

One of three lenses run against this plan asked a single question: is it still too narrow.
It was. Its findings are applied above, and recorded here because the failure mode it
catches is the one that produced ten months of non-compounding work.

**Blocker, fixed.** The registry carried `Move-37 families` as ONE row, verdict KILLED. The
founder's own family table in AGENTS.md, dated 2026-09-14, shows twelve sub-families of
which only four are killed: W1, W2 and W4 crossed their own pre-registered kill lines and
W3 was accepted as killed WITHOUT COMPUTE. IRL is quarantined with a repair executing, T3,
T7 and T9 are ready for lab review, and W5 through W8 are proposed. Killing a live
twelve-family programme with one line is exactly the compression this rebuild exists to
undo. Split into seven rows carrying each family's real status and its own kill line,
including W3 flagged as a kill that was never actually computed.

**Prop alignment was blocked on flags that are already on.** The row named
`EVENT_ODDS_INGEST_ENABLED` and `LINE_ARCHIVE_ENABLED` as its blockers. AGENTS.md:776-777
records both as ON, the first founder-confirmed by screenshot on 2026-09-12 and the second
under C-62. AGENTS.md:437 separately says prop alignment is "inert pending
`EVENT_ODDS_INGEST_ENABLED`", so the standing notes contradict themselves. Under the rule
that a row is only parked when a blocker can be named, and the flags are recorded as set,
the row is BUILDING-NOW behind its own n floor of 100 games of real, non-illustrative prop
lines. One founder sentence settles the contradiction either way, and the capture costs
nothing if the answer is that the flags are off.

**Eleven capabilities had no row at all.** Every one is named in the founder's own
ENGINE BENCHMARK notes and none had reached this registry: mixed-effects EPA attribution
separating quarterback, coaching, opponent and supporting cast; an SP+ style forward rating
with a weekly-decaying prior; coverage-defender grades as opponent-adjusted yards per route
allowed; coverage and box-count MATCHUP FEATURES as distinct from the withhold-only gate of
the same name; time to pressure as a timing feature distinct from our sack-and-hit floor
proxy; quarterback read progression; formation usage by efficiency, which is buildable
today because nflverse already carries the shotgun flag; multi-book vig-free consensus with
synthetic hold and a middle scanner; salary-outcome draft-pick valuation; survivor and
best-ball expected value; and DFS ownership leverage. Added with roles, tiers, sources and
kill lines.

**The coverage family is a feature family, not only a veto.** The registry had coverage and
box counts as gate-veto only. Combined with the FTN rights correction in 5.3, which
establishes that internal modeling on share-alike charting is clean and is the named
approved route for exactly these signals, the feature companion is buildable now. That
single pairing is the largest capability unlock in this revision.

**Smaller, applied:** conformalized quantile regression was tagged to the trainer track
although the fix belongs to the rulers track and the display to surfaces, so it is retagged
to E. The Kelly row's justification read "policy, not a data test", which is not one of the
four sanctioned parking reasons; it is a founder product-policy ruling and is labelled as
one.

**Not yet applied, and named rather than hidden.** The lens observed that this document has
still never been crossed line by line against the founder's own benchmark completeness
audit of 2026-09-17, which counted 73 missing items. Eleven of them are now rows. The
remainder is a real open task and belongs in section 11 rather than in a claim that the
registry is complete. Two other rows, ClubElo and public money splits, are marked
BUILDING-NOW without an owning workstream naming them; each needs either a workstream or an
explicit statement that no cleared source exists yet.

### 5.3 The FTN share-alike ruling, read against the primary source

The committed document said FTN charting-derived columns are "model-ineligible by
construction until the founder rules." That is wrong, but an earlier draft of this section
then over-corrected in the other direction and claimed the whole trench and coverage
family was unblocked. Both readings are replaced here by the primary source, which is
`reports/rights/pfr-advstats-verdict-2026-07-16.md`, the verdict the registry itself cites.

**What the verdict actually says.** Its headline is "YELLOW (internal modeling) / RED
(public commercial display)" and it names the route explicitly:

> Approved route for trench/coverage signals: FTN charting via `load_ftn_charting()`
> (2022+), explicit CC-BY-SA-4.0 from the rights holder, attribution "FTN Data via
> nflverse". Internal modeling with attribution is clean now; PUBLIC display of derived
> metrics inherits the same share-alike legal review already open for ffverse.
> Participation data (personnel/box counts) is the same clean CC-BY-SA lineage.

So the split is real, and it is narrower than "the trench and coverage family":

| Capability | Data we actually hold | Status |
|---|---|---|
| Defenders in box, box counts | `ftn_charting` and `pbp_participation`, both confirmed columns | Buildable now as a feature |
| Personnel groupings | `pbp_participation` | Buildable now as a feature |
| Play action, RPO, screen, motion | `ftn_charting` | Buildable now as a feature |
| Four-man rush rate | `ftn_charting` `n_pass_rushers`, already computed in the lab | Buildable now as a feature |
| Man versus zone coverage | Claimed by the verdict, NOT listed in this repo's own dataset description | Verify against the real file before building |
| True pressure rate with hurries | **Absent.** AGENTS.md:2277-2279 records no hurries in nflverse or FTN; our measure is a sack-and-hit FLOOR proxy | Not available |
| Time to pressure | **Absent.** Needs snap-to-pressure timing nobody here holds | Not available |
| Coverage-defender grades, yards per route allowed | **Absent.** Needs per-defender routes and targets faced; FTN is play-grain, not defender-route grain | Not available |
| Receiver versus defender matchups | **Absent.** Same missing assignment-level data | Not available |

The registry rows are corrected accordingly: the box-count and personnel half is
BUILDING-NOW, and the coverage-grade, time-to-pressure and receiver-versus-defender rows
are FOUNDER-BLOCKED under "genuinely absent source" rather than being quietly sourced to a
dataset that does not contain them.

**Two neighbours, stated precisely, because one is worse than a display restriction.**

- `pfr_advstats` is not merely display-restricted. Sports Reference LLC Terms of Use
  section 5(j) **explicitly bans using site statistics "for ... supporting machine learning
  methods used to predict, classify, label, or score", with no internal-use carve-out.**
  That is a MODELING ban. The registry entry is `permission_required` with
  `automation_allowed: false`, and the unlock named in the verdict is written confirmation
  from Sports Reference LLC covering both redistribution and the 5(j) restriction, and
  explicitly **not** from nflverse maintainers. Cronning
  `apps/web/lib/ingestion/pfr-adv-stats.ts` remains correct work because it already calls
  `checkClearance` and therefore fails closed and writes zero rows, and the document must
  say it writes zero rows rather than implying the data flows.
- `nextgen_stats` via nflverse is called out in the same verdict as "equally
  third-party-sourced with no explicit grant, not a safe substitute". Treat it as
  cautioned, not cleared, and never as the replacement for pfr_advstats.

**What is still the founder's, and what is not.** Internal modeling on FTN and
participation with attribution needs no new ruling; the verdict already grants it. What
remains open is PUBLIC display of derived share-alike metrics, which inherits the ffverse
legal review. A founder instruction to proceed is recorded as covering the internal
modeling route, which was already clean, and the display question stays open until that
review closes. Every output built on this lineage carries the attribution string
"FTN Data via nflverse".

### 5.4 Correction applied at assembly: Track C's C10 (remote ETKF ensemble)

Track C marks C10 founder-only, which is the right column, for the wrong reason. Verified
this session:

- `ModelEndpoint` is a TypeScript interface at
  `packages/prediction-engine/src/ensemble/remote-model-client.ts:73`. It is NOT a Prisma
  model and there is no `ModelEndpoint` table in `schema.prisma`. Any wording implying a
  table is wrong.
- The client is NOT an orphan. `pipeline/live-orchestrator.ts:56` imports it, and so does
  `apps/web/lib/news/rss.ts:5`.
- The service it would call is another matter. `gse-ml-service:8000` appears twice in the
  tree: as "the intended deployment target" in an SSRF doc comment
  (`remote-model-client.ts:175`), and as a fixture URL in
  `ensemble/__tests__/remote-model-client.test.ts:502`. The `/predict/etkf` path appears
  ONLY in that test.

So the honest status is: the client exists and is wired, and no agent can confirm from
this repository that the service exists or is deployed. C10 is therefore FOUNDER-BLOCKED
under "genuinely absent source", and the blocker is stated as such: the founder knows
whether `gse-ml-service` is deployed and no agent may probe production to find out. If it
is deployed, C10 becomes BUILDING-NOW with no further founder action. The document must
not imply a fit is waiting on the founder when the prior question is whether the endpoint
exists at all.

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
least two books. **Extending it to spreads and totals is NOT an agent task, and an
earlier draft of this section was wrong to imply it was.** `market-implied-display.ts:14-15`
records the moneyline-only scope as a shipped design decision, because spreads and totals
carry cover probabilities near 0.5 and deliberately show no percentage, and `:20` records
that removing the gate is the founder's call on the proposal. The founder either overturns
that decision or scopes the extension to rows whose cover probability sits far enough from
even money to be worth showing. Until then the moneyline scope stands. The head probability with its interval renders only on rows from certified
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

---

## 8. Build: seven concurrent tracks

### 8.1 Why this is not a sequence

The first version of this document was a nineteen step order in which roughly sixteen
steps waited behind three measurement fixes. Every one of those dependencies was
conventional rather than real. A measurement fix changes what a number *means*; it does
not change whether a table can be written, a log can be started, an estimator can be
wired, or a shadow score can be recorded. Sequencing build behind measurement is how ten
months of work failed to compound.

Three dependencies in this plan are real, and they are the only three:

1. **A head may not serve until its stratum certifies.** This is the one held line. It
   gates the serve hop and nothing before it.
2. **A veto may not withhold until its withheld set has been shown to grade worse.** A
   veto that fires before that test is a guess that costs picks. It may run, record and
   be measured from day one; it may not act.
3. **A closing-value claim may not be made until the same-book ruler exists.** Not
   because the work waits, but because the number is currently unattributable, so any
   claim built on it is unfalsifiable. The capture and the grade are built now; the
   claim waits for the ruler.

Everything else runs at once. The seven tracks below have no ordering between them.

### 8.2 The capture argument, stated once because it decides the shape

A signal that needs an as-of log accrues sample in wall-clock time and in no other way.
There is no backfill for an observation nobody recorded. If weather at kickoff starts
logging today, it has a season of rows by February; if it starts in February, it has
nothing, and the February decision to start it does not recover the intervening games.

This is the asymmetry that makes deferral expensive and capture cheap. Capture costs a
table write and a cron entry. Deferral costs every row that would have existed. The
correct default for any signal with a reachable source is therefore to start logging
immediately, with no gate, no flag and no dependency, and to decide later whether it is
worth anything. Frame rule 3 is not a preference. It is the only decision in this plan
that cannot be revisited later at the same price.

### 8.3 The loop that has never closed

The founder's standing frustration is that the work has not compounded. The reason is
not a shortage of signals or of ambition. It is that the learning loop was never closed.

A system improves continuously when a loop runs automatically: data lands, a model
trains, an eval scores it, the winner deploys, the deployment produces more data. Every
component of that loop already exists in this repository, and not one of them is wired
to a schedule:

| Loop stage | The component that exists | What it is reachable from today |
|---|---|---|
| Data lands | `edge-lab/asof-store.ts`, `packages/feature-store` | scripts; the store holds zero registered features |
| Model trains | `edge-lab/logistic.ts`, `logit-pool.ts`, `calibration-blend.ts` | scripts only |
| Eval scores it | `edge-lab/walk-forward.ts` (purge, embargo, sealed holdout), `placebo.ts` | scripts only |
| Multiplicity control | `edge-lab/trials-registry.ts` (hash chain, Benjamini-Hochberg) | never run |
| Admission verdict | `evidence-readiness-matrix.ts` (13 factor keys, trust, sample and age floors) | exported at `index.ts:168`, called by nothing at runtime |
| Winner deploys | `promotion/{evaluate,empirical-bernstein,clv-non-inferiority,integrity}.ts` | dark |
| Deployment produces data | `GameSignal`, `Signal`, `GateDecision` | one writer with two keys; no writer; no writer |

Read that table as the diagnosis: the engine is not missing parts, it is missing a
crank. Track F turns it, and the single most consequential line in this document is that
the trainer runs inside a cron or an owner route, never from an agent shell, because the
edge-lab harness has existed for months and has never run for exactly that reason.

### 8.4 Corrections a concurrent adversarial pass forced on these tracks

A second architect session ran its own three lenses over the same seven tracks and found
real defects. Its companion document is `docs/architecture/2026-09-18-parallel-build-plan.md`
(ledger ARCH-5). Its findings are folded in here rather than left in a side file, because
a correction nobody reads is not a correction. Each was checked against the tree before
being written down.

1. **Three tracks proposed one weather capability.** Two tracks specified near-identical
   new file paths for weather and officials, and a third proposed a different host for
   weather again. Three parallel paths to one capability is not concurrency, it is a merge
   conflict with extra steps. Collapse to one owner, hosted on the board filler that
   already runs four times an hour, rather than a new cron entry that needs founder review
   anyway.
2. **The officials work assumed a module that does not exist.** Both designs referred to
   "the existing officials mapper." There is none: `nflverse-source.ts:160-164` registers a
   bare `officials` dataset key with no caller. The real prerequisite is the game-id
   crosswalk, which also does not exist, so the officials row is sequenced after it rather
   than beside it.
3. **One surface item would have reversed a founder decision.** Extending the
   market-implied display to spreads and totals was framed as filling a gap. It is not a
   gap. `apps/web/lib/picks/market-implied-display.ts:14-15` records moneyline-only as a
   shipped decision, because spreads and totals carry cover probabilities near 0.5 and
   deliberately show no percentage, and `:20` records that lifting the gate is the
   founder's call. Section 7 is corrected accordingly.
4. **The signal assembly's host is not interchangeable.** The odds-refresh path and the
   board filler are not equivalent: the board filler's slate path is deliberately
   market-free by design, while the odds-refresh path carries the market. A signal
   assembly that needs the market names the odds-refresh path as its sole host.
5. **The admission block cannot be assumed to fit.** The calibration cron it would join
   already runs many stages inside a 300 second platform limit. Measuring that route's
   current wall-clock cost is part of the work and must be run, never assumed.
6. **The pass-decision withhold could not reach one market.** The totals scorer has no
   adverse-price call site at all, so an instruction to apply the new predicate "at every
   existing call site" would have left totals silently exempt. The totals path gets an
   explicit new call site and the regression test carries a totals fixture.
7. **The narrative family is two rows, not one.** Contract incentives genuinely have no
   source and stay founder-blocked. Milestones and record chases are buildable now from
   season statistics plus a citation-gated table of publicly documented thresholds.
   Parking all three together was exactly the confusion between "we cannot serve this" and
   "we cannot build this" that this rebuild exists to remove.

Smaller, and load-bearing:

- The shadow probability slot is a single field under one key per game and model version.
  Several track items proposed writing to it independently, which would clobber. A
  read-merge-write helper lands before any second writer ships.
- The `Signal` table carries no source name, trust level or bootstrap flag. Those live on
  `GameSignal` only. Any adapter must define how entity-level rows map into trust
  semantics rather than assuming fields that are not there.
- The book-depth term is not a constant. It scales with book count and saturates only
  above the ideal-book threshold, so the shadow experiment tests the saturating regime
  against the low-count regime rather than dropping the term.
- Several tracks edit the mint orchestrator. That file goes on a shared concurrent-edit
  list so the pull requests are sequenced deliberately instead of colliding at merge.
- The partial-mock count is 22 today and the standing note says nineteen. Any item citing
  it notes the drift, and the guard enumerates the files rather than asserting a number.


### 8.5 The seven tracks

**Path convention in the tables below, stated once and measured.** The rebuilt sections
cite 260 distinct file paths. **206 of them resolve on `main` today.** The other 54 do not
exist, and that is deliberate: they are the files these rows create. A path in an
`Entry files` column that does not resolve is the artifact the workstream produces, not a
citation error. Two specific exceptions, so nobody hunts for them: the `nfl-adv/*` modules
live on `origin/hermes/nfl-adv-metrics-2026-09-17` and are BRANCH, not main; and the SQL
under `docs/ops/proposals/` is authored by an agent and applied by the founder, never
placed under the migrations directory.


### Track A: the capture plane

**Charter.** Every signal with an available source begins logging as-of now, into an already-migrated table, gated only by rights clearance and never by a product flag, whether or not it can be tested for months.

**Starts on day one, with no founder action and no dependency:**

- A capture-versus-use import-boundary test (A1) that fails the build if any ingestion module reaches scoring, the board, or the picks route, or if the news writer imports wire.ts.
- A cron entry for the three already-written, already-clearance-gated orphan persisters: pfr-adv-stats.ts, team-week-stats.ts, rush-tendencies.ts (A2).
- Officials capture into GameSignal from the already-registered nflverse officials dataset (A3).
- NWS-only weather forecast ladder plus kickoff-actual capture into GameSignal (A4).
- Real-only RSS and beat-news capture into Signal, gated by one new registry entry, running at zero rows until a feed is configured (A6).
- Statcast batter/pitcher/sprint-speed capture into Signal, wrapping the already-cleared existing fetchers (A7).
- NBA rest and back-to-back capture into Signal, wrapping the already-cleared existing fetcher (A8).
- A low-frequency cron on the existing, already-guarded historical-games backfill route (A9).
- Migration of the five-entry narrative and incentive tracker from markdown into Signal rows under its existing source-plus-verified-at discipline (A10).
- Daily dated MLB standings snapshots into Signal, fixing the live-only fetch the inventory already names as not as-of (A11).
- A generalized capture-freshness manifest plus a named line-archive-staleness monitor, buildable and testable today against synthetic timestamps with no dependency on any other row here (A12).

| ID | Workstream | Concurrent | Owner | Entry files | Acceptance |
|---|---|---|---|---|---|
| A1 | Capture/use boundary test | yes | agent | `apps/web/lib/ingestion/player-stats.ts`, `apps/web/lib/news/wire.ts`, `apps/web/lib/board/state.ts` | npx vitest run apps/web/__tests__/capture-plane-boundary.test.ts is green and fails on a deliberately introduced violating import. |
| A2 | Wire the three orphan season-replace persisters into a cron | yes | agent | `apps/web/lib/ingestion/pfr-adv-stats.ts`, `apps/web/lib/ingestion/team-week-stats.ts`, `apps/web/lib/ingestion/rush-tendencies.ts`, `apps/web/app/api/cron/backfill-team-efficiency/route.ts` | After one scheduled run, PfrAdvStat, TeamWeekStat, and PlayerRushProfile row counts for the current season are nonzero; a second same-day run does not change the row count (idempotent replace). |
| A3 | Officials capture from the nflverse officials dataset | yes | agent | `packages/data-ingestion/src/nflverse-source.ts`, `packages/data-ingestion/src/context-enrichment.ts`, `apps/web/lib/pick-explainer/grounding.ts`, `packages/db/prisma/schema.prisma` | A GameSignal row with sourceCategory OFFICIALS exists for every matched 2015-plus game after the first run; on the next mint for such a game, PickSignalSnapshot.hadOfficialsSignal reads true without any change to signal-snapshot.ts. |
| A4 | NWS weather forecast ladder and kickoff-actual capture | yes | agent | `apps/web/lib/weather/game-weather.ts`, `packages/db/prisma/schema.prisma` | For a Sunday slate, at least three distinct forecast_t_minus_* rows per outdoor-venue game exist before kickoff, and a fixture test proves none of them overwrote another under GameSignal's own unique constraint. |
| A5 | Open-Meteo commercial-tier rights reconciliation | no | founder | `apps/web/lib/data-sources/free-adapters/open-meteo.ts`, `apps/web/lib/scraping/source-rights-registry.ts` | A written ruling exists; only after it does an Open-Meteo capture writer get built. |
| A6 | Real-only RSS and beat-news capture into Signal | yes | agent | `apps/web/lib/news/rss.ts`, `apps/web/lib/news/impact.ts`, `apps/web/lib/news/wire.ts`, `apps/web/lib/scraping/source-rights-registry.ts` | With zero feeds configured, the writer runs and persists nothing. With one fixture feed configured, it produces Signal rows whose sourceId matches the fixture feed's real name and never one of DEMO_WIRE's invented reporter names; A1's boundary test still passes. |
| A7 | Statcast persistence into Signal | yes | agent | `apps/web/lib/statcast/index.ts`, `packages/db/prisma/schema.prisma` | A daily run appends new dated rows without touching a prior day's rows for the same player and metric. |
| A8 | NBA rest and back-to-back persistence into Signal | yes | agent | `apps/web/lib/nba/rest.ts`, `packages/db/prisma/schema.prisma` | A daily run appends new dated per-team rows for every team with a game that day. |
| A9 | Cron the historical archive backfill route | yes | agent | `apps/web/lib/ingestion/historical-games.ts`, `apps/web/app/api/cron/backfill-historical-games/route.ts`, `apps/web/vercel.json` | HistoricalGame's max fetchedAt advances weekly with no manual curl required. |
| A10 | Narrative and incentive tracker graduates into Signal | yes | agent | `apps/web/lib/conviction/signals/narrative-incentive.ts`, `packages/db/prisma/schema.prisma` | Five Signal rows exist matching the tracker's five current entries, each independently checkable against its cited source. |
| A11 | Daily dated MLB standings snapshot into Signal | yes | agent | `packages/data-ingestion/src/mlb-statsapi-client.ts`, `packages/ingestion-pipeline/src/build-independent-fair-values.ts`, `packages/prediction-engine/src/standings-strength.ts`, `packages/db/prisma/schema.prisma` | After 100 days of a season, 100 distinct dated rows per team exist, letting a future join answer what a team's record was on any past date, which the live-only fetch cannot answer for any date but today. |
| A12 | Generalized capture-freshness manifest and the line-archive-staleness monitor | yes | agent | `apps/web/lib/data-reliability/odds-fetchedat-staleness.ts`, `apps/web/lib/ops/health-alert-decision.ts`, `packages/ingestion-pipeline/src/line-archive.ts`, `apps/web/vercel.json` | A unit test against synthetic timestamps proves a table whose MAX(observation column) exceeds its derived cadence reads stale with shouldAlert true; a second test replays the real 2026-08-22 to 2026-09-13 line-archive outage and shows this monitor would have alerted inside the first missed cycle. |

**What each one builds.**

- **A1, Capture/use boundary test.** A static import-graph test that fails CI if any module under apps/web/lib/ingestion/*, packages/data-ingestion/src/*, or a new *-capture.ts file imports from prediction-engine scoring, the board, or the picks route, and a second assertion that the real news-capture module never imports apps/web/lib/news/wire.ts or any DEMO_WIRE item id. Capture that starts because of this row: NONE (this is the guardrail, not a data source) Risk: A false positive if a shared utility module is miscategorized as capture; scope the import scan to the ingestion and *-capture.ts directories only, not the whole apps/web/lib tree.
- **A2, Wire the three orphan season-replace persisters into a cron.** One new cron route calling ingestPfrAdvStats(season, statType) for pass/rec/rush, ingestTeamWeekStats(season), and ingestRushTendencies(season) on the labelled-season-with-floor-fallback pattern backfill-team-efficiency/route.ts already uses. Capture that starts because of this row: PFR per-player-game pressure and contact-yardage detail, team-week EPA and CPOE aggregates, and per-rusher gap and direction tendencies, all for the current NFL season, daily.
- **A3, Officials capture from the nflverse officials dataset.** apps/web/lib/ingestion/officials.ts (NEW), fetching the single all-time officials asset, resolving each row's nflverse game_id to this platform's Game.id by season, week, and team abbreviation, and writing one GameSignal row per game under sourceCategory OFFICIALS, isBootstrap false. Capture that starts because of this row: Officiating crew per NFL game, 2015 onward, into GameSignal.
- **A4, NWS weather forecast ladder and kickoff-actual capture.** apps/web/lib/ingestion/game-weather-capture.ts (NEW), calling the existing loadNflGameWeather on a schedule and writing one GameSignal row per game per lead-time bucket under keys like forecast_t_minus_24h, plus one actual_at_kickoff row near commence time, sourceCategory WEATHER. Capture that starts because of this row: Pre-kickoff wind, temperature, and precipitation forecast at multiple lead times, plus the kickoff-actual reading, for the 19 outdoor NFL venues.
- **A5, Open-Meteo commercial-tier rights reconciliation.** No code. A founder ruling on whether Open-Meteo's hosted free tier, which its own module comment flags as non-commercial or fair-use only, may back persisted commercial capture, or whether the paid tier or self-hosting is required first. Capture that starts because of this row: PARKED. NWS alone (A4) already covers every outdoor NFL venue with a public-domain source, so this is not blocking anything else in this track.
- **A6, Real-only RSS and beat-news capture into Signal.** A new source-rights-registry entry for published syndication feeds (headline and timestamp only), plus apps/web/lib/ingestion/news-capture.ts (NEW) that calls checkClearance per configured feed, classifies items with the existing impact.ts taxonomy, and writes Signal rows keyed by news.<signal>.<item id>, never importing wire.ts. Capture that starts because of this row: Every classified real headline from any operator-configured feed, keyed to the player or team it names, timestamped at its own publish time, tier-weighted exactly as the display engine already weights it.
- **A7, Statcast persistence into Signal.** apps/web/lib/ingestion/statcast-capture.ts (NEW), wrapping the existing loadStatcastBatters, loadStatcastPitchers, and loadSprintSpeed with no change to them, writing dated Signal rows entityType player, key statcast.<metric>.<date>, week 0. Capture that starts because of this row: Batter and pitcher underlying (exit-velocity and expected-outcome family, sprint speed) per active MLB player-date.
- **A8, NBA rest and back-to-back persistence into Signal.** apps/web/lib/ingestion/nba-rest-capture.ts (NEW), wrapping the existing, already-cleared apps/web/lib/nba/rest.ts, writing dated Signal rows entityType team, key rest.days_since_last.<date> and companion keys for games-in-7-days and recent minutes load. Capture that starts because of this row: Days of rest, games in the last 7 days, and recent-minutes load per NBA team-date.
- **A9, Cron the historical archive backfill route.** One low-frequency (weekly) cron entry on the existing backfill-historical-games route, which already fetches the single all-seasons schedules asset and already refuses to wipe the archive on an empty upstream response. Capture that starts because of this row: The full 1999-plus closing-line and settled-result archive stays current automatically.
- **A10, Narrative and incentive tracker graduates into Signal.** A small migration script and an ongoing capture path that reads docs/narrative-tracker/TRACKER.md's structured entries and writes each as a Signal row under narrative.<slug>, refusing any entry missing a source or a verifiedAt, matching the existing narrative-incentive.ts input contract. Capture that starts because of this row: Contract-incentive, record-chase, revenge-game, and milestone facts, exactly as conservatively curated today, now durable and queryable instead of living in one markdown file.
- **A11, Daily dated MLB standings snapshot into Signal.** apps/web/lib/ingestion/mlb-standings-capture.ts (NEW), calling the existing fetchMlbStandings once a day and writing one Signal row per team under standings.win_pct.<date>, fixing the not-as-of gap in the live call build-independent-fair-values.ts makes today. Capture that starts because of this row: Each MLB team's win-loss record as of every calendar day of the season.
- **A12, Generalized capture-freshness manifest and the line-archive-staleness monitor.** apps/web/lib/data-reliability/capture-freshness-manifest.ts (NEW), one entry per capture family with its table, observation column, and a cadence derived from that family's own cron schedule, generalizing the proven classifyGlobalMaxFetchedAt pattern; plus apps/web/lib/data-reliability/line-archive-staleness.ts (NEW) as the named first-class case, wired into the existing health-alert-decision.ts and truth-surface pattern. Capture that starts because of this row: NONE directly; this is the alarm on everything A2 through A11 capture, and its absence is the proven reason a prior outage ran three weeks unnoticed.

**Invariants that must survive every future edit to this track:**

- A capture writer never imports from packages/prediction-engine/src/scoring.ts, apps/web/lib/board/*, or apps/web/app/api/picks/*; capture is a one-directional producer, never a consumer of anything gated.
- Every capture writer catches its own errors and returns a status object; it never throws into the cron, cycle, or route it rides alongside.
- Every GameSignal or Signal write whose fact is point-in-time encodes the distinguishing dimension (lead time, item id, date) inside the unique key, so the table's own uniqueness constraint can never collapse a series into its latest value.
- Every write to a table carrying an isBootstrap column passes it explicitly as false; the Prisma default of true is never relied upon by omission.
- A capture writer that cannot confidently resolve an external id (nflverse game_id, a player crosswalk) to this platform's own row skips that row silently; it never guesses a match.
- The real news-capture writer never imports apps/web/lib/news/wire.ts or references any DEMO_WIRE item; the fictional wire and the real ledger are structurally, not conditionally, separate.
- No new capture writer reads, flips, or branches on an environment flag to decide whether it may run; clearance decides that, and LINE_ARCHIVE_ENABLED / EVENT_ODDS_INGEST_ENABLED are inherited, never touched.
- Any freshness threshold this track's monitor uses is derived from the producing cron's own schedule or the consuming gate's own constant, never restated as a second literal.
- A capture table is never deleted wholesale except HistoricalGame's existing, empty-guarded full replace; season-scoped tables replace only their own season's rows.

Capture and use are two different verbs and this track owns exactly one of them. A capture writer's only job is to turn something knowable right now into a timestamped, durable row that a future reader can trust. It never scores a game, never ranks a pick, never withholds a publish, and never becomes reachable from `packages/prediction-engine/src/scoring.ts`, `apps/web/lib/board/state.ts`, or the picks route. That separation is not a style preference, it is the whole justification for building at full width while a certification gate stays narrow: the gate in section 1 constrains what a customer sees, and nothing here ever reaches a customer, so nothing here needs to wait for the gate, the head trainer, the admission harness, or any other track. The wall clock is the only resource capture can never buy back. A signal whose as-of log starts today has weeks of sample by the time anyone is ready to test it; a signal whose log starts after the test is designed has zero rows forever until someone remembers to flip a switch that never needed flipping. That is the whole argument for rule 3, and it is why this track's acceptance bar is "does it write a true row today," never "will anything read it this quarter."

Some of this plane already runs and should not be rebuilt. `apps/web/lib/ingestion/player-stats.ts` persists nflverse weekly player stats into `Player`/`PlayerGameStat`, driven by `ingest-player-stats` at 09:00 UTC daily and by `refresh-player-stats` at the top and bottom of every hour (`apps/web/vercel.json`). Inside that same route, once a day in the 10:00 UTC window that `apps/web/lib/ingestion/satellite-window.ts:45,74-75` defines against the labelled season, four satellites run: `snap-counts.ts`, `injuries.ts`, `depth-charts.ts`, and `next-gen-stats.ts` across its three stat types. `team-efficiency.ts` aggregates play-by-play into `TeamGameEfficiency` on its own 07:15 UTC cron (`backfill-team-efficiency/route.ts`), one row per team per game, offense produced and defense allowed. The line archive persists every book's price into `OddsLineSnapshot` (`packages/ingestion-pipeline/src/line-archive.ts`), append-only, phase-tagged OPEN, INTERIM, and CLOSE, with a real `book` column (`schema.prisma:472`) that a later track can finally use to stop scoring book-mix drift as market movement. And `packages/data-ingestion/src/context-enrichment.ts:328-374` writes exactly two `GameSignal` rows per game today, `schedule_density_7d_home` and `schedule_density_7d_away`, the only two of fourteen `SignalCategory` values (`schema.prisma:1490-1505`) this table has ever carried.

Everything else that could be logging is stuck in one of three failure modes, and each has a different fix. First, three writers exist, compile, and are already clearance-gated, but nothing calls them: `apps/web/lib/ingestion/pfr-adv-stats.ts` (PFR pressure, drops, contact-yardage, gated by its own `permission_required` check before the generic nflverse gate), `team-week-stats.ts`, and `rush-tendencies.ts`. Each already implements the idempotent replace-per-season pattern the wired writers use; the only missing piece is a cron entry. Second, two routes exist with no cron entry at all: `apps/web/app/api/cron/backfill-historical-games/route.ts` (wraps `ingestHistoricalGames`, one fetch of the single all-seasons `schedules` asset) and `.../backfill-player-data/route.ts` (a multi-season loop). Neither appears in `apps/web/vercel.json`'s 22 entries, confirmed by grep. Third, five real adapters fetch live and persist nothing: `apps/web/lib/weather/game-weather.ts` (NWS, 60-minute in-memory cache only), `apps/web/lib/data-sources/free-adapters/open-meteo.ts` (no cache at all), `apps/web/lib/news/rss.ts` (its own doc comment: "Nothing is stored; items are fetched at render"), `apps/web/lib/statcast/index.ts`, and `apps/web/lib/nba/rest.ts`. The last two are already clearance-clean, calling `assertIngestible("baseball-savant")` and `assertIngestible("espn-public-api")` respectively with zero database calls anywhere in either file, verified by grep. Every hit any of these adapters serves today is computed once and thrown away.

The fix for that third failure mode does not need a schema change, because two tables already exist, are already migrated, and already have zero writers of consequence: `GameSignal` (`schema.prisma:775-794`, thirteen of its fourteen `SignalCategory` values unused) and `Signal` (`:3156-3182`, the "universal signal ledger," entity-scoped to a player or a team, with a `confidence` field whose own comment, "settled stat approximately 1, rumor approximately 0.2," was written for exactly the source-tier weighting this track needs). Routing every new capture into these two tables, instead of proposing new ones, is the single highest-leverage design choice available, because it means nothing here waits on a founder-applied migration. But both tables carry a trap that must be named before anyone writes to them. `GameSignal` is unique on `(gameId, sourceName, signalKey)` and `Signal` is unique on `(entityType, entityId, key, season, week)`; both are, by construction, latest-value stores, not logs. An upsert under a shared key silently destroys the prior observation, which is the same sample-destruction rule 3 warns against, arriving through a different door. The invariant this track enforces on every writer it adds: when the fact is genuinely point-in-time (a forecast at a lead time, a headline, a dated standings snapshot), the distinguishing dimension is encoded inside the key itself, so every observation lands on its own row and the table's own uniqueness constraint can never collapse a series into one value. A second trap is verified in the same file: `GateDecision.isBootstrap` defaults to `true` (`:675`) and its readers filter on it; `GameSignal.isBootstrap` defaults to `true` on the identical pattern (`:785`). `Signal` has no such column at all, so it cannot suffer this specific trap, but it also means nothing there can ever be excluded as bootstrap-era by a future reader if that ever matters. Every writer this track adds passes `isBootstrap: false` explicitly at the call site, exactly as `context-enrichment.ts` already does by accepting rather than hardcoding the flag; `true` is reserved for a sample-data backfill this track never performs.

With that contract fixed, the concrete captures that start now are these. The nflverse `officials` dataset (`packages/data-ingestion/src/nflverse-source.ts:161-162`, one all-time file, grain "game," since 2015, columns confirmed against its own fixture in `nflverse-cache.test.ts:118-133`) has never been persisted; a new writer resolves each row's nflverse `game_id` to this platform's `Game.id` by season, week, and team abbreviation, exactly the join `context-enrichment.ts` already performs for its own writes, and stores one `GameSignal` row per game under `sourceCategory: OFFICIALS`. Weather starts with NWS only: `game-weather.ts` already returns a forecast for all nineteen outdoor venues it enumerates, already clearance-gated through `assertIngestible("nws-weather")`, and a new writer calls it on a schedule and stores one `GameSignal` row per game per lead-time bucket under key names like `forecast_t_minus_24h`, plus a separate `actual_at_kickoff` row, so the unique-key trap above cannot merge four snapshots of one game into one. Open-Meteo is explicitly not built yet: its own module comment states the free hosted tier is "non-commercial/fair-use," a real rights ambiguity distinct from NWS's public-domain status, so it is parked under rule 5's own exception, a founder rights ruling, not a deferral of convenience. MLB standings get a dated snapshot: `packages/data-ingestion/src/mlb-statsapi-client.ts:45`'s `fetchMlbStandings({season})` is called today, live, with no date argument, cached thirty minutes, by `build-independent-fair-values.ts:297-336`, which is exactly the "not as-of" defect the inventory names; a new daily writer stores each team's win-loss record into `Signal` under `entityType: "team"`, key `standings.win_pct.<date>`, so a future reader can finally ask what a team's record was on the day of a given game instead of what it is today. Statcast and NBA rest get the same treatment: thin writers wrap the existing, already-cleared fetchers and store dated `Signal` rows, `week: 0` for the non-weekly MLB grain the schema already documents as a valid sentinel. The three orphan persisters get one new cron entry each, no new logic. The historical archive gets a low-frequency cron on the existing route, since `ingestHistoricalGames` already guards against a transient empty fetch wiping the multi-decade archive (`historical-games.ts:87-94`).

News capture is the one case that needs a policy decision, not just a writer, and the fictional wire is why. `apps/web/lib/news/wire.ts`'s `DEMO_WIRE` is invented end to end, sources, players, and headlines alike, precisely so that no fabricated report is ever attributed to a real journalist; it is consumed only by render-time display code. A capture writer for real headlines is a structurally separate module that never imports `wire.ts` at all, so the sample data is not merely disabled, it is lexically unreachable from the persistence path, and a static import-graph test proves it the same way this codebase already proves the board's suppression predicate is imported, not restated. Real items are classified by the existing, unmodified `apps/web/lib/news/impact.ts` taxonomy and stored in `Signal`, `entityType` "player" when the item names one, key `news.<signal>.<item id>` so two stories about the same player in the same week land on two rows instead of colliding, `confidence` set from the same `TIER_WEIGHT` table the display engine already uses, `capturedAt` taken from the feed's own publish time, `sourceId` the feed's real configured name. Persisting anything at all first needs a registry entry: `rss.ts` currently calls neither `checkClearance` nor any database write, and no entry in `apps/web/lib/scraping/source-rights-registry.ts` covers a syndication feed today, verified by grep against all nineteen entries. Adding one, headline and timestamp only, no article bodies, mirrors a posture this registry already grants to sources with far less institutional weight than a published RSS feed, and it is ordinary engineering judgment, not a founder ruling. With no feed configured, the writer runs and persists nothing, which is the honest "genuinely absent source" case rule 5 describes, not a park; the code ships regardless and starts accruing sample the moment an operator supplies a URL. The same logic retires `docs/narrative-tracker/TRACKER.md`'s five hand-verified entries from a markdown file into `Signal` rows under the same mandatory source-plus-verified-at discipline `apps/web/lib/conviction/signals/narrative-incentive.ts` already requires and already refuses to infer on its own; this needs no new schema, only data entry against a table that already exists.

Retention follows the shape of the fact, not a single rule. Anything that is inherently a point-in-time observation, forecasts, headlines, line snapshots, standings snapshots, is append-only forever; no writer in this track ever calls `deleteMany` against `GameSignal`, `Signal`, or `OddsLineSnapshot`. The season-scoped writers this track wires (player stats, snap counts, injuries, depth charts, next-gen stats, and the three newly-croned ones) keep their existing delete-then-recreate-per-season pattern, which is safe for value correctness because a closed week's underlying facts do not change, but it is not safe as an as-of source: a downstream loader that treats one of these rows' own `fetchedAt` as the moment the fact became knowable will be wrong by days, because `fetchedAt` only records when this platform happened to re-fetch it, not when the game it describes actually finished. The correct as-of proxy is derived from the game calendar for that season and week, a join this track documents as a contract rather than builds, since the loader that needs it belongs to a different track. `HistoricalGame` keeps its existing full-table replace with its existing empty-fetch guard (`:87-94`), which already protects the one dataset broad enough that a bad fetch could otherwise erase decades of settled outcomes in one call. Nothing here touches an environment flag. `LINE_ARCHIVE_ENABLED` and `EVENT_ODDS_INGEST_ENABLED` are inherited exactly as the founder already set them; this track never reads them to decide whether it may exist, only the code paths that already depend on them do. The only founder-only items this track produces are a rights ruling on Open-Meteo's commercial tier, and the standing rule that any future graduation of a `Signal`-table encoding into its own dedicated table, if Statcast or standings volume ever justifies one, is founder-applied SQL under `docs/ops/proposals/`, never an agent-run migration.

None of this is worth building without an alarm, because the one time this exact failure happened, nobody noticed for three weeks. `line-archive.ts`'s own header records that a single Prisma argument-shape bug silenced every capture from 2026-08-22 onward, caught only when an agent ran read-only SQL against production by hand, because "nothing in the repo monitors the freshness of `odds_line_snapshots`." The fix already has a proven shape to copy: `apps/web/lib/data-reliability/odds-fetchedat-staleness.ts` classifies a table's own `MAX(fetchedAt)` into ok, warn, stale, or gate-budget-exceeded, with its threshold explicitly derived from the gate's own constant rather than a second hardcoded copy, specifically so the monitor and the thing it monitors can never quietly disagree. This track generalizes that into one manifest, `apps/web/lib/data-reliability/capture-freshness-manifest.ts`, one entry per capture family, each carrying its table, its observation column, and a cadence derived from that family's own cron entry in `vercel.json` rather than restated as a literal, wired into the same `health-alert-decision.ts` and truth-surface pattern the odds monitor already feeds. The line archive gets its own named entry, `line-archive-staleness.ts`, because it is the proven failure, not a hypothetical one. The manifest itself needs none of the tables above to exist first; it can be built and unit-tested against synthetic timestamps today, exactly as the odds monitor already is, which is a second proof that this track's own internals stay independent even of each other. And the payoff compounds without this track touching either consumer: `PickSignalSnapshot` already carries fifteen `had*Signal` boolean flags (`schema.prisma:808-822`), eight of them structurally false today for want of exactly the tables this track fills, and `apps/web/lib/pick-explainer/grounding.ts:16-30` already has a human label ready for every one of them. The day a captured officiating crew or a captured forecast first exists for a game, both of those already-wired, already-tested consumers start telling the truth for free.

**Do not, on this track:**

- Never let a capture writer become reachable from the mint path, the board, or the picks route.
- Never let the DEMO_WIRE fictional news wire or the illustrative sample props pool reach a persisted Signal or GameSignal row.
- Never let a new GameSignal or Signal write silently overwrite an earlier point-in-time observation under a colliding unique key.
- Never let a capture writer default isBootstrap to true by omission.
- Never let a capture writer block, retry into, or fail the cron/cycle it is attached to.
- Never persist Open-Meteo data before the founder rules on its commercial-tier terms; NWS alone is not a substitute for that ruling.
- Never add or edit a table under packages/db/prisma/schema.prisma or migrations/** from this track; a new dedicated table is founder-applied SQL under docs/ops/proposals/.
- Never flip LINE_ARCHIVE_ENABLED, EVENT_ODDS_INGEST_ENABLED, or any other environment flag from this track.
- Never let a new freshness monitor duplicate a threshold that already lives elsewhere instead of deriving it.
- Never invent a game-id or player-id crosswalk match to force a row to persist.

**Founder-only on this track:**

- Ruling on whether Open-Meteo's free hosted tier may be used for commercial persisted capture, or whether the paid tier or self-hosting is required; NWS-only capture proceeds without waiting on this.
- Approving any future migration that promotes a Signal-table encoding (Statcast, MLB standings, or a growing news volume) into its own dedicated table; that is a schema change and must be founder-applied SQL under docs/ops/proposals/, never an agent-run migration.
- Any decision to flip LINE_ARCHIVE_ENABLED or EVENT_ODDS_INGEST_ENABLED off; both are already on and this track only ever reads that fact, never sets it.

### Track B: Feature Store and Persistence

**Charter.** Turn packages/feature-store from a correct, empty, in-memory contract into the durable, rights-aware, write-once substrate every calibration head and gate reads its per-pick feature vector from, starting capture on day one with zero schema change and without inventing a second registry where evidence-readiness-matrix.ts already is one.

**Starts on day one, with no founder action and no dependency:**

- packages/types/src/pit.ts: one shared PIT-correctness law, re-exported by the three modules that currently hand-roll it separately.
- packages/types/src/feature-rights.ts: the most-restrictive-wins rights resolver, feature-granular, pinned against the FTN-charting-inside-nflverse case.
- The docs/ops/proposals/2026-09-18-pick-feature-vectors.sql proposal file itself (authoring only; the apply is founder-only).
- factorBreakdown.featureCaptureV1: a new, additive, never-rewritten mint-time key inside process-sport.ts's existing pick-create path. Real capture starts the day this commit lands.
- A real loader wiring evidence-readiness-matrix.ts to the GameSignal and Signal rows that already exist (including GameSignal's two live schedule_density keys), returning honest ABSENT where nothing has been written yet.
- packages/prediction-engine/src/feature-schema.ts: a pure hash utility offered to the head-registry track, not required by it.
- A model-ineligibility boundary test exercising every export surface (Feast export, the public API skeleton, and the future Prisma store) in one file so they cannot drift apart from each other.

| ID | Workstream | Concurrent | Owner | Entry files | Acceptance |
|---|---|---|---|---|---|
| B1 | Extract one PIT-correctness law into packages/types; retire three drifting copies | yes | agent | `packages/types/src/pit.ts`, `packages/feature-store/src/pit-validate.ts`, `packages/stats-api/src/pit-validate.ts`, `packages/prediction-engine/src/edge-lab/asof-store.ts` | npm run typecheck exits 0; packages/feature-store/src/__tests__/pit-validate.test.ts passes unmodified against the re-exported implementation; a new packages/types/src/__tests__/pit.test.ts pins the refuse-default codes directly. |
| B2 | Rights resolver at feature granularity, not source granularity | yes | agent | `packages/types/src/feature-rights.ts`, `packages/types/src/__tests__/feature-rights.test.ts` | Unit tests pin: nflverse EPA play-by-play resolves modelEligible true; the FTN-charting-derived four-man-rush-rate and interception-worthy-throw-rate columns resolve modelEligible false even though the surrounding nflverse source is cleared; open-meteo, clubelo and nws-weather (the three sources the two live registries already disagree on) each resolve to the stricter of the two raw verdicts, with both raw verdicts preserved on the record. |
| B3 | Proposal SQL: pick_feature_vectors and feature_admission_trials | yes | agent | `docs/ops/proposals/2026-09-18-pick-feature-vectors.sql` | The proposal file exists and is reviewed; git diff shows zero changes under packages/db/prisma/; downstream table-dependent workstreams (B5, B6, B10) read NOT RUN until the founder's separate apply is ledger-recorded with a real migration SHA. |
| B4 | Zero-schema mint-time feature capture, guarded against silent no-op | yes | agent | `packages/ingestion-pipeline/src/process-sport.ts`, `packages/db/src/durable-write-guard.ts`, `packages/ingestion-pipeline/src/__tests__/feature-capture-v1-immutability.test.ts` | A golden test proves confidence, selection, line and grade are byte-identical before and after adding the key; a replay test proves featureCaptureV1 survives a subsequent refresh cycle and a subsequent backfillIndependentTrueProb run unchanged; a stub-DATABASE_URL test proves the write throws rather than pretending to succeed. |
| B5 | Durable FeatureStore: a Prisma-backed implementation of the existing interface | no | agent | `packages/feature-store/src/prisma-store.ts`, `packages/feature-store/src/index.ts`, `packages/feature-store/src/__tests__/prisma-store.test.ts` | The existing InMemoryFeatureStore test suite (feature-store.test.ts) re-run against PrismaFeatureStore with identical assertions, proving the interface is truly backend-agnostic; a dedicated leakage test asserts getAsOf never returns a row whose asOf exceeds the query's asOf. |
| B6 | One-time backfill: JSONB bridge into the real table | no | founder | `scripts/ops/backfill-feature-vectors-from-jsonb.ts` | Inserted row count equals the count of picks carrying featureCaptureV1 minus the count excluded for the Retrospective marker, both printed and ledger-recorded; reads NOT RUN until B3 is applied and the script has actually run once against production. |
| B7 | First real caller for evidence-readiness-matrix.ts | yes | agent | `packages/prediction-engine/src/evidence-readiness-loader.ts`, `packages/prediction-engine/src/__tests__/evidence-readiness-loader.test.ts` | Given zero GameSignal rows for a game, every category the loader can see resolves ABSENT, honestly; given the two real schedule_density rows, schedule.density resolves against its real trust, sample and age floors computed from real data, not a stub. |
| B8 | Feature-schema hash, offered to the head-registry track | yes | agent | `packages/prediction-engine/src/feature-schema.ts`, `packages/prediction-engine/src/__tests__/feature-schema.test.ts` | Two calls with the same key set in different orders hash identically; adding, removing or re-versioning one key changes the hash; a pinned known-vector test. |
| B9 | Model-ineligibility boundary test across every export surface | yes | agent | `packages/feature-store/src/__tests__/model-eligibility-boundary.test.ts` | The synthetic share-alike value is refused or filtered by all three surfaces, in one test file, every run. |
| B10 | Durable backing for trials-registry.ts's hash chain | no | agent | `packages/prediction-engine/src/edge-lab/trials-registry-durable.ts`, `packages/prediction-engine/src/edge-lab/__tests__/trials-registry-durable.test.ts` | A trial recorded through one adapter instance is loaded and visible to a second, freshly constructed instance with no in-process state carried over; the chain's own tamper-evidence check (each entry's prevHash matches the prior entry's hash) still passes end to end. |

**What each one builds.**

- **B1, Extract one PIT-correctness law into packages/types; retire three drifting copies.** A single pure module (parseAsOfMs, isAsOfOnOrBefore, the refuse-default PitCode set) that packages/feature-store/src/pit-validate.ts, packages/stats-api/src/pit-validate.ts and edge-lab/asof-store.ts's toMillis all re-export from, instead of each hand-rolling the same law with a different error-code set. Risk: packages/stats-api forked its copy specifically to stay free of a circular dependency (its own header says so). Must confirm packages/types has no import path back to packages/stats-api or packages/feature-store before repointing.
- **B2, Rights resolver at feature granularity, not source granularity.** resolveFeatureRights(legalVerdict, rightsStatus, shareAlike) -> { tag, modelEligible }, most-restrictive-wins, so one source can carry both an eligible and an ineligible column.
- **B3, Proposal SQL: pick_feature_vectors and feature_admission_trials.** One agent-authored proposal file, written as a Prisma model block in the repo's own provenance style (sourceId, rightsSnapshot, fetchedAt, matching HistoricalGame, TeamGameEfficiency, PlayerRushProfile, NextGenStat and Signal), for the founder to fold into schema.prisma and migrate for real. Two tables: pick_feature_vectors (long-format, one row per pick x featureKey) and feature_admission_trials (a durable backing for edge-lab/trials-registry.ts's in-memory hash chain), plus a revoke-UPDATE-and-DELETE grant note for both. Capture that starts because of this row: NONE until the founder applies it.
- **B4, Zero-schema mint-time feature capture, guarded against silent no-op.** A new, additive, never-rewritten factorBreakdown.featureCaptureV1 key stamped once inside process-sport.ts's existing pick-create path, holding the scorer's own numeric inputs at mint (independentEdge fields AS COMPUTED AT MINT ONLY, never re-read after any later refresh or backfill), each value tagged by B2's resolver. Registers a new feature-vector-write capability in packages/db/src/durable-write-guard.ts's DURABLE_WRITE_CAPABILITIES so the write throws instead of silently succeeding under the stub Prisma client. Capture that starts because of this row: Every pick minted from this commit forward carries a real, rights-tagged feature snapshot, starting immediately, independent of B3's founder apply. Risk: JSONB growth on the picks table if the captured vector is left unbounded; scope it to the numeric fields the scorer already computes, not a full raw dump, and treat it explicitly as a bridge that B6 retires once the real table is caught up.
- **B5, Durable FeatureStore: a Prisma-backed implementation of the existing interface.** A PrismaFeatureStore satisfying store.ts's own FeatureStore interface (put/getAsOf/getPublic/listByEntity) against pick_feature_vectors, calling B1's PIT law and B2's rights resolver on every write and re-deriving modelEligible on every getPublic rather than trusting the stored bit blindly. Ports asof-store.ts's closing-line name guard onto put() so the durable store inherits the same tripwire the in-memory one already has. Depends on B3 (real: cannot back an interface with a table that does not exist), B1 and B2 (real: put and getPublic call these functions directly, not a restated copy). Capture that starts because of this row: NONE new; serves what B4 and B6 already captured.
- **B6, One-time backfill: JSONB bridge into the real table.** An idempotent script reading every pick's factorBreakdown.featureCaptureV1 and inserting the corresponding pick_feature_vectors rows, skipping any pick minted before B4 shipped and skipping any row whose factorBreakdown carries the Retrospective post-settlement-rewrite marker from backfill-independent-trueprob.ts, so the contamination rule holds through the backfill itself. Depends on B3 (real: the table must exist) and B4 (real: the source JSONB must exist). Capture that starts because of this row: NONE new; moves already-captured values into the durable table.
- **B7, First real caller for evidence-readiness-matrix.ts.** A loader that reads whatever GameSignal and Signal rows exist today, including the two schedule_density_7d_home/away keys GameSignal's one real writer (packages/data-ingestion/src/context-enrichment.ts) actually emits, and maps them into the EvidenceRecord[] shape buildEvidenceReadinessMatrix already accepts, giving the 13-key ORPHAN a real, honest caller without changing its contract. Capture that starts because of this row: Surfaces the two GameSignal keys that already exist as real gate input for the first time; writes nothing new itself.
- **B8, Feature-schema hash, offered to the head-registry track.** A pure hash over the ordered set of registered featureKeys and their convention tags, so a future model_heads artifact (a different track's proposed table) can store featureSchemaHash and refuse to serve a coefficient vector against a feature vector whose live schema has silently drifted.
- **B9, Model-ineligibility boundary test across every export surface.** One test file exercising exportForFeast, getPublicFeature and PrismaFeatureStore.getPublic together against a synthetic share-alike-tagged value, so the three export paths cannot drift apart from each other the way the app-side and ingestion-side rights registries already have.
- **B10, Durable backing for trials-registry.ts's hash chain.** An adapter that loads feature_admission_trials into createTrialsRegistry(seed) before use and persists every new record() call back to the table, so a trial recorded by one scheduled run is visible to the next without a caller manually re-supplying the whole prior chain. Depends on B3 (real: feature_admission_trials must exist to load from). Capture that starts because of this row: NONE new until B3 lands; once it does, every admission trial the harness ever runs persists automatically.

**Invariants that must survive every future edit to this track:**

- pick_feature_vectors, and any successor, is insert-only: no code path may UPDATE or DELETE a row once written. Settlement outcomes attach to Pick.result and PickSignalSnapshot.settlementResult/settledAt, never by rewriting a stored feature value.
- No loader treats factorBreakdown.independentEdge.trueProb, or any field the six-hourly calibration cron rewrites post-settlement, as a training feature or label. The discriminator is provenance (asOf equals mint time, stamped once, never re-derived later), not a string match on a rationale that could itself drift.
- Rights and PIT-correctness are evaluated at feature-value granularity, never at source granularity. One source (nflverse) can yield both a cleared CC-BY-4.0 column and a share-alike CC-BY-SA-4.0 column (FTN charting), and the stricter one governs that value alone.
- Every persisted feature value's modelEligible bit is produced by one resolver function, resolveFeatureRights(), imported everywhere it is needed and never restated, following the same law the engine already applies to pricesWorseThanMarket.
- packages/feature-store's FeatureStore interface (put/getAsOf/getPublic/listByEntity) is the one contract every backing implements. Nothing downstream imports a concrete class, only the interface.
- A featureKey names one fixed convention forever. A redefinition (a new success-rate convention, a new de-vig method) mints a new versioned key; it never silently changes what an existing key returns.
- evidence-readiness-matrix.ts's 13-key taxonomy stays the one category registry. This track adds a value store and a real loader that feeds it, never a second, competing category registry.
- packages/types is the only cross-boundary import surface between packages/* and apps/web, per the document's own cross-cutting rule. The PIT law and the rights resolver both live there, not inside packages/feature-store or apps/web.

Track B inherited a paradox: the repository has built the logic of a point-in-time feature store four separate times, correctly, and never built the one table underneath any of them. packages/feature-store/src/store.ts and pit-validate.ts implement a generic, refuse-default FeatureRecord contract (featureId, entityId, asOf, sourceRights, pitCorrect, publicApiEligible, calibrationCohort, modelVersion, provenanceHash) with real tests at src/__tests__/pit-validate.test.ts and src/__tests__/feature-store.test.ts, but it is in-memory only, and its sole non-test reference anywhere in the tree is a package.json dependency line at packages/stats-api/package.json:13. packages/stats-api/src never imports it. packages/prediction-engine/src/edge-lab/asof-store.ts is a second, independent implementation, scalar-valued, with a closing-line name guard (CLOSING_KEY_PATTERN at :67) and a served-read audit that assertNoLookahead() (:184-195) can certify after the fact; it is SCRIPTS-ONLY and has never run on a schedule. packages/stats-api/src/pit-validate.ts is a third, explicitly forked copy, its own header stating it mirrors feature-store law for metric values and is kept in-package so at sports slash stats-api stays free of circular deps, already narrower by two error codes than the original it copied from. packages/prediction-engine/src/edge-lab/trials-registry.ts is a fourth: createTrialsRegistry(seed = []) at :109 builds a tamper-evident hash chain in a plain array at :111, with no file or database I/O anywhere in the 322-line module, so every run starts over unless a caller manually resupplies the entire prior history as a seed. Beneath all four, the database itself already carries the right-shaped table with nobody writing to it: the Signal model (schema.prisma:3156-3182) has entityType, entityId, key, category, valueRaw, value, weight, confidence, capturedAt, season, week, sourceId and a rightsSnapshot Json column, a better fit for a general as-of signal ledger than anything above it, and it has zero writers and zero readers. GameSignal (schema.prisma:775-794) is the one member of this family that is actually wired, and it writes exactly two keys, schedule_density_7d_home and schedule_density_7d_away, from packages/data-ingestion/src/context-enrichment.ts:328-374. None of this is a skill problem. Every one of these four modules is well designed and well tested in isolation. It is a reach problem: nobody building a new signal had one obvious place to put it, so each one built its own small, correct, disconnected drawer.

The contamination trap this track must close by construction, not by convention, is verified directly in packages/ingestion-pipeline/src/backfill-independent-trueprob.ts. The six-hourly calibration cron calls this module's enrichment function, which selects settled WIN or LOSS picks (the query at :96-101 filters isPublished true, isBootstrap false, result in WIN or LOSS) and calls buildIndependentFairValues at :172-183 with only the game's commenceTime as an anchor. That anchor does not make the read as-of, because two of the independents buildIndependentFairValues blends read whole-season or current aggregates rather than a truncated-to-date view: the signal registry itself names both gaps, for MLB standings strength and for NFL opponent-adjusted EPA v1. The function then overwrites factorBreakdown.independentEdge.trueProb on the settled row at :235-257 and stamps a rationale string beginning Retrospective independent blend, so a human reading the card knows, but nothing at the data layer knows. A settled row's trueProb is therefore partly informed by information that postdates the decision, and any loader that reads it as a training feature is fitting on a number the outcome itself helped shape. The fix this track ships is structural. pick_feature_vectors has no outcome column at all, and no code path exposes an UPDATE or DELETE against it, enforced first by a TypeScript write wrapper that only inserts and second by a Postgres grant the founder applies revoking UPDATE and DELETE outright. There is nothing in this table a post-hoc enrichment job could rewrite, because rewriting a frozen value was never a thing its contract allows. Settlement outcomes attach to Pick.result and to PickSignalSnapshot's own settlementResult, settledAt, eligibleForLearning and learningEligibleAt columns, a pattern the repository already gets right: PickSignalSnapshot (schema.prisma:801 onward) is created once at pick time by its own comment, with only those four settlement fields ever written after creation. This track's table follows that identical shape rather than inventing a new one.

The per-pick feature vector is long, not wide: one row per pickId and featureKey, never one row per pick with a fixed column per feature. This matches the grain packages/feature-store/src/types.ts already chose (featureId, entityId, asOf) and the grain the existing, unused Signal table already chose (entityType, entityId, key, season, week), and it means admitting a new feature is a new registered featureKey, never a migration. Every row's asOf equals the pick's mint instant exactly, the same instant process-sport.ts's pick-create path (packages/ingestion-pipeline/src/process-sport.ts:1219-1364) already stamps for dataFreshnessAt and generatedAt; there is no latest read, mirroring asof-store.ts's own first rule that reads require an explicit cutoff. Rights are carried per feature value, not per source, because a single source can carry two different licenses inside it: nflverse bulk play-by-play is CC-BY-4.0, attribution required, no share-alike, but the FTN charting and participation columns riding inside the same nflverse release are CC-BY-SA-4.0, share-alike, and the document's own L7 invariant already states that share-alike rows are model-ineligible by construction. That is exactly why the signal registry marks the pressure proxy, four-man rush rate, and interception-worthy throw rate rows model-ineligible while the surrounding nflverse EPA rows are not. A source-level rights tag cannot express this; a feature-level tag can. Each row therefore stores the raw verdict from both existing registries, legalVerdict from packages/data-ingestion/src/source-registry.ts's LegalVerdict (six values at :21-26) and rightsStatus from apps/web/lib/scraping/source-rights-registry.ts's SourceRightsStatus (nine values at :17-26), plus one computed modelEligible boolean produced by a single pure resolver, resolveFeatureRights, that this track adds to packages/types and that takes the more restrictive of the two, exactly as L7 already requires for a live signal. modelEligible is stamped at write time for cheap filtering and re-derived at every read through the training export path by calling the identical function again, never a second copy of the mapping, so a later rights ruling tightens enforcement without needing a backfill.

Registration and versioning both already have a home; this track wires into them instead of building a third. A candidate feature is registered by committing its pre-registration JSON before the harness may run it, the invariant section 3's L4 already states. Today that registration event lives only in memory, inside trials-registry.ts's hash chain, so a trial recorded by one cron run is invisible to the next unless someone manually reseeds the whole prior chain. This track's second proposed table, feature_admission_trials, gives that chain a durable backing with the identical row shape trials-registry.ts already defines, trialId, family, kind, recordedAt, params, pValue, statistic, outcome, notes, plus the chain's own prevHash and hash, so createTrialsRegistry loads its seed from this table and every new record call persists there too. The pure hash-chain logic in trials-registry.ts does not change at all, only its durability does. A pick_feature_vectors row's admissionStatus and trialRef columns point at this chain when a value came from a registered candidate, and read unregistered for the legacy factor-score fields that predate the admission harness, an honest label, not a gap to paper over. Versioning is a naming discipline, not a column: every featureKey fixes one convention forever, using a category dot name dot version shape, so the three competing success-rate conventions the signal registry already flags, nflfastR's EPA over zero, Football Outsiders's 40 60 100, and Connelly's 50 70 100, get three keys instead of one key whose meaning depends on which script last wrote it. A write whose declared convention tag does not match its registered key's convention is refused, never silently accepted, the same refuse-default posture pit-validate.ts already applies to a bad asOf. provenanceHash, a field packages/feature-store/src/types.ts already carries and nothing yet computes, becomes a hash over the exact source rows and asOf timestamps that fed the value plus the code commit that computed it, the same tamper-evidence idiom pick-proof-receipt.ts already uses for the pick's own claimed fields at packages/prediction-engine/src/pick-proof-receipt.ts:174-201, applied one layer earlier.

The SQL the founder applies is one proposal file, docs/ops/proposals/2026-09-18-pick-feature-vectors.sql, agent-authored per the document's own section 9 item 7, never touching packages/db/prisma/schema.prisma or packages/db/prisma/migrations/** directly. It is written as a Prisma model block, matching the house style of every comparable table (HistoricalGame, TeamGameEfficiency, PlayerRushProfile, NextGenStat and Signal all share the sourceId, rightsSnapshot, fetchedAt provenance convention across schema.prisma:2874-3182), so the founder can paste it into schema.prisma verbatim and run the real migration rather than hand-executing raw DDL against Neon. PickFeatureVector carries id, pickId, gameId, featureKey, a nullable factorKey pointing into evidence-readiness-matrix.ts's EvidenceFactorKey union for the rows that map to one of its 13 categories, valueNum, valueStr, valueBool, asOf, sourceId, legalVerdict, rightsStatus, modelEligible, admissionStatus, trialRef, provenanceHash, pitCorrect defaulting true since a row that failed the check is never inserted, modelVersion and createdAt, unique on pickId and featureKey, indexed on gameId and on featureKey with asOf for the head trainer's stratum queries. FeatureAdmissionTrial carries the chain's own fields plus hash and prevHash, unique on trialId and on hash. The proposal's last line is an access instruction, not a create statement: revoke UPDATE and DELETE on both new tables from the application's runtime database role, so the insert-only contract is enforced by Postgres itself and not only by the TypeScript wrapper that is this track's only sanctioned writer. Until the founder applies it, every downstream workstream that needs the real table reads NOT RUN, per section 8's own definition-of-done split, and that dependency is real, not conventional, because no application code anywhere in this repository can create a table.

None of the above blocks a single line of code from shipping today. Five pieces of this track start on day one with no founder action and no other track's output. First, the three drifting PIT-law reimplementations get one shared ancestor, packages/types/src/pit.ts, re-exported from packages/feature-store/src/pit-validate.ts and packages/stats-api/src/pit-validate.ts and used by edge-lab/asof-store.ts's toMillis, so a fourth drift cannot start the day after the third one is fixed. packages/types is the correct home because it is already, by the document's own cross-cutting rule, the one boundary packages slash star and apps slash web cross intact. Second, resolveFeatureRights ships as a pure function with its FTN-charting-inside-nflverse case pinned, ready for every future signal whether or not pick_feature_vectors exists yet. Third, and this is the concrete answer to the founder's rule that capture starts everywhere immediately, process-sport.ts's pick-create path gets one new, additive, never-rewritten key, factorBreakdown.featureCaptureV1, stamped once at mint with the numeric inputs the scorer already computed, guarded by a golden test proving confidence, selection, line and grade are byte-identical before and after, and by a replay test proving no later refresh or backfill cycle ever touches that key. Every pick minted from the day this lands carries a real, rights-tagged feature snapshot, in wall-clock time, with zero schema change. When the founder later applies the proposal SQL, a one-time, idempotent backfill script copies every existing featureCaptureV1 blob into real pick_feature_vectors rows, explicitly skipping any row whose factorBreakdown carries the Retrospective rationale marker so the contamination rule holds through the backfill itself, and never fabricating a vector for a pick minted before this landed.

Fourth, evidence-readiness-matrix.ts, 13 keys at :18-31, EVIDENCE_FACTOR_DEFINITIONS at :82-252, exported from the barrel at index.ts:167-169, called by nothing, gets its first real caller: a loader that reads whatever GameSignal and Signal rows exist today, including the two schedule_density keys GameSignal actually writes, and maps them into the EvidenceRecord array shape buildEvidenceReadinessMatrix already accepts. Because almost nothing writes to either table yet, this loader mostly returns ABSENT, honestly; that is the correct output today, not a stub to be embarrassed about, and it is fully tested against the two rows that are real. Fifth, this track registers a new capability, feature-vector-write, in packages/db/src/durable-write-guard.ts's DURABLE_WRITE_CAPABILITIES at :34-39, and calls requireDurableWriteStore before both the featureCaptureV1 write and the later Prisma-backed store's writes, because at sports slash db intentionally ships a stub Prisma client for public read-only and demo surfaces where writes no-op while pretending success, by that file's own header, and a feature-capture write that silently no-ops in a stub environment is the exact failure shape that let the line archive die for three weeks with nobody watching.

Only two things inside this track are genuinely sequenced, and nothing outside it blocks this track's own start. The durable FeatureStore implementation cannot exist before the founder applies the proposal SQL, because it is a backing for a table that does not yet exist; that dependency is real. The one-time backfill script cannot run before both the table exists and the JSONB bridge has been capturing for at least one cycle; that dependency is also real. Every other claim of sequencing is considered and rejected. This track does not wait for the independent-estimator track to fix the MLB standings or NFL EPA as-of gaps, because pick_feature_vectors captures whatever the scorer actually used at mint today, gaps and all, and a captured gap is exactly the kind of honest, counted absence the founder's rules want over a deferred one. It does not wait for a head-training track to exist, because the export path, feast-export.ts's exportForFeast and recordToFeastRow, already written, zero importers, is offered to that track the moment pick_feature_vectors has rows, not required by it. It does not wait for the admission harness to run on a schedule, because feature_admission_trials durably backs whatever trials-registry.ts already knows how to record, whether that harness runs today or in six months. And it does not wait for any gate or narrative-signal track, because evidence-readiness-matrix.ts's ABSENT output is a correct answer with no upstream writer at all. What this track hands the rest of the architecture, once its two founder-gated steps land, is the one thing every other track has quietly been missing: a place a feature can be written once, honestly rights-tagged, and read back byte for byte identical a year later, which is the precondition the document's own headline diagnosis, that the learning loop was never closed, requires before any head, any gate, or any admission trial can compound instead of restarting.

**Do not, on this track:**

- Never let a feature value's asOf drift later than the pick's mint time. asof-store.ts already solved this in memory; the durable store must not reintroduce a lookahead leak it already fixed once.
- Never resolve rights at the source level when a source carries mixed licenses inside it. A share-alike column reaching a served probability because the surrounding source was cleared is the exact failure the document's L7 invariant exists to prevent.
- Never give pick_feature_vectors an UPDATE or DELETE code path. That would recreate, deliberately this time, the exact contamination mechanism backfill-independent-trueprob.ts already created by accident against factorBreakdown.
- Never let the zero-schema JSONB bridge (featureCaptureV1) become permanent. It is a bridge to the real table, and this track's own documentation must say so plainly so a future reader does not defend it as final.
- Never invent a second, competing evidence-category registry alongside evidence-readiness-matrix.ts's 13 keys. Wire the one that exists.
- Never leave the stats-api pit-validate.ts fork, or edge-lab/asof-store.ts's own PIT logic, unreconciled after packages/types/src/pit.ts ships. A fourth drift starting the day after the third is fixed defeats the whole point of B1.

**Founder-only on this track:**

- Apply docs/ops/proposals/2026-09-18-pick-feature-vectors.sql: fold its Prisma model block into packages/db/prisma/schema.prisma, run the real migration, and revoke UPDATE and DELETE on pick_feature_vectors and feature_admission_trials for the application's runtime database role.
- Run scripts/ops/backfill-feature-vectors-from-jsonb.ts (B6) against production exactly once, and record the inserted and excluded row counts in the ledger with the real migration SHA.
- Decide whether and when to retire the factorBreakdown.featureCaptureV1 bridge write once B6 confirms the real table has caught up; until that decision, both writes continue side by side.

### Track C: Engine Breadth and New Estimators

**Charter.** Wire every orphan independent estimator into a shadow, per-game, per-source reading store and build the missing spread, turnover, pressure and QB-efficiency estimators, so the engine measurably knows more than the certification gate currently lets it say.

**Starts on day one, with no founder action and no dependency:**

- margin-mixture-model.ts wired against loadSportResultGamesForElo's existing as-of, deduped settled-game rows (build-independent-fair-values.ts:116-131), writing NFL cover-probability readings to GameSignal today, with zero new loader code.
- The NCAAF sibling of the same fit, on NCAAF's own settled margins, using the same NFL key-number set (same sport, same scoring increments) as a stated, falsifiable assumption, not a fabrication.
- The NBA and NCAAB continuous-only margin-mixture siblings (empty key-number set), fit on nothing but final scores that already exist for every sport.
- The season-to-date NFL EPA read, computed and logged side by side with the live whole-season read (build-independent-fair-values.ts:348-388), with zero change to the live call site.
- The NFL EPA dropback/rush split, computed in memory from the exact play_type column team-efficiency.ts already projects (team-efficiency.ts:18-19,94), fed twice through the already-pure, already-convergent opponentAdjustedRatings() (opponent-adjusted.ts:43).
- The QB efficiency composite, built entirely on the engine's own already-validated, already-fit-on-load EP and CPOE models (expected-metrics/expected-points.ts, expected-metrics/expected-completion.ts), which today serve exactly one premium route and nothing else.
- consensus.ts wired over the independentFairValues array build-independent-fair-values.ts already assembles for every priced game, closing the architecture's own stated-but-unimplemented invariant that single-source agreement is a feature.
- ml-estimator.ts's honest provenance gate wired into the shadow path today: it will return null on every call until a real artifact exists, which is the correct and safe starting state, and starts the clock on collecting the settled-outcome data that artifact will eventually be fit on.
- estimate-phi.ts run once per cycle against real settled totals per sport, logged to a report, replacing nothing and touching no scoring constant.
- The fixture-grouped walk-forward fix, additive and optional, so every existing caller keeps working unchanged the moment it lands.

| ID | Workstream | Concurrent | Owner | Entry files | Acceptance |
|---|---|---|---|---|---|
| C1 | Fixture-grouped walk-forward folds | yes | agent | `packages/prediction-engine/src/edge-lab/walk-forward.ts` | Existing walk-forward tests stay green unchanged (the parameter is optional); a new fixture-grouped test asserts, across randomized fixture/row draws, that two rows sharing a fixtureKey are always on the same side of every fold boundary. |
| C2 | NFL and NCAAF margin-mixture spread independent, wired and recentered | yes | agent | `packages/prediction-engine/src/nfl/margin-mixture-model.ts`, `packages/prediction-engine/src/elo-from-results.ts`, `packages/ingestion-pipeline/src/build-independent-fair-values.ts` | A new test fits on >=64 synthetic NFL margins and reaches verdict fitted (margin-mixture-model.ts:126); a zero-variance synthetic case for the new recentering helper matches a hand-computed normal CDF to 1e-6; a shadow run over one live NFL and NCAAF week writes one GameSignal row per game under sourceName nfl-margin-mixture-cover or ncaaf-margin-mixture-cover. |
| C3 | NBA and NCAAB continuous-only margin model, built new | yes | agent | `packages/prediction-engine/src/basketball/margin-mixture-model.ts`, `packages/prediction-engine/src/nfl/margin-mixture-model.ts` | A new test fits on >=200 synthetic NBA margins, reaches verdict fitted with continuousWeight 1.0 and zero key masses; a separate NCAAB fit on its own real sample produces its own mu and sigma, never NFL's or NBA's. |
| C4 | NFL EPA as-of correctness and liveness, measured before any cutover | yes | agent | `packages/ingestion-pipeline/src/build-independent-fair-values.ts`, `packages/prediction-engine/src/opponent-adjusted.ts`, `packages/prediction-engine/src/edge-lab/nfl-epa-path.ts` | A logged comparison over one live NFL week shows the season-to-date overall rating differing from the whole-season rating for at least one team (or an honestly reported null if it never does that week); nflEpaPathStatus's live/reason fields are written to a diagnostic surface every cycle; zero lines changed at build-independent-fair-values.ts:366 in this workstream. |
| C5 | NFL EPA dropback and rush split | yes | agent | `apps/web/lib/ingestion/team-efficiency.ts`, `packages/prediction-engine/src/opponent-adjusted.ts` | A unit test on a synthetic play-by-play batch asserts the pass-play and rush-play EPA sums reconstruct the existing combined offEpaPerPlay total within floating-point rounding; a shadow run over one live NFL week writes adjOffPass, adjOffRush, adjDefPass and adjDefRush GameSignal rows. |
| C6 | NFL QB efficiency composite (own EPA per dropback plus own CPOE) | yes | agent | `packages/prediction-engine/src/expected-metrics/expected-points.ts`, `packages/prediction-engine/src/expected-metrics/expected-completion.ts`, `packages/prediction-engine/src/expected-metrics/validation.ts` | expected-metrics/validation.ts's existing NGS-CPOE correlation test stays green (cited, not re-derived); a new test asserts the GameSignal reading carries the exact passerId the week's plays actually show, and a second test asserts a mid-season starter change changes only the NEXT game's reading, never a past one. |
| C7 | NFL turnover differential: occurrence versus recovery | yes | agent | `packages/prediction-engine/src/nfl/turnover-differential.ts`, `packages/prediction-engine/src/opponent-adjusted.ts`, `apps/web/lib/ingestion/team-efficiency.ts` | A unit test on a synthetic play-by-play batch with fumble_lost and interception columns computes occurrence and recovery share as two distinctly typed fields, with a test proving no code path can pass recoveryShare into the same opponentAdjustedRatings call that occurrence feeds. |
| C8 | NFL OL versus DL pressure matchup, built new | yes | agent | `packages/prediction-engine/src/nfl/pressure-matchup.ts`, `packages/prediction-engine/src/opponent-adjusted.ts`, `apps/web/lib/ingestion/team-efficiency.ts` | A sign-convention test: given two synthetic teams where team A allows strictly more pressure than team B, the opponent-adjusted rating ranks team A's offValue lower, never higher; a shadow run writes one pressure-matchup GameSignal row per team per live NFL week, each carrying the hit_sack_floor_proxy caveat as a data field, not only a code comment. |
| C9 | ML-GBM referee: training harness and shadow wiring | yes | agent | `packages/prediction-engine/src/ml-estimator.ts`, `packages/prediction-engine/src/edge-lab/walk-forward.ts`, `packages/prediction-engine/src/edge-lab/logit-pool.ts` | predictWinProb is verified to return null on every call until a real artifact exists; once a fit script produces one from >=100 settled rows with real provenance, its out-of-fold logit-pool beta and 95 percent CI against the market baseline are computed and logged before any GameSignal write from this source is trusted. |
| C10 | Remote ensemble: calibrate and shadow-wire the ETKF endpoint | yes | founder | `packages/prediction-engine/src/ensemble/remote-model-client.ts`, `apps/web/lib/ops/shadow-evaluation-pass.ts`, `packages/prediction-engine/src/ensemble/baee-ensemble.ts` | A mocked-fetch test proves fetchModelPrediction classifies a 422, a 503, a malformed probability, and a timeout each as their own typed failure, never a thrown exception, mirroring gse-ml-service's own admitted-endpoint test; a calibration script fits logistic_scale and home_advantage from real settled margins and reports out-of-fold Brier before the endpoint is ever called against a live URL. |
| C11 | Consensus and divergence aggregator, wired | yes | agent | `packages/prediction-engine/src/consensus.ts`, `packages/ingestion-pipeline/src/build-independent-fair-values.ts` | A test runs computeConsensus (consensus.ts:69) over a real day's assembled independentFairValues arrays and asserts agreementScore and dispersion are finite for every game carrying at least one source, and that the outliers list is empty whenever fewer than 3 sources are present, matching the module's own documented guard. |
| C12 | Per-pick estimator ledger: what replaces ShadowSignal | yes | agent | `packages/data-ingestion/src/context-enrichment.ts`, `apps/web/lib/ops/calibration-eligibility-durable.ts`, `apps/web/lib/ops/shadow-signal-store.ts` | Two different workstreams from C2 to C11, run against the same real game, each write an independent GameSignal row under their own sourceName; a read helper returns both rows intact, unlike a ShadowSignal upsert on the shared (gameId, modelVersion) key, which would overwrite one with the other. |
| C13 | NB2 dispersion measurement and same-match parlay correlation | yes | agent | `packages/prediction-engine/src/dispersion/estimate-phi.ts`, `packages/prediction-engine/src/parlay/correlationAdjuster.ts`, `apps/web/lib/sim/score-distribution.ts` | A scheduled report script logs estimatePhi's (estimate-phi.ts:78) verdict and phi per sport across a real settled-totals sample without touching any constant scoring.ts imports; a test on the Parlay MRI same-match display shows its joint probability, computed via bivariatePoissonPmf, differing from the independence product on a synthetic positive-lambda3 case. |
| C14 | Research-scheduling bandit and comp retrieval | yes | agent | `packages/prediction-engine/src/linear-thompson.ts`, `packages/prediction-engine/src/simhash.ts` | A bandit-allocation script takes this track's own candidates as arms with their measured logit-pool betas as rewards and produces a non-hardcoded ranked trial order that changes when a new beta is logged; a SimHash query test over at least two games' reading vectors returns a Hamming-ranked candidate list a caller re-ranks by true cosine, exactly as simhash.ts's own header specifies. |

**What each one builds.**

- **C1, Fixture-grouped walk-forward folds.** An optional fixtureKeyOf grouping parameter for walkForwardSplits so rows sharing a fixture (spread, moneyline, total on the same game share one decisionAt) never straddle a fold boundary; purge and embargo logic, which is already time-based, is untouched. Risk: edge-lab/walk-forward.ts is shared plumbing another track (L3 calibration heads) may also touch for the sealed holdout; the fix is kept purely additive so any later merge is trivial regardless of what the other track does.
- **C2, NFL and NCAAF margin-mixture spread independent, wired and recentered.** A cover-probability reading per NFL and NCAAF game: the existing Stern-normal-plus-key-number fit (margin-mixture-model.ts:120) run on loadSportResultGamesForElo's settled margins, then recentered on that game's Elo-implied margin (a new small OLS fit of margin on Elo differential) before evaluating coverProbability against the posted spread. Capture that starts because of this row: First-ever spread-side independent probability logged for NFL and NCAAF, on every priced game, from the day this lands. Risk: The existing fit's mu is the unconditional population mean of ALL historical margins, not a team-specific prediction; wiring it naively (as a population shape only) without the Elo recentering step would ship a spread independent that is the same for every game. marginsFromTeamGameRecords (margin-mixture-model.ts:101) is also the WRONG adapter here; it expects TeamGameRecord, not loadSportResultGamesForElo's EloResultGame shape, so the correct wiring computes signed margins directly (homeScore minus awayScore) rather than forcing that adapter.
- **C3, NBA and NCAAB continuous-only margin model, built new.** A basketball sibling of the margin-mixture fit with an empty key-number set (no discrete masses), fit independently on NBA's own and NCAAB's own settled final scores, since no basketball key-number literature exists anywhere in this repository. Capture that starts because of this row: First spread-side independent probability for NBA and NCAAB, on every priced game, from day one. Risk: Shipping any nonzero basketball key mass without an independently measured basis would be fabrication under rule 8's own instructions; this ships continuous-only by design, and a future basketball key-number candidate needs its own pre-registration and kill line before it is added.
- **C4, NFL EPA as-of correctness and liveness, measured before any cutover.** A parallel, season-to-date-filtered NFL opponent-adjusted EPA reading, run alongside (never replacing) the live whole-season call, logged side by side so the size of the leak is measured before anyone touches the live path; wires nfl-epa-path.ts's already-written liveness probe to the real TeamGameEfficiency row count each cycle. Capture that starts because of this row: Every live NFL week now has a shadow-measured answer to whether the whole-season EPA read actually leaked forward information, and by how much. Risk: The live where: { season: nflSeason } query (build-independent-fair-values.ts:366) already feeds a real, currently-serving independent-edge computation; this workstream is deliberately additive-only so the eventual cutover (listed as a founder-only-flagged, ledger-evidenced act above) has real before/after numbers to act on.
- **C5, NFL EPA dropback and rush split.** Two opponent-adjusted ratings (pass, rush) instead of one blended overall, by branching team-efficiency.ts's already-fetched play_type column into two aggregates instead of one, then calling the existing, unmodified opponentAdjustedRatings() twice. Capture that starts because of this row: First live-computed pass/rush efficiency split per team per week, directly answering the AGENTS.md gap analysis's number-one ranked build target. Risk: Recomputing the split from raw play-by-play every cycle instead of persisting it as new TeamGameEfficiency columns is a real, recurring fetch cost; acceptable while the split is shadow-only, and persisting it is the one schema addition in this track genuinely worth a founder-applied SQL proposal once the split's kill line clears.
- **C6, NFL QB efficiency composite (own EPA per dropback plus own CPOE).** A per-starting-QB efficiency reading combining the engine's own fit-on-load expected-points model's dropback EPA with its own fit-on-load CPOE model, opponent-adjusted, keyed to the passerId actually observed that week. Capture that starts because of this row: First per-QB, per-week efficiency reading built entirely on the engine's own validated EP and CPOE models rather than a re-served vendor number. Risk: A composite keyed only to a team code, not the actual starter, would silently misread a team's efficiency the week a backup plays; the reading's shape must make that mistake structurally hard to write, not just documented.
- **C7, NFL turnover differential: occurrence versus recovery.** Opponent-adjusted forced-fumble and interception OCCURRENCE rates per team, built new from nflverse play-by-play; recovery share is computed and reported for transparency but is a separately typed field that never feeds the opponent-adjustment call, per the standing engine rule that recovery is near-pure noise. Capture that starts because of this row: First live-computed turnover-occurrence reading per team per game, every week, ready for the eventual points-per-turnover conversion once that coefficient is fit rather than assumed. Risk: The natural implementation mistake is conflating forced (partially repeatable skill) with recovered (near-pure noise per the cited year-to-year correlation near zero); the type boundary itself, not a comment, is what has to stop that.
- **C8, NFL OL versus DL pressure matchup, built new.** Team-level pressure-allowed (offense) and pressure-created (defense) floor-proxy rates, opponent-adjusted and matched up, from the qb_hit and sack columns nflverse already carries; explicitly labelled as a floor, never as true pressure, since nflverse and FTN carry no hurry column. Capture that starts because of this row: First live team-level pressure-matchup reading, per team per week, directly answering the AGENTS.md gap analysis's number-three ranked build target; origin/hermes/nfl-adv-metrics-2026-09-17's player-level pressure-to-sack.ts is a candidate secondary input once that branch merges, not a prerequisite. Risk: Getting the offense/defense sign convention backwards (feeding raw pressure-allowed-rate as offValue) would silently score heavily-pressured offenses as good; this is exactly the mistake the sign-convention test exists to catch before any shadow row is trusted.
- **C9, ML-GBM referee: training harness and shadow wiring.** A walk-forward-fit run of ml-estimator.ts's existing gradient-boosted-stump ensemble against real settled results and structured features (the other independents' outputs, not raw box scores), producing a provenance-complete artifact its own honesty gate can validate. Risk: Gradient-boosted stumps on structured features tend to rediscover whatever Elo and EPA already encode; the only informative kill-line test conditions on the OTHER independents already assembled by build-independent-fair-values.ts, not on the market alone, or a real correlation gets misread as new information.
- **C10, Remote ensemble: calibrate and shadow-wire the ETKF endpoint.** A fit of gse-ml-service's ETKF endpoint's logistic_scale and home_advantage against real settled margins, plus the ModelEndpoint configuration that lets ensemble/remote-model-client.ts and shadow-evaluation-pass.ts's LiveOrchestrator actually call it, activating BAEE's dormant second-model slot. Capture that starts because of this row: The moment a second real endpoint exists, BAEE_NUM_MODELS (shadow-evaluation-pass.ts:62) becomes 2 and the Bayesian model-averaging math in baee-ensemble.ts finally has something to learn. Risk: remote-model-client.ts's own header (line 6) still says no real remote service exists; that sentence is stale the moment gse-ml-service is deployed. The endpoint list must include ETKF only. TDA, free energy, MPS and IRL are explicitly non-predictors by the service's own README and must never be added to this track's endpoint configuration.
- **C11, Consensus and divergence aggregator, wired.** Agreement score, dispersion, and outlier detection computed over each game's already-assembled independentFairValues array, closing the architecture's own stated-but-unimplemented invariant that single-source agreement is a feature. Capture that starts because of this row: Every priced game now has a measured agreement and dispersion reading the moment two or more independents (existing or new) fire on it, feeding evidence-readiness-matrix.ts's factor keys the day that module is wired by its own owning track. Risk: This produces a reading and nothing else; it must never itself cap or raise a tier. That wiring, if it happens at all, belongs to whichever track owns the L2 tier-cap invariant already written into the architecture, not to this one.
- **C12, Per-pick estimator ledger: what replaces ShadowSignal.** Shared, optional write and read helpers over GameSignal (per game, per source READINGS) and a durable, scope-keyed artifact store following the existing JarvisMemoryEvent pattern (population-level FITS: Elo rating snapshots, margin-mixture population fits, NB2 phi, ML-GBM weights, ETKF calibration), replacing ShadowSignal's one-row-per-(gameId, modelVersion) ceiling. Capture that starts because of this row: Every reading in this track becomes queryable per game, per source, per as-of timestamp, instead of collapsing into the single number ShadowSignal's schema structurally cannot avoid collapsing into. Risk: This is offered for consistency, not as a gate: any workstream above may write its own GameSignal.upsert directly on day one, copying context-enrichment.ts:328-361 verbatim, and adopt the shared helper later. Nothing in C2 through C11 waits on this landing first.
- **C13, NB2 dispersion measurement and same-match parlay correlation.** A per-sport NB2 dispersion (phi) measured each cycle against real settled totals, logged to a report only; the existing bivariate-Poisson same-match correlation math wired into the already-illustrative Parlay MRI display in place of its current independence assumption, still labelled illustrative and still priced:false. Capture that starts because of this row: A running, per-sport, per-cycle measurement of how thick each sport's totals tails actually are, replacing an inherited, undocumented constant of 12 with an honest number nobody has yet acted on. Risk: estimate-phi.ts's own header is explicit that its constant is founder-gated once anyone wants to change what a priced path uses; this workstream must not quietly wire the measured phi into a scoring path to save a later step.
- **C14, Research-scheduling bandit and comp retrieval.** linear-thompson.ts allocates edge-lab trial priority among this track's own roughly ten candidate estimators, using each one's measured logit-pool beta as reward, never a money decision; simhash.ts indexes each game's assembled numeric readings (Elo, EPA overall, margin-mixture mu and sigma, consensus dispersion) for a first Hamming-ranked "games like this one" retrieval. Capture that starts because of this row: A standing, reusable trial-priority ranking over every candidate this track and any future one proposes, and a first similarity index over this track's own readings, feeding a future GLSP-style prop-distribution primitive without waiting on the feature-store to be populated by another track. Risk: linear-thompson.ts's own header bans money decisions outright; this workstream touches only which candidate estimator gets tested next in the edge-lab harness, never a stake, a price, or a publish decision.

**Invariants that must survive every future edit to this track:**

- Every estimator's math stays pure inside packages/prediction-engine (no I/O, no Prisma); a thin writer in packages/ingestion-pipeline or packages/data-ingestion calls it and persists the result. packages/* never imports apps/web.
- No output from this track reaches a Pick, a tier, a rank, or edge-engine.ts's live independentFairValues array by itself. Every reading lands in GameSignal (per game, per source) or the durable artifact store (population-level fits), which the certification track reads from when and if it chooses to admit a source. Admission is a MODEL_VERSION-bumping act this track never performs.
- Every reading and artifact carries an explicit asOf or capturedAt timestamp strictly before the game's commenceTime; an estimator that cannot state that timestamp does not write.
- skellam.ts is never called for football or basketball (its own boundary at skellam.ts:30 stands); margin-mixture (Stern-normal plus discrete key masses) is the football spread substrate, continuous-only Stern-normal is the basketball one.
- A killed candidate (FIRE_NOTHING: logit-pool beta's 95 percent CI includes zero, or the paired out-of-fold log-loss lower bound over the market-only baseline is not positive) is never re-admitted without a new pre-registration naming the prior kill. This binds edge-lab/features/nfl-team-form.ts's existing FIRE_NOTHING (MI probe p=0.060) as much as any kill this track produces.
- A null read from an inert, rights-blocked, or not-yet-trained source (ml-estimator.ts before a real artifact exists, the NHL or NBA play-by-play-driven estimators while their sources are PARKED) stays null and casts no vote. It never degrades to 0.5 or to neutral.
- estimate-phi.ts's measured NB2 dispersion and any other diagnostic constant reach a scheduled report only. Changing a constant a priced path actually uses is a MODEL_VERSION-affecting, founder-only act, per the module's own header.
- linear-thompson.ts never gates a stake, price, payout, or publish decision. Its only legal use in this track is allocating which candidate estimator the edge-lab harness tests next.
- Every kill-line evaluation runs on fixture-grouped, purged, embargoed, out-of-fold rows. A per-row (not per-fixture) fold, as edge-lab/walk-forward.ts:80-137 currently produces, overstates effective sample size for any estimator whose output feeds more than one market on the same game, which is all of them.

Section 2 already measures the shape of the problem: 299 non-test files in packages/prediction-engine, 87 of them ORPHAN, and the independent-estimator layer is the densest concentration of unused, working math in the whole repository. Track C treats that as the asset rule 4 says it is. The charter is narrow and load-bearing: every estimator in this track writes a reading and never a claim. A reading is a number with a source, an as-of timestamp and a game attached, sitting in a store nothing certifies from automatically. The store question has a precise, previously undocumented answer. ShadowSignal (schema.prisma:1341-1362) is unique on (gameId, modelVersion) and holds exactly one home-win probability; it was built for one shadow filter and genuinely cannot hold ten estimators' opinions on the same game without each upsert overwriting the last. The replacement already exists with zero schema change: GameSignal (schema.prisma:775-794) is unique on (gameId, sourceName, signalKey), carries a flexible Json signalValue, and already has one real writer to copy verbatim, context-enrichment.ts:328-361, which upserts two schedule-density keys today under sourceCategory SCHEDULE. Every workstream below is a new sourceName under that same table, using an existing, allowed SignalCategory (RATINGS or TEAM_RATES fit most of them; the schema forbids inventing a new category, and the task's own verified fact that SignalCategory has no injury-news member generalizes: this track adds sourceNames, never enum values). Population-level artifacts that are not per-game (an Elo rating snapshot, a margin-mixture population fit, a measured NB2 phi, an ML-GBM weight set, an ETKF calibration pair) do not belong in GameSignal at all; they belong in the JarvisMemoryEvent-backed durable-store pattern apps/web/lib/ops/calibration-eligibility-durable.ts, proven-path-durable.ts and map-bakeoff-durable.ts already use, scope-keyed and requiring no migration either. Both stores are live today. That is what makes rule 3 more than a slogan here: every workstream in this track can start writing real rows this week, using patterns the codebase has already proven, with no founder action and no dependency on any other track's proposed schema.

Before any candidate can honestly claim a lift, the evaluation harness itself needs one fix, and this track owns it rather than assuming another track will. edge-lab/walk-forward.ts:80-137 cuts folds by sorted array position with no group key: sorted.slice(startIdx, endIdx). A single fixture's spread, moneyline and total rows share one decisionAt and can straddle a fold boundary, which overstates effective sample size for every estimator this track builds, since a team-strength read feeds more than one market on the same game. The fix is a small, additive, optional fixtureKeyOf parameter, never a rewrite, and it is workstream C1. With it in place, every other workstream in this track uses the same kill-line vocabulary the repository has already validated once: fit logit(p) = w0 + w1*logit(market) + w2*logit(candidate) by maximum likelihood on out-of-fold rows (edge-lab/logit-pool.ts), and read the Wald 95 percent CI of w2. A CI that includes zero is FIRE_NOTHING, logged through trials-registry.ts as a first-class null, never silently dropped. This is not a new invention; it is the exact test that already produced edge-lab/features/nfl-team-form.ts's recorded kill (mutual-information probe p=0.060, logit-pool beta CI spanning zero), and this track's invariant is that no candidate below may be re-admitted without a pre-registration naming a prior kill, whether that kill is nfl-team-form.ts's or one this track produces itself.

The single biggest structural gap this track closes is the spread independent. Section 3's own L2 layer states it plainly: NFL, NBA and NCAA spreads have no independent estimator at all, so no edge veto can fire on them and confidence alone orders those boards, which AGENTS.md's own live measurements show inverting at the top. nfl/margin-mixture-model.ts is a complete, tested, ORPHAN answer for football: a Stern-normal continuous component mixed with Laplace-smoothed empirical mass at the classic key numbers (margin-mixture-model.ts:35, signed 3, 6, 7, 10), requiring 64 settled margins before it will fit (:42) and already exposing coverProbability against a posted spread (:228). Wiring it is not, however, a one-line import. The fit's mu today is the unconditional mean of every historical margin passed in, not a team-specific prediction, so calling it as-is against loadSportResultGamesForElo's real settled games (build-independent-fair-values.ts:116-131, already as-of correct via gameDate: { lt: before }) would produce the same population shape for every single game. The correct design recenters that shape per matchup: fit a small OLS conversion of margin on Elo rating differential, then evaluate the mixture's masses and continuous tail around that game's Elo-implied margin rather than the raw population mean. A second, smaller trap sits in the same file: marginsFromTeamGameRecords (:101) expects team-rates.ts's TeamGameRecord shape, not loadSportResultGamesForElo's EloResultGame shape, so the honest wiring skips that adapter and computes homeScore minus awayScore directly. NCAAF reuses the same key-number set on its own independently-fit sample, a stated assumption pending its own kill-line test, never an unexamined borrow. NBA and NCAAB get a new sibling with an empty key-number set, because zero basketball key-number literature exists anywhere in this repository and inventing one would be exactly the fabrication rule 8 prohibits; fitting on nothing but final scores means it needs no play-by-play at all. That distinction matters for the sports this track cannot touch yet: source-registry.ts:424,433 verdicts the entire Sports-Reference family, which covers Basketball-Reference, forbidden, and :282,292 verdicts MoneyPuck non-commercial-only, so a true possession-efficiency or expected-goals independent for NBA, NCAAB or NHL is genuinely PARKED under rule 5's own condition, a rights ruling this track cannot grant itself, not a build gap this track failed to close.

NFL's opponent-adjusted EPA independent (opponent-adjusted.ts:43, nfl-epa-fair-value.ts, HFA 0.025 EPA per play at :27, margin scale 0.12 at :25) is already wired and already live, and this track finds two real defects in it without touching the live path directly. First, build-independent-fair-values.ts:366 queries TeamGameEfficiency with where: { season: nflSeason } and no week or date bound, so a mid-season pick's independent can read efficiency from weeks that have not happened yet relative to that specific game, exactly the whole-season-versus-season-to-date leak section 3 already names. This track ships the season-to-date version as a parallel shadow computation first, logs the measured size of the leak, and only then is the live cutover even a candidate, and that cutover is called out above as ledger-evidenced rather than ordinary because it changes what an already-live independent-edge computation feeds into today's publish and suppression logic. Second, and immediately buildable with no such caution: the split the architecture asks for, offense and defense broken into dropback and rush, is nearly free. team-efficiency.ts:18-19 already projects play_type into its ten-column fetch, and its aggregation loop at :94 already filters to exactly pass and run before folding both into one bucket at :104-105. Branching that fold into two buckets instead of one, then calling the same, unmodified opponentAdjustedRatings() twice, produces adjOffPass, adjOffRush, adjDefPass and adjDefRush with no new ingestion job and no schema change, only a persistence upgrade to consider later. This is the AGENTS.md gap analysis's own top-ranked build target, and it ships from the exact fetch the platform already runs on a schedule. The QB efficiency composite sits one door over: expected-metrics/expected-points.ts fits its own expected-points surface from public situation columns at load time and validates itself against nflverse's epa by correlation; expected-metrics/expected-completion.ts does the same for its own CPOE, validated against NGS's published CPOE. Both are wired to exactly one premium API route today and read by nothing that scores a pick. Combining dropback EPA from the first with CPOE from the second, opponent-adjusted and keyed to the actual observed starting passer rather than a team code, is the highest-leverage single QB input the gap analysis names, built entirely from substrate the engine already trusts enough to validate and serve.

Turnover differential and the OL-versus-DL pressure matchup are not orphans to wire; nothing in packages/prediction-engine computes either on main today, and the branch that has a related player-level ratio (origin/hermes/nfl-adv-metrics-2026-09-17's pressure-to-sack.ts, verified fetchable and read) is a candidate secondary input, not a substitute for the team-level matchup this track builds. Both are genuinely new, and both carry the same trap in different clothing. AGENTS.md states the turnover rule directly: occurrence (forced fumbles, interceptions thrown against expectation) is partially repeatable skill, recovery is near-pure noise with year-to-year correlation near zero. The design answer is not a comment, it is a type boundary: forced-fumble and interception occurrence rates are opponent-adjusted through the same iterative machinery already proven on EPA; recovery share is computed, reported, and structurally unable to reach that same call, so a future editor cannot accidentally wire noise into a rating by forgetting a rule written in a docstring. Pressure carries the equivalent trap in sign convention rather than in noise. opponentAdjustedRatings' own convention (opponent-adjusted.ts:11-12) is that a higher offValue is a better offense and a lower defValue is a better defense; feeding raw pressure-allowed-rate straight in as offValue would score a heavily-pressured, badly-protected offense as good, exactly backwards. The pressure-matchup module computes team-level pressure-allowed and pressure-created from the qb_hit and sack columns team-efficiency.ts's fetch can trivially extend, flips the sign correctly on the way into the same iterative adjustment, and, following the hermes branch's own honest naming, never calls its output true pressure, since neither nflverse nor FTN carries a hurry column; it is a floor, stated as one, in the data, not just in prose.

Two ambitious but real capabilities sit further out and this track activates both without inventing anything. ml-estimator.ts is a complete, honestly-gated gradient-boosted-stump ensemble that already refuses to serve a probability without a fresh, provenance-complete, adequately-sized trained artifact; no such artifact exists today, so wiring it costs nothing and simply starts the clock on the settled-outcome data a real walk-forward fit will eventually need. Separately, and this is the most consequential single finding in this track's reading list: ensemble/remote-model-client.ts's own header, at line 6, states that no real remote model service exists yet. That is now false. gse-ml-service is a real, tested FastAPI sidecar with a Dockerfile, and its README is unusually candid about its own limits: of five endpoints, only ETKF, a deterministic square-root ensemble Kalman filter with no fitted parameters, returns a genuine probability, and even that is uncalibrated by the service's own admission, since logistic_scale and home_advantage are request inputs defaulting to a bare, unfit convention. The other four, TDA, free energy, MPS and IRL, are explicitly non-predictors by the service's own README, and the client's extractProbability rule already excludes all four automatically, a claim pinned by the service's own Python test asserting exactly one endpoint is admitted. Nothing in this codebase configures an endpoint pointing at it, so shadow-evaluation-pass.ts's LiveOrchestrator has run with an empty endpoint list and BAEE_NUM_MODELS pinned at 1 (shadow-evaluation-pass.ts:62) since the day that constant was written, meaning ensemble/baee-ensemble.ts's Bayesian model-averaging math has had nothing to average. Fitting ETKF's two free parameters against real settled margins and building the ModelEndpoint configuration is fully buildable now; making the endpoint live is the one workstream in this entire track that is genuinely founder-only, because it requires a deployed, reachable service and an environment variable, not a gate flip but real infrastructure an agent session cannot provision.

Rounding out the track are three smaller instruments that turn existing math into measurement rather than into a new decision. consensus.ts computes an agreement score, a dispersion figure and outlier flags over exactly the independentFairValues array build-independent-fair-values.ts already assembles for every priced game; it is the literal, unimplemented mechanism section 3's own invariant describes when it says single-source agreement is a feature that caps tier, and wiring it gives that sentence a real number to point at for the first time. dispersion/estimate-phi.ts and parlay/correlationAdjuster.ts both explicitly forbid themselves from touching a live scoring path in their own headers, so this track respects that literally: phi becomes a per-sport, per-cycle measurement in a report, and the bivariate-Poisson same-match correlation upgrades the Parlay MRI page's display math (apps/web/lib/sim/score-distribution.ts already labels that whole family of pages illustrative, not a live projection) without changing its priced:false status or its label. linear-thompson.ts and simhash.ts close the loop reflexively: the bandit allocates which of this track's own dozen candidates the edge-lab harness tests next, using each one's measured logit-pool beta as its only reward signal, and never a stake or a price; the similarity index gives the first concrete substrate for a GLSP-style prop-distribution primitive, built from this track's own computed readings rather than waiting on the feature-store, which section 2 confirms holds zero registered features today, to be populated by whichever track owns it.

Nothing in this document asks for a number to reach a customer. Every workstream above produces a row in GameSignal or a row in a durable, scope-keyed artifact store, timestamped before the game it describes, sourced by name, and readable by anyone who wants to run the one honest test this track insists on everywhere: a fixture-grouped, purged, embargoed out-of-fold fit of the candidate's weight on top of the market's own logit. Most of these fourteen workstreams will fail that test, and AGENTS.md's own recent history says that is the expected, healthy outcome, not a setback; W1 through W4 in the Move-37 lane were killed by exactly this kind of test and the record calls that a contribution, not a loss. What changes because of this track is that the engine will, for the first time, have a shadow, per-source, per-game answer on file for spreads in four sports that have never had an independent at all, for a dropback and rush split the architecture has asked for since section 2 was written, for turnover occurrence separated cleanly from turnover noise, for a pressure matchup labeled honestly as a floor, for a QB composite built on the engine's own validated math instead of borrowed numbers, for a second real model finally reachable by an ensemble that has been waiting for one since the day it shipped, and for an agreement score behind an invariant that has, until now, only ever been a sentence.

**Do not, on this track:**

- Never let a shadow reading from this track skip straight into a Pick's factorBreakdown, confidence, or tier without going through feature admission and a founder-approved MODEL_VERSION bump.
- Never widen a stratum's n-floor, shorten the purge or embargo window, or relax the fixture-grouping fix to make a candidate's kill line pass.
- Never present the ETKF endpoint's raw output as a calibrated win probability before logistic_scale and home_advantage are fit against real settled results; the service's own response repeats this caveat and this track must not drop it downstream.
- Never call the TDA, free-energy, MPS, or IRL endpoints on gse-ml-service as if they returned a probability; the service's own extractProbability rule already excludes all four, and this track's endpoint configuration must not accidentally reintroduce one of them for a different, unrelated purpose.
- Never forward turnover recovery share into an opponent-adjustment or scoring computation as if it were skill; only forced-fumble and interception occurrence may feed forward, per AGENTS.md's own standing rule and the literature it cites (recovery year-to-year correlation near zero).
- Never let ml-estimator.ts's predictWinProb serve a value when its provenance, sample-size, or staleness gate fails; never patch around that honesty gate to force a reading to exist.
- Never treat the whole-season NFL EPA read (build-independent-fair-values.ts:366, where: { season: nflSeason }) as fixed and unmeasurable; but never swap the live call site either, without first logging a side-by-side shadow comparison showing the size of the leak.
- Never re-promote edge-lab/features/nfl-team-form.ts's killed rolling-form features under a different file name; the dropback/rush split and the turnover and pressure estimators are opponent-adjusted population fits, a structurally different method, and must not be conflated with or used to sneak that kill back in.
- Never fabricate a basketball, NCAAB, or NHL key-number set, an OL/DL true-pressure rate (nflverse and FTN have no hurry column), or a play-by-play-driven efficiency estimator for a sport whose only available charting source is rights-forbidden (source-registry.ts:424,433 for Basketball-Reference) or non-commercial-only (source-registry.ts:282,292 for MoneyPuck).
- Never add a new Vercel cron entry, a new env flag, or a schema migration to ship any of this; every workstream below piggybacks on an already-scheduled cron and an already-existing table (GameSignal, or the JarvisMemoryEvent pattern already used by calibration-eligibility-durable.ts and its siblings).

**Founder-only on this track:**

- Deploy gse-ml-service to a reachable URL and set the environment variable ensemble/remote-model-client.ts's caller-supplied ModelEndpoint list will point at. Nothing in this track can turn the ETKF calibration from shadow-ready to shadow-live without it.
- Apply, as founder-run SQL under docs/ops/proposals/ (never under packages/db/prisma/migrations), any schema addition this track's measurements justify: for example first-class dropback/rush columns on TeamGameEfficiency, or a durable estimator-artifact table, if the interim GameSignal- and JarvisMemoryEvent-backed stores prove too costly to recompute every cycle.
- Obtain a MoneyPuck commercial license or written permission (source-registry.ts:292's own stated remedy) before an NHL expected-goals independent leaves PARKED; the same applies to any future NBA/NCAAB play-by-play source, since Basketball-Reference is verdict forbidden today.
- Any MODEL_VERSION bump or edge-engine.ts independentFairValues admission that would let one of this track's shadow readings start influencing a published probability, tier, or rank. This track measures; that act certifies, and only the founder does it.
- Swap build-independent-fair-values.ts's live tryNflEpaFairValue query from whole-season to season-to-date, once this track's own shadow comparison (workstream C4) has logged the size of the leak. This is not a gate or env flip, so it is not founder-exclusive in the way the four above are, but because it changes a number an already-live independent-edge computation feeds into today's publish and suppression logic, it should ship with its own before/after evidence in the ledger rather than as an ordinary orphan-wiring change.

### Track D: the gate and veto plane

**Charter.** Track D wires every withhold only mechanism in this system behind one ledger and one proof obligation, so a veto can start recording its verdict today and may only start acting on that verdict once its withheld set is measured, on settled rows, to grade worse than what it keeps.

**Starts on day one, with no founder action and no dependency:**

- Move VetoCandidate and a numeric-free VetoVerdict into @sports/types (D1).
- Build veto-lane.ts's injected function type and thread a no-op default through processSport, refreshOdds, generateSignalSlate and runBoardFillPipeline (D2).
- Wire the real closure with the two-pass record and enforce split, every signal's enforce state at its honest default of false (D3).
- Write a gate_decision row for every evaluated fixture and market every cycle, isBootstrap always explicit, and retroactively ledger the two vetoes that already enforce today (D4).
- Fix the Central day boundary in the same change that makes the table's rows real for the first time (D4).
- Write and unit test the gate promotion evaluator and its integrity checks against synthetic fixtures (D5).
- Backfill book-agreement's own kept versus withheld partition over already-settled historical picks, since its inputs are already persisted.
- Write the no-added-conviction boundary tests (D6).
- Build, but never call, the founder-only promotion admin route (D7).

| ID | Workstream | Concurrent | Owner | Entry files | Acceptance |
|---|---|---|---|---|---|
| D1 | Move VetoCandidate and a numeric-free VetoVerdict into @sports/types | yes | agent | `packages/types/src/index.ts`, `apps/web/lib/conviction/gate-contract.ts` | npm run typecheck stays 0; a new packages/types test asserts VetoVerdict has no property of type number; gate-contract.test.ts is untouched and still green |
| D2 | Injected veto-lane boundary through the mint path, default no-op | yes | agent | `packages/ingestion-pipeline/src/veto-lane.ts`, `packages/ingestion-pipeline/src/process-sport.ts`, `packages/ingestion-pipeline/src/refresh-odds.ts`, `packages/ingestion-pipeline/src/generate-signal-slate.ts` | the full existing test suite for all five files stays green with zero new failures; a new veto-lane.test.ts pins that omitting the parameter reproduces byte-identical scorer output on a fixed fixture set |
| D3 | Real closure, two-pass evaluateGate, per-signal enforce state | yes | agent | `apps/web/lib/conviction/veto-lane-adapter.ts`, `apps/web/lib/conviction/registry.ts`, `apps/web/app/api/cron/refresh-odds/route.ts` | a fixture test proves that with zero signals enforced (today's real state) a synthetic CONTRADICTS candidate still returns publish: true from the enforcing pass and publish: false from the recording pass; a second test with one signal force-enforced in the test only proves the reverse |
| D4 | gate_decisions writer: the isBootstrap trap, folding in the two live display vetoes, the Central day fix | yes | agent | `packages/ingestion-pipeline/src/gate-decision-writer.ts`, `apps/web/lib/picks/adverse-edge-suppression.ts`, `apps/web/lib/picks/model-signal-coherence.ts`, `apps/web/lib/time/central-day.ts` | a test asserts the literal write payload sets isBootstrap: false rather than inferring it from behavior; a test asserts one row per (gameId, pickType, cycle) via an idempotency key so a retried cron cycle never duplicates; passes.ts and state.ts tests are re-pinned against Central boundaries instead of UTC ones |
| D5 | Gate-promotion evaluator: the statistical proof obligation | yes | agent | `packages/prediction-engine/src/promotion/gate-promotion.ts`, `packages/prediction-engine/src/promotion/gate-promotion-integrity.ts` | unit tests on synthetic kept and withheld samples reproduce a hand-computed Welch statistic; a negative-control test proves the evaluator reports insufficient-n below the 100-decision floor per signal; an integrity test proves it rejects a duplicated fixture id and a timestamp with no explicit time zone |
| D6 | No-added-conviction as a test, not a comment | yes | agent | `apps/web/lib/conviction/__tests__/gate-cannot-raise.test.ts`, `packages/ingestion-pipeline/src/__tests__/veto-lane-cannot-raise.test.ts` | npx vitest run on both new files passes; both are demonstrated failing against a deliberately broken local diff before that diff is reverted |
| D7 | Founder-only per-signal promotion switch | yes | founder | `apps/web/app/api/admin/conviction-gate/route.ts`, `apps/web/lib/conviction/registry.ts` | a test asserts the route refuses when the named signal's report status is not cleared; a test asserts no code path outside this route can change a signal's enforce state |

**What each one builds.**

- **D1, Move VetoCandidate and a numeric-free VetoVerdict into @sports/types.** Two new exported types in packages/types/src/index.ts, structurally matching gate-contract.ts's existing GateCandidate and GateVerdict but with VetoVerdict narrowed to publish: boolean plus an opaque evidence payload and no numeric field anywhere in it, so the shared boundary type is itself part of the no-added-conviction guard. Risk: Structural typing means a future field added to GateVerdict will not automatically appear on VetoVerdict. That is intentional: VetoVerdict must stay narrower than GateVerdict by design, never mirror it exactly.
- **D2, Injected veto-lane boundary through the mint path, default no-op.** packages/ingestion-pipeline/src/veto-lane.ts (new) declaring VetoLane = (candidate: VetoCandidate) => Promise<VetoVerdict>, threaded as one more optional field on the options objects processSport (process-sport.ts:324-329), refreshOdds, generateSignalSlate and runBoardFillPipeline (board-fill.ts:27-30) already accept, defaulting to a lane that always resolves publish: true, mirroring the ReadinessGates injection idiom (packages/prediction-engine/src/readiness.ts:20,127) this repo already trusts. Depends on D1: real. The injected function type must name VetoCandidate and VetoVerdict, so they must exist first. Capture that starts because of this row: NONE yet, this step only opens the door
- **D3, Real closure, two-pass evaluateGate, per-signal enforce state.** apps/web/lib/conviction/veto-lane-adapter.ts (new) builds the real VetoLane from registry.ts and signals/*, calling the existing, unmodified evaluateGate (gate-contract.ts:164-242) twice: a recording pass over every live signal with requireEvidence false, and an enforcing pass over only the signals a founder has promoted, called with an explicit minCorroborations: 0 override at that one call site so a lone NEUTRAL read can never withhold and only an actual CONTRADICTS can (traced against gate-contract.ts:207-218 and :234-241, where the module's own default of 1 would otherwise withhold on bare silence-plus-one-NEUTRAL). Depends on D2: real. The adapter is the concrete VetoLane the injected type exists to carry. Capture that starts because of this row: the full recording-pass verdict, every read, every silent key, every reason, for every evaluated fixture and market, every cycle
- **D4, gate_decisions writer: the isBootstrap trap, folding in the two live display vetoes, the Central day fix.** packages/ingestion-pipeline/src/gate-decision-writer.ts (new) writes one GateDecision row per evaluated fixture and market per cycle (schema.prisma:665-687) with isBootstrap explicitly false on every write, never the column default (schema.prisma:675); adverse-edge-suppression.ts and model-signal-coherence.ts call sites gain a matching write with zero change to their existing enforcement; apps/web/lib/time/central-day.ts (new), built on the same IANA offset arithmetic rest-travel.ts already tests (rest-travel.ts:149), replaces the UTC todayBounds duplicated at passes.ts:76 and state.ts:305 in the same change that starts producing real rows, since a boundary bug that was latent only for lack of rows becomes live the moment this writer ships. Depends on D3 for the veto-lane-originated rows. NONE for the adverse-edge and model-signal-coherence rows, since those two rules already enforce unconditionally in production today and only need an audit write added. Capture that starts because of this row: every publish and every withhold, full fidelity through the season and until a gate-promotion run has consumed it, then evidenceRefs prose compacts while status, reasonCode, modelVersion and isBootstrap never change or disappear
- **D5, Gate-promotion evaluator: the statistical proof obligation.** packages/prediction-engine/src/promotion/gate-promotion.ts and gate-promotion-integrity.ts (both new), reusing welchOneSidedNonInferiority (promotion/clv-non-inferiority.ts:63) as an unpaired, epsilon-zero superiority test on decided outcome (WIN 1, LOSS 0, pushes excluded) and same-book closing value (ClvRow shape, promotion/types.ts:41-51, relabelled kept versus withheld), fixture clustered, at an n floor of 100 CONTRADICTS decisions per signal (matching MIN_STRATUM_CALIBRATION, edge-lab/selective-gate.ts:266), both legs required to clear a lower bound above zero exactly as evaluatePromotion already requires Leg 1 AND Leg 2 (promotion/evaluate.ts:6,25), integrity checked against fixture duplication and missing time zones the way promotion/integrity.ts already checks model promotion (integrity.ts:1-30), and excluding any row with an unreadable generatedAt or commenceTime rather than keeping it, the stricter rule section 3's L0 already states and the opposite of the public surfaces' own in-play-exclusion.ts:60-66. Depends on NONE for the code, which runs on synthetic fixtures today. Its first non-trivial real answer needs settled rows D3 and D4 start capturing, a wall-clock dependency, not a track dependency. Capture that starts because of this row: NONE new, reads what D4 already writes Risk: book-agreement is the one signal whose kept versus withheld partition is backfillable immediately from already-settled history, since bookmakerCount and consensusPct are already persisted on every book-priced pick; every other signal must wait on real capture accruing at the rate games are played.
- **D6, No-added-conviction as a test, not a comment.** apps/web/lib/conviction/__tests__/gate-cannot-raise.test.ts and packages/ingestion-pipeline/src/__tests__/veto-lane-cannot-raise.test.ts (both new) assert VetoVerdict carries no numeric field beyond a read-only evidence count, and that a deliberately broken local diff which sums a signal's read into confidence fails the check, proving the test fires before it is trusted to guard anything. Lives in the ordinary Vitest suite, never under scripts/guardrails/, which law 2 freezes to agents. Depends on D1: needs VetoVerdict to exist to assert against.
- **D7, Founder-only per-signal promotion switch.** apps/web/app/api/admin/conviction-gate/route.ts (new), admin-authenticated, reads a named signal's latest gate-promotion report and refuses the flip outright unless that report cleared both legs at the 100-decision floor. Only this route, and only the founder through it, may move a signal from log-only to enforcing. Depends on D5: the route reads D5's report to decide whether to allow the flip at all. Risk: An agent may build, test and demonstrate this route against a synthetic cleared report, but must never call it against production data to actually promote a signal.

**Invariants that must survive every future edit to this track:**

- A veto may only remove a row from what a customer sees. It may never add, raise, or alter a probability, a tier, a rank, a selection, a line, or a receipt field.
- A null read is never agreement, disagreement, or zero. A signal that throws is silent, never evidence (apps/web/lib/conviction/gate-contract.ts:176-181).
- Any single CONTRADICTS from an enforced signal holds the row (gate-contract.ts:192-205). requireEvidence and any minCorroborations above the enforcing pass's explicit 0 override stay founder only, exactly as registry.ts already documents for requireEvidence.
- The recording pass runs on every live signal every cycle regardless of enforcement state. The enforcing pass only ever sees signals a founder has promoted.
- VetoVerdict, the type crossing the packages/apps boundary, carries no numeric field. Only publish: boolean is ever read by a caller; everything else is evidence for a person.
- Every gate_decision write sets isBootstrap: false explicitly. No writer may rely on the schema default of true (schema.prisma:675).
- A signal is promoted from log only to enforcing only after its withheld set grades measurably worse than its kept set on both decided outcome and same book closing value, fixture clustered, at n of at least 100 CONTRADICTS decisions, with a lower confidence bound above zero on both legs.
- A withhold never bumps MODEL_VERSION and never needs a CalibrationProposal. A change that raises any probability always needs both (scripts/guardrails/model-freeze.mjs:25-28).
- Demotion from enforcing back to log only may happen automatically, without a founder, the moment the evaluator's own numbers stop clearing. Promotion the other direction never does.
- pricesWorseThanMarket and every other shared predicate this plane depends on is imported from @sports/types, never restated inside a package or inside apps/web.
- gate-consumer.ts's FiredDecision stays unpersisted, on its own documented grounds; this track does not force it into the new ledger.

Track D owns the withhold only plane: every mechanism in this system whose only power is to remove a row from what a customer sees, never to add a probability, a tier, or a rank. That plane already has three live members and one orphaned one. The two live display side filters, apps/web/lib/picks/adverse-edge-suppression.ts and apps/web/lib/picks/model-signal-coherence.ts, already run unconditionally in production and already prove the pattern this whole track generalizes: import the predicate from @sports/types rather than restate it (adverse-edge-suppression.ts:59), gate on a signed number rather than a decision label because a CONTRADICTS row can carry an expectedClv of exactly 0.0 by construction (packages/types/src/index.ts:47-60, IndependentEdgeSummary), treat a missing or non-finite estimate as silence that keeps the row rather than as a reason to hide it (adverse-edge-suppression.ts:72-84, pricesWorseThanMarket at packages/types/src/index.ts:86-90), and write nothing back to the row it drops (adverse-edge-suppression.ts:90-92, model-signal-coherence.ts:56-75). The third live member is the mint time veto itself, the same pricesWorseThanMarket predicate called inside scoreSpreadPick (scoring.ts:604) and scoreMoneylinePick (scoring.ts:1197). It shipped without a MODEL_VERSION bump, and MODEL_VERSION is still v5.2.7 today. That is not a policy this track is proposing, it is a fact already on main, and it is the strongest piece of evidence for the asymmetry argument below. The orphaned member is the conviction gate itself, apps/web/lib/conviction/gate-contract.ts, registry.ts and seven signal modules under signals/, fully built, fully tested in isolation, and never called from anywhere outside its own directory: evaluateGate has zero non-test callers today (gate-contract.ts:164-242). This track's job is to wire that orphan in without changing a single published number on day one, give the whole plane one ledger instead of scattered silent filters, and make every future veto earn its withhold with a measurement rather than a hunch.

The seven signals are honestly inventoried in registry.ts, and the inventory is a fact about the environment, not a preference. book-agreement is live today because its inputs, bookmakerCount and consensusPct, already exist on every book priced pick (registry.ts:60-65). market-movement is live only when LINE_ARCHIVE_ENABLED is true and needs at least two usable snapshots (market-movement.ts:85, MIN_SNAPSHOTS), which the archive provides again now that its 2026-08-22 to 2026-09-13 outage is fixed. rest-travel reads a real schedule and a real stadium table (registry.ts:76-81) but returns mostly NEUTRAL in the first weeks of an NFL season because every team's prior game is preseason, a fact this document is told to trust rather than re-derive. beat-report, scheme-matchup and prop-alignment are wired but inert: each returns null unconditionally while its own deps.live flag is false (beat-report.ts:164,168; scheme-matchup.ts:178,184; prop-alignment.ts:203,209), and each names in its own header exactly what real source would turn it on. narrative-incentive has no source at all and is built purely as an input contract (narrative-incentive.ts:1-45); it will never infer a narrative from a stat line or a coach's former employer. Every one of the seven, live or inert, obeys three rules already encoded in gate-contract.ts: a null is never read as agreement, disagreement or zero; a throw is silent, never evidence, because evaluateGate wraps every call in a try and catch (gate-contract.ts:176-181); and any single CONTRADICTS holds the pick outright, ahead of any count of CONFIRMS (gate-contract.ts:192-205). None of that needs to change. What is missing is a caller.

A third withhold shaped mechanism already runs in production and this track deliberately leaves it outside the new ledger. apps/web/lib/board/gate-consumer.ts is the first production consumer of the selective gate, edge-lab/selective-gate.ts's calibrated lower confidence bound against a market relative edge threshold, and it already returns a five way GateOutcomeCode: FIRE, NO_BET_LCB, NO_BET_WIDTH, INSUFFICIENT_CALIBRATION and NOT_EVALUATED_MISSING_INPUTS (gate-consumer.ts:55-70), each mapped to its own plain sentence (gate-consumer.ts:118-128). Its own header states, correctly, that it does not write to any ledger because FiredDecision has no production persistence path and inventing one would cross a boundary PRODUCT_CASCADE_MAP.md already blocks (gate-consumer.ts:21-26), and separately, publicFire stays false in production regardless of what the selective gate concludes (gate-consumer.ts:93-97). That is a deliberate choice this track respects rather than overrides. A module that has already decided, on its own documented grounds, not to persist and not yet to actually fire in production is not a gap this track's unification needs to close, and forcing it into gate_decisions would be exactly the kind of unrequested widening a design should avoid building without a named reason. If that persistence boundary ever changes, it is a decision for whoever owns PRODUCT_CASCADE_MAP.md and the selective gate, not a side effect of this track.

Wiring the gate without moving a published number rests on two moves, and both can land on day one because neither reads anything another track has to build first. The first move is a type, not a function. packages/types/src/index.ts gains VetoCandidate and a deliberately narrow VetoVerdict, the second holding only publish: boolean plus an opaque, serializable evidence payload and no numeric field anywhere in it. gate-contract.ts itself does not change; TypeScript's structural typing lets a real GateCandidate and GateVerdict, built entirely inside apps/web, satisfy these narrower shapes without one import crossing the boundary packages never cross into apps/web. This is the same boundary pricesWorseThanMarket already lives on, and for the same reason: 22 apps/web test files, the standing note says 19, replace @sports/prediction-engine with a partial mock, so anything the mint path needs from apps/web has to be injected, never imported. The second move is the injection point itself. packages/ingestion-pipeline/src/veto-lane.ts, new, declares the function type a caller provides, a candidate in, a verdict promised out, and processSport (process-sport.ts:324-329), refreshOdds, generateSignalSlate and runBoardFillPipeline (board-fill.ts:27-30) each take it as one more optional field on the options object they already accept, the same idiom ReadinessGates already established as this repository's cross package injection pattern (readiness.ts:20,127). Every existing caller, every existing test, keeps compiling and keeps its current output, because the default is a no op lane that always resolves publish true. This is the first injected function crossing this particular boundary, but it is the same boundary and the same options bag pattern the codebase already trusts.

Capture and enforcement are then split by calling evaluateGate twice from one adapter, apps/web/lib/conviction/veto-lane-adapter.ts, new, never by changing evaluateGate's own tested logic. The recording pass hands it every live signal from registry.ts with requireEvidence false, and its full verdict, every read, every silent key, every reason, is what gets written to the ledger regardless of outcome. The enforcing pass hands it only the signals a founder has actually promoted, and this is where a real subtlety lives: evaluateGate's default minCorroborations is 1 (gate-contract.ts:155), so with only one signal enforced and requireEvidence still false, a bare NEUTRAL read from that one signal already trips the reads-present-but-not-enough-CONFIRMS branch (gate-contract.ts:234-241) and withholds a pick this track never measured as adverse. The adapter must pass minCorroborations 0 on the enforcing call specifically, an explicit override at that one call site, never a change to the module's own default, so that only an actual CONTRADICTS can withhold until enough independently promoted signals make real corroboration meaningful. Traced directly: with zero enforced signals the enforcing pass's signal list is empty, reads.length is 0, and the function returns publish equal to not requireEvidence, which is publish true (gate-contract.ts:207-218). Day one, with every signal at its honest default of not yet promoted, this is a mathematical guarantee, not a policy promise: the enforcing pass cannot return false, so no published number moves, while the recording pass is already writing the full truth every cycle.

packages/ingestion-pipeline/src/gate-decision-writer.ts, new, is the one place both passes land. GateDecision (schema.prisma:665-687) already has every column this needs: status, GateDecisionStatus is SCORING, PUBLISHED or GATED (schema.prisma:1460-1464), reason, reasonCode, edgeIndex, confidence, modelVersion, isBootstrap and evidenceRefs. The trap is isBootstrap defaulting to true (schema.prisma:675). The table's readers all filter isBootstrap false (passes.ts:149), so a writer that ever omits the field, rather than setting it explicitly, produces rows every reader silently ignores, which is close to how this exact table went months with no writer anyone could find. The new writer sets isBootstrap false on every write, never relies on the default, and a test pins the literal write payload rather than the visible behavior, because a silently ignored row and a correctly suppressed one look identical from outside. A withheld fixture carries its shadow record in evidenceRefs: the selection, line, entry price and the full IndependentEdgeSummary the scorer already built before the veto ran, so nothing here computes a second time what scoring.ts computed once. The two already live display filters join the same ledger here too: adverse-edge-suppression.ts and model-signal-coherence.ts keep their exact current enforcement, nothing about when they drop a row changes, but their call sites now also write one GateDecision row each, because a rule that already withholds in production and never records why is worse than an orphaned gate that at least documents itself in its own tests. Retention is a capture decision, not a customer facing one, so it is this track's to set rather than a reason to wait: every row is kept at full fidelity through the season its game belongs to and until at least one gate promotion run has consumed it, after which the verbose reason and basis prose in evidenceRefs compacts to a short summary while status, reasonCode, modelVersion and isBootstrap never change or disappear, since those four columns are the reproducible trail passes.ts already promises a paying viewer through NoBetDetail (passes.ts:27-40). And because this writer finally puts real rows into a table that has sat empty for months, it also inherits the day boundary bug both existing readers carry: passes.ts:76 and state.ts:305 both bound their query on the Node process clock, UTC on Vercel, a bug that is latent only because there is nothing yet to expose it. The moment this writer ships there is something to expose it, so the same change lands one shared Central day helper, apps/web/lib/time/central-day.ts, new, built on the same IANA offset arithmetic rest-travel.ts already tests for stadium time zones (rest-travel.ts:149, utcOffsetMinutes), and both readers move to it rather than shipping a writer whose first real day of data is already mislabeled.

No promoted signal earns the right to withhold on say so. The proof obligation is a two sample comparison, never a paired one, because a withheld candidate and a kept candidate are two different fixtures, not two forecasts on the same one. That unpaired shape is already built and tested in this repository for a different promotion, packages/prediction-engine/src/promotion/clv-non-inferiority.ts, whose ClvRow type, model champion or challenger (promotion/types.ts:41-51), is the same shape a gate needs with the labels renamed kept and withheld. packages/prediction-engine/src/promotion/gate-promotion.ts, new, reuses welchOneSidedNonInferiority directly (clv-non-inferiority.ts:63), epsilon fixed at 0 so the test is a superiority test in disguise, on two measures computed from settled rows: the decided outcome, win as 1, loss as 0, pushes excluded, and the same book closing value. Both legs must clear a lower confidence bound above zero, conjunctively, mirroring evaluatePromotion's own Leg 1 AND Leg 2 rule (promotion/evaluate.ts:6,25) rather than inventing a new combination rule for gates. The n floor is 100 fixture clustered CONTRADICTS decisions for that one signal, the same number edge-lab/selective-gate.ts already requires a stratum to earn its own statistic (MIN_STRATUM_CALIBRATION, selective-gate.ts:266), reused for consistency rather than re-derived, and clustered by fixture because one game can carry up to three markets whose outcomes move together, the identical reason head certification elsewhere in this document clusters by fixture rather than by row. Fixture clustering is enforced by a new integrity module, gate-promotion-integrity.ts, modeled on the checks promotion/integrity.ts already runs for model promotion (integrity.ts:1-30): no fixture appears twice inside the kept or withheld set for one evaluation window, no timestamp lacks an explicit time zone, no settledAt precedes its own evaluatedAt, no window is registered on or after its own start. Because this evaluator is a calibration adjacent measurement, it applies the stricter rule already stated for training rather than the permissive one the public surfaces use: an unreadable generatedAt or commenceTime excludes a row from both counts rather than keeping it, the opposite of what in-play-exclusion.ts:60-66 does for public facing numbers today, implemented directly here rather than inherited, because a promotion decision built on a leakage contaminated comparison would certify a veto that then withholds real revenue on the strength of a bug. One signal is not like the others: book-agreement's own inputs have been persisted on every book priced pick all along, so its kept and withheld partition can be built once, retroactively, over rows this repository already has, without waiting a single day for new capture. Every other signal's inputs were never captured before this track existed, so their proof can only accrue at the rate real games are played from the day the recording pass goes live. That difference is measured, not assumed, and it means book-agreement is the signal most likely to be the first a founder ever actually promotes.

A withhold needs no MODEL_VERSION bump for a reason this repository already states about what that version number is for. scripts/guardrails/model-freeze.mjs exists because a version bump is the one thing that relabels every historical confidence number as the output of a specific scoring function, and it refuses to let that relabeling happen without a paired, reviewed CalibrationProposal (model-freeze.mjs:25-28). A gate veto never touches the thing being relabeled. Every function in this plane is provably restricted to the shape candidate in, boolean out, with no path back into confidence, rankingP, trueProb, expectedClv or any field frozen at mint; adverse-edge-suppression.ts and model-signal-coherence.ts already demonstrate this structurally, both stating in their own comments that the surviving set is a subset of what was already published and that nothing is reordered or rescored. Two rows minted under identical coefficients, one published and one withheld, carry the identical modelVersion column, because that column answers which function computed this number, and the veto plane never computes a number. The two failure directions are not symmetric in consequence, which is the deeper reason they cannot share a governance gate. A veto's only failure mode is a false withhold: a pick that was actually fine gets suppressed, costing a sale and a data point this design keeps visible in evidenceRefs rather than lets vanish. A feature's failure mode is the opposite, and is the one this product's whole premise forbids: a bad coefficient can raise a number sold to a paying customer as a probability it cannot support. One error direction loses a sale. The other loses the claim that this company does not lie about its own performance. The heavier process, a bump, a proposal, a certification, a founder flip, belongs to the direction with the heavier consequence. The lighter process, log only capture followed by a two sample test followed by a narrow founder flip that touches nothing about how a number is computed, belongs to the direction that can only ever remove.

The rule that no gate may ever add conviction is written today only as a comment in gate-contract.ts's own header. This track makes it a type and a test instead of a promise. VetoVerdict has exactly one field any caller may act on, publish: boolean; everything else is evidence for a person to read, never an input to an arithmetic expression. apps/web/lib/conviction/__tests__/gate-cannot-raise.test.ts and packages/ingestion-pipeline/src/__tests__/veto-lane-cannot-raise.test.ts, both new, assert this two ways: that VetoVerdict's own type carries no numeric field beyond a read only evidence count, and that a deliberately broken local diff which adds one and sums it into confidence fails the check it exists to catch, so the test is proven to fire before it is trusted to guard anything. This sits in the ordinary Vitest suite, not under scripts/guardrails/, because that directory is frozen to agents by law 2 and a design document is not the place to propose working around that freeze. Promotion and demotion are not symmetric either, for the same reason publish and withhold are not. Demoting an enforced signal back to log only, because a later gate promotion run shows its lower bound no longer clears zero, can only make the system more permissive, the same safe direction a false withhold already errs in, so the evaluator is allowed to do this automatically, without a founder in the loop, the moment its own numbers say so. Promoting a signal from log only to enforcing is the one direction that changes what a customer sees for the first time, and it stays founder only exactly the way registry.ts already documents requireEvidence as founder only: report first, withhold on the founder's word, never the reverse.

The founder's surface for this is a small admin route, apps/web/app/api/admin/conviction-gate/route.ts, new, that reads a signal's latest gate promotion report and refuses the flip outright if that report has not cleared, so the switch cannot be used to skip the proof even by the one person allowed to use it. Building this surface is ordinary engineering and happens on day one; only the act of using it is reserved. Everything else this track needs already exists in the tree today. The market price, the book count, the independent edge, the schedule facts a signal reads are all computed by code that shipped before this track was written, so most of this track's workstreams start concurrently with every other track and with each other, and the one real dependency inside the track, VetoCandidate and VetoVerdict existing in @sports/types before veto-lane.ts's function type can name them, is internal to it, not across it. Two dependencies that look real are not. This plane does not wait for a certified head, because every veto reads a quantity a head would only ever narrow, never create. It does not wait for a training set loader some other track may build, because the primitives it needs, the clock reader, the published line snap, the settlement close stamp, already exist as small, composable functions, and if that loader lands first it becomes a convenience import, never a blocker. One dependency is real and belongs to a different track entirely: TOTAL cannot receive an edge shaped veto until an independent estimator exists for it, verified structurally by the absence of any assessIndependentEdge or pricesWorseThanMarket call anywhere inside scoreTotalPick (scoring.ts:751-1108, confirmed against every other call site in the same file). This track will not fabricate one. Until it ships, TOTAL still sits inside the withhold only plane through the signals that need no edge estimate at all, book-agreement and market-movement today, weather later, and it stays priced at whatever tier the rest of this document already caps it at: honestly thinner evidence, honestly labeled, never a manufactured edge standing in for a real one.

**Do not, on this track:**

- Never let a gate veto add conviction, raise a probability, a tier, or a rank.
- Never let requireEvidence, the enforcing pass's minCorroborations override, or any per signal enforce flag change from an agent session.
- Never let the fictional news wire or the illustrative props pool reach a signal that gates a real pick.
- Never let a gate_decision writer omit isBootstrap, relying on the column default of true.
- Never let the gate promotion evaluator count a fixture twice, or count an in play contaminated row, toward its n floor.
- Never let a veto reorder the published set or touch a selection, line, price, or receipt field.
- Never fabricate an independent estimator for TOTAL just to give it an edge veto it does not structurally have yet.
- Never restate pricesWorseThanMarket, or copy its logic, anywhere outside @sports/types.
- Never route a new cross package import through anything other than @sports/types, given the 22 (standing note: 19) partial engine mocks.
- Never treat gate-consumer.ts's FiredDecision as persisted, and never invent the persistence bridge PRODUCT_CASCADE_MAP.md already blocks.

**Founder-only on this track:**

- Flipping any signal's per-signal enforce state from log-only to withhold-capable, through the D7 admin route only.
- Raising minCorroborations above 0 for the enforcing pass once more than one signal is promoted.
- Turning on gate-contract.ts's global requireEvidence flag.
- Loosening or tightening this track's default retention rule; the track ships a default and does not wait on a founder decision to start capturing.

### Track E: The Rulers (Measurement Instruments)

**Charter.** Fix and own every instrument that turns a raw price, a settled result, or a probability into a trustworthy number, so every other track's output is legible instead of self-flattering, without itself deciding what a customer ever sees.

**Starts on day one, with no founder action and no dependency:**

- Writing devig/canonical.ts and its conformance test against devig/oracle.ts's already-correct, penaltyblog-verified reference, with zero dependency on any other file changing first.
- Fixing conformalQuantile's refusal inside the shared function and rewriting the two tests (apps/web/__tests__/cqr.test.ts, apps/web/lib/calibration/conformal-calibration.test.ts) that currently pin the clamp defect.
- Collapsing the seven duplicated 0.524/52.4 literals to one derived math constant and one founder-owned floor constant, with a regression test proving the value never moves.
- Rewriting compute.ts's five expectedFromConfidence call sites to score the market-implied probability instead of confidence, with a new counted exclusion reason for rows that carry no market price.
- Extending ClosingOddsRow and both odds selects (settle-sport.ts, free-path-clv.ts) with bookmaker, and writing the same-book intersection logic in clv-capture.ts as a pure, unit-tested function reading OddsLineSnapshot's existing CLOSE tag first and the mutable Odds table as its fallback.
- Adding the typed independentEdge.trueProbBasis field to backfill-independent-trueprob.ts's own write, replacing the prose-only rationale discriminator.
- Wrapping fetchMlbStandings and the NFL EPA dispatch with a local, mirrored version of asof-store.ts's assertNoLookahead tripwire, so a known-bad source starts throwing instead of silently answering.
- Adding a required fixtureId to walk-forward.ts's row type and the no-cross-fold-leak regression test, the first dedicated test that module has ever had.
- Building edge-lab/market-offset.ts and its identity oracle test as a standalone spec, ready for whichever track builds the head to import rather than reimplement.
- Drafting the CLV attribution pre-registration and its three experiment scripts against metric-slices.ts's existing bootstrap, ready to run the moment the first same-book row exists.

| ID | Workstream | Concurrent | Owner | Entry files | Acceptance |
|---|---|---|---|---|---|
| E1 | Same-book closing-line value, stored additively | yes | agent | `packages/prediction-engine/src/clv-capture.ts`, `packages/prediction-engine/src/__tests__/clv-capture.test.ts`, `packages/ingestion-pipeline/src/settle-sport.ts`, `apps/web/lib/settlement/free-path-clv.ts` | npm run typecheck && npm run lint && npx vitest run packages/prediction-engine/src/__tests__/clv-capture.test.ts with a new fixture set proving: (a) an intersecting book set at lock and close grades correctly, (b) a disjoint book set refuses (returns null, never a cross-book average), (c) an OddsLineSnapshot CLOSE row is preferred over the Odds-table fallback when both exist. Founder/cron half: the first live settlement cycle after deploy writes clvSameBookValue on a real settled pick, and the historical backfill script (agent-written) is run once by the founder over existing settled rows. |
| E2 | One canonical de-vig function, four conventions reconciled without a floor moving | yes | agent | `packages/prediction-engine/src/devig/canonical.ts`, `packages/prediction-engine/src/devig/oracle.ts`, `packages/prediction-engine/src/scoring.ts`, `packages/prediction-engine/src/edge-lab/devig.ts` | npm run typecheck && npm run lint && npx vitest run packages/prediction-engine/src/__tests__/devig-canonical-conformance.test.ts packages/prediction-engine/src/__tests__/devig-oracle.test.ts packages/prediction-engine/src/__tests__/devig-method-honesty.test.ts packages/prediction-engine/src/edge-lab/__tests__/devig.test.ts, all green, plus a diff-only regression proving scoring.ts's marketFairProb output on a fixed historical row set is byte-identical before and after the call-through refactor. |
| E3 | Constant integrity: one break-even, one set of floors, the debiased-ECE pattern written down as the template | yes | agent | `packages/types/src/break-even.ts`, `packages/prediction-engine/src/edge-lab/honest-ceiling.ts`, `packages/prediction-engine/src/conviction-tier.ts`, `apps/web/lib/performance/public-clv-policy.ts` | npm run typecheck && npm run lint && npx vitest run against each touched file's existing test suite, plus a new assertion that VIG_BREAK_EVEN_MINUS_110 rounds to exactly 0.524 (four significant places) so every site that read the literal before reads the identical value after. |
| E4 | Conformal and CQR refusal, not clamping, at n below what alpha requires | yes | agent | `apps/web/lib/calibration/cqr.ts`, `apps/web/lib/calibration/conformal-calibration.ts`, `apps/web/__tests__/cqr.test.ts`, `apps/web/lib/calibration/conformal-calibration.test.ts` | npm run typecheck && npm run lint && npx vitest run apps/web/__tests__/cqr.test.ts apps/web/lib/calibration/conformal-calibration.test.ts, both rewritten to assert refusal (Number.POSITIVE_INFINITY) on the exact n=5, alpha=0.1 repro that previously clamped to a false 83.33 percent coverage, plus the existing n=0 and mondrianResidualThresholds tests still green. |
| E5 | Replace expectedFromConfidence with the market-implied probability on the calibration surface | yes | agent | `apps/web/lib/calibration/compute.ts`, `apps/web/lib/calibration/__tests__/compute-forecast-basis.test.ts`, `apps/web/lib/calibration/publish-time-market-p.ts`, `apps/web/lib/calibration/live-calibration-p.ts` | npm run typecheck && npm run lint && npx vitest run apps/web/lib/calibration/__tests__/compute-forecast-basis.test.ts (NEW, since compute.ts has no dedicated test file today), asserting the bucket table, module Brier and skill block score the market probability, that a row with no market price is excluded and counted, and that no code path reads confidence as a probability anywhere in the module. |
| E6 | Quarantine the post-settlement independent-edge rewrite: typed basis now, an as-of twin from mint forward | yes | agent | `packages/ingestion-pipeline/src/backfill-independent-trueprob.ts`, `packages/ingestion-pipeline/src/__tests__/backfill-independent-trueprob.test.ts`, `packages/ingestion-pipeline/src/build-independent-fair-values.ts`, `packages/prediction-engine/src/standings-strength.ts` | npm run typecheck && npm run lint && npx vitest run packages/ingestion-pipeline/src/__tests__/backfill-independent-trueprob.test.ts, extended to assert every write now carries trueProbBasis: 'post_settlement_backfill', plus new tests proving fetchMlbStandings's and the NFL EPA dispatch's as-of guards throw when asked for a cutoff their source cannot honor. Founder half: the one-time migration retagging existing rows, and approval to call buildIndependentFairValues from the mint path. |
| E7 | The CLV attribution test: separating model error from ruler error on the 23 percent figure | yes | agent | `docs/calibration-proposals/feature-trials/clv-attribution.json`, `scripts/calibration/clv-attribution.ts`, `apps/web/lib/calibration/metric-slices.ts`, `apps/web/lib/clv/clv-sample-policy.ts` | npm run typecheck && npm run lint && npx vitest run against the new script's own unit tests (pure functions, synthetic fixtures with a known answer), green with zero real rows. Founder/cron half: the first real run over settled rows, reported with confidence intervals on all three experiments, not a single point verdict. |
| E8 | Validation-honesty instruments: fixture-grouped folds and the market-offset identity oracle | yes | agent | `packages/prediction-engine/src/edge-lab/walk-forward.ts`, `packages/prediction-engine/src/edge-lab/__tests__/walk-forward-fixture-grouping.test.ts`, `packages/prediction-engine/src/edge-lab/market-offset.ts`, `packages/prediction-engine/src/edge-lab/__tests__/market-offset-identity.test.ts` | npm run typecheck && npm run lint && npx vitest run packages/prediction-engine/src/edge-lab/__tests__/walk-forward-fixture-grouping.test.ts packages/prediction-engine/src/edge-lab/__tests__/market-offset-identity.test.ts, the first asserting zero cross-fold fixture leaks on a synthetic multi-market-per-game dataset, the second asserting convergence to the market probability within a stated tolerance as the penalty grows. |
| E9 | The receipt-versus-odds-table divergence monitor | yes | agent | `apps/web/lib/data-reliability/receipt-market-divergence.ts`, `apps/web/lib/calibration/publish-time-market-p.ts`, `apps/web/app/api/cron/calibration-metrics/route.ts`, `apps/web/app/api/ops/public-surface-truth/route.ts` | npm run typecheck && npm run lint && npx vitest run against the new module's own unit test (a synthetic set of receipts and odds-table rows with a known gap), asserting the report's mean and tail count match the known answer and that a gap breaching a stated threshold is counted and surfaced, never swallowed into a bare row count. |

**What each one builds.**

- **E1, Same-book closing-line value, stored additively.** A pure same-book CLV grader in clv-capture.ts: the lock side reconstructed per-bookmaker from the Odds table at generatedAt (extending publish-time-market-p.ts's existing snapshot rule to record book identity, not only the average); the close side read first from OddsLineSnapshot at phase CLOSE (already book-tagged, already produced by markClosingSnapshotsIfEnabled at settle-sport.ts:867) and falling back to a book-tagged Odds-table reconstruction when the archive has no row for that game; the grade computed only over the intersection of bookmaker keys present at both ends, refusing (null) rather than averaging across a mismatch when the intersection is empty. New additive columns clvSameBookValue, clvSameBookVerdict, clvBookBasis beside the existing clvValue/clvVerdict. Capture that starts because of this row: Same-book CLV value and verdict begin accruing on every future settled pick the moment the code ships; a one-time backfill re-derives it for existing settled rows once the founder runs it. Risk: The Odds-table reconstruction assumes bookmaker keys are stable strings across a fixture's history; a book that renames or gets remapped mid-slate (the documented espn_public-vs-draftkings ambiguity) could shrink the intersection to empty more often than real market movement would, misreading as no comparable close when a real one existed.
- **E2, One canonical de-vig function, four conventions reconciled without a floor moving.** packages/prediction-engine/src/devig/canonical.ts (NEW): one pure function implementing the exact average-then-remove-vig math scoring.ts::removeVig already runs, n-way capable, refusing on a sub-vig input. scoring.ts::removeVig, edge-lab/devig.ts::proportionalDevig, and apps/web/lib/tools/betting-math.ts::noVigFairProbabilities become call-throughs (byte-identical output, pinned by golden-fixture regression). edge-lab/devig.ts's own duplicate shinDevig is deleted in favor of importing shin-devig.ts's. A shared method-tag module replaces the free-standing strings proportional_devig_v1, mean_implied_proportional_devig, and shin_devig_v1. Capture that starts because of this row: NONE new; this is a consolidation of an existing computation, not a new sample. Risk: A byte-identical refactor claim is only as good as its regression fixture's coverage; the golden fixture set must include at least one 3-way (soccer) market and one near-crossed book, or the collapse could hide a divergence the fixture never exercises.
- **E3, Constant integrity: one break-even, one set of floors, the debiased-ECE pattern written down as the template.** packages/types/src/break-even.ts (NEW): one derived VIG_BREAK_EVEN_MINUS_110 = americanToImpliedProbability(-110) and one separately named, founder-owned ESTABLISHED_TIER_CLV_FLOOR, replacing the seven duplicated 0.524/52.4 literals across three packages. A short written note (in the same file's header) stating ece-debiased.ts's raw-beside-corrected, floor-byte-identical, ledger-row pattern as the template every future estimator correction in this repository must follow. Capture that starts because of this row: NONE; a constant consolidation, no new sample. Risk: Low; the only real risk is a rounding mismatch between the derived value and the literal 0.524 used today, which the regression test exists specifically to catch before it ships.
- **E4, Conformal and CQR refusal, not clamping, at n below what alpha requires.** One shared conformalQuantile (collapsing cqr.ts:12-15's and conformal-calibration.ts:131-141's identical duplicates) that returns Number.POSITIVE_INFINITY whenever the intended rank exceeds the last available index or the sample is empty, rather than clamping into range. cqrInterval and splitConformalResidualThreshold both call through it; mondrianResidualThresholds's separate minN=20 becomes an additional, stricter, explicit business floor layered on top of, never substituting for, the intrinsic mathematical refusal. Capture that starts because of this row: NONE directly, though every refusal from here on is a countable event rather than a silently-wrong number, which is itself worth logging if a caller chooses to. Risk: Moving the refusal inside the shared function can surface POSITIVE_INFINITY to a caller that never handled it before (splitConformalResidualThreshold does not today); every caller needs an explicit finite check added alongside the fix, not just the two duplicate functions collapsing.
- **E5, Replace expectedFromConfidence with the market-implied probability on the calibration surface.** compute.ts's five call sites (:260-262, :349, :355, :448, :459) stop scoring confidence/100 as a forecast. The forecast column becomes the market-implied probability (E2's canonical function, already available today via removeVig/publish-time-market-p.ts even before E2 lands) for every row that carries one; rows without a market price at generation are excluded from the Brier and skill computation under a new counted reason, never defaulted to 0.5 or to confidence. Raw confidence stays on the page as a relabeled score distribution, never re-entered into the same arithmetic. Capture that starts because of this row: The market-implied-probability forecast series on /calibration begins accruing distinctly from the raw confidence-score series immediately, so a future certified head's report inherits years, not zero days, of a like-for-like series to backtest display copy against. Risk: Removing confidence as the forecast shrinks the scoreable population (today, two-way moneylines with a market price only), so the reported sample size on /calibration visibly drops even though nothing about the model changed; the report must state this in the same breath or it reads as a regression.
- **E6, Quarantine the post-settlement independent-edge rewrite: typed basis now, an as-of twin from mint forward.** A typed independentEdge.trueProbBasis field (post_settlement_backfill vs as_of_mint) on backfill-independent-trueprob.ts's own write, replacing the prose rationale discriminator. Local assertObservedAtOrBefore guards, mirroring asof-store.ts's assertNoLookahead, wrapped around fetchMlbStandings (build-independent-fair-values.ts:291-308, season-only, no date parameter) and the NFL EPA dispatch (:661), so both throw rather than silently answer for a date they cannot honestly speak to. A genuine as-of twin: the same buildIndependentFairValues call made once at mint inside process-sport.ts, tagged as_of_mint, persisted to the eligibility gate's existing versioned JSON snapshot store today and to the labels track's pick_feature_vectors table once it exists. Capture that starts because of this row: The typed basis field begins tagging every future backfill write immediately; the mint-time as-of twin, once wired, begins a second, permanent, leak-free independent-edge series with n growing from zero starting the day it ships, which is the rule-3 argument for building it now rather than waiting for the labels table. Risk: The typed field only protects rows written after it ships; roughly nine months of existing backfilled rows carry only the prose rationale until a one-time migration retags them, and until that runs, any loader keying off the new field alone silently treats old rows as clean.
- **E7, The CLV attribution test: separating model error from ruler error on the 23 percent figure.** Three pre-registered experiments over the identical fixture-clustered, VOID-excluded settled sample (clv-sample-policy.ts's existing filter, reused): (1) same rows graded on cross-book clvValue versus E1's clvSameBookValue, bootstrap CI on the difference (reusing metric-slices.ts's seeded resampling); (2) within the same-book population, correlation between same-book beat-close and realized squared calibration error, fixture-clustered, against a pre-registered null of zero, answering open question 4 directly; (3) a model-conditional split of the same rows by independentEdge.decision and source agreement, both already stored at mint. A dated memo reports a percentage-point breakdown of the 29.4-point gap between 23.0 and 52.4 instead of one unattributed number. Depends on Real, narrow: needs E1's same-book clvValue column to have accrued rows before its first experiment produces a meaningful number; the harness, pre-registration and bootstrap reuse build and typecheck with zero rows today. Capture that starts because of this row: The three test statistics begin being computed the moment E1 ships its first same-book rows; every additional settled game grows the sample the ESTABLISHED gate will eventually need. Risk: With same-book rows starting from zero, the first two experiments are underpowered for months; the memo must report confidence intervals, not a single point verdict, or a wide, inconclusive interval will get read as a conclusion either way.
- **E8, Validation-honesty instruments: fixture-grouped folds and the market-offset identity oracle.** A required fixtureId on walk-forward.ts's row type, with fold assignment changed from a raw index cut to one that only falls between two different fixtures' row groups in sorted order, pinned by a test asserting no fixture ever appears on both sides of a fold (walk-forward.ts has no dedicated test file today; this is net-new coverage). edge-lab/market-offset.ts (NEW): a small, tested primitive that adds a market logit into a linear predictor as a fixed, unpenalized, unstandardized offset, plus an identity oracle test proving that as a ridge penalty grows without bound on a synthetic dataset with a known-exact answer, the fitted output converges to the raw market probability, not to zero. Capture that starts because of this row: NONE for the fixture-grouping fix itself, it changes how existing rows are split, not what is captured; the identity-oracle test's dataset is synthetic and fixed. Risk: A fixture-grouped cut can leave a fold with too few distinct fixtures even when it has many rows, since three markets per game inflate row count without inflating information; the splitter needs a minimum-distinct-fixture-count check alongside its existing minTrainFraction, or a technically-passing fold could still be an effectively single-fixture test set.
- **E9, The receipt-versus-odds-table divergence monitor.** A scheduled diagnostic, riding the existing calibration cron, that recomputes publish-time-market-p.ts's odds-table probability for every recently-settled receipted pick and reports the receipt-minus-odds-table gap's mean and its over-0.15 tail count to the truth surface, closing the blind spot that let the repository's own recorded 0.169-average, 15-of-46 divergence go unmeasured on a schedule until a manual research pass found it once. Capture that starts because of this row: The receipt-versus-odds-table divergence distribution begins logging every cron cycle immediately, the exact continuous check that was missing when the 0.169 gap was found only once, by hand. Risk: A monitor that reports only the mean gap can hide a bimodal failure, most rows fine, a subset badly wrong; it must report the over-0.15 tail count alongside the mean, mirroring the existing 15-of-46 figure, not the mean alone.

**Invariants that must survive every future edit to this track:**

- The committed customer-facing de-vig method stays proportional_devig_v1, average-implied-probability-then-remove-vig, exactly as scoring.ts::removeVig computes it today; a method swap requires a paired comparison clearing a stated confidence bound on the same rows, never a silent substitution.
- Every canonicalized de-vig or conformal function ships with a conformance or regression test pinning it against a fixed reference (devig/oracle.ts for de-vig math; a pinned repro for conformal refusal); the oracle module itself is never wired into a live computation.
- A conformal or CQR quantile refuses (returns positive infinity) rather than clamps whenever the required rank exceeds the available sample; no caller-side minN guard may substitute for this inside the shared function.
- No founder-set number, a floor, a break-even, a streak requirement, is ever a fresh literal in a new file; every one is a single derived or explicitly imported constant, and the value itself never moves as part of a ruler fix.
- A number presented as beat-the-close states whether it is same-book or cross-book; a cross-book figure may keep publishing only when labeled as such, side by side with the same-book number once it exists.
- Any row whose independent-edge probability was computed with information available only after settlement is excluded from training and carries a typed provenance field, never a prose string, and the field is never silently omitted by a new writer.
- Every fold a validation splitter produces keeps a fixture's rows on one side; no split-level bound is trusted until it is fixture-clustered, and no bootstrap or admission test invents a second resampling scheme where an existing seeded one already exists.
- A ruler measures; it never raises, lowers, or reorders a customer-facing number itself. That is always a different track's decision made on top of a number this track is responsible for being right.
- Every corrected estimator reports its raw value beside the corrected one, cites the founder's 2026-09-09 law-3 amendment in its ledger row, and is measured against a floor that stays byte-identical across the change.
- A silent catch that swallows a ruler's own failure and returns only a row count is not monitoring; every table or divergence this track depends on gets a counted, surfaced freshness reading, never a warning nobody reads.

Track E owns four instrument families and nothing else: the market-price ruler that turns a book's odds into a fair probability, the outcome ruler that turns a settled result and a closing line into a graded verdict, the error-and-interval ruler that turns a set of forecasts into a calibration number with an honest sample-size correction, and the validation-honesty ruler that turns a set of rows into folds nobody can peek across. It does not fit a model, decide a tier, or choose what a customer sees, every one of those is another track's decision made on top of a number Track E is responsible for being right. Per the founder's frame this track never waits: it builds, captures and tests at full width starting today, because the certification gate that governs what reaches a customer never governed what gets measured, computed or persisted, and a sample that is not being logged now is a sample that does not exist later no matter how good the model eventually gets. The one line this track answers to is the same one every other track answers to: no uncertified probability reaches a customer. Everything upstream of that line, every fixed constant, every grading function, every bootstrap bound, is Track E's to build now, in parallel with the six tracks around it, not behind them.

The market-price ruler is not choosing between four de-vig methods, that choice is already made and correct. The committed method (pick-proof-receipt.ts:79, tag proportional_devig_v1) is average-implied-probability-then-remove-vig, exactly what scoring.ts::removeVig (lines 71 to 75) computes inline, and the paired comparison against Shin already measured a non-significant difference (t 1.80, honesty/devig-method-compare.ts), so there is no reason to swap and this track proposes none. The defect is that the identical computation is written out by hand at least six times under at least two different method-tag strings: scoring.ts's inline removeVig, edge-lab/devig.ts's proportionalDevig (decimal-odds input, used by nine NFL feature builders plus schedule-features.ts and ladder-boost-scanners.ts), apps/web/lib/tools/betting-math.ts's noVigFairProbabilities (whose own comment says it only mirrors the engine's method rather than calling it), and apps/web/lib/calibration/publish-time-market-p.ts's independently named PUBLISH_TIME_MARKET_P_METHOD, mean_implied_proportional_devig, a second string for what its own header calls the identical computation. edge-lab/devig.ts additionally carries its own hand-written shinDevig, a second, independent implementation of the same Shin bisection already living in shin-devig.ts and imported by market-read.ts and honesty/devig-method-compare.ts. Workstream E2 collapses this to one pure function, devig/canonical.ts, makes every site above a call-through to it, deletes the duplicate Shin implementation in favor of an import, and pins the collapse against devig/oracle.ts, the already-correct, penaltyblog-verified reference this repository owns but has never used as a check on its own production code. Workstream E3 does the same hygiene one level up: seven separately typed literals of the vig break-even, 0.524 or 52.4, live across three packages (apps/web/lib/format/stat.ts:19, apps/web/lib/performance/public-clv-policy.ts:25, apps/web/lib/pricing/pricing-phases.ts:110, packages/types/src/ladder.ts:53 and :60, packages/prediction-engine/src/edge-lab/honest-ceiling.ts:31, packages/prediction-engine/src/conviction-tier.ts:43, plus a fallback default in apps/web/lib/autonomy/revenue-ladder.ts:41), one of which already comments that it is the same constant public-clv-policy.ts uses, proof the duplication was known and still not fixed. One derived math constant and one separately named, founder-owned ESTABLISHED_TIER_CLV_FLOOR replace all seven. The value never moves, only the number of places it is spelled out does.

The outcome ruler's biggest single fix is the same-book closing value. clv-capture.ts:90-144's deriveClosingSnapshotFromOdds averages whatever Odds rows the caller hands it, and its own ClosingOddsRow type carries no bookmaker field. Both of its callers, settle-sport.ts:622-633 (paid settlement) and free-path-clv.ts:36-49 (the free-path grader), explicitly omit bookmaker from their Prisma select, so the function could not restrict itself to one book set even if it wanted to. Today's grade compares an average over whichever books happened to price the game at mint against an average over whichever, possibly different, books happened to price it nearest kickoff, and calls the gap closing-line value; that is why 23.0 percent against a 52.4 percent requirement cannot yet be read as a statement about the model at all. The fix needs no new capture mechanism for the lock side: publish-time-market-p.ts already reconstructs, per book, the exact snapshot a pick was minted against, from the same append-only Odds table, for a different purpose (WP-28); the same snapshot rule, extended to record which bookmaker keys it used rather than only their average, gives the lock-side book set for free. The close side has a better source sitting unused one function away: settle-sport.ts:867 already calls markClosingSnapshotsIfEnabled, which tags the last pre-existing OddsLineSnapshot row per market, book and side as phase CLOSE (line-archive.ts:206, :240, :262-263), and that table has carried a book column since it was created (schema.prisma:467, :472). Its OPEN tag marks the first snapshot ever taken for a market (line-archive.ts:150), not a pick's own lock moment, so it cannot answer the lock side, but its CLOSE tag is exactly the same-book close this grader needs, already computed, already running, and never read by the CLV grader sitting right next to the call that produces it. The fix reads OddsLineSnapshot at phase CLOSE for the close side whenever the archive covers the game, falls back to a book-tagged reconstruction from the mutable Odds table when it does not (the archive's dead window of 2026-08-22 to 09-13 being the clearest case), grades only over the intersection of bookmaker keys present at both ends, and refuses, never averages across the mismatch, when that intersection is empty. The grade is stored additively, clvSameBookValue, clvSameBookVerdict and clvBookBasis beside the existing clvValue and clvVerdict, proposal SQL under docs/ops/proposals/, founder-applied, so nothing that reads the current columns changes behavior until the founder decides otherwise, and both numbers are reported side by side exactly the way ece-debiased.ts already reports raw beside corrected.

The error-and-interval ruler keeps ece-debiased.ts and metric-slices.ts::bootstrapDebiasedEceLowerBound exactly as built: per-bin variance correction, a fixed seed, the raw value reported beside the corrected one, and the literal floors at calibration-eligibility.ts:131-136 (n 100, Brier 0.22, ECE 0.05, Murphy 0.05) untouched. That module is this track's template for every future correction: derive it, document it, test it, report the raw number beside it, keep the floor byte-identical, take a ledger row under the founder's 2026-09-09 law-3 amendment. The interval side of the same library has a real bug the template has not yet reached. cqr.ts:12-15's conformalQuantile clamps its computed rank into the range zero to n minus one instead of refusing, and a byte-identical clamp is independently reimplemented at conformal-calibration.ts:131-141, a second, unrelated copy of the same function. Inside that second file, mondrianResidualThresholds (line 174) happens to guard against the defect by checking that scores.length is at least minN before calling it, but splitConformalResidualThreshold, three lines above, calls the same unguarded function directly, so the correct pattern already living in this file is true of one export, not the module. Two tests already pin the wrong behavior in place, apps/web/__tests__/cqr.test.ts and apps/web/lib/calibration/conformal-calibration.test.ts:25, the second asserting conformalQuantile of a small sample at alpha 0.1 equals exactly 1.0 where a refusal is the honest answer. The fix moves the refusal inside the shared function itself: compute the intended rank, and when it exceeds the last available index, or the sample is empty, return positive infinity, the same sentinel mondrianResidualThresholds already uses for its own below-floor case, so a caller can never again omit the guard by forgetting it exists. The two duplicate definitions collapse to one, cqrInterval and splitConformalResidualThreshold both call through it, and both pinned tests are rewritten to assert refusal, a narrower, stricter guarantee than the clamp they pinned before, never a weakened one. CQR_PRODUCT_NOTES's existing doctrine, off by default, never unlocking PROVEN, never used for a binary side, does not change; this fix makes the refusal correct for the numeric spread, total and prop intervals it is scoped to, nothing more.

compute.ts treats confidence divided by 100 as a forecast at five call sites (:260-262 the function itself, :349 and :355 inside scoreBucket, :448 the module-level Brier, :459 feeding computeSkillMetrics), and every one of those sites is scoring a number this document's own verdict has already measured anti-predictive at the top: confidence 80 and above claims 0.8663 and realizes 0.5191, a Brier of 0.3617 against 0.25 for a forecaster that simply guesses the coin flip every time. expectedFromConfidence does not get corrected, it gets replaced, and the replacement does not wait for a certified head. The market-implied probability, the same number the canonical de-vig function produces and publish-time-market-p.ts already recomputes honestly from the odds table at generation time, verifiable-only, is the one number this platform has ever measured genuinely calibrated: monotone, every band within 0.07. It becomes the forecast column for every row that carries one today, moneylines with at least MIN_BOOKMAKERS books (constants.ts:105); a row with no market price at generation is excluded from the Brier and skill computation and counted under a new reason, no_market_p_at_generation, never defaulted to 0.5 or silently backfilled from confidence. The raw confidence score stays on the page, relabeled as a score distribution, never re-entered into the same arithmetic. This is the one workstream in this track that changes what a customer-adjacent report says today, in Phase 0, without a version bump, because it is strictly a withdrawal of an already-measured-false claim in favor of an already-measured-true one, the same asymmetry the conviction gate and the adverse-edge suppression already rely on elsewhere in this codebase. compute.ts has no dedicated test file today; this workstream adds the first one. When a certified head lands, the same report swaps its input column from market probability to head probability, partitioned by model version, and the plumbing does not otherwise change.

backfillIndependentTrueProb selects settled WIN or LOSS rows (:96-101), calls buildIndependentFairValues with the game's commenceTime (:172-183), and overwrites factorBreakdown.independentEdge.trueProb and fairProbability in place with no version marker beyond a rationale string containing the word Retrospective (:235-257). It runs from two schedules, not the one the standing notes name: its own dedicated cron every four hours (cron-schedule-manifest.ts:163, 10 star slash 4 star star star) and again inline inside the six-hourly calibration cron (apps/web/app/api/cron/calibration-metrics/route.ts:277). Two of the independents it blends do not honor the commenceTime it passes them: fetchMlbStandings takes only a season number, no date at all (build-independent-fair-values.ts:291-308, cached thirty minutes by wall clock, so a backfill run in December returns December's cumulative standings for a September game), and, per this repository's own registry finding, the NFL EPA read dispatched at :661 is a whole-season aggregate with the same property. Every row this function has ever touched carries a probability partly computed with information that postdates the outcome it is scoring, and the only thing separating them from every other row is a sentence. The fix keeps the rewrite, its stated purpose, a retrospective read of the current ensemble's opinion on a historical game, is a legitimate research question and the certification gate never restricts computing one, but it stops the rewrite from being mistaken for a mint-time feature again. First, immediately: the write gets a typed field, independentEdge.trueProbBasis, post_settlement_backfill for this function versus as_of_mint for a real mint-time read, so a trainer excludes by a checked value, never a string match. Second, a real as-of twin: the same buildIndependentFairValues call, made once, from inside process-sport.ts at the moment a pick is minted, before the outcome exists, tagged as_of_mint, persisted today to the versioned JSON snapshot store the eligibility gate already uses, no schema wait required, and later to the labels track's proposed pick_feature_vectors table once it exists. Third, the two known-bad sources get a local, mirrored version of asof-store.ts's assertNoLookahead tripwire (:184-199), which today only polices reads already routed through its own FeatureStore.get, protecting nothing outside the edge-lab harness; wrapped around fetchMlbStandings and the NFL EPA dispatch, the same tripwire starts throwing the moment either source is asked to answer for a date it cannot honestly speak to, turning a nine-month silent contamination into a test failure the day it would first occur.

Two more instruments certify a process, not a number, and this track owns the test, not the model the process eventually fits. edge-lab/walk-forward.ts's walkForwardSplits sorts rows by decisionAt and cuts folds at a raw index; its purge step already keeps a row whose eventEndAt resolves inside the test window out of that fold's training side, which is correct, but nothing stops one market of a fixture, a spread pick, from landing in one fold's test set while a different market of the identical game, its moneyline, lands in another fold's training set, since the two can carry different decisionAt timestamps despite deriving from the same, perfectly correlated final score. This is exactly why every certification bound needing to be fixture-clustered has to be true at the split, not only at the reporting step that consumes it. The fix adds a required fixtureId to the row type, changes fold assignment to cut only between two different fixtures' row groups in sorted order, and pins a test asserting no fixture ever appears on both sides of a fold; walk-forward.ts carries no test file of its own today, so this is net-new coverage on a module every certification claim in this document eventually depends on. The second instrument is smaller and sharper: edge-lab/logistic.ts's ridge trainer standardizes and penalizes every coefficient toward zero, including, if a market logit were ever added as one more feature the way the wider design implies, the one term whose entire job is to anchor the head's floor to the market rather than to a base rate. This track does not build the head, it builds edge-lab/market-offset.ts, a small, tested primitive that adds a market logit into a linear predictor as a fixed, unpenalized, unstandardized offset, plus the identity oracle test any trainer using it must pass: on a synthetic dataset with a known-exact answer, as the ridge penalty grows without bound, the fitted output converges to the raw market probability, not to zero. Without a green check on that specific property, the head reproduces the market as its null is a sentence, not a fact anyone can point to.

The attribution test the founder's own diagnosis is waiting on is not one measurement, it is three, run in a fixed order over the identical fixture-clustered, VOID-excluded sample, reusing clv-sample-policy.ts's existing result filter rather than rebuilding it, each holding two of three variables fixed and moving the third. First, a ruler-only test: the same rows graded twice, once on today's cross-book clvValue and once on the same-book clvSameBookValue; a bootstrap confidence interval on the difference, reusing metric-slices.ts's seeded resampling rather than a second bootstrap implementation, is by itself a direct, percentage-point answer to how much of the gap between 23.0 and 52.4 is measurement, with no model term anywhere in the computation. Second, the correlation this document's own open question about beat-close has left unanswered: within the same-book population, does same-book beat-close correlate with realized squared calibration error, fixture-clustered, against a pre-registered null of zero. If it does not clear that null, the registry's own entry for same-book closing value already states the consequence, closing value is reported on the ESTABLISHED gate, not binding on it, a conclusion this test exists to actually reach rather than assert. Third, a model-conditional split of the same rows by two signals already computed and stored at mint, independentEdge.decision and source agreement; if same-book beat-close moves with those strata, that movement is evidence the number reads something about the model the market-movement ruler cannot see, and if it stays flat across every stratum while moving only with which books happened to be priced, that flatness is itself the positive case for the ruler explanation. All three experiments build and typecheck today with zero rows; their numbers start accruing the day the same-book grade ships its first row, and the memo that reports them states a percentage-point breakdown of the 29.4-point gap instead of one unattributed figure.

One instrument watches the instruments. publish-time-market-p.ts's own header already states a fact nothing currently re-checks on a schedule: the receipt's committed marketFairProb diverges from the odds table's own de-vigged price at generation time by 0.169 on average, with 15 of 46 receipted rows more than 0.15 off, a number this session did not re-derive and reports exactly as this repository already recorded it. A small, scheduled diagnostic, riding the existing calibration cron rather than a new schedule, recomputes that gap for every recently settled receipted pick and reports its mean and its over-0.15 tail count to the truth surface, the same shape the line-archive-staleness lesson already teaches: a silent catch that returns a row count is not monitoring, and the exact defect that let a real archive outage run three weeks unseen is the same shape of defect that let this divergence sit unmeasured until one manual research pass found it. None of the nine workstreams in this track are sequenced behind the other six tracks, or behind each other beyond one narrow, named exception, the attribution memo's numbers needing the same-book rows to exist before they mean anything. Every one of them operates on data that already exists today in this repository, verified line by line rather than assumed, and every one of them can be committed, tested and reviewed by an agent session without touching a gate, an env flag, a schema file or a production database. What a customer eventually sees still waits on a founder's bump. What this track measures does not wait on anything.

**Do not, on this track:**

- Do not let a second, hand-written copy of a de-vig formula or a conformal-quantile clamp reappear beside the canonical one; collapse duplicates on sight rather than adding a third.
- Do not read Pick.confidence as a forecast anywhere in the calibration report once the market-probability replacement ships; do not let it re-enter the same Brier or skill arithmetic under a new name.
- Do not let the post-settlement independent-edge rewrite reach a trainer through the untyped rationale string again once the typed trueProbBasis field exists; do not let a new writer of that field skip setting it.
- Do not report a beat-the-close number without stating same-book or cross-book, and do not retire the existing cross-book columns from public view without a founder decision, since they are the current public track record.
- Do not let the 52.4 percent vig break-even, or any calibration floor, exist as more than one literal in the tree; do not let the derived constant's rounding silently diverge from the literal it replaces.
- Do not wire the isotonic confidence calibrator live under any self-check improvement, a monotone map cannot repair a non-monotone score regardless of what its own before-after ECE comparison reports.
- Do not let a walk-forward split, a bootstrap bound, or an admission test run unclustered by fixture again once the fixture-grouping fix lands.
- Do not loosen the market-price ruler's 4 hour freshness bind (data-ingestion/src/config.ts:133-134) to the research gate-slate loader's 6 hour ceiling; that ceiling was never a publish gate.

**Founder-only on this track:**

- Approve and run (or delegate to the browser agent) any read-only production probe this track's historical backfills or attribution numbers need; no agent session touches the database.
- Apply the proposal SQL, from docs/ops/proposals/, for the new additive CLV columns (clvSameBookValue, clvSameBookVerdict, clvBookBasis) and for the durable, table-backed form of the as-of independent-edge twin once the labels track's table exists.
- Approve the cron additions or schedule changes this track needs: the receipt-versus-odds-table divergence monitor riding the existing calibration cron, and any change to the backfill cron's own schedule or scope.
- Decide whether the existing cross-book clvValue/clvVerdict columns are ever retired or re-labeled on public surfaces once the same-book numbers exist; that is a public track-record change.
- Decide whether ESTABLISHED_TIER_CLV_FLOOR is ever set to a value different from the derived vig break-even constant; today the design keeps them equal by founder choice, not by necessity.
- Run or delegate the actual numeric passes: the historical same-book CLV backfill, the three attribution-test experiments, and the first live confirmation that the fixture-grouped walk-forward test passes on real rows.
- Decide the retention and backfill depth for the one-time migration that retags roughly nine months of existing backfilled rows with the new typed trueProbBasis field.

### Track F: the head trainer and the admission mill

**Charter.** Turn the head trainer, the admission mill, and the promotion evaluator from a set of individually correct modules that ran once by hand into a scheduled, self feeding cycle that trains, scores, and shadow deploys every candidate head automatically, touching no customer, until the founder's single version bump decides one of them has earned the board.

**Starts on day one, with no founder action and no dependency:**

- Rewrite the head trainer's contract so the market logit enters as a fixed, unpenalized offset and the residual intercept is penalized with every feature weight; the identity fixed point test runs today against synthetic data with zero real rows needed.
- Add a groupKey to walk-forward.ts's TimedRow and cut folds on group boundaries instead of array index; a property test proving no fixture straddles a fold runs today over randomly generated corpora.
- Re-run scripts/edge-lab/feature-admission.ts, which already produced a correct, honest, hash chained verdict on 2026-07-16 and has not been asked to run again since; a second registered family can start today with zero schema change and zero founder action.
- Thread a fixtureId through promotion/types.ts and correct empirical-bernstein.ts's variance estimate for fixture clustering, regression tested against the exact numbers already recorded in reports/edge-lab/phase1-nfl-acceptance.json.
- Write the log loss empirical Bernstein leg as a sibling to empirical-bernstein.ts, with its own clipping epsilon and range width derivation stated in its header, matching the discipline the existing Brier leg's header already sets.
- Write the shadow lane's pure function and its interim JSON artifact path against a stub challenger, so the lane is proven correct before any real head exists to shadow.
- Write the pre-registration schema and its git ancestor check, closing the recordedAt gap in trials-registry.ts's own admission path.

| ID | Workstream | Concurrent | Owner | Entry files | Acceptance |
|---|---|---|---|---|---|
| F1 | Offset correct head trainer with hierarchical shrinkage | yes | agent | `packages/prediction-engine/src/edge-lab/logistic.ts`, `packages/prediction-engine/src/heads/spec.ts`, `packages/prediction-engine/src/heads/fit.ts`, `packages/prediction-engine/src/heads/shrink.ts` | A new identity fixed point test: as the penalty increases across a stated grid, the head's output converges to the market probability within a stated tolerance on a synthetic zero signal corpus; an oracle test recovers known synthetic coefficients within a stated tolerance. |
| F2 | Fixture grouped, purged, embargoed splitter | yes | agent | `packages/prediction-engine/src/edge-lab/walk-forward.ts`, `packages/prediction-engine/src/edge-lab/__tests__/walk-forward-grouping.test.ts` | A property test over randomly generated fixture clustered corpora, run across many seeds: no group ever appears on both sides of any fold. |
| F3 | Admission mill: re-run and extend the already proven feature admission batch | yes | agent | `scripts/edge-lab/feature-admission.ts`, `packages/prediction-engine/src/edge-lab/trials-registry.ts`, `packages/prediction-engine/src/edge-lab/placebo.ts`, `packages/prediction-engine/src/edge-lab/logit-pool.ts` | npx tsx scripts/edge-lab/feature-admission.ts exits 0, writes a freshly dated report beside the existing 2026-07-16 one, and verifyTrialEntries reports the resulting chain valid. |
| F4 | Promotion evaluator generalized: fixture clustering and the log loss over market leg | yes | agent | `packages/prediction-engine/src/promotion/types.ts`, `packages/prediction-engine/src/promotion/integrity.ts`, `packages/prediction-engine/src/promotion/empirical-bernstein.ts`, `packages/prediction-engine/src/promotion/log-loss-bernstein.ts` | All six existing anti-DEC-062 invariant tests pass unmodified; a new seventh test proves the fixture clustered bound is strictly wider than the current i.i.d. bound on a synthetic corpus where every fixture contributes three correlated rows. |
| F5 | The shadow lane: the frozen contract's own named gap, built | yes | agent | `packages/prediction-engine/src/promotion/shadow-lane.ts`, `reports/edge-lab/shadow/` | Given a stub champion's locked fixture list and a stub challenger artifact, the lane emits one row per fixture and market with lockedAt identical to the champion's own; a row carrying any other timestamp is rejected by the existing integrity check for free, proven by test. |
| F6 | The scheduled tick, inside infrastructure already approved | yes | agent | `apps/web/app/api/cron/calibration-metrics/route.ts`, `scripts/ops/report-head-promotion.ts`, `.github/workflows/weekly-comparison.yml` | A replay test proves the added block changes zero bytes of any response the route already returns; a time budget assertion fails loudly, never silently, if the added work would approach the function's timeout. |
| F7 | The versioned head artifact: composing F1, F3, F4, and F5 into one replayable object | yes | agent | `packages/prediction-engine/src/heads/artifact.ts`, `reports/edge-lab/heads/` | Recomputing every stored verdict from its persisted inputs alone reproduces it byte for byte, the same property scripts/edge-lab/recompute.ts already proves for the CLV ledger. |
| F8 | Pre-registration as a runtime precondition, not a convention | yes | agent | `packages/prediction-engine/src/edge-lab/preregistration.ts`, `scripts/edge-lab/feature-admission.ts`, `docs/calibration-proposals/feature-trials/` | A candidate whose pre-registration file is not yet committed is refused with a named error; a test using two fixture commits, one an ancestor of HEAD and one not, proves the check fires correctly in both directions. |

**What each one builds.**

- **F1, Offset correct head trainer with hierarchical shrinkage.** A per stratum logistic head where the market logit enters as a fixed, unpenalized offset (coefficient permanently 1) and the residual intercept is ridge penalized alongside every feature weight, so the identity fixed point holds by construction; hierarchical shrinkage from global to sport to sport by market via the existing empirical Bayes primitive; an explicit presence indicator per independent feature in place of today's silent mean imputation. Capture that starts because of this row: NONE. Risk: Rewriting the trainer's penalty structure touches code every future head reads; ships with a regression test pinning today's logistic.ts behavior unchanged for any caller that does not opt into the offset.
- **F2, Fixture grouped, purged, embargoed splitter.** A groupKey on walk-forward.ts's TimedRow contract and fold cutting on group boundaries instead of row index, so a moneyline, a spread, and a total on one fixture can never land on opposite sides of a fold; the sealed forward holdout's predicate stated as one rule and left exactly as founder locked as it is today. Capture that starts because of this row: NONE. Risk: A group key that is inferred rather than supplied (parsed out of a row id, for example) will silently mis-group; the contract must require a caller supplied groupKey and refuse to infer one.
- **F3, Admission mill: re-run and extend the already proven feature admission batch.** Turns the one time 2026-07-16 run into a repeatable batch. Every candidate from every track files a pre-registration and enters the same hash chained trials registry family, receives both an as-of report that governs entry to a head and a close report that governs only closing-line-value claims, and is decided at family level under one shared Benjamini-Hochberg level, never a caller chosen subfamily. Capture that starts because of this row: Starts logging immediately: every candidate TRIED, not only ones admitted, becomes a permanent hash chained registry row the moment this runs, which is the founder's rule 3 applied to tried hypotheses rather than raw signals. Risk: Already proven once; the remaining risk is social, not technical. Nobody re-runs it without a trigger, which is F6's job.
- **F4, Promotion evaluator generalized: fixture clustering and the log loss over market leg.** Threads a fixtureId through PairedBrierRow, ClvRow, and RegisteredWindow so Leg 1 and Leg 3 treat a game's several markets as one cluster, never as independent draws. Adds a paired out of fold log loss empirical Bernstein leg against a market only baseline, probabilities clipped at a stated epsilon with the range width restated accordingly, as the criterion deciding whether a brand new head may enter the shadow ladder at all, before any champion versus challenger comparison is even possible. Capture that starts because of this row: NONE. Risk: Widening the bound is safe by construction. The real risk is the log loss leg's clipping epsilon becoming a second undisclosed hyperparameter exactly like the range width bug this same contract's history already caught once; it must be a stated, registered constant.
- **F5, The shadow lane: the frozen contract's own named gap, built.** A pure function that locks a challenger head's probability at the exact instant the live champion locks, for every fixture and market the champion already priced, writing PairedBrierRow and, once settled, ClvRow shaped candidates to an interim versioned JSON artifact until a persisted table exists. This is the promotion contract's own documented missing Workstream E router. Depends on F1, for a real, non-stub challenger artifact to shadow for real. The lane's own code and tests run against a stub challenger without it, so nothing here sits idle waiting. Capture that starts because of this row: Starts logging immediately once any head, even a first candidate, exists: every subsequent cron tick adds one more paired row per shadow served fixture, which is the mechanism that grows a head's track record without further founder involvement. Risk: A shadow row that ever reaches a customer visible surface defeats this design's entire safety argument. The artifact's write path must be physically incapable of being read by any customer facing route, not merely undocumented for one.
- **F6, The scheduled tick, inside infrastructure already approved.** A new block inside the existing, already approved, already running six hourly calibration-metrics cron, plus an always post weekly report modeled on the existing weekly shadow versus live comparison, that refits due heads, advances the admission batch's next unregistered family, and advances the shadow lane for every existing candidate and certified head, always writing a report regardless of verdict. Depends on F1 through F5, for real content once each exists. The wiring and its own tests are written and proven against stubs today, so the code is not idle while it waits for them. Capture that starts because of this row: Converts F3's and F5's manual, occasional runs into an automatic, permanent cadence. No new signal, only cadence. Risk: The single highest leverage place to break a live route by accident. Ships behind its own test and the ordinary review every prior change to this exact cron already received in this repository's history.
- **F7, The versioned head artifact: composing F1, F3, F4, and F5 into one replayable object.** A versioned JSON artifact per stratum head: feature schema hash, coefficients, out of fold report, promotion history, and a status of candidate, certified, or retired, following the same replay discipline promotion/evaluate.ts already proves with recomputePromotionDecision, where any two callers given the same persisted rows and code revision reach the same verdict byte for byte. Depends on F1, F3, F4, and F5's artifacts, composed rather than sequenced behind. The composition itself can be written and tested against any one stub while the others are still in progress. Capture that starts because of this row: NONE. This is the object other capture composes into. Risk: A retired head's numbers must stay in the artifact, never deleted. Deleting a kill record is how a killed feature quietly gets re-tried without anyone noticing it was already tried.
- **F8, Pre-registration as a runtime precondition, not a convention.** A committed pre-registration file per candidate: hypothesis, exact feature definition and code hash, stratum list, kill line stated on the same line as the prediction, family id, false discovery level, and placebo spec, whose git commit must be an ancestor of HEAD before the admission harness will run it. Closes trials-registry.ts's own recordedAt is caller supplied gap. Depends on F3, whose loader this precondition attaches to. The schema and the ancestor check function are pure and testable on their own before that. Capture that starts because of this row: Starts logging immediately: a kill line committed before a result exists is itself a new, permanent record of what this architecture predicted and when. Risk: A check implemented only as a comment or a log line is not a precondition. It must throw and stop the run, never merely warn.

**Invariants that must survive every future edit to this track:**

- logit(p_head) equals 1 times logit(q_market) plus f(x): the offset's coefficient is fixed at 1 and never fit, and f's own intercept is ridge penalized exactly like every feature weight, so the identity fixed point (infinite penalty implies the head equals the market exactly) holds by construction, never by tuning.
- Every fold is cut on a fixture group key, never on row index; purge and embargo operate on event window overlap and on time, never on array position.
- A stratum head fits only above 100 decided rows carrying a market price; below that it shrinks to its parent stratum; below 100 for a market globally there is no head and no pick.
- Certification reads the debiased point estimate and the ninety fifth percentile bootstrap bound against the same floor; the bound built to protect an already deployed slice from small sample demotion is never reused to certify a number a customer is about to see for the first time.
- Promotion requires Leg 1 and Leg 2 together, never Leg 1 alone; Leg 3's integrity check throws on a violation, it never silently filters one out.
- Every promotion window is pre-registered (event universe, floors, margins, alpha) before it opens, hashed together with the code revision, and every decision replays byte for byte from persisted rows alone.
- A pre-registration is a committed file whose git commit precedes the run it governs; its kill line is written on the same object as its hypothesis, before the result exists, never after.
- The trials registry is one shared, hash chained ledger for every track's candidates; the false discovery family is the whole registered batch, never a caller chosen subset of it.
- The shadow lane locks a challenger's probability at the exact instant the live champion locks; any later timestamp is a leak, not evidence.
- A rejected feature or a demoted head is retired with its numbers intact; it is never deleted from the registry or the artifact history.
- Nothing this track produces writes a byte a customer reads; every artifact this track builds stays diagnostic until the founder's version bump serves it.

Track F owns the one part of this architecture whose absence explains why ten months of work has not compounded: the machinery that takes a candidate feature or a candidate head from an idea to a scored, replayable, hash chained verdict, and does it again next week without anyone typing a command. Every piece of that machinery already exists, and it has already run correctly, once. On 2026-07-16, scripts/edge-lab/feature-admission.ts loaded 1,871 real nflverse games spanning 2019 to 2025, sealed season 2025 as an untouched forward holdout whose play by play was never even downloaded, windowed five prior window team form candidates through the real as of feature store, recorded each as a hash chained trial in packages/prediction-engine/src/edge-lab/trials-registry.ts, and decided admission at family level under Benjamini-Hochberg at q equal to 0.10: four of five candidates correctly failed to clear the bar, the fifth cleared it and was flagged as a probable market residual leak rather than celebrated as edge, and the honest verdict was written to reports/edge-lab/feature-admission-nfl.md. The same afternoon, scripts/edge-lab/phase1-acceptance.ts ran a full purged, embargoed, out of fold cycle against the same sealed holdout, selected a beta calibration blend by held out Brier decomposition, ran the market blend truth test in packages/prediction-engine/src/edge-lab/logit-pool.ts, measured a beta of negative 0.0822 with a confidence interval from negative 0.7704 to 0.6060 that crosses zero, correctly returned the verdict FIRE_NOTHING, and correctly fired on zero rows because there was nothing there to fire on. Git history on both scripts/edge-lab/ and reports/edge-lab/ shows that entire cycle happened inside a few hours of one calendar day and has not been asked to run again in the more than sixty days since. That is not a missing capability. That is a working engine that was switched off immediately after its first successful test.

The head trainer is packages/prediction-engine/src/edge-lab/logistic.ts, and it carries one defect serious enough to invalidate any head built naively on top of it. Its gradient step penalizes every feature weight toward zero, w[j] minus equals lr times g[j] over n plus lambda times w[j] at line 109, but never penalizes the intercept, b0 minus equals lr times g0 over n at line 107, so as the ridge penalty grows without bound the model's output converges to the intercept alone, which fits the training fold's own base rate, not the market. A per stratum head built by handing this trainer a market logit feature column like any other would therefore shrink, under heavy regularization, toward whatever fraction of the training rows were labeled a win, silently discarding the market's information exactly when the head trusts its own features least. The fix is structural, not a hyperparameter. The market logit enters as a fixed offset whose coefficient is permanently 1 and never fit, logit of p equals 1 times logit of q plus a residual intercept plus a weighted sum of features, and that residual intercept is penalized exactly like every feature weight. Under that construction the identity test is true by definition rather than by tuning: as the penalty grows without bound, the residual intercept and every feature weight go to zero and the head's output becomes the market probability exactly, so a head engineered this way can never be less honest than the market it is built on top of. Each independent estimator, Elo, the Poisson and Dixon-Coles and Skellam family, MLB standings Bradley-Terry, NFL opponent adjusted EPA, enters as its own logit feature with an explicit presence indicator column, replacing the trainer's current silent mean imputation at lines 84 to 89, because an independent that has nothing to say and one that says exactly the average are different facts the current code cannot tell apart. Shrinkage runs hierarchically, a sport by market head toward its sport head toward one global head, using the conjugate posterior mean primitive already built and tested in packages/prediction-engine/src/metrics/core/shrinkage.ts, with the prior strength itself set by a registered threshold grid trial rather than a hand picked constant, so how strongly a thin stratum trusts its parent is as auditable as any other choice in this design.

The splitter every one of these heads depends on has a real gap the existing suite does not close. walkForwardSplits, edge-lab/walk-forward.ts lines 80 to 137, sorts rows by decisionAt and cuts test blocks by array index, firstTestIdx plus k times blockSize at line 103. Its TimedRow interface, lines 31 to 35, carries an id, a decision instant, and an event end, and nothing that groups rows sharing one game. A moneyline, a spread, and a total on the same fixture are three rows with three ids that can land on opposite sides of a fold boundary purely because of where the array cut fell, which is exactly the correlated outcome leak the purge and embargo logic in this same file was built to prevent for time, not for fixture identity. edge-lab/placebo.test.ts and the two walk-forward-taxonomy test files exercise the module indirectly, and none of them pins fixture grouping, because the property does not yet exist to pin. The fix adds a groupKey to TimedRow, cuts test blocks on group boundaries so every row sharing a group lands on one side of every fold, and ships with a new test whose assertion is the exact sentence a reviewer would ask for: no fixture appears in both the training and the test side of any fold, checked over randomly generated fixture clustered corpora rather than only the hand built cases a test's own author already knows are safe. The sealed forward holdout, FOUNDER_HOLDOUT_TOKEN at line 149 and GSE_ALLOW_HOLDOUT_OPEN at line 158 through the end of the file at line 210, is untouched by this fix and stays exactly as strict: a human types both the literal token and the environment variable by hand, in the same sign off session, and nothing in this design ever tries to make that easier.

The admission mill already has its ledger built correctly. edge-lab/trials-registry.ts is an append only, hash chained registry, entryHash at lines 61 to 77 and deepFreeze at lines 99 to 107, where every entry's hash covers its predecessor, verifyTrialEntries at lines 145 to 156 independently re-derives the chain, and benjaminiHochberg at lines 170 to 196 runs real step up false discovery control with real adjusted p values, not a placeholder. decideFamilyAdmissions at lines 294 to 322 is explicit that admission is decided once, at family level, across every sibling trial, because deciding from a partial family is exactly the violation the registry exists to prevent. What the registry does not yet enforce is when a trial may be recorded. TrialInput.recordedAt at line 42 is a caller supplied ISO string, and the one existing runner stamps it at execution time, so the hash chain proves a trial happened in order but proves nothing about whether its hypothesis, its feature definition, or its kill line were fixed before anyone looked at the result. The fix is a pre-registration file per candidate, committed before the harness will accept a run for that trial id: hypothesis, exact feature definition and code hash, the stratum list, the kill line stated in the same file as the prediction and never after it, the family id, the false discovery level, and the placebo spec. feature-admission.ts is extended to check that the pre-registration's own commit is an ancestor of HEAD before it will run a candidate, and to refuse with a named error rather than silently skip one that is not yet committed. The market supplies the mill's second, harder null on its own. edge-lab/placebo.ts's EvalRow carries qClose at line 50, the de-vigged closing probability, and conditionalMiProbe, reported through MiProbeReport at line 369 and defined at line 390, conditions its permutation test on exactly that value, which the file's own header names honestly as the EV-vs-close metric, because true CLV needs a decision time price the historical corpus does not yet have. That closing price conditioning is the close report, the stronger null, and a feature that only clears it is display edge only, marketable as closing line value but never eligible to move a coefficient. The as of report substitutes the odds table's price at generation time for qClose and is the only report that can ever touch a head. Every candidate this architecture will ever try, from every one of the other six tracks, files through this one shared registry under one family, because Benjamini-Hochberg controls false discovery over the batch it actually sees: a track that opens a private registry to skip the queue defeats the correction for every other track's candidates too, silently, the same day it is opened.

Promotion already has a frozen, tested contract most of this repository has never had reason to open. docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md documents six anti-DEC-062 invariants named after a previous promoter whose computeClvMean returned 0.5 for every input and could therefore never promote anything while its own tests asserted that tautology as a pass. promotion/evaluate.ts's evaluatePromotion, lines 25 to 101, composes three legs exactly as the contract demands. Leg 1 is a paired Brier differential read through an empirical Bernstein lower confidence bound, promotion/empirical-bernstein.ts lines 63 to 81, correctly using a range width of 2, not 1, because a squared error differential spans negative 1 to 1, and a draft that hard coded width 1 would have understated uncertainty by roughly 0.017 at n equal to 500, more than eight times the practical floor, in the direction that manufactures false eligibility. Leg 2 is CLV non-inferiority by a one sided Welch test built on the same welchCompare the trend discovery module already uses, promotion/clv-non-inferiority.ts lines 1 to 21. Leg 3, validateWalkForwardIntegrity in promotion/integrity.ts lines 99 to 184, throws on eight distinct integrity violations rather than silently filtering any of them, and runs before any statistic is touched. PromotionInput, promotion/types.ts lines 100 to 109, accepts only row level records, no aggregate field exists anywhere in the type, and no-aggregate-inputs.test.ts pins that as a structural property. promotion/__tests__/ already carries a dedicated file per named risk, founder-gate.test.ts, no-aggregate-inputs.test.ts, placebo.test.ts, window-hash.test.ts, empirical-bernstein.test.ts, clv-non-inferiority.test.ts, integrity.test.ts, and evaluate.test.ts, a naming discipline this track's own new tests should match. Two additions belong inside this frozen module, both inside this track's charter, both compatible with the contract's Leg 1 and Leg 2 rule rather than a replacement of it, and neither moves one of the contract's own protected numbers. First, for a stratum with no live predecessor to pair against, the actual state of every stratum in this engine today, the champion in Leg 1 becomes the market itself, championProb for row i is simply q_i, and the paired differential becomes a log loss gap rather than a Brier gap, because log loss is the scoring rule that punishes an overconfident miss hardest, exactly the failure a fixed offset head is most likely to produce when its small residual signal is wrong. The same empirical Bernstein machinery serves this leg once probabilities are clipped to a stated epsilon, for instance one in a thousand from either boundary, because an unclipped log loss differential is unbounded and the bound needs a known range; clipping at that level bounds each side near 6.9 nats, so the paired range width is near 13.8, not the Brier leg's 2, and the bound's finite sample penalty scales with that width, so this leg needs more evidence to detect the same effect size, a cost this design states rather than hides. Clearing this leg is what makes a head shadow eligible at all. Clearing it again against a later challenger, using ordinary champion versus challenger Leg 1 and Leg 2, is what lets one shadow served head replace another. Second, validateWalkForwardIntegrity deduplicates on eventId for Brier rows at lines 142 to 148 and on pickId for CLV rows at lines 164 to 173, but never on a shared fixture, so a moneyline and a spread on one game are today treated as two independent draws when their outcomes move together, and empirical-bernstein.ts's sample standard deviation is Bessel corrected under exactly that independence assumption. The fix threads a fixtureId through PairedBrierRow, ClvRow, and RegisteredWindow, rejects a window whose rows omit it, and replaces the plain sample variance with a cluster robust estimate computed over fixture groups, which can only widen the bound, never narrow it, a correction in the conservative direction under the same discipline law 3's own amendment already granted the debiased ECE estimator.

The shadow lane is new code with an exact precedent already running in production. .github/workflows/weekly-comparison.yml fires every Monday at 13:00 UTC, runs scripts/ops/compare-shadow-vs-live.ts against settled ShadowSignal rows, and posts a markdown report as a GitHub issue whether the shadow engine won, lost, or had an insufficient sample, because the script's own header states that posting only a favorable verdict would be exactly the cherry picking this repository's proof machinery exists everywhere else to prevent. ShadowSignal, schema.prisma line 1341, unique on gameId and modelVersion at line 1359, is a single home win scalar per game and model version, and cannot hold a per market, per challenger probability, which is why a fitted head cannot be shadow scored through that table today. The lane this track adds is a pure function that, given the fixtures a live champion already priced this cycle and a challenger head's artifact, emits one PairedBrierRow, and once the pick settles one ClvRow, per fixture and market, with lockedAt pinned to the champion's own lock instant rather than a separate, later read, so integrity.ts's existing lockedAt in window and settledAt after lockedAt checks are satisfied by construction rather than by discipline. Until a persisted table exists, the interim artifact is a versioned JSON append log, the same pattern reports/edge-lab/feature-admission-nfl.json already uses successfully, so the mechanism is provable today and the later migration to a table changes no caller. PickSignalSnapshot, schema.prisma line 801, boolean flags starting at line 808, is the closest existing per pick table and it is the wrong shape for this too, because it records whether a signal category was present at prediction time, never the feature's value. None of this waits on the founder. It needs a function, a JSON file, and a fixture.

Named as one cycle, the loop this track closes has five stages, each with its own trigger, artifact, and guard. Data lands when a settled Pick row or a real nflverse season becomes readable through the as of store, and the artifact is a LabeledExample set keyed by fixture, sport, and market, guarded by assertNoLookahead throwing on any observation later than its own cutoff. The head trains on the six hourly calibration-metrics cron tick, or on a manual run against nflverse or an exported settled pick file, producing a versioned head artifact, feature schema hash, coefficients, out of fold report, status candidate, guarded by the fixture grouped split and the fixed market offset together. Eval scores once the artifact exists and the stratum has crossed the 100 row floor with a market price, producing a certification record, Brier, debiased ECE at the point estimate and the ninety fifth percentile bound, Murphy, and the paired out of fold log loss lower bound over the market only baseline, guarded by fixture clustered bounds and by selection and certification reading disjoint folds. The winner shadow deploys once certification passes and, where a predecessor exists, evaluatePromotion reads ELIGIBLE, producing one shadow lane row per fixture and market locked at the champion's own instant, guarded by Leg 1 and Leg 2 together, never Leg 1 alone. Deployment produces more data on every subsequent cron tick, one more paired settled row per shadow served fixture, guarded by the simple fact that the shadow lane never writes a byte a customer reads. The fifth stage feeds the first: a head shadow served for three weeks carries three weeks more paired evidence than one shadow served for three days, and that evidence accrues automatically, on the schedule the founder already approved for the calibration cron, with nobody re-running anything by hand. This is the founder's rule 3 applied to compute rather than to capture. A head trained today has an out of fold record in a few weeks. A head whose training waits for some other track to finish first has zero record forever until someone starts it, the exact fate that met the July run for the more than sixty days between then and today.

Exactly one step in this loop changes what a customer sees, and it is the founder's alone: editing MODEL_VERSION at packages/prediction-engine/src/constants.ts line 25, v5.2.7 today, and landing a matching IMPLEMENTED CalibrationProposal, because scripts/guardrails/model-freeze.mjs hard blocks any bump that arrives without one, checking a seeded row in packages/db/prisma/seed.ts, a dated file under docs/calibration-proposals/, or the frozen line in docs/calibration-proposals/FROZEN.md. Every other founder action in this track is narrower and gates only escalation, never the loop's ordinary operation. Opening the sealed forward holdout needs a human to type the literal FOUNDER_HOLDOUT_TOKEN and set GSE_ALLOW_HOLDOUT_OPEN to true by hand in one sign off session, enforced in code, not by convention. Flipping CALIBRATION_ADJUSTMENTS_ENABLED moves the downstream Kelly sizing pipeline live and has nothing to do with whether a head may train or shadow serve. A persisted feature vector table, a head artifact table, and a challenger shadow picks table are agent authored SQL proposals filed under docs/ops/proposals/, never under packages/db/prisma/migrations/, and none of the three is required for this loop to run, because the JSON artifact path substitutes for every one of them. Amending the frozen contract's own numbers needs the same explicit sign off its FROZEN status implies, while correcting its variance estimator for fixture clustering is a bias correction under the standing amendment law 3 already granted the debiased ECE estimator, reported beside the uncorrected number, and does not wait for anyone. The one dependency this track cannot route around is credentials, not code. No agent session holds DATABASE_URL, so the first pass against real settled picks rather than nflverse and the historical archive needs either the founder or an owner authorized route to run the already existing settled picks export once, or needs this track's own compute block to run inside the already credentialed six hourly cron once that block is added and reviewed like any other change to that route, which is the ordinary review every change in this repository already gets before it reaches production, not a special gate on this track, and it blocks not one line of the trainer, the splitter, the mill, or the evaluator from being written, tested, and run today against nflverse and the archive, exactly as they already were on 2026-07-16.

Track F does not sit behind any of the other six tracks, and the reason is structural, not optimistic. A feature another track captures, an injury flag, a weather reading, a beat report signal, a narrative fact carrying its source and its verifiedAt, is from this track's side one more numeric column with a missingness indicator competing for the same shared registry family. It makes the mill's job larger, never its start date later, because the mill already runs on today's columns, proven end to end on nflverse's team form family alone in July. A decision layer or publish gate track that changes what ships to a customer only ever reads this track's output, a certified, promoted, founder bumped head artifact, and reads it after the fact, the same way a dining room does not need to exist before a kitchen starts cooking. The one genuine cross track fact worth stating plainly is a data quality caveat, not a blocker: clv-capture.ts reads its odds batch with no book identifier at lines 90 to 144, while OddsLineSnapshot carries a real book column at schema.prisma line 472 inside the model beginning at line 467, so today's Leg 2 rows score book mix drift as market movement, and every promotion report this track produces states that caveat beside its numbers until whichever track threads the book identifier through, at which point Leg 2's evidence gets cleaner without this track changing a line of its own code. What this track ships first, and repeats forever after, is not a promoted model. It is the honest capacity to try, record, and grade a hypothesis and mean it, the same capacity that switched itself on for a few hours on 2026-07-16, produced a correctly null verdict on four of five candidates and a correctly flagged, correctly uncelebrated fifth, and then sat completely silent through everything chronicled in this file since. A null result recorded on schedule, forever, is this track's deliverable. A promoted model is what eventually sits on top of it, and only the founder ever ships that last part.

**Do not, on this track:**

- Never let a head's shrinkage limit be anything but the market probability; an unpenalized residual intercept quietly reintroduces a base rate attractor exactly like today's logistic.ts.
- Never fit, certify, or shadow score a row whose factorBreakdown.independentEdge.trueProb was rewritten after settlement by backfillIndependentTrueProb.
- Never let a caller supplied recordedAt substitute for a committed pre-registration; a timestamp the same run stamps proves nothing about when the hypothesis was actually fixed.
- Never compute a promotion bound as though paired rows sharing one fixture were independent draws.
- Never auto promote on Leg 1 alone; a challenger that improves calibration but is CLV flat or worse stays a founder judgment case.
- Never let a feature admitted only on the close report raise a probability; only the as of report may ever move a coefficient.
- Never split a false discovery family by track, by candidate type, or by any caller chosen key; the family is always the whole registered batch.
- Never let a shadow lane row reach any customer visible surface, response, or export.
- Never delete a killed feature's or a retired head's record from the registry or the artifact history.
- Never open the sealed forward holdout, flip an env flag or gate, or bump MODEL_VERSION from an agent session or from inside any script this track adds.
- Never leave an unstated clipping epsilon in the log loss leg; an unstated constant there is an undisclosed hyperparameter the same way the uncorrected Brier range width once was.

**Founder-only on this track:**

- Edit MODEL_VERSION in packages/prediction-engine/src/constants.ts (line 25, v5.2.7 today) and land a matching IMPLEMENTED CalibrationProposal, satisfying scripts/guardrails/model-freeze.mjs. The single step in this whole track that changes what a customer sees.
- Open the sealed forward holdout by typing the literal FOUNDER_HOLDOUT_TOKEN and setting GSE_ALLOW_HOLDOUT_OPEN=true by hand, in the same sign off session (walk-forward.ts lines 149 to 210).
- Flip CALIBRATION_ADJUSTMENTS_ENABLED or any other env flag or gate this track's work touches.
- Apply the SQL for any table this track's interim JSON artifacts eventually migrate to (a head artifact table, a challenger_shadow_picks table, a pick_feature_vectors table), from an agent authored proposal filed under docs/ops/proposals/, never under packages/db/prisma/migrations/.
- Run or authorize the running of any script that requires live production credentials, including the first export of real settled picks (npm run export:settled-picks) that seeds the trainer beyond nflverse and the historical archive.
- Decide whether a corrected variance estimator, a signal path row, or a book mix drift fix may enter the promotion or eligibility sample; a change to what counts as a valid measurement population is a gate input change reserved to the founder's word by this repository's own standing convention.
- Approve loosening or tightening any of the frozen promotion contract's own protected numbers (delta_prac, epsilon, N_min, coverageFloor, alpha) in docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md; a bias correction to the estimator that computes them, such as fixture clustering, proceeds under the standing law 3 amendment without this step, reported beside the uncorrected number.
- Review and merge this track's one addition of a compute block into the already approved six hourly calibration-metrics cron route, or into a new always post scheduled workflow; ordinary production infrastructure review, not a recurring business gate, but still the founder's or the founder's delegate's call before it runs unattended.

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
