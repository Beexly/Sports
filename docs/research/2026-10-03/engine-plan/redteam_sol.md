## Bottom line

**The biggest risk is not missing signals. It is building a machine that manufactures convincing evidence of improvement.** The plan has the beginnings of a sensible baseline, surrounded by far more modeling and automation than its evaluation system can safely support.

Your reported market-offset result, **0.6072 versus 0.6070**, establishes neither improvement nor equivalence without a paired uncertainty estimate. The injury improvement is promising, but its validity depends on starter vintages, injury-report vintages, and the exact market timestamp.

I am treating the supplied measurements as claims to audit, not independently verified results. The documents also describe October 2026 as “measured today,” which is future-dated relative to this review.

---

# 1. The 10 most important things still missing

These are missing implementations or methodological contracts—not additional names for things already on the roadmap.

| # | Missing | Why it matters | First build step |
|---|---|---|---|
| **1** | **A decision-time benchmark with executable prices** | A T−90-minute forecast cannot use closing odds as its offset. Nor can its actionable edge be judged against a price unavailable when published. Otherwise the engine inherits future information or recommends nonexistent opportunities. | For every forecast, save the exact available book quote, line, both sides, quote timestamp, freshness, settlement rules, and de-vig method. Benchmark against a market-only forecast from **the same information time**. Keep close as a separate reference. |
| **2** | **A genuinely bitemporal, revision-aware data contract** | `event_time` and `observed_at` alone do not define corrections, superseded records, source publication time, or which revision a replay retrieves. A row can have an honest ingestion timestamp and still contain retrospectively revised information. | Add immutable source snapshots, content hashes, source publication time where available, ingestion time, revision/supersession links, and explicit vintage status. Implement one tested `latest_known_as_of()` query. |
| **3** | **A football-specific target and settlement ontology** | Win/loss, spread, total, and props have ties, pushes, voids, inactive-player rules, overtime differences, stat corrections, and book-specific settlement. A correct probability can otherwise be graded incorrectly. | Build a versioned target dictionary and settlement adapter. Start with NFL moneyline, spread, total, receptions, and passing yards. Test ties, integer-line pushes, inactive players, and corrected stats. |
| **4** | **Starter uncertainty and replacement-adjusted player value** | A feed-agreement check does not establish that a starter will play. Summed missing snap share treats an elite tackle like a replacement-level tackle and ignores correlated substitutions. | Represent QB starter probabilities and sample availability scenarios. Add position, recent role, replacement identity, and a strongly shrunk replacement-value estimate. Integrate scenarios rather than selecting one assumed lineup. |
| **5** | **An effective-sample-size and hierarchical evaluation design** | Two hundred targets and six mints from one game are not 1,200 independent observations. They contain extra information, but also massive shared dependence. Otherwise the gate reports artificially narrow intervals. | Define game/slate/week grouping. Use paired block resampling for comparisons and explicit target-family weights. Report games, forecasts, and effective dependence structure—not just row count. |
| **6** | **Nested, chronological model selection covering the entire pipeline** | Choosing features, regularization, encoders, calibration, prompts, and promotion rules on the same “held-out” seasons eventually fits those seasons. Walk-forward predictions alone do not prevent this. | Write outer evaluation folds with inner training/tuning folds. Freeze the entire pipeline before each outer block. Maintain a trial ledger containing failed experiments and parameter searches. |
| **7** | **A CPU-cheap dynamic, hierarchical baseline** | The plan jumps from flat features to foundation pretraining. There is a large middle ground: partial pooling, opponent adjustment, time decay, and explicit uncertainty. That is likely the best accuracy-per-dollar frontier. | Build a penalized or empirical-Bayes model with dynamic offense/defense, QB, home advantage, rest, and availability effects. Compare against the current champion using identical point-in-time rows. |
| **8** | **A validated model of player opportunities before player efficiency** | Props and fantasy are usually constrained first by snaps, routes, targets, carries, dropbacks, and game script. NGS embeddings plus imported fantasy projections do not substitute for predicting those opportunities. | Build an interpretable opportunity pipeline: team plays → pass/run mix → player participation/share → conditional efficiency. Evaluate each stage and its predictive distribution independently. |
| **9** | **Operational fail-safe behavior and reproducible artifacts** | There are 31 crons, empty tables, missing frames, and several proposed free-compute services. A stale or partially generated slate can be published with apparently valid traces. | Add a pre-publication health gate: feed freshness, coverage, entity resolution, odds freshness, artifact checksum, and model version. On failure, fall back to the timestamp-matched baseline or abstain. Add rollback and a publication kill switch. |
| **10** | **Selection-aware product evaluation** | Full-slate forecast quality, betting returns, DFS results, and selective pick accuracy are different objectives. An agent can improve published hit rate by only picking heavy favorites or avoiding difficult games. | Persist forecasts for the entire eligible universe, including abstentions. Report full-universe proper scores separately from coverage, executable-price expected value, realized returns, and DFS performance. Freeze each metric’s eligibility denominator. |

