# SGP real-data run — Buffalo Bills at Los Angeles Rams (MNF, 2026-10-12)

INTERNAL ARTIFACT. Model machinery + real book lines and prices; not a customer surface.

## Game

- Matchup: Buffalo Bills (away) at Los Angeles Rams (home)
- ESPN eventId: 401872994
- Kickoff: 2026-10-13T00:15:00Z (Mon Oct 12, 7:15 PM CDT)

## Outcome summary

First pass (ESPN propBets, below) had real lines and **no prices**, so no leg
could be priced. A second, bounded sourcing pass over three public sportsbook
APIs found real two-sided prices at **Kambi** (operator `rsiuspa`, BetRivers
PA). The full chain — de-vig → marginals → measured-correlation copula — was
run on Kambi prices only, using Kambi's own lines throughout (never mixed
with the ESPN lines). Both teams' 4-leg combos are fully formed.

| Team | Joint fair probability (copula) | Independence product | Monte Carlo SE |
|---|---|---|---|
| Los Angeles Rams | **0.1769** | 0.0571 | ±0.0017 |
| Buffalo Bills | **0.1314** | 0.0384 | ±0.0015 |

## Source outcomes (bounded pass, in order)

| # | Source | Result |
|---|---|---|
| 1 | Kambi public offering API (`eu-offering-api.kambicdn.com/offering/v2018/`) | **SUCCESS.** Operator `ubuk`/`ubus`/`ubse` NFL listView paths 404'd on the `football/nfl` segment; the correct segment is `american_football/nfl`. `rsiuspa` listView returned HTTP 200 with this game (event id 1028813042, start 2026-10-13T00:15:00Z). The event bet-offer payload (717 bet offers) carries priced player markets for every needed leg. The US operator hosts (`us-sb-api.kambicdn.com`, `us-offering-api.kambicdn.com`) did not answer (connection closed / timeout) and were not needed. |
| 2 | Pinnacle guest API (`guest.api.arcadia.pinnacle.com/0.1/`) | **Blocked.** `/sports` returns 200, but `/leagues?sportId=15` returns 204 with an empty body and `/leagues/15/matchups` returns **401** `{"detail": "No authorization token provided"}` (an earlier probe of the leagues endpoint returned 403). No matchup or market data is reachable without a token, so no player props could be checked. Not pursued further — Kambi had already succeeded. |
| 3 | FanDuel public API (`sbapi.tn.sportsbook.fanduel.com`) | **Not needed / one probe only.** Content-managed-page probe returned HTTP 404 `{"error":true}` and yielded no priced props. Not pursued further — Kambi had already succeeded. |

## Priced snapshot (single fetch, everything below reads only this file)

- File: `data/snapshots/kambi_props_bills_rams_2026-10-12.json`
- Source: Kambi public offering API, operator `rsiuspa` (BetRivers PA), market `US_PA`
- URL: `https://eu-offering-api.kambicdn.com/offering/v2018/rsiuspa/betoffer/event/1028813042.json?lang=en_US&market=US_PA`
- HTTP status: 200 · Fetched: 2026-10-12T20:59:57Z · Payload: 717 bet offers
- Kambi quotes decimal odds (stored ×1000 in the payload) and an American
  price string per outcome; both are recorded below and agree.

## Legs — Kambi lines and prices, Shin de-vigged

De-vig: `intelligence/props/prop_discrepancy_engine.py`, `devig_two_way(...,
method="shin")` on the American prices — the engine's first exercise on real
priced data. Leg order is the measured matrix's: `qb_pass_yards`,
`qb_pass_tds`, `wr_rec_yards`, `wr_anytime_td`.

### Los Angeles Rams

| Leg | Player | Kambi line | Over / Yes price | Under price | Booksum | Shin z | De-vigged marginal (over / yes) |
|---|---|---|---|---|---|---|---|
| qb_pass_yards | Matthew Stafford | 282.5 | -114 (1.88) | -114 (1.88) | 1.0654 | 0.0654 | **0.5000** |
| qb_pass_tds | Matthew Stafford | 2.5 | +125 (2.25) | -165 (1.61) | 1.0671 | 0.0672 | **0.4109** |
| wr_rec_yards | Puka Nacua | 92.5 | -113 (1.89) | -115 (1.87) | 1.0654 | 0.0654 | **0.4978** |
| wr_anytime_td | Puka Nacua | — | -122 (1.82) | — (not offered) | — | — | **0.5495** (raw implied — see caveat) |

### Buffalo Bills

