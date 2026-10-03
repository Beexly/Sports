# chanzer0/NBA-DFS-Tools

**Stars:** 17 | **License:** NONE (no license file) | **Pushed:** 2024-11-13 | **Language:** Python | **Forks:** 12

## 1. Vision
The NBA sibling of NFL-DFS-Tools: optimizer + GPP simulator + pick5/showdown crunches for DraftKings and FanDuel NBA, with late-swap support for lineups already entered. Same game-theory collaboration, same "remain free" pledge.

## 2. The Ask
- Python 3.8.2-era stack: PuLP, numpy, pytz, timedelta.
- **Awesemo CSV exports** for projections, ownership, and boom/bust data (the README pitches Awesemo premium explicitly) + `player_ids.csv` from the site's salaries export.
- `config.json` with at_least/at_most groups, team limits, matchup limits, randomness.
- CLI: `python main.py <site> <process> <num_lineups> <num_uniques>`; uniqueness is enforced *after* crunching (expect 5–15% culling).

## 3. Constraints
- **No license = study-only.**
- **Maintenance:** pushed 2024-11-13; the NBA tool lags the NFL tool's 2025 rewrite (no uv, older Python). Semi-alive.
- Tied to a paid third-party projection source (Awesemo) for its documented workflow — the tool is a shell without projections.
- Name-mismatch friction between sources (a dedicated `name_change.py` step) — a small, honest window into the entity-resolution pain GSE will face wiring any multi-source feed.

## 4. GSE lens
- **Late swap is a real DFS feature GSE has never scoped.** This tool handles lineups already entered and re-optimizes as news breaks (`late_swap_path: live_lineups.csv`). GSE's DFS lane is pre-game only in every document; nobody has designed the in-slatereaction path. For NBA (and eventually NFL) that's a competitive gap.
- **The uniqueness-culling note is a practical engineering lesson:** enforcing lineup diversity *after* crunching costs 5–15% of output — plan portfolio sizes accordingly. GSE's future multi-entry logic needs this.
- **Cross-sport pattern reuse:** the opto/sim/config architecture is identical to the NFL tool — one architecture, two sports. That's the template for GSE's own multi-sport DFS future (Garrett has NBA/MLB lanes scoped, just back-burnered).
- No new gap beyond what the NFL tool already exposes; this is the same lesson in a second sport.

## 5. Verdict
**REBUILD** — same as the NFL tool: no license, so re-implement the late-swap and uniqueness-culling patterns when GSE's DFS lane matures past NFL. Not a priority today.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/chanzer0/NBA-DFS-Tools
- gitdiagram: https://gitdiagram.com/chanzer0/NBA-DFS-Tools
- star-history: https://star-history.com/#chanzer0/NBA-DFS-Tools (17 stars)
- github.dev: https://github.dev/chanzer0/NBA-DFS-Tools
