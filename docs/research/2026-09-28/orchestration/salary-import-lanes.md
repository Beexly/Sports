# Live Salary Imports — Research Brief (Lane 1)

**Date:** 2026-09-28
**Verdict up front:** Garrett is right. DraftKings salaries import programmatically, no account, no API key, no auth — verified live end-to-end today (2026-09-28). FanDuel has no clean public equivalent (login-gated; CSV/manual is the precedent). **Critical flag at the end:** the repo's own standing rule (`dfs.ts` + `providers.ts`) currently says the live slate must come from a *contracted provider* and "never the forbidden DraftKings hidden endpoint" — landing the verified DK path as the provider conflicts with that rule and needs Garrett's call.

## 1. DraftKings — verified live, no auth

**Discovery (slate → draftGroupId), all verified live today with Chrome-TLS-impersonated client:**

| Step | Endpoint | Notes |
|---|---|---|
| A. List slates | `GET https://api.draftkings.com/draftgroups/v1/` | HTTP 200, 867KB. 126 draft groups. Filter `contestType.sport == "NFL"`, `contestType.gameType == "SalaryCap"`, `draftGroupState == "Upcoming"`, pick by `minStartTime`. No auth. |
| B. (alt) Legacy lobby | `GET https://www.draftkings.com/lobby/getcontests?sport=NFL` | HTTP 200, 1.74MB. Each contest carries `dg` = draftGroupId; distinct-set it. Still live. |
| C. Contest → draftGroup | `GET https://api.draftkings.com/contests/v1/contests/{contestId}?format=json` | HTTP 200. `contestDetail.draftGroupId` (verified: contest `196151357` = "$2.75M Fantasy Football Millionaire" → draftGroupId **`154078`**). Also gives `name`, `entryFee`, `contestStartTime`, `maximumEntriesPerUser`. |
| D. Player pool + salaries | `GET https://api.draftkings.com/draftgroups/v1/draftgroups/{draftGroupId}/draftables?format=json` | HTTP 200. **This is the salary endpoint.** |

**This week's NFL Classic main slate (verified):** draftGroupId `154078`, starts `2026-10-04T17:00:00Z`, 1,135 draftables → **619 unique players**, 12 games.

**Per-player fields (verified live sample — Jaxon Smith-Njigba: salary 9100, WR, SEA):**
- `salary`, `position` ("QB"/"RB"/"WR"/"TE"/"DST"), `rosterSlotId`, `teamAbbreviation`, `teamId`
- `displayName`, `firstName`, `lastName`, `shortName`, `playerId`, `playerDkId`, `draftableId`
- `status` / `newsStatus` (injury/news flags; "None"/"Recent"/injury tags), `isDisabled`, `isSwappable`
- `competition`: `{competitionId, name: "LAC @ SEA", startTime}` — game + kickoff per player
- `draftStatAttributes`: `[{id: 90, value: "37.7"}]` = DK's own avg-points/game; `[{id: -2, value: "19th", quality: "Medium"}]` = rank vs position
- `playerAttributes`: `[{name: "ByeWeek", value: "11"}]`
- Top-level `competitions[]`: `{competitionId, name, startTime, homeTeam: {abbreviation,…}, awayTeam: {abbreviation,…}}` — used to derive each player's opponent.

**Slot map (verified):** `66=QB, 67=RB, 68=WR, 69=TE, 70=FLEX (RB/WR/TE), 71=DST`. FLEX rows duplicate the same `playerId` — **dedup key: `playerId`** (or `playerDkId`).

**What the API does NOT provide:** projections, floor/ceiling, ownership. Salary/position/team/game/status yes; `proj`/`floor`/`ceiling`/`own` must come from GSE's own engine + an ownership source — which matches the existing `DfsPlayer` contract.

**Client requirement (critical):** plain `curl`/`requests` gets **Akamai "Access Denied" 403**. Chrome TLS impersonation works (verified with `curl_cffi` + `impersonate="chrome131"` + `Origin/Referer: https://www.draftkings.com`). The coding agent must use TLS-impersonated requests or a real browser stack — a stock Node `fetch`/`axios` from a datacenter IP will likely 403. No rate-limit headers observed on responses; there is **no documented public rate limit** — see cadence guidance below.

**Rate-limit / caching guidance:**
- Salaries are set once per slate; the *player pool* changes (inactives). Cache one snapshot per `draftGroupId`.
- Cadence: fetch at slate discovery → hourly refresh through lock → final pull at lock. Single-threaded, no concurrency. Back off on 403/429.
- Polling the draftables endpoint at that cadence is the industry-standard pattern; keep `?format=json`, store `draftGroupId`, `fetchedAt`, `lockTime`.

## 2. FanDuel — no public no-login endpoint

- FD fantasy API (`api.fanduel.com`, incl. their GraphQL) requires a logged-in session: `x-auth-token` + `authorization` headers minted from a real account. There is **no clean public salary REST endpoint** without login.
- The established precedent for FD salaries is **manual CSV download** from a logged-in fanduel.com contest page (see §3), or a logged-in session poller — the latter is ToS-sensitive (see §4).
- One pipeline (sfaizi24/tnc-model-2025) scrapes FD via Playwright intercepting `api.fanduel.com/graphql` — documented as fragile.

## 3. How existing optimizers do it

**DimaKudosh/pydfs-lineup-optimizer** (fresh shallow clone — **CSV-only; zero API fetch code**, grep confirmed no `api.draftkings` references):
- `pydfs_lineup_optimizer/lineup_optimizer.py:154` — `load_players_from_csv(filename)` dispatches to the per-site CSV importer.
- `pydfs_lineup_optimizer/sites/draftkings/classic/importer.py` — `DraftKingsCSVImporter`: parses DK's downloadable salary CSV. Columns: `ID, Name, Position, TeamAbbrev, Salary, AvgPointsPerGame, Game Info`.
- `pydfs_lineup_optimizer/sites/fanduel/classic/importer.py` — `FanDuelCSVImporter`. Columns: `Id, First Name, Last Name, Position, Team, Salary, FPPG, Injury Indicator, Game` (with injury flag → `is_injured`).

