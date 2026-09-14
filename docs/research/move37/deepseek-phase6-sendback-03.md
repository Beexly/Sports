# SEND-BACK 03 — MOVE-37 Phase-6 adversarial audit
## PROJECT MOVE-37 | From: execution lab (Motif) via Garrett | 2026-09-14

**What this is:** the lab executed the orientation-only IRL repair, executed
three of your four white-space proposals to kill verdicts, and ran adversarial
audits on the T3/T7/T9/W3 protocols. Everything below is a numbered demand.
Answer point by point. Formatting, self-audit tables, and prior failure
acknowledgments are not evidence and buy nothing.

**Quarantine rule (standing):** every Phase-6 output is exploratory until it is
matched to a repaired preregistration AND passes the program's §4 testing
discipline. Nothing here is a discovery. The honest NULLs publish in the repo.

---

## §1. IRL Fix-1 — orientation confirmed as the fatal defect; REPAIR-01 does not get a victory

The lab changed ONLY the two mechanical orientation defects in your REPAIR-01
code (`1−wp` on all opponent-possession branches; `−(sd+3)` on the kick-make
branch). Same grid, features, split, models. Original script never modified.
Log: `gse-discovery/move37_irl_cara_fix1_run.log`.

| Metric | REPAIR-01 as-sent | Fix-1 (orientation only) |
|---|---|---|
| train NLL | 1.0987 (≈ ln 3, uniform randomizer) | **0.6438** (−0.4548 nats of structure) |
| (α̂, β̂) | (11.0, 0.1) — grid corner | **(−1.70, 22.0)** — different parameter space |
| test log-loss | 1.0987 | 0.6073 |
| test accuracy | 39.04% | 73.70% (position rule 79.07%) |

Your REPAIR-01 "MLE" was a grid corner of an incoherent estimator; the
orientation fix moved the estimate to an entirely different region of parameter
space. **The repair round is not a victory.** It fixed a fatal bug and exposed
deeper ones. Demands:

**D1 — unbounded β search.** β̂ = 22.0 sits at the top edge of the stage-2
window ([18, 22]) with NLL still improving at the edge. The boundary problem
persists in attenuated form. No β claim is admissible until the search is
unbounded or log-spaced. A boundary hit is itself the finding (parameters
unidentified), never a point estimate.

**D2 — account for α̂ < 0.** In this CARA parameterization negative α is
risk-SEEKING. The preregistered sign/range expectations are violated and the
prereg verdict is NULL (c1 F, c2 F, c3 F, c4 T). Orientation rescued
identification, not the theory. Before ANY claim about coaching risk aversion
is published, give us one of: (a) a substantive account of risk-seeking coaches
with independent evidence, or (b) an admission that the utility family is
misspecified and a replacement parameterization with a normalization argument.

**D3 — normalize the utility.** β remains uninterpretable under the
unnormalized `U = −exp(−αx)/α` (scale varies wildly in α), which is also what
made your preregistered β ≥ 1 criterion ill-posed. Required: a normalized
parameterization (e.g. U(0)=0, U(1)=1) or a profiled likelihood, with the
finiteness proof on the full pre-registered range, before any identification
claim.

The IRL lane stays quarantined as exploratory until D1–D3 are answered in
kill-criterion format. Do not cite α̂ for anything.

---

## §2. White-space families — executed and KILLED by the lab (2026-09-13/14)

Three of your four white-space proposals were executed on the frozen snapshot
(`data_snapshot_20260913`: 27 seasons 1999–2025, 1,279,628 pbp rows) under
pre-registered kill criteria taken from YOUR protocol. All three died.

### W1 — spectral analysis of within-drive play-call sequences: KILLED

- Test-era (2018–2025) incremental R² over baseline-2 OLS: **−0.0212** / **−0.0242**
  (two min-drive-length filters). Adding the 8 spectral features *hurts*
  out-of-sample. Your bet (≥ +0.03) is falsified with the sign reversed.
- Train-only lift (+0.0317) vanishing on validation (−0.0046) and test: pure
  overfit — 11 features on 381 rows.
- Placebo: p_shuffle = 0.388/0.478, p_synth = 0.343/0.408 — the observed
  statistic cannot be separated from noise under your own null.
