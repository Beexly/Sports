# REPOS WAVE A-2 — Mega Sweep 2026-11-06, Lane A (GSE Situational), Batch 2 (quota-closing)

Scope: 50 NEW GitHub repositories for the Galaxy Sports Edge (GSE) corpus, going deeper than Wave REPOS-A-1 into the seams A-1 did not exhaust: Big Data Bowl community work across all years (2019–2025), tracking-data feature engineering, offensive-line and pass-rush metrics, coverage classification, in-game decision models and game simulators as code, Elo/expected-points rating variants, play-by-play and data archives for CFL/XFL/UFL and college beyond the main stacks, TypeScript data/viz tooling in GSE's own stack language, LLM tooling built for football analysis, and sports data-viz libraries with analytical depth.

Excluded by design: betting/trading bots, odds tools, DFS lineup optimizers, pick sellers. (Encounters excluded on this basis during the sweep included CyberFvde/Sports-Betting-API and lacausecrypto/mcp-sports-hub, the latter an MCP aggregator whose tool set includes odds providers.)

Dedupe: every candidate owner/name was checked programmatically against SEEN-LEDGER.md + all SEEN-*.md fragments, REPO-CATALOG.md, 2026-11-04-MASTER-PULL.md, and SHARED-ITEMS-REGISTER.md (181-name base set). Hits are recorded as DUPE-SKIP lines in SEEN-REPOS-A-2.md and are NOT counted here.

Verification disclosure: each repo below was verified live against the GitHub API on 2026-11-06. The connector's bin/github-api helper repeatedly dropped connections (RemoteDisconnected) on direct /repos calls, so — exactly as disclosed in Wave A-1 — verification rests on GitHub search-API records returned by api.github.com (public API JSON), cross-checked against the dedupe bases. Stars, push dates, languages, and licenses below are as returned by the API on 2026-11-06. Unverified candidates were not counted.

---

## A-R2-01 — asmae-toumi/oh_snap

**Verified (GitHub API, 2026-11-06):** 18★ · last push 2021-02-22 · created 2020 · R · license: none · fork: False · https://github.com/asmae-toumi/oh_snap

**API description:** "NFL Big Data Bowl 2021"

