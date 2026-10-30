# GROK47 Agent 1 — X-sweep leverage audit

Date: 2026-10-30
Auditor: Frontier Grok 4.7 OAuth Agent #1
Scope: read-only. No commit, no push, no code edit.

Sources actually read:

- `docs/data-sources/research/2026-10-30/X-ALL-SWEEPS-CONSOLIDATED.md` — Session 3 (lines 14200–14597), Session 4 ALTITUDE (14924–14957), Session 5 theme teaching points and gap list (14959–15615), Session 8 header plus U1–U3, N2, D1, D2, the signal-pack check table (21952–22056, 22214–22238, 22455–22482, 23190–23216), master-index Session 3 ledger (23265–23269), end gap audit (23680–23783).
- Live simulator: `scripts/ops/gse_coach_mind_simulator.py`.
- Live math: `intelligence/math/effective_theory_and_large_deviations.py`.
- Adjacent live wires that the simulator imports: `intelligence/math/vmls_and_numpy_kernels.py` (`solve_opponent_adjusted_bayesian_ridge`), `intelligence/coaching/qb_disguise_blitz_matrix.py`, `intelligence/coaching/pressure_answer.py`, `intelligence/data_loaders/signal_pack_loader.py`.

Not done: a line-by-line re-transcription of all 333 Session 8 dossiers or all 80 Session 5 record bodies. Those texts stay in the consolidated file. This audit uses the theme teaching points, the check table, and the dossiers named in the task. A claim below is either a line citation or marked NOT IN FILE.

Doctrine fence used as the bound, not as a new formula: market is Layer 1 and is compared last; reasoning is an overlay; `|Δ log-odds| ≤ 0.35` is the Stage D cap already written in AGENTS.md. This simulator does not enforce that cap.

---

## RESULT

The sweep file's own gap line ("signal pack landed but not consumed") is stale on this branch. `gse_coach_mind_simulator.py` loads the pack and applies six of the seven tables inside the 175-snap loop. The seventh, Timo's paired-flip ratio, is applied to the wrong estimand and shrinks every other overlay by about 26.5% before a second 0.35 scale. That is the over-leverage. The named Session 3 kernels (TPRR×YPRR, WOPR, crew penalty mix, tackles-vs-expected, havoc, ArkansasQuant λ=50) are still missing as trajectory inputs. Several prompt formulas are not in the sweep file and must not be treated as attested.

---

## 1. Kernel matrix

Status key: MISSING = not an input to the snap loop. DEAD = coded, almost never fires, or imported and never called. MISWIRED = fires on the wrong variable or the wrong estimand. OVER = present and too large or stacked. UNDER = present as a field, not in the probability. ATTESTED = the sweep file states it. NOT IN FILE = the task prompt states it and the sweep file does not.

