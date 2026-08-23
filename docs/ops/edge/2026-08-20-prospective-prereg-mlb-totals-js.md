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

The outcome model is a hierarchical count model with James-Stein shrinkage on
its group-level parameters. Implementation must match this section exactly; a
deviation is a new model and requires a new hash and a new pre-registration.

1. **Outcome target:** total runs scored in the game.
2. **Model form:** hierarchical Poisson regression on total runs, or separately
   on home and away runs with the game total as their sum. Over-dispersion may
   be handled by a negative-binomial link **only if that choice is recorded in
   the frozen hash before the track opens**; it may not be selected after
   seeing prospective outcomes.
3. **Feature inputs, all strictly pre-game and all observable at entry time:**
   - team rolling offensive and defensive metrics, last 30 days
   - starting pitcher FIP/xFIP and recent form
   - bullpen recent usage: pitches thrown in the prior 3 days
   - park factor
   - weather forecast: temperature, wind, humidity
   - umpire plate zone history
   - rest days, travel distance, home/away
   No feature may use information timestamped after the entry moment. Any
   feature unavailable at entry for a given game is imputed by its frozen
   group mean, and the imputation is logged per game.
4. **Shrinkage construction:**
   - Transform each group-level metric to an approximately normal, roughly
     variance-stabilized scale before shrinking:
     - **proportion metrics** (rates bounded in [0,1]): arc-sine,
       `y = arcsin(sqrt(p))` with `Var(y) ~ 1/(4n)`;
     - **count-rate metrics** (runs, strikeouts, pitch counts): square-root
       (Anscombe) transform, `y = sqrt(x + 3/8)` with `Var(y) ~ 1/(4n)`.
     The transform assigned to each metric is fixed in the frozen metric table
     and may not be chosen at runtime. This split is recorded explicitly
     because "convert to approximately normal scale" is otherwise a researcher
     degree of freedom, and an unfrozen degree of freedom is how an e-process
     gets quietly tuned.
   - Apply the **positive-part James-Stein estimator, multiple-sample-size
     variant**, per group-level parameter `i` within each shrinkage family.
     The binding operational form is **Efron-Morris (1975) section 3**, the
     unequal-sample-size shrinker:

     ```
     theta_hat_i = theta_bar + (1 - B_i) * (theta_i - theta_bar)
     B_i        = D_i / (A_hat + D_i)
     A_hat      = max(0, tau2_hat)          # positive part
     ```

     where `D_i = sigma_i^2` is parameter `i`'s own sampling variance
     (`1/(4 n_i)` under both transforms above), `A_hat` is the estimated prior
     variance of the family, and `theta_bar` is the precision-weighted grand
     mean. `B_i` is the shrinkage weight: large sampling variance (small
     `n_i`) gives `B_i` near 1 and pulls the estimate hard toward the family
     mean, which is the intended multiple-sample-size behavior.

     **Recorded because it changes the arithmetic.** The founder's charter
     writes the shrinkage factor as
     `max(0, 1 - ((p-2) * sigma^2) / sum_j (theta_j - theta_bar)^2)`. That is
     the **equal-variance special case**; the two forms coincide when every
     `n_i` is equal. The unequal-variance display in James and Stein (1961) is
     an existence bound for known unequal variances, not an operational
     estimator, and it prescribes no analogue of the constant `p - 2`. Efron
     (2010) and Tweedie recover James-Stein only under **common** sampling
     variance, and supply neither the arcsine nor the unequal-n layer. So the
     charter's formula stands as the equal-variance case, and Efron-Morris
     section 3 is what the code implements. Source:
     `docs/ops/edge/2026-08-20-ten-cluster-literature-stack.md`, James-Stein
     section (Grok background pass, 2026-08-20).
   - **`p >= 3` is required** for shrinkage to apply. A family with `p < 3` is
     left unshrunk (identity), because the James-Stein dominance result does
     not hold below three parameters. This is stated so the code cannot
     silently shrink a two-parameter family and call it James-Stein.
   - Back-transform before use: `p = sin(theta_hat)^2` for arc-sine families,
     `x = theta_hat^2 - 3/8` for square-root families.
5. **Online update:** the model is refit after every completed game using past
   data only. Shrinkage targets, family means and shrinkage factors are
   recomputed from the expanding history only. No future game, and no game from
   the same slate, may inform a pick on that slate.
6. **Over probability:** from the posterior predictive distribution of total
   runs under the shrunk model,

   ```
   q_t^O = P(total runs > L | shrunk model)
   ```

   with `L` the entry line. For a half-run line this is unambiguous. For an
   integer line, the push mass `P(total = L)` is excluded from both sides and
   the game is handled per the push rule in section 2.
7. **Determinism:** any stochastic step (sampling, particle counts, seeds) is
   seeded from a constant recorded in the frozen hash. Re-running the model on
   the same inputs must reproduce `q_t` bit-for-bit. A model that cannot
   reproduce its own probabilities cannot be audited and may not open a track.

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

**Frozen model hash: NOT RECORDED — the model of section 3 is not implemented.**

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