- The flat-surface gate did NOT fire (CV of ‖S‖₂ = 0.107): rhythm signatures
  vary measurably across teams but carry zero predictive carry. An informative
  null. No deeper runs. The mechanistic story ("coordinated sequencing is a
  coach skill") has no out-of-sample support.

### W2 — Wasserstein distance from league play-mix: KILLED

- Test-era Spearman r = **0.0112**, 95% CI [−0.1165, 0.1403], perm p = 0.4346,
  BH q = 0.6518. Your bet (r ≥ 0.15) not met.
- Sign flip train (−0.0758) → test (+0.0112): regime artifact.
- Dumb-baseline duel LOST: W₂ r = 0.0112 vs **yardline-spread r = 0.0125** on
  identical test rows — confirming the concern that W₂ repackages
  field-position variance. Killed on K1/K2/K3/K5.

### W4 — change-point detection on within-game play-calling: KILLED (honest NULL)

- Test-era partial Spearman r = **−0.031**, 95% CI [−0.057, −0.005], negative
  in ALL THREE era splits, stable across replication seeds.
- Permutation null: observed −0.0313 is ~2.6 sd BELOW the null mean — the
  negative association is real, and it kills the hypothesis: **more mid-game
  strategy shifts weakly predict LOWER WPA.** The adaptive-coaching story is
  rejected with the sign reversed. (Mechanism available for free: trailing
  teams are forced to change plans; change-points index game state, not skill.)

**Lesson you are required to internalize:** your top-ranked proposal (W1 —
"the single proposal I would bet on") died on your own kill lines, and W4 died
with its story's sign flipped despite 2.6-sd data support. Stories are not
evidence. Killed means killed: no rescue runs, no re-runs with tweaked
penalties, no "but the story is clean" appeals. The lab's verdict process
works; the protocols that produced the kills were yours.

---

## §3. T3 — HMM regime-switching team states: REPAIR FIRST

Full audit: `phase6/SENDBACK-AUDIT/t3-t9-audit.md` (Part A). 8 defects.
Verdict: **REPAIR FIRST** — 2 independently fatal if unrepaired. Not killed
without compute; not executable as written.

**T3-D1 (FATAL):** the fit unit is specified three contradictory ways — §1.2
(pooled selection), §1.5 kill table (per-team 70% criterion), §1.6 pseudocode
(pooled refit), and the lab's PREREG/code (per-team pooled on all eras).
Freeze ONE spec before any run.

**T3-D2 (FATAL):** the kill criterion "K* ≥ 2 in ≥ 70% of team-seasons (fit per
team)" is a statistical artifact by construction. At n=16 games, the BIC
penalty 5·log(16) ≈ 13.9 nats nearly guarantees K=1. It manufactures a false
kill, not a finding. Strike it and replace with a pooled-selection criterion
with stated power, or show the power calculation.

**T3-D3 (MATERIAL):** no opponent-strength control. Emissions are raw
EPA/play; Baum-Welch assumes stationarity. The likeliest "discovery" is
schedule clustering — soft stretches of schedule decoded as "form states."
Repair: residualize EPA/play on opponent defensive quality before fitting; if
K*≥2 collapses to K*=1, the regimes were the schedule.

**T3-D4 (FATAL):** no temporal-permutation diagnostic. If game order within a
team-season is shuffled and BIC still selects K≥2, the "states" are
distributional splits, not temporal regimes. Add a shuffle gate BEFORE the
duel: failure kills the regime interpretation outright.

**T3-D5 (MATERIAL):** game-script confounding — a "bad state" may just be
garbage-time play mix, not form. Require a garbage-time/script control or
state the confound.

**T3-D6 (MINOR):** state labels unaligned across teams and across restarts;
**T3-D7 (MINOR):** the flat-surface diagnostic can pass on a shared spurious
mode; **T3-D8 (MINOR):** selection sees the test era (fit diagnostics must be
train-era only).

Dumb baseline for the duel: rolling-EPA(4) and Elo-OLS on next-game EPA/play,
HMM wins only at ≥ +0.02 R² on 2018–2025 (your margin, kept).

---

## §4. T7 — persistent homology on play clouds: REPAIR FIRST

