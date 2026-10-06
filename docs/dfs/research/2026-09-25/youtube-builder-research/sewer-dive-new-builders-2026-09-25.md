# SEWER DIVE — New Independent Builder Leads (second wave)

Date: 2026-09-25. From: Motif. For: Garrett + GSE engine.
Method: read-only across GitHub, YouTube, Substack/Medium, web. No stars/forks/follows/likes/joins/DMs/signups.
Rule from Garrett for this lane: no relevance filtering — methodology is fair game to learn from; code reuse needs a license (marked per entry). Original 15 remain preserved on the bus.
Legend: **DIRECT** = observed this pass. **INFERENCE** = my read. Freshness: **FRESH ✓** = new/updated on/after 2026-08-26.

---

## TOP 5 by GSE value

1. **sjpagano/nfl-win-probability** — https://github.com/sjpagano/nfl-win-probability
   Who: GitHub builder with a stats discipline. What: NFL win-probability model with a real held-out **2025 test: Brier .1613, log loss .4831, AUC .8459, ECE .0331** (DIRECT) — tested isotonic calibration and **rejected it when it worsened the holdout**. Evidence: repo README + notebooks (not load-verified this pass). Fit: calibration discipline for GSE's WP engine — the testable calibration gates are the lesson, not necessarily the model. License: unknown. Freshness: FRESH ✓.

2. **benbr11/edgelabs** — https://github.com/benbr11/edgelabs
   Who: GitHub builder. What: NFL winner model reaching **65.9% accuracy against an ~66% closing-market benchmark** (DIRECT) — i.e., model vs. market parity demonstrated on paper. Walk-forward validation; model cards and reports committed. Evidence: repo (README + reports). Fit: validation ritual against the closing line is exactly GSE's honesty standard; the walk-forward design is worth copying wholesale. License: unknown. Freshness: FRESH ✓.

3. **joscho11/joschoanalytics** — https://github.com/joscho11/joschoanalytics
   Who: GitHub builder (notebook series). What: NFL ATS ensemble on **4,300+ games, walk-forward with feature ablation** (DIRECT); **killed his own sparse "ULTRA" tier** rather than overselling it. Evidence: repo + writeups. Fit: ATS-focused methodology and the rare discipline of publishing what *didn't* work. License: unknown. Freshness: FRESH ✓.

4. **greerreNFL / nfelo ecosystem** — https://github.com/greerreNFL/nfelo · https://nfeloapp.com · X @greerreNFL
   Who: Robby Greer, the most credible indie NFL modeler in the sweep (PredictionTracker.com says "most accurate model of 2024" — DIRECT on nfeloapp.com). What: 538-Elo framework + QB Elo + market regression + **six-unit EPA decomposition** (`nfelounits`: pass/rush/special teams × offense/defense, weather sigmoids, volatile-play discounts, QB adjustments, trend smoothing) + `pip install nfelodcm` typed nflverse loader. nfelo pushed 2026-09-25 (FRESH ✓); ecosystem all pushed within days. Evidence: repos + live site with weekly projections, 6 +EV flags, backtest to 2009, +130.2u vs open claimed on-site. Fit: the closest indie parallel to GSE — data layer + power ratings + market regression + public ledger. License: none/unknown (check before reuse). Audit note: on-site profit claims are self-reported.

5. **Excel LADZ** — YouTube @excel_ladz (~6.73K subs) · https://excelladz.com
   Who: Excel-native NFL modeler. What: **SOS-adjusted offensive/defensive ratings, 12-game trailing window, Bayesian prior-season blending, hypothesis-tested ~10% home-field advantage, generalized Poisson for under-dispersed TD counts, separate rare-event distributions, 5,000-run Monte Carlo in Excel, Power Query automation** (all DIRECT from channel content). Data: TeamRankings.com + Pro Football Reference; no API keys. **Explicitly publishes no track record** — educational framework, not a validated edge. Workbook is **Patreon-gated at $27.50+/month** (unavailable to us). Fit: the full recipe is transparent and re-implementable in our stack; generalized Poisson + separate rare-event distributions are concrete tools to port. Freshness: FRESH ✓.

---

## Wave 2 builders (ranked)

6. **tucknub/nfl-prop-war-room** — https://github.com/tucknub/nfl-prop-war-room
   What: reception projections for fantasy football + player props with **leakage-safe backtest and calibration artifacts** (DIRECT); pushed 2026-09-24 (FRESH ✓). Fit: prop-line engine reference for GSE's props work; the leakage-safe backtest design is the lesson. License: unknown.

