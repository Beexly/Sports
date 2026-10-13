# PFR Pull Recipe — full seven-surface browser-lane extraction (2026-10-10)

Research path only. Diagnostic tables for OL/DL attribution, coverage splits, referee environments, coaching behavior, and capital/age curves.
Does not write to μ. Does not touch production scoring. College is a separate model.

## Why browser-lane

PFR returns 403 to bare shell requests. Tables are same-origin once the page has loaded and the client-side JS has uncommented the placeholder divs. All seven surfaces below require a real browser context.

## Full surface map

| Surface | URL pattern | What it gives | Engine it feeds |
|---------|-------------|---------------|-----------------|
| Player pages | `/players/{L}/{id}.htm` | Advanced rushing/receiving (YBC, YAC, broken tackles, ADOT, drops, INT-when-targeted, pass-rating-allowed), defense, snap counts, bio/DOB | OL-vs-RB attribution, coverage adjacency, usage, birthday/RAE |
| Team season pages | `/teams/{abbr}/{year}.htm` | Game-by-game PFR expected points (exp_pts_off/def/st) + full box stats | Independent EP archive — validates our EPA spine |
| Boxscores | `/boxscores/{gameid}.htm` | Named official crews, stadium, weather, Vegas line (older seasons in HTML comments) | Referee-environment engine, closing-line archive, venue context |
| Coach pages | `/coaches/{id}.htm` | Per-year W/L, SRS offense/defense splits, playoffs, challenge counts | Tenure/hot-seat table, DC aggression, coaching-behavior features |
| Draft pages | `/years/{year}/draft.htm` | Pick, age, college, career-AV | Capital engine (draft capital gradients) |
| CFB sibling | `sports-reference.com/cfb` (same structure) | College equivalents of the above | Separate college model substrate (no NFL constant port) |
| Officials / crews | From boxscores + `/officials/` | Crew assignments, penalty environments | Referee-environment engine |

Player id pattern: `{LastInitial}{First5}{NN}` (example: `RobiBi01`).
Coach id pattern: similar slug.
Game id pattern: `YYYYMMDD0{home}` style.

## Extraction targets by surface

### Player pages
Table ids: `advanced_rushing_and_receiving`, `defense_advanced`, `passing_advanced`, `rushing_and_receiving`, `defense`.
Key data-stat: `rush_yds_before_contact`, `rush_yds_bc_per_rush`, `rush_yac`, `rush_yac_per_rush`, `broken_tackles`, `rec_air_yds_per_rec`, `def_times_pressured`.
Bio: `#meta` for birth date and draft.

### Team season pages
Tables with `exp_pts_off`, `exp_pts_def`, `exp_pts_st` (game log). Full box stats for opponent-adjusted validation.

### Boxscores
Crew names (e.g., Hochuli), stadium, weather notes, Vegas line (may be in HTML comment — parser must handle commented tables).

### Coach pages
Per-year W/L, SRS off/def, playoff appearances, challenge counts (behavior feature).

### Draft pages
Pick number, age, college, career AV. Link to CFB sibling for college performance.

## Full extraction script (browser evaluate after page load)

```javascript
// pfr_extract_surface.js — run after page.goto + ~2s wait
// Returns structured object for the current surface

function pfrExtractSurface(surface) {
  const tables = {};
  const ids = {
    player: ["advanced_rushing_and_receiving", "defense_advanced", "passing_advanced", "rushing_and_receiving", "defense"],
    team: ["games", "team_stats"],
    box: ["officials", "game_info", "linescore"],
    coach: ["coaching_results"],
    draft: ["drafts"]
  }[surface] || [];

  for (const id of ids) {
    const t = document.querySelector(`table#${id}`);
    if (!t) continue;
    const head = t.querySelector("thead tr:last-child");
    const cols = head ? [...head.querySelectorAll("th")].map(th => th.getAttribute("data-stat") || th.textContent.trim()) : [];
    const rows = [];
    for (const tr of t.querySelectorAll("tbody tr")) {
      if (tr.classList.contains("thead")) continue;
      const row = {};
      for (const cell of tr.children) {
        const key = cell.getAttribute("data-stat");
        if (key) row[key] = cell.textContent.trim();
      }
      if (Object.keys(row).length) rows.push(row);
    }
    tables[id] = { columns: cols, rows };
  }

  // Handle HTML-commented tables (older Vegas lines, some advanced)
  const comments = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.includes("<table")) {
      comments.push(node.nodeValue.slice(0, 500));
    }
  }

  const bio = {};
  const meta = document.querySelector("#meta") || document.querySelector(".players") || document.querySelector("#info");
  if (meta) {
    const text = meta.innerText || "";
    const born = text.match(/Born:\s*([A-Za-z]+ \d{1,2}, \d{4})/);
    if (born) bio.birth_date = born[1];
    const draft = text.match(/Draft:\s*([^\n]+)/);
    if (draft) bio.draft = draft[1].trim();
  }

  const path = location.pathname || "";
  const playerMatch = path.match(/\/players\/[A-Z]\/([A-Za-z0-9]+)\.htm/);
  const coachMatch = path.match(/\/coaches\/([A-Za-z0-9]+)\.htm/);

  return {
    surface,
    player_id: playerMatch ? playerMatch[1] : null,
    coach_id: coachMatch ? coachMatch[1] : null,
    url: location.href,
    bio,
    tables,
    commented_tables_preview: comments.slice(0, 3)
  };
}
```

## Python orchestration skeleton (pfr_pull.py)

```python
# pfr_pull.py — research crawler skeleton (browser tool drives pages)
# Polite: 1.5–2.5 s delay between requests. 60-key-player first pass, then expand.
# Output: one JSONL per surface. Join later on player_id / coach_id / game_id + observed_at.

SURFACES = {
    "player": "https://www.pro-football-reference.com/players/{L}/{id}.htm",
    "team": "https://www.pro-football-reference.com/teams/{abbr}/{year}.htm",
    "box": "https://www.pro-football-reference.com/boxscores/{gameid}.htm",
    "coach": "https://www.pro-football-reference.com/coaches/{id}.htm",
    "draft": "https://www.pro-football-reference.com/years/{year}/draft.htm",
}

# Example targets
PLAYER_TARGETS = ["RobiBi01", "TaylJo00", "AchaDe00"]  # expand to 60
TEAM_TARGETS = [("atl", 2025), ("buf", 2025)]
COACH_TARGETS = ["ShanahKy0"]  # example

def polite_delay():
    import time, random
    time.sleep(1.5 + random.random())

# Caller loop (browser tool):
# for pid in PLAYER_TARGETS:
#     page.goto(SURFACES["player"].format(L=pid[0], id=pid))
#     page.waitFor(2000)
#     data = page.evaluate("pfrExtractSurface('player')")
#     # append to player.jsonl
#     polite_delay()
```

## Notes

- `data-stat` is the stable key. Visible header text collides.
- Older boxscore Vegas lines are often in HTML comments. The tree-walker in the extract script surfaces them.
- CFB sibling uses the same table ids and structure on sports-reference.com/cfb. Separate model. No NFL constant port.
- Legal unit: diagnostic features (YBC/rush, challenge counts, crew penalty rates, draft capital). Illegal unit: direct coefficient on the NFL margin head.
- Warehouse landing: append-only diagnostic table with key `(entity_id, surface, season, source="pfr", observed_at)`. Leakage rule unchanged.

The complete public substrate is now one crawler away. Player ↔ team ↔ coach ↔ official ↔ game, all one ID system.