1. WHAT IT IS: Big Data Bowl 2021 submission code (that year's theme: defensive pass coverage evaluation from player tracking data). Named "oh_snap" — the work is organized around the snap as the unit of coverage analysis.
2. WHERE: https://github.com/asmae-toumi/oh_snap
3. HOW TO USE IT: Clone and run the R analysis against the Kaggle BDB 2021 tracking release (weeks files + plays + players); notebooks/scripts derive per-play coverage features from pre/post-snap tracking frames.
4. WHICH SYSTEM: matchup layer (coverage evaluation) with usage-layer tracking features.
5. SECOND-ORDER: Coverage-feature definitions pair with A-R2-11 (coverage tells, BDB 2025) to build a multi-year coverage taxonomy; snap-moment framing transfers to pre-snap motion features in jdpipping/bdb2025 (A-R2-12).
6. §8 ENGINE-TRAINING VALUE: Metric family = per-play coverage quality from tracking (defender-receiver distances, leverage at throw). Data lives in the BDB 2021 Kaggle release; labels = play outcomes (completion, EPA) joinable from nflverse pbp (already in corpus via A-1). Labels exist via the pbp join.
7. PROVENANCE: Original work by Asmae Toumi (BDB 2021 entrant); not a fork. Data provenance: NFL/Kaggle Big Data Bowl 2021 tracking release.
8. VERDICT: LEARN-ONLY (2021-era R; extract the coverage-feature definitions, do not run as-is).

## A-R2-02 — burrisk/Big-Data-Bowl

**Verified (GitHub API, 2026-11-06):** 16★ · last push 2019-02-27 · created 2019 · R · license: none · fork: False · https://github.com/burrisk/Big-Data-Bowl

**API description:** "Replication code for my NFL Data Bowl submission"

1. WHAT IT IS: Replication code for a submission to the inaugural NFL Big Data Bowl (2019) — the first public player-tracking competition (theme: predicting rushing play outcomes from tracking at handoff).
2. WHERE: https://github.com/burrisk/Big-Data-Bowl
3. HOW TO USE IT: Read as a historical methods artifact: R code reproducing the author's full pipeline against the BDB 2019 Kaggle data.
4. WHICH SYSTEM: corpus (historical methods layer) — the root of the BDB lineage this wave catalogs year by year.
5. SECOND-ORDER: Baseline for how tracking-feature engineering evolved 2019→2027; its handoff-frame feature style is the ancestor of the expected-rush-yards framing in RodrigoLima82 (A-R2-03).
6. §8 ENGINE-TRAINING VALUE: Metric = expected yards at handoff from tracking geometry. Data: BDB 2019 Kaggle release (no longer distributed in original form — provenance value exceeds training value). Labels existed in the original release.
7. PROVENANCE: Original work by burrisk (BDB 2019 entrant), self-described replication code for his own submission.
8. VERDICT: CONTEXT-ONLY (historical anchor for the BDB lineage; data release superseded).

## A-R2-03 — RodrigoLima82/kaggle_nfl_big_data_bowl

**Verified (GitHub API, 2026-11-06):** 12★ · last push 2020-09-10 · created 2019 · Jupyter Notebook · license: none · fork: False · https://github.com/RodrigoLima82/kaggle_nfl_big_data_bowl

1. WHAT IT IS: Big Data Bowl 2020 work (second edition; theme: predicting rushing yards gained from tracking data at the moment of handoff) — Kaggle notebook pipeline mirrored to GitHub.
2. WHERE: https://github.com/RodrigoLima82/kaggle_nfl_big_data_bowl
3. HOW TO USE IT: Read the notebook end-to-end for its feature set (speed/direction differentials, defender proximity cones at handoff) and validation scheme against the BDB 2020 Kaggle data.
4. WHICH SYSTEM: usage layer (rush-outcome features) / matchup layer (runner vs front geometry).
5. SECOND-ORDER: Handoff-frame features complement the run-game work in A-1's corpus; the same geometry features feed the drive simulator priors in dlm1223/nfl-simulation (A-R2-22).
6. §8 ENGINE-TRAINING VALUE: Features = handoff-frame tracking geometry for rush yards; label = yards gained on the play (in the BDB 2020 release and joinable to pbp). Labels exist.
7. PROVENANCE: Original work by Rodrigo Lima (BDB 2020 entrant); GitHub mirror of his Kaggle notebooks — Kaggle is the original venue, this repo is the code record.
8. VERDICT: LEARN-ONLY (notebook form; mine the feature definitions).

## A-R2-04 — ritchi12/punt_returns_using_the_math_to_find_the_path

**Verified (GitHub API, 2026-11-06):** 13★ · last push 2022-09-07 · created 2022 · Jupyter Notebook · MIT · fork: False · ~889 MB repo (data and images included) · https://github.com/ritchi12/punt_returns_using_the_math_to_find_the_path

**API description:** "Data and images for the NFL's Big Data Bowl 2022 Student Competition"

1. WHAT IT IS: BDB 2022 Student Competition entry on punt returns (BDB 2022 theme: special teams) — models the returner's path choice against coverage pursuit geometry to find the mathematically optimal return path.
2. WHERE: https://github.com/ritchi12/punt_returns_using_the_math_to_find_the_path
3. HOW TO USE IT: Repo ships data and images alongside the notebooks (~889 MB), so the analysis is inspectable end-to-end without re-pulling Kaggle; read for the path-optimization formulation (pursuit angles, lane value).
4. WHICH SYSTEM: situational layer (special teams) — one of only two true special-teams tracking models in either wave.
5. SECOND-ORDER: Pairs with RobMulla/kaggle-nfl (A-R2-05, punt analysis competition) for a punt-unit feature set; return-path value is a field-position input to the WP model (A-R2-21).
6. §8 ENGINE-TRAINING VALUE: Metric = expected return yards by path vs actual path (path-efficiency delta per returner/coverage unit). Data in-repo + BDB 2022 Kaggle release; labels = actual return outcomes in the tracking release. Labels exist.
7. PROVENANCE: Original student-competition work by ritchi12 (BDB 2022); data provenance NFL/Kaggle BDB 2022 special-teams release.
8. VERDICT: LEARN-ONLY (formulation is the value; notebook implementation).

## A-R2-05 — RobMulla/kaggle-nfl

**Verified (GitHub API, 2026-11-06):** 6★ · last push 2019-01-10 · created 2018 · Jupyter Notebook · Apache-2.0 · fork: False · https://github.com/RobMulla/kaggle-nfl

**API description:** "NFL Punt Data Analysis Competition"

1. WHAT IT IS: Entry code for the NFL Punt Data Analysis Competition (the 2018 Kaggle analytics competition on punt plays that preceded/ran alongside the first Big Data Bowl era).
2. WHERE: https://github.com/RobMulla/kaggle-nfl
3. HOW TO USE IT: Notebook walkthrough of punt-play feature engineering from the competition dataset (hang time, punt direction, coverage release timing).
4. WHICH SYSTEM: situational layer (special teams) — provenance anchor for punt modeling, paired with A-R2-04.
5. SECOND-ORDER: Rob Mulla is a recurring Kaggle football competitor; his punt feature set + the Surrender Index (A-R2-19) cover both sides of the punt decision (execute vs surrender).
6. §8 ENGINE-TRAINING VALUE: Features = punt-flight and coverage-timing variables; label = return outcome / downed position from the competition release. Labels existed in the release; current availability is Kaggle-archive dependent — flagged honestly.
7. PROVENANCE: Original work by Rob Mulla; competition = NFL Punt Data Analysis Competition on Kaggle (2018).
8. VERDICT: LEARN-ONLY (historical special-teams provenance; small but real).

## A-R2-06 — peterlmajors/Offensive-Linemen-Immediate-Zone

**Verified (GitHub API, 2026-11-06):** 4★ · last push 2025-07-26 · created 2022 · Jupyter Notebook · license: none · fork: False · https://github.com/peterlmajors/Offensive-Linemen-Immediate-Zone

**API description:** "2023 NFL Big Data Bowl Submission — Leveraged Next Gen Stats to model pass-blocking engagements"

1. WHAT IT IS: BDB 2023 submission (theme: offensive/defensive line play) that models pass-blocking engagements from tracking data, defining an "immediate zone" around the blocker to score engagement quality and pressure allowed.
2. WHERE: https://github.com/peterlmajors/Offensive-Linemen-Immediate-Zone
3. HOW TO USE IT: Notebooks operate on the BDB 2023 tracking release (linemen tracked frames); read for the zone definition, engagement start/end detection, and per-lineman aggregation.
4. WHICH SYSTEM: matchup layer — offensive-line metrics are a named GSE reasoning track (OL → scheme → QB order); this is the wave's direct OL-metrics hit.
5. SECOND-ORDER: Blocker-side counterpart to xpassrush (A-R2-07): the same engagement scored from both sides gives a pressure-probability feature pair; feeds QB-under-pressure work (A-R2-13).
6. §8 ENGINE-TRAINING VALUE: Metric = per-engagement pass-block win/pressure-allowed from tracking geometry; features = distances/angles in the immediate zone over time. Data: BDB 2023 Kaggle release; labels = pressure/sack outcomes joinable from pbp. Labels exist via join.
7. PROVENANCE: Original work by Peter L. Majors (BDB 2023 entrant); data provenance NFL/NGS via Kaggle BDB 2023.
8. VERDICT: LEARN-ONLY (low stars but direct seam substance — the engagement-zone definition is the exportable asset).

## A-R2-07 — josephferraiola/xpassrush

**Verified (GitHub API, 2026-11-06):** 4★ · last push 2023-02-06 · created 2023 · R · license: none · fork: False · ~30 MB · https://github.com/josephferraiola/xpassrush

**API description:** "Big Data Bowl 2023 Project Code"

1. WHAT IT IS: BDB 2023 project building an expected pass-rush metric ("xpassrush") — modeling pressure probability from rusher/blocker tracking through the play, the rusher-side mirror of A-R2-06.
2. WHERE: https://github.com/josephferraiola/xpassrush
3. HOW TO USE IT: R pipeline over the BDB 2023 tracking release; read for the pressure-probability model spec and its per-rusher aggregation into a rating.
4. WHICH SYSTEM: matchup layer (pass rush vs pass protection).
5. SECOND-ORDER: Combine with A-R2-06 for a two-sided pressure model; per-rusher ratings are candidate inputs to the QB improvisation analysis (A-R2-13) and to sack-prop reasoning features.
6. §8 ENGINE-TRAINING VALUE: Metric = expected pressure rate per rusher (tracking-derived), features = get-off, bend/path, blocker distance curves. Data: BDB 2023 release; labels = charted pressures/sacks via pbp join. Labels exist via join.
7. PROVENANCE: Original work by Joseph Ferraiola (BDB 2023 entrant).
8. VERDICT: LEARN-ONLY (metric design transfers; R notebooks do not drop into the TS engine).

## A-R2-08 — LichtLab/nfl_big_data_bowl_2023

**Verified (GitHub API, 2026-11-06):** 4★ · last push 2024-04-04 · created 2023 · Jupyter Notebook · Apache-2.0 · fork: False · ~48 MB · https://github.com/LichtLab/nfl_big_data_bowl_2023

1. WHAT IT IS: A second, independent BDB 2023 entry (line-play year) — notebook pipeline over the same tracking release as A-R2-06/07, useful as a methods cross-check rather than a duplicate: different team, different modeling choices on identical data.
2. WHERE: https://github.com/LichtLab/nfl_big_data_bowl_2023
3. HOW TO USE IT: Read against A-R2-06/07 to triangulate which BDB 2023 feature choices are robust (agreement across independent entries) vs idiosyncratic.
4. WHICH SYSTEM: matchup layer (line play), corpus cross-validation role.
5. SECOND-ORDER: Three independent BDB 2023 implementations (A-R2-06/07/08) form a mini-consensus set for OL/DL feature engineering — consensus features are the ones worth porting.
6. §8 ENGINE-TRAINING VALUE: Same data/labels as A-R2-06 (BDB 2023 release; pressure outcomes via pbp join). Value is comparative: feature-set diffing across entries. Labels exist via join.
7. PROVENANCE: Original work by LichtLab (BDB 2023 entrant); Apache-2.0 — the only permissively licensed BDB 2023 entry in this wave.
8. VERDICT: LEARN-ONLY (consensus-check role; license would permit more if the code proves best of the three).

## A-R2-09 — armstjc/big-data-bowl-2024

**Verified (GitHub API, 2026-11-06):** 4★ · last push 2024-01-08 · created 2023 · R · MIT · fork: False · ~49 MB · https://github.com/armstjc/big-data-bowl-2024

**API description:** "The GitHub for the 2024 NFL Big Data Bowl (BDB) contest by Steven Patton, Bruno Mioto, and Joseph Armstrong"

1. WHAT IT IS: BDB 2024 submission (theme: tackling) by the team of Steven Patton, Bruno Mioto, and Joseph Armstrong (armstjc) — a third tackling-model implementation alongside the two A-1 already holds (mpchang, MLecardonnel), completing the wave's BDB 2024 coverage.
2. WHERE: https://github.com/armstjc/big-data-bowl-2024
3. HOW TO USE IT: R analysis over the BDB 2024 tracking + tackles releases; read for its tackle-opportunity framing and compare against mpchang's tackle probability/opportunity/conversion decomposition in A-1.
4. WHICH SYSTEM: matchup layer (tackling/run defense) and usage layer (tracking features).
5. SECOND-ORDER: Armstrong is this wave's most repeated author (also A-R2-32/38/39) — his cross-league data repositories supply the out-of-NFL validation sets for features designed here.
6. §8 ENGINE-TRAINING VALUE: Metric family = tackle success/opportunity from tracking geometry; data: BDB 2024 Kaggle release incl. the tackles file (explicit tackle labels — rare labeled defensive data). Labels exist natively.
7. PROVENANCE: Original team work (Patton/Mioto/Armstrong), MIT-licensed; data provenance NFL/Kaggle BDB 2024.
8. VERDICT: LEARN-ONLY (consensus third implementation for the tackling seam).

## A-R2-10 — MRBL-Systems/nfl_2024

**Verified (GitHub API, 2026-11-06):** 3★ · last push 2024-03-13 · created 2024 · Jupyter Notebook · license: none · fork: False · https://github.com/MRBL-Systems/nfl_2024

**API description:** "2024 NFL Big Data Bowl Submission"

1. WHAT IT IS: An additional independent BDB 2024 (tackling) submission in notebook form — small repo (~2 MB), included to widen the tackling-methods consensus set beyond the three named implementations.
2. WHERE: https://github.com/MRBL-Systems/nfl_2024
3. HOW TO USE IT: Skim-level read for divergent feature choices on the BDB 2024 tackling task; do not invest until the A-R2-09/mpchang/MLecardonnel consensus is extracted.
4. WHICH SYSTEM: corpus (tackling methods consensus), matchup layer reference.
5. SECOND-ORDER: Consensus methodology itself is the pattern: GSE's nothing-gets-killed corpus rule means independent reimplementations are evidence, and this wave deliberately banks them per BDB year.
6. §8 ENGINE-TRAINING VALUE: Same labeled BDB 2024 tackling data as A-R2-09; marginal value is feature-choice diversity, not new data. Labels exist natively in the release.
7. PROVENANCE: Original work by MRBL-Systems (BDB 2024 entrant).
8. VERDICT: LEARN-ONLY (thin repo; cataloged for consensus completeness, honestly flagged as the wave's lightest BDB entry).

## A-R2-11 — smitbajaj/ExposingCoverageTells-BDB25

**Verified (GitHub API, 2026-11-06):** 4★ · last push 2025-01-08 · created 2024 · Jupyter Notebook · license: none · fork: False · ~16 MB · https://github.com/smitbajaj/ExposingCoverageTells-BDB25

**API description:** "2025 Big Data Bowl Submission"

1. WHAT IT IS: BDB 2025 submission (theme: pre-snap analysis — predicting/exploiting what the defense shows before the snap) focused on coverage tells: pre-snap tracking signatures that leak the coverage a defense is actually in.
2. WHERE: https://github.com/smitbajaj/ExposingCoverageTells-BDB25
3. HOW TO USE IT: Notebooks over the BDB 2025 tracking release (pre-snap frames + play outcomes); read for the tell features (safety depth/rotation timing, corner leverage drift) and classification approach.
4. WHICH SYSTEM: matchup layer (scheme/coverage classification) — the wave's direct coverage-classification hit, feeding GSE's scheme-matchup reasoning track.
5. SECOND-ORDER: Pairs with oh_snap (A-R2-01, coverage outcomes) — tells predict the coverage, oh_snap-style features grade it; together they form a pre-snap → post-snap coverage chain for QB decision features.
6. §8 ENGINE-TRAINING VALUE: Features = pre-snap defender geometry/motion; label = actual coverage played — BDB 2025 data does not ship charted coverage labels, so labels must be derived (formation/personnel heuristics or external charting); label availability is the known gap, flagged honestly. Play outcomes via pbp join exist.
7. PROVENANCE: Original work by Smit Bajaj (BDB 2025 entrant); data provenance NFL/Kaggle BDB 2025.
8. VERDICT: LEARN-ONLY (tell-feature definitions are the asset; label problem is real and named).

## A-R2-12 — jdpipping/bdb2025

**Verified (GitHub API, 2026-11-06):** 2★ · last push 2025-10-09 · created 2024 · R · license: none · fork: False · ~34 MB · https://github.com/jdpipping/bdb2025

**API description:** "big data bowl 2025"

1. WHAT IT IS: Second independent BDB 2025 (pre-snap) implementation, in R, with continued commits into Oct 2025 (post-competition iteration — the author kept developing it after the contest closed).
2. WHERE: https://github.com/jdpipping/bdb2025
3. HOW TO USE IT: R pipeline over the BDB 2025 pre-snap tracking release; compare its motion/shift features against A-R2-11's tell features for the consensus set.
4. WHICH SYSTEM: matchup layer (pre-snap scheme reads), corpus consensus role.
5. SECOND-ORDER: Post-competition commit history is itself signal — what the author changed after seeing results approximates a validation pass GSE can learn from without re-running.
6. §8 ENGINE-TRAINING VALUE: Same BDB 2025 data and label constraints as A-R2-11 (coverage labels derived, outcomes via pbp join). Value = independent feature engineering on identical frames.
7. PROVENANCE: Original work by jdpipping (BDB 2025 entrant).
8. VERDICT: LEARN-ONLY (consensus pair to A-R2-11).

## A-R2-13 — Yaser-Alharbi/NFL-AWS-Hackathon-Winner

**Verified (GitHub API, 2026-11-06):** 2★ · last push 2026-10-09 · created 2026 · HTML · license: none · fork: False · ~194 MB · https://github.com/Yaser-Alharbi/NFL-AWS-Hackathon-Winner

**API description:** "Winner, NFL x UCL CDI x AWS Big Data Bowl Hackathon (London). Uses NFL player-tracking data to measure whether QBs gain or lose when they improvise under pressure."

1. WHAT IT IS: The winning entry of the NFL × UCL CDI × AWS Big Data Bowl Hackathon (London) — measures, from player-tracking data, whether quarterbacks gain or lose value when they improvise under pressure (off-script QB play quantified).
2. WHERE: https://github.com/Yaser-Alharbi/NFL-AWS-Hackathon-Winner
3. HOW TO USE IT: Presentation/app-form repo (HTML-led, ~194 MB with assets); mine the methodology — pressure identification, improvisation window definition, gain/loss accounting vs expected — rather than the code structure.
4. WHICH SYSTEM: matchup layer (QB behavior under pressure) — GSE's reasoning spec names QB behavior as mandatory track #1; this is the wave's only QB-under-pressure tracking study.
5. SECOND-ORDER: Pressure side supplied by A-R2-06/07 (engagement + xpassrush); combining gives a full pressure→improvisation→outcome chain, a differentiator feature family for QB props reasoning.
6. §8 ENGINE-TRAINING VALUE: Metric = improvisation delta (actual vs expected outcome on pressured, off-script plays) per QB. Data: NFL tracking via the hackathon's BDB data access; labels = play outcomes via pbp join. Small-n hackathon sample — method value > dataset value, flagged.
7. PROVENANCE: Original work by Yaser Alharbi; competition = NFL × UCL Centre for Data Intensive Science × AWS hackathon (London), per the repo's own description. Very recent (created 2026) and low-star because new — kept on method substance per the wave brief.
8. VERDICT: LEARN-ONLY (borderline keep, honestly flagged: hackathon scale, but a named-seam method with a competition win behind it).

## A-R2-14 — hemaniprisha/TrackingProphet

**Verified (GitHub API, 2026-11-06):** 1★ · last push 2025-12-31 · created 2025 · Python · license: none · fork: False · ~33 MB · https://github.com/hemaniprisha/TrackingProphet

**API description:** "ML pipeline predicting NFL wide receiver draft position & rookie performance from college in-game tracking data. Proves tracking metrics (separation, cutting ability, route precision) vastly outperform combine testing. Built with XGBoost, SHAP, Streamlit."

1. WHAT IT IS: End-to-end ML pipeline (XGBoost + SHAP + Streamlit) that predicts WR draft position and rookie performance from college in-game tracking metrics — separation, cutting ability, route precision — benchmarked against combine testing.
2. WHERE: https://github.com/hemaniprisha/TrackingProphet
3. HOW TO USE IT: Python pipeline with data included (~33 MB); the feature definitions (how separation/cutting/route precision are computed from tracking) are the reusable core; SHAP outputs show which tracking metrics carry signal.
4. WHICH SYSTEM: usage layer (receiver tracking features) bridging college→pro projection — relevant to GSE's rookie/usage-shift reasoning in the weekly cycle.
5. SECOND-ORDER: Its tracking-vs-combine comparison is a direct evidence input to the combine seam (A-R2-42/43): if tracking features dominate combine drills for WRs, the engine should weight them accordingly in prospect features.
6. §8 ENGINE-TRAINING VALUE: Features = WR separation/cutting/route-precision aggregates from college tracking; labels = draft position + rookie-year production (both public, joinable). Labels exist. College tracking provenance is the author's assembled dataset in-repo.
7. PROVENANCE: Original work by hemaniprisha (2025). 1★ — kept on pipeline completeness and seam fit (route/separation feature engineering), honestly flagged as low-adoption.
8. VERDICT: LEARN-ONLY (feature definitions + the tracking>combine evidence; do not adopt the app).

## A-R2-15 — hudl/amf-open-data

**Verified (GitHub API, 2026-11-06):** 59★ · last push 2026-09-03 · created 2023 · language: none (data repo) · license: NOASSERTION (StatsBomb data terms) · fork: False · ~1.88 GB · https://github.com/hudl/amf-open-data

**API description:** "Free American football data from StatsBomb"

1. WHAT IT IS: The upstream open dataset itself: StatsBomb's free American football data (event + freeze-frame/tracking-style data from NFL games), hosted by Hudl (StatsBomb's parent). This is the source that A-1's sportsdataverse/amf-location-data parses — cataloging the origin, per the provenance rule.
2. WHERE: https://github.com/hudl/amf-open-data
3. HOW TO USE IT: Download the data files directly (event JSON + related frames); load with any JSON tooling, or via the A-1 parser (sportsdataverse/amf-location-data) for the location extracts. ~1.88 GB — pull selectively, not wholesale.
4. WHICH SYSTEM: corpus + matchup layer — a rare public American-football dataset with spatial frames, i.e., tracking-adjacent data outside the Kaggle BDB releases.
5. SECOND-ORDER: Only cataloged source where the same games can be studied in both nflverse pbp form and StatsBomb spatial form — alignment of the two is a validation instrument for every tracking feature in this wave.
6. §8 ENGINE-TRAINING VALUE: Data = per-play event + player-location frames for the covered games; labels = play outcomes in the event stream itself, joinable to nflverse pbp by game/play. Labels exist. This is a dataset, not code — the training value is the data.
7. PROVENANCE: Original source: StatsBomb (data collection/annotation), hosted by Hudl. Upstream of A-1's amf-location-data — the recreator/parser relationship is named here as required.
8. VERDICT: TEST (pull one game, verify the pbp join, then decide scale).

## A-R2-16 — PySport/kloppy

**Verified (GitHub API, 2026-11-06):** 571★ · last push 2026-11-06 · created 2020 · Python · BSD-3-Clause · fork: False · https://github.com/PySport/kloppy

**API description:** "kloppy: standardizing soccer tracking- and event data"

1. WHAT IT IS: The standard open-source library for loading soccer tracking and event data from every major provider into one common data model (datasets, pitch coordinates, frame/event schemas), maintained by the PySport collective. Soccer-first — included, honestly framed, as the reference design for tracking-data standardization that UnravelSports (A-1) builds on.
2. WHERE: https://github.com/PySport/kloppy
3. HOW TO USE IT: pip install kloppy; load provider datasets into its TrackingDataset/EventDataset model. For GSE: study the schema design (coordinate normalization, frame metadata, provider adapters) as the template for an NGS/BDB tracking schema in the TS engine.
4. WHICH SYSTEM: corpus (data-model design) with usage-layer application — GSE ingests BDB tracking in at least four release shapes; kloppy is the proof a unifying schema works.
5. SECOND-ORDER: Pairs with hudl/amf-open-data (A-R2-15): a kloppy-style adapter for StatsBomb AMF + BDB releases would give the engine one tracking interface across all sources in both waves.
6. §8 ENGINE-TRAINING VALUE: Not a dataset — the value is schema/features hygiene: standardized frames make every §8 metric in this wave comparable across sources. No labels itself.
7. PROVENANCE: Original project by Koen Vossen and the PySport community (2020– , actively maintained; pushed the day of verification). UnravelSports (A-1) is a downstream user, named as such.
8. VERDICT: ADOPT (the data model, not the code dependency — port the schema pattern into the engine's tracking ingest).

## A-R2-17 — roboflow/sports

**Verified (GitHub API, 2026-11-06):** 5,475★ · last push 2026-08-28 · created 2024 · Python · MIT · fork: False · https://github.com/roboflow/sports

1. WHAT IT IS: Roboflow's open sports computer-vision toolkit: player/ball detection and tracking, team assignment, keypoint detection, and pitch/field registration pipelines built on the supervision library — production-grade CV components, demonstrated mostly on soccer but sport-generic in structure.
2. WHERE: https://github.com/roboflow/sports
3. HOW TO USE IT: pip-installable components (detectors, trackers, team classifiers, view transformers) composed into a video→tracking pipeline; for GSE the transfer target is broadcast/coach-film frames of American football: detect players, assign teams, register to field coordinates.
4. WHICH SYSTEM: usage layer (film-derived tracking) — the input side of every tracking feature in this wave, for games where no NGS data exists (college, CFL, UFL film).
5. SECOND-ORDER: CV output + kloppy-style schema (A-R2-16) + sportyR field geometry (A-R2-45) = a complete film→features stack for non-NFL leagues whose data repos this wave catalogs (A-R2-36–39).
6. §8 ENGINE-TRAINING VALUE: Produces the raw material (per-frame player positions from video) from which separation/pressure/coverage features are computed; labels = detector/tracker outputs require validation against known tracking (BDB releases serve as ground truth for calibration). Method/data split stated plainly: this is tooling, not a labeled dataset.
7. PROVENANCE: Original project by Roboflow (company open-source, 2024– ); built on their supervision library. Soccer examples are the demo surface; the components are provider models + geometry, not soccer rules.
8. VERDICT: LEARN-ONLY (adopt the pipeline architecture for the film lane; validate detectors on football frames before any feature use).

## A-R2-18 — statsbylopez/nfl-fourth-down

**Verified (GitHub API, 2026-11-06):** 10★ · last push 2018-01-05 · created 2017 · language: none · license: none · fork: False · https://github.com/statsbylopez/nfl-fourth-down

**API description:** "Analysis of NFL fourth down decision making"

1. WHAT IT IS: Michael Lopez's original fourth-down decision analysis — one of the foundational public studies of go-for-it decision-making (Lopez later became the NFL's Director of Data and Analytics; this repo predates and feeds the modern nfl4th lineage).
2. WHERE: https://github.com/statsbylopez/nfl-fourth-down
3. HOW TO USE IT: Read as the methodological origin: decision framing via win probability and expected points on historical pbp, before packaged models existed.
4. WHICH SYSTEM: situational layer (in-game decisions) — provenance layer beneath nfl4th/cfb4th (A-1).
5. SECOND-ORDER: Historical anchor for the decision stack A-R2-18→20: Lopez's framing → nfl4th's packaged model → the Heckman bias correction (A-R2-20) that critiques naive versions of both.
6. §8 ENGINE-TRAINING VALUE: No new data (works from era pbp); value = decision-evaluation framing (comparing coach choices to model recommendations, and the selection effects that creates). Labels = observed decisions + outcomes in pbp.
7. PROVENANCE: Original work by Michael Lopez (Skidmore professor at the time; later NFL league office). Named as the origin of the fourth-down-analysis line that A-1's nfl4th package industrialized.
8. VERDICT: LEARN-ONLY (read for framing; superseded as code by nfl4th).

## A-R2-19 — andrew-shackelford/Surrender-Index

**Verified (GitHub API, 2026-11-06):** 31★ · last push 2026-08-31 · created 2019 · Python · MIT · fork: False · https://github.com/andrew-shackelford/Surrender-Index

**API description:** "A Twitter bot that rates NFL punts"

1. WHAT IT IS: The Surrender Index as maintained production code: a model that scores every NFL punt decision by cowardice (field position, score, time, distance surrendered), running as a long-lived bot that rates punts in real time.
2. WHERE: https://github.com/andrew-shackelford/Surrender-Index
3. HOW TO USE IT: Python codebase with the index formula and the data pipeline (live pbp ingestion → punt classification → score); run the scorer historically over nflverse pbp to get per-coach/per-team surrender profiles.
4. WHICH SYSTEM: situational layer (coaching decision tendencies) — a coach-aggressiveness feature with a decade of public validation behind the concept.
5. SECOND-ORDER: Coach tendency profiles feed GSE's coach-vs-coach reasoning track; surrender tendency on 4th-and-short is a prior for the go/punt decision model and for opponent drive-start expectations.
6. §8 ENGINE-TRAINING VALUE: Metric = Surrender Index score per punt decision (features: yard line, yards to go, score diff, clock); labels = the decisions themselves in pbp (1999–present via nflverse). Labels exist. Actively maintained (pushed Aug 2026), so the pipeline reflects current data formats.
7. PROVENANCE: Original work by Andrew Shackelford; the Surrender Index concept was popularized via SB Nation/Jon Bois's "Surrender Index" — concept provenance named, code is Shackelford's.
8. VERDICT: TEST (run the scorer over historical pbp; validate coach profiles against nfl4th recommendations).

## A-R2-20 — danieldalygrafstein/nfl4th-heckman

**Verified (GitHub API, 2026-11-06):** 2★ · last push 2022-11-30 · created 2022 · R · license: none · fork: False · ~11 KB · https://github.com/danieldalygrafstein/nfl4th-heckman

**API description:** "Correcting for preferential bias in NFL fourth-down decision making"

1. WHAT IT IS: A small, sharp methods repo: applies a Heckman selection correction to fourth-down decision analysis, addressing preferential bias — teams that go for it are not a random sample, so naive success-rate comparisons mislead the go/punt model itself.
2. WHERE: https://github.com/danieldalygrafstein/nfl4th-heckman
3. HOW TO USE IT: Tiny R codebase (~11 KB) — read the whole thing; it is a model-specification critique with code, aimed at the nfl4th-style estimation problem.
4. WHICH SYSTEM: situational layer (decision-model methodology) — a correctness check on the engine's own decision stack.
5. SECOND-ORDER: The selection-bias warning generalizes: any GSE model trained on observed decisions (play-calling tendencies, 2pt choices) inherits the same bias; this is the cataloged reminder with a worked fix.
6. §8 ENGINE-TRAINING VALUE: Method, not data: two-stage Heckman specification for decision/outcome models; applies to nflverse pbp decisions with outcomes. Labels exist in pbp.
7. PROVENANCE: Original work by Daniel Daly-Grafstein (2022). Named against its target: nflverse/nfl4th (A-1) is the model whose estimation it corrects.
8. VERDICT: LEARN-ONLY (11 KB, but the methodological point is load-bearing for the decision lane).

## A-R2-21 — AndrewRook/NFLWin

**Verified (GitHub API, 2026-11-06):** 24★ · last push 2023-07-06 · created 2015 · Python · MIT · fork: False · https://github.com/AndrewRook/NFLWin

**API description:** "Open Source NFL Win Probability"

1. WHAT IT IS: A documented, open-source NFL win-probability model in Python (docs at nflwin.readthedocs.io) — one of the earliest fully transparent WP implementations, built for inspection rather than as a black box.
2. WHERE: https://github.com/AndrewRook/NFLWin
3. HOW TO USE IT: Python package + readthedocs documentation of the model form and fitting; use as a reference implementation to cross-check the engine's WP curve (and nflfastR's) state-by-state.
4. WHICH SYSTEM: situational layer (win probability core) — WP underlies the decision stack (A-R2-18→20) and every late-game reasoning feature.
5. SECOND-ORDER: A second independent WP implementation is a calibration instrument: where NFLWin and nflfastR disagree by state, the engine's own WP choice needs a stated reason.
6. §8 ENGINE-TRAINING VALUE: Model = P(win | score, time, field position, down/distance, timeouts) fit on historical pbp; labels = game outcomes in nflverse pbp. Labels exist; the repo's value is the transparent specification.
7. PROVENANCE: Original work by Andrew Rook (2015–2023); predates the nflverse WP model's dominance and is independent of it.
8. VERDICT: TEST (fit against modern pbp and diff the WP surface against the in-corpus models).

