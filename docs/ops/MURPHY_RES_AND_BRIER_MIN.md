# Murphy resolution + Brier minimization (founder plain English)

## Brier score (the grade)
For each settled pick we have a probability `p` and outcome `y` (1=win, 0=loss):

**Brier = average of (p − y)²**

- Always between 0 and 1. **Lower is better.**
- Perfect always-right certainty → near 0. Coin-flip 50/50 → about 0.25.
- **GSE floor: Brier ≤ 0.22** before PROVEN can even be considered.

## Murphy decomposition (why the grade is high or low)
We sort forecasts into bins (e.g. 10 equal-width buckets of p). Then:

| Term | Formula idea | Want | Live (~) |
|------|----------------|------|----------|
| **UNC** uncertainty | baseRate × (1 − baseRate) | context only | **0.25** |
| **REL** reliability | how wrong each bin’s average p is vs actual win rate | **low** | **0.026** |
| **RES** resolution | how much each bin’s actual win rate differs from overall average | **high** | **0.002** |

Approx identity:

**Brier ≈ REL − RES + UNC**

### Murphy RES in one sentence
**“When we group picks by confidence, do those groups actually win at different rates?”**  
If every group wins ~50%, RES ≈ 0 — the model is not ranking.

Live RES **0.002** = almost no ranking power.

## How to minimize Brier (honestly)

1. **Raise RES (main job)**  
   Fewer, better picks; better ranking score; independent model probabilities; sport models; pause dead markets.

2. **Lower REL (secondary)**  
   Platt / temperature / isotonic — only after RES moves. Maps alone cannot unlock PROVEN at RES≈0.

3. **UNC**  
   Fixed by how often underdogs win in the sample. Not something we “tune” with theater.

### Back-of-envelope
If UNC ≈ 0.25 and some residual REL ≈ 0.02 remain, then to hit Brier ≤ 0.22 you need roughly:

**RES ≳ 0.03** (order of magnitude) — **~15×** live 0.002.

## Autonomy
- Selective + pause + proven-path plan: automatic  
- Metrics cron: automatic  
- PROVEN publish: only when floors + GREEN×K + AUTO_PUBLISH policy — never faked  
- Founder: no clicks required for measurement or filtering
