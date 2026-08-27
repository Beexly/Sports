# Galaxy Sports API — Re-Audit Running Log (REPLACE THE ODDS API, $0)

Branch: `hermes/sports-intel-orientation` (NOT main). Owner: Hermes.
Purpose: running log of what was researched / tested / fixed / corrected, plus the
open queue, so Claude Code and other agents see exactly where this stands.

Status: ACTIVE. The $30/mo The Odds API bill can be KILLED for the ingestion pipeline
by an env flip (set `RUNDOWN_API_KEY`, unset `THE_ODDS_API_KEY`). A standalone personal
proof (Galaxy Sports API) is built and verified at `C:/Users/Garrett/galaxy-sports-api/`.

====================================================================
PART 1 — WHAT WAS RESEARCHED & TESTED (live, from this machine, 2026-08-27)
====================================================================
LIVE ENDPOINTS PROBED (HTTP status + real payload confirmed):
- ESPN scoreboard `site.web.api.espn.com/apis/site/v2/sports/.../scoreboard`
  -> 200. NFL 16/16, CFB 25/25, MLB 7/7 carry DraftKings spread/total/ML.
  NOTE: `site.api.espn.com` and `sports.core.api.espn.com` are BLOCKED from this IP
  (Akamai 403/HTTPError). The repo's `espn-odds-client.ts` uses `sports.core.api.espn.com`
  -> its ESPN tertiary fallback would FAIL here. Galaxy script uses the live `site.web.api`.
- TheRundown `api.therundown.com/api/v2/sports` -> 200 JSON, NO KEY (proves free tier real).
  Events endpoint needs the (free, email-only, no-card) key.
- Polymarket GAMMA `gamma-api.polymarket.com/events?title=nfl` -> 200 JSON, NO KEY.
  CONFIRMED real NFL game markets w/ live prices (e.g. "Falcons -3.5 Panthers" =
  outcomePrices [0.0000003, 0.9999997]). ~7 NFL game markets returned.
- TheSportsDB schedule API -> 200 JSON (fixtures/scores, no odds).
- GitHub `slieb74/NFL-Betting-Data` raw CSV -> 200 (spread_favorite + over_under_line,
  seasons 1968-2017). Free historical lines.

ENDPOINTS CONFIRMED DEAD / WALLED (honest, do NOT rely on):
- Kaggle direct-download -> reCAPTCHA wall (not usable).
- DK/FD/BetMGM/Caesars/Bovada own JSON -> Akamai/Cloudflare block from this IP.
  (Reachable only via real browser = Playwright scraper; personal/research only.)
- Pinnacle API -> 451 (shut Jul 2025).
- nflverse -> ships schedules/teams/trades etc., NO odds/closing-lines dataset.
- sportsoddshistory.com / covers.com / oddsshark.com / teamrankings.com / sportsbookreviewsonline.com
  -> all return HTML with ZERO real line rows (string hits were CSS class names, not data).
  The 2018-2025 historical-lines gap is GENUINELY unsolved free.
- The Odds API "demo" key -> 401. No free tier without signup (still a vendor).

REPO CODE READ (the part I originally SKIPPED, which reversed my first plan):
- `packages/ingestion-pipeline/src/process-sport.ts` — has a REAL 3-tier odds fallback:
    (1) OddsApiClient (if key + paidCallJustified('odds') true)
    (2) `fetchRundownEventsForSport` (TheRundown, full-replace when empty OR thin-fill)
    (3) `fetchEspnOddsForSport` (ESPN public, tertiary)
  -> INGESTION PIPELINE is ALREADY free-capable. Kill switch = env flip (see Part 3).
- `packages/data-ingestion/src/odds-provider-adapter.ts` (`createOddsQuoteProvider`) —
  ONLY two states: 'the-odds-api' | 'offline'. SEPARATE consumer from process-sport.
  Does NOT consume Rundown/ESPN. This is the one place needing a code change for a
  fully-free LIVE gate (see queue).
- `packages/data-ingestion/src/index.ts` — exports a whole free/cheap client layer:
  PolymarketIndependentClient, KalshiClient, predexon-client, sharp-api-client, novig-client,
  prophetx-client, resolveOddsWithFailover, rundown-client, espn-odds-client.
  The repo is FAR ahead of my Galaxy script; Galaxy = personal proof, repo clients = prod path.
- `packages/data-ingestion/src/source-registry.ts` — legal governance:
  espn-hidden-api FORBIDDEN (commercial), therundown use-with-caution (free OK),
  kalshi paid-required, draftkings-unofficial FORBIDDEN, sportsdataio/fantasydata paid-required.
- `packages/ingestion-pipeline/src/refresh-odds.ts` — the cron refresh loop; calls
  processSport; genuinely used (not orphaned). Free path lives here.

====================================================================
PART 2 — WHAT WAS BUILT / FIXED (Galaxy Sports API, verified)
====================================================================
File: `C:/Users/Garrett/galaxy-sports-api/odds_feed.py` (Python, no deps beyond stdlib).
- ESPN keyless live feed -> The-Odds-API v4-shaped JSON (bookmakers/markets/outcomes).
  Verified: NFL 16, CFB 25, MLB 7 games.