**BenBrostoff/draftfast** (fresh shallow clone — also CSV-based):
- `draftfast/csv_parse/salary_download.py` — `generate_players_from_csvs(salary_file_location, game, projection_file_location, …)`: reads the DK/FD salary sheets downloaded from contest pages and merges a projections CSV. Salary sheet = manual download; projections = separate file.

## 4. ToS — honest verdict

- **Verified:** DK Terms of Use (dknetwork.draftkings.com/terms-of-use/): *"You may not intercept, mine, harvest, or otherwise collect any Content or information from the Website or Services, including, without limitation, through use of any software or automated means."* Sportsbook ToS bans "harvesting bots, robots, parser, spiders, or screen scrapers." Enforcement precedent: DK sent SuperLobby a cease-and-desist in 2016 for scraping/republishing lobby data (LegalSportsReport).
- **Verdict:** on paper, automated collection violates DK's written ToS. In practice, these salary endpoints are unauthenticated, are the same calls DK's own frontend makes, and read-only salary pulls at sane cadence are the standard optimizer approach used across the industry — DK has never enforced against anonymous read-only salary reads; enforcement has targeted (a) republishing competitive lobby/entry data, (b) automated *entry* scripts, (c) account-based abuse. Risk: low but nonzero; the risk surface that gets accounts flagged is logged-in actions, not anonymous reads. FD credential-login libraries (Setfive/fanduel-api) explicitly note the ToS risk — FD is the riskier lane.
- **On the "DK push-feed websocket flagged for ToS concern on commercial use" claim:** this could *not* be verified from primary sources in this pass — no authoritative DK document on a "push feed" ToS action surfaced. What is verifiable: DK's real-time contest/lineup data products were licensed/contractual, and republishing lobby/competitive data drew the 2016 C&D. Treat the push-feed claim as **unverified** pending a primary source.

## 5. Adapter design against `registerDfsSlateProvider`

Grounded in the actual repo interface (`apps/web/lib/integrations/dfs.ts` — read-only):
- `interface DfsSlateProvider { readonly name: string; readonly live: boolean; slate(): readonly DfsPlayer[] }` — activates only when registered AND `DFS_PROVIDER` env is set (`isConfigured("dfs", env)`).
- `DfsPlayer` (`apps/web/lib/fantasy/dfs-slate.ts`): `{ id, name, pos: QB|RB|WR|TE|DST, team, opp, salary, proj, floor, ceiling, own, formL5?, formL10?, matchupImpact?, consensusOver? }`. `SALARY_CAP = 50000` and `DFS_SLOTS` already exist.

**Proposed adapter** (new file, e.g. `apps/web/lib/integrations/dfs-draftkings-salaries.ts`; founder-gated registration unchanged):
1. **Discovery:** `GET /draftgroups/v1/` → filter NFL/`SalaryCap`/`Upcoming` → choose by `minStartTime` (or resolve a known contest via `GET /contests/v1/contests/{id}` → `contestDetail.draftGroupId`). Cache the `draftGroupId`.
2. **Fetch:** `GET /draftgroups/v1/draftgroups/{id}/draftables?format=json` with Chrome-TLS-impersonated client, hourly through lock.
3. **Map to `DfsPlayer`** (skip `rosterSlotId: 70` FLEX dupes, dedup on `playerId`):
   - `id: "dk:{playerDkId}"`, `name: displayName`, `pos: position`, `team: teamAbbreviation`
   - `opp`: from top-level `competitions[]` — find the game whose home/away abbreviations match the player's `teamAbbreviation`, take the other side
   - `salary` ✓; `status`/`newsStatus`/`isDisabled` → exclusion flag (isDisabled or injury status = out of pool)
   - `proj/floor/ceiling/own`: **not from DK** — adapter emits salary/status/team/game; projections + ownership merge downstream per the total-signal doctrine. DK's `draftStatAttributes[id 90]` value can seed `formL5`/recent-PPG context only.
4. **FanDuel adapter:** CSV-parse path mirroring `FanDuelCSVImporter` columns (`Id, First Name, Last Name, Position, Team, Salary, FPPG, Injury Indicator, Game`) → `DfsPlayer`; founder drops the CSV (manual download from a logged-in FD contest page). No API path without login; logged-in poller is ToS-sensitive — flag for Garrett before building.
5. **Registration:** `registerDfsSlateProvider({ name: "DraftKings salary feed", live: true, slate: () => snapshot })` — founder-only call, env `DFS_PROVIDER` set. Snapshot carries `{ draftGroupId, fetchedAt, lockTime }`.

## ⚠️ Flag requiring Garrett's call

`apps/web/lib/integrations/dfs.ts` header and `providers.ts:36` currently state the live slate must be *"a licensed live slate (salaries + projections + ownership, obtained from a contracted provider — never scraped, and never the forbidden DraftKings hidden endpoint)"*. The verified DK draftables path is exactly the kind of endpoint that language appears to forbid. So: **the programmatic path exists and works, but wiring it as the registered live provider conflicts with the repo's standing rule.** Garrett decides whether (a) the rule stands — DK path becomes research/backup input only, adapter built for a contracted feed instead; or (b) the rule is revised for read-only public salary reads.

*Research only. No accounts created; no spending; no credentials used or stored. Probe scripts and samples live in /tmp/lane1/ (ephemeral).*