7. **CHZN1/nfl-anytime-td-model** — https://github.com/CHZN1/nfl-anytime-td-model
   What: **MIT**-licensed, leakage-aware anytime-TD probabilities with EV odds integration (DIRECT); pushed 2026-09-24 (FRESH ✓). Fit: one of the two strongest MIT models in the GitHub dive; ports directly into GSE's TD-prompt work. License: **MIT ✓**.

8. **dgrifka/nfl_simulator** — https://github.com/dgrifka/nfl_simulator
   What: **MIT**, NFL simulator + "luck-neutralized" EPA and deserve-to-win distributions (DIRECT); pushed 2026-09-24 (FRESH ✓). Fit: the luck-neutralization method is directly portable to GSE's Monte Carlo simulations. License: **MIT ✓**.

9. **djscott03/scott-sports-predictions** — https://github.com/djscott03/scott-sports-predictions
   What: live Streamlit deployment + alerting + verified-state labeling + CLV tracking roadmap (DIRECT); pushed 2026-09-24 (FRESH ✓). Fit: the only recently-pushed full ship loop (train → deploy → alert → grade vs closing line). License: unknown.

10. **cbratkovics/fantasy-football-ai** — https://github.com/cbratkovics/fantasy-football-ai
    What: **MIT**, nflverse + dbt + DuckDB stack, as-of features, pushed 2026-09-22 (FRESH ✓). Fit: the cleanest MIT modern-feature-store reference in the sweep; schema patterns for GSE's warehouse. License: **MIT ✓**.

11. **Nicholas Wong — UCLA thesis (published June 12, 2026)**
    What: improved Elo + Monte Carlo futures + quantified uncertainty + **market anchoring** + soft-label log loss against de-vigged closing odds (DIRECT from Track C). Fit: the futures-rating + soft-label-vs-closing-line idea is a concrete GSE upgrade. License: n/a (academic). Audit note: not independently verified this pass — read the thesis before adopting.

12. **MENG-COOLMAN/PitchQuant** — https://github.com/MENG-COOLMAN/PitchQuant
    What: **MIT**, LLM-orchestrated football odds analysis pipeline over ~227,000 matches; dev.to writeup 2026-09-19; pushed 2026-09-23 (FRESH ✓). Fit: LLM-over-market-data pipeline patterns adjacent to GSE's research program. License: **MIT ✓**.

13. **theedgepredictor** — fork-owner builder, ecosystem repos
    What: runs a feature-store / data-pump / model-store operation (`nfl-feature-store`, `nfl-model-store`, odds-scraper + data pump) (DIRECT, Track C). Fit: production feature-store discipline worth studying. License: unknown. Audit note: output quality not verified.

14. **mitch-avis** — https://github.com/mitch-avis (cluster: nfl-predictor, nfl-sos-ratings, scrapers, sleeper data)
    What: active NFL predictor + SOS ratings + Sleeper-data plumbing (DIRECT). Fit: Sleeper-depth-chart-to-model plumbing is a concrete data feature to borrow. License: unknown.

15. **tinpham4/nfl-win-predictor** — https://github.com/tinpham4/nfl-win-predictor
    What: **MIT**, Streamlit + XGBoost claiming 66.2% held-out accuracy (DIRECT, Track A). Fit: XGBoost baseline recipe. License: **MIT ✓**. Audit note: held-out accuracy not independently verified — 66.2% near market level is plausible but unvalidated.

16. **A-Peoples/NFL_Play_Predictor** — https://github.com/A-Peoples/NFL_Play_Predictor · https://nflplaypredictor.streamlit.app
    What: play-calling prediction from situation, claimed 71% (DIRECT), live Streamlit app. Fit: play-type models are thin territory in GSE's corpus; adjacent to pre-snap work. License: unknown. Audit note: 71% claim needs validation.

17. **saahilmanekar/snapshift** — https://github.com/saahilmanekar/snapshift
    What: **MIT**, event-driven historical game replay with streamed win probabilities (DIRECT). Fit: replay infrastructure for WP-model stress-testing (e.g., replaying 2025 blowouts). License: **MIT ✓**.

18. **jaredpatchett/nfl-model** — https://github.com/jaredpatchett/nfl-model
    What: append-only pregame logs and **insists on grading against prices available at prediction time** (DIRECT, Track C). Fit: the grading principle is the portable lesson; costs nothing to adopt. License: unknown.

---

## Honest-negative / methodology signals (what NOT to copy)

These are from Track C's social/blog sweep — kept per Garrett's no-filtering rule, but tagged honestly:

