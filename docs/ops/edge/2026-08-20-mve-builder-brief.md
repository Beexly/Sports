# H-F5 MVE — builder brief (one recipe)

Read this before touching the MVE. Do not open DeepSeek shares, do not mix James-Stein formulas, do not hunt pitcher IDs.

**You are implementing one walk-forward `q` and feeding it to an already-frozen e-process.** If a choice is not in this file, it is not in scope.

---

## 0. What is frozen (do not edit)

| Item | Location | Rule |
|---|---|---|
| E-process formula, λ=0.3, side rule, checkpoints, kill/cert | `packages/prediction-engine/src/research/mve-eprocess.ts` | Do not change. If the file is missing on your branch, copy it from this path on `hermes/hf5-mve` / local Sports tree. GitHub **main** may not have it. |
| Prereg | `docs/ops/edge/2026-08-20-mve-prereg-v2.md` | Windows, Shin-devig, ≥3 books, quote age ≤15 min, one bet per game, no other λ/window. |
| Runner skeleton | `scripts/edge-lab/run-mve.ts` | Keep entry quality, exclusion counting, RESULTS.md writer. |

**Do not import** `jamesSteinShrink` from `packages/prediction-engine/src/edge-lab/kelly.ts`. That function shrinks **edges toward zero**, zeros k≤2, and is for Kelly staking. Using it as `q` is a bug.

**Do not** apply Waudby-Smith/Ramdas `λ ∈ (-1/(1-m), 1/m)` as an extra game filter. That interval is for capital `1+λ(X−m)`. Our increment is a different functional, already ≥ 0.7 and composite-null valid. λ stays 0.3.

**Do not** search GitHub for `eprocess` (Windows kernel). Our files are `mve-eprocess.ts`, `forecast-skill-eprocess.ts` (wrong null — do not use), `bernoulli-eprocess.ts` (wrong null — do not use).

---

## 1. What you are adding (and why)

`NbRbpf` is **not** a per-team random-effect model. Each particle assigns units to type 0/1 and Laplace-fits **seven** βs (intercept + six dummies) with ridge. The MVE runner currently sets `nPitchers: 1`, `nUmpires: 1`, and every game uses `pitcherHome: 0`, `pitcherAway: 0`. There are **no starter IDs on `Game`**. Do not hunt ESPN/pitcher joins for this cycle.

That is why `q` can hug the prior mean (~P(Y > line | μ=8.5)) and echo the market.

**This cycle’s model `q`:** walk-forward **team-level** Efron–Morris (1975 §3) on **log totals**, then NB2 tail probability. `NbRbpf` stays as the particle engine you already have; **do not rewrite it**. If you keep calling `predictOver`, it is a **diagnostic only**, not the primary `q` that enters the e-process.

Primary `q` comes from the new module below.

---

## 2. One formula (the only JS you implement)

Scale: **log runs**, not arcsine. Arcsine is for batting averages. Totals are counts.

For each team \(i\) at game \(t\), using **only past games** that team already played in this walk-forward (n_i ≥ 1; if n_i = 0, use the grand mean and B_i = 1):

- Observation: \(X_i = \overline{\log(y_g + 0.5)}\) over that team’s past games (y = homeScore+awayScore of those games). Same X_i is used for “team strength on the log-total scale.” Home/away split is **out of scope** this cycle (no park-adjusted offense/defense split unless it is already sitting in memory; do not add it).
- Shared observation variance: pooled \(s^2\) of those log totals across all past games (all teams). If fewer than 8 past games league-wide, set \(s^2 = 0.04\) (frozen fallback; ~20% CV on a total of 8.5).
- Sampling variance: \(D_i = s^2 / n_i\).
- Prior variance (method of moments, positive part):

```
A_hat = max(0, (sum_i (X_i - Xbar)^2 - sum_i D_i) / k)
```

k = number of teams with n_i ≥ 1. If k < 3, skip shrinkage: θ̂_i = X_i (or Xbar if n_i = 0).

- Shrinkage:

```
B_i = D_i / (A_hat + D_i)          // if A_hat+D_i == 0, B_i = 1
θ_i = Xbar + (1 - B_i) * (X_i - Xbar)
```

- Limited translation (Efron–Morris): cap how far θ_i may move from X_i toward Xbar at **1.5 × sqrt(D_i)**. If the raw shrink step exceeds that, pull θ_i only 1.5 SE toward Xbar. Frozen c = 1.5. Do not tune.

Predicted log-mean for a game: `(θ_home + θ_away) / 2`.  
μ = exp(that).  
φ = 12 unless you already have a walk-forward residual φ; if you estimate φ online, use only past games and freeze the estimator code (not the value). Default **φ = 12** to match `NbRbpf` init.

`qOver = P(Y > line | μ, φ)` using the **same** NB2 tail helper `nbOverProb` already in `nb-rbpf.ts` (export it if needed; do not reimplement a second PMF). Line is the **entry** median total from `entryForGame`, not the close.

