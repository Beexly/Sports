# Wong teaser leg-rate check on harness — 2026-08 (SCAN, orchestrator)

Motivated by STRATEGIES.md item #4. Tested 6-point teaser legs across
key numbers using games_harness_rows.jsonl (1999–2025, n varies by line).

## Per-leg cover rates after a 6-point shift

| Leg | n | Cover rate | z vs 0.50 |
|---|---|---|---|
| Home fav −7.5/−8 → −1.5/−2 | 259 | 69.9% | +6.40 |
| Home dog +1.5/+2/+2.5 → +7.5..+8.5 | 380 | 66.8% | +6.57 |
| Home dog +7.5/+8 → +13.5/+14 | 105 | 77.1% | +5.56 |

Straight-up reference: fav −7.5 covers 51.3%, fav −8 covers 46.9% — the
+6-point shift adds ~20–23pp as expected from the margin distribution.

## The math that matters (do not skip)

A two-team teaser at −120 needs BOTH legs: p² > 1/2.2 = 45.45% per leg.
Observed single-leg rates of ~67–77% clear that easily IN ISOLATION —
but these are UNCONDITIONAL rates over 27 seasons. The real teaser
decision is conditional on the pair you're teased together, and modern
books price teasers at −125/−130 (breakeven ~48.3%/50% per leg), which
eats most of the historical edge. Also: my sample includes pre-2002
games with different total environments.

## Honest verdict

The classic Wong crossing rates REPLICATE in our data (~67–70% for the
classic legs vs Wong's claimed ~76% at the time). Whether that's still
an edge depends entirely on today's teaser pricing, which the harness
doesn't carry. SCAN ONLY — no falsifier run warranted without price data;
queue: capture current teaser prices via Kalshi/books before any claim.
