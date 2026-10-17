# ESPN depth-chart digest — 2026-10-13 (season 2026)

- source: ESPN core API (keyless, public) — `sports.core.api.espn.com`
- endpoint: `GET /v2/sports/football/leagues/nfl/seasons/2026/teams/{team_id}/depthcharts`
- team directory: `GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`
- generated_utc: 2026-10-13T21:58:48Z
- auth: none — anonymous, keyless
- payload: `espn-depthcharts-2026.json` (178,066 B)
- **coverage: 32/32 teams, 877 position rows, 231 CB/NB slots, 0 error entries**

## Why this exists

This is the **CB depth the matchup engine was missing** (doctrine Move 3). It pairs a specific
receiver against a specific corner — depth the betting market does not publish. Slot 1 is the
starter; slots 2+ are the backup ladder.

## Schema

```json
{
  "generated_utc": "...",
  "season": 2026,
  "source": "ESPN core depthcharts API (keyless)",
  "teams": { "ARI": { "Base 4-3 D|LDE": [ {"slot": 1, "athlete": "..."}, ... ], ... } }
}
```

Team keys are abbreviations. Position keys are `"{unit}|{POS}"`. Four unit families are present:

| unit | distinct POS keys |
|---|---|
| Base 4-3 D | 12 |
| Base 3-4 D | 12 |
| 3WR 1TE | 10 |
| Special Teams | 6 |

Defensive position abbreviations observed: `LDE, LDT, RDT, RDE, WLB, MLB, SLB, LILB, NT, LCB, RCB,
NB, CB, FS, SS`.

## CB/NB starters (slot 1), sample

| team | LCB | RCB | NB |
|---|---|---|---|
| ARI | Garrett Williams | Denzel Burke | Max Melton |
| ATL | C.J. Henderson | Mike Hughes | Billy Bowman Jr. |
| BAL | Nate Wiggins | Marlon Humphrey | Kyle Hamilton |
| BUF | Christian Benford | Maxwell Hairston | Dee Alford |
| CAR | Akayleb Evans | Will Lee III | Chau Smith-Wade |
| CHI | Jaylon Johnson | Tyrique Stevenson Sr. | Cam Lewis |

All 32 teams carry a named LCB starter. Every value above is copied verbatim from the payload —
nothing imputed. Athlete names resolve via the per-athlete ESPN endpoint; on lookup failure the
script keeps the **raw athlete id** rather than inventing a name.

## Path correction (2026-10-13)

The first run landed this file at
`intelligence/docs/data-sources/research/2026-10-13/depthcharts/` — a shadow tree — because the
script resolved its repo root with `Path(__file__).resolve().parents[2]`, which stops at
`…/Sports/intelligence` (the script lives three levels deep, not two). Fixed to `parents[3]`; the
artifact was relocated to the canonical `docs/data-sources/research/2026-10-13/depthcharts/` and the
empty shadow tree removed. A watcher polling the canonical path reported "not yet written" while
this was outstanding — that was the bug surfacing, not a missing capture.

## Reproduce

```bash
cd /c/Users/Garrett/Sports
python intelligence/ingestion/depthcharts/pull_espn_depthcharts.py
# -> docs/data-sources/research/<today>/depthcharts/espn-depthcharts-2026.json
```

Roughly 34 team-level requests plus per-athlete name lookups at 0.35–0.5 s pacing. `--teams ARI,BUF`
narrows the pull; `--out PATH` overrides the destination.

## Open item

Not yet wired into the matchup engine. The intended consumer is receiver-vs-corner pairing keyed on
team abbreviation + `LCB`/`RCB`/`NB`; the join key to other feeds is the athlete name (ESPN athlete id
is available only as the fallback), so an id-level join would need the per-athlete `$ref` retained.
