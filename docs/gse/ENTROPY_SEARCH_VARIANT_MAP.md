# Entropy Search Variant Map → GSE

**Status:** research → discrete implementation map · **Not** a continuous GP-MES runtime.

Companion to the BO / entropy-search investigation. Maps ES family choices onto what GSE actually runs.

---

## Variant cheat sheet

| Variant | Quantity of interest | GSE analogue |
|---------|----------------------|--------------|
| **ES** | Location of optimum `x*` | Not implemented (expensive d-dim) |
| **PES** | Same `x*`, cheaper rewrite | Not implemented |
| **MES** | Max value `y*` | **`infoGainSelectNext`** — discrete max-value philosophy |
| **JES** | Joint `(x*, y*)` | Not needed on finite grid; grid + MES-style value gain covers it |
| **EI / UCB** | Improve incumbent / optimistic bound | **`ucbSelectNext`**, **`gridSearchShadow`** |
| **Thompson** | Sample then argmax | `linear-thompson.ts` (separate module) |

---

## When to use which offline selector

| Situation | Call |
|-----------|------|
| Small grid, evaluations cheap | `gridSearchShadow` (exhaustive, most auditable) |
| Partial history, need explore/exploit | `ucbSelectNext` |
| Care about uncertainty in *best objective value* | `infoGainSelectNext` |
| Live stakes / gate flips | **Forbidden** without signed `EXPLORE_EXPLOIT_POLICY_TEMPLATE.md` |

All three return / enforce `priced: false`, `status: "shadow"`, `autoPromoted: false`.

---

## What we deliberately do not implement

1. **Continuous GP-ES / PES / MES / JES** — no GP surrogate stack wired for acquisition; season-replay HPO would be a separate funded project.
2. **Auto-promotion of entropy-search winners** — hard false in result types.
3. **Live stake MES** — honesty ledger must not be driven by an acquisition function unsupervised.

---

## Conformal honesty note

If continuous BO is ever added, conformalize the surrogate (Stanton / Deshpande) *before* acquisition, consistent with Mondrian + ACI elsewhere in the engine. Uncalibrated GP σ is not finite-sample coverage.

---

## References (canonical)

- Hennig & Schuler — Entropy Search
- Hernández-Lobato et al. — Predictive Entropy Search
- Wang & Jegelka — Max-value Entropy Search
- Hvarfner, Hutter, Nardi — Joint Entropy Search (NeurIPS 2022)
