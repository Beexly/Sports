# Roster / Player Lab Scope Gate

Date: 2026-06-09

## Result

Status: NOT CLOSED.

The repo does not currently expose a verified Player Lab route or traceable current NFL roster ingestion surface in the runnable app.

## Local Repo Evidence

Commands:

- `Get-ChildItem apps\web\app -Directory`
- `rg -n "Player Lab|player lab|PlayerLab|GSE Rating|gse rating|roster truth|current roster" apps packages docs -g '!docs/research/**' -g '!reports/**'`

Findings:

- App routes include `board`, `picks`, `pricing`, `promotions`, `methodology`, `cockpit`, `journal`, and related surfaces.
- No `player-lab`, `players`, or dedicated current-roster route was found.
- The only non-research local current-roster hit was conceptual documentation in `docs/brain/fantasy-war-room.md`.

## External Source Check

Official roster/player source pages exist outside the repo, including NFL player pages and team roster pages. This sprint did not connect them to the app.

Examples checked:

- `https://www.nfl.com/players/najee-harris/`
- `https://www.chargers.com/team/players-roster/`
- `https://www.nfl.com/players/rico-dowdle/`
- `https://www.panthers.com/team/players-roster/`

## Launch Gate

If public launch copy claims Player Lab, current roster truth, or current NFL roster-backed intelligence, this remains a blocker.

## Required Fix

Create a verified roster-source policy and ingestion/linkage path before exposing Player Lab/current-roster claims. At minimum:

- Canonical player/team entity IDs.
- Official roster source precedence.
- Freshness timestamp.
- Missing/stale/unknown states.
- Public copy that does not imply unsupported current roster coverage.
