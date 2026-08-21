# GitHub / Data-Source Research — Consolidated Status

**Read this file, not the chat history, for where things actually stand.** It supersedes
piecemeal reporting across four research passes on 2026-08-21. Written specifically because
each individual pass kept surfacing *more*, which is the expected behavior of an adversarial
re-check, not evidence the picture is still open-ended. This file draws the line: what is
established, what is still genuinely worth doing, and what to stop doing.

## The stopping signal, stated first

Round 1's own adversarial second-pass concluded, unprompted, in its own words:

> "Retire the generic 'sports + {db,data,pipeline,analytics,dashboard}' GitHub search — it's
> exhausted... Another pass over this repo set would hit steeply diminishing returns... the
> instrument has been exhausted for that purpose."

That is a real convergence signal, not a decision made to save effort. **Re-running the same
~70 repo URLs a third time is not recommended** — not because more couldn't theoretically be
found (an adversarial pass can always find *something*), but because what's left to find drops
in value each time, and the research process has already said so on its own.

Two research actions remain genuinely high-expected-value; everything else below this line is
either DONE or explicitly NOT recommended.

## What's actually left to do (in priority order)

1. **Fix the ESPN client's missing `limit` param.** `mzaiger/SportsDashboard`'s ESPN scraper
   passes `limit=200/500`; GSE's `EspnResultsClient.getResults()` does not. High-confidence flag
   from the second pass — this is the same failure shape as the T9 settlement bug (data silently
   missing, not erroring). Confirm ESPN's real default page size on a high-game-count day and add
   an explicit `limit` defensively. **Ties directly into the settlement backfill work already in
   progress (T11).**
2. **Write GSE's pick-grading edge cases as explicit rules.** `byteball/sports-oracle`'s
   settlement engine documents interrupted-game, postponed-game, and doubleheader-dedup policy in
   plain text. GSE's equivalent logic is implicit in ESPN-only settlement code. Also ties to T11.
3. **One narrow, differently-worded search for methodology (gap G3).** Both rounds independently
   concluded G3 (empirical-Bayes / James-Stein / negative-binomial dispersion methodology) scored
   zero across ~70 "sports + data-noun" named repos — and that this is a search-vocabulary
   artifact, not a true absence. That code lives in `nflfastR`, `hoopR`, `baseballr`, `cfbfastR`,
   `retrosheet`, and Stan/brms shrinkage-model repos, which don't self-describe with "sports-data"
   naming. One small, targeted search using this vocabulary — not another broad sweep.
4. **Vendor due diligence, not more repo search**, on the leads already surfaced:
   MySportsFeeds commercial pricing, TheSportsDB's actual data ToS (unconfirmed by either round),
   therundown.io, SharpAPI, and — separately — emailing `anthony-mccrovitz` (author of `Overlay`,
   the strongest single find) for permission before reusing any of his unlicensed code.
5. **Register two more free, open sources** directly (bypassing the wrapper repos that found
   them, which correctly stay blocked): `openfootball` (CC0, active) and `martj42/international_results`
   (CC0, 1872–2024). OpenLigaDB (ODbL) needs a legal read on its share-alike clause before
   registering.

Nothing else from the ~70-repo set needs another look. What follows is the settled record.

## Established data finds

| Source | Coverage | License / rights | Status |
|---|---|---|---|
| `flancast90/sportsbookreview-scraper` | MLB **and** NFL/NBA/NHL, 2011–2021, open+close totals | MIT (code); underlying data is uncopyrightable facts, publicly downloadable — `approved_public_logged_off` | Real, adopt. **Was under-reported as MLB-only in round 1 — it covers all four major US sports.** Frozen archive, nothing past 2021. |
| `openfootball` (via `sport.db`) | Soccer match data, actively maintained | CC0 | Found, not yet registered |
| `martj42/international_results` (via `sport.db.more`) | International soccer results, 1872–2024 | CC0 | Found, not yet registered |
| `OpenLigaDB` (via `sport.db.more`) | German soccer, free/no-auth API | ODbL (share-alike) | Found; needs legal read before registering |

**No source found in either round supplies rights-clear MLB/NFL/NBA/NHL closing lines for
2022–2026.** That window has to come from a vendor relationship (The Odds API's own historical
endpoint — worth one direct check — or a paid archive), not from public GitHub.