- de-vig: added `am_to_dec` + `de_vig` (blueprint formula p_i=(1/O_i)/Σ(1/O_j)); emits
  `fair_prob` on h2h where both ML prices exist. Verified Bills -159/+132 -> 0.5875/0.4125.
- Polymarket: added `fetch_polymarket_nfl()` -> emitted as bookmaker `polymarket_consensus`
  (keyless 2nd source). Fixed bug: Polymarket returns outcomes/outcomePrices as JSON-encoded
  STRINGS, not lists (json.loads both). Verified 26 NFL/NBA markets served.
- `--serve PORT` mode: VERIFIED serving at localhost:8731 (42 NFL events: ESPN + Polymarket).
- `polymarket` sport sub-command prints just the prediction-market consensus.
- Rate-limit note (~1 req/30s), personal/research use, no faked -110 prices (spread price=None).

File: `C:/Users/Garrett/galaxy-sports-api/KILL_THE_ODDS_API.md` — multi-solution playbook,
7 solutions ranked, corrected twice (Polymarket real; ingestion kill = env flip).

Ledger: `RND-0827` row in `.cagent/Sports/docs/ops/AGENT_LEDGER.md` updated + pushed
(8ca5ab985) with the corrected architecture truth (ingestion kill = env flip; live gate = code
change; Polymarket real; 2018-2025 gap open).

====================================================================
PART 3 — CORRECTIONS MADE THIS SESSION (what I got wrong, now fixed)
====================================================================
1. "Cancel The Odds API = just flip env." FIRST pass I said this; then OVER-corrected to
   "needs a code change." BOTH partial/wrong. TRUTH (verified pass 4): the live odds
   Source-of-Record is the DB, written by `processSport` (packages/ingestion-pipeline),
   which has a REAL 3-tier fallback: OddsApiClient -> fetchRundownEventsForSport ->
   fetchEspnOddsForSport. `createOddsQuoteProvider` (the offline-only adapter I fixated on)
   is a LEGACY/DEAD adapter — only referenced by its own test, NOT in any hot path.
   LIVE_BOARD is founder-gated and OFF (reads DB projection). So: KILL SWITCH = PURE ENV FLIP
   (set RUNDOWN_API_KEY, unset THE_ODDS_API_KEY). NO code change needed. Galaxy = personal proof.
2. "Polymarket has no NFL markets." WRONG. Confirmed real NFL game markets w/ live prices;
   wired into Galaxy as a 2nd keyless source.
3. "Every free alternative needs a key." WRONG. ESPN (keyless) + Polymarket (keyless) + GitHub
   CSV (keyless) all work. TheRundown free tier = email-only, no card.
4. "Galaxy script is the production path." Refined: Galaxy = personal proof; the repo's OWN
   clients (rundown/espc/polymarket/kalshi) are the prod path and are already built/tested.

====================================================================
PART 4 — OPEN CORNERS NOT YET CHECKED (honest gaps)
====================================================================
- [ ] Free Rundown key not obtainable here -> could not FIRE `fetchRundownEventsForSport`
  with a real key to prove multi-book odds shape end-to-end. Needs user to paste key. (HIGH)
- [ ] `espn-odds-client.ts` uses dead host `sports.core.api.espn.com` from this IP (Akamai
  blocks it). Galaxy uses the live `site.web.api.espn.com`. For prod ESPN tertiary from THIS
  machine, route to site.web.api — but source-registry marks espn-hidden-api FORBIDDEN for
  commercial, so leave as-is unless user decides (ToS).
- [ ] Player props free source: Polymarket props = 1 mis-tagged market (not real). No free
  prop feed verified. Kalshi/PredExon/SharpApi need keys/grants. GAP.
- [ ] 2018-2025 historical closing lines: no free structured source found. Only fix =
  one-time Covers HTML scrape or final paid-month backfill. GAP.
- [ ] In-game live line moves: not solved free (books block server-side). Needs Playwright.
- [ ] Commercial resale of raw odds: forbidden by ToS/licensing (derived-data strategy in
  blueprint). We sell transformed model output, not raw rows. LEGAL BOUNDARY.

====================================================================
PART 5 — QUEUE / NEXT STEPS / SUGGESTIONS
====================================================================
1. [USER ACTION] Get free TheRundown key (email, no card): therundown.io/pricing/api.
   Paste into `RUNDOWN_API_KEY`; unset `THE_ODDS_API_KEY`. This kills the $30 bill — PURE ENV
   FLIP, no code change (processSport already free-falls through Rundown->ESPN). Verify
   processSport logs `therundown` / `espn_public` provider tag instead of `the-odds-api`.
2. [RESEARCH] Fire `fetchRundownEventsForSport` with the real key to confirm multi-book odds
   shape + 20k/day free-tier behavior. (Needs the key from step 1.)
3. [RESEARCH] One-time Covers/sportsoddshistory HTML scrape for 2018-2025 closing lines
   (Playwright, personal/research). Fills the only real historical gap.
4. [POLISH] Galaxy: add `/health` endpoint, cache layer, per-sport rate limiter; wire as a
   local dev substitute for The Odds API in tests (already serves at :8731).
5. [DOC] Keep this log updated each pass; do not declare "done" until step 1 + 2 are closed.

Last updated: 2026-08-27 (pass 4 of re-audit — kill switch confirmed = env flip, no code).
