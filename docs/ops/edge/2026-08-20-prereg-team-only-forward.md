# Prospective Pre-registration — MLB Totals: Team-Only Forward Efron-Morris Shrinkage

**Status: ARMED, NOT FIRED. This track is not open and no pick made under it
is live.** It fires only on a recorded survive-or-kill of the team-only model
on the forward window and a `FOUNDER_YES` from the founder. No
`FOUNDER_YES` exists at the time of this writing.

**Why this document exists before any forward data is touched.** A prospective
protocol written after the result is known is a narrative fitted to an outcome,
not a pre-registration. Freezing it now — while no forward observation has
been graded under this track — is the only version with evidential weight.
Every number, window, threshold, and rule below is fixed as of this file's
commit SHA and may not be changed after any forward game is graded.

Frozen: 2026-08-20, before any forward observation.
Supersedes: nothing — this is the sole binding pre-registration for the
team-only forward track. The killed H-F5 pre-registration
(`docs/ops/edge/2026-08-20-mve-prereg-v2.md`) governs the retrospective cycle
on the 337-bet corpus only; this document does not reopen or amend it.

## 0. Gating state (read before using anything below)

| Gate | State as of 2026-08-20 |
|---|---|
| MVE team-only model implemented | YES. `packages/prediction-engine/src/research/mve-team-only-js.ts` (frozen hash below). |
| Forward data graded under this track | NO. Sample window starts strictly after this file's commit SHA time. |
| This prospective track open | NO. |
| Founder signature (`FOUNDER_YES`) | NOT SIGNED. |
| Frozen model hash | Recorded below (composite from `freeze-team-only-hash.mjs`). |

Nothing in this document may be quoted, published, or rendered on a public
surface as a claim of edge. Under the charter's non-negotiables: do not claim
an edge that the e-process has not certified.

## 1. Mechanism

MLB full-game totals. The team-only Efron-Morris shrinkage model
(`mve-team-only-js.ts`) is scored against the Shin de-vigged no-vig entry
market at the 6–3h pre-game window. One bet per game, side chosen by a frozen
deterministic rule before the outcome is known. Evidence accumulates as a
single nonnegative supermartingale.

## 2. Model specification (frozen — `mve-team-only-js.ts`)

The outcome model is the team-only log-totals shrinkage model. It is a
distinct module from the killed H-F5 model (`mve-model-js.ts`,
hash `ec15120bbfdb01997417f377c5c11b8ee547254cb8263f544dbe02966a607de8`).

1. **Outcome target:** total runs scored in the game (`y = home + away`).
2. **Transform:** `log(y + 0.5)` for every past game, per team.
3. **Team-level statistic:** `X_i = mean of log(y_g + 0.5)` over team `i`'s
   past games (y = home + away for each game the team played).
4. **Grand mean:** `Xbar = unweighted mean` of the `k` team-level `X_i`
   (not game-weighted). `k` = teams with `n_i >= 1`.
5. **Pooled variance:** `s^2 = Bessel sample variance` (denom `n-1`) of all
   past game-level `log(y+0.5)`. If fewer than 8 past games league-wide,
   `s^2 = 0.04` (constant `MVE_TO_POOLED_VAR_FALLBACK`).
6. **Variance of each team mean:** `D_i = s^2 / n_i` (NOT `1/(4n)`).
7. **k guard:** `k = teams with n_i >= 1`. If `k < 3`, no shrinkage
   (`theta_i = X_i`; `n_i = 0` units still get `theta_i = Xbar`).
8. **Between-team prior:**
   `A_hat = max(0, (sum_i (X_i - Xbar)^2 - sum_i D_i) / k)`.
9. **Shrinkage weight (B_i weights the GRAND mean, not the data):**
   `B_i = D_i / (A_hat + D_i)`; denom 0 -> `B_i = 1`.
10. **Shrunk estimate:**
    `theta_i = Xbar + (1 - B_i)(X_i - Xbar)`.
    **Never** `Xbar + B_i * (X_i - Xbar)`.
