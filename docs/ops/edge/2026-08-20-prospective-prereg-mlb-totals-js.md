# Prospective Pre-registration — MLB Totals Side-Adaptive Asymmetric Fractional E-Process with James-Stein Shrinkage

**Status: ARMED, NOT FIRED. This track is not open and no pick made under it
is live.** It fires only if the MVE certifies (`E_n >= 20` at a scheduled
checkpoint) and the founder signs the block at the bottom of this file.

**Why this document exists before the result.** A prospective protocol written
after the retrospective result is known is not a pre-registration, it is a
narrative fitted to an outcome. Freezing it now — while the MVE capital path
does not exist anywhere, in any file, in anyone's head — is the only version of
this document that carries evidential weight. Every number, window, threshold
and rule below is fixed as of 2026-08-20 and may not be changed after the MVE
result is observed. If any of it is changed after that point, this track is
void and must be republished as a new pre-registration under a new hash.

Frozen: 2026-08-20, before the MVE's first observation.
Supersedes: the placeholder "Prospective Pre-registration Template" section of
`docs/ops/edge/2026-08-20-mve-prereg-v2.md`, which this document replaces in
full. That file remains the binding pre-registration of the retrospective MVE.
Related amendment: `2026-08-20-mve-prereg-v2.md` section "Amendment v2.1".

## 0. Gating state (read this before using anything below)

| Gate | State as of 2026-08-20 |
|---|---|
| MVE executed | **NO.** Blocked before first observation (ledger C-59): runtime `DATABASE_URL` pointed at localhost, `pg` returned `28P01`, no Neon URL in env. No capital, no `n`, no exclusion count exists. |
| MVE certified (`E_n >= 20`) | **NO.** Not evaluable; the experiment has not run. |
| This prospective track open | **NO.** |
| Founder signature | **NOT SIGNED.** |
| Frozen model hash | **NOT RECORDED.** The model this track requires is not yet implemented. See section 5. |

Nothing in this document may be quoted, published, or rendered on a public
surface as a claim of edge. Under the charter's non-negotiables: do not claim
an edge that the e-process has not certified.

## 1. Mechanism

MLB full-game totals. A hierarchical James-Stein shrunk outcome model is scored
against the Shin de-vigged no-vig entry market at the 6–3h pre-game window. One
bet per game, side chosen by a frozen deterministic rule before the outcome is
known. Evidence accumulates as a single nonnegative supermartingale.

## 2. Entry and market probability (frozen)

- **Entry window:** exactly 6–3h before scheduled first pitch. No other window
  is computed, not even diagnostically.
- **Entry price quality bar:** book-quoted, quote age <= 15 minutes, >= 3 books
  contributing. A game with no qualifying entry price is EXCLUDED, and every
  exclusion is counted and reported. Exclusions are never backfilled with a
  later or earlier price.
- **Market probability source:** Shin de-vig over the qualifying book set at
  entry, giving the no-vig over probability `m_t`.
- **Line:** the total `L` quoted at entry. The line used for grading is the
  entry line, never the closing line.
- **Pushes:** a game whose total runs equal `L` exactly is a push. Pushes are
  not graded, do not enter the capital path, and are counted and reported
  separately from exclusions.

### 2.1 The null this track certifies against (binding, and not the MVE's null)

The MVE's null is stated against the **de-vigged** market probability. This
prospective track's null is the **vig-inclusive** composite null carried over
from the round-2 protocol: for each game, with `D_i` the decimal price actually
available at entry on the bet side,

> `p_t <= b_i`, where `b_i = 1 / D_i`

and the e-process runs with `m_bet = b_i`. This is stricter than the de-vigged
null and it is the only version under which a prospective result means the bet
was worth making at a price a person could actually get. The founder's
disclosure sentence ("the market probability is an upper bound") is true under
this reading, because here "market probability" is the vig-inclusive implied
probability. **Substituting the de-vigged number into a prospective increment
voids the track.**

## 3. Model specification (frozen)