**Important source gap within #4:** authoritative game-day inactives, actual active rosters, and confirmed lineup changes deserve priority over broad social capture. The plan names an inactives feed as a task; it has not established a reliable source, refresh policy, or historical vintage.

---

# 2. What is wrong or mis-prioritized—and the fix

### A. “The binding constraint is labels” is not established

Thirty-three features performing worse than two could reflect weak features, leakage, misspecification, redundant variables, regime shifts, or poor tuning. It does not prove that foundation pretraining is necessary.

**Fix:** run a compact diagnostic ladder:

1. Timestamp-matched market baseline.
2. Current independent baseline.
3. Regularized low-dimensional residual model.
4. Hierarchical/dynamic model.
5. Small tree model.
6. Only then pretrained representations.

Measure incremental benefit and compute cost at each step.

### B. “250 targets per game means 100× the calibration data” is false

More outcomes can improve parameter estimation. They do not create 100 independent game realizations. Nested thresholds on the same player’s yards are especially redundant.

**Fix:** use multiple outcomes in a hierarchical or joint likelihood, with game-aware evaluation. Do not pool arbitrary market probabilities into one calibration map just to inflate `n`.

### C. Close cannot simultaneously be “only a reference” and the effective training objective

Market offsets can be useful without making the close the target. But post-mint line movement as a reward actively trains agreement with future market prices.

**Fix:** distinguish three things:

- **Outcome target:** the event or realized stat.
- **Decision-time market input:** what was available when minting.
- **Future-market diagnostic:** subsequent price movement.

Keep CLV diagnostic initially. If it becomes an auxiliary loss, explicitly measure whether it improves outcome scoring on untouched data. Otherwise the engine becomes a market-following system while claiming independent learning.

### D. “Wire immediately” should not mean “publish immediately”

A new zero-weight feature can still change retrieval, missingness, preprocessing, normalization, runtime behavior, and LLM output. Zero coefficient is not zero system impact.

**Fix:** wire ingestion immediately; quarantine modeling and publication effects behind versioned feature flags. “Weight earned” must include proof that failed families cannot influence the champion through another path.

### E. Nightly NFL refitting is mostly repeated analysis of the same evidence

On many nights there are no new independent NFL games. Repeated testing and promotion invites selection bias and operational churn.

**Fix:** ingest nightly, monitor continuously, and fit/promote on a predefined cadence or minimum-new-evidence threshold. Keep daily fitting only where there is genuinely new training information.

### F. CV is badly over-prioritized for the next 30 days

Broadcast footage often cannot see all receivers, routes, or blockers. Camera cuts, replays, zoom, occlusion, and perspective make several promised features unidentifiable. Play-level FTN labels do not provide per-player boxes, identities, routes, or spatial ground truth.

**Fix:** reduce CV to a bounded experiment:

- One licensed video source.
- One measurable task.
- Independent labels from different games.
- Visibility/abstention flags.

For example, formation classification on pre-snap frames is a defensible first task. “Routes for every receiver” is not.

### G. Madden is an unvalidated prior, not free football truth

Ratings and playbooks can reflect public narratives, game balance, stale personnel, and simplified concepts. Sim-to-real transfer is a hypothesis. Keeping an ontology private does not itself establish permission to obtain or use it.

**Fix:** defer the full import. Test historically timestamped ratings against cheap football-derived priors on rookies/backups. Record source terms and incremental performance. Stop if the prior adds no value.

### H. Outcome-direction grading of reasoning traces is wrong

A correct forecast of 70% loses 30% of the time. Moving probability toward the realized outcome is not evidence that the cited reasoning was valid.

**Fix:** grade traces on factual support, timestamp validity, entity correctness, entailment, contradiction, and extraction accuracy. Grade predictive contribution through prospective ablation—not narrative hindsight.

### I. Log-loss RL on a tiny sports sample is premature

