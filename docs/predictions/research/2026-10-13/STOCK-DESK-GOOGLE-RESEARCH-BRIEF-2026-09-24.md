# Research brief: autonomous path to a +$300 per day floor

Paste the prompt at the bottom into Google research. Everything above it is the measured record from Garrett Baxley's desk session on 2026-09-24. Do not treat a social claim as a result. Do not invent fills.

Owner: Garrett Baxley, Kingwood, TX, America/Chicago.
Goal he set and refused to lower: **+$300 USD per calendar day, minimum, no cap, fully autonomous.** A day under $300 is a failed day. He has seen claims of an agent turning $50 into about $11,000 in one day. That claim is **unverified**. It is in this file so you can hunt the primary source.

## Paste-ready prompt

Find every documented, reproducible way an autonomous software agent has turned a small US-dollar stake into $300 or more of realized profit in a single day, and whether that result repeated the next day. Include crypto, memecoins, equities, penny stocks, prediction markets, and content businesses. For each case record: starting capital, venue, whether a human tapped the order, the exact order API or wallet, fees, whether the profit was realized or a mark on an illiquid token, and whether the same agent was up the following week. Separate primary evidence from screenshots and threads. Then say which of those paths can run with no human click on Wells Fargo, SoFi, or Robinhood, given that those three expose no retail order API to a third-party agent. End with the minimum capital and the minimum permission that make a $300-every-calendar-day result true, not a one-day spike.

## What was measured, 2026-09-24

Accounts, via Plaid, read after the owner said the deposits had posted:

| Account | Balance on the feed | Holdings |
|---|---|---|
| WellsTrade ...7767 | $0.01 | none |
| SoFi self-directed ...1332 | $6.02 | none |
| Robinhood individual ...7505 | $0.00 | none, no transactions since 2026-09-01 |
| Robinhood crypto | $0.00 | none |

Owner's own statements, not confirmed by the feed: $100 into Wells brokerage, $50 into SoFi, $50 into Robinhood. A phone screen, broker unnamed, showed Total Value $100.01, change $0, priced as of 03:02 ET on 2026-09-24. Wells checking ...4708 showed a posted ledger of -$124.66, available $2,771.72, with a $3,000 inbound credit still pending. Do not treat pending credits as settled.

Plaid connection times: Robinhood created and last updated 2026-09-24 19:07 UTC. SoFi 19:10 UTC. Wells Fargo last updated 2026-09-23 08:10 UTC. No tool on this desk can force a resync.

Chain, CBOE delayed SPY file plus Yahoo, card at 2026-09-24 19:30 UTC:

- SPY 767.60, QQQ 740.91, VIX 15.59, VIX3M 18.32, IRX 4.068, SPY 20-day realized vol 10.84%
- Best 10-wide put vertical: 2026-10-30, short 757 / long 747, 35.2 DTE
- Credit $2.17. Black-Scholes value at that realized vol about $2.49
- Edge about -$0.32 per share, about -$0.92 per day. Gate **SHUT**. Orders sent: **0**

Bill arithmetic from IRX 4.068 as a 91-day discount yield, not a dealer offer: about **$2.63 million** cash accretes $300 per calendar day. About $5.26 million accretes $600. Each extra $1 million of face is about $113 a day. SGOV last price that afternoon was $100.625. $100 of SGOV is about one cent a day. The owner rejected that sentence. The floor was not lowered.

Environment check on the PC, names only, values never printed: `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `APCA_API_KEY_ID`, `APCA_API_SECRET_KEY`, `IBKR_ACCOUNT`, `TRADIER_TOKEN`, `TRADIER_ACCESS_TOKEN`, `SCHWAB_APP_KEY` were all **missing**.

## Why no order was sent

Three pipes got conflated.

1. **Read.** Plaid, through Grok's finance connection. Balances and holdings only. This is the pipe the desk has.
2. **Fund.** Robinhood uses Plaid inside its own app to link a bank and to score instant ACH deposits. That moves cash into Robinhood. It does not place a trade.
3. **Order.** A key the venue accepts. The trading repos use this. This desk does not have it.

Robinhood does not publish a retail order API. Its policy refuses third-party trading connections without Robinhood's written authorization. SnapTrade's Robinhood integration is documented read-only. WellsTrade and SoFi Invest, as connected here, also expose no order endpoint to this agent.

The agent refused to type a broker password into a bot, refused unofficial Robinhood website calls (`trump2cash` does that, and it breaks), and refused to name a penny stock or memecoin and call the suggestion a fill.

## What was built

Repo: `https://github.com/Beexly/agent-bus` branch `main`. Folder `outbox/from-grok/`.

| File | Role |
|---|---|
| `README.md` | Start here |
| `dashboard/index.html` | Single-file board. Open it. |
| `dashboard/STATUS.json` | Machine-readable state |
| `dashboard/order_station.json` | Last runner result: `BLOCKED_NO_KEY` |
| `STOCK-DESK-PLAN-v2-2026-09-24.md` | Full plan, sections 1 through 17 |
| `desk_card.py` | Weekday chain reader. No orders |
| `desk_runner.py` | Sends nothing unless the gate is OPEN and an Alpaca key is in the environment |
| `cards/LATEST.md` | Last card, 2026-09-24, gate SHUT |