- **rrmethodco/mypicks** — model loses to the closing line by **0.33 MAE over 4,235 OOS games**; no divergence bucket beats -110 (DIRECT). Signal: a quantified null result for a published model — sets GSE's bar.
- **colemason6524/nfl_props** — no standalone closing-line edge overall; narrow positive bands only; labels ≥15% EV as **toxic** (DIRECT). Signal: prop edge is regime-dependent, not free.
- **craftypicks** — full-board Brier/calibration with significance tests and "needs N more samples" counters (DIRECT). Signal: statistical humility as a product feature.
- **urwishpatel2003/nfl-engine** — documented an ATS spread-sign bug that **falsely produced an 86% backtest; true OOS was ~49%**, regression test added (DIRECT). Signal: the canonical example of why GSE's sign-convention tests exist.
- **huntm19/nfl-betting** — NFL spread + OU + props with XGBoost vs ridge; evidence thin (DIRECT, Track A). Kept for completeness, not a top lead.
- **Sujar Henry (@sujar.tech, 73.7K)** and **@dandoesdata.ai** — DIRECT from captions: general ML education, no sports data product. Audience only, not intake targets.
- **Reddit / X / Instagram surroundings** (Track C): 0 validated recent small-account leads. Search indexing was poor and X public search did not satisfy the under-5K-follower target — not proof nothing exists, just poor coverage.
- **Deployed apps** (Track B, liveness-checked 2026-09-25): **0 confirmed live.** Two HF Spaces erroring (scheduling failures — likely HF infra, re-check), one Render app 403 (likely bot-blocking, unverified), one deployment claimed with no URL observed. Honest null, kept on the record.

---

## MIT-licensed highlights (safe-to-reuse code)

From the GitHub license ledger (DIRECT, code-license verified where stated):
- **CHZN1/nfl-anytime-td-model** — MIT, leakage-aware anytime-TD
- **dgrifka/nfl_simulator** — MIT, luck-neutralized EPA
- **saahilmanekar/snapshift** — MIT, event-driven WP replay
- **ayushnair2/Gridiron-Warehouse** — MIT, Snowflake+dbt warehouse (pushed 2026-09-23)
- **blahovec-labs/nfl-bigquery** — MIT, idempotent nflverse→BigQuery
- **tinpham4/nfl-win-predictor** — MIT, XGBoost Streamlit
- **cbratkovics/fantasy-football-ai** — MIT, nflverse+dbt+duckdb
- **MENG-COOLMAN/PitchQuant** — MIT, LLM odds pipeline
- **MattWenzel/NFLVERSE-DB** — MIT, queryable SQLite
- **clausherther/nfl-dbt** — Apache-2.0, dbt on NFL PBP
- **maximusdesir/engage8** (original 15) — MIT, LightGBM pre-snap 69.7%
- **jake0miller/nfl-predictions** — MIT, 22,000+ games, NFL + CFB + HS (pushed 2026-09-16, FRESH ✓)

⚠️ CC BY-NC 4.0 items (Big Data Bowl-derived repos) are **non-commercial — keep out of paid/published paths.**

---

## Freshness notes

- 29 NFL-model repos created in the last 30 days were meta-checked (Track A); 4 flagged worth immediate attention: tucknub/nfl-prop-war-room, CHZN1/nfl-anytime-td-model, dgrifka/nfl_simulator, djscott03/scott-sports-predictions — all pushed 2026-09-24.
- Gridiron-Warehouse (Snowflake+dbt) pushed 2026-09-23. PitchQuant pushed 2026-09-23. FranciscoOrtizTena/NFL-elo-model pushed 2026-09-23. nfelo pushed 2026-09-25.
- GitHub stargazer enumeration was blocked by token scope — stargazer-side mining is incomplete; a follow-up with a broader token could surface more.

## Pipeline patterns for GSE (observed, from Track D)

- **Tuesday is the rollover day** — MNF + nflverse publish drive every serious weekly pipeline.
- **Immutable ledgers** — committed-back logs; no reruns that revise old calls; git commit timestamp as the Merkle trust anchor (sooth).
- **Pre-kickoff price capture is irreplaceable** — ESPN deletes odds blocks at final; The Odds API historical ~10x live rate; cost ceilings as code.
- **Sub-hourly GitHub cron is unreliable** (~3 runs/day vs 48 scheduled); odd-minute offsets and batched commits mitigate.

*Read-only throughout. No follows/stars/forks/joins. Credential locations noted in the datasets file without values.*