It invites confidence manipulation, reward overfitting, and expensive experiments. There is no demonstrated reasoner lift to justify it.

**Fix:** use an LLM as a constrained event extractor. Train the small numerical model on those events. Only consider policy optimization after a substantial prospective dataset establishes useful predictive content.

### J. A single coherent distribution does not guarantee accurate correlations

A simulator can be internally consistent and systematically wrong. Its same-game parlay tails may be its weakest component.

**Fix:** validate marginals, dependencies, and joint tail events separately. Publish only joint products supported by enough evidence. Do not force every existing pricer to be replaced before proving the replacement.

### K. External general-forecasting leaderboards are a distraction

They test different questions, horizons, and information environments. Success there does not establish NFL prop accuracy.

**Fix:** postpone them until sports forecasting, publication, and grading are reproducible. They are optional research benchmarks, not the core accuracy roadmap.

---

# 3. Hidden invalidators beyond §B

These are additional mechanisms, not repetitions of the six listed.

1. **Pretraining leaks across downstream historical folds.**  
   Holding out 2025–2026 does not make an encoder safe for testing 2018–2024 if it pretrained on those seasons or later ones.  
   **Guard:** train an encoder separately for each chronological fold, or evaluate the frozen encoder only after its training period.

2. **Post-play columns silently enter “pre-play” inputs.**  
   “All 372 columns” includes outcomes and derived quantities. EPA, success, receiver identity, yards, and drive outcomes require column-specific availability rules.  
   **Guard:** maintain an explicit input allowlist per prediction instant; do not rely on timestamps attached to whole play rows.

3. **Incorrect clock boundaries.**  
   “Before kickoff” is too weak for a T−90 forecast. A T−30 injury update is still leakage. In live play, event time and actual delivery time differ.  
   **Guard:** filter against the exact mint time using delivery-time knowledge, not merely game start.

4. **Selective availability creates benchmark bias.**  
   The 60 games with CLOSE snapshots may differ systematically from the other 239. Complete-case filtering can make either model look better.  
   **Guard:** report coverage and missingness by season, game, book, price, and target; preserve a common eligible universe.

5. **Duplicated information masquerades as independent support.**  
   Team news, ESPN, beat reports, social posts, projections, and market moves may all descend from one injury announcement.  
   **Guard:** event-level deduplication and source-dependency tracking. Ten copies of one report are one piece of evidence.

6. **Quote normalization errors.**  
   A spread can change sides, a prop can change thresholds, and prices can use different odds formats. Comparing probability changes across different lines is meaningless.  
   **Guard:** canonical market identity including selection, threshold, period, overtime, and settlement terms.

7. **Invalid permutation nulls.**  
   Shuffling across time can destroy season structure, team dependence, missingness, and market relationships. Passing that placebo does not prove incremental signal.  
   **Guard:** use restricted, block-aware placebos suitable for the family, alongside chronological out-of-sample tests.

8. **Insufficient permutation resolution.**  
   With 200 draws, an ordinary permutation p-value cannot get much below \(1/201 \approx 0.005\). Under standard Benjamini–Hochberg correction for 47 tests at 10%, the first threshold is approximately 0.0021. Small numbers of real discoveries may be impossible to resolve.  
   **Guard:** distinguish “placebo fraction” from a valid p-value and increase draws adaptively where needed.

9. **Conformal prediction is mistaken for uncertainty about \(p\).**  
   Coverage for outcomes does not automatically supply a confidence interval around the true win probability. Standard guarantees also depend on assumptions stressed by time drift.  
   **Guard:** specify whether an interval concerns outcomes, estimated parameters, or model disagreement. Never use those interchangeably.

10. **Separate calibration breaks joint coherence.**  
    Recalibrating ML, spread, totals, and props independently can contradict the simulator they came from.  
    **Guard:** calibrate distribution parameters or impose coherence constraints, then recheck all derived markets.

11. **Entity joins pass but identify the wrong thing.**  
    A 95.9% match rate says nothing about whether duplicate names, traded players, roster changes, or team-week assignment were resolved correctly.  
    **Guard:** audited join accuracy, uniqueness constraints, and season-effective entity relationships.

12. **Season/rules drift.**  
    Kickoff rules, overtime, schedule structure, and provider charting definitions can change. A long historical dataset can add biased rather than useful information.  
    **Guard:** rule-era features, time decay, provider-schema versions, and recent-era validation.

