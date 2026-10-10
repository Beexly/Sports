# FANTASY TOOLING RECON v2 — deep pass (2026-10-10 night)
_Verified live tonight. This pass = keyless APIs nobody mines + competitor infrastructure maps. v1 landscape notes stand; this file supersedes per-site status._

## 1. NEWLY CRACKED — keyless data APIs (the "nobody has this" tier)

### 1.1 MyFantasyLeague export API — LIVE, keyless, JSON [VERIFIED]
```
GET https://api.myfantasyleague.com/2026/export?TYPE=players&L=&COUNT=N&JSON=1   # full player DB (188KB for all)
GET https://api.myfantasyleague.com/2026/export?TYPE=adp&COUNT=N&JSON=1          # LIVE ADP w/ draftSelPct + averagePick
```
- MFL = the deepest fantasy config platform; their export API exposes players/ADP/drafts/livescoring keyless. ADP payload fields: rank, id, averagePick, draftsSelectedIn, draftSelPct.
- **Lane**: fantasy-rankings consensus + MFL-specific ADP (different population than UD/DK best-ball → cross-market ADP arb).

### 1.2 FantasyFootballCalculator ADP API — LIVE, keyless [VERIFIED]
```
GET https://fantasyfootballcalculator.com/api/v1/adp/standard?teams=12&year=2026
# also /half-ppr /ppr /superflex /2qb ; meta includes total_drafts + date window
```
- Returns per-player: adp, timesDrafted, high/low, team/position/stub. 156 drafts in tonight's sample window.
- **Lane**: a THIRD independent ADP population (sharks' mock-draft site) — with MFL + Sleeper + DK/UD ADP = a 5-source fantasy-player-market panel. Nobody ships cross-source ADP efficiency stats; ours can.

### 1.3 FantasyPros — server-rendered consensus pages parseable keyless [VERIFIED-HTML]
- api.fantasypros.com exists (v2 host seen: `/v2/defloc?cors=1`); full API = key-gated. BUT rankings/ADP pages (591KB) carry the data server-side → HTML-parse = keyless consensus feed (structure, not Firecrawl-generic: we map their exact table nodes).
- **Lane**: consensus + expert-disagreement spread (registry entry I).

## 2. COMPETITOR INFRASTRUCTURE MAPS (tonight's chunk-mines)

### 2.1 PropFinder.app — book coverage + backend doors [VERIFIED]
- **Aggregated books (from app chunks)**: DraftKings · FanDuel · **Caesars · BetMGM · Fanatics** · PrizePicks · Underdog · **bet365** · deep-links to **Hard Rock (app.hardrock.bet) · Borgata (sports.borgataonline.com) · Novig (app.novig.us)**.
- **Backend doors found**: `hangfire.propfinder.app` + `hangfire-odds.propfinder.app` — Hangfire (.NET job) dashboards: root 404, **`/hangfire` → 401 (exists, auth-gated)**; static assets on DigitalOcean Spaces `pf-static.nyc3` (listing 403, bucket real).
- **Strategic read**: their book list = our gap list. Caesars/BetMGM/Fanatics props endpoints = the next books_api.py adapters (direct from books = better than their wrapper). Novig = a NEW lane entirely (peer market, no vig model) — worth its own recon.
- Their DataDome-free chunk surface means odds arrive via API calls we haven't located yet (Next.js server routes likely `/api/trpc` or similar — next session: XHR capture in browser).

### 2.2 Big-book direct probes [status tonight]
- Caesars `sportsbook.caesars.com/api/bets/v1/apex/usnj/sports` → 200 but SPA shell (data routes deeper; community-known apex REST exists — enumerate next session).
- BetMGM `sports.betmgm.com/en/sports/api/cms/sports` → 200 empty (params needed).
- Fanatics → 403 (Akamai). ESPN BET → transport fail from shell (browser lane).
- LineStar (DNN): module JS enumerated (`/Portals/0/js/fantasysportsco.*`); data services not yet found → next: browser XHR capture on a live dashboard (the DK/Pinnacle recipe).

## 3. THE CROSS-MARKET ADP IDEA (uniquely ours, data live tonight)
Five independent fantasy-player markets, all keyless: **MFL ADP · FFC ADP · Sleeper (players+leagues) · DK best-ball ADP · UD ADP** (last two via our browser lanes/FP article tables).
- Build: normalize names/positions → compute per-player ADP spread, z-deviation from cross-source mean, and platform-meta adjustments (UD 18-rd half-PPR WR-heavy vs DK full-PPR QB-hungry — verified in FP article).
- Payoff: GSE rankings lane ships **market-efficiency stats for player RANKINGS** (which platforms lag which players) — a feature no tool in §1-v1 list has. Also feeds the "narrative vs base rate" cognitive layer (CONTEXTUAL_LAYER §7).

## 4. Next-session queue (chunk-mines + XHR captures)
1. PropFinder XHR capture → their odds API shape (adds Caesars/BetMGM/Fanatics/bet365 mirror + Novig recon).
2. Caesars apex REST enumeration (community pattern: /api/bets/v1/apex/usnj/sports/{sport-guid}/leagues/...).
3. LineStar DNN XHR capture → DFS projections benchmark feed.
4. RT Sports SPA bundle → draft/ADP API.
5. ESPN BET via browser lane (transport-blocked from shell).
6. Novig: peer-to-peer odds = zero-vig reference prices → potential best "fair value" source on the board.
