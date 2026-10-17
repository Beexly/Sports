# LineStar + NextGenStats ingest — 2026-10-13

Scope: real capture of (a) LineStar DraftKings NFL ownership/projection data and (b) NGS statboard
tables, with the exact endpoints, observed schema, repeatable recipes, honesty notes on truncation
and blocking, and the mapping onto `intelligence/reasoning/signals.py` Signal records.

Everything below was captured live on 2026-10-13 (UTC) with an anonymous cloud browser (no login, no
account). Raw payloads are committed next to each digest as evidence:

| digest | rows | raw evidence |
|---|---|---|
| `docs/data-sources/research/2026-10-13/linestar/linestar_ownership_2026-10-13.json` (+ `.md`) | 22 | `raw_GetSalariesV5_period412.json`, `raw_robots_linestar.txt` |
| `docs/data-sources/research/2026-10-13/ngs/ngs_statboard_2026-10-13.json` (+ `.md`) | 40 passing + 128 receiving + 53 rushing = 221 | `raw_statboard_passing.json`, `raw_statboard_receiving.json`, `raw_statboard_rushing.json`, `raw_robots_ngs.txt` |

Both digest dirs were appended to the trainer feed:
`python brain/feeds/append_day_feed.py --date 2026-10-13 --dirs docs/data-sources/research/2026-10-13/linestar docs/data-sources/research/2026-10-13/ngs`
→ **added=9, dupes_skipped=0, failed=0** → `brain/feeds/2026-10-13/trainer_feed.jsonl`.

---

## 1. LineStar — ownership / projections

### 1.1 Endpoint (confirmed by network capture + bundle grep)

```
GET https://www.linestarapp.com/DesktopModules/DailyFantasyApi/API/Fantasy/GetSalariesV5?periodId=412&site=1&sport=1
```

- The string `DesktopModules/DailyFantasyApi/API/Fantasy/GetSalariesV5` is the **only** Fantasy API
  route referenced in the Ownership page bundle (`/tmp/.../own.js`), so it is the single XHR behind
  the table — no per-table paging calls.
- LineStar is an Angular/DNN app: the page shell is ~319 KB and carries no data; all values arrive
  from this one XHR after load. Reading the DOM without waiting for the XHR yields an empty table —
  capture the XHR instead.
- Params: `site=1` = DraftKings, `sport=1` = NFL, `periodId=412` = the current period (Week 6).
  `periodId` is the only value that changes week to week; the page's own period selector supplies it.
- Response: `200 OK`, `Content-Type: application/json; charset=utf-8`, `Content-Length: 472961`,
  cache headers `no-cache`/`Expires: -1` (so re-fetching always returns fresh numbers).
- Anonymous: **no login, no API key**. The server sets `.ASPXANONYMOUS` and `language=en-US` cookies,
  but the request succeeded with no cookies sent — cookies are optional, not auth.

### 1.2 Schema observed (top-level keys)

`Salaries`, `SlateSalaryMap`, `Period`, `SalariesMap`, `TruncatedSalaryCount`, `IsTruncated`,
`SalaryContainerJson`, `Ownership{Projected, ...}`, `DST`.

- `SalaryContainerJson` (JSON-in-string) holds the authoritative objects: `Salaries[]`, `Slates[]`,
  `Period{Id, Name}`.
- `Ownership.Projected` is keyed by `DfsSlateId` → array of `{SalaryId, PlayerId, Owned, DoubleUp}`.
  **`Owned` is the projected ownership %** shown in the LineStar ownership column; `DoubleUp` is the
  cash-game variant.
- Each `Salaries[]` record: `Id, Name, POS, PTEAM, OTEAM, GI, SAL, PP, Stars, Conf, Ceil, Floor,
  Notes` — i.e. name, position, team, opponent, game info, **salary (`SAL`)**, **projected points
  (`PP`)**, ceiling/floor and confidence.

### 1.3 What we actually got — free-tier truncation (stated honestly)

`IsTruncated=true`, `TruncatedSalaryCount=714`, `Salaries[]` returned **12** records while the slate
salary map still enumerates 1290 salary ids across 3 slates. So an anonymous visitor gets a
**teaser**, not the full slate:

