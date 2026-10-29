# ENGINE_METHOD.md — GSE pre-seal operators

**Week:** 2026-W44 · **Sealed center:** week-2026-W44 (parent seal `faab2827…`)
**Branch:** `engine/public-baseline-2026-10-24` · **Status:** changes uncommitted

This note records every pre-seal tool added or completed in this pass, confirms
that each one writes only into the candidate baseline, and restates the
read-only boundary around the sealed center.

---

## 1. New pre-seal tools

All operators below run **before** the Tuesday 04:00 CT seal. None calls
`seal()`, none mutates the sealed `tau`, and none flips an `ENABLED` flag.

| Tool | Module | Writes to | Purpose |
|---|---|---|---|
| `estimatePartialPooling` | `src/gse-pre-seal/ppm-estimator.ts` | candidate baseline | Hierarchical partial-pooling estimator: `R_i ~ N(mu, tau^2)`, `y_ij ~ N(R_i - R_j + HFA, sigma^2)`, empirical-Bayes weight `w_i = (n_i/sigma^2)/(n_i/sigma^2 + 1/tau^2)`. Writes the shrunken rating vector. |
| `runGibbsSampler` | `src/gse-pre-seal/samplers.ts` | candidate baseline | Full-conditional Gibbs sampler stub: `R_i | rest`, `mu | rest`, `tau^2 | rest`. Pre-seal only. |
| `runNutsStub` / `leapfrogStep` / `isUTurn` | `src/gse-pre-seal/samplers.ts` | candidate baseline | NUTS/HMC stub with leapfrog integrator, U-turn check `(theta+ - theta-) * p- < 0 or … * p+ < 0`, and dual-averaging step-size adaptation (target accept 0.8) frozen after warmup. Pre-seal only; **must never be invoked by a mid-week operator**. |
| `applyQuantileTable` | `src/gse-pre-seal/quantile-consumer.ts` | candidate baseline | Sealed-config delta consumer. Table: intercept -2.25, roof -0.39, wind/10mph +0.33, precip +0.05, division +0.64, tau 0.1/0.9 band. Pure function; no seal call, no tau mutation. |
| `multiplicativeDevig` | `src/gse-pre-seal/devig-helper.ts` | none (pure) | DK trueOdds correction. Converts an American-odds pair to implied probabilities, devigs multiplicatively, then subtracts the measured `+0.0537` favorite residual. Sample implied sum 1.045795. |
| `devigTotalToFairLine` | `src/gse-pre-seal/devig-helper.ts` | none (pure) | Converts a devigged over/under pair to a fair total line by inverting a normal fitted to the model's P10/P90. Standard normal inversion — no distribution invented. |
| `runConformalDiagnostic` | `src/gse-pre-seal/conformal-diagnostic.ts` | candidate baseline | Split-conformal residual band at alpha = 0.1. Residual = model_total − devigged external total. `resolveExternalTotal` routes every observation through the devig path first; raw totals are used only as a tagged fallback. Flags outliers and persists the residual vector as evidence. |
| `injuryRealloc` | `src/gse-pre-seal/injury-operator.ts` | candidate baseline | The only injury path. Sinkhorn reallocation under the sealed cost matrix, then sealed EPA dropoff. Reads candidate hash before/after to prove `hash_unchanged`. Attached to all 13 week-7 games carrying a non-empty `keyInjuriesOut` flag. |
| `seal` / `SealBrokenError` | `src/gse-pre-seal/verify_engine.py` | sealed center (once) | Refuses to re-seal the current ISO week without `force=True`. Raises `SEAL BROKEN` on tamper. |
| `belief_manifold` gate | `src/gse-pre-seal/verify_engine.py` | none | `ENABLED=false`. Emits `GATE REFUSAL: belief_manifold is ENABLED=false; mid-week operators cannot invoke it`. |
| SBR multi-market collector | `C:/Users/Garrett/Downloads/collect_circa.py` | local SQLite | Polls SBR point-spread, totals, and money-line pages on a 15-second loop. Sharp-move detector at 0.5-point threshold. |

---

## 2. Candidate-baseline-only writes