| ID | What the sweep file actually says | Live code | Verdict | Bound if it is ever wired |
|---|---|---|---|---|
| C-281 | Quadrant, not a product. TE edition "TPRR×YPRR" with Bowers ~31.5% / ~2.9; JSN ~3.95 / ~34% (14257, 14494). C-304: YPRR = TPRR × yards/target is an identity, not a new signal (14494–14495). INVOCABLE-CANDIDATE (14271). Weight 0 (23265). | No `TPRR` or `YPRR` in the simulator. Shares are Sinkhorn then `conserve_target_shares_kkt` (1268–1278). | MISSING. Do not build `TPRR * YPRR` as a composite. The × in the file is a cross-plot. A product would square the target-rate term because of the C-304 identity. | Reallocation prior only, inside one team, then re-project through KKT so shares still sum to 1. Cap any one role at ±0.06 share. Do not also multiply yards by YPRR on the same snaps. |
| C-285 | @ArkansasQuant iterative ridge, two-way fixed effects, λ = 50 plays, garbage time excluded, manual refresh, CFB (14437, 23237). Not an NFL kernel and not PFF. | `solve_opponent_adjusted_bayesian_ridge` default `ridge_lambda=150.0` (`vmls_and_numpy_kernels.py:128,153`). Simulator call uses `ridge_lambda=2.5` (`gse_coach_mind_simulator.py:715`). Opponents are synthetic: `(i+7) % n_teams` and `(i+13) % n_teams` (693–702), not a real schedule. Function is not called by the snap loop. Only a test imports it. | MISSING as C-285. The live ridge is a different object and, if called, is not opponent-adjusted. Three lambdas (50 plays, 150, 2.5) are not interchangeable. | Do not add this rating on top of tendency EPA. If a real two-way FE is built: one observation per play, opponent dummies from the actual schedule, λ in plays not in arbitrary ridge units, garbage time out, then `|Δ EPA/play vs current tendency| ≤ 0.04` after shrinkage. CFB coefficients do not transfer. |
| C-287 | WOPR. File says the 1.5 / 0.7 coefficients were not in the reads and were not guessed (14439–14441, 23240). INVOCABLE-CANDIDATE at weight 0. | No `WOPR` symbol in the simulator. Target share is already a conserved probability. | MISSING. The prompt formula `1.5 * target_share + 0.7 * air_yards_share` is the public Fantasy Football Analytics form. It is NOT IN FILE. Using it would violate the file's own "do not guess" line. | Leave unpinned. If a later primary source pins coefficients, enter WOPR only as a residual versus the share already in KKT. `|Δ share| ≤ 0.05`, then re-conserve. Never add WOPR and TPRR reallocation on the same role. |
| C-297 | Crew assignment + penalty-mix kernel is the in-house replacement. The @refereeinsider ATS source is DIAGNOSTIC-ONLY; his Week 5 record does not match his own weeklies (14248–14250, 25–26). Components named in the task (DPI / offensive holding / false start yardage shifts) are NOT IN FILE as a formula. | `compute_luck_penalty_wp_swing` is a postgame fence (236–255). It is not a pregame crew prior. No crew-assignment table in the snap loop. | MISSING pregame. The postgame fence is the right place for penalty luck and must stay postgame. | If built: residual after opponent and game-state adjustment, prior of at least 200 plays, shrink to 0, `|Δ EPA/play| ≤ 0.02`. No points overlay. No ATS trend from the quarantined source. Do not add this on top of the postgame luck swing (that would grade the same penalty twice). |
| C-300 | @RyNoonan tackles vs expected. Attributed record 939-742, +95.5u at ≥5% edge since 2022. Strongest provenance class in the tranche. Motif did not independently audit it (25, 14271, 14442). | `idp_tackle_funnel_adjustment` returns +0.15 tackles if blitz rate > 30, else 0 (`pressure_answer.py:131–139`). The simulator only prints that number in the output dict (2334–2335). It does not move `away_def_tackles` / `home_def_tackles`. Missed-tackle rate does move snap efficiency: `(mtkl-24)/140` clipped to [−0.08, +0.14] (1336–1337) and then times `w_stat` (1696). | UNDER as an IDP prop. The +0.15 flag is not C-300. The attributed record is not a prior. | Do not import 939-742 as a probability. If a tackles-vs-expected model is built from public PBP: publish only through the conjunction gate; cap mean shift at 0.25 tackles; orthogonalize against the mtkl YAC nudge so a sloppy defense is not paid twice (once as hidden yards, once as IDP tackles). |
| C-316 | @throwthedamball havoc, def and off, "components are public PBP events" (14496–14497). The file does not write `(TFL+FF+INT+PD+Sacks)/plays`. The earlier @MagicSportsGuy definition in the same compilation is TFL + forced fumble + PD + INT, and it does not include sacks (knowledge-base havoc entry). | No `havoc` symbol in the simulator. Sacks already enter as `sack_prob`, tandem gate weight 0.25 or 0.40 (`pressure_answer.py:142–153`), 2x2 sack multiplier, and a 1.15 collision bump. | MISSING. The prompt's sack-inclusive formula is NOT IN FILE. Adding sacks would double-count pressure. | Public PBP only. Exclude sacks, or drop the sack kernels, not both. Use as a residual vs league rate. `|Δ success rate| ≤ 0.03`. Do not also add C-290 pass-rush wins (that one is BLOCKED-SOURCE). |
| ALTITUDE | @mockingboardapp. Not stadium altitude. De-noised opportunity/talent score, 0–100, band is the claim. Stated single-game reliability: QB 0.147, RB 0.210, WR 0.177, TE 0.126. Half the signal is in by ~6 / ~4 / ~5 / ~8 games (14928–14948). LEARN-ONLY. | `intelligence/ratings/engine_math.py` `situational_adj` adds +0.3 if `altitude_home`. That is stadium air, a different word. Not called from this simulator. | MISSING. Do not merge the two altitudes. | Weekly weight `n / (n + n_half)` toward the season score, using the file's own half-signal game counts. Publish the band, not the point. Do not add ALTITUDE on top of target share, xFP, or WOPR. |
| WhiteBison 55/45 | Sweep note only. Page and calibration tab were not fetched. Anchor weight and record are UNVERIFIED. File says a fixed 55/45 blend should be rejected, not ported (22049–22056, 21889). | Simulator margin blend is 70% market / 30% model, total is 65% market / 35% model, then clipped to ±6 and ±5.5 points (1967–1988). No-market fallback shrinks the raw margin by 0.35 (1987). `empirical_bayes_line` uses a sample weight capped at 0.55 against a positional prior (884–889) — a third, different 55%. `intelligence/pipeline/emit_week6_master_product.py` already has `0.55 * raw_model_mu + 0.45 * line` on prop means. | OVER on the game line. The 55/45 prop blend already exists in a different file and matches the blend the sweep says to reject. UNVERIFIED as a WhiteBison fact. | Do not add another 55/45. Market comparison stays last, after reasoning, as a gate, not as a mean blend. If a blend is ever justified by a measured Brier test, one blend, one file, weight reported beside the raw number. Cap any pre-gate mean move at the existing ±6 / ±5.5 until that test exists. |
| Patton play-caller v3.0 | Six components: down-weighted personnel, formation, motion, concept, protection, sequence. EPA is the compass, not an input. Y-aware PCA can smuggle EPA back in if EPA-derived features are not stripped. Parts I–II unread. Weight must stay 0 until those land (22238–22252, 22472). | Not in the simulator. No play-caller PCA. | MISSING. Correctly missing until Parts I–II are read. | No EPA feature in the PCA. No log-odds from the score. If a later component is pinned, one component at a time, `|Δ pass probability| ≤ 0.03`, and it must not stack with PROE or with the script pass-rate already in the snap loop. |
| Patton POE × P2S | Task prompt states a survival curve `POE * P2S`. The D2 dossier does not give that product. POE/P2S numbers live in the simulator's Phase 6 comment, not in the sweep paragraph that was read. | `PATTON_POE_P2S_2026` overwrites `pressure_to_sack_rate_pct` and `poe` (`qb_disguise_blitz_matrix.py:324–331`). `evaluate_qb_matchup_2x2` returns `poe` and does not multiply it. Sack probability uses archetype, QB-fault, and blitz delta (353–359), then a 1.15 collision multiplier (1244–1257), then 0.35 × `epa_shift_vs_baseline` is added into net EPA (1310–1316). | UNDER as a feature (POE is stored, unused). OVER as a mechanism (pressure is already in three other terms). The product in the prompt is NOT IN FILE. | Either use POE × P2S as the single sack modifier, or keep the 2x2 sack multiplier, not both. If the product is used: map it to a multiplier in [0.85, 1.20], and set the 0.35 EPA-shift pressure piece to 0 so the same pressure is not also an EPA add. |
| @The_Coach_A Big Nickel 37% | Task states a 37% early-down run-blitz confounder. The sweep upgrade that was read (U3) is the Vikings run-fit digit check, not a 37% formula. The 37% figure is in the simulator comment, attributed to ON3 #3, and was not re-read as a primary quote in this pass. | `compute_two_clocks_pressure_collision` subtracts 0.25s from time-to-pressure if the flag is true (`qb_disguise_blitz_matrix.py:401–413`). The simulator sets the flag with `_def_sack_pct > 30.0` (1252–1254). Sack rate defaults to 4.2 and is a sack percentage (1074–1075). Blitz rate is a different variable, default 26.0 (1072–1073). | DEAD, and miswired. A sack rate above 30 does not occur in the defaults. The comment says "blitzes > 30%." The comparison is sack rate. | If the ON3 37% claim is re-verified from the post: gate on early-down run-blitz rate, not sack rate, and only for the defense that actually does it. 0.25s is already a large pocket shift. Do not also multiply sack probability by 1.15 on those snaps. Cap the extra sack multiplier at 1.08. |
| @The_Coach_A Quarters weak-rotation | Session 8 index names a Gannon Quarters dossier (safety as decoy, weak rotation from a two-high shell). Digits were not re-read in this pass. | No coverage-shell state in the snap loop. Disguise rate is a single scalar into the 2x2. | MISSING. Film mechanism, not a number. | Do not convert a shell name into an EPA add. If charted shell rates arrive, they enter as a mix weight on an existing coverage split, `|Δ EPA/dropback| ≤ 0.03`, and they replace the disguise scalar rather than stacking on it. |
| @The_Coach_A Vikings double-mug / run-fit | U3: post said EPA/run allowed #1, −0.230. In-house nflverse W1–7: −0.110, rank 4 of 32. Success rate allowed 36.2%, also rank 4. FTN digits do not transfer (21985–21991). | Not a snap input. | UNDER as an identity (MIN is a real top-4 run defense on public EPA). The borrowed digit is refuted. | Use −0.110 / rank 4, not −0.230 / #1. `|Δ rush EPA| ≤ 0.04` vs the defense's own tendency, because the tendency EPA is already in the drive. Do not import Run DVOA. |
| @ghatz_28 shotgun / blitz / obvious-pass / rusher / pace | Task names five efficiency splits. The sweep file, in the parts read, attests a big-play vs success quadrant (signal-pack table 05, method replicated, image values not copied — 23216) and a catchable-ball chart that is image-only. The five named splits are NOT IN FILE as formulas in the sections read. | Table 05 big-play rate is used. Success rate is loaded and discarded (`_,` at 1344–1345). Explosive pass probability is `clip(big_play * 0.55, 0.03, 0.14)` (1699). Explosive run is `clip(big_play * 0.45, 0.03, 0.12)` (1708). Pace already moves: +2.8s when leading by 7, −3.0s when trailing (1551–1556), plus Albert-Chib and LQR. Blitz is already in the 2x2. | PARTIAL. One ghatz cut is in. The other four are missing. Success rate was fetched and thrown away. | Do not add a second pace-efficiency term on top of the script tempo. If shotgun or obvious-pass EPA is built from nflverse: it is a state split, not a team quality add. `|Δ EPA/play| ≤ 0.03` inside that state only. Use the success rate that is already loaded, or stop loading it. |
| @Timo_NFL paired-flip | Author's claim: dynamic-ratings leverage filters inflate by about 1.3–1.6×; the fix is copy-the-sim, flip one game, difference (22214–22236). Check table: synthetic 8-team sim, K=1.75, naive 0.437 vs paired-flip 0.321 = 1.36×, inside his band (23214). K is a tuning lever in his words (19111). It is not a snap shrink factor. | `signal_pack_loader.py` default `timo_paired_flip_inflation_ratio = 1.3607`. Simulator sets `timo_damping = 1/1.3607 ≈ 0.735` (852, 861) and multiplies every season-to-date overlay by `w_stat = timo_damping / (1 + 0.25*n_inj + 0.50*regime_l1)` (1525–1532). Quarter EPA is then multiplied by another 0.35 (1535). | OVER. Category error. A season-sim selection-bias ratio is damping in-game snap EPA, missed tackles, throwaways, and explosives. The gap audit's "not consumed" line is false for this table, and the consumption is the bug. | Remove `timo_damping` from `w_stat`. Keep 1.36× as a diagnostic on season leverage filters only. Injury shrinkage and regime shrinkage can stay, but they are not Timo. Do not also shrink those series with `guarded_shrinkage_step` unless the persistence gate says so. |