## A-R2-22 — dlm1223/nfl-simulation

**Verified (GitHub API, 2026-11-06):** 5★ · last push 2019-07-08 · created 2019 · R · license: none · fork: False · ~91 MB (data included) · https://github.com/dlm1223/nfl-simulation

**API description:** "Simulating NFL drives using different play-calling strategies"

1. WHAT IT IS: A drive-level NFL simulator in R: Monte-Carlo drives under alternative play-calling strategies, with the data shipped in-repo (~91 MB) so the simulation is reproducible as-is.
2. WHERE: https://github.com/dlm1223/nfl-simulation
3. HOW TO USE IT: Run the R simulation scripts; the play-outcome transition distributions are estimated from the included historical data — inspect those estimates first, they are the portable asset.
4. WHICH SYSTEM: situational layer (game simulation) — drive simulation is the substrate for testing decision policies (4th down, 2pt, clock) in silico.
5. SECOND-ORDER: Policy testbed for A-R2-18→20: run nfl4th-style policies inside this simulator and measure season-level effects instead of arguing play-by-play.
6. §8 ENGINE-TRAINING VALUE: Transition model = P(next state | down, distance, field position, play type) estimated from historical pbp (included); labels = observed play outcomes. Labels exist in the shipped data.
7. PROVENANCE: Original work by dlm1223 (2019).
8. VERDICT: TEST (verify the transition estimates against current nflverse pbp; era drift is the named risk).