**Amended 2026-08-21, before any MVE observation was graded (Amendment v2.2 —
supersedes the 2026-08-20 text of this section in full).** The original text of
this section named six feature families (starting pitcher FIP/xFIP, bullpen
recent usage, park factor, weather forecast, umpire plate zone history, and
rest/travel). A repo-wide schema and pipeline check on 2026-08-20 found four of
those six — pitcher, bullpen usage tied to a starter, park factor, weather, and
umpire — structurally unreachable from any real `Game` row today: no
`Player`/pitcher join exists on `Game` anywhere in production, no
`Stadium`/`Venue`/`Park` model exists in the schema at all, MLB weather is never
fetched or persisted for any game, and umpire is present only as an
always-`false` shadow flag the real pipeline never populates. There is no way to
build the original spec tonight without fabricating values for those four
families, which CLAUDE.md's Non-Negotiable Rules #1 and #2 (no fake data, no
fabricated stats) forbid outright, independent of charter fidelity. This
amendment replaces the model with the largest one that is real, buildable
tonight, and does not touch any of those four families. It is recorded before
this cycle's first observation is graded, per the reopening condition already
established by Amendment v2.1.

1. **Outcome target:** total runs scored in the game,
   `y = homeScore + awayScore`. A single scalar per completed game. No
   home/away split, no other outcome metric.

2. **Model form:** a team-level empirical-Bayes shrinkage estimator of each
   team's historical "game total" tendency, feeding a two-parameter
   negative-binomial (NB2) tail probability. This is the negative-binomial link
   permitted by this section's original point 2, chosen and frozen here, before
   the track opens. It replaces the six-feature hierarchical Poisson/NB
   regression this section previously named.

3. **Feature inputs — the only inputs this model may use, all strictly
   pre-game:**
   - Each team's own history of total runs (`homeScore + awayScore`) from
     games it has already played earlier in this walk-forward, at the moment
     the current game is scored. Nothing else.
   - **No pitcher, bullpen, park, weather, or umpire input of any kind** — not
     modeled, not approximated, not imputed by a placeholder constant. These
     four feature families are what the schema check found them to be: absent
     from the schema entirely (pitcher, park, weather) or present only as an
     always-`false` shadow flag never populated by the production pipeline
     (umpire). Wiring a constant "group mean" in their place would not add
     real signal — every game would receive the identical value — which is a
     fabricated feature no matter how it is labeled, and is exactly what rules
     #1/#2 prohibit. **Do not implement a fallback that imputes any of these
     four.**
   - `restDaysHome`/`restDaysAway`, `isBackToBackHome`/`isBackToBackAway`,
     `scheduleDensityHome`/`scheduleDensityAway` (on `Game`, computed by
     `context-enrichment.ts` from real `TeamGameLog` history) are confirmed
     real, populated, and reachable — but are **explicitly out of scope for
     this cycle.** The shrinkage estimator in point 7 below operates on one
     scalar group mean per team; this section defines no mechanism for a
     second covariate to enter it, and inventing one tonight — the same night
     the transform, the shrinkage formula, and the citation are also being
     corrected — would itself be an unfrozen research degree of freedom. These
     three fields are named here as the first candidate for the next
     amendment, to be designed and frozen only after this cycle is graded.

4. **Transform: square-root (Anscombe), `y = sqrt(x + 3/8)`,
   `Var(y) ~ 1/(4n)` per observation** — the count-rate-metric row this section
   already froze on 2026-08-20. Not arc-sine (that row is for proportion
   metrics; this model uses none). Not `log(x + 0.5)` — a transform that was
   never in this section's frozen metric table and does not carry the same
   `Var(y) ~ 1/(4n)` property the shrinkage formula in point 7 assumes.

5. **Per-team observation and pooled variance, walk-forward** (only games
   already completed before the current one; the current game and any
   later-commencing game are never used):

   ```
   X_i = mean( sqrt(y_g + 3/8) )   over team i's own past games g
         where y_g = homeScore_g + awayScore_g of game g
         (undefined if n_i = 0; see point 7's degenerate case)

   s^2 = pooled sample variance of sqrt(y_g + 3/8) across ALL teams' past
         games combined, up to the current game
         (frozen fallback: if fewer than 8 past games exist league-wide,
         s^2 = 0.04)

   D_i = s^2 / n_i        # team i's sampling variance; undefined if n_i = 0
   ```

