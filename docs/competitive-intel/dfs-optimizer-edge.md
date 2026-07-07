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
| `dfs-exact.ts` | **Exact branch-and-bound**, provable optimum under cap + slots + distinct + locks/excludes. **Distinct per-position** admissible bound, **FLEX-slot symmetry breaking**, and a **greedy warm-start** so the search proves rather than discovers. Adds `minStack` (provably-optimal QB stack, with an infeasibility precheck), slot-pinning, exact **`kBest`** (top-K distinct lineups), **`diversePool`** (k-best + overlap cap), and **`lateSwap`** / Swaptimize (exact re-opt of the unplayed slots). |
| `dfs-correlation.ts` | **Position-aware** correlation Monte-Carlo: per-position team + game loadings — QB↔WR/TE strong, QB↔RB weak, both-offenses bring-back, offense↔opposing-DST negative — plus a **duplication-risk** proxy. Scores by top-quintile ceiling EV − ownership − dup. Seeded/deterministic. |
| `dfs-optimizer-edge.ts` | Orchestration: `optimizeExact` / `lateSwap` for cash & swaps; `selectGppLineups` (**deterministic** k-best diverse pool → simulate → rank) for GPP; `benchmark()`. |
| `dfs-optimizer.ts` | existing behaviour unchanged — exports 4 shared helpers so exact + heuristic optimise the *same* objective. |
| `*.test.ts` (3) | **19 tests** incl. a **brute-force verifier** (exact == ground truth on every mode), k-best distinctness, the diversity cap, minStack, late-swap, and the position-aware correlation checks. |

The incumbent `dfs-optimizer.ts` (randomized multi-start + hill-climb) already
out-designs LineStar conceptually — mode-aware objective (GPP = ceiling, not
point-sum), leverage, exposure, glass-box "why." This upgrade adds the two
things it lacked: a **provable** optimum and **correlation**.

## Benchmark (illustrative slate)

Run: `pnpm --dir apps/web test dfs-exact dfs-correlation dfs-optimizer-edge`.
Representative `benchmark()` output:

```
CASH   exactObjective 120.5  (salary 50000, PROVEN optimal)
       heuristic worst 118.0  →  optimalityGap 2.5
GPP    naive point-sum ceilEV 145.2   vs   correlation-selected ceilEV 146.4
       correlationEdge +1.2   (selected lineup is stacked; DETERMINISTIC pool)
Search nodes: leverage 1 · gpp ~390k · cash ~871k  (all < 1s, provably optimal)
```

**Read honestly:**
- **CASH is the clean win.** The exact optimum is guaranteed every run; the
  randomized heuristic (the same *class* of tool as LineStar's) drops ~2.5
  projected points when it gets too few restarts. "Provably optimal" is a claim
  their patent structurally cannot make.
- **GPP edge is real but modest here (+1.2 ceilEV).** On a ~35-player toy slate
  the point-sum lineup is already near-optimal and often already stacked, so the
  correlation gain is small. The *mechanism* is proven independently
  (`dfs-correlation.test.ts`: a same-team stack has strictly higher ceiling
  variance than a QB↔RB pairing). On real slates — more players, stronger
  stacks, live ownership — the edge widens.
- The GPP pool is now **deterministic** (exact k-best + overlap cap), so results
  are reproducible run-to-run — unlike the random-restart approach it replaced.

## Honest caveats / next work

- Node counts after the max-out pass: **leverage 1, gpp ~390k, cash ~871k**, all
  under a second and provably optimal. The FLEX symmetry break + warm-start cut
  the earlier ~1.6M. Cash stays highest because its objective bound doesn't
  couple salary; for large **live** slates the right tool is a dedicated MILP
  solver (OR-Tools / HiGHS), not a hand-rolled LP bound. `NODE_CAP` returns
  best-so-far with `optimal:false` rather than hanging.
- The factor-model loadings are sensible defaults, not calibrated to real
  outcomes — calibrate against historical results before any live claim
  (consistent with GSE's proof-of-accuracy stance).
- **Lane:** this is optimizer *tech* (analytics / skill-game), gated to the
  illustrative slate. It is **not** wired to any real-money DFS contest — that
  boundary is deliberate and founder-gated.
- Freedom-to-operate vs the BetFully patents = confirm with counsel.
