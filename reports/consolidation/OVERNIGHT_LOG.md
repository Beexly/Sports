# Overnight Autonomous Run — Log

Remote session (orchestrator) working browser-free, build-verifiable, non-colliding slices on
`claude/compassionate-ramanujan-qqt5nb` while the owner sleeps. Sonnet research workers; every code
slice passes the whole-monorepo green gate before commit; each slice pushed. Browser-bound work
(Lighthouse perf, visual de-AI pixel pass, axe, Playwright) is DEFERRED to local/morning — this
container has no browser. Plan: `/root/.claude/plans/splendid-gliding-lark.md` (top section).

## Slices

### [A1] /today page-level auth guard (defense in depth) — `51db6ea`
- Added `await auth()` + redirect-to-signin to `/today` (was middleware-cookie-only; security-review finding).
- Source-level guard test `today-auth-gate.test.ts` (4/4).
- Gate: tsc 0 · today-auth-gate 4/4 · middleware-contract 5/5 · trust-gate ✓ · model-freeze ✓ · build exit 0.
- Note: synced stale node_modules (`@axe-core/playwright` was in package.json but not installed → 6 phantom e2e tsc errors; `npm install` cleared them; lockfile churn restored, not committed).

### [L-catalog] Vetted Leverage Catalog landed (research, read-only) — this commit
Three Sonnet research workers produced license-vetted, velocity-biased catalogs under `reports/leverage/`:
- **FREE_APIS.md** — 14 keyless WIRE-NOW APIs (ESPN Site API, Open-Meteo, NWS, Pollinations TTS, Thum.io,
  QuickChart, Nominatim, timeapi.io, ipwho.is, QR, FlagCDN, REST Countries, Microlink) + a free-tier LLM
  provider list (Cloudflare Workers AI, NVIDIA NIM, Mistral, Cohere, GitHub Models) + free-tier data
  (API-Sports, SportsGameOdds, TheSportsDB).
- **FORKABLE_REPOS.md** — COPY-NOW shortlist, all permissive (MIT/BSD/Apache/MPL): reliability-diagram SVG
  math, sparklines, svg-gauge, motion-primitives, count-up, OG cards via built-in Satori, JSON-LD helper,
  Kelly devig. Non-permissive (GPL/AGPL/no-license) skipped fast.
- **BOTS_AND_DATA.md** — Open datasets (nflverse CC-BY, Retrosheet, sportsdataverse, openfootball,
  Wikidata CC0, HIFLD venues) + MIT Discord/Telegram distribution bot skeletons + `feed` (MIT) RSS spine.
  NC/ToS-restricted sources correctly parked.

### [S2] Free-LLM pool widened with 4 free-tier OpenAI-compatible providers — this commit
- Added Mistral, NVIDIA NIM, GitHub Models, Cohere to `providers/registry.ts` (keyed-free, INERT until the
  owner sets each key → $0, zero risk; widens the pool + perspective diversity). Cloudflare Workers AI parked
  (its base URL needs a per-account ACCOUNT_ID — doesn't fit the static-baseUrl shape).
- Documented the 4 optional keys in `.env.example`.
- Gate: tsc 0 · provider-pool 8/8 · model-router 5/5 · free-lane 6/6 · env-coverage ✓ · trust-gate ✓ · build exit 0.

### [S3] Open-license datasets registered in the rights registry — this commit
- Added Wikidata (CC0), openfootball (public-domain, incl. World Cup 2026), HIFLD venue geodata (US federal
  public-domain → feeds weather lat/lon), Retrosheet (permissive, mandatory attribution notice) as
  `approved_open_license` sources in `source-rights-registry.ts`. Classification entries only — NO live
  extraction; readies the moat + honors the clearance posture.
- HONESTY NOTE for the morning: the catalog agents recommended several sources ALREADY in the registry
  (nflverse, Open-Meteo, ESPN, NWS) and SEO/JSON-LD that's ALREADY implemented (root layout Org+WebSite
  JSON-LD + lib/seo/sports-jsonld.ts). The codebase is more mature than the catalog assumed — genuine
  new-integration headroom is smaller than the catalog implies. The catalog remains a strong reference for
  the parked dep/fork items.
- Gate: tsc 0 · scraping-clearance 65/65 · trust-gate ✓ · build exit 0.

## Integration queue (safe, build-verifiable, derived from the catalog)
- [done S2] Extend the free-LLM provider registry with additional free-tier OpenAI-compatible providers.
- [done S3] Register genuinely-missing open-license datasets in the rights registry.
- Register the new keyless/free data + API sources in `source-rights-registry.ts` + `cost-policy.ts`
  (catalog + clearance entries only — no live extraction).
- Re-implement small permissive utilities TS-native (reliability-diagram helper, sparkline) with attribution,
  where build-verifiable.
- Park (owner approval): npm-dep adoptions, forks, new accounts/keys, anything needing data clearance.

### [S4] 8 new data sources registered + HARVEST_DATA_DEEP synthesis — this commit
- 8 new source-rights-registry entries: NHL API (approved_public_logged_off, keyless), BALLDONTLIE 
  (approved_api, free tier), TheSportsDB (approved_api, community open), ClearSports (approved_api,
  1000 calls/mo free), OddsPapi (vendor_candidate, free historical Pinnacle CLV data), 
  transfermarkt-datasets (approved_open_license, CC0 - 79K games/37K players), 
  OpenLigaDB (approved_open_license, keyless Bundesliga), nflverse / nfl_data_py (approved_open_license, 
  MIT+CC-BY-SA, has venue surface/roof/temp + import_officials() for referee history).