6. **Grand mean:** `Xbar` is the **simple, unweighted arithmetic mean** of
   `X_i` across the `k` teams with `n_i >= 1`. (This section's earlier text
   called this a "precision-weighted grand mean"; that description does not
   match Efron-Morris (1975) section 3's actual formula for the unequal-`n`
   case, nor the worked example in point 9 below, and is corrected here. Using
   a precision-weighted mean instead of the simple mean will not reproduce the
   locked `theta` values in point 9.)

7. **Shrinkage — Efron-Morris (1975) section 3, unequal-sample-size,
   positive-part**, exactly as already frozen elsewhere in this section:

   ```
   k       = number of teams with n_i >= 1 at this point in the walk-forward
   A_hat   = max(0, (sum_i (X_i - Xbar)^2 - sum_i D_i) / k)     # k >= 3 required
   B_i     = D_i / (A_hat + D_i)          # if A_hat + D_i == 0, B_i = 1
   theta_i = Xbar + (1 - B_i) * (X_i - Xbar)
   ```

   - `k >= 3` is required for shrinkage to apply, unchanged from this
     section's original rule. If `k < 3`, every team is left unshrunk:
     `theta_i = X_i`.
   - If `n_i = 0` for a team, there is no observation to shrink: treat
     `X_i` as `Xbar` and `B_i = 1` (full shrinkage to the grand mean). This is
     the correct degenerate case of this same real estimator, not a
     group-mean imputation of a missing feature.
   - **No limited-translation cap.** A cap of this shape is real in the
     Efron-Morris literature, but it comes from the 1971/1972 papers, is
     table-driven and tunable by a parameter `s ∈ [0,1]`, and has no universal
     constant. A fixed `c = 1.5 * sqrt(D_i)` cap is not supported by the cited
     source, and the literature dossier's own verdict on it is **GATE, not
     ADOPT**, pending a separate amendment. Dropped for this cycle. `theta_i`
     is used exactly as computed above, with no post-hoc adjustment.

8. **Back-transform and game-level mean**, computed walk-forward, before the
   current game's outcome is available:

   ```
   mu = max(MU_FLOOR, ((theta_home + theta_away) / 2) ^ 2 - 3/8)
   ```

   using this section's own square-root back-transform
   (`x = theta_hat^2 - 3/8`), applied once to the average of the two teams'
   shrunk values. **Not `exp()`** — that is only correct for a log transform,
   which this section does not use. `MU_FLOOR` is a small positive constant
   (e.g. `0.5`) recorded in code and covered by the frozen model hash, guarding
   the NB2 tail helper against a non-positive mean; every game where the floor
   binds is logged.

9. **Over probability:** NB2, dispersion `phi = 12` fixed (matching the
   existing particle filter's initialization — an over-dispersion choice
   recorded here, satisfying this section's requirement that any
   negative-binomial link be chosen and frozen before the track opens):

   ```
   q_t^O = nbOverProb(mu, phi, L)
   ```

   using the existing NB2 tail helper in
   `packages/prediction-engine/src/research/nb-rbpf.ts`, **exported** (it is
   currently module-private) and called directly — not reimplemented. `L` is
   the entry line from section 2 (the median line across qualifying books at
   entry, never the closing line).

10. **Online update:** recomputed after every completed game using only that
    game's and all earlier games' data, in strict `commenceTime` order. A
    team's own current game is never in its own history at the moment `theta`
    is computed for that game, and no later-commencing game is ever in an
    earlier game's history. No same-slate leakage.

11. **Determinism:** this model is closed-form arithmetic — no sampling, no
    particle filter, no seed anywhere in the path from game history to `q_t`.
    It reproduces `q_t` bit-for-bit on the same inputs by construction; no
    seed needs to be recorded.