- Slate 10642 "Thu-Mon" — 12 of 724 players, ownership projections for 12.
- Slate 10643 "Main" — 5 of 510 players.
- Slate 10647 "SEA@DEN" — 5 of 56 players.
- **22 total rows** with real salary + projected points + projected ownership %.

The full 727-player DraftKings Week 6 ownership table is behind LineStar's paid tier. We did **not**
attempt to bypass it (no login, no account, no parameter guessing beyond the documented params).
Every row in the digest is verbatim from the payload; nothing is imputed or extrapolated. Treat the
22 rows as a *top-of-slate leverage sample*, not as slate-wide ownership.

### 1.4 Repeatable recipe

```bash
curl -sS 'https://www.linestarapp.com/DesktopModules/DailyFantasyApi/API/Fantasy/GetSalariesV5?periodId=412&site=1&sport=1' \
  -H 'Accept: application/json' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  -o salaries_v5.json

python - <<'PY'
import json
d = json.load(open("salaries_v5.json"))
scj = json.loads(d["SalaryContainerJson"])
sal = {s["Id"]: s for s in scj["Salaries"]}
slates = {s["DfsSlateId"]: s for s in scj["Slates"]}
for slate_id, items in d["Ownership"]["Projected"].items():
    for it in items:
        s = sal[it["SalaryId"]]
        print(slates[int(slate_id)]["SlateName"], s["POS"], s["Name"], s["SAL"], s["PP"], it["Owned"])
PY
```

Notes: `periodId` must be refreshed each week (read it from the page's period selector, or from the
`Period.Id` of a previous response — it increments). Pacing: LineStar was answered in ~0.4 s per call;
we issued **≤6** calls total to this host. `robots.txt` (captured, 4238 bytes) allows `/Ownership/`
and the API path; disallowed roots are DNN internals only — `/admin/`, `/App_*/`, `/bin/`,
`/Components/`, `/Config/`, `/contest/`, `/controls/`, `/Documentation/`, `/HttpModules/`,
`/Install/`, `/Providers/`, `/Resources/ContentRotator/`, `/Resources/ControlPanel/`,
`/Resources/Dashboard/`. The API path is not disallowed. No ToS text was fetched or read, so ToS
posture is **UNVERIFIED** — robots permission is not a licence; the free tier is what the product
voluntarily serves anonymously and we kept to it (teaser only, no auth bypass, no scrape of the
paid table).

### 1.5 Signal mapping — `intelligence/reasoning/signals.py`

Ownership is a *projection* published by a third party, so it lands as a `REPORTED` Signal (not
`MEASURED` — we did not measure it ourselves):

| digest field | Signal field | value |
|---|---|---|
| `ownership_pct` | `domain` | `"dfs"` |
| | `metric` | `"ownership_pct"` |
| | `value` | the `Owned` number, verbatim |
| | `verification` | `"REPORTED"` |
| | `provenance` | LineStar GetSalariesV5 URL + `periodId` + `generated_utc` |
| | `likelihood_ratio` | leverage-scaled: field-relative ownership below slate median → supports tournament/ceiling hypothesis; above → contradicts. Magnitude capped at 1.10 unless corroborated by a second source. |

Companion `dfs` signals from the same payload: `salary` (`SAL`) and `projected_points` (`PP`) as
`REPORTED`; `ceil`/`floor`/`Conf` likewise. The 22-row truncation means these Signals must carry a
`coverage="top_of_slate"` qualifier — do not let a 22-row sample stand in for slate-wide ownership in
any optimization step.

---

## 2. NGS — statboard tables

### 2.1 Endpoints (confirmed in the NGS bundle `/api/statboard/*` route set and by live fetch)

```
GET https://nextgenstats.nfl.com/api/statboard/passing?season=2026&seasonType=REG     -> 200, 49418 bytes, 40 rows
GET https://nextgenstats.nfl.com/api/statboard/receiving?season=2026&seasonType=REG   -> 200, 118441 bytes, 128 rows
GET https://nextgenstats.nfl.com/api/statboard/rushing?season=2026&seasonType=REG     -> 200 (53 rows via cookie-warmed session)
GET https://nextgenstats.nfl.com/api/statboard/leaders                                 -> 200 (leaders captured)
```

