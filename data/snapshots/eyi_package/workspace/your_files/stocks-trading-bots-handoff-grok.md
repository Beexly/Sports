# Handoff to Grok — Stocks / Trading Bots (everything we've discussed)

**Date:** 2026-09-30. **From:** Motif (Garrett's assistant). **For:** Grok, to pick up and run with.

## Who this is for
Garrett Baxley. He runs an autonomous revenue operation (Marketplace flips, Kit websites, etc.) and is exploring trading bots as a potential lane. Operating constraints that matter to you: **$0 budget doctrine**, bank account under real pressure (was -$600 range recently), so **paper-trading only — no real-money execution, no live trading accounts wired up, no exceptions** unless Garrett explicitly authorizes in chat. Never spend his money, never create accounts in his name, never fill out surveys/microtasks as a bot. He also has a standing rule: verify everything, never call something dead without tests and citations.

## Everything we've covered, in full

### 1. QuantMuse — open-source quant trading system (STALE, learning reference only)
- Source: Instagram reel https://instagram.com/p/Dd4JGF1lIhA/ (@quantscience_, ~42k followers), Garrett sent it 2026-09-30. All 4 slides read.
- Repo: **0xemmkty/QuantMuse** on GitHub. MIT license. 2,952 stars. Created 2025-01-15. **Last pushed 2025-07-29 — stale ~14 months.** Verified via GitHub API 2026-09-30.
- Claimed features: AI/ML analysis (incl. OpenAI GPT integration), real-time data, multi-factor models (momentum/value/quality/volatility), AI sentiment analysis, risk management, backtesting, Python + C++ hybrid architecture.
- "Production-ready" is the creator's marketing word, not a verified fact. Data APIs and dependencies will have rotted over 14 months.
- Slide 4 is lead-gen: free algo-trading workshop **October 22** at learn.quantscience.io/join ("630+ registered").
- Our verdict: **paper-trading/backtesting learning reference only.** Factor/sentiment modeling components are worth studying in their own right. Low priority. Do not present as a working system without testing it first.

### 2. Claude + Quiver Quant + Robinhood loop (partner/promotional content — edge unverified)
- Source: Instagram reel (@ariacodez), Garrett sent it 2026-09-29. Full narrative retrieved.
- What it shows: Claude connectors pulling public **congressional and Form 4 insider filings from Quiver Quant**, plus Robinhood prices, technicals, and order execution. A scheduled 6:00 a.m. daily task analyzed UBER, LILA, and GME, and it demonstrated a UBER limit order inside a Robinhood "Agentic" account. Caption says approval is requested before order placement.
- This was partner/promotional content — no trade or account action was taken on our side, and none should be.
- Our verdict: **interesting as an autonomous-decision loop (research → analyze → propose → human approves), edge completely unverified, crowded copy-trading strategy (congressional/Form-4 copy-trading is thin). Paper-trade first, always.** This is the highest-leverage *pattern* of the bunch, not a product to buy.

### 3. Jev + CoinGecko crypto trading builds (community, crypto not stocks — but trading bots)
- Source: Instagram carousel https://instagram.com/p/DdtLoI-mfGB/ (@simplifyinai), Garrett sent it 2026-09-30. Caption claimed "Jev can now do crypto trades in real time. 100% open-source. coingecko-jev is CoinGecko's official companion repo... 6 demos (pump pulse → wallet x-ray), 2 demos fully free, Solana added."
- **Verification result: the claimed official CoinGecko companion repo does NOT exist.** GitHub org search for coingecko+jev = 0 results, github.com/coingecko/coingecko-jev 404s, web search found nothing. The "official" claim is **UNVERIFIED** (possibly renamed, unreleased, or marketing spin).
- What IS real (community builds): **Solizardking/clawd-jev-trading-machine** (dry-run-first; live trading explicitly refuses to wire up without an audited write path — this is the responsible pattern to copy), **zadescoxp/Jev-Trades** (paper trading dashboard), **yasdelayu/jev-crypto-scout**. The awesome-jev catalog tracks 944 Jev projects. Jev pricing: $0.042/1M input tokens, output free.
- Our verdict: concept validated by community builds; the specific "official repo" claim flagged. **A $0 crypto-decision pipeline is buildable from free self-hosted Kev (Jev API-compatible) + CoinGecko's free API tier, following the dry-run-first pattern. Paper-trade only.**

### 4. anthropics/financial-services toolkit (low priority)
- GitHub: **anthropics/financial-services**, 38,276 stars, Apache-2.0, created 2026-02.
- What it is: Claude toolkit for finance *work* — pitch decks, valuation models, deal memos, book reconciliation. **It never executes trades on its own** — human-in-the-loop drafts.
- Our verdict: potential internal finance-doc tooling at best. Low priority. Not a trading bot.

### 5. yuhgosl / "Krypt" reel (thin, flagged — Garrett's original competitor concern)
- Source: Instagram reel https://www.instagram.com/reel/DcAkCEANV2Y/ (@yuhgosl, ~11k followers). Caption: "Sports r easy i love data #sports #krypt #tradingsignals."
- Garrett specifically flagged THIS reel as a serious competitor concern ("they blow us out of the water") — that reaction is attached to this reel, not to any other account. Correction recorded 2026-09-30: an earlier draft of this handoff unsupportedly reassigned his frustration to a different account; that reassignment is removed.
- The reel itself is thin: small account, empty-ish caption, **"Krypt" is unidentified** (unknown which product, if any).
- Still owed: a full visual/audio/product audit — inspect the reel's visuals, narration, product UI and claims; identify what "Krypt" is (official site, pricing, app, docs, accounts, evidence); compare it directly against the relevant product promise on UX, polish, signals, transparency, record, calibration, monetization, and social packaging. Public/private methodology fence applies throughout.
- Our verdict: filed, high priority for the audit because Garrett flagged it, low priority for building until "Krypt" is identified. Do not assume which Krypt product the hashtag refers to without evidence.

### 6. Free market-data APIs already verified (background infra)
- Verified live 2026-09-18: **Polymarket + Kalshi APIs are completely free with no key** (live prices, order books, trade history). The Odds API: his existing account (baxley.garrett@gmail.com, 20K credits/month, $30/mo, active).
- Relevance: free real-time market data in his stack — useful background if you explore event-driven or sentiment-driven trading ideas.

## Standing rules Grok should follow
1. **Paper-trading only.** No live brokerage connections, no order execution with real money, no "agentic" trading accounts wired up — until Garrett explicitly says otherwise in chat. This is a hard boundary, not a suggestion.
2. **$0 budget.** Free tiers, open source, self-hosted. Never recommend spending without flagging the cost first.
3. **Verify before recommending.** Stars/likes are not evidence. Check push dates, licenses, and whether repos are real before treating anything as a working system. (QuantMuse is the cautionary example: 2,952 stars, dead 14 months.)
4. **His situation:** bank account was under serious pressure recently — do not propose anything that risks real money. Research, backtests, paper portfolios, and decision-pipelines are all fair game.
5. **Action board context:** he saves Instagram posts to himself as research material; the job is never just logging — it's organizing findings into things he can actually use, ranked by what moves him forward, with hype flagged.

## Suggested directions for Grok
- Rebuild the **Claude + Quiver + Robinhood loop as a paper-only decision pipeline**: daily 6 a.m. research brief (congressional/Form 4 filings, prices, technicals) → analysis → *proposed* orders that a human approves. Never live. The pattern is the product.
- Evaluate **QuantMuse as a backtesting sandbox**: clone it, see if it still runs after 14 months of dependency rot, use it to learn factor/sentiment modeling.
- Build the **$0 Jev + CoinGecko paper-trading dashboard** following the clawd-jev-trading-machine dry-run-first pattern.
- Identify what **"Krypt"** actually is before anyone builds around it.

### 7. ryanfrigo/kalshi-ai-trading-bot — active MIT toolkit for Kalshi bots (added 2026-09-30)
- Source: Instagram post https://instagram.com/p/DZoHuTTNHvs/ (@githubsignals, ~50k followers), Garrett sent it 2026-09-30.
- Repo: **ryanfrigo/kalshi-ai-trading-bot**. Verified via GitHub API 2026-09-30: real, MIT license, 602 stars, 194 forks, created 2025-07-26, **pushed 2026-09-26 (active, 4 days old)**, not archived, 0 open issues.
- What it provides: authenticated Kalshi API clients, market data ingestion, position tracking, Kelly-criterion sizing helpers, LLM-driven strategies (scores market confidence via OpenRouter), math-based strategies (e.g. safe compounder for edge-based trading), Streamlit monitoring dashboard, SQLite telemetry logging every decision.
- Why it matters: Kalshi's market-data API is free with no key (verified 2026-09-18) — this is the matching execution-side toolkit. Clean license, active maintenance, real fork count (people are actually building on it).
- Verdict: **the strongest concrete artifact in this package** — a real, maintained, MIT-licensed bot chassis. Paper-trading only until Garrett says otherwise; the toolkit supports live trading but nothing gets wired to real money without his explicit word. Suggested first move: run it against Kalshi's free data in dry-run/paper mode and review the SQLite decision log.

### 8. Glint.trade prediction-market terminal — real product; whale-copying is not a free edge (added 2026-09-30)
- Source: Instagram reel https://instagram.com/p/DVT6khRkcE7/ (@cryptobytez, ~67k followers), posted 2026-02-28, 45.7k likes / 297 comments. Creator says it's not sponsored.
- What it is: a real-time prediction market terminal — aggregated news feed, whale-trade panel (large bets shown publicly), global tension index, live webcam feeds ("INTEL CAMS"). VERIFIED real and active through third-party trading-tool roundups; competitors include Unusual Whales, Verso, Kreo, Oddpool, Dome, Stand.
- The "track whales and bottle their moves" claim is CLAIMED, not proven. Important honest caveat from an independent terminal builder: copy decay is real — a whale's own entry moves a thin book, so copiers buy the top and become exit liquidity. Nobody selling whale-copy tools discloses this.
- Verdict: useful as an intel/monitoring surface (news + whale flow in one screen), not a verified edge. Paper-test any whale-copy signal with measured copy decay before even thinking about real money.

### 9. MiroFish — 75k-star multi-agent swarm prediction engine; profit claim disclaimed (added 2026-09-30)
- Source: Instagram reel https://instagram.com/p/DV9v4URD4j4/ (@raycfu, ~255k followers), Garrett sent it 2026-09-30. Claim: "this guy made $1.49 million betting on the NBA using 4,096 AI agents."
- Repo: **666ghj/MiroFish**. Verified via GitHub API 2026-09-30: real, **75,436 stars, 11,606 forks**, created 2025-11-26, pushed 2026-09-16 (active), Python, homepage mirofish.ai. Topics: financial-forecasting, multi-agent-simulation, swarm-intelligence, social-prediction. Described pipeline: ingest documents → knowledge-graph relationship mapping → spawn 4,096 simulated agents with distinct personalities → scenario injection ("God's Eye View," e.g. a Fed rate cut) → agent consensus into a transformer trained on 16,000+ historical predictions → compare vs Polymarket price → execute when the gap exceeds a Kelly Criterion threshold.
- Critical facts: (1) **The $1.49M profit claim is disclaimed by the reel's own creator** — caption says "I can't defend the authenticity of his polymarket profile and claim so please use at your own discretion." No trader identity was ever provided. (2) **License is AGPL-3.0** — copyleft; research/learn-only, cannot be embedded in a commercial product without open-sourcing. (3) "#1 repository on GitHub" is promotional gloss, not a measured ranking.
- Why it still matters: the architecture is a real idea — simulate the crowd before the crowd reacts — and 11.6k forks signals serious developer interest in multi-agent simulation for prediction. It pairs naturally with item #7 (Kalshi bot chassis: MiroFish-style simulation feeding a Kelly-threshold execution layer) and item #6 (Polymarket's free API for the market-price side).
- Verdict: **QUEUE as a paper-trading research chassis, not a working edge.** Suggested test: does the agent-simulation consensus add anything over the base transformer alone in a backtest? If it can't beat its own baseline, it's theater. Never real money; the profit story is self-disclaimed hype riding a genuinely popular repo.

### 10. "sovereign2013" Polymarket wallet — real profit, unverified "AI bot" story (added 2026-09-30)
- Source: Instagram reel https://instagram.com/p/DYeCLbBBiZK/ (@thesaar.ai, ~12k followers), Garrett sent it 2026-09-30. Claims a Claude-powered AI bot turned $1 into $3.3M on Polymarket via 37,000+ trades.
- VERIFIED (Polymarket's own profile page, 2026-09-30): the wallet @sovereign2013 is real — joined Jul 2025, **+$3.6M total PnL, 40,757 predictions, $399.3M total volume, biggest win $213.4K**.
- NOT verified: the $1 starting stake, the "Claude-powered AI" attribution, the "risk-free arbitrage" framing (the profile shows a losing position), and the "$1.54M month." The video uses a simulated "PHANTOM_X" interface, not real trade proof.
- The honest math: +$3.6M on $399.3M volume ≈ **0.9% edge** — a capitalized high-frequency market-making operation, not a miracle compounder. The edge is micro; the volume is everything.
- Two warnings before anyone gets excited: (1) A real documented experiment (May 2026 Polymarket Trading Bot Autopsy: $1,500 capital, 180 paper bots, 6 live bots) showed paper profits but **live PnL of -$81.44** — real AI bots lost money. (2) The CFTC is probing Polymarket after the WSJ reported the company paid creators to post simulated-trade videos with exaggerated winnings — this reel's genre is under regulatory scrutiny.
- Verdict: PARK. The transferable signal is "high-volume micro-edge market-making works on prediction markets." Paper-trading only, always.

### 11. Tobias Kai'uth "NEO Formula" — numerology/astrology pitch, dismissed (added 2026-09-30)
- Source: Instagram reel https://instagram.com/p/DNvzXipXtoK/ (Tobias Kai'uth, ~150k followers), Garrett sent it 2026-09-30.
- The pitch: a "17-point system" merging numerology, astrology, and gematria claiming 80%+ accuracy on trades, stock picks, and sports bets. Monetization is a book in his bio.
- Why it's here: so you don't waste time on it. **No backtest, no paper record, no timestamped public picks — the 80% figure is an unsubstantiated claim.** There is no causal mechanism linking planetary alignments or letter-values to market movements, and no auditable record is offered. This is the retail-trading funnel genre (claim → mystique → sell the book), not a tool.
- Verdict: dismissed. Do not build on it, do not test it as a strategy — there's nothing testable. If you ever encounter "coded market" pitches again, the bar is a timestamped, graded public record before a single line of code.

### 12. @prediction_alpha Kalshi whale-copy tutorial — referral-funnel content, parked (added 2026-09-30)
- Source: Instagram reel https://instagram.com/p/DduKKJhPKZw/ (@prediction_alpha, ~9k followers), Garrett sent it 2026-09-30.
- The pitch: copy a Polymarket whale's trades (100+ trades/month, $100k+ profit) onto Kalshi daily; enter referral code "STATDEV" for up to $2,000 trading credit. The referral code is the tell — the creator is paid per signup, not per winning trade.
- Why it's here: so you don't waste time on it. The whale's "$2.45M monthly profit" is a screen recording, unverified. Whale-copying has a structural flaw: the whale's own entry moves thin prediction-market books, so copiers buy the top and become exit liquidity (same copy-decay caveat as item #8, Glint.trade).
- Verdict: parked. Not a tool, just a tutorial with a signup incentive. If you ever test a whale-copy signal, measure copy decay in paper mode first.

### 13. warproxxx/poly_data — Polymarket data pipeline for backtests (added 2026-09-30)
- Source: Instagram video https://instagram.com/p/DXcgx3cgNzK/ (@github_unpacked, ~19k followers), Garrett sent it 2026-09-30.
- Repo: **warproxxx/poly_data**. Verified via GitHub API 2026-09-30: real, **GPL-3.0 license**, 2,350 stars, 438 forks, created 2025-10-03, pushed 2026-09-08 (active), not archived, Python.
- What it does: pulls Polymarket market metadata, order events, and processed trades into structured CSVs; resumable pipeline with dedup, keeps historical data updated without full rebuilds. This is the data-infrastructure piece for backtesting — pairs with item #6 (free Polymarket API) and item #7 (the Kalshi bot chassis): this repo is where you get the historical data to test strategies against, and its resume/dedup design is what makes long backfills practical.
- License note: GPL-3.0 is copyleft — research/learn-only; if you rebuild the pipeline idea yourself, write it clean as your own code rather than embedding GPL'd code in anything commercial.
- Verdict: queued as the backtest-data pipeline. First test: run it against Polymarket's free data, produce a sample CSV set, and verify the resume/dedup claims hold on a real backfill.

### 14. @choicooks "prediction market arbitrage" training funnel — unverified $30k/mo claim, parked (added 2026-09-30)
- Source: Instagram reel https://instagram.com/p/Dd5TMGQIn7K/ (@choicooks, ~56k followers), Garrett sent it 2026-09-30. Comment-gated ("comment CLASS for the free training"; 54 comments on 91 likes = classic gate signature).
- The pitch: cross-platform arbitrage — $100 on Over 182.5 at -110 (Fliff) + $2 on Under 182.5 at +9900 (Kalshi) = $102 wager, "guaranteed" ~$88–98 profit regardless of outcome, framed as a 46.5% arb. Claims $30,000/month and a student making $90 in five minutes live.
- Why it's here: so you don't waste time on it, and because the *mechanic* has a legitimate core. The arithmetic works only if both lines coexist — but +9900 on Kalshi vs -110 on Fliff implies an enormous cross-platform mispricing; in illiquid markets such gaps close in seconds to arb bots, so the example reads as cherry-picked or staged. Fliff is a sweepstakes/social sportsbook (coin redemption, minimums, playthrough) — real-money execution is constrained. $30k/month is unverified; the "free training" is a funnel toward a paid course/Discord. No repo, no code, nothing independently verifiable.
- The legitimate core: automated cross-platform arb scanning between Kalshi's free API (item #6) and sportsbook lines is a real strategy family and would pair with the Kalshi bot chassis (item #7) and the backtest pipeline (item #13). But execution requires funded accounts on both sides — paper-trading-only boundary forbids that today.
- Verdict: parked. Reopening gate: verify a real, reproducible arb pair purely from free public data before anything else.

### 15. OctagonAI/kalshi-trading-bot-cli — "Octagon" AI research bot for Kalshi, real and active (added 2026-09-30)
- Source: Instagram reel https://instagram.com/p/DZ0wzFZhuxJ/ (@seb.ai, "Sebastian | AI & Income," ~105k followers), Garrett sent it 2026-09-30. Comment-gated ("Comment BOT and I'll send you the setup"; 873 comments vs 368 likes = classic gate signature).
- The pitch: a bot that does deep research on a question, decides the real odds itself, compares to market pricing, and places sized bets with built-in risk controls when it finds a mispriced market — 24/7, free and open source.
- Repo: **OctagonAI/kalshi-trading-bot-cli**. Verified via GitHub API 2026-09-30: real, MIT license, 396 stars, 108 forks, pushed 2026-09-24 (active), not archived. Homepage: octagonai.co/markets/. Description: "AI-native CLI for trading Kalshi prediction markets. Runs deep fundamental research, generates independent probability estimates, computes edge vs. live order books, and executes trades with Kelly sizing and a 5-gate risk engine."
- Why it matters: the second real Kalshi bot chassis in this package, next to ryanfrigo/kalshi-ai-trading-bot (item #7). Different philosophy: ryanfrigo is a toolkit for building your own strategies; Octagon is an AI-native CLI that does its own research → probability estimates → edge vs live books → execution. Clean MIT license, maintained.
- Caveats: the reel's "makes you money" framing is unverified — no audited profitability; the creator's "I ran it last night and watched it find one on its own" is a single-session anecdote. The comment-gate is a lead-gen funnel. Paper-trading only — the bot executes trades; nothing gets wired to real money without Garrett's explicit word.
- Verdict: queued as a bot-chassis candidate alongside item #7. Suggested first move: run both in dry-run/paper mode against Kalshi's free API (item #6) and compare their decision logs — does Octagon's "independent probability estimates" edge hold up?

### 16. Google TimesFM-3 — VERIFIED time-series foundation model; forecasting-method lane, non-commercial license (added 2026-09-30)
- Source: Instagram reel https://instagram.com/p/DcudS35xEg3/ (@voxaris_ai / Ethan Stopperich, ~1k followers, AI tools niche), Garrett sent it 2026-09-30.
- What it is: Google Research's TimesFM-3, a 330M-parameter zero-shot time-series foundation model released August 31, 2026. Verified real: on HuggingFace as google/timesfm-3.0-pytorch, inference code at google-research/timesfm, `pip install timesfm[torch]`. Trained on 1T+ real + synthetic data points. First TimesFM version with native multivariate forecasting plus past-only and past/future covariate support — upload a CSV, forecast the future, and tell it about known future events (holidays, storms, promos) so it predicts the bump instead of just extrapolating. Google reports #1 ranks on GIFT-Eval, FEV-Bench, and TIME benchmarks (worth independent testing on your own data).
- Why it's here: zero-shot forecasting with future-covariate conditioning is a genuine capability that could feed into strategy research — e.g. forecasting a series that a trading signal conditions on. But it is NOT a trading bot, just a tool.
- **License caveat the reel omits:** "it's free" is only half true. TimesFM 3.0 weights ship under `timesfm-non-commercial-license-v1.0` — research/non-production only; commercial use is not permitted. TimesFM 2.5 (200M) remains Apache-2.0 and is the commercial-safe alternative. Per the re-implementation rule: research/learn-only.
- Verdict: queued as a forecasting-method reference. Suggested first move: run it on a real target series, measure covariate-lift vs a naive/ARIMA baseline, and confirm the non-commercial license doesn't block the intended use. Paper-trading-only boundary governs any trading use.

— End of handoff. Questions about any of this: ask Garrett, not his data.