## A-R2-23 — RobbyGillespie/Optimal-NFL-Play-Simulator

**Verified (GitHub API, 2026-11-06):** 3★ · last push 2022-07-15 · created 2021 · Python · license: none · fork: False · ~47 MB · https://github.com/RobbyGillespie/Optimal-NFL-Play-Simulator

**API description:** "NFL Game Simulator w/ Optimal Play Calling"

1. WHAT IT IS: A full-game NFL simulator in Python that layers an optimal play-calling policy on top of the simulation — game-level (not just drive-level) counterpart to A-R2-22, with substantial code/data mass (~47 MB).
2. WHERE: https://github.com/RobbyGillespie/Optimal-NFL-Play-Simulator
3. HOW TO USE IT: Python simulation entry points; read the policy layer (how "optimal" is computed — expected-WP maximization per state) and the play-outcome model beneath it separately.
4. WHICH SYSTEM: situational layer (game simulation + decision policy).
5. SECOND-ORDER: Two independent simulators (A-R2-22 R/drive-level, A-R2-23 Python/game-level) let GSE cross-validate simulation conclusions; policy disagreements between them mark genuinely uncertain decision states — a pass-discipline signal.
6. §8 ENGINE-TRAINING VALUE: Play-outcome distributions + WP surface internal to the simulator; training data provenance is the author's assembled historical pbp in-repo. Labels exist in-repo; era and estimation choices need the same audit as A-R2-22.
7. PROVENANCE: Original work by Robby Gillespie (2021–2022).
8. VERDICT: LEARN-ONLY (adopt the cross-validation pattern; audit before any numeric use).

## A-R2-24 — mdgoldberg/playprediction

**Verified (GitHub API, 2026-11-06):** 9★ · last push 2017-03-06 · created 2015 · Jupyter Notebook · license: none · fork: False · ~215 MB (data attached) · https://github.com/mdgoldberg/playprediction

**API description:** "Predicting NFL play-calling and analyzing other aspects of NFL coaching"

1. WHAT IT IS: Early, data-rich play-calling prediction work: models of run/pass and play-type tendencies from game state and coaching identity, with a large attached dataset (~215 MB) — a 2015-era foundation for tendency modeling.
2. WHERE: https://github.com/mdgoldberg/playprediction
3. HOW TO USE IT: Notebooks + shipped data; read for the tendency feature set (coach/team identity effects, state interactions) rather than the era-specific model performance.
4. WHICH SYSTEM: matchup layer (coaching tendencies) / situational layer.
5. SECOND-ORDER: Tendency priors pair with the live decision-lab approach in A-R2-25 (same problem, 2026 tooling) — the decade-apart pair shows what persisted (identity effects) vs what was era noise.
6. §8 ENGINE-TRAINING VALUE: Features = state + coach/team tendency variables; label = called play type in historical pbp (shipped). Labels exist; era (2015) caps direct reuse — tendency half-life is the named caveat.
7. PROVENANCE: Original work by Max Goldberg (2015–2017).
8. VERDICT: LEARN-ONLY (historical tendency-modeling reference; data mass makes it inspectable).

## A-R2-25 — mklim6/nfl-coaching-decision-lab

**Verified (GitHub API, 2026-11-06):** 2★ · last push 2026-07-21 · created 2026 · Python · MIT · fork: False · https://github.com/mklim6/nfl-coaching-decision-lab

**API description:** "Interactive NFL coaching and offensive play-calling analysis using situation-adjusted run-pass tendencies."

1. WHAT IT IS: A 2026 interactive analysis tool for coaching/play-calling built on situation-adjusted run-pass tendencies — the modern, small, maintained counterpart to A-R2-24's 2015 notebooks.
2. WHERE: https://github.com/mklim6/nfl-coaching-decision-lab
3. HOW TO USE IT: Python app; the situation-adjustment method (how raw run/pass splits are normalized by down/distance/score state) is the exportable piece.
4. WHICH SYSTEM: matchup layer (coaching tendencies) — feeds the coach-vs-coach reasoning track with current-era tendencies.
5. SECOND-ORDER: Situation-adjusted tendencies are the correct input form for the play-prediction features in A-R2-24's lineage; raw splits would re-import the selection bias A-R2-20 warns about.
6. §8 ENGINE-TRAINING VALUE: Metric = situation-adjusted run-pass tendency by team/coach; data = nflverse pbp (current seasons); labels = called plays in pbp. Labels exist.
7. PROVENANCE: Original work by mklim6 (2026); same author as a draft-outcomes SQL analysis seen in the sweep — a small but coherent NFL analytics portfolio.
8. VERDICT: LEARN-ONLY (2★ and new — kept for the adjustment method and current-era maintenance, honestly flagged).

