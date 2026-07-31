# Exploration: Binary Mondrian conformal + expected information gain

**Date:** 2026-07-31  
**Branch:** `explore/mondrian-eig-deepen-2026-07-31` (from `gse/phase2-binary-conformal-adapter`)  
**Status:** shadow research deepen — **no** gate flips, **no** live Odds API, **no** priced confidence

---

## Track A — Binary Mondrian conformal adapter

### What already existed

| Symbol | Role |
|--------|------|
| `nonconformityBinary(p,y)=\|p−y\|` | Split-conformal score |
| `fitBinaryMondrian` | Fill Mondrian residual stores by taxonomy |
| `binaryConformalLookup` | Hierarchical quantile + `width=2q` |
| `adaptiveBinaryConformal` | ACI-style α stream (shadow) |
| `priced:false`, `status:"shadow"` | Hard markers on every result type |

Theory held: finite-sample (n+1) quantiles, Mondrian conditional coverage by category, hierarchical fallback.

### What this exploration added

| Symbol | Role |
|--------|------|
| `buildBinaryProbabilityInterval(p,q)` | Map residual quantile → clamped `[lo,hi]` on probability scale |
| `binaryIntervalForPick` | Lookup + interval in one call |
| `evaluateBinaryCoverage` | Holdout empirical coverage, mean width, mean Winkler |

### How to read diagnostics

- **empiricalCoverage ≥ target** on exchangeable holdout ⇒ residual geometry is behaving.
- **coverageGap < 0** ⇒ undercovering — **do not price**; widen via higher targetCoverage / more samples / coarser taxonomy.
- **uninformative: true** (interval = [0,1]) ⇒ abstain cue, never a stake signal.
- **meanWinkler** couples interval quality to proper scoring (lower better).

### Coupling to scoring-rules

- Point forecasts: `logScoreBinary` / `meanLogScoreBinary`
- Intervals: Winkler via `evaluateBinaryCoverage` or `winklerIntervalScore` on `[lo,hi]`

### Forbidden

- Feeding `width` or residual quantiles into public confidence labels
- Flipping `priced` without founder `MODEL_VERSION` gate
- Using adaptive α path in production without signed explore/exploit policy

---

## Track B — Expected information gain metrics

### Three related but distinct EIG surfaces

| Surface | File | Quantity |
|---------|------|----------|
| **Credit VoI heuristic** | `odds-api-voi.ts` | urgency × sparsity × sport boost / cost |
| **Entropy EIG** | `expected-info-gain.ts` (**new**) | H₂, KL, market-pull EIG, EIG/credit knapsack |
| **Discrete MES-style HPO** | `infoGainSelectNext` | uncertainty about best *objective value* y* on a config grid |

### Entropy definitions (nats)

- \(H_2(p) = -p\log p-(1-p)\log(1-p)\)
- \(\mathrm{KL}(m\|p)\) for market vs model disagreement
- **Market-pull EIG proxy:** \(\max(0, H(p)-H(m)) + \lambda\,\mathrm{KL}(m\|p)\), \(\lambda=0.25\)

Interpretation:

1. **Sharpness** — market tighter than model ⇒ positive entropy reduction  
2. **Disagreement** — market challenges model ⇒ learning value even if not sharper  
3. **Outcome EIG** — observing y yields \(H(p)\) (settlement info, not odds spend)

### Link to Mondrian

`expectedAbsoluteResidual(p)=2p(1-p)` is E[|p−y|] under Bern(p). Peaks at p=0.5 — same place entropy peaks — so **uncertain games generate more residual mass** and need denser Mondrian cells (VoI sparsity term).

### Odds API 500-credit budget

- Heuristic rank: `rankOddsPullsForBudget` (now optionally multiplies by `1+eig` when `modelP` set)
- Pure EIG rank: `rankMarketPullsByEig`
- Neither calls the network; founder/ops applies the ranked list under free-tier quota

### Offline HPO

Prefer `infoGainSelectNext` when the question is “which shadow UQ config most reduces uncertainty about the best objective,” not “which game to buy odds for.”

---

## Proof plan (what we ran / run)

```bash
cd packages/prediction-engine
npx vitest run src/conformal/__tests__/binary-adapter.test.ts src/__tests__/expected-info-gain.test.ts
```

All new paths assert `priced:false` and `status:"shadow"`.

---

## Disposition

| Item | Call |
|------|------|
| Port to main now? | **Smallest proven slice only after WS-B** (game creation) — recon law |
| Safe to merge as research PR? | Yes, if CI green and base is research branch / or stacked on conformal branch |
| Activate live odds ranking? | Founder only + `CLOSING_ODDS_API_KEY` lane + quota policy |
| Price conformal intervals? | **No** until MODEL_VERSION + coverage proof on real holdout |

---

## Residual risks → leverage (closed)

See **`docs/gse/LEVERAGE_FROM_UQ_RESIDUALS_2026-07-31.md`**.

| # | Residual | Leverage |
|---|----------|----------|
| R1 | Unknown pre-pull market | Labeled `MarketBelief`; no silent 50% forecast; discovery-phase ranking |
| R2 | Synthetic ≠ certificate | `issueCalibrationCertificate` ladder; publicClaim strings; geometry_only hard cap |
| R3 | Heuristic vs EIG disagree | `compareVoIRankings` → inspectRequired before credit spend |

Anti-metrics: fake 50% markets, tier inflation, dropping a ranker to force agreement.
