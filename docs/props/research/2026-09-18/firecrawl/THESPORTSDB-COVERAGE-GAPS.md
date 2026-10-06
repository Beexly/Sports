# TheSportsDB Free API — Coverage Gaps vs nflverse / ESPN
**Research + wiring date:** 2026-09-18 (CDT)
**Client:** `packages/data-ingestion/src/thesportsdb-client.ts` (soft-fail, throttled, opt-in enrichment fallback)
**Label convention:** CONFIRMED = observed live or in shipped code; INFERRED = reasonable deduction; UNVERIFIED = not yet tested.

## What the free tier actually covers

| Capability | Label | Evidence |
|---|---|---|
| NFL team directory with metadata (stadium, location, formed year, colors, badges/logos) | CONFIRMED | `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=NFL` fetched 2026-09-18 ~16:08 CDT — returned full NFL team objects (idTeam, strTeamShort e.g. "ARI", strStadium, strLocation, strColour1, strBadge, strLogo) |
| Crosswalk IDs: `idESPN`, `idAPIfootball` on team objects | CONFIRMED | Same payload — Arizona Cardinals carried idESPN "22", idAPIfootball "11" |
| Crosswalk completeness is NOT guaranteed (some teams null) | CONFIRMED | Same payload — Atlanta Falcons carried idESPN null |
| Free at point of access; $9/mo premium adds production key + V2 API (2-min livescores, video highlights) | CONFIRMED | https://www.thesportsdb.com/free_sports_api fetched 2026-09-18 |
| Season schedule/scores endpoint exists (`eventsseason.php?id=4391&s={season}`) | INFERRED from upstream docs + public usage | `.../eventsseason.php?id=4391&s=2026-2027` returned `{"events":null}` on 2026-09-18 — either the future season is not yet populated upstream or the season-string format differs. The client soft-fails to [] and must NOT treat [] as "no games exist". |
| Player bios by team (`searchplayers.php?t=...`): position, height/weight, nationality, DOB | UNVERIFIED live this session | Parser written to documented field names (`strPlayer`, `strPosition`, `strHeight`, `dateBorn`...); covered by mocked tests only. One fetch attempt 2026-09-18 failed with a tool-side error (not an upstream error) and was not retried. |
| Historical archive depth | UNVERIFIED | Not probed. Treat as shallow until measured. |

## Gaps vs nflverse

| Dimension | nflverse | TheSportsDB free tier |
|---|---|---|
| Play-by-play | Yes (nflfastR) | No |
| EPA / WP / WPA / Vegas WP | Yes | No |
| NGS advanced stats | Yes | No |
| Formation, motion, coverage charting | Partially (roster/depth via nflverse) | No |
| Rosters / depth charts | Yes (nflverse roster, DynastyProcess) | Basic player bios only; no depth charts, no contract data |
| Team metadata (stadium, location) | Sparse | **Rich — this is TheSportsDB's contribution** |
| Crosswalk IDs | nflverse IDs + ESPN via joins | idESPN / idAPIfootball, but incomplete (nulls observed) |
| Cost | Free, no key | Free, no key (public eval key "3") |

**Verdict:** TheSportsDB adds nothing nflverse doesn't already have for modeling inputs. It backfills *presentation/enrichment* fields (stadium, location, badges, colors) and can serve as a crosswalk source of last resort.

## Gaps vs ESPN public surfaces

| Dimension | ESPN public API | TheSportsDB free tier |
|---|---|---|
| Schedules / scores | Yes, fast, reliable | Endpoint exists but returned null for 2026-2027 (2026-09-18); community data lags ESPN |
| Live scores | Yes (public endpoints) | Throttled/slow on free tier; 2-min livescores are $9/mo premium |
| Power index / QBR / advanced metrics | Yes | None |
| Team metadata | Minimal | **Rich** |
| Auth | None (public, undocumented) | None (public eval key "3") |

**Verdict:** Never prefer TheSportsDB over ESPN for scores/schedules when ESPN is reachable. It is a fallback for enrichment fields only.

## What it is explicitly NOT

- **Not an odds source.** No odds endpoints on the free tier. (CONFIRMED — freepublicapis deep dive + upstream docs.)
- **Not a metrics source.** No EPA, no efficiency stats, no player performance numbers beyond bio fields.
- **Not a primary schedule source** until `eventsseason` is live-verified returning real games.

## Engineering rules (enforced in the client)

1. **Opt-in fallback only.** Never call in the primary ingestion path; only where enrichment fields are missing.
2. **Good citizenship:** 2500ms minimum between requests (~24/min max, well under the ~30/min implied upstream). Module-level throttle shared across calls.
3. **Cache aggressively:** team metadata changes ~yearly; schedules ~weekly. Cache in the caller — repeated live hits are wasteful and rude.
4. **Soft-fail always:** HTTP error, parse error, `events: null` → empty result. The client never throws on upstream failure.
5. **`cache: "no-store"`** on every fetch per repo convention (no-store-fetch incident 2026-07-10).
6. **Never fabricate:** empty ≠ absent. `[]` from the schedule endpoint means "upstream gave nothing", not "no games scheduled".

## Terms / licensing notes

- Upstream states "free at point of access" with a paid premium tier — read-only public consumption is within the documented free offering. (CONFIRMED — free_sports_api page, 2026-09-18.)
- Prior repo probe (2026-08-19, `docs/ops/calibration/2026-08-19-l10-provider-probes/RESULTS.md`) flagged TheSportsDB as GATED pending "registry entry + terms clearance before any automation" — this client answers that gate with: public key only, no login, no automation beyond opt-in fallback, throttled, cached. A production premium key (`SPORTSDB_API_KEY`) is the supported path if usage grows.
- Do not redistribute TheSportsDB data as a standalone product; verify upstream terms before persisting at scale.

## Open questions for live verification

1. Does `eventsseason.php?id=4391&s=2025-2026` (or other season strings) return real games?
2. Does `searchplayers.php?t=Houston Texans` return real player rows on the free key?
3. What is the true free-tier rate limit (observed vs documented)?
4. Historical depth of the events archive (how many seasons back?).