---

## 2. What is over-leveraged

1. Timo ratio on the snap loop. `gse_coach_mind_simulator.py:852,861,1525–1535`. A 1.36× season-sim inflation becomes a 0.735 weight on every signal-pack modulator, then quarter EPA is scaled by another 0.35. A real quarter EPA gap of +0.10 arrives as about +0.026 before injury and regime terms shrink it further. That is how a diagnostic eats the overlay.

2. Market mean blend before the gate. Lines 1967–1988. Posted spread and total are folded into the simulated mean at 70/30 and 65/35, then clipped. Doctrine says the market is the foundation and the comparison is last. This blend makes the published margin a market echo with a ±6 point leash. It is heavier than the unverified WhiteBison 55/45, and a 55/45 prop blend already exists in `emit_week6_master_product.py`. Two blends, neither gated by a Brier test in this pass.

3. Pressure counted three times, POE counted zero times. Sack multiplier (353–359), collision ×1.15 (1244–1257), and 0.35 × EPA shift (1310–1316) all move the same matchup. `poe` is returned and unused. Stacking `POE * P2S` on top would be a fourth count.

4. Big-play rate is scaled, clipped, and then damped. Table 05 enters as `big_play * 0.55` or `* 0.45`, clipped, then the explosive draw sits under `w_stat` for the related modulators. The success-rate half of the same chart is discarded. The explosive tail is both over-shrunk and half-used.

