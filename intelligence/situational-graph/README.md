# Situational Graph v1

**A data structure, not a model.** For each game in a week, the graph records
the situational facts that were knowable about that game — typed, valued,
sourced, and stamped with the moment each fact became knowable (PIT-safe).
It produces no CRPS, no probabilities, no picks, and no emission; validation
structurally rejects emission-shaped values. ZERO_OBJECT untouched.

Assembled 2026-10-15 on branch `motif/situational-graph-v1-2026-10-15`
(Garrett-approved construction order #2) from the pieces that already
existed — see the provenance map in `SCHEMA.md`.

## Layout

| file | what it is |
|---|---|
| `SCHEMA.md` | the schema in prose: nodes, edges, PIT semantics, honest-empty contract |
| `schema.json` | the graph document as a JSON Schema |
| `edge_types.json` | the edge-type registry: every legal edge type, its value shape, required inputs, honest-empty behavior, provenance, and the fleet's own measured status for the family |
| `graph.py` | core: `visible_at` (PIT reads) + `validate_graph` (registry + no-emission enforcement). Stdlib only |
| `builder.py` | builds a week's graph from explicit inputs. Stdlib only |
| `inputs/venues.json` | static venue reference (only sourced venues; absence is honest) |
| `inputs/coaches-2026.json` | verified coach tenure rows in builder input shape |
| `instances/2026-week06-sea-at-den.json` | the Week 6 instance for SEA@DEN, built from current real inputs |
| `tests/test_graph.py` | PIT/stamp behavior, honest-empty paths, registry and instance validation |

## The registry, in one view

Measured families (from the fleet's own artifacts): `pressure_matchup`
(admitted, r = 0.241), `fourth_down_go_rate` and `special_teams_epa` (dark —
recorded, not used, not sign-flipped), `injury_burden` (RIL weights from the
Hermes walk-forward diagnostics, which refused it as a scoring feature; the
graph carries it as roster fact), `rest_differential`, `altitude`.

Input-driven: `coaching_change` (verified tenure rows), `weather_extreme`
(stamped forecast only).

Formalized from the census's MENTIONED-ONCE rows — the six situational reads
that existed only as mentions now have edge types, input contracts, and
honest-empty behavior: `atmosphere`, `layered_revenge`,
`logistical_disruption`, `altitude_short_week` (a composite that fires
mechanically), `coaching_honesty` (with the measurable proxy the census
asked for, defined in the registry), `injury_context_identity`.

Reads are **recorded, never generated**: the builder accepts authored reads
(JSON, stamped, sourced) and files them; it does not write Layer 2 judgment.

## Build

From the repo root:

```bash
python3 intelligence/situational-graph/builder.py \
  --season 2026 --week 6 --game 2026_06_SEA_DEN \
  --games data/gse-dataset/games.jsonl \
  --venues intelligence/situational-graph/inputs/venues.json \
  --coaches intelligence/situational-graph/inputs/coaches-2026.json \
  --injuries-csv data/gse-dataset/current/injuries_2026.csv \
  --out intelligence/situational-graph/instances/2026-week06-sea-at-den.json
```

Optional inputs: `--situational <weekN-situational.jsonl>` (the measured
families), `--weather <json>` (stamped forecasts keyed by game_id),
`--reads <json>` (authored reads).

## What the Week 6 SEA@DEN instance shows

From inputs in hand on 2026-10-15: both teams on 4 days' rest
(`rest_differential` 0, stamped 2026-10-11 when both previous games were
played), `SHORT_WEEK` and `THURSDAY_GAME` states, Denver's 5,280 ft venue
(`altitude`, `ALTITUDE_VISIT`), the composite `altitude_short_week` firing
for Seattle, and a verified DEN staff-tenure fact (Vance Joseph, DC,
2023–2026, no change). Honest-empty, by design: `injury_burden` (the injury
file has no stamp column and covers Weeks 1–3 only), `weather_extreme` (no
stamped forecast in hand), SEA `coaching_change` (no verified SEA tenure
row), and all five authored-read families for both teams — the reads are
work order 0's job; the graph is where they will land when written.

Week numbering follows `games.jsonl`: this game is Week 6 in the repo's
schedule record (see the note in `SCHEMA.md`).

## Tests

```bash
python3 -m pytest intelligence/situational-graph/tests/ -q
```

The suite proves: stamp/PIT visibility (an edge is invisible before its
stamp, visible at and after it; timeless edges always visible), the
no-emission guard, honest-empty for unstamped injury data, refusal of
post-kickoff injury stamps, the altitude + short-week composite firing from
real-shaped fixtures, reads requiring stamps, and the shipped Week 6
instance validating against the registry. One integration test rebuilds
Week 3 from the repo's real dataset and checks the measured values against
`week3-situational.jsonl` itself.
