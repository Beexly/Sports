# MOVE-37 IRL (CARA) — Lab Audit 2026-09-13

**Script:** `~/workspace/gse-discovery/move37_irl_cara.py` (337 lines)
**Log:** `~/workspace/gse-discovery/move37_irl_cara_run.log` (exit 0)
**Headline result:** α̂=11.0, β̂=0.1, train NLL 1.0987046, test log-loss 1.0986889,
IRL accuracy 39.04% vs position-rule baseline 79.07%. Verdict: **NULL**.
**Auditor stance:** brutal. Findings below decide what goes back to DeepSeek.

## Verdict table

| # | Item | Verdict |
|---|------|---------|
| 1 | Counterfactual possession coordinates | **VERIFIED OK** |
| 2 | Kicking-team vs opponent WP orientation | **ISSUE FOUND — critical (2 defects)** |
| 3 | Score-differential orientation | **ISSUE FOUND** (same defect as #2a) |
| 4 | Kickoff position and time after made FGs | **MIXED** — position OK, time not modeled |
| 5 | Action-specific clock runoff | **ISSUE FOUND** |
| 6 | Field-goal probability calibration | **CANNOT VERIFY** (no check in script; no leakage) |
| 7 | Fixed punt-distance assumption | **ISSUE FOUND** (minor; protocol step skipped) |
| 8 | Missing down/distance in WP model | **ISSUE FOUND** (modeling bias, self-admitted) |
| 9 | α/β identification and utility normalization | **ISSUE FOUND — critical** |
| 10 | Leakage and label appropriateness | **No direct leakage; LABEL ISSUE FOUND** |
| 11 | Grid-boundary behavior | **ISSUE FOUND** |

---

## Evidence

### 1. Counterfactual possession coordinates — VERIFIED OK

nflverse `yardline_100` convention confirmed empirically from 2024 pbp (independent
check, 2026-09-13): 4th-down `field_goal` plays mean yl = **21.5** (n=1063),
4th-down `punt` plays mean yl = **65.3** (n=2119). Small yl = near the opponent's
goal; large yl = backed up. I.e. `yl = 100 − (yards from own goal)`. The script's
geometry docstring (lines 36–52) uses exactly this convention, and all five
branches check out under it:

- `wp_go_conv`, L212: `yl − emp_gain`, floored at 1. Gaining yards toward the
  opponent's goal decreases yl; 1 = goal line, cannot advance past it. ✓
- `wp_go_fail`, L213: `100 − yl`. Turnover spot x = 100 − yl yards from K's goal;
  D's yl measured from D's goal = 100 − (100 − (100 − yl))… concretely, K's own-1
  (yl=99) → D takes over at K's 1 → D's yl = 1 (one yard from scoring). ✓
- `wp_kick_make`, L214: 75 = opponent's own 25 after kickoff. ✓
- `wp_kick_miss`, L216: `100 − yl − 8`. Kick spot is 8 yards behind the LOS toward
  K's goal; D's yl = (100 − yl) − 8. LAB FIX 1's derivation is correct; the
  verbatim `+8` was a 16-yard error. ✓
- `wp_punt`, L218–220: `100 − yl + 40` (40 net yards away from K's goal);
  `punt_land > 100` → touchback → D at own 25 → yl = 75; else clipped [1, 99].
  LAB FIX 2's derivation is correct; the verbatim `−40` produced negative
  yardlines for yl > 60. ✓

The 79.07% position-rule baseline (`punt if yl > 40 else kick`, L300–302) is a
second independent confirmation of the convention: under the inverted reading it
would punt in FG range and could not score 79%.

### 2. Kicking-team vs opponent WP orientation — ISSUE FOUND (critical, 2 defects)

`predict_wp` (L127) returns P(**possession team** wins) — it is trained on
nflverse `wp`, which is posteam-oriented (L120–124). The decision-maker in every
branch is **K's coach**, so every branch must be scored as **K's** win
probability. The code does not do this.

**Defect 2a — `wp_kick_make` score-differential sign error (L214):**
```python
wp_kick_make = predict_wp(sd + 3, gsr, np.full_like(sd, 75, dtype=float))
```
After a made FG, K kicks off to D. D is the possession team, so the `sd`
argument must be D's differential: `-(sd + 3)`. The code passes `sd + 3` — K's
post-make differential — as if the *receiving* team were leading by sd+3.
At sd=0 it scores P(D wins | D up 3, own 25) ≈ 0.60 instead of
P(D wins | D down 3, own 25) ≈ 0.40. `U_kick_make` is systematically overstated,
inflating E_kick.

**Defect 2b — opponent-possession branches maximize the opponent's WP (L213,
L214, L216, L220, applied at L222–230):** `wp_go_fail`, `wp_kick_make`,
`wp_kick_miss`, `wp_punt` are all D's win probability, but they enter
`E_go / E_kick / E_punt` via `U(·)` directly — never as `1 − wp`. Since
`U(x; α) = −exp(−αx)/α` is strictly increasing for α > 0, the modeled "coach"
*maximizes the opponent's win probability* in 4 of 5 branches. Only `wp_go_conv`
(L212) is K-oriented. The three expected utilities are therefore not on a common
decision-maker scale; the softmax is comparing K's utility of converting against
D's utility of K's failures. This alone misspecifies the choice model and
 plausibly explains most of the NULL verdict: no (α, β) can fit coherent choices
to incoherent utilities, so the optimizer retreats to a near-uniform predictor
(see #9).

### 3. Score-differential orientation — ISSUE FOUND

- L212 `go_conv`: `sd` unchanged, no score change. ✓
- L213 `go_fail`: `−sd` (D's perspective). ✓ sign flip correct.
- L214 `kick_make`: `sd + 3`. **Wrong** — must be `−(sd + 3)` (defect 2a).
- L216 `kick_miss`: `−sd`. ✓
- L220 `punt`: `−sd`. ✓
WP-model training orientation is consistent (nflverse `score_differential` is
posteam − defteam, `wp` is posteam's). The single sign defect is L214.

### 4. Kickoff position and time after made FGs — MIXED

- **Position: OK.** L214 passes 75 → D at their own 25 post-kickoff
  (correct under the post-2018 NFL touchback rule). FIX 5's `full_like` repair
  is correct.
- **Time: not modeled.** `gsr` is passed through unchanged at L214 — no
  decrement for the FG attempt itself (~5–8 s of game clock) or the kickoff
  (~5–10 s). Late-game kick counterfactuals are evaluated with too much clock
  remaining, overstating comeback WP after a make. (Overlaps #5.)

### 5. Action-specific clock runoff — ISSUE FOUND

`gsr` is passed **unchanged** into all five `predict_wp` calls (L212–220). No
branch models any clock consumption: not the 4th-down play itself (live-ball
run/pass keeps the clock moving; ~5–40 s), not the punt play and return
(~10–15 s), not the FG attempt, not the kickoff. Because the fitted WP model is
steep in `game_seconds_remaining` late in halves/games, end-of-half and
end-of-game counterfactuals — exactly the states where 4th-down decisions carry
the most leverage — are systematically mis-scored. A credible repair decrements
gsr per branch (play-type-dependent means from the training sample, or at
minimum a constant per action) before scoring counterfactuals.

### 6. Field-goal probability calibration — CANNOT VERIFY

`p_fg` is nflverse's pre-play `fg_prob` column taken on trust (L205); the script
performs **no** reliability/calibration diagnostic, no binning check, and no
clipping of degenerate 0/1 values. What would be needed: a calibration curve of
`fg_prob` vs actual make rate on the training seasons (it is distance-based and
likely fine, but unverified in-script).
**No leakage:** `fg_prob` is a pre-play model estimate (distance-based); it does
not see the kick outcome. NaNs are dropped at the `fd` filter (L170–172).

### 7. Fixed punt-distance assumption — ISSUE FOUND (minor)

L218 hard-codes 40 net yards: `punt_land = 100 − yl + 40`. The header NOTE admits
the protocol required re-estimating this from the training sample and that it was
not done ("nflreadpy exposes no direct net-punt column; re-estimation is left as
a flagged follow-up"). 40 is a defensible league-average net, and the touchback
clip (L219) handles the long end, but: (a) the protocol's explicit verification
step was skipped; (b) **no sensitivity analysis** — the grid search never varies
it, so there is no evidence the (null) result is robust to 35 vs 45; (c) real
net distance is field-position-dependent (coffin-corner behavior near the
opponent's goal), which a constant cannot capture. Secondary to #2/#9, but the
repair round should either estimate it (punt-play `yards_gained`-style
reconstruction is possible from pbp) or bound it.

### 8. Missing down/distance in the WP model — ISSUE FOUND (modeling bias)

`WP_FEATS = ['score_differential', 'game_seconds_remaining', 'yardline_100']`
(L120) — no down, no yards-to-go. The script's own header NOTE concedes this.
Consequences for counterfactuals:

- After `go_conv`, the offense holds a **fresh set of downs** (1st-and-10/goal),
  but is scored at the *average-down* WP for that spot — which mixes in 3rd/4th
  downs and understates the true continuation value. This **biases the model
  against "go"** structurally.
- After `go_fail`, `punt`, and `kick_make`, the defense likewise gets 1st-and-10
  but is scored at average-down WP, understating D's WP in every
  opponent-possession branch (compounding defect 2b's orientation error with a
  level error).
- The bias is absorbed into (α, β) during fitting, so the parameter estimates
  cannot be read as a clean coaching risk-preference even if the other defects
  were fixed. A WP model with down/distance (or a fresh-downs adjustment) is
  required before any DeepSeek-facing claim about α.

### 9. α/β identification and utility normalization — ISSUE FOUND (critical)

- **Both estimates sit on the stage-2 grid boundary.** Stage 1 (L258–260) grid:
  α ∈ {…, 10.0} (max), β ∈ {0.5, …} (min); winner (10.0, 0.5) — already the
  corner. Stage 2 (L272–273): α ∈ [9.0, 11.0], β ∈ [0.1, 2.5]; final
  (11.0, 0.1) — α at the **top edge**, β at the **floor**. The NLL surface is
  still improving at the boundary in both directions; the true optimum lies
  outside the searched region. The reported "MLE" is a grid corner, not an MLE.
  Prereg criteria fail as a direct consequence: c2 (α ∈ [0.5, 5], L315) false,
  c4 (β ≥ 1, L317) false.
- **The fitted model learned nothing.** Train NLL = 1.0987046; ln(3) =
  1.0986123. The model is **0.00009 nats from a uniform randomizer** over the
  three actions. Test log-loss 1.0986889 says the same. β̂ = 0.1 flattens every
  logit; accuracy 39.04% is *below* the 54–60% always-punt rate because the
  incoherent utilities (see #2b) actively misrank actions.
- **Weak joint identification.** Under CARA + softmax there is a scale ridge:
  raising α compresses utility differences (differences → 0 exponentially in α),
  which larger β can offset, so (α, β) trade off along a near-flat NLL valley —
  consistent with the optimizer sliding to the (high-α, low-β) corner. The
  utility has **no normalization** (L191–196: `U = −exp(−αx)/α`, scale varies
  wildly with α), so β's magnitude is uninterpretable and the prereg β ≥ 1
  criterion was never well-posed. A normalized parameterization (e.g.
  U(0)=0, U(1)=1) or a profiled likelihood is needed before α means "risk
  aversion."

### 10. Leakage and label appropriateness — no direct leakage; LABEL ISSUE FOUND

- **No future leakage.** All counterfactual features (`ydstogo`,
  `yardline_100`, `score_differential`, `game_seconds_remaining`, `fg_prob`)
  are pre-play. Temporal split is clean: WP model, conversion model, and
  `emp_gain` all fit on seasons ≤ 2022; IRL evaluated on 2023–2024 (L121–122,
  L141, L183–184). nflverse `wp`/`fg_prob` targets are pre-play estimates.
- **Label appropriateness — selection bias in the conversion model (ISSUE).**
  The conversion model (L137–141) is trained **only on 4th downs where the
  coach chose go** (`play_type ∈ {pass, run}`, `fourth_down_converted` non-null)
  — a selected sample. Coaches attempt conversions precisely when success is
  likelier, so `p_conv` is **upward-biased for the punt/kick states** where it
  is then applied (L204). This inflates E_go exactly where coaches declined to
  go. No selection correction (e.g. Heckman-style, or bounding) is attempted.
  The discrete-action label itself (punt/kick/go from `play_type`, L176–181) is
  appropriate for choice modeling; the pass/run → go collapse is fine.

### 11. Grid-boundary behavior — ISSUE FOUND

Two-stage design failure: stage 1's winner was already the corner (α=10.0 at
coarse max, β=0.5 at coarse min, log line "Stage 1 best: alpha=10.0, beta=0.5").
Stage 2 recenters on that corner with a ±1.0 α window and a β floor of 0.1
(L272–273), so the refinement **cannot escape the boundary by construction** —
it walks from one corner to the adjacent corner (11.0, 0.1) and stops. Worse,
the NLL surface is flat at ≈ ln(3) across the entire grid (stage-1 best 1.0991
vs final 1.0987 vs uniform 1.0986), so the "best" grid point is noise among
near-uniform models. A trustworthy repair needs: (a) an unbounded or
log-spaced optimizer (no scipy allowed — coordinate ascent on a log grid, or
expand-then-refine with boundary *expansion*, not re-centering); (b) a
flat-surface diagnostic (report NLL − ln(3), not just NLL); (c) the boundary
hit must itself be a *finding* (parameters unidentified), not a point estimate.

---

## Bottom line for DeepSeek

The NULL verdict is **not** "coaches are noise" — the estimation setup is
misspecified in at least three compounding ways, any one of which invalidates
the α̂/β̂ point estimate:

1. **Orientation (fatal):** 4 of 5 utility branches score the *opponent's* WP
   (L213–220 → L222–230), and `kick_make` additionally flips the score
   differential sign (L214: `sd+3` must be `−(sd+3)`). The modeled coach
   maximizes opponent win probability on failures. Fix: `1 − wp` on every
   opponent-possession branch; `−(sd+3)` on the make.
2. **Identification (fatal):** (α̂, β̂) = (11.0, 0.1) is a grid corner, NLL is
   0.00009 nats from uniform — the model learned nothing and the optimum is
   off-grid. Unbounded search + utility normalization required.
3. **Biases (material):** no clock runoff anywhere (#5), average-down WP applied
   to fresh-downs states understating "go" (#8), conversion model trained on a
   selected go-only sample (#10), fixed 40-yard punt with no sensitivity run
   (#7), `fg_prob` never calibration-checked (#6).

Verified sound: counterfactual yardline geometry incl. both lab sign fixes (#1),
kickoff spot at the 25 (#4-position), no temporal/outcome leakage (#10-first
half). The correct next round is a **repaired repair**: fix orientation first,
then re-run identification on an unbounded grid with normalized utility, and
only then debate whether α is identified at all. Do not let the theorist cite
α̂ = 11.0 for anything.
