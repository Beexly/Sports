# Receiver Watchlist RVC — Reopen Condition

**Status:** INFRASTRUCTURE PASS / result REFUSE (2026-10-11T12:45:00Z)
**Reason:** Zero NFL player-prop closes exist. Residuals cannot be computed without a market expectation.

## What was tested
Whether the receiver watchlist designations (YAC machines / hands regression)
predict next-week receiving performance versus the betting market.

## Watchlist (5 players, all traced to real files)
- YAC machines: Puka Nacua (LA), Rome Odunze (CHI), Trey McBride (ARI)
  — source: `dfs/receiver_watchlist_2026.csv` (351-player name_key join, nflverse snaps 2026 x PFR advstats)
- Hands regression: Jameson Williams (DET), Tucker Kraft (GB)
  — source: `dfs/receiver_hands_watch_2026.csv` (5 drops each, 83-90% snaps)

## What is missing (the market side)
No receiving-yards, receptions, or YAC prop closes for any NFL player exist in:
- `dfs/PROP_LADDER_PULL_REFUSED.json` — 8 Nash pull attempts, all Akamai-walled, zero rows
- `dfs/prop_conditional_status.json` — confirms the data gap
- `dfs/kalshi_phijac_all_markets.json` — 2 markets, neither a player prop
- Code search under `dfs/` — 0 receiving-prop files

## Exact reopen condition
1. **Pull** NFL player-prop ladders (DraftKings sportsbook-nash subcats 9524/16569-16571)
   via the 4-step unblock in `dfs/PROP_LADDER_PULL_REFUSED.json`
   (user's real Chrome + CDP 9222 → in-page nash fetch → genie183 fitter),
   or any equivalent timestamped book player-prop close snapshot.
2. **Freeze** prop closes + outcomes on a manifest with `observed_at`
   (current `frozen_manifest_rvc.json`: 855 games with closings+outcomes, no player props).
3. **Join** prop closes to the 5 watchlist players by player+week.
4. **Compute** residual = actual receiving yards (or YAC) − prop-implied expectation.
5. **Test** whether YAC-machine designation predicts positive residuals
   and hands-watch predicts negative residuals (paired t, multiple-testing corrected).
6. **Stamp** INFRASTRUCTURE PASS/REFUSE with the numbers.

## What was NOT done
No prop closes invented. No residuals computed. No verdict on watchlist predictive power.
All DIAGNOSTIC. Zero fabrication.
