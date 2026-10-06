# a06 — INT-by-Situation: Evidence Hunt + Verification (c02)

**Analyst:** slice c02 deep-research (session 99a2e948)
**Date:** 2026-10-02
**Scope:** all 300 c02 briefs swept (`grep -ril` on interception/turnover-worthy/int rate/pick-six/thrown intercept → 6 matching briefs, all read fully, each traced to its source file in `~/workspace/vendor/Sports/docs/` and verified at file:line). Read-only on repos; this file is the only write.

---

## EVIDENCE FOUND (verified claims + sources)

### 1. FTN interception-worthy rate × 52.3% league conversion → INT projection formula

Source: `docs/props/research/2026-09-17/props-consensus/projection_methods.md:178-182` (verified in source):

> "FTN `is_interception_worthy`, 2025: Allen 17 worthy throws in 464 dropbacks (3.66%) but only 10 actual INTs; Goff 8 in 554 (1.44%), 8 actual. League worthy->INT conversion 52.3%. Allen projection = 27.0 exp db x 3.66% x 52.3% = **0.5** (band 0-2); Goff = 34.2 x 1.44% x 52.3% = **0.3** (band 0-1)."

Key intelligence points from the same passage:
- The signal is the QB's *danger volume* (worthy rate), not his actual INT count: Allen's 3.66% worthy rate is 2.5× Goff's 1.44%, while his actual INTs (10 vs 8) understate the gap.
- "Against a typical 0.5 market line: Allen = coin flip (no edge), Goff = mild under lean (weak; single-game INTs are noise)."

Independent corroboration of the 52.3% number: `docs/architecture/2026-09-18-signal-architecture.md:680` — signal registry row "Interception-worthy throw rate," status BUILDING-NOW for display/research, kill line: "52.3 percent of flagged throws became interceptions in the measured sample."

**HARD rights caveat (same source, lines 680, 1564, 1602):** the interception-worthy throw rate is "display and research only, permanently, under the L7 share-alike model-ineligibility rule, never re-tested as a feature unless the founder changes the commercial posture on FTN-derived share-alike content in a served feature." The `resolveFeatureRights` unit tests pin that FTN-charting-derived columns (including interception-worthy throw rate) resolve `modelEligible: false` even inside the nflverse release, while the surrounding nflverse EPA rows resolve true. So the FTN worthy-rate → 52.3% formula is the **props/analyst lane**, never a served engine feature.

### 2. Turnover occurrence vs recovery: the standing engine rule

Source: `docs/architecture/2026-09-18-signal-architecture.md:679,1671,1700,1714` (verified):
- "recovery is near-pure noise year to year; occurrence is weakly repeatable; one 2025 team forced 19 fumbles and recovered 26.3 percent against a league 46.3."
- Design C7 "NFL turnover differential: occurrence versus recovery": opponent-adjusted forced-fumble and interception **occurrence** rates per team built new from nflverse pbp; recovery share is "computed, reported, and structurally unable to reach" the opponent-adjustment call — the type boundary, not a comment, is the enforcement.
- League mean fumble-recovery rate 46.3% is the regress-to target: "Recovery share is regressed to the measured league mean of 46.3 percent and never carried forward as skill; raw turnover margin and recovered fumbles never enter as a feature."

Relevance to qb-behavior: INT occurrence is partially repeatable QB/behavioral skill; recovery is noise. The qb-behavior INT module should model *thrown-INT occurrence rate* (and INT-worthy danger rate in display), never INT-margin.

### 3. Team-level INT/turnover facts in the situational DFS lane

Source: `docs/research/2026-09-19-dk-week2/deep/qb-phase3.md:11` (verified): "2025: MIN led NFL in turnovers (30), CHI led in takeaways (33). Both passing games get a weather tax — Caleb and Wentz both downgraded a half-tier pending Sunday AM recheck." → weather is a recorded pre-lock INT-risk downgrade protocol, but no measured weather-INT-rate numbers.

### 4. Pressure proposal: EPA-based, NOT INT-based

Source brief c02-r44 (`docs/models/qb-pressure-indices-proposal.md`): `sensitivity = EPA/dropback(clean) − EPA/dropback(pressured)` with null guards **< 100 pressured dropbacks → null; < 95% FTN join coverage → null**. It is a proposal with no measured numbers — and it is EPA/dropback, not INT rate. No pressure-split INT rate exists in the corpus.

### 5. Completion model: INTs treated as incompletions, no skill priors