Full audit: `phase6/SENDBACK-AUDIT/t7-w3-audit.md` (Part 1). 7 defects.
Verdict: **REPAIR FIRST**. The core duel (incremental R², honest era splits,
nested-CV ridge) is mechanically sound, but the permutation null as written is
a FATAL design defect.

**T7-D1 (FATAL):** the permutation null is vacuous. Persistent homology is
invariant to point ordering, so shuffling play order within a team-season
reproduces the identical persistence diagram (up to subsampling noise). Your
kill rule — "permuted increment within ±0.01 of true → spurious" — either
self-fires as a tautology or tests nothing. Program §4.4 already prescribes
the correct nulls ("shuffle the target; run the pipeline on synthetic null
data"); your protocol violates the program's own rule. Repair: replace with
Null A (permute team-season labels/target, ≥200 reps) and Null B
(per-team-season Gaussian null clouds through the FULL Rips→PI→ridge pipeline —
the true "topology beyond moments" test). Fail either → family dies.

**T7-D2 (MATERIAL):** stop claiming "sustained drives" / "trajectories" from
season-collapsed clouds. All temporal structure is destroyed before the first
Rips call; an H1 loop in 1,000 unordered plays cannot mean a drive. Test
drives-as-curves or strike the language from the record.

**T7-D3/D4 (MINOR, cheap):** standardize coordinates on train-era plays ONLY;
fit the PersistenceImager pixel grid on train-era diagrams ONLY; add the
franchise-continuity mapping to the t→t+1 join (OAK→LV 2020 sits inside the
test era and a naive abbreviation join silently drops it).

**T7-D5/D6/D7 (MINOR):** state the power reality (400 PI features on ~850
team-seasons; test n≈224 — the honest prior is ~85–90% NULL); the CV gate has
low power as an informativeness screen; discrete-`down` layering artifact
noted.

Likely value of T7 if repaired: a well-executed negative. That is acceptable
output. A well-executed null is the moat.

---

## §5. T9 — causal forest, 4th-down aggressiveness: REPAIR FIRST (borderline)

Full audit: `phase6/SENDBACK-AUDIT/t3-t9-audit.md` (Part B). 6 defects.
Verdict: **REPAIR FIRST, borderline** — 2 independently fatal to the estimand
as specified.

**T9-D1 (FATAL):** Y = game win is the wrong outcome. A single 4th-down
decision moves WP by ~2 points against ~0.5 SD of game noise; worse, your
Var(CATE) > 0.01 gate demands heterogeneity LARGER than the plausible effect
itself — the protocol strangles true signals while selecting for noise
artifacts that clear the variance gate. Repair: Y := play-level WPA, and
re-derive ALL gates from a train-era pilot power calculation. (You marked Y
SPECULATIVE yourself.)

**T9-D2 (FATAL for the pooled estimand):** T=0 collapses punt and field-goal
attempt — two different interventions with different payoff structures, chosen
in different field positions. Consistency is violated; the estimand answers a
question no coach asks. Repair: two separate estimands (τ_punt, τ_FG) or do
not run.

**T9-D3 (MATERIAL):** decisions are clustered within games/coaches; your
permutation shuffles T within propensity bins ignoring game-level clustering —
SEs anti-conservative, null miscalibrated. Repair: block permutation at the
game level; cluster-robust inference.

**T9-D4 (MATERIAL):** unconfoundedness is asserted, and weak orthogonalization
is a flag instead of a kill. Repair: propensity AUC < 0.60 or outcome R² <
0.03 → family DIES (flag-and-continue is the exact pipeline through which
estimation noise clears the Var(CATE) gate disguised as heterogeneity). Plus:
measured-confounder augmentation (nflverse HAS temperature/wind/roof — unused
in your covariate list) and a Cinelli–Hazlett robustness value on the policy
gap.

**T9-D5 (resolved in code):** the apparent double orthogonalization is not a
bug — the lab's pipeline feeds raw (X,T,Y) to CausalForestDML and uses γ only
for calibration/AIPW scoring. One clarifying line in the PREREG suffices.
**T9-D6 (MATERIAL, partial):** duel-honesty gaps beyond the era split —
policy evaluation must be cross-fit against CATE estimation, not scored on
the same folds.

Dumb baseline for the duel: homogeneous-ATE policy and historical-frequency
policy on identical test rows; heterogeneous policy wins only at ≥ 0.02
win-probability (your margin, kept) — evaluated via AIPW on cross-fit folds.

---

## §6. W3 — Fisher-Rao division clustering: KILL WITHOUT COMPUTE

Full audit: `phase6/SENDBACK-AUDIT/t7-w3-audit.md` (Part 2). Verdict: **KILL
WITHOUT COMPUTE as a discovery family.** `d_FR` survives as a descriptive
side-statistic only.

**W3-D1 (FATAL as a discovery):** the "discovery" is mechanically
near-guaranteed. Division-mates play each other twice (~35% of the schedule),
share common opponents, and share game scripts — similar play-context
distributions are a fact about the NFL schedule, not a machine discovery.
There is no predictive or decision-relevant estimand, no §4.6 dumb-baseline
duel (a significance test is not a duel), and it cannot satisfy program §7 by
construction.

**W3-D2 (MATERIAL):** game-script confounding is uncontrolled — the 36 cells
measure situations faced, score differential isn't among them, trailing teams
face systematically different situations. Any future citation of divisional
`d_FR` clustering must control for score-differential-distribution distance
(kill if the control moves d from ≥0.1 to <0.1).

**W3-D3 (MATERIAL):** no kill criterion tied to anything decision-relevant.
Your own bet was "weakly" and the protocol concedes it "cannot be an edge" —
a family whose ceiling is "interesting structure" is a hypothesis generator,
not a discovery. Re-admission requires a genuinely new predictive estimand
with a real duel. The lab will not spend BH budget on it.

---

## §7. Verdict table

| Family | Verdict | Terms |
|---|---|---|
| IRL (CARA) | QUARANTINED — repair round 3 required | D1–D3 answered in kill-criterion format |
| T3 (HMM) | REPAIR FIRST | Freeze one fit unit; strike 70% criterion; shuffle gate; opponent residualization |
| T7 (topology) | REPAIR FIRST | Replace vacuous permutation null (Null A + Null B); train-only feature construction; franchise mapping |
| T9 (causal forest) | REPAIR FIRST (borderline) | Y := play-level WPA; split punt vs FG; kill on weak nuisances; block permutation |
| W1 (spectral) | KILLED (lab) | Executed; obituary in repo |
| W2 (Wasserstein) | KILLED (lab) | Executed; obituary in repo |
| W3 (Fisher-Rao) | KILLED WITHOUT COMPUTE | Descriptive side-statistic only |
| W4 (change-point) | KILLED (lab) | Executed; hypothesis rejected, sign reversed |

## §8. The three sharpest demands (answer these first, in order)

1. **IRL D2:** α̂ = −1.70 is risk-seeking. Either produce a substantive,
   independently evidenced account of risk-seeking coaches, or admit the
   utility family is misspecified and supply a normalized replacement with a
   finiteness proof. No risk-aversion claim is publishable until this is
   answered.
2. **T7:** your permutation null tests nothing — persistent homology does not
   see point order. Ship Null A (target permutation, ≥200 reps) and Null B
   (Gaussian null clouds through the full pipeline) or the family does not
   compute.
3. **T9:** the outcome must change to play-level WPA with gates re-derived
   from a pilot power calculation, and punt must be split from field-goal
   attempt. The current estimand buries a ~0.02 signal in ~0.5 SD noise behind
   a variance gate larger than the effect — it selects for noise.

## §9. What comes back

One package per family you want re-admitted: the repaired protocol section
(only what changed, with line references to the original), kill criteria in
the §1.5/§2.5/§3.5 table format, and the §5 self-audit updated with the new
numbers' tiers. Anything missing a named dumb baseline, a valid null, or
kill criteria goes back unread. The lab executes; you theorize. That division
of labor has now been earned seven times over.

---
*Lab-side audit files: `phase6/SENDBACK-AUDIT/t3-t9-audit.md`,
`phase6/SENDBACK-AUDIT/t7-w3-audit.md`, `phase6/SENDBACK-AUDIT/draft-irl-w123.md`
(draft sections merged above). Fix-1 log:
`gse-discovery/move37_irl_cara_fix1_run.log`.*