Every pre-seal operator above writes to exactly one file:

```
candidates/2026-10-25-week7-candidate.json
```

The candidate carries `parent_seal_hash = faab2827…` (the week-2026-W44 seal).
The merge contract in `candidate-baseline.ts` / `verify_engine.py` refuses to
write when the candidate's parent hash differs from the caller's, so a candidate
cannot silently drift onto a different seal.

**Current candidate hash:** `3988c7a6b3260247fbd54a1e9f937709bf4e371301f3177605d80d7dd9466bfc`
**Operators applied:** `conformal`, `init`, `partial_pooling`

The prior candidate hash `70bd7243…` was the pre-run state. This run re-ran
`init` (reset=True) so the PPM write registers as a real change; the candidate
now carries the shrunken rating vector and the devigged conformal residuals.

---

## 3. Mid-week operators remain read-only on the sealed center

The sealed center holds the Tuesday 04:00 CT lock: recovered `tau`, the coach
mindset hash, the sealed cost matrix, and the sealed EPA dropoff table. After
the lock:

- Mid-week operators **read** those artifacts; they never write them.
- `injuryRealloc` may change execution weights only. It must not call
  `recoverTau`, must not touch the mindset hash, and must not replace the cost
  matrix or EPA table. `assertTauSealed` is the backstop.
- `belief_manifold` stays `ENABLED=false`; invoking it emits the GATE refusal.
- The quantile table applies as a **sealed-config delta** — it shifts projected
  totals, not the sealed `tau`.
- No operator in this package calls `seal()`. Promotion from candidate to sealed
  center is a separate Tuesday step and requires `force=True` to re-seal an
  already-sealed week.

---

## 4. Verification results (2026-10-26)

| Test | Result |
|---|---|
| Post-seal tau tamper raises SEAL BROKEN | PASS |
| `injury_realloc` leaves baseline hash identical (13 games) | PASS |
| Quantile table application leaves baseline hash identical | PASS |
| `belief_manifold` emits GATE refusal | PASS |
| Conformal diagnostic returns band + outlier flags | PASS |
| `collect_circa.py` sharp-move detector synthetic test | PASS |
| PPM writes shrunken rating vector to candidate | PASS |
| Gibbs/NUTS stubs are pre-seal only | PASS |
| `multiplicativeDevig` unit tests (45-market sample) | PASS (9/9) |

Conformal band at alpha=0.1: **[-1.7577, +1.7577]**, 13 observations, 0 flagged,
coverage 1.0. The band tightened from ±3.14 because every observation now
routes through the devigged path instead of treating the vigged total as fair.
Residuals persisted in the candidate.

Injury operator: 13 week-7 games processed, `hash_unchanged: true` on all 13,
`mass_loss: 0.153` per game (same synthetic share template — the slate carries
injury text, not per-player target shares).

---

## 5. Known limitations

- **Week 7 sample size.** 13 games and 26 teams is underdetermined for a full
  rating fit. The iterative empirical-Bayes ridge converges to a tight prior
  (`tau ≈ 0.001`, `sigma ≈ 4.77`), so shrinkage is weak. The mechanics are
  correct; the estimate needs more weeks of data to stabilize.
- **PHI@WAS and KC@DEN do not exist in week 7.** The week-7 slate contains 13
  games and neither matchup is among them. The injury operator was instead
  attached to all 13 games that carry a non-empty `keyInjuriesOut` flag. Residual
  collapse was not observed because the share template is synthetic — the slate
  carries injury *text*, not per-player target shares. The operator mechanism is
  verified; the specific PHI@WAS / KC@DEN outliers cannot be tested without games
  that are not in the data.
- **nflverse injuries CSV covers weeks 1-3 only.** The on-disk snapshot
  (`data/gse-dataset/current/injuries_2026.csv`) has zero week-7 rows. The
  slate's `keyInjuriesOut` field is the authoritative week-7 injury flag and was
  used as the attachment condition.
- **Circa book slug.** SBR's default book list does not include Circa. The
  `poll_circa_via_aggregator` function is a documented stub until a public
  aggregator URL carrying Circa is confirmed. No auth bypass, no client gate.
