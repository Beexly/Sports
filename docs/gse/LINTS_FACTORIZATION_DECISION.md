# Linear TS Factorization Decision

**Status:** binding for `packages/prediction-engine/src/linear-thompson.ts`  
**Date:** 2026-07-30  
**Context:** Investigation of Cholesky, LDLᵀ, Bunch–Kaufman (partial), Bunch–Parlett (complete), and rook pivoting.

---

## Decision

**Use unpivoted Cholesky only. Do not implement Bunch–Kaufman, LDL-with-indefinite-pivots, rook, or Bunch–Parlett inside LinTS.**

---

## Why (technical)

Precision matrix is constructed as:

```text
A = λI + Σ x xᵀ    with λ > 0
```

Therefore `A ⪰ λI ≻ 0` (SPD) whenever inputs remain finite and `λ` is accepted at create time.

Thompson sampling requires a draw

```text
w ~ N(0, A⁻¹)
```

which exists in the reals **if and only if** `A` is SPD.  
If `A` is indefinite, `A⁻¹` is not a covariance — no pivoting strategy (BK, rook, BP) creates a valid real Gaussian sample from a non-PSD precision.

| Approach | Fits LinTS? |
|----------|-------------|
| Cholesky `A = LLᵀ`, `w = L⁻ᵀ z` | **Yes** — current implementation |
| LDLᵀ (unpivoted, SPD) | Equivalent engineering choice; no benefit over Cholesky here |
| Bunch–Kaufman partial | For **indefinite** symmetric solves; wrong tool for sampling |
| Rook / Bunch–Parlett | Stronger indefinite pivoting; still cannot sample if indefinite |

---

## What the code already does (verified)

| Guard | Location | Behavior |
|-------|----------|----------|
| `λ > 0` required | `createLinTsState` | Refuse non-SPD prior |
| Cholesky pivot `diag > 1e-12` | `cholesky()` | Return `null` if not numerically SPD |
| `selectAction` / `thetaEstimate` | public API | Propagate `null` — never invent a factor |
| Overflow on update | `updateLinTs` | Refuse update; keep prior valid state |
| No explicit `A⁻¹` | solves via `L` | Stability as designed |

No code change required to “implement” this decision — it is already the implementation.

---

## What we explicitly will not do

1. Add BK `1×1`/`2×2` pivoting to `linear-thompson.ts`
2. Fall back to indefinite LDL when Cholesky fails
3. Treat a failed Cholesky pivot as “use complete pivoting instead”
4. Sample using absolute values of negative pivots or complex arithmetic

Failed Cholesky ⇒ **refuse the decision** (`null`). Caller keeps honesty.

---

## When BK *would* belong in the monorepo

Separate module, separate contract, e.g.:

- Newton steps on indefinite Hessians
- KKT systems
- Symmetric indefinite least-squares variants

Not posterior sampling. Not LinTS.

---

## References (investigation trail)

- Cholesky on SPD — Higham; Golub–Van Loan
- LDLᵀ — sqrt-free SPD sibling
- Bunch–Kaufman (1977) — partial symmetric indefinite
- Bunch–Parlett (1971) — complete symmetric indefinite
- Rook pivoting — middle ground on growth vs search cost
- Agrawal & Goyal — linear Thompson sampling regret (assumes well-posed linear model / SPD ridge path)

---

## One-line rule for future agents

> **LinTS factors SPD precision with Cholesky and refuses otherwise. Indefinite symmetric factorizations are a different product surface.**