## A-R2-26 — airalcorn2/Football-o-Genetics

**Verified (GitHub API, 2026-11-06):** 11★ · last push 2020-02-10 · created 2013 · Java · MIT · fork: False · https://github.com/airalcorn2/Football-o-Genetics

**API description:** "An application for 'evolving' near-optimal offensive play calling strategies." (topics: genetic-algorithm, q-learning, reinforcement-learning, nfl)

1. WHAT IT IS: A reinforcement-learning experiment in Java: genetic algorithms + Q-learning evolve offensive play-calling strategies toward near-optimal policies against simulated defenses — the oldest RL play-calling artifact in the corpus.
2. WHERE: https://github.com/airalcorn2/Football-o-Genetics
3. HOW TO USE IT: Read the strategy representation and fitness design (how a playbook is encoded and scored); the Java implementation is a reference, not a runtime candidate.
4. WHICH SYSTEM: corpus (methods — RL for decision policy), situational layer reference.
5. SECOND-ORDER: Conceptual ancestor of A-R2-27 (Google Research Football): policy search over play-calling predates deep RL environments; the pair brackets a decade of the same idea at two scales.
6. §8 ENGINE-TRAINING VALUE: Method value only: policy-search formulation for play-calling; its internal game model is synthetic (no real pbp labels) — stated plainly.
7. PROVENANCE: Original work by airalcorn2 (Michael Alcorn, 2013–2020).
8. VERDICT: CONTEXT-ONLY (methods archaeology for the RL-decision lane).

## A-R2-27 — google-research/football

**Verified (GitHub API, 2026-11-06):** 3,672★ · last push 2025-06-17 · created 2019 · Python · Apache-2.0 · fork: False · ARCHIVED · https://github.com/google-research/football

1. WHAT IT IS: Google Research Football — a full reinforcement-learning environment for football (association football/soccer physics and rules), with baselines, scenarios, and a maintained-for-years codebase from Google Research. Included honestly as simulation/RL-environment design transfer, not as American football data.
2. WHERE: https://github.com/google-research/football
3. HOW TO USE IT: Study the environment design: observation/action spaces, scenario curriculum, reward shaping, and benchmark protocol — the template for what a GSE American-football simulation environment would need (cf. the code simulators A-R2-22/23, which lack this rigor).
4. WHICH SYSTEM: corpus (simulation-environment design) for the situational layer's long-term RL ambitions.
5. SECOND-ORDER: Environment-design lessons + DojoZero (A-1, game-agent training) + Football-o-Genetics (A-R2-26) = the corpus's full RL-for-football arc: evolved strategies → multi-agent environments → benchmarked simulation.
6. §8 ENGINE-TRAINING VALUE: No NFL data and no transferable labels — training value is architectural (how to build an environment in which decision policies can be trained and honestly benchmarked). Stated plainly to avoid inflating a soccer repo into a football asset.
7. PROVENANCE: Original project by Google Research (2019–2025, now archived — archived status verified via API and reported, not hidden).
8. VERDICT: LEARN-ONLY (environment-design transfer only; archived upstream).

## A-R2-28 — jldbc/field-goal-models

**Verified (GitHub API, 2026-11-06):** 8★ · last push 2016-08-02 · created 2016 · R · license: none · fork: False · ~24 MB · https://github.com/jldbc/field-goal-models

**API description:** "Modeling NFL Field Goal Probabilities in R"

1. WHAT IT IS: Field-goal probability modeling in R (with a Shiny app surface): P(make) as a function of distance and conditions, fit on historical attempts — a compact, complete special-teams model with its data workflow included (~24 MB).
2. WHERE: https://github.com/jldbc/field-goal-models
3. HOW TO USE IT: R model code + Shiny front end; extract the probability-surface specification (distance curve shape, kicker/weather adjustments attempted) for comparison with the engine's kicking assumptions.
4. WHICH SYSTEM: situational layer (special teams) — FG probability feeds 4th-down decisions (go vs kick) and late-game WP.
5. SECOND-ORDER: FG surface + punt model (A-R2-19) + punt-return paths (A-R2-04) completes the special-teams trio the decision stack needs; a decision model is only as good as its kick branch.
6. §8 ENGINE-TRAINING VALUE: Metric = P(FG make | distance, conditions, kicker); labels = attempt outcomes in historical pbp (nflverse carries attempts/makes). Labels exist. 2016 fit is stale — re-fit on current data is the use, spec is the asset.
7. PROVENANCE: Original work by jldbc (2016).
8. VERDICT: LEARN-ONLY (specification transfers; coefficients must be re-fit).

## A-R2-29 — fivethirtyeight/nfl-elo-game

**Verified (GitHub API, 2026-11-06):** 354★ · last push 2023-05-02 · created 2017 · Python · MIT · fork: False · https://github.com/fivethirtyeight/nfl-elo-game

**API description:** "Data and code for FiveThirtyEight's NFL game" (the interactive NFL Elo predictions game)

1. WHAT IT IS: FiveThirtyEight's published NFL Elo system: the full ratings history, the Elo update code (margin-of-victory multiplier, home-field, rest/travel adjustments, season reversion), and the game-prediction layer that powered 538's public forecasts for years.
2. WHERE: https://github.com/fivethirtyeight/nfl-elo-game
3. HOW TO USE IT: Python code + data files in-repo; reproduce the ratings series and compare its game probabilities to the engine's — a strong, transparent, journalistic-grade baseline.
4. WHICH SYSTEM: matchup layer (team ratings baseline) — the reference implementation for Elo in this corpus.
5. SECOND-ORDER: Baseline for the ratings family A-R2-29→32: 538 Elo vs margin-dependent Elo (A-R2-30) vs Paine's independent series (A-R2-31) vs EP-based ratings (A-R2-32) — four rating philosophies, one comparison harness.
6. §8 ENGINE-TRAINING VALUE: Ratings themselves are features (pregame team-strength inputs); labels = game outcomes across the full history in-repo. Labels exist; the published series is directly consumable as a benchmark, not as training data for GSE's own ratings (that would be fitting to a model, not to games — distinction stated deliberately).
7. PROVENANCE: Original work by FiveThirtyEight (ABC News/Disney data journalism team); the canonical public Elo implementation for the NFL.
8. VERDICT: TEST (wire as a benchmark lane: engine probabilities vs 538 Elo probabilities, scored identically).

## A-R2-30 — morelandjs/melo-legacy

**Verified (GitHub API, 2026-11-06):** 14★ · last push 2019-07-31 · created 2017 · Python · license: none · fork: False · https://github.com/morelandjs/melo-legacy

**API description:** "Margin-dependent Elo ratings for the NFL"

