# DFS Optimizer — the "edge" upgrade (beating LineStar's patented engine)

*Branch `claude/dfs-optimizer-edge` · illustrative/gated · 2026-07-07*

This is the engineering half of the LineStar teardown ([linestar-teeth-dossier.md](./linestar-teeth-dossier.md)).
It turns "understand their optimizer" into "baseline it and beat it — legally."

## The premise (from the teardown)

LineStar markets *"the world's only patented lineup optimizer."* The patents
(US 9,744,450 · 9,751,010 · 10,478,721 · 11,660,533, assignee Fantasy Sports
Company → BetFully, Inc.) claim a **randomized-greedy walk of a pre-sorted
"column-based list,"** explicitly tuned for *"approximately constant
computational time"* with *"iterations inversely proportional to the number of
rows."* Two structural weaknesses fall straight out of that:

1. **It's a heuristic, not an optimizer.** It trades optimality for constant
   mobile compute — it does not guarantee the best lineup.
2. **Its objective is a point-sum** (`max Σ projected-value s.t. salary cap`).
   Point-sum treats players as independent — blind to covariance, the outcome
   distribution, and field ownership.

Both are beatable, and beating them is *also* a clean design-around: a
branch-and-bound MILP and a correlation simulation practice **neither** the
column-list walk nor the rows-inverse iteration bound. *(Freedom-to-operate is a
patent-counsel call; this is engineering leverage, not a legal opinion.)*

## What was built

All in `apps/web/lib/fantasy/`, pure, gated to the illustrative slate by default
(flips to a licensed live slate via the existing `activeDfsSlate()` seam — no
code change):

| File | Role |
|---|---|
| `dfs-exact.ts` | **Exact branch-and-bound.** Returns the *provable* maximum of the mode's objective under salary cap + slots + distinct + locks/excludes. Symmetry-broken (identical slots are combinations, not permutations), with admissible objective + salary bounds and a node-cap safety backstop. |
| `dfs-correlation.ts` | **Correlation-aware Monte-Carlo.** A compact factor model (team latent + game latent + idiosyncratic) so a QB and his pass-catcher boom together, an offense and the opposing DST move opposite, and both teams in a shootout rise together. Scores lineups by top-quintile ceiling EV under correlation + ownership leverage. Seeded/deterministic. |
| `dfs-optimizer-edge.ts` | Orchestration: `optimizeExact` for **cash** (provable), `selectGppLineups` (generate diverse pool → simulate → rank) for **GPP**, and a head-to-head `benchmark()`. |
| `dfs-optimizer.ts` | (existing, unchanged behaviour) — exported four shared helpers so the exact path optimises the *same* objective the heuristic does. |
| `*.test.ts` (3) | 13 tests incl. a **brute-force verifier** proving the solver hits the true optimum on every mode. |

The incumbent `dfs-optimizer.ts` (randomized multi-start + hill-climb) already
out-designs LineStar conceptually — mode-aware objective (GPP = ceiling, not
point-sum), leverage, exposure, glass-box "why." This upgrade adds the two
things it lacked: a **provable** optimum and **correlation**.

## Benchmark (illustrative slate)

Run: `pnpm --dir apps/web test dfs-exact dfs-correlation dfs-optimizer-edge`.
Representative `benchmark()` output:

```
CASH   exactObjective 120.5  (salary 50000, PROVEN optimal, ~1.6M nodes / ~0.6s)
       heuristic best 120.5, worst 119.0  →  optimalityGap up to 2.0
GPP    naive point-sum ceilEV 146.3   vs   correlation-selected ceilEV 147.6
       correlationEdge +1.3   (selected lineup is stacked)
```

**Read honestly:**
- **CASH is the clean win.** The exact optimum is guaranteed every run; the
  randomized heuristic (the same *class* of tool as LineStar's) drops ~2
  projected points when it gets too few restarts. "Provably optimal" is a claim
  their patent structurally cannot make.
- **GPP edge is real but modest here (+1.3 ceilEV).** On a ~35-player toy slate
  the point-sum lineup is already near-optimal and often already stacked, so the
  correlation gain is small. The *mechanism* is proven independently
  (`dfs-correlation.test.ts`: a same-team stack has strictly higher ceiling
  variance and p90 than an equal-projection off-team pair). On real slates —
  more players, stronger stacks, live ownership — the edge widens.

## Honest caveats / next work

- The exact solver explores ~1.6M nodes on the illustrative slate (~0.6s). Fine
  when gated; for large live slates it wants a tighter bound (per-position
  knapsack / LP relaxation) or a dedicated MILP solver (OR-Tools / HiGHS).
  `NODE_CAP` returns best-so-far with `optimal:false` rather than hanging.
- The factor-model loadings are sensible defaults, not calibrated to real
  outcomes — calibrate against historical results before any live claim
  (consistent with GSE's proof-of-accuracy stance).
- **Lane:** this is optimizer *tech* (analytics / skill-game), gated to the
  illustrative slate. It is **not** wired to any real-money DFS contest — that
  boundary is deliberate and founder-gated.
- Freedom-to-operate vs the BetFully patents = confirm with counsel.