12. **Locked worked example** (required unit test, tolerance `1e-3` on
    `theta`):

    ```
    k = 4 teams, X = [2.1, 2.2, 2.0, 2.4], n = [4, 20, 4, 8], s^2 = 0.04
    D = [0.01, 0.002, 0.01, 0.005]
    Xbar = 2.175
    sum (X - Xbar)^2 = 0.0875
    sum D = 0.027
    A_hat = max(0, (0.0875 - 0.027) / 4) = 0.015125
    B = [0.398010, 0.116788, 0.398010, 0.248447]
    theta = [2.129851, 2.197080, 2.069652, 2.344099]
    ```

    These `theta` values correct the worked example previously circulated in
    `docs/ops/edge/2026-08-20-mve-builder-brief.md`: its `D_i`, `Xbar`,
    `sum(X-Xbar)^2`, `sum D_i` and `B_i` all check out against this same
    arithmetic, but its stated final `theta` values do not follow from its own
    formula — they are off by roughly 15x, 35x and 113x this section's 1e-3
    tolerance on three of the four teams. Any test fixture locking `theta`
    must use the values above.

Sections 2 (entry and market probability) and 4 (side selection and the
e-process) are unchanged by this amendment.

## 4. Side selection and the e-process (frozen)

**Side selection (deterministic, computed before the outcome):** with `q_t` the
model over probability and `m_t` the market over probability at entry,

- if `q_t > m_t`, bet the OVER;
- if `q_t <= m_t`, bet the UNDER (ties go UNDER).

For an OVER bet: `q_bet = q_t`, `m_bet = m_t`, `W_t = 1` iff the total goes
over. For an UNDER bet: `q_bet = 1 - q_t`, `m_bet = 1 - m_t`, `W_t = 1` iff the
total goes under. No other selection rule may be used or computed.

**Increment (lambda = 0.3, one process, one bet per game):**

```
E_t = 1 + 0.3 * ( W_t * (q_bet / m_bet) + (1 - W_t) * (1 - q_bet) - 1 )
```

Capital is the running product of increments, starting at 1. Every increment is
bounded below by `1 - lambda = 0.7`, so capital cannot be destroyed by a single
observation.

**Validity.** The increment's conditional expectation is linear in the true
probability and is `<= 1` at both `p = 0` and `p = m_bet`, hence `<= 1`
throughout `p <= m_bet`. A predictable side-selection rule composed with the
asymmetric increment yields a nonnegative supermartingale under the per-side
composite null (DeepSeek round-3 review verdict, 2026-08-20: PROVEN). Because
the side is chosen predictably and only one process is ever run, there is no
multiplicity correction to make and none is applied. The miss term is
`(1 - q_bet)`, **not** `(1 - q_bet) / (1 - m_bet)`; the latter is the point-null
form and is invalid here.

**Three disclosures about this e-variable, recorded so nobody has to discover
them later.**

1. *The name is ours.* None of Ramdas-Grunwald-Vovk-Shafer (2023),
   Waudby-Smith-Ramdas (2024), Grunwald-de Heide-Koolen (2024) or Shafer
   (2021) uses the phrase "asymmetric fractional e-variable". It is a
   house name for the increment above, not a citation. Public copy must never
   imply the term is established literature.
2. *The nonnegativity condition is satisfied by construction.*
   Waudby-Smith-Ramdas require a predictable `lambda` in
   `(-1/(1-m), 1/m)` so capital stays nonnegative. Our increment's minimum
   over both outcomes is `1 - lambda * max(q_bet, 1) = 1 - lambda = 0.7 > 0`,
   independent of `m_bet`, so `lambda = 0.3` satisfies the condition for every
   game with no per-game check needed.
3. *Why certification happens only at scheduled checkpoints.* Grunwald et al.
   separate optional **continuation** (multiplying study-level e-variables)
   from data-level optional **stopping**, which needs a sequentially
   decomposable model; stopping on a finer filtration than the one that built
   the process can break validity. Certifying only at pre-scheduled `n` keeps
   the stopping rule on the coarse filtration the protocol declared in
   advance. That is the reason for the rule in section 6, not squeamishness.