11. **Limited translation (frozen `c = 1.5`, constant `MVE_TO_C`):**
    `delta = B_i * (X_i - Xbar)`; `theta = X_i - delta`.
    If `|delta| > 1.5 * sqrt(D_i)`, replace delta with
    `sign(delta) * 1.5 * sqrt(D_i)`.
12. **Predicted log-mean for a game:** `(theta_home + theta_away) / 2`.
    `mu = exp(that / 2)`.
13. **Model over probability:**
    `q_t = P(Y > L | mu, phi=12)`, computed via the NB2 tail using the
    exported `logNbPmf` from `nb-rbpf.ts` (only `logNbPmf` is imported; the
    `NbRbpf` class is never used). `phi = MVE_TO_PHI = 12` (frozen constant).
    `L` is the entry line, never the close.
14. **Determinism:** no `Math.random`, no `Date`. Re-running on the same
    inputs reproduces `theta` and `q_t` bit-for-bit.

Worked numbers (locked in test, tol 1e-3):
```
k=4, X=[2.1, 2.2, 2.0, 2.4], n=[4, 20, 4, 8], s²=0.04
D=[0.01, 0.002, 0.01, 0.005]
Xbar=2.175
sum (X-Xbar)²=0.0875
sum D=0.027
A_hat=max(0,(0.0875-0.027)/4)=0.015125
B=[0.397015, 0.116788, 0.397015, 0.248447]
θ=[2.129776, 2.197080, 2.069478, 2.344099]
```
If the implementation produces `[2.145, 2.197, 2.105, 2.231]`, B was used as
the data weight and the formula is void.

## 3. Entry and market probability (frozen)

- **Entry window:** exactly 6–3h before scheduled first pitch. No other window
  is computed, not even diagnostically.
- **Entry price quality bar:** book-quoted, quote age <= 15 minutes, >= 3 books
  contributing. A game with no qualifying entry price is EXCLUDED, and every
  exclusion is counted and reported. Exclusions are never backfilled.
- **Market probability source:** `shinDevig` over the qualifying book set at
  entry (`scripts/edge-lab/run-mve.ts`, `entryForGame`), giving the no-vig
  over probability `m_t`. Do not switch `m` to vig-inclusive.
- **Line:** the total `L` quoted at entry. The line used for grading is the
  entry line, never the closing line.
- **Pushes:** a game whose total runs equal `L` exactly is a push. Pushes are
  not graded, do not enter the capital path, and are counted and reported
  separately from exclusions.

### 3.1 The null this track certifies against

The market's de-vigged probability of the bet side is an upper bound on its
true probability: `p_t <= m_t` (or `1 - m_t` for the under side). The e-process
runs with `m_bet = m_t` (over) or `m_bet = 1 - m_t` (under).

## 4. Side selection and the e-process (frozen — `mve-eprocess.ts` as-is)

**Side selection (deterministic, computed before the outcome):** with `q_t` the
model over probability and `m_t` the market over probability at entry,
- if `q_t > m_t`, bet the OVER;
- if `q_t <= m_t`, bet the UNDER (ties go UNDER).

For an OVER bet: `q_bet = q_t`, `m_bet = m_t`, `W_t = 1` iff the total goes over.
For an UNDER bet: `q_bet = 1 - q_t`, `m_bet = 1 - m_t`, `W_t = 1` iff the total
goes under. No other selection rule may be used or computed.

**Increment (lambda = 0.3, frozen `MVE_LAMBDA`):**
```
E_t = 1 + 0.3 * ( W_t * (q_bet / m_bet) + (1 - W_t) * (1 - q_bet) - 1 )
```
The miss term is `(1 - q_bet)`, not `(1 - q_bet) / (1 - m_bet)`.
Capital is the running product of increments, starting at 1. Every increment
is bounded below by `1 - lambda = 0.7`.

**Validity.** The increment's conditional expectation is linear in the true
probability, `<= 1` at both `p = 0` and `p = m_bet`, hence `<= 1` throughout
`p <= m_bet`. A predictable side-selection rule composed with the asymmetric
increment yields a nonnegative supermartingale under the per-side composite
null. One process, one bet per game, no multiplicity.

