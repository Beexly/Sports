# bcanfield/southpaw

**Stars:** 58 | **License:** NONE (no license file) | **Pushed:** 2026-06-05 | **Language:** Python | **Forks:** 3

## 1. Vision
Programmatic access to the FanDuel DFS platform: pull your contests, entries, roster formats, and the *actual available player pool* for a contest, then push lineups back in — automating the parts of DFS that the sites' UIs make tedious. It exists to close the loop between optimizer output and contest entry.

## 2. The Ask
- `pip install southpaw`; your FanDuel email + password.
- **Manual auth-header extraction:** log into fanduel.com, open browser dev tools, copy the `Authorization` header and `X-Auth-Token` from an `api.fanduel.com` request. FanDuel's 2FA crackdown (Oct 2023) made this a multi-step ritual, and the token **expires** — you repeat the extraction when it does.
- Everything runs against *your* account and *your* entered contests (`easy_get_contests()` returns nothing if you're not entered).

## 3. Constraints
- **No license = all rights reserved; study-only.** Cannot be vendored.
- **Against FanDuel ToS.** The README says it plainly: automated lineup updates can get the account disqualified; educational use only. Any GSE automation in this direction risks Garrett's own FanDuel account.
- **Alive:** pushed 2026-06-05, published on PyPI with download badge — maintained.
- Fragile by design: header-scraping auth breaks whenever FanDuel changes its login flow; no official API exists.

## 4. GSE lens
This is the single most instructive repo for GSE's biggest DFS gap: **the live slate feed.** southpaw shows exactly what "live" means in DFS — not a CSV someone downloaded, but `entry["available_players"]` pulled from the actual contest, plus the contest's required roster format, salary cap, and entries. GSE's optimizer "falls back to a sample slate" — southpaw is the proof that a sample slate is a choice, not a necessity: the contest's real player pool is fetchable. The honest rebuild target for GSE is a *read-only* slate provider (player pool + salaries + contest structure, no lineup submission), which dodges the ToS risk while killing the sample-slate fallback. GSE's documented DFS gap is literally "live-feed registration (activeDfsSlate() falls back to sample slate)" — this repo is the shape of the fix.

## 5. Verdict
**REBUILD** — no license and ToS risk rule out adoption or automated entry. Rebuild the *read path* as GSE's own slate provider: contest player pools, salaries, roster formats, contest structures. Never automate submission on Garrett's account.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/bcanfield/southpaw
- gitdiagram: https://gitdiagram.com/bcanfield/southpaw
- star-history: https://star-history.com/#bcanfield/southpaw (58 stars)
- github.dev: https://github.dev/bcanfield/southpaw