Windows scheduled task `StockDeskFloorCard` runs `desk_card.py` Monday through Friday at 09:40 America/Chicago. It does not order. Commits on that folder this session include `17adffe` (dashboard), `127b9b5` (Robinhood still zero), `608fb7b` (Plaid is not the order rail), `a2bf23b` (order station), `05245c3` (Alpaca plus SGOV stand-up).

## Repos examined

None were installed. Grouped by the station they actually implement.

**They send orders, with a key this desk does not have**

- `freqtrade/freqtrade`, `ccxt/ccxt`, `hummingbot/hummingbot`, `Drakkar-Software/OctoBot`, `askmike/gekko`, `DeviaVir/zenbot`, `pirate/crypto-trader`, `NoFxAiOS/nofx`: crypto exchange API key and secret. gekko and zenbot are abandoned.
- `aowang-ai/jev-trade`: Jev votes, a bot signs Hyperliquid orders with a wallet private key. Dry run if the key is empty.
- `jarrodwatts/jev-trader`: same pattern, one quote per Monad block on MON-USDC, inside the spread.
- `arimanyus/warrenduffer`: Jev ranks Nifty 50 names. Code sizes, places the stop, and halts. Zerodha or Kotak session. No paper mode. Daily loss cap. Kill file. Replay cannot write the live database. First week forced to one share.
- `OpenByteInc/QuantDinger`: Alpaca REST key, or an Interactive Brokers socket. US stocks can go through those. Its model gate fails open if the model is down. This desk fails closed.
- `maxbbraun/trump2cash`: unofficial Robinhood website calls. Not a supported API.

**They do not move money**

- `ranaroussi/yfinance`, `OpenBB-finance/OpenBB`, `achannarasappa/ticker`, `Open-Dev-Society/OpenStock`, `Mathieu2301/TradingView-API`, `ZhuLinsen/daily_stock_analysis`, `joshyattridge/smart-money-concepts`, `huseinzol05/Stock-Prediction-Models`, `TauricResearch/TradingAgents`, `anthropics/financial-services`, `LuckyOne7777/LLM-Trading-Lab`, `kernc/backtesting.py`, `StockSharp/StockSharp`, `browser-use/jev-ultrafast`, `strands-agents/harness-sdk`, `superdesigndev/treg`

TradingView-API pretends to be the TradingView site. Skip it. Jev, wherever it appears, is a vote. It is not an order.

Useful pattern taken from the pile, already written into the plan: data router, vote, sizer in code, halt, broker adapter, append-only ledger. Missing key means the adapter writes no order.

## The $50 to $11k claim

Not reproduced here. Not found as a primary fill in this session. Nearby public items a researcher should separate from it:

- TradeRank LLM leaderboard, September 2026: 18 models, each starts with **$10,000 simulated**, decides once a day. On 2026-09-24 the leader was about **+9.43%** over the season, not a same-day 220x. Research benchmark. `https://www.traderank.ai/llm-trading-leaderboard`
- Truth Terminal / GOAT: an agent was told to make money, received a reported **$50,000** grant, and was later tied to a Solana memecoin. That is not "$50 of trading capital to $11k today." Verify the wallet, not the podcast retelling.
- Solana memecoin commentary, March to June 2026: claims agent wallets rose from 8% to 34% of memecoin DEX volume. That is volume share, not a personal P&L.
- Binance Agent OS and Coinbase agentic trading: permissioned sub-accounts that can trade. They still require the user to connect the account and fund it. They do not turn a read-only Plaid link into an order.

Search strings worth running: `"$50" "11,000" agent trading`, `"$50" "$11k" memecoin agent`, `site:x.com $50 agent trading 11k`, `Truth Terminal GOAT wallet`, `Binance Agent OS sub-account`.

## Questions for the other researcher

1. Is there a primary source, with a wallet or a broker statement, for a $50 stake becoming about $11,000 in one day via an agent? What was the next day's balance?
2. Which US venues will accept an unattended order from software without the user tapping confirm, and what is the exact key or OAuth scope?
3. Can that venue buy SGOV or a T-bill, and can it also day-trade, so the floor and the growth sleeve stay in one account?
4. What is the largest stake that can be lost in one day on the strategy behind the $50-to-$11k claim?
5. Does any path hit $300 every calendar day, not once, starting from under $1,000 of settled cash? If yes, show the fills. If no, name the capital where a repeated result begins.

## Hard limits already hit

- Do not paste API secrets into a chat. The runner reads `APCA_API_KEY_ID` and `APCA_API_SECRET_KEY` from the environment only.
- Do not trade the SoFi IRA or robo accounts.
- Do not use crypto venues until an explicit key exists. Robinhood crypto was $0.
- The put-spread gate stays shut while credit is below the realized-vol value.
- Identity paperwork to open Alpaca or Interactive Brokers cannot be completed by the agent.

## Owner context that is not the trading tape

Galaxy Sports Edge is the sports product (`Beexly/Sports`, site galaxysportsedge.com, X @GalaxySportsHQ). A second offer is a $350 one-page website kit for local businesses. Notes on a Grok Bot research pass live on `Beexly/autonomous-revenue-engine`, branch `notes/grok-bot-galaxy`, commit `41c55f4`. That research lane was closed by the owner on 2026-09-24. Twenty-six paid $350 kits in a month are about $9,100, which is the same order of magnitude as $300 a day. That is revenue, not a trading fill. It is listed so a researcher does not ignore a cash engine that already exists in his businesses.