- HARVEST_DATA_DEEP.md: 40-source synthesis across sports APIs, historical odds, venue/referee data,
  soccer xG, niche sports, GitHub/Kaggle. Top WIRE-NOW finds: NHL API, nfl-data-py, OpenLigaDB,
  transfermarkt CC0, OddsPapi free tier for Pinnacle closing lines.
- Clearance entries only — NO live extraction. Readies the data moat without any spend risk.
- Gate: tsc 0 · scraping-clearance · trust-gate ✓ · build exit 0.

### [L1] Pure TS utilities wave 1: Kelly, sparkline, count-up — `7b965ff`
- `lib/math/kelly.ts`: Kelly criterion + devig math (americanToDecimal, kellyFraction, kellyFromAmerican, basicDevig, EV). 16/16 tests.
- `components/ui/sparkline.tsx`: Pure SVG sparkline (aria-hidden when no label, endpoint dot, filled mode). Zero deps.
- `lib/hooks/use-count-up.ts`: RAF-based ease-out count-up hook, SSR-safe, respects prefers-reduced-motion.
- Gate: tsc 0 · kelly 16/16 · trust-gate ✓ · build exit 0.

### [L2] Sports data adapters: NHL, OpenLigaDB, NFL venues — `baaf32d`
- `lib/sports-data/nhl-schedule.ts`: Keyless NHL schedule adapter (api-web.nhle.com), clearance-gated.
- `lib/sports-data/openligadb.ts`: Bundesliga adapter (api.openligadb.de, CC0 open dataset), clearance-gated.
- `lib/sports-data/nfl-venues.ts`: Static NFL venue table (32 teams, surface/roof/altitude/timezone). HIFLD public domain.
- Gate: tsc 0 · sports-data-adapters 10/10 · trust-gate ✓ · build exit 0.

### [L3] UI components wave 2: SVG gauge, shimmer skeleton, clipboard, calendar heatmap — `4b65c90`
- `components/ui/svg-gauge.tsx`: Animated ring gauge, role=meter, aria-valuenow/min/max.
- `components/ui/shimmer-skeleton.tsx`: ShimmerSkeleton, ShimmerText, ShimmerCard.
- `lib/hooks/use-clipboard.ts`: navigator.clipboard hook, timeout-resettable copied state.
- `components/ui/calendar-heatmap.tsx`: Pure SVG 12-week GitHub-style heatmap, 4-tier color scale.
- `globals.css`: @keyframes shimmer for existing .skeleton class.
- Gate: tsc 0 · ui-components-2 4/4 · trust-gate ✓ · build exit 0.

### [L4] Growth/SEO: llms.txt, JSON-LD extensions, View Transitions, env keys — `e7560b3`
- `app/llms.txt/route.ts`: Static AI-crawler description of GSE (public vs gated, honesty standard).
- `lib/seo/sports-jsonld.ts`: Added buildArticleSchema, buildItemListSchema, buildClaimReviewSchema.
- `next.config.mjs`: viewTransition: true in experimental (native View Transitions API).
- `.env.example`: 4 optional free-tier sports API key stubs (BALLDONTLIE, THESPORTSDB, CLEARSPORTS, ODDSPAPI).
- Gate: tsc 0 · jsonld-extensions 4/4 · trust-gate 1079 files ✓ · model-freeze v5.0.0 ✓.

### [L5] Math utilities wave 2: odds formatter, Bayesian blend, Dixon-Coles — `91b420b`
- `lib/math/odds-format.ts`: 7-format odds converter (American/Decimal/Fractional/HK/Malay/Indonesian/Probability).
- `lib/math/bayesian-blend.ts`: Model-vs-market probability blend with dynamic λ weighting.
- `lib/math/dixon-coles.ts`: Dixon-Coles τ correction for low-score soccer; dixonColesOutcomes() for H/D/A.
- Gate: tsc 0 · math-utils-2 25/25 · trust-gate 1082 files ✓ · model-freeze v5.0.0 ✓.

### [L6] Game-day weather core + harvest reports — `388339b`
- `lib/weather/open-meteo.ts`: Open-Meteo URL builder + WMO code map + parser (CC-BY-4.0, keyless).
- `lib/weather/load-game-weather.ts`: Never-throw clearance-gated loader; DISPLAY-ONLY.
- `components/weather/weather-badge.tsx`: Accessible badge with CC-BY-4.0 attribution.
- `__tests__/weather.test.ts`: 25/25 tests passing.
- 3 harvest reports: HARVEST_GROWTH.md (30 items), HARVEST_SPORTS_OSS.md (35 repos), HARVEST_UI_DATAVIZ.md (25 items).
- NOTE: venue-coords.ts (outdoor NFL/MLB lat/lon table) HELD pending owner review — subagent flagged for
  bypass attempts during dev; final file appears clean but auto-mode classifier blocked commit per security policy.
  Room/[gameId] weather wiring also held pending this review.
- Gate: tsc 0 · weather 25/25 · trust-gate 1082 files ✓.
