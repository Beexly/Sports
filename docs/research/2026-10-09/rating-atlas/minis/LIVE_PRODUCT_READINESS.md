# LIVE PRODUCT READINESS — the open-gap gate, closed item by item
**2026-10-10 late · tracks exactly the readiness list; status: GREEN / GATED / DEFERRED-WITH-RISK**

| # | gap | status | evidence |
|---|---|---|---|
| 1 | Coarse-bin / hierarchical pooling retest on leverage EP | **CLOSED — verdict: REFUSED** | 3-level bins + shrinkage k=20: sign consistency 3/5 (60%) < 70% bar → leverage delta stays RESEARCH, not model input. `leverage_coarse_stability.json` + kill-ledger policy. Re-open: n≥100 cells via weekly snapshots |
| 2 | Usage × prop-σ join (item 5) | **CLOSED** | `usage_prop_residuals_2026.csv`: 266 player-markets joined (usage × team-context model); DK premium mean **+34.1 ±41** — the player-level residual exists. Position-mapping fixed (QB→pass, share×team-yards for rush/rec); bands not points are the signal |
| 3 | Residual-vs-close stamp on the situational layer | **CLOSED — first PROMOTED verdict** | `graph_vs_close_stamp.py`: drive-PPD (the graph's drive-level output, point-in-time rolling) close-anchored → **CRPS 7.3852 vs close 7.5057 on frozen wk-6 folds — PROMOTED**. Production promotion still requires pooled multi-week + CLV per rule 9; ledger entry #9 records exactly that |
| 4 | Next invented equations (pressure×separation×leverage; drive-start×tempo×def-residual; narrative residuals) | **DEFERRED-WITH-RISK** | Formally queued on graph v1 state vectors (9–12). Residual risk: live pulls run without them — documented here, not hidden. They attach AFTER the pooled PPD test (same protocol family) |
| 5 | Model-layer consumption of the stamped graph + CollegeGuard | **GATED, PATH LIVE** | Consumption = the PPD candidate (promoted verdict above). Full multi-agent reasoners (13–17) remain architecture-queued; any output they produce passes `reg.promote(name, verdict)` or it does not touch the margin head |
| 6 | "Today" cut-off + freshness protocol | **CLOSED — ENFORCED IN CODE** | `freshness.py`: FreshnessGate(decision_t) is the only sanctioned read path for live pulls; rows observed after decision_t do not exist; violations logged. Verified live: injuries/weather/flow all as-of clean |

## Product declaration (per the standing rule)
A live pull TODAY is **baseline + partial invention**: full baseline matrix (items 1–6 green), situational graph v1 + transitions + aggression payoffs (research-stamped), drive-PPD promoted on frozen folds (pooled test pending), player residuals joined, freshness enforced.
**It is NOT yet the full reasoner engine** — items 9–17 (invented equations + multi-agent consumption) remain queued behind the same refusal chain, and that is the honest label.

## What flips the label to "full engine"
1. Pooled PPD test t≥1.96 on locked folds (the PPA protocol, now with a PROMOTED single-week verdict in hand)
2. Items 9–12 equations attached to state vectors + walk-forward stamps
3. Reasoner layer (13–17) with belief traces, gated by 18–20 harness
4. Weekly cadence accumulating: flow snapshots (steam/velocity), prop-drift, injury latency

*Risk ledger: kill_ledger.jsonl (9 entries, chain intact) + RUNNING_LOG.md are the audit trail. Nothing is promoted that did not beat the close on a frozen list.*

## UPDATE — pooled PPD verdict (2026-10-10 late)
Pooled multi-week PPD test executed (n=195): **REFUSED** — close+PPD 9.4427 vs close 8.0626, t=+0.13.
Single-week wk-6 PROMOTED verdict stands; pooled t-bar not cleared. Flip condition updated:
prior-season PPD carry-in (hierarchical shrinkage) then re-pool. Candidate remains diagnostic.
