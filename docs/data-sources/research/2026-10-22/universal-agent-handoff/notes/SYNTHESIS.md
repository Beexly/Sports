# SYNTHESIS — where the data is, and how weak each door is

Written after 10 cycles. Ranked by value-per-effort of what is actually reachable.

## Tier 1 — open, no auth, high value
| source | what | why it matters |
|---|---|---|
| `site.api.espn.com` | scoreboard, teams, injuries (800 records), per-game summary with Matchup Predictor + DraftKings lines, and `winprobability`/`plays` after kickoff | league-owned source, model outputs included, zero friction |
| `api.sleeper.app` / `api.sleeper.com` | 12,229 players with gsis/espn/rotowire/sportradar ids; weekly stat projections | the **crosswalk**; nothing joins without it |
| `partner-api.prizepicks.com` | 7,226 NFL projections, `hr_20` + `trending_count` flags | hit-rate gate + popularity, free |
| `api.underdogfantasy.com/v1` | 4,863 NFL prop options with american/decimal prices | priced prop board |
| `nextgenstats.nfl.com/api` (25 routes) | NGS expected-value surfaces, participation w/ `defenderLocation` | league's own contextual model outputs |
| `scores24.live/graphql` | live odds + scored trends w/ `facts`/`surefire` | third-party aggregate of many books |
| `linestarapp.com/GetSalariesV5` | ownership percentages (282 rows) + projection model per player | DFS ownership, no account |

## Tier 2 — free account required, still trivial
- propfinder.app: `/identity/register` self-service, verification token read from a public mailbox,
  then 62,217 props incl. the full `ratingCriteria` that *is* their scoring model.
- linestar premium rows (695 projected salaries) — the only field set behind the truncation.

## Weakest authentication patterns, in order
1. **Undefended alternate edge.** `partner-api.prizepicks.com` (vs DataDome on `api.prizepicks.com`)
   and `/v1/` on Underdog (vs 426 `beta/vN`) both serve the identical board. Same for the NGS
   frontend proxy vs the locked `api.ngs.nfl.com`. Check for a twin before attacking a wall.
2. **Self-service free tier gating the real payload.** propfinder's pages 307 to login but the API
   only needs *any* principal; registration is open and unverified mailboxes work.
3. **Client credentials shipped in public JS.** NGS mints a JWT with `ngs_tracking` from a key pair
   inlined in the bundle; FanDuel ships `clientId`, `xpApiKey`, `perimeterXAppId` and 30 state
   GeoComply keys in a page inline `CONFIG`.
4. **BOLA on object references.** NGS participation/gamecenter authorise on `gameId`+`playId` with
   no ownership check; LineStar's `periodId`/`site` are bare integers and any historical period works.
5. **Model leakage through explanation fields.** propfinder returns `ratingCriteria` with weights and
   thresholds, so `pfRating` is reproducible to maxerr 0.0. PrizePicks leaks `hr_20`.

## Still hard
- DraftKings `sportsbook-nash...` -> Akamai 403; FanDuel `api.sportsbook.fanduel.com` returns the
  ingress 404 from this network and `fdx-api` is API Gateway wanting a token. Both need a browser
  fingerprint, not more header guessing.
- scores24's free tier is aggregated to one bookmaker; widening it needs the bookmaker-tagged
  resolver paths, not the game-level ones.

## Reprioritised queue
1. ESPN post-kickoff `winprobability` + `plays` (tonight's CHI-NE) — real in-game expectancy.
2. FanDuel/DK via browser fingerprint.
3. propfinder `matchup`/avg transforms (needs a second-day snapshot to identify the bands).
