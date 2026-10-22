# ENTRY ENUMERATION PLAN — DK DFS consensus process (ready for tomorrow)
**2026-10-10 night · status: endpoints measured, puller built, one 2-minute manual step pending**

## MEASURED FACTS (probed live tonight)

| surface | endpoint | status without login |
|---|---|---|
| Player pool w/ salaries | `https://www.draftkings.com/lineup/getavailableplayers?draftGroupId={id}` | **OPEN** — 200, full playerList (pid, fn/ln, pos, team, salary) |
| api.draftkings.com draftgroups/draftables | `api.draftkings.com/draftgroups/v1/...` | 403 Akamai from shell (browser lane works per prior sportsbook RE) |
| Contest pages / gamecenter | `www.draftkings.com/contest/gamecenter/{id}` | **LOGIN-GATED** — redirects to signup (measured) |
| Leaderboard v3 | `www.draftkings.com/contest/leaderboardfull/v3/contest/{id}` | LOGIN-GATED (404 without session on test id) |
| DFS web lobby | `/dfs`, `/draft/lobby` | geo/marketing shell — real lobby lives in the app or behind login |

## THE ANSWER TO "WHEN ARE LINEUPS VISIBLE"

- **Pre-lock**: live entry counts + live ownership % are visible on the contest page (logged-in
  web or app). Individual lineups are NOT enumerable pre-lock — DK shows aggregates, not rosters.
- **At/after lock**: full entry lineups become visible via gamecenter + leaderboard endpoints
  (leaderboard rows carry entry lineups; `leaderboardfull/v3` paginates).
- **Therefore the consensus process is**: pre-lock = capture live ownership + entry count
  (the field's aggregate lean), at-lock = enumerate every entry lineup, post-lock = full
  20k-roster consensus. Both phases use the SAME session cookies.

## PAGINATION MATH (the 20,000-entry pull)

- leaderboardfull/v3 returns ~50 entries/page (verify on first real call; adjust PAGE var).
- 20,000 entries ≈ 400 pages. At 2 req/s with 0.5s spacing ≈ **3.5–7 minutes** for the full
  universe. Rate-limit safe: 0.6s jitter, backoff on 429/5xx, resumable JSONL (skips done pages).

## TOMORROW MORNING — THE 2-MINUTE MANUAL STEP (user, logged-in browser)

1. Open the 12pm slate contest page (single-entry tournament) while logged in.
2. From the browser: export cookies (Minis `get_cookies` → env file) — the puller sources them.
3. Read the contest id from the URL (`/contest/{id}`) and the draftGroupId from the page/state.
4. Hand those to: `python3 pull_entries.py --contest {id} --dg {dgId}` — it does the rest.

## CONSENSUS OUTPUT (what the puller produces)

`entries_{contest}.jsonl` — one row per entry:
`{contest_id, entry_id, rank, points, lineup:[pids], pids_resolved:[names], observed_at}`
then `consensus.py` (next build) computes:
- owned% per player (anchors >30%, mid 10–30%, leverage <10%)
- duplicate-lineup clusters (identical rosters = ghost pairs in single-entry)
- **the field consensus lineup** = most-owned valid-salary roster
- leverage deltas vs our projection feed (DK's own μ̂ from the sportsbook ladder RE)