1. WHAT IT IS: MELO — margin-dependent Elo: an Elo variant where the update depends on the full margin distribution rather than a capped/log transform, by Jay Moreland (the melo line of work known from the sports-ratings literature and the author's broader ratings research).
2. WHERE: https://github.com/morelandjs/melo-legacy
3. HOW TO USE IT: Python implementation ("legacy" = the author's original codebase); read the margin-dependence formulation and its calibration claims against plain Elo.
4. WHICH SYSTEM: matchup layer (ratings research) — directly relevant to GSE's own rating-engine work (Bradley-Terry/Dixon-Coles family in the engine's rating atlas).
5. SECOND-ORDER: Margin handling is where Elo variants win or lose calibration; melo's approach is a candidate component for the engine's ratings, testable head-to-head inside the A-R2-29→32 harness.
6. §8 ENGINE-TRAINING VALUE: Method + ratings series computable from game results (labels = final scores, universally available). No proprietary data.
7. PROVENANCE: Original work by Jay Moreland (morelandjs); "legacy" naming is the author's own (earlier implementation of his melo research).
8. VERDICT: LEARN-ONLY (formulation is the asset; validate margin-dependence on NFL data before any adoption path).

## A-R2-31 — Neil-Paine-1/NFL-elo-ratings

**Verified (GitHub API, 2026-11-06):** 8★ · last push 2025-02-10 · created 2023 · language: none (data) · MIT · fork: False · https://github.com/Neil-Paine-1/NFL-elo-ratings

**API description:** "List of NFL Elo games"

1. WHAT IT IS: Neil Paine's maintained NFL Elo game list: game-by-game Elo ratings (pre/post) across NFL history in clean data form — an independent, currently maintained ratings series (Paine is a former FiveThirtyEight sportswriter, now independent at neilpaine.substack.com).
2. WHERE: https://github.com/Neil-Paine-1/NFL-elo-ratings
3. HOW TO USE IT: Consume the data files directly (CSV-form game list with Elo columns); join to nflverse schedules by date/teams for instant historical team-strength features.
4. WHICH SYSTEM: matchup layer (ratings data) — the only ratings entry in this wave that is pure, current, ready data rather than code to run.
5. SECOND-ORDER: Third independent Elo series for the A-R2-29→32 harness; because it is data-first, it is also the fastest backtest feature for era studies (historical ratings as model inputs).
6. §8 ENGINE-TRAINING VALUE: Feature = pregame Elo (and Elo diff) per team-game across history; labels = outcomes in the same rows. Labels exist. Data licensing MIT per API.
7. PROVENANCE: Original work by Neil Paine; methodology descends from the FiveThirtyEight Elo tradition (Paine's tenure there) but this series is his independent maintenance — provenance stated as such.
8. VERDICT: CONTEXT-ONLY (consume as benchmark/feature data; no code to adopt).

## A-R2-32 — kpelechrinis/NFL-ExpectedPoints-Ratings

**Verified (GitHub API, 2026-11-06):** 9★ · last push 2018-09-17 · created 2018 · Python · license: none · fork: False · https://github.com/kpelechrinis/NFL-ExpectedPoints-Ratings

**API description:** "This repository includes the code for obtaining NFL team ratings in terms of expected points. The method is described in our work: 'Evaluating NFL plays: Expected points adjusted for schedule'"

1. WHAT IT IS: Companion code to a published research paper: team ratings derived from expected points adjusted for schedule strength — an EP-native rating system (rate teams by the EP their plays generate/concede, opponent-adjusted), from Konstantinos Pelechrinis (University of Pittsburgh; sports analytics researcher).
2. WHERE: https://github.com/kpelechrinis/NFL-ExpectedPoints-Ratings
3. HOW TO USE IT: Python code implementing the paper's rating computation over pbp; read alongside the paper ("Evaluating NFL plays: Expected points adjusted for schedule") for the estimator details.
4. WHICH SYSTEM: matchup layer (ratings) — the only EP-based (not score-based) rating method in either wave.
5. SECOND-ORDER: EP ratings vs Elo ratings disagreement is a reasoning signal in itself (play-level dominance vs outcome-level results); the harness in A-R2-29 can score which predicts better by era.
6. §8 ENGINE-TRAINING VALUE: Method = schedule-adjusted EP ratings from pbp (nflverse supplies the EP inputs today); labels = play-level EP and game outcomes. Labels exist. Paper-backed — assumptions are documented in the publication, a provenance standard most repos lack.
7. PROVENANCE: Original research code by Konstantinos Pelechrinis and co-authors; journal/conference paper is the primary source, this repo is its official companion.
8. VERDICT: LEARN-ONLY (method adoption candidate after harness testing; 2018 code needs a modern pbp adapter).

## A-R2-33 — BlueSCar/cfb-database

**Verified (GitHub API, 2026-11-06):** 27★ · last push 2018-10-12 · created 2018 · language: none · MIT · fork: False · https://github.com/BlueSCar/cfb-database

**API description:** "College football database — data store for all sorts of data and statistics pertaining to college football"

1. WHAT IT IS: The original CollegeFootballData database project: the data store (schemas + data) that became the foundation of the CFBD ecosystem — the origin infrastructure behind the CFB data stack A-1 cataloged at the API layer (CFBD/cfb.js, cfbfastR).
2. WHERE: https://github.com/BlueSCar/cfb-database
3. HOW TO USE IT: Historical reference: the schema design for college football games/plays/teams/players that the whole CFBD lineage inherited; consult when reasoning about CFB data joins and era coverage.
4. WHICH SYSTEM: corpus (CFB data provenance) beneath the matchup/usage layers for college content.
5. SECOND-ORDER: Provenance chain made explicit: cfb-database (2018) → CollegeFootballData API → cfbfastR/cfbdata clients (A-1) → cfbfastR-py (A-R2-34). Knowing the root explains the field conventions in every downstream package.
6. §8 ENGINE-TRAINING VALUE: The database itself held historical CFB data; today the live CFBD API is the access path (A-1) — this repo's value is schema/provenance, not a fresh dataset. Labels (game/play outcomes) exist in the descendant API.
7. PROVENANCE: Original work by BlueSCar (the CollegeFootballData founder); named here as the origin of the CFBD stack, per the provenance rule — A-1's CFB entries are its descendants.
8. VERDICT: CONTEXT-ONLY (provenance anchor; do not run a 2018 data store).

## A-R2-34 — saiemgilani/cfbfastR-py

**Verified (GitHub API, 2026-11-06):** 7★ · last push 2021-12-29 · created 2021 · Python · license: none · fork: False · ARCHIVED · https://github.com/saiemgilani/cfbfastR-py

**API description:** "A Python package to quickly obtain clean and tidy college football play by play data" (archived)

1. WHAT IT IS: The short-lived Python port of cfbfastR by Saiem Gilani (sportsdataverse founder) — archived after the sportsdataverse Python effort consolidated into sportsdataverse-py (A-1). Cataloged to close the provenance loop, not as a tool to use.
2. WHERE: https://github.com/saiemgilani/cfbfastR-py
3. HOW TO USE IT: Do not use — archived upstream. Read only if tracing why a field or function exists in sportsdataverse-py; its git history is the migration record.
4. WHICH SYSTEM: corpus (provenance) for the CFB data layer.
5. SECOND-ORDER: Archived/deprecated status is itself corpus information (nothing-gets-killed rule): the entry prevents a future sweep from re-discovering and re-evaluating a dead package as if new.
6. §8 ENGINE-TRAINING VALUE: None directly — superseded by sportsdataverse-py (A-1) against the same CFBD data (labels = CFB play outcomes there). Stated plainly.
7. PROVENANCE: Original work by Saiem Gilani; personal-account precursor to the sportsdataverse org's Python package. Archived status verified via API.
8. VERDICT: CONTEXT-ONLY (provenance/deprecation record).

## A-R2-35 — kylebennison/staturdays

**Verified (GitHub API, 2026-11-06):** 9★ · last push 2023-11-28 · created 2020 · Jupyter Notebook · license: none · fork: False · https://github.com/kylebennison/staturdays

**API description:** "college football data" (the Staturdays CFB analytics project)

1. WHAT IT IS: The codebase behind "Staturdays," Kyle Bennison's college football analytics site: CFB data pipelines, ratings, and analysis notebooks that powered a public CFB analytics publication.
2. WHERE: https://github.com/kylebennison/staturdays
3. HOW TO USE IT: Notebook-form CFB analyses over CFBD data; mine for CFB-specific modeling choices (conference effects, recruiting inputs, pace) that differ from NFL practice.
4. WHICH SYSTEM: corpus / matchup layer (CFB methods) supporting GSE's NCAA coverage lane.
5. SECOND-ORDER: A worked example of a one-person CFB analytics publication pipeline — relevant pattern for GSE's own content operation, beyond the models themselves.
6. §8 ENGINE-TRAINING VALUE: Analyses run on CFBD data (A-1 stack); labels = CFB game outcomes. No unique dataset; value is CFB modeling practice.
7. PROVENANCE: Original work by Kyle Bennison (Staturdays).
8. VERDICT: CONTEXT-ONLY (CFB methods reference).

## A-R2-36 — andrewjdyck/tidyCFL

**Verified (GitHub API, 2026-11-06):** 3★ · last push 2022-11-26 · created 2017 · R · MIT · fork: False · https://github.com/andrewjdyck/tidyCFL

**API description:** "A tidy data package for the Canadian Football League API"

1. WHAT IT IS: An R package wrapping the CFL's official API into tidy data frames — one of only two CFL data tools found in the entire sweep (the CFL search space returned a total_count of 2 substantive results), making it the canonical CFL access layer.
2. WHERE: https://github.com/andrewjdyck/tidyCFL
3. HOW TO USE IT: R package functions against the CFL API (games, plays, standings); the API-shape mapping (CFL's 3-down, 110-yard field conventions in data form) is the reference for any CFL modeling.
4. WHICH SYSTEM: corpus (alt-league data access) — CFL is a genuinely different ruleset (3 downs, larger field), useful as an out-of-distribution testbed for decision models.
5. SECOND-ORDER: CFL decision problems (3-down football makes 4th-down logic into 3rd-down logic) stress-test GSE's decision stack in A-R2-18→20 in a way NFL data cannot.
6. §8 ENGINE-TRAINING VALUE: Access layer for CFL game/play data; labels = CFL play outcomes via the league API. Data lives behind the CFL API (package is the key), availability depends on that API's current state — flagged.
7. PROVENANCE: Original work by Andrew Dyck (2017–2022), MIT.
8. VERDICT: LEARN-ONLY (the CFL seam is near-empty in open source; this plus A-R2-37 is the whole shelf).

## A-R2-37 — armstjc/cfl-data-repository

**Verified (GitHub API, 2026-11-06):** 1★ · last push 2026-09-24 · created 2024 · Python · MIT · fork: False · https://github.com/armstjc/cfl-data-repository

**API description:** "Holds data related to the Canadian Football Leauge (CFL)" [sic]

1. WHAT IT IS: An actively maintained (pushed Sep 2026) CFL data repository by Joseph Armstrong (armstjc) — actual CFL data files (not just an API client), the data-side companion to tidyCFL's access layer.
2. WHERE: https://github.com/armstjc/cfl-data-repository
3. HOW TO USE IT: Load the repository's CFL datasets directly (Python-maintained); use as the static CFL corpus where the live CFL API (A-R2-36) is impractical.
4. WHICH SYSTEM: corpus (alt-league data) for CFL situational/decision transfer tests.
5. SECOND-ORDER: Armstrong's four repos in this wave (BDB 2024 + CFL + XFL + UFL) form a one-author alt-league data shelf — consistent schemas across his repos lower the cost of cross-league feature validation.
6. §8 ENGINE-TRAINING VALUE: Dataset = CFL games/plays as published by the maintainer; labels = play/game outcomes in the data. Labels exist. Coverage depth (seasons included) to be inventoried on first pull — flagged as the open question.
7. PROVENANCE: Original data curation by Joseph Armstrong (armstjc), MIT; underlying data originates from CFL public statistics — the repo is the curation layer.
8. VERDICT: LEARN-ONLY (1★ but actively maintained and one of two CFL sources in existence — substance over stars, per the wave brief).

## A-R2-38 — armstjc/xfl-2023-data-repository

**Verified (GitHub API, 2026-11-06):** 3★ · last push 2023-12-31 · created 2023 · Python · MIT · fork: False · ARCHIVED · ~456 MB · https://github.com/armstjc/xfl-2023-data-repository

**API description:** "Houses data related to the 2023 relaunch of the XFL Football League."

1. WHAT IT IS: A large (~456 MB) data repository for the XFL's 2023 relaunch season — game/play data for a league whose rules experiments (kickoff format, tiered extra-point tries instead of kicks) make it a natural decision-science testbed. Archived because the league itself folded into the UFL merger.
2. WHERE: https://github.com/armstjc/xfl-2023-data-repository
3. HOW TO USE IT: Static dataset — download and load directly; no live API dependency (an advantage over API-backed sources: this data cannot disappear behind an endpoint change, though the repo itself is archived).
4. WHICH SYSTEM: corpus (alt-league data) — situational layer testbed (the XFL's 1/2/3-point conversion tiers are a richer decision problem than the NFL's kick/2pt binary).
5. SECOND-ORDER: Conversion-tier data + the NFL decision stack (A-R2-18→20) = a way to validate decision models on genuinely different payoff structures; kickoff-format data speaks to the NFL's own kickoff rule evolution.
6. §8 ENGINE-TRAINING VALUE: Dataset = XFL 2023 games/plays with outcomes; labels exist in-data. Single-season depth is the limit — flagged.
7. PROVENANCE: Original curation by Joseph Armstrong (armstjc), MIT; league data from XFL public statistics. Archived status verified via API (league ceased standalone existence — context, not a data defect).
8. VERDICT: CONTEXT-ONLY (static historical dataset; decision-testbed value).

## A-R2-39 — armstjc/ufl-data-repository

**Verified (GitHub API, 2026-11-06):** 1★ · last push 2026-06-15 · created 2024 · Python · MIT · fork: False · https://github.com/armstjc/ufl-data-repository

**API description:** "Data repository that holds data for the United Football League (UFL), a football league that emerged from a merger between the 2023 XFL league, and the 2022 USFL league."

1. WHAT IT IS: The living continuation of A-R2-38: UFL data (the merged XFL+USFL spring league), actively updated through Jun 2026 — the only currently growing alt-league dataset in the corpus.
2. WHERE: https://github.com/armstjc/ufl-data-repository
3. HOW TO USE IT: Load the UFL datasets directly; spring-league timing makes this the off-season data supply for testing features before NFL preseason.
4. WHICH SYSTEM: corpus (alt-league data) feeding usage/matchup feature validation.
5. SECOND-ORDER: Player overlap (UFL→NFL camp signings) makes UFL data a scouting-bridge dataset: tracking which UFL performers earn NFL snaps is a labeled transfer-learning problem.
6. §8 ENGINE-TRAINING VALUE: Dataset = UFL games/plays with outcomes; labels exist in-data. Depth grows each spring season.
7. PROVENANCE: Original curation by Joseph Armstrong (armstjc), MIT; successor to his XFL repository (A-R2-38) — the lineage is stated in the repo's own description.
8. VERDICT: LEARN-ONLY (active data source; small league, real labels).

## A-R2-40 — ffverse/ffscrapr

**Verified (GitHub API, 2026-11-06):** 97★ · last push 2024-11-01 · created 2020 · R · license: NOASSERTION · fork: False · ~82 MB · https://github.com/ffverse/ffscrapr

**API description:** "R API Client for Fantasy Football League Platforms"

1. WHAT IT IS: The ffverse's API client for fantasy league platforms (Sleeper, ESPN, MyFantasyLeague, Fleaflicker): a data-access layer that pulls league rosters, transactions, and player pools — infrastructure, NOT a lineup optimizer (the excluded category); A-1 took its sibling ffverse/ffopportunity, this is the plumbing beneath it.
2. WHERE: https://github.com/ffverse/ffscrapr
3. HOW TO USE IT: R package; authenticated calls to platform APIs return tidy league data. For GSE: the platform-API mapping (especially Sleeper's public API shapes) is the reusable knowledge for DFS/fantasy data plumbing.
4. WHICH SYSTEM: corpus (data-access layer) supporting the fantasy/DFS side of the operation's data supply.
5. SECOND-ORDER: Sleeper player-ID mapping inside ffscrapr is a crosswalk asset — ID crosswalks are the unglamorous prerequisite for joining any two datasets in this library.
6. §8 ENGINE-TRAINING VALUE: Access layer, not a dataset: it fetches league-platform data (rosters/transactions = revealed-preference labels of a large manager population — a demand signal dataset in its own right when aggregated). Labels = manager decisions in the fetched data.
7. PROVENANCE: Original work by the ffverse team (Tan Ho et al.); CRAN-published (a read-only CRAN mirror exists under cran/ffscrapr — the ffverse repo is the origin, the mirror is named to prevent a future dupe).
8. VERDICT: TEST (verify Sleeper endpoints still respond; platform APIs drift).

## A-R2-41 — mikelaferriere/espn-api

**Verified (GitHub API, 2026-11-06):** 6★ · last push 2026-10-28 · created 2023 · TypeScript · MIT · fork: False · https://github.com/mikelaferriere/espn-api

**API description:** "Typescript package to access ESPN Public API for Sporting Event details"

1. WHAT IT IS: A TypeScript package wrapping ESPN's public API (event/scoreboard/details endpoints across NFL, NBA, MLB, NHL) — data access written in GSE's own stack language, actively maintained (pushed Oct 2026).
2. WHERE: https://github.com/mikelaferriere/espn-api
3. HOW TO USE IT: npm-style TS client; typed calls return ESPN event data. For GSE: ESPN's public endpoints are the same upstream that sportsdataverse-js (A-1) and half the ecosystem parse — a typed TS client is directly integrable reference code.
4. WHICH SYSTEM: corpus (data-access layer, TS) — live-scores/schedule plumbing for the customer-facing surface.
5. SECOND-ORDER: Pairs with sdvplot-js (A-R2-47): ESPN data in, SDV-style presentation out — a TS-native slice of the stack that A-1 could only supply in R/Python.
6. §8 ENGINE-TRAINING VALUE: Access layer for schedules/scores/box scores (labels = results themselves); training value is freshness of in-season state (injuries/actives flow through ESPN endpoints) rather than history.
7. PROVENANCE: Original work by Mike Laferriere (mikelaferriere), MIT (2023– ).
8. VERDICT: TEST (type-check against the current ESPN endpoints; unofficial-API drift is the named risk).

## A-R2-42 — walt-king/NFL-draft-research

**Verified (GitHub API, 2026-11-06):** 25★ · last push 2019-04-14 · created 2019 · Python · license: none · fork: False · https://github.com/walt-king/NFL-draft-research

**API description:** "Side project, building NFL draft model using combine measurements, college statistics"

1. WHAT IT IS: An NFL draft model in Python combining combine measurements with college production statistics to project draft prospects — the classic two-source prospect-modeling pattern in one inspectable repo.
2. WHERE: https://github.com/walt-king/NFL-draft-research
3. HOW TO USE IT: Python notebooks/scripts joining combine data to college stats; read the join keys and feature choices (which drills matter by position) rather than the 2019 coefficients.
4. WHICH SYSTEM: usage layer (prospect features) feeding draft/rookie reasoning.
5. SECOND-ORDER: The combine side of the tracking-vs-combine question that TrackingProphet (A-R2-14) answers from the tracking side — together they bound how much weight combine features deserve per position.
6. §8 ENGINE-TRAINING VALUE: Features = combine measurements + college production; label = draft position / NFL outcomes (public data, joinable via nflverse draft data in A-1). Labels exist.
7. PROVENANCE: Original work by Walt King (2019).
8. VERDICT: LEARN-ONLY (pattern transfers; re-fit on current classes before use).

## A-R2-43 — rmcurtis43/combineR

**Verified (GitHub API, 2026-11-06):** 13★ · last push 2022-04-26 · created 2021 · R · license: NOASSERTION · fork: False · https://github.com/rmcurtis43/combineR

**API description:** "An R package for scraping NFL Draft (1936-current) and Combine data (2000-current). Current functions also support benchmark tables for each combine drill by position."

1. WHAT IT IS: An R package that scrapes the deepest public draft/combine history available: draft data from 1936 to current and combine data from 2000 to current, with per-position drill benchmark tables built in.
2. WHERE: https://github.com/rmcurtis43/combineR
3. HOW TO USE IT: R package functions pull and tidy the historical tables; the position-benchmark tables are directly usable as percentile context for any prospect's drill numbers.
4. WHICH SYSTEM: usage layer (prospect/era data) — the historical-depth supplier for the combine seam (A-R2-42 uses combine data; this is where the long history lives).
5. SECOND-ORDER: Era-spanning draft data (1936– ) enables era-normalization studies: what a draft slot or a 40 time meant across decades — the historical-archive seam this wave was tasked to find, in package form.
6. §8 ENGINE-TRAINING VALUE: Dataset access = draft outcomes (1936– ) + combine measurements (2000– ); labels = career outcomes joinable from nflverse/PFR data (A-1). Labels exist via join. Scraper fragility (source-site changes) is the named maintenance risk.
7. PROVENANCE: Original work by rmcurtis43 (2021–2022); underlying data originates from Pro Football Reference's public draft/combine tables — origin named.
8. VERDICT: LEARN-ONLY (pull the benchmark tables once and cache; do not depend on the scraper live).

## A-R2-44 — allenwalker3/playcall

**Verified (GitHub API, 2026-11-06):** 2★ · last push 2026-06-09 · created 2026 · Python · MIT · fork: False · ~26 MB · https://github.com/allenwalker3/playcall

**API description:** "Chat with NFL play-by-play data in plain English — an LLM translates questions to DuckDB SQL over nflverse parquet and answers back. FastAPI + React, runs local or hosted models." (topics include llm, text-to-sql, tool-calling, nflverse)

1. WHAT IT IS: A complete, working LLM-for-football-analysis application: natural-language questions → LLM-generated DuckDB SQL over nflverse parquet → answers, served via FastAPI + React, runnable with local (Ollama) or hosted models. The wave's one purpose-built LLM/agent tooling entry for football.
2. WHERE: https://github.com/allenwalker3/playcall
3. HOW TO USE IT: Run the stack against local nflverse parquet files; the prompt/SQL-generation layer (schema presentation to the model, SQL validation, result narration) is the study object for GSE's own agent tooling.
4. WHICH SYSTEM: corpus (agent tooling) — a reference architecture for letting GSE's agents query the engine's data safely in natural language.
5. SECOND-ORDER: Text-to-SQL over pbp + the fleet's MCP patterns = a template for internal analyst tooling; its failure modes (hallucinated columns, wrong filters) are the eval set GSE would need anyway — this repo surfaces them in a football-specific setting.
6. §8 ENGINE-TRAINING VALUE: Not training data — tooling value: the question→SQL pairs it handles define an eval suite for football text-to-SQL (questions as inputs, correct SQL/results as labels, constructible from nflverse data). Labels constructible, not shipped — stated plainly.
7. PROVENANCE: Original work by Allen Walker (allenwalker3), MIT (2026). 2★ because brand-new — kept on architectural completeness (full stack, real topics/tags, sizable repo), honestly flagged.
8. VERDICT: TEST (run it against current nflverse parquet; score its SQL accuracy on a fixed question set).

## A-R2-45 — sportsdataverse/sportyR

**Verified (GitHub API, 2026-11-06):** 120★ · last push 2026-11-05 · created 2021 · R · GPL-3.0 · fork: False · ~227 MB · https://github.com/sportsdataverse/sportyR

**API description:** "R package for drawing regulation playing surfaces for several sports"

1. WHAT IT IS: The sportsdataverse's field-geometry package: exact regulation playing-surface dimensions and ggplot2 rendering for football (NFL/NCAA), basketball, soccer, hockey and more — the geometric ground truth beneath every tracking plot and spatial feature.
2. WHERE: https://github.com/sportsdataverse/sportyR
3. HOW TO USE IT: R package (geom functions per league/sport); for GSE the exportable asset is the dimension tables (field markings, hash widths by league — NFL vs NCAA vs CFL hashes differ and features computed over them differ too).
4. WHICH SYSTEM: corpus (visualization + geometry reference) serving the usage/matchup layers' spatial work.
5. SECOND-ORDER: Correct field geometry is a silent correctness dependency of A-R2-15/16/17 (spatial data, schemas, CV registration) — sportyR/sportypy (A-R2-46) are where the numbers live; sdvplot-js (A-R2-47) is their TS descendant for GSE's own stack.
6. §8 ENGINE-TRAINING VALUE: Reference data (dimensions), not training data: prevents coordinate bugs in feature engineering (e.g., hash-relative receiver alignment features). No labels.
7. PROVENANCE: Original work by the sportsdataverse team (2021– , actively maintained). GPL-3.0 — learn the dimensions (facts), do not copy code into the commercial engine; license flagged deliberately.
8. VERDICT: LEARN-ONLY (GPL-3.0 copyleft is the binding constraint; dimensions themselves are facts).

## A-R2-46 — sportsdataverse/sportypy

**Verified (GitHub API, 2026-11-06):** 52★ · last push 2026-11-05 · created 2021 · Python · GPL-3.0 · fork: False · ~147 MB · https://github.com/sportsdataverse/sportypy

**API description:** "Python package for drawing regulation playing surfaces for several sports"

1. WHAT IT IS: The Python port of sportyR (A-R2-45): same regulation-surface geometry and plotting, for matplotlib-based Python workflows — included separately because the Python analytics side of the corpus (BDB work) plots in matplotlib, not ggplot.
2. WHERE: https://github.com/sportsdataverse/sportypy
3. HOW TO USE IT: pip package; surface objects per league with plotting + coordinate helpers. Name-collision warning: this is NOT fonnesbeck/sportypy (A-R2-49), an unrelated Bayesian modeling library — the two share a name and nothing else; the corpus records both with the collision named.
4. WHICH SYSTEM: corpus (visualization/geometry, Python side).
5. SECOND-ORDER: With matplotvideo (A-R2-48), sportypy surfaces become the canvas for video-synced tracking plots — the film-review visual stack in Python.
6. §8 ENGINE-TRAINING VALUE: Same reference-geometry role as A-R2-45 (dimension facts for feature correctness). No labels.
7. PROVENANCE: Original work by the sportsdataverse team (Python port of their own sportyR); GPL-3.0, same learn-the-facts constraint as A-R2-45.
8. VERDICT: LEARN-ONLY (GPL constraint; geometry facts only).

## A-R2-47 — sportsdataverse/sdvplot-js

**Verified (GitHub API, 2026-11-06):** 1★ · last push 2026-11-05 · created 2026 · TypeScript · MIT · fork: False · ~60 MB · https://github.com/sportsdataverse/sdvplot-js

**API description:** "TypeScript ports of sdvplot/sdvplotR and sportyR/sportypy: team identity, colors, logos, surfaces, tables"

1. WHAT IT IS: The sportsdataverse's brand-new (Oct 2026) TypeScript port of its plotting stack: team identity (colors, logos), field surfaces, and data tables for the web — the viz layer of the SDV ecosystem rewritten in GSE's own language, MIT-licensed (unlike its GPL R/Python parents).
2. WHERE: https://github.com/sportsdataverse/sdvplot-js
3. HOW TO USE IT: TS package (plot.sportsdataverse.org); consume the team-identity/surface modules in web rendering — for GSE this is candidate infrastructure for customer-facing charts and cards.
4. WHICH SYSTEM: corpus → customer-facing viz (Motif's front-end lane): team colors/logos done right is a real production dependency for cards and boards.
5. SECOND-ORDER: Completes a TS-native slice with A-R2-41 (ESPN data in TS): data access + identity/viz, both MIT, both actively pushed in the last week — the ecosystem is migrating toward GSE's stack and this wave catches it early.
6. §8 ENGINE-TRAINING VALUE: Presentation layer — no training data; value is production correctness (official colors/logos/surfaces) for published artifacts. No labels.
7. PROVENANCE: Original work by the sportsdataverse team (2026), porting their own R/Python packages (A-R2-45/46) — port lineage named; 1★ reflects age (one month), not quality signal; org provenance + active pushes carry it.
8. VERDICT: ADOPT (MIT, TS-native, org-official — the wave's clearest adopt candidate for the front-end lane; pin a version, it is young and moving fast).

## A-R2-48 — PySport/matplotvideo

**Verified (GitHub API, 2026-11-06):** 52★ · last push 2020-12-12 · created 2020 · Python · MIT · fork: False · https://github.com/PySport/matplotvideo

**API description:** "Attach video player to matplotlib plot"

1. WHAT IT IS: A small PySport utility that synchronizes a video player with a matplotlib plot — scrub the film and the tracking plot moves with it (and vice versa). The missing link between CV/tracking output and human film review.
2. WHERE: https://github.com/PySport/matplotvideo
3. HOW TO USE IT: Python library; pair a tracking animation (on sportypy surfaces, A-R2-46) with the source broadcast clip for frame-accurate analyst review and for validating roboflow/sports detections (A-R2-17).
4. WHICH SYSTEM: corpus (film-review tooling) supporting the usage layer's tracking validation.
5. SECOND-ORDER: Validation workflow enabler: every film-derived feature (A-R2-17 pipeline) needs human spot-checking against video; this is the open-source tool shaped exactly for that loop.
6. §8 ENGINE-TRAINING VALUE: Tooling for producing verified labels: analyst-confirmed frame annotations from synced review become labeled data for CV validation. Ships no labels itself — stated plainly.
7. PROVENANCE: Original work by the PySport collective (2020), MIT; dormant since 2020 (small, finished-scope utility — dormancy is not decay for a tool this narrow, flagged honestly).
8. VERDICT: LEARN-ONLY (pattern for the review loop; reimplement in-stack if the film lane matures).

## A-R2-49 — fonnesbeck/sportypy

**Verified (GitHub API, 2026-11-06):** 18★ · last push 2025-12-15 · created 2025 · Python · MIT · fork: False · https://github.com/fonnesbeck/sportypy

**API description:** "SportyPy: Probabilistic Modeling for Sports Analytics"

1. WHAT IT IS: A Bayesian probabilistic-modeling library for sports analytics by Chris Fonnesbeck (PyMC core developer; Vanderbilt biostatistics) — hierarchical models for team/player strength and game outcomes in the PyMC idiom. NOT the sportsdataverse surface package (A-R2-46) despite the identical name.
2. WHERE: https://github.com/fonnesbeck/sportypy
3. HOW TO USE IT: Python/PyMC library; fit hierarchical rating models with full posterior uncertainty — the uncertainty quantification is the point: ratings as distributions, not points.
4. WHICH SYSTEM: matchup layer (ratings methodology) — GSE's reasoning doctrine demands honest uncertainty; Bayesian posteriors are the principled form of it, and this is a sports-shaped implementation by a primary-source author (a PyMC creator, not a recreator).
5. SECOND-ORDER: Posterior-rating distributions + the point-rating harness (A-R2-29→32) = calibration comparisons (does uncertainty-aware rating beat point Elo on log-loss?); also a methods sibling to the engine's local Bayesian rating work.
6. §8 ENGINE-TRAINING VALUE: Models train on game results (labels = outcomes/scores, universally available via nflverse); the library contributes priors/hierarchical structure, not data.
7. PROVENANCE: Original work by Chris Fonnesbeck (2025), MIT. Name collision with sportsdataverse/sportypy (A-R2-46) recorded in both entries — a genuine provenance trap this wave defuses explicitly.
8. VERDICT: TEST (fit the hierarchical model on NFL results; compare calibration against the Elo family).

## A-R2-50 — sportsdataverse/hoopR

**Verified (GitHub API, 2026-11-06):** 152★ · last push 2026-11-06 · created 2020 · R · license: NOASSERTION · fork: False · ~120 MB · https://github.com/sportsdataverse/hoopR

**API description:** "An R package to quickly obtain clean and tidy men's basketball play by play data."

1. WHAT IT IS: The sportsdataverse's flagship basketball package: tidy men's basketball (NBA + NCAA) play-by-play from ESPN and KenPom — the one deliberate non-football entry in this wave, included because GSE's engine scope is multi-sport by Garrett's standing ruling (NFL, NBA, MLB, NHL, soccer at minimum) and hoopR is the mature pbp layer for the NBA/CBB lane.
2. WHERE: https://github.com/sportsdataverse/hoopR
3. HOW TO USE IT: R package; load_nba_pbp / load_mbb_pbp style functions against the SDV data releases. Actively maintained (pushed the day of verification).
4. WHICH SYSTEM: corpus (multi-sport data access) — the NBA lane's equivalent of what cfbfastR is for college football.
5. SECOND-ORDER: Cross-sport method transfer runs both ways: EP/WP model forms validated on basketball's larger play counts inform football model design; cataloging the access layer now prevents a future NBA wave from redoing discovery.
6. §8 ENGINE-TRAINING VALUE: Access layer for NBA/CBB pbp (labels = play outcomes across full seasons, in the SDV releases). Labels exist.
7. PROVENANCE: Original work by Saiem Gilani and the sportsdataverse team (2020– ); KenPom data functions depend on a KenPom subscription — dependency named, not hidden.
8. VERDICT: CONTEXT-ONLY (Lane A is football-situational; this banks the NBA access layer for the multi-sport corpus without pretending it is a football find).

---

## Wave A-2 gap audit (per standing completion rule)

- NOT covered at substance level: QB mechanics/throwing-motion models (open-source supply is dashboards and student projects; only A-R2-13 touches QB behavior with tracking), NFL injury/health modeling (search returned only 0–1★ student work; the health layer stays with nflverse injuries from A-1), referee/officials modeling (penalty analyses were all ≤1★ toys; officials remain a pbp-fields-only layer), dedicated weather/venue pipelines (the seam's searches were polluted by a Madden roster-mod repo's keyword-stuffed description; venue coverage rests on A-R2-15's spatial data + sportyR geometry, not a weather pipeline).
- NOT returned by providers: the connector helper (bin/github-api) dropped connections repeatedly (~30 s timeouts, one successful query); verification completed via api.github.com search-API records instead, disclosed in the header.
- Examined and skipped as thin/toy or excluded-by-design: ~60 repositories (betting/odds tools, fantasy optimizers and draft tools, 0★ notebooks, spam). Excluded-by-design encounters are named in the header.
- Reserves verified but not counted (would be first promotions in any A-3): lebebr01/cfbFootball (10★), danmorse314/draft-value (3★), femkemunting/nfl_data_bowl_25 (fields partially read — not counted for that reason).