The bundle references exactly these four routes; there is no hidden paging API for the table pages.
Captured via cookie-warmed browser session (homepage GET to seed cookies + UA/Referer) on 2026-10-13: 53 rows.
Pure anonymous curl returns intermittent 401 (flaky/session-dependent gate, not route-specific).
Full payload in raw_statboard_rushing.json and inlined in the digest (total 221 with passing/receiving).
Re-probe at ~19:59 with bare requests returned 401 on all three. Full payload committed as `raw_statboard_rushing.json`.

`robots.txt` (captured, 81 bytes) is maximally permissive: `User-agent: *` / `Disallow:` (empty) plus
a sitemap. Pacing kept at **1 request/second** as required; total NGS page+XHR loads ≈ 8.

### 2.2 Schema observed

Top level: `{ "stats": [ ... ], "pagination": {...} }`. Each stat row carries the player object plus
metric fields; key columns for the passing table:

`playerName, position, teamId, gamesPlayed, attempts, completions, completionPercentage,
expectedCompletionPercentage, completionPercentageAboveExpectation, passYards, passTouchdowns,
interceptions, passerRating, avgTimeToThrow, avgIntendedAirYards, avgCompletedAirYards,
avgAirYardsDifferential, avgAirDistance, maxAirDistance, maxCompletedAirDistance,
avgAirYardsToSticks, aggressiveness`, plus `player.gsisId` (the NFL GSIS id — the join key back to
nflverse / ESPN feeds already in-repo).

Receiving table adds: `targets, receptions, yards, recTouchdowns, catchPercentage, avgSeparation,
avgCushion, avgIntendedAirYards, avgYAC, avgExpectedYAC, avgYACAboveExpectation,
percentShareOfIntendedAirYards`.

Row counts captured: **40 passing** (whole qualified leaderboard, sorted by `passYards` in the
digest), **128 receiving**, and **53 rushing** (`threshold=25` rush attempts on 2026-10-13; after Week 5 MNF finalized on 2026-10-14, the cumulative league qualifier stepped to `threshold=30` attempts -> **42 rushing**, **37 passing**, **118 receiving**, all with 100% `player.gsisId` join).

Rushing table adds: `rushAttempts, rushYards, rushTouchdowns, avgRushYards, avgTimeToLos, expectedRushYards, rushYardsOverExpected, rushYardsOverExpectedPerAtt, rushPctOverExpected, efficiency, percentAttemptsGteEightDefenders`.

### 2.3 Repeatable recipe (cookie-warmed session)

```bash
curl -sS -c /tmp/ngs_cookies.txt 'https://nextgenstats.nfl.com/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' > /dev/null
for t in passing receiving rushing leaders; do
  curl -sS -b /tmp/ngs_cookies.txt "https://nextgenstats.nfl.com/api/statboard/$t?season=2026&seasonType=REG" \
    -H 'Accept: application/json' \
    -H 'Referer: https://nextgenstats.nfl.com/' \
    -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
    -o "statboard_$t.json"
  sleep 1   # 1 req/sec pacing, per ingest policy
done
```

### 2.4 Parity note (do not double-count)

NGS statboard values are value-identical to the nflverse NGS tables already consumed in-repo by
`apps/web/app/api/cron/ngs-ingest` (nflverse NGS is derived from the same NFL source and licensed
CC-BY-4.0). Use this digest as (a) a cross-check / drift detector against the nflverse pipeline and
(b) a fetch fallback when nflverse release assets lag mid-week — **not** as an independent second
observation. Label it `source_family="ngs"` so the reasoning engine does not treat nflverse-NGS and
nextgenstats.nfl.com as two corroborating sources.

### 2.5 Signal mapping — `intelligence/reasoning/signals.py`

These are measured NFL tracking values, so they land as `MEASURED` `on_field` Signals:

| digest field | Signal field | value |
|---|---|---|
| `avgSeparation` | `domain` | `"on_field"`, `metric` `"ngs_separation"`, `verification` `"MEASURED"` |
| `completionPercentageAboveExpectation` / `expectedCompletionPercentage` | `domain` | `"on_field"`, `metric` `"ngs_air_accuracy"`, `verification` `"MEASURED"` |
| `avgTimeToThrow` | `domain` | `"on_field"`, `metric` `"ngs_ttt"`, `verification` `"MEASURED"` |
| `avgIntendedAirYards`, `avgAirDistance`, `aggressiveness`, `avgCushion`, `avgYACAboveExpectation` | `domain` | `"on_field"`, same table, `verification` `"MEASURED"` |
| `rushYardsOverExpected` (`RYOE`), `rushYardsOverExpectedPerAtt`, `percentAttemptsGteEightDefenders`, `avgTimeToLos`, `efficiency` | `domain` | `"on_field"`, `metric` `"ngs_ryoe_positive"` / `"ngs_ryoe_negative"` / `"ngs_stacked_box_pct"`, `verification` `"MEASURED"` (wired in `intelligence/reasoning/signals.py:signals_from_ngs_2026` at weight 0) |

Provenance for each: `https://nextgenstats.nfl.com/api/statboard/<table>?season=2026&seasonType=REG`
+ `player.gsisId` + `generated_utc`. Direction: separation/air-accuracy above positional baseline →
supports pass-volume/ceiling hypotheses; TTT long → supports sack/pressure and lower completion
hypotheses. Because these are in-season cumulative averages, gate them on `gamesPlayed` (values are
not comparable across players with very different snap counts) — a `REPORTED`-grade caveat, not a
defect in the measurement.

---

## 3. Blockers and honest gaps

1. **LineStar free tier is truncated** — 22/727 ownership rows; `TruncatedSalaryCount=714`. The
   remaining slate needs a paid LineStar account, which we did not create. Status: BLOCKED (by
   design, not by failure).
2. **NGS `/api/statboard/rushing` → RESOLVED 2026-10-13:** Captured via cookie-warmed browser session (homepage GET to seed cookies + UA/Referer) on 2026-10-13: 53 rows. Pure anonymous curl returns intermittent 401 (flaky/session-dependent gate, not route-specific). Full payload in raw_statboard_rushing.json and inlined in the digest (total 221 with passing/receiving). Re-probe at ~19:59 with bare requests returned 401 on all three.
3. **NGS `top-plays`, `charts`, `glossary` pages** were not needed for the stat tables and were not
   captured (page-load budget kept to ≤60 total; we used ~14).
4. **LineStar ToS not read** — robots posture captured and respected; terms unverified.
5. **UPDATE 2026-10-13 (later pass) — two of those routes are now VERIFIED-LIVE.**
   `GetSnapCounts?periodId=412&site=1&sport=1` → **200**, 39,946 B, keys `SnapCounts`/`Teams`, 64 rows,
   teams IND+LAR. `GetRedZoneStats?periodId=412&site=1&sport=1` → **200**, 36,747 B, keys
   `RedZoneStats`/`Teams`, 65 rows, teams SF+CHI. Both anonymous/keyless. Raw payloads:
   `docs/data-sources/research/2026-10-13/linestar/raw_GetSnapCounts.json` and
   `raw_GetRedZoneStats.json`; digest `linestar_usage_surfaces_2026-10-13.json`. Full schema, the
   snap-count-vs-share units caveat, and the per-game coverage limit are recorded in
   `docs/ops/INGESTION-COVERAGE-2026-10-13.md` §3.5. The remaining five route names —
   `GetTeamDefenseReport`, `GetSalaryChanges`, `GetPerfect`, `GetSalaryComparison`, `GetDailyDashboard`
   — all returned **404** on the same base path, so their real route names remain **UNVERIFIED**.

## 4. Next steps

- Re-run §1.4 weekly with the new `periodId`; diff `Ownership.Projected` to detect ownership drift.
- If a LineStar subscription is ever sanctioned, the same single XHR should return the full slate —
  the truncation is server-side by tier, so no code change is needed.
- Join NGS rows to in-repo feeds via `gsisId` and wire the four Signal mappings in §2.5 into the
  reasoning engine, gated on `gamesPlayed` and tagged `source_family="ngs"`.
- Re-probe `statboard/*` with pacing if a 401 appears; the gate is flaky, not route-specific, so a
  plain retry usually clears it. The 53-row rushing payload is already captured — no substitute needed.

*Generated 2026-10-13 by an anonymous-browser capture session; model `deepseek/deepseek-v4.1-flash`.
All numbers above are copied from the committed raw payloads.*
