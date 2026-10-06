# nflverse/nflverse-pbp — Dossier

**Stars:** 354 (verified 2026-10-02) · **Language:** R · **Pushed:** 2026-09-11 (alive) · **Created:** 2020-04-25

## 1. Vision
The build pipeline behind nflverse's play-by-play, player-stat, and kicking-stat datasets: the GitHub Actions code that scrapes, cleans, and publishes to nflverse-data releases. Exists to keep the flagship dataset (1999–present, ~150k plays/season) current and reproducible.

## 2. The Ask
R + GitHub Actions. Consumer side: use nflreadr/nflreadpy or the release URLs directly (the repo explicitly asks consumers NOT to depend on this repo's tree — data moves to nflverse-data releases).

## 3. Constraints
- **License: CC-BY-4.0** — commercial use fine with attribution.
- The repo is plumbing, not data; most of the data has been migrated out to release assets.
- Update runs are nightly during the season; offseason refresh is sparse.

## 4. GSE lens
Exposes a process gap: nflverse's pbp build is a **lights-out pipeline with a public badge showing its health**. GSE's own data refresh (walk-forward live-checks, injury/OL availability feeds) has no observable pipeline state — no badge, no freshness ledger, no public-or-internal status page. If the nflverse nightly workflow fails, the community knows in minutes. If a GSE feed silently stalls, nobody knows until a pick goes bad. GSE should steal the "automation-status table" concept for its own signal producers.

## 5. Verdict
**REBUILD** — Not the scraper (nothing to learn there beyond the release pattern already covered in nflverse-data), but the *pipeline-status surface*: a per-producer freshness ledger with green/red state.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/nflverse/nflverse-pbp
- Gitdiagram: https://gitdiagram.com/nflverse/nflverse-pbp
- Star history (354 stars): https://star-history.com/#nflverse/nflverse-pbp
- github.dev: https://github.dev/nflverse/nflverse-pbp