5. Synthetic ridge, if anyone calls it. `ridge_lambda=2.5` against a default of 150, on fake opponents `(i+7)%32`. That function is not in the snap loop today. It is one call away from publishing a "opponent-adjusted" rating that did not see an opponent. Do not wire it as C-285.

## 3. What is under-valued or missing

Missing from the trajectory, and correctly not guessed:

- C-281 receiver reallocation (the quadrant, not a product).
- C-285 real two-way FE with λ in plays.
- C-287 WOPR, coefficients still unpinned.
- C-297 pregame crew penalty residual.
- C-300 tackles vs expected as a prop mean.
- C-316 havoc from public PBP, sacks excluded.
- ALTITUDE score and band.
- Patton v3.0, weight 0 until Parts I–II.
- Quarters weak-rotation and double-mug as shell mix weights.
- ghatz shotgun, obvious-pass, and pass-rusher splits. Success rate from table 05 is loaded and dropped.

Under-valued because the field exists and the math does not use it:

- `poe` on the QB profile.
- `guarded_shrinkage_step` imported at simulator line 66 and never called (search of the file found the import only).
- `exceptional_persistence` is the license check for that shrinkage. The hand-rolled 0.35 margin shrink at line 1987 does not consult it.
- IDP +0.15 is an output label, not a simulated tackle.