- **SBR market pages.** Totals and money-line each need their own URL; the
  default page is point-spread only. All three are now polled per cycle.

---

---

## 5b. Pre-seal vs diagnostic boundary (MCMC / Hawkes / CQR)

None of these re-opens the week-2026-W44 seal.

| Layer | Class | Writes | When it runs |
|---|---|---|---|
| MCMC rating hierarchy (HMC + Gibbs on `R_i`, `mu`, `tau^2`) | Pre-seal | Next candidate baseline (posterior mean or thinned draws), hashed at the following Tuesday seal | Pre-seal only; never mid-week |
| Hawkes regime classifier (`hawkes.py`) | External diagnostic | `docs/ops/hawkes-regime-*.json` evidence stream | Anytime; reads poller event timestamps |
| CQR (`apps/web/lib/calibration/cqr.ts`, `ensemble/cqra-t.ts`) | Diagnostic | Nothing in the sealed loop | May sit beside the split-conformal diagnostic; no seal write |

- **MCMC**: posterior means track the empirical-Bayes point estimates within
  0.002 (BUF +0.1363 vs EB +0.1381; BAL +0.1123 vs +0.1106), posterior sd ≈
  0.028 per team, `tau^2` 95% interval [0.00360, 0.01001] contains the point
  value 0.0055. Diagnostics: accept 0.79, split-R̂ 1.0019.
- **Hawkes**: `lambda(t) = mu + sum alpha*exp(-beta*(t-t_i))`, branching ratio
  `n = alpha/beta`. On the synthetic n=0.6 series the short-window MLE recovers
  n=0.322 and classifies `self_exciting`; the real poller series currently has
  1 event, so the estimator returns `insufficient_events` and claims no regime.
  Regime classification only — not a precise n.
- **CQR**: split-conformal on quantile regression, conformity
  `E_i = max(lo(x_i)-y_i, y_i-hi(x_i))`, band at the `(1-alpha)(1+1/n)` quantile
  of E. Adaptive-width and finite-sample coverage; conservative when n is small.

---

## 6. Overnight-6 exhaustion note

Two consecutive full searches over the gse-pre-seal module and the candidate
baseline returned **zero actionable hits** that could be fixed without inventing
math or bypassing a human gate:

- **Search 1** (TODO/FIXME/XXX/HACK/ACTIONABLE/UNRESOLVED markers): zero hits.
- **Search 2** (unimplemented stubs, placeholders, unhandled paths): only the
  intentional Gibbs/NUTS pre-seal stubs and documented proxy fallbacks. Neither
  is actionable — the stubs are spec'd as pre-seal-only and the proxy fallbacks
  are explicitly tagged in the evidence.

**overnight-6 exhausted.**

### Files changed in this pass

| File | Change |
|---|---|
| `packages/prediction-engine/src/gse-pre-seal/devig-helper.ts` | Added `normalInvCdf` and `devigTotalToFairLine`; retained `multiplicativeDevig` + `FAVORITE_RESIDUAL` (0.0537) and `SAMPLE_IMPLIED_SUM` (1.045795). |
| `packages/prediction-engine/src/gse-pre-seal/conformal-diagnostic.ts` | Added `resolveExternalTotal` and routed every observation through the devigged, bias-corrected path. |
| `packages/prediction-engine/src/gse-pre-seal/verify_engine.py` | Attached `injury_realloc` to all 13 week-7 games carrying `keyInjuriesOut`; added `multiplicative_devig`, `devig_total_to_fair_line`, and the devig-aware conformal loader. |
| `packages/prediction-engine/src/gse-pre-seal/__tests__/devig-helper.test.ts` | 45-market sample unit tests (9/9 passing). |
| `ENGINE_METHOD.md` | This note. |

**Not changed:** the sealed center (`candidates/sealed-center.json`, merkle
`23245bcbba04`, tau 0.42), the `belief_manifold` `ENABLED=false` flag, and the
`force=True` re-seal gate.

*Nothing here is committed. The branch stays dirty on
`engine/public-baseline-2026-10-24`.*