Brief c02-r12 (arXiv:2109.08051v1 frame-by-frame completion model): interceptions treated as incompletions; authors' own flagged gap is "no player-skill priors" — the GSE differentiator, not a finding.

### 6. NGS cumulative WPA on interceptions

Brief c02-r32: NGS post (Nahshon Wright: 64.3% cumulative win probability added on interceptions in 2025, 2nd among outside CBs; 5 INTs tied 2nd). This is defender-side, and per the NGS internal-only doctrine it stays internal regardless.

### Negative finding (stated plainly)

**The corpus contains NO measured INT-rate-by-situation numbers.** No INT rate under pressure vs clean, no by-quarter, by-score-differential, by-field-position, by-down/distance, vs-blitz, or red-zone INT rate appears anywhere in the 300 c02 briefs or the sourced docs. The qb-behavior module must COMPUTE them; this is a build spec, not a read of existing measurements.

---

## SITUATIONAL SPLITS AVAILABLE (what c02 supports)

### Directly computable from nflverse pbp (CC-BY-4.0, model-eligible)

Verified FTN-charting 2025 column inventory (header of `docs/data-sources/research/2026-09-18/ftn/charting/ftn_charting_2025.csv`, 47,316 plays) plus nflverse pbp columns documented across the corpus:

| Split | INT numerator | Situation column(s) | Status |
|---|---|---|---|
| Pressure vs clean | `interception` (pbp) | nflverse `qb_hit`/`sack` as pressure proxy — a **floor, never true pressure** ("hurries absent from both" — r01 brief, verified at signal-architecture.md:1700); or FTN `is_qb_out_of_pocket`/`is_throw_away`/`is_qb_fault_sack` | Compute from pbp alone for the engine; FTN proxies only for display (CC-BY-SA) |
| Quarter | `interception` | nflverse `qtr` | Directly computable, engine-eligible |
| Score differential (leading/trailing) | `interception` | nflverse `score_differential` (WP buckets measured in projection_methods.md: BUF leading 50.0%/neutral 57.2%/trailing 61.8% dropback rates — same bucketing machinery) | Directly computable, engine-eligible |
| Field position | `interception` | nflverse `yardline_100`; red zone = `yardline_100 <= 20` (and `goal_to_go` per GSE_EXPECTED_POINTS feature list) | Directly computable, engine-eligible |
| Down/distance | `interception` | nflverse `down`, `ydstogo` (early/late × short/medium/long bucketing already in GSE_EXPECTED_POINTS success-rate module) | Directly computable, engine-eligible |
| Vs blitz | `interception` | FTN `n_blitzers` (verified present in the CSV header) joined on (`nflverse_game_id`, `nflverse_play_id`) | **Requires the FTN join → display/research only per L7 share-alike rule.** nflverse pbp carries no blitz column; 0380 arxiv-ledger states "FTN charting (coverage shells, blitz tags)" as the source. Note gse-research-summary:69 caveat: "No team column in FTN" — play-level blitz counts exist, team-level blitz aggregation is SPEC-ONLY. |
| Red-zone INT rate | `interception` | `yardline_100 <= 20` | Directly computable, engine-eligible |

**Verdict on the mission's question:** INT-by-situation CAN be computed directly from nflverse pbp (`interception` indicator × situation columns) with no model — the FTN interception-worthy-rate model is NOT needed for the engine. The FTN model is useful only for (a) blitz splits, and (b) the danger-volume display formula (worthy-rate × 52.3%) — both display/analyst-only under the L7 share-alike bar. Blitz-situation splits in the engine need a founder rights decision first.

---

## SAMPLE-SIZE ANALYSIS (handling INT rarity)

### The raw counts

Anchor examples from the verified sources: Allen 2025 — 464 dropbacks, 17 worthy, **10 actual INTs**; Goff — 554 dropbacks, 8 worthy, **8 actual INTs**. League INT rate ~2-2.5%/attempt. A full-season QB (~500 attempts) yields ~10-15 INTs. A situational cell (e.g., "trailing, 3rd-and-long, pressured") has n ≈ 15-40 attempts and 0-2 INTs. Raw cell rates are dominated by binomial noise; standard error at n=30, p=0.03 is ±3pp — the same magnitude as the rate itself.

### Corpus-precedent guards (verified)