Dead wire:

- Big Nickel flag compares sack rate to 30. Sack rates in this file are about 4–8. The 0.25s adjustment does not run. The blitz rate that would make the comment true is already in scope (`away_def_blitz_pct`) and is used for the 2x2 and the IDP label, not for this flag.

## 4. Parameter bounds so overlays do not double-count

These are bounds, not new scoring terms. They do not authorize a publish.

Log-odds. Any new football overlay that wants to move a probability enters as `Δ log-odds`, not as a second mean blend. The sum of absolute overlays on one side, one market, one snap family, stays inside `|Δ log-odds| ≤ 0.35`. That cap is already doctrine. This simulator's margin path uses point clips (±6, ±5.5, and a 0.35 raw shrink) and does not enforce it. `cramer_large_deviation_tilt` is the right tool when the claim is a rare tail, not a mean shift. Do not tilt and also add a mean EPA bump for the same event.

One owner per mechanism.

| Mechanism | Owner already in the sim | Do not also add |
|---|---|---|
| Target / carry share | Sinkhorn + KKT conservation | WOPR, TPRR product, ALTITUDE, xFP share, all at once |
| Pressure / sack | 2x2 sack multiplier, or POE×P2S, not both; collision 1.15 is a third | Havoc-with-sacks, C-290, tandem weight 0.40, and a shell EPA add |
| Tempo | Script ±2.8/3.0s, Albert-Chib, LQR | A ghatz "pace efficiency" team rating |
| Opponent strength | Tendency EPA already on the drive | Synthetic ridge, FTN −0.230, DVOA |
| Penalty luck | Postgame `compute_luck_penalty_wp_swing` | Pregame crew points |
| Season-sim leverage | Timo 1.36× as a diagnostic only | `timo_damping` inside `w_stat` |
| Market | Last comparison, de-vigged | 70/30 mean blend and a second 55/45 prop blend |
| Shrinkage | `guarded_shrinkage_step` when persistence is false | A second James-Stein on the same series |

Numeric caps, if a missing kernel is built later:

- Share reallocation: ±0.06 per role, then KKT. Sum stays 1. Scratched role stays 0.
- EPA residual (crew, havoc-without-sacks, shell mix, shotgun split): `|Δ EPA/play| ≤ 0.03`, and only inside the state the split names.
- Opponent-adjusted rating vs current tendency: `|Δ EPA/play| ≤ 0.04` after a play-count prior. Not on top of tendency EPA.
- IDP tackles: mean shift ≤ 0.25. No stack with the mtkl YAC modifier on the same defense.
- Sack multiplier from a new pressure curve: [0.85, 1.20], and the existing 1.15 collision bump is removed on those snaps.
- ALTITUDE: reliability weight `n/(n+n_half)` from the file's own half-signal counts. Band out, point in.
- Market: no new blend weight. One existing blend is already too many.