## 5. Frozen model hash (composite digest)

**Frozen composite hash:**
`[to be recorded after T02 commit — see ledger C-69 and commit message]`

Produced mechanically by:
```
node scripts/edge-lab/freeze-team-only-hash.mjs
```
The manifest (T01+T02 scope) is:
```
packages/prediction-engine/src/research/mve-team-only-js.ts
scripts/edge-lab/freeze-team-only-hash.mjs
docs/ops/edge/2026-08-20-prereg-team-only-forward.md
```
**Do NOT add these files to the frozen H-F5 MANIFEST in
`freeze-model-hash.mjs`** — that would move the killed cycle's hash
(`ec15120bbfdb01997417f377c5c11b8ee547254cb8263f544dbe02966a607de8`).

## 6. Thresholds, checkpoints and outcome rules (frozen)

- **Checkpoint cadence:** every 50 graded picks, starting at `n = 50`.
  Pushes and exclusions do not count toward `n`.
- **Certification threshold:** `E_n >= 20` at a scheduled checkpoint.
  Capital touching 20 between checkpoints does not certify.
- **Kill threshold:** `E_n <= 0.10` at any checkpoint. Kills are published
  immediately.
- **Early abort:** capital `< 0.01` after 50 graded picks aborts the track;
  the kill is published; the edge program closes for good.
- **No middle state persists.** The track ends certified, killed, or "did not
  certify, did not survive."
- **Reporting at every checkpoint:** current capital, `n` graded,
  chronological capital path, max drawdown, crossings at 2/5/10/20,
  exclusion count with reasons, push count. Published whether good or bad.
- **Variants:** none are permitted. If any variant is ever run, every variant
  and its path is published alongside the primary.

## 7. Sample (frozen — the forward window only)

**Sample:** MLB totals games whose `commenceTime` is **strictly after**
this file's commit SHA time (commit `ddb94bd2`,
`2026-08-20T16:36:35-05:00`). Explicit: **Not the H-F5 337.** Not Track E
discovery. The team-only model never reads a future `y`; each game's
`q_t` is computed from past games only, strictly before that game's outcome.

**FIRE=no.** `FOUNDER_YES` is required to set FIRE=yes. No real-data e-process
is run under this track tonight.

## 8. What voids this track

Any one of these voids the track, and the void is published with the capital
path up to that point:

1. Any change to the model, features, transforms, shrinkage family structure,
   seed, window, lambda, side-selection rule, entry-quality bar, or null after
   the track opens.
2. A `--check` hash mismatch against the recorded composite digest.
3. Grading against a line other than the entry line, or backfilling an excluded
   game.
4. Any feature that uses post-entry information.
5. Selective reporting of checkpoints.
6. Opening the track without a recorded survive-or-kill of the team-only model
   on the forward window and a `FOUNDER_YES`.

## 9. Disclosure language (verbatim, required on every public surface)

> "This test uses the side-adaptive asymmetric fractional e-process for the
> composite null that the market probability is an upper bound. The e-process
> capital starts at 1 and accumulates evidence against this null. Certification
> requires E_n >= 20 at a scheduled checkpoint. Kills are published immediately.
> Historical back-test results are not evidence; this is a forward-looking test.
> All hyperparameters, entry windows, side selection, shrinkage method, and the
> model hash were frozen before the experiment began."

## 10. Kill rule (unchanged)

`E <= 0.10` at a checkpoint -> KILL. No amendment mid-cycle. No second look.

If team-only KILLs on this window: stop. No retune. No second look.

## 11. Signature block

This track does not open until every line below is filled by the founder, in a
commit, after the team-only model records a survive-or-kill on the forward
window.

```
Forward survive-or-kill recorded : ______________________
Certification checkpoint n       : ______________________
Final capital at checkpoint      : ______________________
Frozen composite hash            : ______________________
FOUNDER_YES / date             : ______________________
```

Until then this file is a frozen protocol and nothing more.
