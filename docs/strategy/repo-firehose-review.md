# Repo Firehose — Complete Review & Extraction Ledger (2026-06-03)

Every repo from the ~140-link firehose was fetched and scored against: engine intelligence, data
ingestion, introspection/trust, monetization, customer value, creativity, and visual/audio design.
This is the durable record so nothing is re-reviewed or missed.

## ✅ BUILD — port the method into the engine (highest value)
- **`mberk/shin`** → Shin's de-vig. **SHIPPED** `prediction-engine/shin-devig.ts`.
- **`gotoConversion/goto_conversion`** → equal-standard-error de-vig (fast closed form). **SHIPPED** (`gotoConversion` in `shin-devig.ts`). Gives us a de-vig *ensemble* (Shin + goto + naive) to cross-check fair value.
- **`sedemmler/WagerBrain`** → odds conversion + implied prob + vig + EV + Kelly + parlay + **538-style ELO win-prob**. Port the ELO as an independent estimator (feeds `independentFairValues`); EV/Kelly already partly in `kelly.ts`.
- **`kyleskom/NBA-Machine-Learning-Sports-Betting`** → XGBoost + NN win/totals model. Port as an **ML independent estimator** (concept; Python → our TS/feature pipeline).
- **`aqsmith02/paper-betting-tracker`** → vig-free EV gate + half-Kelly + **Monte-Carlo significance test vs a random-EV null**. High trust-fit: proves an edge isn't luck (the engine grading itself honestly).

## 🟢 CONCEPT — trust / transparency (first-of-kind fits)
- **`olalonde/proof-of-liabilities` + `proof-of-solvency`** → Merkle-tree commit + public inclusion proof. **SHIPPED** as `prediction-engine/proof-of-record.ts` — a tamper-evident, publicly-verifiable pick/CLV log = the "introspective website" showpiece.
- **`tuangauss/DataScienceProjects`** → Poisson soccer goals model + Bayesian analyses → soccer independent estimator (extends `poisson.ts`).
- **`adunn-55/NBA-Predictions`** → leakage-safe rolling features + time-series CV discipline (methodology to adopt, not code).

## 🔵 INGEST — data adapters / sources
- **TIER-A (licensed, citable):** `MySportsFeeds/mysportsfeeds-node` (Node, paid key).
- **OPEN-DATA (free, CC0, citable):** `openfootball/football.json`, `openfootball/worldcup.json` (soccer + 2026 World Cup), `metrica-sports/sample-data` (tracking, R&D), `factbook/factbook.json` (reference).
- **TIER-B (unofficial/scraped, signal-only, never cited; TS-native preferred):** `henrygd/ncaa-api` (TS, NCAA), `andrewrjohn/scoreboard-api` (TS, ESPN), `EnderLocke/pyespn`, `bttmly/nba`, `roclark/sportsipy`, `panzarino/mlbgame`, `baronet2/FirstCyclingAPI`.
- **REFERENCE:** `pseudo-r/Public-ESPN-API` (best ESPN endpoint map, 17 sports — extend our ESPN adapter), `minus5/go-uof-sdk` (Betradar UOF read-only recovery/state pattern), `SportradarAPIs`/`sports_data_api`/`mysportsfeeds-r` (licensed, wrong language → port), `nickgardone/sports-calendar-sync` (schedule/team-ID map).
- **Read-only odds referees / adapters:** `declanwalpole/sportsbook-odds-scraper`, `bakedziti88/sportsbook-api`, `rozzac90/pinnacle` (**marketdata reads ONLY** — `betting.py` is DECLINE).

## 🟣 CONCEPT — divergence / consensus referees (signal, never bet execution)
- `haris-sujethan/live-sportsbook-arbitrage`, `auroradan/PrizePicks-Prop-Finder` (multi-book weighted consensus), `arcofs/polymarket-sportsbook-arbitrage-agent` (LLM event-matching + cross-market divergence), `dexorynlabs/2026-worldcup-prediction-market` (sim-vs-market delta, reads Polymarket/Kalshi), `JustBeYou/betting`, `kaarme01/kaarme-bet-scraper`, `DerekNest/sports-arb-bot` (serverless scan+alert+history pattern).

## 🎨 DESIGN-EXTRACT — visual/audio/UX craft for our (non-gambling) UI
- **`Danziger/slotjs`** (rAF reel motion, blur/zoom win-feedback, 60fps perf), **`johakr/html5-slot-machine`** (Web Animations API hardware-accelerated patterns), **`michaelkolesidis/cherry-charm`** (React-Three-Fiber 3D + Zustand state machine). → reuse for contest reveals, the live consensus **heat-map** viz, "beat the model" celebration moments.
- **`wbrandon25/Online-Crash-Gambling-Simulator`** (real-time multiplier-curve + live feed) → real-time line-movement / consensus animation.
- **`outpoot/rugplay`, `LucasHazardous/OpenSourceCasino`** → honest "consequence-free / don't-chase" framing + prediction-market/treemap UX that *fits* a trust brand.