`exact_decomposition_allowed` refuses a point identity when residual corank is 2 or more. A kernel that is a mixture (script, coverage, crew) must emit a distribution. That function exists and is not what the snap loop calls.

## 5. Session 5 — 80 situational records, leverage only

Counts from the file's own run summary (15603): Theme 1 Game State 10, Theme 2 Script 12, Theme 3 Situational Splits 12, Theme 4 Coaching 8, Theme 5 Personnel 10, Theme 6 Availability 10, Theme 7 Market 8, Theme 8 Misleading Stats 10. Unique posts = 78 because two posts sit in two themes. Provenance: Grok summaries with short quotes, not full transcripts (15606). Individual record bodies were not re-copied here.

Teaching points that bound the simulator, from the lines read:

- Theme 1 (15043–15047). Unit is WP or EP change, not the box score. Garbage time is down-weighted for "who is good," not deleted. Kneel, 1-second, and overtime are different distributions. The sim's 175-snap loop is the right shape. A season EPA rating must not be applied at full weight in those edge states.
- Theme 2 (15137–15140). Pace is endogenous. The sim already does this (+2.8 / −3.0s). A team pace-efficiency rating on top would double-count. Pass rate is a mixture of scripts. Reweight before comparing. The sim's single pass delta does not yet carry a team-specific script offset (Record 2.1's lesson). That offset, if built, replaces the generic trailing pass bump. It does not add to it. Cap the team offset at ±0.08 pass probability.
- Theme 3 (15230–15233). Prevent inflates volume. Leverage-adjusted EPA beats raw EPA. Backup production does not update a prior at full weight. `w_stat` already shrinks with injuries, which is directionally right, and then wrongly multiplies by the Timo damper.
- Theme 4 (15295–15298). Fourth-down price is full WP of the branches, not conversion rate. Timeout and challenge material is thin in the corpus. Do not invent a timeout kernel from this theme.
- Theme 5 (15374–15376). Personnel is a prior on the defensive response. The sim has no 11/12/21/13 state. A personnel EPA add without a box/shell response double-counts offensive quality. Cap, if built, `|Δ EPA/play| ≤ 0.03` inside that personnel state.
- Theme 6 (15452–15454). Effects were player- and team-specific. Blanket adjustments pointed the wrong way for someone. Stadium `altitude_home +0.3` is exactly the blanket the theme warns against, and it is not mockingboard ALTITUDE. QB identity beats a starter/backup flag (Record 6.1). The sim's 2x2 is per QB name, which matches the lesson. Do not also apply a generic backup EPA drop on a named QB who already has a profile.
- Theme 7 (15516–15518). Separate news not in the line from news already in the line. The 70/30 blend cannot tell those apart. It always pulls toward the posted number.
- Theme 8 (15594–15597). A yard is not a yard. Prevent completions are not fourth-quarter conversions. High yards and few points is failed conversion, not hidden quality. C-281 and WOPR, if wired as raw volume multipliers, violate this theme.

Session 5 gap list (15608–15614), so nobody treats the corpus as complete: timeout/challenge thin, schedule-spot thin, prevent thinly quantified, defensive scheme by score mostly general, end-of-half clock management not its own family.

## 6. Session 8 — what was verified, and the stale gap line

Verified from the session header (21952–21960): 333 newly dossiered posts (ON1 20, ON2 22, ON3 53, AM 32, midday 106, EXTRA100 100). Midday and EXTRA100 were x_search. Chart-image values on that route were not read and were not guessed. That constraint is load-bearing. Do not fill those images from memory.

Verified checks:

