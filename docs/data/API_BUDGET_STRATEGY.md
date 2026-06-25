# API Budget Strategy

*Source: `api-budget-planner.ts`. Maximum decision-relevant observability per dollar — never "more
data" as a vanity metric.*

## The rule

```
AcquisitionPriority = SourceIntelligenceYield × MissingCoverageUrgency × GateUnlockPotential
```

A source is worth paying for only if it improves truth freshness, role/market/fantasy-state
accuracy, historical replay power, cross-source contradiction detection, decision leverage,
calibration, proof quality, or product defensibility — and only where a cheaper/free source can't
already do it.

## The planner

`planApiBudget(candidates, monthlyBudget)`:

1. **Free first.** Free decision-relevant sources (cost 0) are always selected before any paid
   source — a paid feed can never crowd out a free one.
2. **Priority-greedy within budget.** Remaining budget goes to the highest-priority paid sources
   that fit; the rest are deferred with an explicit "over budget" reason.
3. **Review-gated sources cannot consume budget.** `RIGHTS_REVIEW`, `DO_NOT_USE`, and
   `RESEARCH_ONLY` are never purchased — they are deferred with their reason. Spend requires a clean
   legal lane.

## Staged roadmap

| Stage | Goal | Spend | Output |
|---|---|---|---|
| **0** | fill the replay lake without spending | $0 | nflverse expansion, NWS, Sleeper, Yahoo OAuth skeleton, Entity Spine, Temporal Fact Graph, Coverage Gap Radar |
| **1** | dense market + fantasy launch power | low | The Odds API quota/historical/props; evaluate BALLDONTLIE / API-SPORTS / SportsDataIO trial → Market & Fantasy Absorption Atlases, Cost-Efficiency report |
| **2** | fantasy/DFS from demo to paid-quality | mid | SportsDataIO / FantasyData / RotoWire / FantasyPros → real projections, ADP, salaries, slates, news |
| **3** | institutional breadth/latency | enterprise | Sportradar / Stats Perform / Genius / PFF — only when a revenue tier needs it |

## Owner-only gates

- Approve any paid add-on **after** the `--plan` dry-run prints the exact cost (the planner shows
  what it would select and what it defers, but authorizes no spend).
- Enterprise purchases are always a separate, evidence-backed, owner-approved decision.
- The mesh **plans** the budget; it never spends, never holds a key, never makes a call.
