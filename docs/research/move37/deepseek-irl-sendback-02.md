# SEND-BACK 02 — MOVE-37 IRL (CARA) repair failed lab audit
## PROJECT MOVE-37 | From: execution lab (Motif) via Garrett | 2026-09-13

Your REPAIR-01 (CARA utility, cleaned formulas, completed tables) is received.
The lab executed it verbatim on nflverse 2014–2024 (531,234 plays; WP/conversion
models fit ≤2022, IRL evaluated 2023–2024). Result: α̂=11.0, β̂=0.1, NLL 1.0987,
accuracy 39.04% vs 79.07% position-rule baseline. Verdict: NULL.

**The NULL verdict is rejected as evidence.** The estimation setup is
misspecified in compounding ways. A NULL from a broken estimator proves nothing
about coaching risk preference. Do not cite α̂=11.0 for anything.

## FATAL 1 — orientation: the modeled coach maximizes the OPPONENT's win probability

`predict_wp` returns P(possession team wins) — nflverse `wp` is posteam-oriented.
The decision-maker in every branch is K's coach, so every branch must be scored
as K's WP. It is not:

- `wp_go_fail`, `wp_kick_make`, `wp_kick_miss`, `wp_punt` are all D's WP but
  enter expected utilities directly, never as `1 − wp`. CARA utility is strictly
  increasing in its argument, so the "coach" maximizes D's WP in 4 of 5 branches.
  Only `wp_go_conv` is K-oriented. The softmax compares K's utility of converting
  against D's utility of K's failures — incoherent scale, unfixable by any (α,β).
- `wp_kick_make` additionally has a sign error: after a made FG, K kicks off, so
  D is the possession team and the differential argument must be `−(sd+3)`. The
  code passes `sd+3` (K's post-make differential scored as the RECEIVER's lead).
  At sd=0 this scores P(D wins | D up 3) ≈ 0.60 instead of P(D wins | D down 3)
  ≈ 0.40 — systematically overstating E_kick.

Fix: `1 − wp` on every opponent-possession branch; `−(sd+3)` on the make.

## FATAL 2 — identification: the "MLE" is a grid corner on a flat surface

- Stage-1 winner was already the corner (α=10.0 at coarse max, β=0.5 at coarse
  min). Stage 2 recenters on that corner with a ±1.0 α window and β floor 0.1 —
  it cannot escape the boundary by construction. Final (11.0, 0.1): α on the top
  edge, β on the floor. The true optimum is off-grid in both directions.
- Train NLL = 1.0987046 vs ln(3) = 1.0986123. The model is **0.00009 nats from a
  uniform randomizer**. β̂=0.1 flattens every logit. The model learned nothing.
- CARA + softmax has a scale ridge: α compresses utility differences
  exponentially while β offsets, so (α,β) slide along a near-flat valley. The
  utility is unnormalized (`U = −exp(−αx)/α`, scale varies wildly in α), so β's
  magnitude is uninterpretable and the preregistered β ≥ 1 criterion was never
  well-posed.

Fix: unbounded or log-spaced optimizer (no scipy in lab — coordinate ascent on a
log grid, or expand-then-refine with boundary EXPANSION not re-centering);
normalized parameterization (e.g. U(0)=0, U(1)=1) or profiled likelihood;
report NLL − ln(3) as the flat-surface diagnostic; treat a boundary hit as the
FINDING (parameters unidentified), not a point estimate.

## MATERIAL (fix in the same round)

3. **No clock runoff anywhere.** `gsr` passes unchanged into all five
   counterfactual branches. No branch models clock consumption (play, punt,
   FG attempt, kickoff). The WP model is steep in `game_seconds_remaining`
   late — exactly where 4th-down leverage lives. Decrement gsr per branch
   (play-type means from the training sample, minimum a per-action constant).
4. **Fresh-downs scored at average-down WP.** After `go_conv` the offense has
   1st-and-10 but is scored at average-down WP (mixes 3rd/4th downs) —
   structurally biases against "go". Same level error understates D's WP in
   every opponent branch. Needs down/distance in the WP model or a fresh-downs
   adjustment before α means "risk aversion."
5. **Selection-biased conversion model.** Trained only on 4th downs where the
   coach chose go — coaches attempt when success is likelier, so `p_conv` is
   upward-biased exactly in the punt/kick states where it is applied. Correct
   or bound it.
6. **Fixed 40-yard net punt, no sensitivity.** Protocol required re-estimation;
   skipped. Run the grid at 35/45 or estimate from the sample.
7. **fg_prob never calibration-checked.** Pre-play column taken on trust. Bin it
   against actual make rates on training seasons.

## Verified sound (keep)

Counterfactual yardline geometry incl. both lab sign fixes; kickoff spot at the
25; no temporal or outcome leakage (clean ≤2022 / 2023–2024 split).

## Required in your response

Repaired WP-1 only (do not re-send other work packages unless the fix changes
them): corrected orientation throughout, normalized utility with finiteness
proof on the full pre-registered range, re-derived (α, β) pre-registration under
the repaired spec in kill-criterion format, unbounded identification procedure
with the flat-surface diagnostic, and the §5–§7 biases addressed or explicitly
bounded with the bound stated.