13. **Unverifiable LLM cutoffs.**  
    A published pretraining cutoff is not proof that later fine-tuning, preference data, or retrieval excluded historical results. Thirty days adds no principled protection.  
    **Guard:** prospective evaluation is the default for LLM-dependent predictions; unknown provenance fails closed.

14. **Outcome labels are corrected after grading.**  
    Props and DFS can change after official stat corrections.  
    **Guard:** distinguish provisional from final outcomes and version grading results in a new engine ledger—without touching frozen production picks.

---

# 4. Specific real resources GSE should use

These are resources not explicitly operationalized in the supplied plan. Availability and commercial-use rights must still be checked.

| Resource | Concrete use |
|---|---|
| **Kaggle NFL Big Data Bowl 2021** | Tracking-based work on coverage and passing plays. Use actual tracking to test whether proposed coverage/separation features help before trying to recover them from broadcast video. |
| **Kaggle NFL Big Data Bowl 2023** | Tracking and blocking-related data for evaluating pass-rush/pass-protection features and interaction models. |
| **Kaggle NFL Big Data Bowl 2025** | Pre-snap tracking/movement work. Useful for proving a pre-snap feature pipeline on a bounded dataset before building broadcast extraction. |
| **nfl4th** | Established fourth-down decision tooling. Benchmark coaching-aggressiveness features rather than inventing an opaque `tau` first. |
| **SportsDataverse `cfbfastR`, `hoopR`, and `fastRhockey`** | Sport-specific ingestion and data tooling. Use adapters with separate target/rules contracts—not an assumed universal sports schema. |
| **DuckDB + Apache Parquet** | Local replay, snapshots, feature joins, and evaluation on the existing laptop. Keep raw/versioned artifacts here while retaining the canonical production signal contract. Avoid repeated expensive Neon scans. |
| **CatBoost — Prokhorenkova et al., “CatBoost: unbiased boosting with categorical features,” NeurIPS 2018** | A strong CPU baseline for tabular interactions. Use shallow models, chronological folds, and tightly bounded search. |
| **NGBoost — Duan et al., ICML 2020** | Distributional regression baseline for continuous player-stat targets. Check whether the selected distribution fits zero-heavy and skewed outcomes before deployment. |
| **Beta calibration — Kull, Silva Filho, and Flach, AISTATS 2017** | Implement with explicit inner-fold fitting. The plan names beta calibration but does not specify a safe selection and deployment protocol. |
| **Gneiting and Raftery, “Strictly Proper Scoring Rules, Prediction, and Estimation,” JASA 2007** | Foundation for choosing scores for binary, categorical, continuous, and joint predictions. This prevents “log loss for everything” and target-pooling mistakes. |
| **GLiNER — Zaratiana et al., NAACL 2024** | Lightweight entity extraction for injuries, players, teams, and role changes. Benchmark against regex/rules before invoking a larger reasoner. |
| **`Qwen/Qwen2.5-3B-Instruct`** | A real small-model candidate for local structured extraction. Quantize and benchmark on the laptop; do not assume acceptable live latency. |
| **`intfloat/e5-small-v2`** | Cheap retrieval embeddings for news/evidence retrieval. A graph database is not required to retrieve player/team evidence correctly. |
| **The Odds API historical odds endpoints** | Potential gap filling for decision-time odds where existing capture is incomplete. This is paid, so first exhaust existing snapshots and price one small audit sample. |
| **NOAA Integrated Surface Database (ISD)** | Historical observed-weather checks. Useful for weather measurement and diagnostics, **not** a substitute for historical forecasts available at mint time. |

For the named MiMo deployment and the arXiv-ID modules, require exact model/repository identity, license, supported runtime, and a reproducible test. **An identifier in a document is not an integration receipt.**

---

# 5. The single change most likely to raise accuracy in the next 30 days

## Replace deterministic starter assumptions with a point-in-time, replacement-adjusted availability model.

Why this one:

- QB is your strongest reported non-market family.
- Injury availability is the only other family with a reported incremental benefit.
- Both currently have known vintage and lineup weaknesses.
- This is cheap to compute.
- It serves ML, totals, props, and fantasy.
- It has a much shorter path to validated value than CV, pretraining, Madden, or RL.

### Thirty-day build

**Week 1:** Establish authoritative forward capture of injury reports, depth expectations, inactives, and decision-time odds. Audit historical starter/availability vintages.

**Week 2:** Fit strongly shrunk QB and position-group replacement effects. Estimate starter and participation probabilities from practice progression, designation, and confirmed active status.

