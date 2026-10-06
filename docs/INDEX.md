# docs/INDEX.md — the bucket map

**2026-09-27 reorg.** Research used to live in `docs/research/<date>/` with no
categorization. Now every bucket owns its research. This file is the map;
`docs/MOVED.md` records where every old path went.

## The buckets

| Bucket | What lives here | Research inbox |
|---|---|---|
| `docs/dfs/` | DraftKings/FanDuel: optimizer notes, slates, GPP construction, pick'em wiring, weekly packets | `docs/dfs/research/<YYYY-MM-DD>/` |
| `docs/predictions/` | Game picks (ML/spread/total): pipeline, prediction markets, evals, calibration | `docs/predictions/research/<YYYY-MM-DD>/` |
| `docs/props/` | Player props + pick'em: consensus lines, reverse-engineering, prompt packs | `docs/props/research/<YYYY-MM-DD>/` |
| `docs/fantasy/` | Season-long fantasy: projections, rankings, splits, stat tables | `docs/fantasy/research/<YYYY-MM-DD>/` |
| `docs/engine/` | The GSE machine: architecture, wiring specs, calibration, ML research, cept/ theory | `docs/engine/research/<YYYY-MM-DD>/` |
| `docs/data-sources/` | Every feed: nflverse, NGS, FTN, Sleeper, Odds API, dossiers, source strategy | `docs/data-sources/research/<YYYY-MM-DD>/` |
| `docs/arxiv-program/` | The 1,000-valuable-papers program corpus (target: 750) | `docs/arxiv-program/research/<YYYY-MM-DD>/` |

## The rule for agents

New research goes in `<bucket>/research/<YYYY-MM-DD>/` — dated, always.
Never at a bucket root, never in `docs/research/`, never in a new top-level
folder. Pick the bucket by the research's main topic:
- about a slate, lineup, or contest → `dfs`
- about a game pick or market → `predictions`
- about a player line → `props`
- about season-long roster decisions → `fantasy`
- about the engine, wiring, calibration, or math → `engine`
- about where data comes from → `data-sources`
- a full-paper read for the program → `arxiv-program`

If it genuinely fits none, put it in the closest bucket and say so in the
commit message — don't invent a bucket.

## What's NOT in buckets (left as-is)

- `docs/research/` still holds a few non-bucket files (brand report, agent-skill
  dossiers, rescue ops notes, misc prompts) — listed in `docs/MOVED.md`.
- The ~40 legacy top-level dirs (`docs/api/`, `docs/brand/`, `docs/ops/`, …)
  are product/company docs, untouched by this reorg.
- Code is never in `docs/` — `apps/`, `packages/`, `lib/`, `workers/` are
  separate trees.
