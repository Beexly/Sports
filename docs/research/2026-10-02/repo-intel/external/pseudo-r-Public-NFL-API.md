# pseudo-r/Public-NFL-API — Dossier

**Stars:** 3 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2026-09-30 (audited Sept 2026) · **Created:** 2026-03-26

## 1. Vision
Documentation-as-infrastructure: maps the fragmented NFL data landscape across `api.nfl.com` (OAuth-locked), `site.api.espn.com` (public), `sports.core.api.espn.com` (public), `cdn.espn.com` (public), `nextgenstats.nfl.com` (NFL-auth), and `feeds.nfl.com` (403'd). Ships a September 2026 audit of which routes still work, endpoint relationships, quirks, and reference code. The thesis: the NFL has no public unauthenticated JSON API; ESPN's public infrastructure is the reliable path.

## 2. The Ask
Reading, not running: docs + reference code. No hosted API, no service to call — "Public" means reachability, and the PROJECT_SCOPE.md explicitly scopes permitted use (reachability ≠ permission to collect/redistribute).

## 3. Constraints
- **License: NONE declared** — treat docs as study-only.
- The audit is a point-in-time snapshot (2026-09-30); endpoints drift. Any producer built from it needs its own live health checks.
- Documents *reachability*, not *rights*: scraping ESPN at volume for a commercial engine is a ToS question, not a technical one. GSE's public surface shows only projections (no redistribution), which is the safer posture — but a lawyer-read of ESPN's ToS on automated collection is still owed before this becomes load-bearing.

## 4. GSE lens
This is the map for the two hardest GSE gaps: **the DFS live-slate feed and the live injury/lines producers**. It tells GSE exactly which domains answer which questions (e.g., `cdn.espn.com` game packages with drives/plays/WP; `site.api.espn.com` for scores/teams/rosters/injuries). The GSE weakness it exposes is precision about sources: GSE's registry lists 47 signals but the task's own briefing can't say which endpoint feeds which — this repo is the level of source-granularity the registry needs ("signal X ← endpoint Y, refresh cadence Z, auth none"). Without that, the registry is a wish list with no procurement plan.

## 5. Verdict
**REBUILD** — Not code (there's barely any); rebuild the *method*: per-signal source mapping with audited endpoint tables, refresh cadences, and health checks. The Sept-2026 audit is a starting snapshot; re-audit on GSE's own schedule.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/pseudo-r/Public-NFL-API
- Gitdiagram: https://gitdiagram.com/pseudo-r/Public-NFL-API
- Star history (3 stars): https://star-history.com/#pseudo-r/Public-NFL-API
- github.dev: https://github.dev/pseudo-r/Public-NFL-API