Then `runSideAdaptivePath` as today.

Worked numbers (so tests can lock):

```
k=4 teams, X = [2.1, 2.2, 2.0, 2.4], n = [4, 20, 4, 8], s^2 = 0.04
D = [0.01, 0.002, 0.01, 0.005]
Xbar = 2.175
sum (X-Xbar)^2 = 0.0875
sum D = 0.027
A_hat = max(0, (0.0875-0.027)/4) = 0.015125
B = [0.398, 0.117, 0.398, 0.248]
θ ≈ [2.145, 2.197, 2.105, 2.231]
```

Tolerance: 1e-3 on θ. If limited translation does not bind here, that is correct.

---

## 3. Files to add / touch

| File | Action |
|---|---|
| `packages/prediction-engine/src/research/efron-morris-js.ts` | **New.** Pure. `shrinkLogMeans(units: {id, x, n}[], pooledVar: number): Map<id, theta>`. No I/O, no odds, no NbRbpf. |
| `packages/prediction-engine/src/research/efron-morris-js.test.ts` | **New.** Lock the worked numbers. k=1 and k=2 → no shrinkage (θ=X). n=0 unit → θ=Xbar. A_hat floors at 0. Limited translation binds on a constructed outlier. |
| `scripts/edge-lab/run-mve.ts` | After `entryForGame` succeeds, compute `qOver` from **this** shrinker using only `observations`/`games` already processed. Then `filter.predictOver` may still run for a **logged** `qRbpf` column in path.json — **e-process uses JS `qOver` only.** Call `filter.update` as today if you keep the particle path for the log; if that is extra work, skip the particle filter entirely this cycle. **Prefer skip:** one `q`, no dual model. |
| `packages/prediction-engine/src/research/mve-eprocess.ts` | **Do not change.** |
| `docs/ops/hermes/hf5-mve/RESULTS.md` | Writer already exists. Add two rows: `mean|q-m|`, `corr(q-m, 1{over}-m)` on graded bets. **Do not skip the e-process if they look like an echo.** Report them. Capital path is the verdict. |

Export the shrinker from `packages/prediction-engine/src/research/` only. Do not barrel-export to the public `prediction-engine` index unless tests require it.

---

## 4. Order of operations in the runner (copy this)

```
load FINAL MLB games in [CORPUS_FROM, CORPUS_TO)
load TOTALS odds for those ids
for each game in commenceTime order:
  entry = entryForGame(...)          // existing: 6–3h, ≥3 books, ≤15 min, Shin, median line
  if entry is null: excluded++; continue
  qOver = efronMorrisQOver(home, away, entry.line, pastGames)
  y = homeScore + awayScore
  if y == line: pushes++; record past game; continue
  observations.push({ qOver, mOver: entry.mOver, y, line })
  record this game into pastGames   // AFTER qOver — walk-forward
path = runSideAdaptivePath(observations)
write RESULTS.md + path.json
```

`pastGames` is an in-memory list `{home, away, y}`. No DB writes.

---

## 5. Tests the verifier should see

1. `efron-morris-js.test.ts` — worked numbers; k<3; n=0; A_hat=0 when between-team variance < mean D; limited translation on a +5 SE outlier.
2. Existing `mve-eprocess.test.ts` still green. **No new λ, no over-side-only, no other window.**
3. `run-mve` still exits 2 on Postgres auth failure (do not swallow).
4. Dual-q: if you accidentally still pass `filter.predictOver` into `runSideAdaptivePath`, that is a fail.

---

## 6. Explicit non-goals (do not start)

- Pitcher/umpire IDs, park factors, weather, first-half totals
- Arcsine, `arcsin(sqrt(p))`, or Fay–Herriot regression
- GROW mixture, WSR adaptive λ, point-null LR
- Shrinking **books** toward a consensus (L-16 is closed)
- Feasibility gate that **aborts** the MVE
- Importing `bayesbio` or any R package
- Editing `forecast-skill-eprocess.ts` / `bernoulli-eprocess.ts` / `kelly.ts`

---

## 7. Verdict wiring (already written)

`bindingOutcome` in `mve-eprocess.ts`:

- early abort or kill checkpoint or final capital ≤ 2 → `KILL`
- certified at a scheduled checkpoint (E≥20) → `CERTIFY_DRAFT`
- else → `DID_NOT_CERTIFY_DID_NOT_SURVIVE`

Do not invent a fourth state.

---

## 8. If you are blocked

| Blocker | Action |
|---|---|
| `mve-eprocess.ts` missing on branch | Copy from `packages/prediction-engine/src/research/mve-eprocess.ts` in this repo’s local tree / `hermes/hf5-mve`. Do not rewrite from DeepSeek. |
| No pitcher column | Expected. Team-level only. |
| DB 28P01 | Exit 2. Founder/env. Not a math bug. |
| Unsure which JS formula | This file. Efron–Morris §3 only. |

Literature context (do not re-research): `docs/ops/edge/2026-08-20-ten-cluster-literature-stack.md`.
