# Queue: injury designation as a variance-model input

**2026-09-28.** **VALIDATED — the source works, the join is free, and the gap
is now measured rather than hypothesized.** No wiring code written. The
Alexandria fetch below was run end-to-end this session at the founder's
explicit approval to spend credits.

## THE GAP, IN ONE LINE

The variance model projects a player's season from his **production rate** and
his **remaining games**, and knows nothing about whether he is expected to play
a single one of them.

## WHY THIS IS A REAL GAP, NOT A NICE-TO-HAVE

The walk-forward already shows the cost. McCaffrey's 2025 remainder came in at
**346.7** against a model projection of **240.5** — the model was 106 points
low, 31% of his realized total. The prior session generalized the "short
half-life makes us pessimistic on bounce-backs" story from that one case and
was corrected for it. Fine. But the underlying observation survived the
correction: **production rate carries no forward information about a player
who will not be on the field**, and a 6-week half-life actively concentrates
the estimate on exactly the games that preceded the absence.

Concretely, the model would produce a confident 240-point season for a player
whose current designation is `Out`. The band would not save it. At 68% the RB
band is ±65%, so the honest band still reaches ~364 — but the *point estimate*
is the thing a draft board ranks on, and a confident wrong rank is what costs a
user their season.

This is the specific failure class the repo's own doctrine warns about:
publishing a number the evidence does not support, while every label in the
UI reads correctly.

## THE SOURCE, VERIFIED END-TO-END THIS SESSION

Firecrawl **Alexandria**, provider `nfl-com` (api.nfl.com), capability
`sports-league-data/injury_report`, **5 credits per team call**.

Discovery was free and returned 7 `nfl-com` capabilities plus ESPN, NFL.com,
BLS and FRED at 5 credits each. Full league pull, 2026 Week 3:

```
teams   : 32, 5 credits
injuries: 32 calls x 5 credits = 165 credits
TOTAL   : 301 reports across 32 teams
```

Record shape, per report:

```json
{ "player": { "gsis_id": "00-0035717", "display_name": "Nick Bosa",
              "position": "DE" },
  "injury_status": "OUT", "practice_status": "DIDNOT",
  "injuries": ["Knee","Calf"],
  "practice_days": [{"date":"2026-09-23","status":"DIDNOT"}, ...] }
```

`gsis_id` present on **301 / 301** rows. That is the whole ballgame: it is the
same identifier `players.gsisId` already carries, so the join needs no identity
resolution and no new mapping table.

## THE GAP, MEASURED

Joining the 301 reports to the live DB:

| | count |
|---|---|
| players with a `gsisId` in our table | 1,436 |
| distinct players on an injury report | 301 |
| — matched to our players | 94 |
| — not in our players (rookies, IR, practice squad) | 207 |
| fantasy (QB/RB/WR/TE) matched | 86 |
| fantasy matched **and** we would project them | **82** |
| **`OUT`, fantasy position, we would still project** | **18** |

Designation distribution across all 301: `OUT` 69, `QUESTIONABLE` 43,
`DOUBTFUL` 7, no designation 182.

**The 18 are the finding.** The variance model today gives every one of them a
confident full-season projection while their current designation says they will
not play:

```
Caleb Williams  QB  OUT  Hamstring     Nico Collins   WR  OUT  Hamstring
Alec Pierce     WR  OUT  Heel          Ashton Dulin   WR  OUT  Ankle
Caleb Douglas   WR  OUT  Ankle         Barion Brown   WR  OUT  Hamstring
Charlie Kolar   TE  OUT  Forearm       Mason Taylor   TE  OUT  Thumb
Jonah Coleman   RB  OUT  Ankle         Jayden Reed    WR  OUT  Neck
Andrei Iosivas  WR  OUT  Thumb         Brenen Thompson WR OUT  Quadricep
```

A draft board ranks on `proj`. A player ranked 40th on a full season who is
`OUT` is not a wide band — it is a confident wrong answer with a correct label
on it, which is the exact failure class this whole band-labelling exercise
exists to prevent. **The band does not save this; only the point estimate is
wrong.**

## THE HARD CONSTRAINT, WHICH IS NOT OBVIOUS

**An injury flag must not become a projection input.** That would be a second
violation of the same rule the process grade already lives under, and it would
be worse, because the process grade at least says `canPublishProjections:
false` in its own type.

So the honest scope is narrower than it first looks:

- **ALLOWED**: surface designation as labeled context next to the band —
  `Out`, `Doubtful`, `Q`, with the report date, so a user can weigh the
  projection themselves.
- **ALLOWED**: exclude a player with an active `Out` designation from the
  *pool*, the same way a player with no identity is excluded today. Absence is
  not a forecast.
- **NOT ALLOWED**: multiply `proj` by a games-expected haircut. That is a
  guess about replacement share, backup quality, and return date — three things
  this model has no signal for. It would produce a confident number with no
  coverage label, which is precisely the failure the whole band-labelling work
  exists to prevent.

If the founder wants an availability-adjusted projection, that is a modelling
project with its own walk-forward, not a wiring change. It would need its own
`n, r, slope, se` and its own `selectPart` run.

**Running cost: 165 credits per full-league week** (32 team calls × 5) plus
5 to resolve team UUIDs. In-season that is ~17 credits/week, or ~$0.85/week at
the published $0.05/credit. Off-season the week is free to skip entirely.

Two call-shape notes learned the hard way, both cheap to get right:
- `injury_report` takes a **team UUID**, not a name or abbreviation. Resolve it
  once with `sports-league-data/teams` (5 credits) and cache all 32.
- `teams` takes only `season` and `conference`. Passing `query` returns a 400
  that names the valid options — read the error rather than guessing.

## WHAT A FIRST PASS WOULD LOOK LIKE

1. `players.injuryDisplay` already exists and is already display-only. The
   existing sleeper-api tests assert the scoring is unchanged. Whatever is built
   must keep those passing — that is the tripwire.
2. A dated table keyed by GSIS id. The `players.gsisId` column is populated for
   all 1,436 rows, so the join the EP work already does covers this.
3. One gate test: with a designation present, every paid number is byte-identical
   to the undesignated pool.
4. One freshness test: a designation older than the current week fails loudly
   rather than rendering a stale `Out` on a player who played Sunday. This is
   the same failure class as the 2024-graded-pool-while-reporting-live bug —
   a stale flag on a live surface is worse than no flag.

## DECISION NEEDED

- Enable the connector at 5 credits, or fetch the endpoint directly?
- Pool-exclusion for `Out` — yes or no? This changes which players appear at
  all, so it is a product call, not a modelling one.
- Is display-only labeling enough, or is an availability model wanted? The
  second is a much larger piece of work and should not be smuggled in as a
  wiring change.