1. **Hierarchical empirical-Bayes backoff, M=25.** Brief c02-r36 (2607.00164 denoised-rate auditor): sparse buckets shrunk toward coarser parents by `bucket = (w + M·p̂_parent)/(n + M)`, applied global → downward; flag buckets only at **n ≥ 30**. This is the directly liftable recipe: build the situation tree (league → QB → situation) and back off with M=25.
2. **Null floors.** The pressure proposal's guards are the in-lane precedent: < 100 pressured dropbacks → null (c02-r44 brief). The EP/WP modules fit at `MIN_EP_PLAYS_TO_FIT = 1000` / `MIN_WP_PLAYS_TO_FIT = 1000`, validation gates at n≥200 paired plays (c02-r43 brief). The certification predicate requires n≥100 fixture-clustered rows (c02-r01 brief).
3. **Nonparametric-mixture shrinkage machinery.** Brief c02-r10 (0516, Feng & Dicker): Kiefer–Wolfowitz NPMLE is ADOPTED in the corpus "for GSE's empirical-Bayes shrinkage of noisy per-player/per-team latent parameters" — the stated alternative to parametric hierarchical assumptions when per-QB cells are tiny.

### INFERENCE: recommended recipe (nothing below is a measured corpus number)

- **Multi-year pooling with regime handling.** ~3 seasons ≈ 1,500 dropbacks per QB stabilizes the marginal INT rate; situational cells need the same pooled window. But roster-break risk is real and documented (projection_methods.md findings: Montgomery HOU / Moore BUF team changes found via play-by-play). INFERENCE: pool 3 seasons, down-weight pre-team/coach-change seasons, and hard-reset on scheme-changing QB moves.
- **Shrinkage ladder:** league situational prior → team/offense → QB, M=25 backoff at each level; publish nothing below n=30 in a leaf, back off automatically above.
- **INT-worthy rate as the stabilized signal where allowed.** Allen's example shows the worthy rate (3.66%, n=17 events) is noisier than raw INTs but more repeatable-as-skill (occurrence is repeatable per the standing rule, §EVIDENCE 2). Use actual-INT-by-situation for the engine; use worthy-rate-by-situation for analyst display only.
- **Never score INT margin; score occurrence.** Recovery luck (46.3% league mean, year-to-year ≈ 0) must not leak into the QB module: a QB whose throws are dropped is not a different QB than one whose throws are caught.

---

## COMPLEMENTARY FOOTBALL (verified numbers)

Source: `docs/arxiv-program/research/2026-09-21/arxiv-deep/0678-partially-regularized-ordinal-regression-to.md:27-28` (verified in source, quoted):

> "Non-scoring turnover indicator selected ≥80% of CV replicates (always positive); turnover×starting-position term selected 100% after inclusion; yards allowed selected 70% (negative). **Median post-turnover starting position: own 41-yard line, +21 yards vs no turnover. Takeaway adds +0.6–1.0 points/drive (parabolic vs baseline, maxing at ~2–2.5 baseline pts/drive).** Non-proportional "≥ FG" coefficient selected 90% — turnovers boost FG probability disproportionately (FG range 70–75 yards advanced in NFL). 10-fold CV: GS+SoS+Complem beats GS and GS+SoS in MAE across NFL and CFB seasons."

Method context (same file, lines 18-26): partially-regularized ordinal regression, `logit P(Y ≤ s) = τ_s − (α_i + β_j + home + context + γ·complementary)`; complementary features = non-scoring turnover indicator (prev drive), turnover×post-turnover starting position, yards allowed, special-teams metrics; target = ordinal drive scoring outcome (5 categories); 3 replicates of 10-fold CV per season. Caveats from the ledger itself: NFL data 2009–2017 (pre-17-game era); adjacent drives in the same game can split across folds (within-game leakage risk on the CV estimate); drive-level MAE gains shown graphically without tabulated numbers ("effect size visible but not precisely quotable").