| Leg | Player | Kambi line | Over / Yes price | Under price | Booksum | Shin z | De-vigged marginal (over / yes) |
|---|---|---|---|---|---|---|---|
| qb_pass_yards | Josh Allen | 246.5 | -114 (1.88) | -114 (1.88) | 1.0654 | 0.0654 | **0.5000** |
| qb_pass_tds | Josh Allen | 1.5 | -112 (1.90) | -117 (1.86) | 1.0675 | 0.0675 | **0.4946** |
| wr_rec_yards | Khalil Shakir | 46.5 | -117 (1.86) | -112 (1.90) | 1.0675 | 0.0675 | **0.5054** |
| wr_anytime_td | Khalil Shakir | — | +230 (3.30) | — (not offered) | — | — | **0.3030** (raw implied — see caveat) |

Top-WR check (Kambi receiving-yards lines, same snapshot): Nacua 92.5 is the
highest Rams line (Adams 61.5 next). For Buffalo, Shakir 46.5 is the highest
**WR** line (Coleman 39.5 next); Dalton Kincaid's 56.5 is higher but he is a
tight end, and the matrix leg is the top wide receiver — the same player
(Shakir) carries both the receiving-yards and anytime-TD legs, as the
correlation matrix requires.

**Anytime-TD caveat (stated, not papered over):** Kambi's "Touchdown Scorer"
market is Yes-only — a full-payload scan finds no No price for any player, so
there is no second side to de-vig against for this leg. Its marginal is the
raw implied probability of the Yes price, which is vig-inclusive and therefore
an **upper bound** on the fair probability. The two team joints inherit that
direction: if anything, they are slightly overstated through this one leg.
The other six legs are Shin de-vigged from real two-sided prices.

**Line differences vs the ESPN snapshot** (Kambi lines used for everything):
Stafford pass yards 282.5 (ESPN 283.5), Nacua rec yards 92.5 (ESPN 96.5),
Allen pass yards 246.5 (ESPN 244.5), Shakir rec yards 46.5 (ESPN 45.5).
Pass-TD lines agree (Stafford 2.5, Allen 1.5).

## Copula chain output

Settings per `intelligence/sgp/price_from_measured_correlations.py`: Gaussian
copula, measured 4×4 matrix from `data/snapshots/sgp_correlations.json`
(1,088 team-games, 2024–2025), 50,000 draws, seed 20261012. Marginals are the
de-vigged probabilities above, fed to `price_sgp` as Bernoulli marginals so
the joint is P(all four legs hit) under the measured dependence.

| Team | Marginals (in leg order) | Joint | Independence | Lift | SE | z vs independence |
|---|---|---|---|---|---|---|
| Los Angeles Rams | 0.5000, 0.4109, 0.4978, 0.5495 | **0.1769** | 0.0571 | +209.7% | 0.0017 | +70 approx |
| Buffalo Bills | 0.5000, 0.4946, 0.5054, 0.3030 | **0.1314** | 0.0384 | +242.0% | 0.0015 | +62 approx |

Sanity gates: all marginals and both joints in [0, 1] ✓ · measured matrix PSD
as loaded (min eigenvalue 0.260460), no repair applied by the engine ✓ ·
no NaN in any output ✓ · empirical leg frequencies from the simulation match
the input marginals to Monte Carlo error ✓.

## Book SGP comparison

Kambi's payload for this event contains no priced same-game-parlay / combo
quote for either 4-leg combination, so there is no book SGP price to compare
against. The joints above are model fair probabilities only; no edge is
claimed.

## Customer file

`apps/web/data/sgp-projections.json` now carries one row per team — each
team's fully-formed 4-leg combo, labeled in plain English from the actual
Kambi lines, with `projectionPct` = joint fair probability × 100 at one
decimal (Rams 17.7, Bills 13.1).

---

## First pass (superseded for pricing, kept as the record): ESPN lines, no prices

- Snapshot: `data/snapshots/espn_prop_bets_bills_rams_2026-10-12.json`
  (ESPN public API, `sports.core.api.espn.com/.../events/401872994/.../odds/100/propBets`,
  provider 100 / DraftKings; fetched 2026-10-12T20:30:19Z → 20:37:34Z, 74 pages,
  1,833 items).
- Real lines in that snapshot: Stafford 283.5 pass yds / 2.5 pass TDs,
  Nacua 96.5 rec yds; Allen 244.5 pass yds / 1.5 pass TDs, Shakir 45.5 rec yds.
  Game anchors cross-checked there: ML Rams -175 / Bills +145, spread LAR -3.5,
  total 54.5 — all matched.
- A recursive key census of all 1,833 items found only `target.{value,
  displayValue}` under `current`/`open` — no American, decimal, or fractional
  price field anywhere; anytime-TD items carried empty `current`/`open`.
  DraftKings' own API hosts returned Akamai 403 from this VM and no Odds API
  key is stored on this machine, which is why the Kambi/Pinnacle/FanDuel pass
  above was run. The ESPN lines were **not** used in the priced run.
