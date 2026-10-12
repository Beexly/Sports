# SGP real-data run — Buffalo Bills at Los Angeles Rams (MNF, 2026-10-12)

INTERNAL ARTIFACT. Model machinery + real book lines; not a customer surface.

## Game

- Matchup: Buffalo Bills (away) at Los Angeles Rams (home)
- ESPN eventId: 401872994
- Kickoff: 2026-10-13T00:15:00Z (Mon Oct 12, 7:15 PM CDT)
- Provider in feed: 100 (DraftKings)

## Snapshot (single fetch, everything below reads only this file)

- File: `data/snapshots/espn_prop_bets_bills_rams_2026-10-12.json`
- Source: ESPN public API, `sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401872994/competitions/401872994/odds/100/propBets`
- Fetch window: 2026-10-12T20:30:19Z → 20:37:34Z (74 pages, one pass, no re-fetch)
- Payload: 1,833 items (feed header count 1,830; each leg item below appears
  twice in the payload with identical values — deduplicated on read)

## Anchor cross-check (against the brief's stable anchors)

| Anchor | Brief | This snapshot / same-event ESPN data | Verdict |
|---|---|---|---|
| Game ML | Rams -175 / Bills +145 | -175 / +145 (pickcenter, DraftKings) | match |
| Spread | LAR -3.5 | -3.5 | match |
| Total | 54.5 | 54.5 | match |
| Stafford pass yards line | 283.5 | 283.5 | match |
| Stafford pass TDs line | 2.5 | 2.5 | match |
| Allen pass TDs line | 1.5 | 1.5 | match |
| Allen pass yards line | 241.5 | **244.5** | differs by 3.0 — see note |
| Nacua rec yards line | 93.5 then 96.5 across earlier reads | 96.5 | snapshot value used |

Note on Allen 244.5: the snapshot item carries `lastUpdated 2026-10-12T23:19Z`,
a stamp that postdates the fetch window — a feed-stamp inconsistency. The
value 244.5 is what the single snapshot contains and is what is recorded here;
the 241.5 anchor was an earlier read of an unstable feed, which is exactly why
this run is single-snapshot.

## Athlete mapping (roster-verified ESPN IDs, not feed order)

| Player | ESPN ID | Team | Role |
|---|---|---|---|
| Matthew Stafford | 12483 | Los Angeles Rams | QB |
| Josh Allen | 3918298 | Buffalo Bills | QB |
| Puka Nacua | 4426515 | Los Angeles Rams | WR (top rec-yards line) |
| Khalil Shakir | 4373678 | Buffalo Bills | WR (top rec-yards line) |

## Legs — real lines, no prices, all excluded

The four matrix legs per team (`qb_pass_yards`, `qb_pass_tds`, `wr_rec_yards`,
`wr_anytime_td`, in the measured matrix's order):

| Team | Leg | Player | Real line in snapshot | Price in snapshot | Status |
|---|---|---|---|---|---|
| LAR | qb_pass_yards | Matthew Stafford | 283.5 | none | EXCLUDED — no price |
| LAR | qb_pass_tds | Matthew Stafford | 2.5 | none | EXCLUDED — no price |
| LAR | wr_rec_yards | Puka Nacua | 96.5 | none | EXCLUDED — no price |
| LAR | wr_anytime_td | Puka Nacua | market listed, no target/price | none | EXCLUDED — no price |
| BUF | qb_pass_yards | Josh Allen | 244.5 | none | EXCLUDED — no price |
| BUF | qb_pass_tds | Josh Allen | 1.5 | none | EXCLUDED — no price |
| BUF | wr_rec_yards | Khalil Shakir | 45.5 | none | EXCLUDED — no price |
| BUF | wr_anytime_td | Khalil Shakir | market listed, no target/price | none | EXCLUDED — no price |

Other real lines observed for context: Davante Adams rec yards 60.5,
Keon Coleman rec yards 38.5.

## Why no prices: the feed is lines-only (evidence)

A recursive key census of all 1,833 snapshot items finds exactly these fields:
`competition.$ref`, `provider.$ref`, `type.{id,name}`, `lastUpdated`,
`athlete.$ref` / `team.$ref`, and `current` / `open`, each holding only
`target.{value,displayValue}` or nothing at all. There is no American price,
moneyline, decimal, fraction, or odds field anywhere in the payload (the only
"Moneyline" strings are market type names with empty `current`/`open`).
Anytime-TD items carry empty `current`/`open` objects.

This is the same blocker class the props engine's own docstring records for
the Pinnacle shade sheet: lines without prices cannot be de-vigged, and
inventing a price to fill the gap would fabricate the marginal.

## De-vig engine output

Not run. `prop_discrepancy_engine.py`'s Shin / multiplicative de-vig requires
two-sided prices; the snapshot contains none for any leg, so there is no real
priced input to exercise it on. The de-vig path remains covered by its unit
tests (see PR test table) but is still unexercised on real priced data.

## Copula chain output

Not run for tonight's game: with every leg excluded, there are no real
marginals, and the chain is not run on invented ones.

Chain verification on committed data (this branch, this run):

- `python3 intelligence/sgp/price_from_measured_correlations.py`
  → joint **0.1178 ± 0.0014** vs independence **0.0306** (illustrative
  marginals, measured dependence — the script labels them itself)
- Measured matrix sanity gates: symmetric ✓, unit diagonal ✓,
  PSD ✓ (4x4 min eigenvalue 0.260460; joint 8x8 min eigenvalue 0.251083)
- Probabilities produced tonight: none. No out-of-range or NaN values exist
  to gate on.

## Book SGP comparison

None possible: the snapshot contains no same-game-parlay / combo market and
no book SGP price. Model fair probabilities only would have been reported;
none were produced (all legs excluded).

## Customer file

`apps/web/data/sgp-projections.json` carries the game with `rows: []` —
neither team's 4-leg combo could be formed because every leg lacks a real
price in the snapshot. No combo was fabricated.