The brief-verbatim numbers check out: **takeaway +0.6–1.0 points/drive; +21-yard field position bump; median post-turnover start own 41** — all confirmed at source lines 27-28. (The x-sweep2.md "complementary football" mention at :59 is journalistic usage about the Cardinals' Week 1 win, not this research finding.)

Program relevance: the ledger's GSE-overlap note (line 33) states "Existing-research-map has opponent-adjusted metrics and drive-level work but no complementary-unit (defense→offense) adjustment... This is a new feature family for GSE ratings: turnover-generated field position as an explicit offensive-expectation input." For the qb-behavior INT module, the directional implication: a QB who throws INTs at a high rate hands opponents ~+0.6–1.0 pts/drive on the complementary channel — the cost of an INT is measured in the opponent's subsequent drive expectation, not just the lost possession.

---

## CHALLENGES

1. **No measured situational numbers exist — everything must be computed.** The corpus has the column inventory and the rights verdicts but zero measured INT-rate-by-situation results. The first run of this spec is a measurement exercise with wide intervals, not a feature.
2. **Blitz splits are rights-gated.** nflverse has no blitz column; FTN `n_blitzers` is CC-BY-SA-4.0 → display/research only per the L7 share-alike model-ineligibility rule (signal-architecture.md:680,1564,1602). Blitz-situation INT rates in the *engine* need a founder decision.
3. **"Pressure" is a floor.** Neither nflverse nor FTN carries a hurry column; `qb_hit`/`sack` proxies are explicitly a lower bound ("never calls its output true pressure" — :1700). A pressure-split INT rate understates true pressure exposure.
4. **Rarity × cells = noise dominance.** ~10-15 INTs/QB/season across 5+ situation dimensions means raw leaf rates are meaningless without the shrinkage ladder; any v1 must ship backed-off values with stated nulls.
5. **Regime changes break pooling.** Documented roster-break detection (Montgomery HOU, Moore BUF in projection_methods.md) means multi-year pooling needs staleness handling, not naive concatenation.
6. **The FTN worthy-rate formula is a props-lane tool, not engine input.** Worthy × 52.3% is priced as "danger volume" for INT props (0.5 lines); it must not enter served features.

---

## BUILDABLE SPEC (INT-by-situation recipe from nflverse pbp, with shrinkage)

INFERENCE — this recipe is derived from the corpus's verified primitives; none of the situational rates below have been measured.

**Data grain:** per-dropback rows. REG only; `play_type == 'pass'`; exclude `qb_kneel`, `qb_spike` (per projection_methods.md filter doctrine); key to `passer_player_id` with the observed-starter rule (signal-architecture.md QB composite is "keyed to observed passerId (starter-change test required)").

**Features (engine-eligible, all nflverse-native):**
- `int = interception` (actual occurrence — the modeled quantity per the occurrence-not-recovery rule)
- Situation columns: `qtr`; `score_differential` → buckets {trailing ≥8 / trailing 1-7 / tied ±0 / leading 1-7 / leading ≥8}; `yardline_100` → field thirds + red zone (`<=20`); `down`, `ydstogo` → the early/late × short/medium/long buckets already defined in GSE_EXPECTED_POINTS; `pressure_floor = (qb_hit == 1) | (sack == 1)` labeled as a floor, never true pressure.

**Estimation (lift the c02-r36 recipe):**
- Hierarchical empirical-Bayes backoff `cell = (w + M·p̂_parent)/(n + M)` with M=25, ladder league → team → QB, applied global → downward.
- Null floors: serve no leaf at n < 30 (back off to parent automatically); no QB-level situation estimate below 100 pressured dropbacks where pressure is the split (pressure-proposal guard); season marginal INT rate below 1,000 dropback-fits gets no WP/EP-style treatment — flag provisional.
- Multi-year pooling: 3 seasons, down-weight or cut pre-regime-change seasons (roster-break detection via play-by-play as in projection_methods.md findings).
- Recovery-luck purge: regress each QB's *realized* INT count toward the league 46.3% recovery mean before any comparison of "danger" vs "results"; model occurrence only.

**Display/analyst layer (non-engine, CC-BY-SA content allowed):**
- Blitz splits via FTN join on (`nflverse_game_id`, `nflverse_play_id`) with the 95% join-coverage null guard (pressure-proposal doctrine: "< 95% of the QB's dropbacks matching an FTN row → null").
- Danger-volume formula from projection_methods.md: `expected_dropbacks × is_interception_worthy_rate × 52.3%` with stated bands (Allen-style band 0-2), and the explicit warning "single-game INTs are noise."

**Acceptance:** (a) league-marginal INT rate reproduces the nflverse marginal within stated tolerance on a holdout season; (b) backed-off situational rates are monotone-sensible where the corpus has priors (trailing > leading — INFERENCE, unmeasured); (c) no FTN-derived column enters any training export — enforced by the `resolveFeatureRights` unit-test pin (signal-architecture.md:1564).

**What this answers for the qb-behavior module:** "when does HE throw interceptions" = his EB-backed-off INT rate per situation cell (pressure-floor vs clean, quarter, score bucket, field zone, down/distance, blitz where rights permit), with the cells that can't clear the null floors explicitly nulled rather than served as noise.