- U1 Koalaty funnel: 4 of 5 claims reproduced. DET-highest-PROE refuted under six definitions. Miami #1. Do not wire that PROE column (21968–21974).
- U2 missed tackles: endpoints reproduced from PFR. DET 12, DEN 56, CLE 51, PHI 49. The sim's mtkl modifier uses a 24.0 center and a /140 scale (1336). DET at 12 is (12−24)/140 = −0.086, which clips to −0.08. The best defense in the table is already on the clip. The scale is too tight to tell DET from the next tier, and too loose if someone removes the clip. Recenter on the reproduced distribution or widen the denominator. Do not treat the clip as a measured effect.
- U3 Vikings run fit: public EPA −0.110, rank 4, not −0.230 / #1. Use the owned digit.
- Signal-pack table (23210–23216): missed-tackle endpoints MATCH. RB EPA count MATCH (39 qualifiers; per-player values were image-only). Paired-flip REPRODUCED at K=1.75 → 1.36×. Throwaway rate DIVERGED (charter difference; do not import the post's 12.7%). RZ xTD, big-play quadrant, and quarter EPA are METHOD REPLICATED, not value-checked.

Stale sentence, do not repeat it: the end gap audit says the signal pack is not consumed (23773–23774) and the check-table header says the same (23208). On this branch the simulator consumes tables 01–06 inside the snap loop and consumes table 07 as a damper. Consumption is the finding. The gap that remains is the Session 3 C-records, which the file correctly says were homed and not built (23735).

Session 8 dossiers not re-read in full: the 333 compact entries, the nfl_simulator reproduction dossier, and EXTRA100 beyond the gap-audit rollup. Anything in those that is not cited above is NOT DETERMINED by this audit.

## 7. Math engine — what it can fence, and what it must not be asked to do

`effective_theory_and_large_deviations.py` does not contain TPRR, WOPR, havoc, ALTITUDE, or a ridge. It should not grow those formulas. It already has the fences:

- `cramer_large_deviation_tilt` (138–194): rare-event bound. Use it when a kernel claims a tail (long TD, multi-sack). Do not also shift the mean.
- `guarded_shrinkage_step` (964–995): shrinks by 0.799 only when `exceptional_persistence` is false. The simulator imports it and does not call it. The 0.35 raw-margin shrink at simulator line 1987 is an unlicensed cousin.
- `exact_decomposition_allowed` (930–937): corank ≥ 2 means a distribution, not a point. Crew, script, and coverage kernels are mixtures. They fail this gate if emitted as a single EPA add.
- `talisman_dependency_variance_multiplier` is called from the simulator (2147–2148) when the defense blitzes above 30 or a player is out. That is a variance inflate, which is the right direction for dependence. It does not license a mean add.

The Stage D `|Δ log-odds| ≤ 0.35` cap is not implemented in either file that this audit was asked to judge. The simulator's point clips are not a substitute. A 6-point margin clip on a 13.5 sigma is about 0.44 in a probit, which already sits outside 0.35 log-odds if it is treated as a probability move. NOT DETERMINED as a precise conversion in this pass. The operational rule is: new overlays enter in log-odds, and the sum of absolute overlays caps at 0.35, before the market gate.

## 8. NOT DETERMINED

- Whether ON3's Big Nickel post literally says 37%. The simulator comment says so. The sweep sections read in this pass do not quote that sentence. The wire is dead either way, because it tests sack rate.
- Whether Patton's article contains a `POE * P2S` survival curve. D2 as read does not. The product is in the task prompt, not in the cited dossier.
- WhiteBison's real anchor weight. UNVERIFIED in the file. His page was not fetched here either.
- WOPR coefficients. Unpinned on purpose.
- Havoc's exact public-PBP numerator. The MagicSportsGuy entry excludes sacks. C-316 does not write a formula.
- Full Session 8 chart values on the x_search route. The file says they were not readable and were not guessed. This audit does not guess them.
- Whether the 70/30 blend beats a last-comparison gate on settled rows. Not measured in this pass. The blend is a doctrine conflict, not a measured edge.

## 9. Clean sweeps (do not re-litigate)

- C-283, C-290, C-292 are BLOCKED-SOURCE (PFF or equivalent). Not leverage.
- C-296 referee ATS trends are DIAGNOSTIC-ONLY. The replacement is C-297, still unbuilt.
- Refereeinsider Week 5 record mismatch is why, not a side note.
- Koalaty PROE column is refuted under six definitions.
- Vikings −0.230 / #1 does not reproduce on public EPA.
- Throwaway-rate post values diverge from PFR. Top-group only.
- Signal pack is consumed on this branch. Stop filing "not consumed."
- `compute_weekly_bayesian_ridge_power_ratings` is not the snap loop. Stop calling it opponent-adjusted until the opponent index is a real schedule.

## 10. Gates

No test suite was run. This was a read audit. Exit codes: NOT RUN.

No commit. No push. The only write is this file.