## 5. Frozen model hash (procedure, not a placeholder)

**Frozen model hash: `61865dc9d922b12241810995ba6a261db48d33937881531e4669a17ab6cabff4`**

The hash is not a number someone types in later from memory. It is produced
mechanically by `scripts/edge-lab/freeze-model-hash.mjs`, which SHA-256s each
file in a fixed manifest and then SHA-256s the sorted `path  digest` lines into
one composite digest. The manifest covers the model source, the e-process
source, the runner, and this pre-registration itself, so the hash changes if
either the code or the protocol changes.

Recording procedure, in order, before the track opens:

1. Land the section-3 model and point the runner's `q_t` source at it.
2. Run `node scripts/edge-lab/freeze-model-hash.mjs`. If any manifest file is
   missing, the script exits non-zero and prints the missing paths; the hash is
   not recorded until it exits 0.
3. Paste the composite digest into the line above, replacing "NOT RECORDED",
   in the same commit that records the founder signature.
4. Thereafter, `node scripts/edge-lab/freeze-model-hash.mjs --check <digest>`
   must exit 0 before every graded batch. A mismatch means the model or the
   protocol moved mid-experiment, which voids the track from the point of the
   change and must be published as such.

## 6. Thresholds, checkpoints and outcome rules (frozen)

- **Checkpoint cadence:** every 50 graded picks, starting at `n = 50`. Pushes
  and exclusions do not count toward `n`.
- **Certification threshold:** `E_n >= 20` at a scheduled checkpoint. Capital
  touching 20 between checkpoints does not certify; only scheduled checkpoints
  certify. This is deliberate and removes the incentive to look continuously.
- **Kill threshold:** `E_n <= 0.10` at any checkpoint. Kills are published
  immediately, not at the next content cycle.
- **Early abort:** capital `< 0.01` after 50 graded picks aborts the track, the
  kill is published, and the edge program closes.
- **No middle state persists.** The track ends certified, killed, or "did not
  certify, did not survive". "Promising but inconclusive" is not an outcome
  this protocol can return.
- **Reporting at every checkpoint:** current capital, `n` graded, chronological
  capital path, maximum drawdown, threshold crossings at 2 / 5 / 10 / 20,
  exclusion count with reasons, push count, and any imputed features. Published
  whether the number is good or bad.
- **Variants:** none are permitted. If any variant is ever run, every variant
  and its path is published alongside the primary.

## 7. What voids this track

Recorded in advance so it cannot be argued about later. Any one of these voids
the track, and the void is published with the capital path up to that point:

1. Any change to the model, features, transforms, shrinkage family structure,
   seed, window, lambda, side-selection rule, entry-quality bar, or null after
   the track opens.
2. A `--check` hash mismatch against the recorded digest.
3. Grading against a line other than the entry line, or backfilling an excluded
   game.
4. Any feature that turns out to have used post-entry information.
5. Selective reporting of checkpoints, or a checkpoint computed but not
   published.
6. Opening the track without an MVE certification at a scheduled checkpoint.

## 8. Disclosure language (verbatim, required on every public surface)

> "This test uses the side-adaptive asymmetric fractional e-process for the
> composite null that the market probability is an upper bound. The e-process
> capital starts at 1 and accumulates evidence against this null. Certification
> requires E_n ≥ 20 at a scheduled checkpoint. Kills are published immediately.
> Historical back-test results are not evidence; this is a forward-looking
> test. All hyperparameters, entry windows, side selection, shrinkage method,
> and the model hash were frozen before the experiment began."

## 9. Signature block

This track does not open until every line below is filled by the founder, in a
commit, after an MVE certification exists.

```
MVE final capital at certification checkpoint : ______________________
Certification checkpoint n                     : ______________________
Frozen model hash (composite digest)           : ______________________
Founder signature / date                       : ______________________
```

Until then this file is a frozen protocol and nothing more.
