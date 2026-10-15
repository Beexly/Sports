# Situational Graph v1 — schema

Assembled 2026-10-15 (branch `motif/situational-graph-v1-2026-10-15`) from the
pieces that exist: `docs/reasoning/situational-edges.md`,
`intelligence/coaching/situational_wp.py`,
`data/gse-dataset/current/week3-situational.jsonl`, and
`dfs/walk_forward/situational_diagnostics.json` (branch
`grok/walk-forward-2026-10-14`). Machine-readable form: `schema.json`;
edge-type registry: `edge_types.json`; enforcement: `graph.py`.

## What this is

A **data structure**: for one week of games, the situational facts that were
knowable about each game, each fact stamped with its source and the moment it
became knowable. It is the Layer 2 reasoning layer's memory — the thing a
read is built *from*.

It is **not a model**. It computes no probabilities, no CRPS, no picks, no
parlays, and it emits nothing. The no-emission rule is enforced in code:
`graph.py` validation rejects any edge value carrying an emission-shaped key
(`crps`, `pick`, `probability`, `emission`, …) at any depth. ZERO_OBJECT is
untouched by anything in this package.

## Nodes

| kind    | id shape        | carries |
|---------|-----------------|---------|
| team    | `team:SEA`      | team code |
| player  | `player:<gsis>` | name, position, team (created when a stamped injury row names the player) |
| venue   | `venue:DEN`     | home team code (venue facts live on `altitude` edges and in `inputs/venues.json`) |
| week    | `week:2026-06`  | season, week |
| game    | `game:2026_06_SEA_DEN` | gameday, away/home teams, roof, surface (from `games.jsonl`) |
| state   | `state:SHORT_WEEK` | one of the state kinds below |

States are first-class nodes because a state is a thing a team *is in* for a
game, and reads need to address it. State kinds: `SHORT_WEEK` (≤ 5 days
between games), `ALTITUDE_VISIT` (visitor at ≥ 4,000 ft), `THURSDAY_GAME`,
`POST_BYE` (≥ 12 days), `REVENGE_GAME` and `DISRUPTION` (entered only when
the corresponding authored read exists). The state-as-modeled-object design
follows `intelligence/coaching/situational_wp.py`, which bands game states
(score/time/down/distance) for its decision engine; this graph bands
*pre-game situational* states the same way.

## Edges

An edge is a record: `{id, type, from, to, game, value, source, as_of}`.

- `type` must be registered in `edge_types.json` (situational claims) or be
  one of the structural types: `participates_in`, `hosted_at`, `in_week`,
  `has_state`.
- `value` carries the fact. Its shape is fixed per type by the registry's
  `value_required_keys`. Signed matchup values follow the repo's existing
  convention — home perspective, from
  `data/gse-dataset/current/week3-situational.jsonl`.
- `source` is `{kind, ref}`: where the fact came from, specifically enough
  to re-pull it.
- `as_of` is the PIT stamp: an ISO date/datetime **from which the fact was
  knowable** — not when the builder ran. `null` means timeless reference
  data (venue elevation, fixture structure).

## PIT semantics

A read at time T sees an edge iff `as_of` is null or `as_of <= T`
(`graph.visible_at`). Consequences that are deliberate:

- Rest facts are stamped with the later of the two previous gamedays: before
  both teams have played, the differential does not exist yet.
- An `injury_burden` edge is stamped with the latest contributing report
  stamp, and any report row stamped after the game's gameday is refused
  outright (failed-closed; the walk-forward diagnostics' own
  `ril_injury_after_kickoff` precedent).
- A forecast edge is stamped with the forecast's issue time, so a Monday
  read cannot see a Wednesday forecast.
- An authored read is stamped when its author stamps it; an unstamped read
  is refused, not backdated.

## Honest-empty

When a required input is missing, the builder emits **no edge** and records
an `honest_empty` entry: `{edge_type, game_id, team?, missing[], reason}`.
Absence is data. The repo's own dataset set the precedent —
`week3-situational.jsonl` carries `"coaching_signed": null` on every row
rather than a fabricated number — and the current injury file forces the
largest honest-empty in v1: `data/gse-dataset/current/injuries_2026.csv`
has no stamp column at all, so `injury_burden` cannot be proven knowable
before kickoff and stays empty until a stamped feed exists. That is the
graph working as designed, not a gap in the graph.

## Provenance map

| graph piece | assembled from |
|---|---|
| `pressure_matchup`, `fourth_down_go_rate`, `special_teams_epa` types + admitted/dark rule | `docs/reasoning/situational-edges.md` (2025 walk-forward r values) |
| signed home-perspective values; null-as-honest precedent | `data/gse-dataset/current/week3-situational.jsonl` |
| state nodes as modeled objects | `intelligence/coaching/situational_wp.py` (state bands) |
| `injury_burden` weights (RIL status × position); fail-closed refusal taxonomy | `dfs/walk_forward/situational_diagnostics.json` |
| `rest_differential` grounding (CTF) | same diagnostics file |
| the 6 formalized read types (atmosphere, layered revenge, logistical disruption, altitude+short-week, coaching honesty, injury-context) | signal census 2026-10-15 (MENTIONED-ONCE rows) + Reasoning Doctrine canonical examples |

## Week numbering note

Week labels come from `data/gse-dataset/games.jsonl`, the repo's schedule
record: in it, SEA@DEN on 2026-10-15 is `2026_06_SEA_DEN`, **Week 6**
(Hermes' `week6_freeze` uses the same numbering). Where fleet conversation
has called tonight "Week 7", it is the same game under a different label;
the graph follows the data and flags the discrepancy rather than resolving
it silently.