## Reusable engineering patterns (reimplement, not copy — none are licensed for reuse)

All from `mzaiger/SportsDashboard` unless noted:
- Token-based team-name matcher with a disqualifying-word list and symmetric-difference guard
  (prevents false matches like "Washington" vs "Washington State")
- Rate-limiter fixing a real epoch-vs-countdown header bug; separates 429s from hard failures
- "Freeze at kickoff, carry-forward only fills gaps" pick/odds policy
- Claude-call guardrails: schema validation, defensive field-stripping, hash-keyed caching,
  quota-exhaustion short-circuit
- `byteball/sports-oracle`: settlement-engine reference architecture (see item 2 above)

## Compliance — already acted on

`statsapi.mlb.com` registered `permission_required` in `source-rights-registry.ts` (PR #443,
founder-directed). MLBAM's copyright notice restricts it to individual/non-commercial/non-bulk
use; GSE's existing `mlb-statsapi-client.ts` calls it directly without clearance gating — that
wiring decision (seek authorization vs. replace the source) is still open and is the founder's
call, not resolved by the registry entry alone.

## Rights landmines — never adopt these ingestion patterns, regardless of code quality

Confirmed across both rounds, repos actively doing what CLAUDE.md's evasion rules prohibit:
`abudnick8/prop-edge` (User-Agent spoofing to defeat Underdog's Cloudflare block; paid Apify
scraping of DraftKings), `mehpackers13/fanduel-bot` (spoofed User-Agent against Action Network),
`nickkatsios/BetEdge` (Selenium against named sportsbooks), `JackTYM/betting-app-scraper`
(WebView JS injection intercepting authenticated FanDuel/Caesars/DK sessions),
`brendadeeznuts1111/betting-brain-v3` (intercepts an unlicensed offshore bookmaking backend —
legal exposure beyond ordinary ToS risk), `willbraun/tennis-predictions` (scrapes Bovada, an
unlicensed offshore book), `Mzach55/SofaScore-ETL`, `Ashu11-A/BetScraper-API` (ships explicit
CAPTCHA-bypass tooling). None of these were adopted; none should be.

## Your two flagged repos — verdict

- **`acsqlworks/-EV-Sports-Betting-Engine`** — false signal. No LICENSE despite an MIT badge, no
  real MLB data (hardcoded fake NBA/NFL rows), no ingestion or application layer. 1/5.
- **`abudnick8/prop-edge`** — real but mixed. Genuine Kalshi/Polymarket integration (real G4
  leads) and a real CLV tracker, but its "EV" math is an ad hoc fudge factor, not real de-vig, and
  two of its ingestion paths are the evasion patterns listed above. Extract the Kalshi/Polymarket
  client code in isolation only; never adopt the repo or those two ingestion paths.

## Instagram / OSINT wave 3 — complete, not reopened

18 of 25 items accessible without login; all 5 Instagram profiles hard-blocked (429 on every
attempt). Real yield: the OSINT resource list (via mirror — the live page is Cloudflare-gated)
produced concrete additions to the vendor-diligence workflow — WHOIS + OpenCorporates for
verifying a data vendor's legal entity before signing anything, Wappalyzer for pre-checking
whether a scrape target will 403, archive.today for snapshotting ToS at clearance time. Everything
else in that batch (lead-gen posts, unverified tools) was low-value or irrelevant — not re-run.

## Multi-sport re-scope — in progress, not yet complete

A workflow launched 2026-08-21 to correct an MLB-weighted scoring bias in round 2 (re-scoring
`Overlay`, `edge-scanner`, and the Odds API SDK examples specifically for NFL/EPL/NBA/NHL fit,
plus fresh direct searches per sport) is still running as this file is written. Its result will
be appended here, not reported as a fifth separate pass.

## The actual bottom line

One rights-clear historical dataset (SBR, 4 sports, 2011–2021). One strong but unlicensed
methodology reference (`Overlay`). A handful of reusable code patterns, two of which — the ESPN
`limit` param and the settlement-engine reference — matter *today* because they touch work
already in progress. Two vendor questions worth a direct email, not a search. Everything else
across ~70 repos is either noise, a toy project, or a warning label. That is a complete,
convergent picture — not a gap that another sweep will meaningfully close.
