# Research Log — 2026-06-25 (overnight autonomous edge hunt)

Real data, real money question: *is there a repeatable betting edge anywhere?* Every theory
below ran the same gauntlet — **pre-register → FDR control → out-of-sample replication →
settle against real outcomes**. The point of the platform is to publish this scorecard
honestly: the four mirages we killed matter as much as the one edge that survived.

## Scorecard

| Theory tested | Data | Result | Verdict |
|---|---|---|---|
| Closing-line ATS/total angles | nflverse, 27 seasons | 0/16 beat the close (FDR) | ❌ efficient |
| Totals UNDER (open→close CLV) | Odds API, 2021–23 | +CLV, 58.8% in-sample… | ❌ **died OOS** (51.1% over 27 yrs) |
| Passing-yards prop bias | Odds API + nflverse | UNDER 58.6% 2024 → OVER 51.6% 2023 | ❌ noise (sign flip) |
| Receiving-yards prop bias | 2023–24 | ~51.5% under, ns | ❌ efficient |
| Receptions prop bias | 2023–25 | 2023 over, 24/25 under; pooled 52.1% | ❌ not stable |
| **Rushing-yards UNDER** | **2023–25, 2,061 lines** | **54.1% (p<0.001); ≥70-yd lines 61.8%** | ✅ **real, replicated** |

## The one that survived — rushing-yards UNDER

UNDER in all three completed prop-history seasons (2023 55.6%, 2024 53.3%, 2025 53.6%),
early and mid weeks. Pooled **54.1%** over 2,061 lines (p<0.001, 95% CI 52.0–56.3). The
bankable subset is **high lines**: ≥70 rushing yards cashes UNDER **61.8%** (n=144,
FDR-significant), 30–49.5 at 56.6%, while the 50–70 "fair" band is efficient. Mechanism: the
public over-bets star RBs' rushing lines; books shade up; unders cash. Full detail +
caveats in `PROP_FINDINGS.md`. **Honest stance:** real and three-season-replicated, but the
overall edge is only marginally above vig — bet the high-line subset, line-shop, size small,
and treat it as a tracked candidate, not a guarantee.

## The lesson the totals-under taught (why this discipline exists)

The totals-under looked *identical* to a winner at first: real CLV, 58.8% settlement
in-sample. It took an out-of-sample seasonality check — and catching a data bug (61 unplayed
2026 games inflating the rate) — to prove it was a coin flip (51.1% over 27 seasons). Twenty
minutes separated "we found an edge!" from "no, we didn't." That self-correction, run on
every candidate, is the product. The win rate we refuse to fake is worth more than any angle.

## Infrastructure built this session (all additive + shadow on `keen-ptolemy`)

- `multiple-testing.ts` — Benjamini-Hochberg FDR + cross-night confirmation (the referee).
- `clv-feasibility.ts` + `closing-line-forecaster.ts` — CLV test + ridge forecaster, walk-forward.
- `discovery-engine.ts` + `candidate-registry.ts` + `workers/nightly-discovery/` — the
  "smarter every night" loop, structurally PROPOSED-only (CI-guardrailed).
- `prop-efficiency-probe.ts` + `prop-rush-deepdive.ts` — the prop edge-discovery pipeline.
- `odds-api-client.ts` — historical odds + events + event-odds (props). `sleeper-client.ts`.

Credits spent: ~11k of the 20k monthly plan, fully cached (re-runs cost zero).