## 🔴 DECLINE — built nothing, here's the full set (so none looks skipped)
- **Real-money / crypto casinos & chance games:** MortalSoft/CASINO-SITE, GoldenX-CASINO-SITE, slotopol/server, solana-casino-games-evm-web3, Sealva Crypto-Casino-Game, Bunjin/Rouleth, ConflictedCitizen/Jackpot, rubbertoe98/DiamondBlackjack, mativallej/casino-roulette, TopSoftdeveloper slots, merlox/casino-ethereum, telegram-casino-bot, buperrr/cryptocasino, BraisCabo/Decentralized-Crypto-Casino, web3batman/Multi-Chain-Casino, gamba-labs/platform, zeusbyte/goldsvet, floatinghotpot/casino-server, CragonGame/CasinosClient, DevLops01/DiscordCryptoCasino, Whale-io/lets-play-a-game (autonomous real-money — hard no), mihailgaberov/bingo, stevenyt2010/Dice-Game, ayoubdrihmi/Coin-Flip. → unlicensed/real-money gambling, off-brand, trust-destroying.
- **"Gambling predictor" / cheat / scam (fraud):** fash-beetlekingmdd/1win-predictor-2026, tbaltrushaitis/roulette-predictor, Morvihex & hepazaynin Keydrop/skin predictors, kuba82Berlin/Provably-Fair (hollow "trust us", no real seed/hash), mbithy/Trevel (faucet bot), otavioshiro/AI-Gamble, s6ruby/programming-crypto-contracts (teaches Ponzi/lottery). → cannot work / fraudulent.
- **Affiliate-spam READMEs (no code):** bonused/monthly-bonus-stake, bonus-2026/casino-bonus, bonus-2026/crypto-casino-bonus, bonused/crypto-casino-bonus-2026.
- **Bet-execution / wagering apps:** kheller18/sportsbook-4, chrisgillam/polymarket_gambot (auto FOK orders), AlgoTrader/betfair-sports-api (dead SOAP), rockscripts/Betfair app, woopinbell/sportsbook-admin-api (operator backend — audit-log pattern only), Ryczko/KKbets-betting.
- **Off-topic / dead / noise:** rbCAS/CASino + CASinoApp (CAS SSO — name collision), IBM/AML-Data, bet-blocker, mdp/MachinePoker, birdiebookie/BirdieBookie, abusufyanvu/6S191 (DL course), cfbscrapR (archived/R), Public-FotMob-API (no license), LivescoreApp (Android), evroon/bracket (AGPL), ifeanyiro9/containerized-sports-api (SerpApi — rejected), xCrypt0r/Crucian, cyradotpink/russhian-roulette (shitpost), Trustdev-eth portfolio, ephesians200/sports-data-api (scores-to-JSON pattern only).
- **Batch F (fantasy/api-lists/noise), triaged from knowledge:** fantasy libs (jcreamer898/fantasy-sports, uberfastman/yfpy, whatadewitt/yahoo-fantasy, mattdodge/yahoofantasy, KBThree13/mcp_espn_ff) = DECLINE (fantasy ≠ prediction). Fitness (isoteemu/sports-tracker-liberator, SweetzpotAS/StravaZpot) = DECLINE. Curated **public-API lists** (public-apis/public-apis, public-api-lists, markodenic/public-apis, exa-studio/ApiVault) = REFERENCE (free-data/AV-API directories to mine later). `trevorblades/countries`, `KoreanThinker/billboard-json`, `mfoud444/ollamafreeapi` = REFERENCE (countries/charts/free-LLM directories). Everything else (googletranslate, PlantRecog, new-pac-wiki, emdash-plugin-bible, Free-Proxies, b2k4, redesigned-pancake, Sportify, tournaments, SportsPage, Flowstate, validator-monitor, houston-pub, wew, dcmp, Country-Explorer, regional public-api forks) = DECLINE (irrelevant/noise/personal).

## Build queue (ordered, all founder-gated to WIRE)
1. ✅ Shin + goto de-vig ensemble · ✅ Merkle proof-of-record.
2. ELO independent estimator (WagerBrain) + Poisson-soccer estimator (DataScienceProjects).
3. Monte-Carlo "is the edge real?" significance test (paper-betting-tracker) — engine self-grading.
4. ML estimator scaffold (kyleskom) feeding `independentFairValues`.
5. More read-only odds referees + open-data backfill (openfootball, ncaa-api).
6. Public consensus/divergence + proof-of-record SURFACE (design craft from slotjs/cherry-charm).
