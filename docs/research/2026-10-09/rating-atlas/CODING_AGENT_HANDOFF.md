# Coding-agent handoff — Saturday CFB and Sunday NFL

Date: 2026-10-09 17:42 CT. Tomorrow is college football. Sunday is NFL.
Branch: research/rating-atlas-2026-10-09-packet. main is e1260ae. Do not merge. Do not edit packages/prediction-engine, MODEL_VERSION, trust gates, or Stripe.

## Already on this branch

- glicko2.py — period-parallel, Illinois, canonical 1464.05 / 151.52 / 0.059996
- glicko2_idle.py — bye step. 1/4/17 idle periods: RD 200.27 / 201.08 / 204.57
- ci_fix.py — draws percentiles, not mean/sqrt(n)
- team_total_sign.py — listed -3 on 48.5 is 25.75 / 22.75
- BOARD.md, KILL_LEDGER.md, BRIEF_AUDIT.md

## Live site — do not pretend this is deployed

Existing college intake, already on main, not edited here:

- packages/data-ingestion/src/cfbfastr-intake.ts
- packages/data-ingestion/src/espn-schedule-seed.ts
- packages/data-ingestion/src/paid-odds-governor.ts
- packages/prediction-engine/src/team-ratings/1403-7642-college-ranking-sensitivity.ts
- packages/prediction-engine/src/nfl-epa-fair-value.ts — NFL_EPA_HFA is 0.025 EPA/play

A live merge is a pull request a human approves. This handoff does not open that PR.

## Saturday — college football

Do not fit Glicko on a Saturday slate and publish it. The close is the bar, and this packet has no college close file.

1. Run the existing ESPN schedule seed for 2026-10-10. If it fails, stop. Do not scrape a paid book.
2. Read paid-odds-governor.ts before any odds call. Default spend is zero.
3. A college card, if one is produced, carries the market, the residual, and the situational read. No number alone.
4. Do not apply NFL HFA 1.56 or NFL sigma 13.45 to a college game.

## Sunday — what can run unattended

One local command, after the slate, not a daemon:

- Rebuild from keyless CSVs if the hash changed.
- Assert join counts before a fit.
- Write fits to research.db on this branch's machine.
- Do not publish. Do not place a bet. Do not call Stripe.

If research.db is missing, print NOT RE-RUN and exit 0. Do not invent the EPL showdown.

## Remaining code, in order

1. Call glicko2_idle for any team with zero games in the period. Do not leave them at the old RD.
2. Accept score 0.5. Do not special-case a tie as a skip.
3. Replace analyze_nfl.ci in any copied delivery with ci_fix.report_gibbs.
4. fit_engines.py: att.get(team, 0.0) and the same for defense. Score 1X2, not the exact-score cell.
5. Do not wire brief ports 0329, 0668, 1168, 1750, 2044. The IDs were swapped.
6. Benchmark to print, not to beat: Shin z=0.0476 on -110/-110; Glicko canonical; team total 25.75/22.75; no-market backtest stays 55.8% until a market is in the loop.

## Killed, with the reopen in KILL_LEDGER.md

Sequential-as-canonical, Newton-as-solver, the narrow intervals, +1.74 as a mean miss, teaser -155, 21.58 as a gap, paid APIs, recon handlers, a 100% claim.
