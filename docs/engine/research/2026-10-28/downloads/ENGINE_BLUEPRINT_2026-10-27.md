# THE BLUEPRINT — how a sportsbook pricing engine actually works — 2026-10-27

Reconstructed from output, not from docs. Every parameter below was recovered by fitting the book's own published numbers. Two books were reverse-engineered side by side; the differences are the interesting part.

**Method note:** a book cannot hand-price 40 alternate rungs. It prices a distribution and reads the ladder off the CDF. That is testable, and it tested clean — the local linear fit to the ladder has RMSE 0.005–0.024, which is what a smooth CDF read-off looks like.

---

## STAGE 0 — the shape of the machine

```
ratings ──► fair line (mu) ──► distribution (sigma) ──► CDF ──► ladder rungs
                                        │
                                        ├──► vig applied per rung (favourite-loaded)
                                        ├──► limits assigned per market class
                                        └──► movement loop on news / money
```

Six stages, in this order. Each one leaves a fingerprint in the output. That is why it is reversible.

---

## STAGE 1 — the kernel: they publish their own sigma

Fit `P(home covers x) = Φ((mu − x)/σ)` to the devigged alternate ladder. Two passes: full band, then the central ±7 points so both books are measured over the same width.

| Book | σ (matched ±7 band) | Fair line recovered |
|---|---|---|
| Pinnacle | **12.21 pts** | matches the posted main line every game |
| DraftKings | **13.16 pts** | matches the posted main line every game |

**σ is the engine's confidence, and it is the single most valuable number here.** DK prices the same games ~8% wider than Pinnacle — flatter probabilities, worse tails, more room for a sharp side to be right.

The engine's own measured margin σ is **13.36** (from the prediction stack). Pinnacle prices *tighter than reality* (12.21 vs 13.36); DK prices almost exactly at reality (13.16). A book that prices tighter than the true distribution is systematically underpaying the tails — which is precisely where the longshot money is.

**Identification caveat:** ladders are narrow (±7 to ±19 points), so curvature is not identifiable; only the local slope is. σ here is `1/(√(2π)·slope)` at the fair line, not a global fit. Do not read it as a full distribution.

---

## STAGE 2 — vig: the fingerprint

Hold by market, same slate, same night:

| Market | DK | Pinnacle |
|---|---|---|
| Total | 5.09% | 4.93% |
| Spread | 5.00% | **3.60%** |
| Moneyline | 4.51% | 4.06% |

DK is flat at ~5% and loads the favourite in lopsided games (5.07% vs 4.47% on close ones). Pinnacle is not flat — it prices spreads 1.4 pp tighter than DK, and it loads the *close* game (4.23%) rather than the favourite.

**Two different vig policies, both deliberate:**
- DK: uniform rake, tilted toward the side the public takes. Retail model.
- Pinnacle: rake inversely proportional to their own confidence. They charge least where they know most.

Rebuild rule: `price = devig(p) × (1 + hold(market, bucket))`. The hold table is the whole parameter set.

---

## STAGE 3 — ladder generation

Rungs are algorithmic, not hand-set: monotone by construction, 0.5-point spacing near the line, widening to 1.0–2.0 at the edges, all derived from the same CDF.

**Verified:** 720 Pinnacle ladder pairs and 2,478 DK alternate selections — **zero monotonicity violations, zero near-misses.** The generator is clean on both. A stale rung is the exception, not the rule.

Rebuild rule: `for x in rungs: price(x) = american(1 / (CDF(x) × (1+hold)))`, then round to the 0.5 grid and enforce monotonicity as an assertion.

---

## STAGE 4 — limits: capacity is allocated by class, not by game

`maxRiskStake` by market class (Pinnacle, live):

| Class | median | max |
|---|---|---|
| Full-game spread | $10,000 | $20,000 |
| Full-game total | $5,000 | $5,000 |
| Moneyline | $5,000 | $10,000 |
| Team total | $2,000 | $2,000 |
| Halves / quarters | $500 | $500 |

**Limits are a property of the market class, not of the game.** Every Q1 total on the board is $500 regardless of matchup. That means the limit table is a static config, not a per-event decision — and it means capacity tells you nothing about the game, only about the product.

Rebuild rule: `limit = class_table[period][market]`, with a per-event override only for marquee games.

---

## STAGE 5 — the movement loop

From 752 banked snapshots over 25 minutes: **17 of 352 selections moved (4.8%)**, mean 0.45 pp, and every top mover was a quarter market.

Movement is concentrated in the thinnest product, which is the opposite of where the money is. Rebuild rule: reprice on a timer proportional to `1/limit` — quarters churn, spreads sit.

---

## STAGE 6 — correlation pricing

DK tags markets `SGP` / `YourBetEligible` / `Cashout` / `PrimaryMarket`. Correlation is priced by *tagging which legs may be combined*, not by a copula — the book controls correlation exposure by exclusion rather than by joint modelling.

Rebuild rule: a boolean eligibility matrix, not a covariance matrix.

---

## REBUILD SPEC

```python
def price_game(mu, sigma, market_class, hold_table, limit_table):
    rungs = grid(mu, spacing=0.5, width=market_class.width)
    out = []
    for x in rungs:
        p = norm.cdf((mu - x) / sigma)
        p_adj = p * (1 + hold_table[market_class][bucket(p)])
        out.append((x, to_american(1 / p_adj), limit_table[market_class]))
    assert monotone(out)
    return out
```

Parameters to set, in order of importance: **σ** (confidence), **hold_table** (rake policy), **limit_table** (capacity), **grid** (spacing/width). Everything else is plumbing.

---

## WHAT IS STILL DARK

- **How μ is produced.** The ratings model behind the fair line is the one stage not recoverable from output alone. It needs the injury/news feed and the team-strength prior.
- **Whether σ is per-game or per-class.** The spread across games (17.0–19.0 at DK) suggests per-game, but that could be noise on a 40-rung fit.
- **The betslip layer.** Per-selection limits, stake rounding, and the correlation engine all sit behind auth.
- **Steam handling.** Whether a book re-prices on incoming money or only on news is not visible from a static snapshot.

## CAVEATS

- One night, ten games. σ needs re-fitting across slates before it is trusted to two decimals.
- `pass` on the vig table: DK's numbers are from 42 markets, Pinnacle's from 590 — different n, same night.
- The kernel test is a *local* fit. A normal is assumed, not proven; a skew-normal would fit the tails better and is the next test.

## REPRODUCE

```bash
python3 /opt/model/engine_reverse.py          # Pinnacle kernel fit
# DK side: browser-only, same fit against subcat 13195
```
