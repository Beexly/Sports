# a03 — INT Model Verification & Veto List

**Slice:** c02 | **Analyst task:** verify the INT recipe and veto list in the phase-1 projection-methodology kit (map finding #11)
**Source (read completely, 282 lines):** `~/workspace/vendor/Sports/docs/props/research/2026-09-17/props-consensus/projection_methods.md`
**Brief cross-check:** `~/workspace/corpus-intelligence/briefs/c02/c02-r54/docs__props__research__2026-09-17__props-consensus__projection_methods.md.brief.md`
**Date written:** 2026-10-02

The source is a worked prop-projection doc for BUF vs DET (2026-09-17, "Workstream 2"), computed from nflverse play-by-play plus FTN charting. It is explicitly "Research only. Nothing here becomes a public pick."

---

## VERIFIED CLAIMS

**V1. INT recipe: expected dropbacks × interception-worthy rate × 52.3% league conversion.**
Source file lines 178-183, section 7, bullet "**Turnover luck -> INT props.**"
> "FTN `is_interception_worthy`, 2025: Allen 17 worthy throws in 464 dropbacks (3.66%) but only 10 actual INTs; Goff 8 in 554 (1.44%), 8 actual. League worthy->INT conversion 52.3%. Allen projection = 27.0 exp db x 3.66% x 52.3% = **0.5** (band 0-2); Goff = 34.2 x 1.44% x 52.3% = **0.3** (band 0-1). The signal is Allen's *danger volume* (3.66% worthy rate, 2.5x Goff's), not his 10 INTs. Against a typical 0.5 market line: Allen = coin flip (no edge), Goff = mild under lean (weak; single-game INTs are noise)."
Confidence: **HIGH** — direct quote, arithmetic checks (27.0 × 0.0366 × 0.523 = 0.517 → 0.5; 34.2 × 0.0144 × 0.523 = 0.258 → 0.3).

**V2. The 52.3% conversion is presented as a single league-wide constant.**
Line 180: "League worthy->INT conversion 52.3%." It appears exactly once, as one number, with no denominator, no n, no sample definition, and no situational split. Confidence: **HIGH**.

**V3. The doc contains NO INT-by-situation splits.**
Greps on the full file: "situation"/"situational" = 0 hits; "throwaway" = 0 hits; "aggress" = 0 hits. "pressure" appears only in the sack-veto bullet (lines 190-197), the Allen-scramble note (line 200, "pressure + script derivative"), and the `qb_hit`-undercount caveat (lines 264-265) — never attached to an INT or worthy rate. No INT or worthy rates by pressure, quarter, score, field position, or down/distance are computed anywhere. Confidence: **HIGH**.

**V4. Sack-prop veto is explicit and literature-backed.**
Lines 190-197, section 7, bullet "**Pressure stability -> sack props = deliberate NULL.**"
> "Literature: pressure generation is sticky, pressure-to-sack conversion is luck (R^2 < 0.005). Hutchinson's 11.5 sacks rest on 27 credited QB hits (real, sticky pressure); Rousseau's 7 on 23. But single-game sack totals are conversion noise, so **no sack projection for any player**. Our `qb_hit`/`sack_rate` columns are lower-bound proxies (hurries invisible); stated as such. This is the literature applied as a veto, which is the honest use."
Restated in section 9 (line 244): "**Individual sacks** (incl. Hutchinson): conversion luck per literature." Confidence: **HIGH**.

**V5. Garbage-time volume ratios: 1.025–1.195.**
Section 3b (lines 61-67) defines the correction: "each volume projection is multiplied by the measured **unfiltered/filtered per-game ratio** for that exact stat" — because "our filters exclude ~11% of plays (garbage time)" and "Props settle on full games; our filters exclude ~11% of plays." Table lines 68-75:

| player | stat | ratio |
|---|---|---|
| Allen | att 1.025, yds 1.031 | team plays 1.112 |
| Goff | att 1.105, yds 1.094 | team plays 1.113 |
| Cook | att 1.069, yds 1.035 | |
| Gibbs | att 1.052, yds 1.098 | |
| Targets | StB 1.103, JWi 1.133, LaP 1.195, Gib 1.093, Sha 1.078, Kin 1.042, Moo 1.076, Coo 1.081 | |
| TDs | team plays ratio (BUF 1.112 / DET 1.113) | |

Measured effect: "It moves Allen 195->201 and St. Brown rec 6.5->8.0." Bands are scaled by the same ratio. Min 1.025 (Allen att), max 1.195 (LaPorta targets) — the "1.025–1.195" band in the map is confirmed. Confidence: **HIGH**.
Note the garbage-time filter definition it is relative to (lines 29-30): garbage excluded = `qtr==4 AND (wp>0.95 OR wp<0.05)`; OT kept.

**V6. WP-bucket script-adjusted dropback rates.**
Section 4 (line 89), "Measured 2025 dropback rates by possession-WP bucket (filtered sample)," table lines 94-97:

| team | leading (wp>.65) | neutral | trailing (wp<.35) | season |
|---|---|---|---|---|
| BUF | 50.0% (n=328) | 57.2% | 61.8% | 56.3% |
| DET | 54.2% (n=284) | 57.1% | 68.2% | 59.5% |

Game-script assumptions for the matchup (Bills -5.5 favorites): BUF 53% ("between leading and season"), DET 63% ("between season and trailing"). The doc's own honesty note: vs flat season averages the script moves Allen -14 pass yards and Goff +13 — "second-order against the +-65-yard bands," kept because measured, not modeled. Confidence: **HIGH**.

**V7. Scramble composition is measured descriptively, not modeled situationally.**
Lines 198-201: "**Allen scramble composition (found angle):** 45 of his 89 rushes were scrambles, producing 387 of 543 rush yards (71%). His rushing prop is a *pressure + script* derivative, not a designed-run projection." No scramble-propensity rate (scrambles per pressured dropback, or by quarter/score) is estimated. The only definitional treatment is in the filters (lines 30-32): dropback = `pass_attempt==1` OR `qb_scramble==1`; scrambles count as QB rushing. Confidence: **HIGH** for what it says; **no situational scramble model exists in this file**.

**V8. Throwaway treatment: NOT addressed.**
Zero mentions of "throwaway" (grep-confirmed). The doc never discusses nflverse `cp` being NA on throwaways, never uses `cp` at all, and never states a throwaway-handling rule. Confidence: **HIGH** (absence is verified, not assumed).

**V9. Aggressiveness %: NOT addressed.**
Zero mentions of "aggress" (grep-confirmed). NGS `aggressiveness` appears in the repo's NextGenStat table per the c02 map (finding #9) but this file does not use it. Confidence: **HIGH** (absence verified).

**V10. The doc's own caveats on INT projections.**
Line 185: "(weak; single-game INTs are noise)." Lines 266-267: "INT projections rest on FTN charting (2025 only) and a league-average conversion; single-game INTs remain ~Poisson noise." Confidence: **HIGH**.

---

## INT RECIPE (exact, implementable)

Per source lines 178-183, the recipe is:

```
E[INT_game] = expected_dropbacks
            × (interception-worthy throws / dropbacks)   # QB's 2025 season rate
            × 0.523                                      # league worthy→INT conversion
```

Worked examples in the doc:
- Allen: 27.0 exp db × (17/464 = 3.66%) × 0.523 = 0.5, band 0-2. Signal framed as "*danger volume*," not his 10 actual INTs.
- Goff: 34.2 exp db × (8/554 = 1.44%) × 0.523 = 0.3, band 0-1.

**Recipe inputs and their provenance in the doc:**
1. `expected_dropbacks` — from the script-adjusted volume model (section 4): team plays × script dropback rate × QB dropback share. Note: 27.0 and 34.2 here are *filtered-sample* dropbacks (built from 2025 filtered per-game means, 56/55 plays); see Challenge C3 on garbage-time consistency.
2. `is_interception_worthy` — FTN charting 2025 (`ftn_charting_2025.csv`), joined to nflverse pbp on `(nflverse_game_id, nflverse_play_id)` (section 1). License CC-BY-SA 4.0, attribute "FTN Data via nflverse".
3. 0.523 — "League worthy->INT conversion," stated without denominator/n (V2 above).
4. **Doctrinal point the recipe encodes:** the QB's *worthy rate* is the persistent signal; the actual INT count is the noisy realization. Allen's 17 worthy / 10 actual is the canonical example (V1).

**What the recipe is not:** it is a single scalar per QB — one season-long worthy rate times one league conversion constant. It has no situational dimension.

---

## VETO LIST (what NOT to build — per this source)

1. **No single-game sack projections for any player** (lines 190-197, 244). Reason: pressure-to-sack conversion is luck (R² < 0.005); pressure generation is the sticky part. Even Hutchinson's 11.5 sacks (on 27 QB hits) get no row.
2. **No longest-reception projections** (section 9): "single-play extreme = pure noise."
3. **No props on players with no 2025 filtered sample** — the Sion Vaki rule (section 9): nominal RB2 by Wk1 usage but zero 2025 filtered touches → NULL, "no projectable role."
4. **No INT prop priced off actual INT counts** — use the worthy rate; actuals are conversion luck (V1; Allen 17 worthy vs 10 actual).
5. **Do not blend 2026 Week 1 efficiency into rates.** Standing rule (section 3): "Efficiency levels are never blended (100% 2025 / 0% Wk1 for rates)"; Wk1 is a role-continuity check and structural-break flag only.
6. **No opponent-adjusted numbers without data.** Cross-unit EPA is used "qualitative modifiers only" (section 6): "Numbers are NOT opponent-adjusted; stated everywhere."
7. **Do not convert sticky pressure into sack totals** — pressure stats (QB hits) may be shown as sticky pressure, but the sack column stays NULL (V4).
8. **No receptions projection where target-share stability fails verification.** Naive split-half shares are the gate (section 9): Kincaid (14.5%/5.9%) and LaPorta (16.8%/1.2%) fail on raw splits due to missed games → projected only on the when-active share with Wk1 role confirmation.
9. **Do not report volume means from the filtered sample as full-game expectations.** ~11% of plays are garbage-time-excluded; multiply by the measured unfiltered/filtered ratio for the exact stat (V5). "Without it every volume prop would be systematically short of how the bet settles."
10. **Do not treat rotational tackle noise as a baseline** — Milano/Bernard: "per-game sd ~= mean (rotational noise); Bernard's 11-tackle Wk1 is n=1, not a new baseline" (section 9).

**On the pressure-sensitivity question (mission item 2):** the veto is narrow. It kills *sack-count prediction*, not pressure as an evaluative feature. The doc itself treats pressure as real and sticky ("real, sticky pressure," lines 192-193) and uses Goff's 18.9%-hit-rate (2nd-highest allowed) as stated downside risk on his efficiency (assumption 8, section 8). So a pressure-sensitivity feature (e.g., EPA/dropback clean vs pressured — the qb-pressure-indices proposal in map finding #8) remains valid for QB *evaluation*; it is only invalid as an input to *single-game sack totals*. The two uses must not be conflated: pressure predicts pressure (who gets hit) and QB response to it; it does not predict whether the hit becomes a sack.

---

## SITUATIONAL GAPS (what's missing for INT-by-situation)

The qb-behavior module needs INT rate conditioned on pressure / quarter / score / field position. The doc gives **none** of these. Concretely missing:

1. **Worthy rate by situation.** The FTN join is already at play grain (`(nflverse_game_id, nflverse_play_id)`, section 1), so the raw material exists in the same data — but the doc aggregates to one season-level QB rate (17/464, 8/554). Nobody computed worthy/dropback by pressure, quarter, score differential, yardline, or down/distance.
2. **Conversion rate by situation.** 0.523 is a single league constant (V2). There is no estimate of whether worthy throws under pressure convert at a different rate than clean-pocket worthy throws, whether late-game desperation throws convert differently, etc. The doc gives no evidence for or against invariance — it simply doesn't test it. INFERENCE: if conversion is situation-dependent, the flat 0.523 misprices exactly the high-leverage situations that matter most for live/quarter props.
3. **Situation exposure for the upcoming game.** The doc allocates dropbacks only to teams (section 4's WP-bucket volume model) — it never distributes a QB's expected dropbacks across situation cells (e.g., what share of Allen's dropbacks come while trailing, under pressure, on 3rd-and-long). A situational INT model needs an exposure model, not just rates.
4. **A pressure flag that sees the whole truth.** nflverse has no hurries; `qb_hit`/`sack_rate` are "lower-bound proxies (hurries invisible)" (lines 195-196) and "`qb_hit` undercounts true pressure (no hurries); sack/hit proxies are floors" (lines 264-265). Any INT-by-pressure model built on nflverse alone inherits this blind spot — the "pressured" cell will be contaminated with hurried-but-unflagged dropbacks.
5. **Denominator of the 52.3%.** Before conditioning it, recompute it with a stated sample (which seasons, filtered or all plays, REG only?) — the doc does not say (V2).
6. **Year-over-year stability of `is_interception_worthy` itself.** The recipe assumes the worthy rate is the persistent skill (Stuart/Burke turnover-regression literature is cited in section 1, line 22), but this file shows no stability measurement — Allen-vs-Goff is a cross-section, not a persistence test. INFERENCE: if conversion also has QB-level persistence (Goff converted 8/8 = 100%, Allen 10/17 = 59% — a two-QB anecdote, not a test), the flat 0.523 misprices both tails.

**Bottom line for the challenge question:** the doc's INT recipe produces a **baseline-only** rate. It does not produce situational INT rates, and it was never designed to — the single-game framing only needed E[INT] for a 0.5 market line, with the doc's own verdict that "single-game INTs are noise" (line 185). Every situational dimension the module needs is unestimated.

---

## CHALLENGES

- **C1. The 52.3% is an unverifiable constant.** Stated once (line 180), no n, no denominator, no sample definition. It cannot be audited or reconditioned from this file. Recommendation: recompute worthy→INT conversion from the FTN 2025 join with stated filters before using it, and test situation-conditional conversion rather than assuming invariance.
- **C2. Baseline-only, by construction.** See SITUATIONAL GAPS: the recipe answers "how many INTs per game for this QB" as one scalar. Anything the module needs by pressure/quarter/score/field position must be built fresh — the doc provides the join key (game_id, play_id) and the filters, not the splits.
- **C3. Garbage-time inconsistency inside the doc itself.** Section 3b's doctrine: "Props settle on full games" — every volume projection gets the unfiltered/filtered ratio (Allen 195→201). But the INT recipe's exposure inputs (27.0, 34.2 dropbacks) are the *filtered-sample* dropbacks from section 4, with no visible garbage-time multiplier. The worthy rate is a rate, so it would cancel only if worthy rate is invariant to garbage time — which is unstated and untested. Numerically immaterial here (Allen: 27.0×1.025=27.7 → 0.53 vs 0.52; Goff: 34.2×1.105=37.8 → 0.29 vs 0.26; both round to the doc's 0.5/0.3), but principle-level: **exposure must be full-game for settled props**. The qb-behavior module should apply the ratio (or compute full-game exposure directly) rather than copy the doc's 27.0-style inputs.
- **C4. The sticky-signal assumption is asserted via literature, not measured in-file.** The worthy-rate-as-skill claim leans on the cited Stuart/Burke turnover-regression literature (section 1, line 22) and one cross-sectional example. The file contains no year-over-year worthy-rate stability number and no QB-level conversion-persistence test. Adopt the framing, but measure both before wiring weights to them.
- **C5. Single-game INTs are Poisson noise — the doc says so twice** (lines 185, 266-267). Any situational INT model must output wide bands and be scored over large samples, not judged on game-level hits. The module should project *rates*; game-count point estimates are theater.
- **C6. The pressure blind spot is structural.** `qb_hit` has no hurries (lines 195-196, 264-265). A pressure-conditioned INT model on nflverse data will systematically undercount pressured dropbacks. If true pressure conditioning is needed, the module needs a charting source with hurries (e.g., PFF/FTN pressure data) — nflverse alone cannot do it. This is the doc's own stated limit, not an inference.
- **C7. Throwaway / `cp`-NA handling is absent.** The doc never mentions throwaways or `cp`. Its completion-adjacent stats are receiver-based (catch%, YPT), so the quirk doesn't bite *this* doc — but any CPOE-style QB-behavior feature built downstream must handle `cp` = NA on throwaways explicitly (nflverse marks them NA; treating them as incompletions vs excluding them changes the denominator). INFERENCE flagged because the doc is silent.
- **C8. No aggressiveness % usage.** NGS `aggressiveness` exists in the repo's NextGenStat table (per c02 map finding #9) but this file doesn't touch it. A situational INT model would plausibly want tight-window/aggressiveness interaction — that wiring is greenfield, not verified here.

---

## BUILDABLE SPEC (pseudocode-ready INT-by-situation model from nflverse pbp)

**Goal:** E[INT] for a QB in an upcoming game, decomposed by situation cell, so the qb-behavior module can condition on pressure / quarter / score / field position / down-distance.

**Data (all already named in the source, section 1):**
- nflverse pbp (`play_by_play_2025.csv.gz`; extend to more seasons — INFERENCE: one season is thin for rare cells; the doc used 2025 only because that was the FTN charting year available).
- FTN charting `is_interception_worthy`, joined on `(nflverse_game_id, nflverse_play_id)` (CC-BY-SA 4.0, attribute "FTN Data via nflverse"). **ASSUMPTION A1:** FTN charting exists for every season used; the doc only verifies 2025.

**Step 0 — Filters (copy the doc's, section 2, lines 26-33).**
REG only; `play_type` in (pass, run); `qb_kneel==0`, `qb_spike==0`; garbage excluded (`qtr==4 AND (wp>0.95 OR wp<0.05)`); OT kept. Dropback grain: `pass_attempt==1 OR qb_scramble==1` (sacks carry `pass_attempt==1`, verified in doc).
**ASSUMPTION A2:** the 0.523 conversion was computed on a comparable sample. It was not stated — recompute conversion on this exact filtered sample rather than trusting 0.523.

**Step 1 — Situation cells (all fields in nflverse pbp).**
- Pressure: `pressured = (qb_hit==1 OR sack==1)`. **Known defect (doc lines 195-196, 264-265):** no hurries → lower-bound proxy; the "clean" cell contains unflagged hurries. Record this as a bias, not a fix.
- Quarter: 1, 2, 3, 4, OT.
- Score state: use `wp` buckets mirroring the doc (leading wp>.65 / neutral / trailing wp<.35, section 4 lines 94-97) or score_differential buckets (±8). **ASSUMPTION A3:** wp buckets are the possessing team's wp at play start, as in the doc's dropback-rate table.
- Field position: thirds by `yardline_100` (own 1-25 / 26-75 / opp 25-1, with red-zone flag `yardline_100 <= 20`).
- Down/distance: early (1st-2nd) vs late (3rd-4th); distance buckets (short ≤3, mid 4-7, long 8+).

**Step 2 — Cell rates (league).**
For each cell c over all QBs:
```
worthy_rate_c = SUM(is_interception_worthy) / n_dropbacks_c
conv_c        = SUM(interception AND is_interception_worthy) / SUM(is_interception_worthy)   # actual INTs on worthy throws
int_rate_c    = worthy_rate_c * conv_c
```
**Small-cell rule:** if n_dropbacks_c < 100 or worthy_n_c < 25, shrink toward the marginal with empirical-Bayes backoff (prior weight M=25 — INFERENCE: method available per c02 map finding #12's denoised-rate auditor; not prescribed by this source). Report the shrunken rate and the raw n.

**Step 3 — QB-specific layer (the doc's core insight, V1).**
Keep the doc's decomposition: the QB brings a persistent *worthy rate*; conversion is league (possibly situation-specific after Step 2):
```
worthy_qb        = shrunken QB season worthy rate (all situations pooled; EB prior = league rate)
mult_c           = worthy_rate_c / worthy_rate_league        # situation relative-risk multiplier
int_rate_qb_c    = worthy_qb * mult_c * conv_c
```
**ASSUMPTION A4 (from the doc, untested in-file — see C4):** QB skill lives in the worthy rate; conversion has no QB-level persistence. Test A4 before weighting: split-half / year-over-year stability of both `worthy_rate` and `conv` at QB level. If conversion shows QB persistence, replace `conv_c` with a QB-blended `conv_qb_c`.

**Step 4 — Exposure model (fills Gap 3).**
Allocate the QB's expected dropbacks across cells:
- Start from the doc's script machinery (section 4): team plays × script dropback rate × QB dropback share, then **apply the garbage-time ratio for the stat (V5) — full-game exposure, per C3**.
- Distribute across cells using the team's historical cell-share of dropbacks (2025 filtered sample), adjusted for the game's expected script (favorite → more leading-state dropbacks; underdog → more trailing). The doc's WP-bucket dropback rates (lines 94-97) are the empirical basis for the wp dimension; extend the same measurement to the other dimensions.
```
E[INT] = SUM_c  exp_dropbacks_c * int_rate_qb_c
```
**Step 5 — Output contract.**
Report E[INT] with a Poisson band (the doc's bands: 0-2 on 0.5, 0-1 on 0.3 — i.e., honest wide bands, C5), plus the top contributing cells (which situations drive the expectation). Never report a point game-count without the band.

**Explicit non-goals (veto list applies):** no sack projections (V4); no longest-reception; no players without a projectable sample (Vaki rule); no opponent-adjusted rates without data — cross-unit effects stay qualitative until measured; Wk1/current-season efficiency never blended into rates (100% prior-season / 0% current for rates; current season = role check only).

**Validation before wiring (per C1/C4/C6):**
1. Recompute league conversion on the Step-0 sample; report n and 95% CI. Do not inherit 0.523 blind.
2. Test conversion invariance across the Step-1 cells (chi-square / EB overlap). If it varies, use `conv_c`, not a constant.
3. Year-over-year (or split-half) stability of QB `worthy_rate` and QB `conv`; only the stable one gets QB-level parameters.
4. Quantify the hurry blind spot: compare nflverse `qb_hit`-based pressure rates against a charting source with hurries on an overlapping sample; report the undercount factor so the "clean" cell contamination is a number, not a footnote.

---
*All claims above marked with file:line cite the source doc unless labeled INFERENCE. Absences (throwaway, aggressiveness %, situational splits) were verified by full-file grep, not assumed.*