**Week 3:** Generate forecasts by averaging over lineup scenarios. Add only a few supported interactions—such as QB availability with offensive-line availability—rather than dozens of new features.

**Week 4:** Compare with the current champion on identical prospective forecasts and safe historical vintages. Use paired game-block intervals and separately report T−24h, T−90m, and final pre-kick performance.

**Do not promise a measurable 30-day NFL gain.** The sample may be too small. This is the highest-probability build, not a guarantee. A leakage repair may initially make measured performance worse while making the engine more honest.

---

# 6. Where the coding-agent kit will collide, stall, or game the metric

## Collision and deadlock risks

- **Lane 3 has two incompatible jobs.** In §G it owns the gate; in the forward prompt it wires signal producers. Split gate ownership from feature ownership.
- **Lanes 15 and 16 both own the watch pipeline.** Assign one owner; make the other an explicit subtask.
- **Lanes 13, 19, and 28 duplicate text, travel, officials, crowd, contracts, and other families.** Establish a single family-to-owner manifest before parallel execution.
- **Lanes 20(e) and 27 both populate the knowledge graph.** One writer, one schema, one migration owner.
- **Shared files have no integration owner.** Registry JSON, schema migrations, package manifests, cron configuration, model flags, and charts will become hotspots. “Comment and wait” is a deadlock policy, not a merge strategy.
- **The ownership table omits many lanes.** Add ownership for every lane and every shared boundary.
- **“One PR per lane” conflicts with “one PR per item” and “one family per PR.”** Choose one rule: bounded deliverable per PR.
- **Lane 0 requires outputs from lanes explicitly scheduled later.** Its calibrated champion depends on replay, calibration, and PIT correction. Permit only a separately frozen, already-audited artifact before kickoff; otherwise publish the baseline.

## Contract contradictions

- **Different promotion rules:** CI excludes zero; FDR `q ≤ 0.10`; placebo fraction `≤ 0.2`; merely better held-out loss. These are not equivalent. Publish one decision function.
- **Different reasoner interfaces:** “structured adjustments, never probabilities” versus “aggregate traces to p.” Choose one.
- **Different compute instructions:** ZeroGPU appears in a pretraining compute list despite being described elsewhere as inference-only. Define approved execution environments by workload.
- **Backfill timestamps are undefined.** If `fetchedAt` honestly means first known by GSE, newly downloaded historical data cannot automatically become historical first-seen evidence. Separate live knowledge time from audited archival-vintage time.
- **The receipt schema does not bind to the data.** Add dataset hashes, split IDs, preprocessing versions, tuning history, prediction-file hashes, and outcome versions—not merely Git SHA.

## Ways agents can game the metric

- Drop hard games through missing-feature filters.
- Count props and repeated mints as independent evidence.
- Select a favorable season/window.
- Tune against the supposedly untouched holdout.
- Improve hit rate by selecting heavy favorites.
- Make trace text hindsight-friendly.
- Relabel failed discoveries into new families and retest.
- Fit calibration to the evaluation rows.
- Promote on tiny noisy improvements.

**Fix:** a centrally defined eligible universe, immutable experiment ledger, fixed scoring policy, paired rows, group-aware uncertainty, and bounded promotion cadence.

## Operational facts the kit gets wrong

- **October 6, 2026 is Tuesday, not Monday.** The Monday is October 5. Date errors belong in tests because scheduling is part of correctness.
- **The news cadence blows the stated credit budget.** At one five-credit call per team, 32 teams twice daily cost **2,240 credits per week**, before injuries, rosters, or projections. The remaining 3,688 credits do not support that cadence for long.
- **Free GPU capacity is not a live-service SLA.** Quotas, queueing, sessions, and availability change. Production publication must survive all free-GPU services being unavailable.
- **“Stop whenever the kit is incomplete” will stall almost every lane.** Give agents a bounded escalation mechanism: propose the smallest contract change, identify its owner, and continue independent work.
- **Scanning thousands of papers should not promote builds merely because they report a held-out metric.** The metric may be unrelated, leaked, incomparable, or impossible to reproduce under your budget. Require relevance, data availability, implementation cost, and a specific GSE test.

## Recommended execution order

**Clock-correct data → target/settlement contract → reproducible baseline → uncertainty-aware availability → opportunity models → validated joint products.**

Everything else should earn a place after those are working. The founder can retain “ingest every signal” as a long-term ambition. **It should not become “let every signal touch production before we know what it means.”**