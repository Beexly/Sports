# Pick'em API recon — audit addendum (2026-09-25)

Companion to `pickem-api-recon.md` (same directory). This documents the
careful re-audit pass on branch `motif/pickem-intake-audit-2026-09-25`:
every endpoint was re-verified live with curl from the audit VM, parsers
were checked field-by-field against the live schemas, all 5 intake modules
were re-tested, and each platform was checked for a public websocket /
live-socket feed.

**Drafters is PARKED per Garrett 2026-09-25.** The Drafters intake module
from the earlier pass is untouched on main (default-OFF, fail-closed);
nothing on this branch wires, references, or activates Drafters.

## Live re-verification (all 2026-09-25 ~22:25–22:30 UTC, this VM)

| Platform | Endpoint | Status | Result |
|---|---|---|---|
| PrizePicks | `GET partner-api.prizepicks.com/projections?league_id=9` | 200, 8.7 MB, 7,561 projections | Schema matches parser. League map re-verified via `GET /leagues` (NFL=9, NBA=7, CFB=15, MLB=2, WNBA=3, NHL=8, PGA=1, TENNIS=5, SOCCER=82, F1=125, BOXING=42, WORLD_CUP=241 — all match the module constants). No drift. |
| Underdog | `GET api.underdogfantasy.com/v2/over_under_lines?product=fantasy&sport_id=NFL` | 200, 11.9 MB, 4,290 active lines / 539 players | Schema matches parser (`stat_value` and prices arrive as strings — the parser's numeric coercion handles this). Legacy `/beta/v5` still 426, wrong `product=` values still 400. No drift. |
| DK Pick6 | `GET api.draftkings.com/pick6/v1/{pickgroups/main, pickgroups/identifier, sportleague/glossaries, pickgroups/1-1, pickgroups/153812/category/pickcards, entrydetails/153812}?format=json` | All 200 | Pickgroup 153812 still the NFL "All Day" group (153813 = PHI @ CHI standalone). pickcards: 28 cards, schema matches (`pickableId`, `entities[0].dkId`, `activePickableMarkets[].pickSixMarketId/targetValue/isPaused/isLive`). Payout tiers match. No drift. |
| Sleeper | `GET api.sleeper.app/v1/projections/nfl/regular/2026/4` → 200, 628 KB, 9,422 players; `GET .../v1/stats/nfl/regular/2026/3` → 200, 36 KB | 200 | Known keys (`adp_dd_ppr`, `pts_ppr`, `pts_half_ppr`, `pts_std`, `gp`, `gms_active`, `pos_rank_*`) all present; extras fall through to the generic stat buckets as designed. No drift. |
| Action Network | `GET api.actionnetwork.com/web/v1/scoreboard/nfl?date=20260927&bookIds=15,30` | **200 only with a browser User-Agent; 403 CloudFront block for bare curl UAs** | **Drift found and fixed** (see below). |

## Action Network drift fixes (2026-09-25 audit)

Three real schema/behavior changes vs the first pass, all fixed in
`packages/data-ingestion/src/action-network-scoreboard-intake.ts` on this
branch, with new tests:

1. **CloudFront 403 without a browser UA.** The endpoint was 200 for bare
   curl in the first pass; it now 403s default curl User-Agents and returns
   200 (~1.59 MB, 16 games) with a browser-like UA. The module is
   transport-agnostic (pure ingest), so the requirement is documented in the
   module header; any fetch wrapper must send a browser UA.
2. **`season` is numeric, `line_status` is an object.** Current payloads ship
   `season: 2026` (was string) and `line_status: {over:0, under:0, ...}`
   (was a string). Parser now accepts numeric season and preserves
   object line_status as JSON without inventing semantics.
3. **`teams` order is unstable — the old parser's [away, home] assumption
   was wrong.** Verified live: one game had `[away, home]`, the next
   `[home, away]` (cross-checked against `away_team_id`/`home_team_id`).
   Parser now resolves away/home via team ids, falling back to index order
   only when ids are absent.

## Websocket / live-socket check (2026-09-25)

Searched public repos, docs, and reverse-engineering writeups for each
platform for any no-auth websocket or live-socket feed (line-movement
pushes, live scoring sockets). **None found — nothing was wired.**

- **PrizePicks:** no public websocket documented. Search hits are
  third-party bots' own backend sockets, not PrizePicks' feed. The
  jacksonhedge/sneakers-trading capture docs list "WebSocket: <yes/no>"
  as an open question, i.e. their own captures found none confirmed.
- **Underdog:** no public websocket documented; same capture docs leave it
  open. The REST board is the live surface.
- **DK Pick6:** grepped the live production JS bundles
  (`assets/endpoints-C5u8nxYj.js` and the main loader) — zero
  `wss://`, `WebSocket`, `EventSource`, socket.io, Pusher, or Ably
  references. Live tracking (`isLive` markets) is REST polling. Re-run the
  bundle grep after Pick6 deploys if a socket is suspected.
- **Sleeper:** documented public API is REST-only; every community guide
  (dev.to/zuplo and others) recommends adaptive polling for live data.
- **Action Network:** no public websocket of their own. The websockets in
  this space (parlay-api, Pinnacle pinnapi, sports-odds-api) are paid,
  key-gated third-party odds feeds — not Action Network, not no-auth.

Recommendation: revisit only if a concrete public socket URL surfaces with
a verified no-auth handshake; do not build on speculation.

## Test / typecheck status

- 48/48 vitest tests pass across the 5 module test files (12 PrizePicks,
  8 Underdog, 10 DK Pick6, 8 Sleeper, 10 Action Network incl. 3 new
  drift-regression tests), run per-section during the audit.
- `tsc` clean for all new/audited files (only pre-existing errors in
  unrelated files remain, untouched).

## Env flags (unchanged, default-OFF)

`PRIZEPICKS_INTAKE_ENABLED`, `UNDERDOG_PICKEM_INTAKE_ENABLED`,
`DK_PICK6_INTAKE_ENABLED`, `SLEEPER_PROJECTIONS_INTAKE_ENABLED`,
`ACTION_NETWORK_SCOREBOARD_INTAKE_ENABLED`.
