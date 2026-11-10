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

## 2026-11-09 Consolidated Research & Corpus Filings (Nov 7–9 Sweep)

| Bucket | Canonical Path | Contents |
|---|---|---|
| `docs/engine/` | `docs/engine/research/2026-11-09/INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md` | Consolidated Intel Loop Runs 66–69 covering Q52 (`defensive-field-zone-split`), Q53 (`qb-opponent-tier-efficiency-split`), and Q54 (`qb-post-first-int-efficiency-split`) |
| `docs/data-sources/` | `docs/data-sources/research/2026-11-09/RESEARCH-CONSOLIDATION-2026-11-07-to-09.md` | Consolidated Nov 7–9 multi-lane sweep across X/Twitter, Instagram, GitHub (34 repos + EGM), Books (218 PDFs + 13 Skeleton Books), and 112 CSV tables (`35 + 39 + 38`) |
| `docs/predictions/` | `docs/predictions/research/2026-11-09/CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md` | 33 verbatim content briefs and 48 analytical signals across Pillars A–F |
| `docs/predictions/` | `docs/predictions/research/2026-11-09/WEEK9-SUNDAY-SETTLEMENT-AND-PROJECTION-AUTOPSY.md` | Week 9 Sunday 13-game settlement ledger (`7-4-0`, `+2.06u`, `3.61` DK Pt MAE) and projection conservation autopsy |
| `docs/predictions/` | `docs/predictions/research/2026-11-09/MNF-BUF-MIN-FOUNDER-COMMAND-AND-MONETIZATION-PACKET.md` | MNF `BUF @ MIN` founder command packet, conserved player/team projections, and Thaler bundle architecture |
| `docs/data-sources/` | `docs/data-sources/research/2026-11-07/google-drive-mega-sweep/SKELETON-BOOKS-2026-11-06.md` | 13 Skeleton-Shelf Books (`11` `DRIVE_VERIFIED` + `2` `BLOCKED`/`HTML_ONLY`), 8 Addendum Shelf Audit, and 2 Nov 7 Wayback Retry Closures |
| `docs/data-sources/` | `docs/data-sources/research/2026-11-07/google-drive-mega-sweep/books-a-sports/INDEX-BOOKS-A-2.md` | Wave Books-A-2 + Garrett's 49 Nov 7 self-added sports analytics & DFS books/monographs in Google Drive folder `1n3K5UDjVxpKbdW1I1o4yo_StuzvyGd-p` (`79` total files) |
| `docs/predictions/` | `docs/predictions/research/2026-11-08/cadence_v40_gameday_lock_sun_late_w9.json` | Cadence v4.0 `SUN_LATE` Week 9 T-90 inactives lock refresh and conformal residual diagnostic (`scripts/ops/run_cadence_v40_sun_late_w9.py`) |
| `docs/predictions/` | `docs/predictions/research/2026-11-07/nova-dossier/` | Consolidated Nova Dossier & Week 9 Game Dossier Surface packet (`2026-11-08-review.md`, `NOVA-REALISM-RESEARCH-PACKET-2026-11-07.md`, `NOVA-UPDATE-V2-2026-11-07.md`, `VOICE-LOCK.md`, `persona-nova-bible.md`, `personality-spec.md`, plus architecture & migration docs) |


