# chrisgillam/polymarket_gambot

**Stars:** 26 | **License:** MIT | **Pushed:** 2025-04-20 | **Language:** Jupyter Notebook | **Forks:** 0

## 1. Vision
Automated +EV sports trading on Polymarket: pull sharp odds (Pinnacle), strip the vig to estimate "true" probability, compare against Polymarket prices, and fire fill-or-kill orders sized by the Kelly criterion when the edge clears a threshold. An open-source clone of the OddsJam value-bet methodology, adapted to prediction markets.

## 2. The Ask
- Jupyter; a `gambot_keys.csv` with **your Polymarket private key + public address** and **a Pinnacle odds API key** (via RapidAPI — the README steers you to the "Mega Unlimited Plan" because the bot hammers the API; this is a real monthly cost).
- Trading parameters: Kelly multiplier (0–1), target buy/sell EV thresholds (3–8% is "the sweet spot"), min/max probability guardrails, max % and max $ per bet, scan interval.
- You set the sport/week slug manually to match Polymarket's listing; live betting is discouraged (execution lag).

## 3. Constraints
- **MIT — adoptable**, but the use case (live trading with your own keys and bankroll) is operational, not analytical.
- **Maintenance:** pushed 2025-04-20; single notebook, no test suite, no CI.
- Real-money risk by design: private keys in a CSV, on-chain FOK orders, Kelly sizing. A bug costs money, not just accuracy.
- Depends on two external commercial surfaces (Pinnacle API pricing, Polymarket market structure) that can change under it.

## 4. GSE lens
- **The model-vs-market divergence engine is a lane GSE doesn't have.** Gambot's core loop — sharp-book true probability vs market price → quantified edge → sized stake — is the *decision* layer that sits on top of predictions. GSE's lanes stop at "here's a projection"; there's no edge-detection or staking layer anywhere (no Kelly, no bankroll, no EV thresholding). Garrett's props lane is shadow-only partly because there's no honest model-prob sourcing — this repo shows what the other half of "going live" requires: a market-comparison and sizing discipline.
- **Kelly with guardrails is the staking pattern to steal:** kelly_multiplier plus MAX_PERCENTAGE_BET plus MAX_DOLLAR_BET is defense in depth — full Kelly is acknowledged as too volatile. If GSE ever publishes anything stake-adjacent, this is the responsible shape.
- **The "sharp book as truth" assumption is the methodology worth debating:** Pinnacle's vig-free price as the true-probability proxy is the industry-standard move — and it's also exactly the kind of assumption GSE's total-signal doctrine should test rather than inherit. GSE's edge thesis is that its *own* model beats the market; outsourcing truth to Pinnacle is the opposite bet.
- No manufactured gap: GSE is not a trading bot and shouldn't become one; the lane is decision-layer methodology, not the bot itself.

## 5. Verdict
**REBUILD** — MIT allows adoption, but a live trading notebook with private keys is not GSE's lane. Rebuild the ideas: sharp-vs-market edge detection, Kelly-with-guardrails sizing, EV-threshold gating — as GSE's own (internal, paper-traded) decision layer.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/chrisgillam/polymarket_gambot
- gitdiagram: https://gitdiagram.com/chrisgillam/polymarket_gambot
- star-history: https://star-history.com/#chrisgillam/polymarket_gambot (26 stars)
- github.dev: https://github.dev/chrisgillam/polymarket_gambot
