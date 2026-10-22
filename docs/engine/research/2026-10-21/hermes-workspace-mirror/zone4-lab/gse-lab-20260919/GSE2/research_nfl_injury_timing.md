# Research Notes: NFL Injury-Report → Line-Move Timing

Agent 15 — designation impact on market prices & optimal scrape timing
Sources pulled: OddsIndex, Action Network, LSports, BestOdds, WagerBird, CBS Sports,
NFL.com, Rotowire, Ravens.com injury report legend. (Aug 2025–Aug 2026 cycle data.)

## 1. The designations (official vs. the task's "MP")

Official NFL reporting legend (confirmed via ravens.com / nfl.com):

**Practice report (Wed/Thu/Fri cadence):**
- `FP`  Full participation — 100% of normal reps
- `LP`  Limited participation — <100% of reps
- `DNP` Did not participate
- (variant: `DNP-NIR`/`DNP-NI` — rest/non-injury)
- `MP`  **NOT an official NFL designation.** Used by data aggregators to mean
  "Mock Practice" / walkthrough-only (player present, contact drills only, below LP).
  Treat as a weak-LP signal.

**Game status (Fri designation for Sun games; Sat for Mon games):**
- `OUT` — will not play
- `DOUBTFUL` — unlikely to play  (~25% historical play rate)
- `QUESTIONABLE` — uncertain  (~50/50 official; ~70–75% actually play historically)
- (Note: `PROBABLE` was removed by the NFL in 2017.)

## 2. Which designations actually move lines

| Designation | Market impact | Notes |
|---|---|---|
| **OUT** (incl. 90-min inactives) | LARGE / sharp | Confirmed inactive = max repricing. Biggest single driver. |
| **DOUBTFUL** | Moderate-to-large | Backups' value rises; line reacts but with uncertainty. |
| **QUESTIONABLE** | Moderate (often mispriced) | ~70-75% play historically → market often OVERPRICES the absence. Fade/public trap. |
| **FP** | Confirmational | Locks in availability; moves line to the extent it removes doubt. |
| **LP** | Small / provisional | Early signal; markets widen risk tolerance but price the *trajectory*, not the snapshot. |
| **DNP** | Depends on trajectory | DNP×3 → near-certain inactive → large eventual move; single DNP early = noise. |
| **MP** (mock/walkthrough) | Small / provisional | Same tier as a weak LP; treated like early signal, not a line-driver. |

Positional weighting of a *confirmed-out* starter (spread impact):
- Starting QB ............ 3–7 pts (avg ~4–5; backup quality dependent)
- Elite WR1 .............. 1.5–3 pts
- Bell-cow RB (run-heavy).. 1–2.5 pts
- Starting LT (w/ good rush).. 1–3 pts
- Shutdown CB (vs pass-HEAVY).. 1–2 pts
- OL / most other starters .. 0.25–1 pt
(Totals: offensive-star out → total drops; D-star out → total may rise.)

Confirmed: QB absence is the lever. Everything else is noise unless it's a true
positional anchor (LT, elite pass-rusher) AND depth behind them is thin.

## 3. The reporting + market-adjustment cadence

NFL weekly reporting schedule (per game):
- **Wednesday** — 1st practice report filed (late afternoon ET). First signals:
  DNP / LP / FP / MP. Earliest scrape target for trajectory.
- **Thursday** — 2nd practice report (late afternoon ET). Trend confirmation:
  a 2nd absence or improvement to FP is the first material move trigger.
- **Friday** — 3rd practice report (~4–6pm ET) + official game-status
  (Out/Doubtful/Questionable) for Sunday games. **Most spread adjustments
  happen Friday evening.** Primary retail-reaction window.
- **Saturday** — game-status for *Monday* games (~4–5pm ET).
- **Sunday, 90 min pre-kickoff** — official **inactive list**. Single most
  active line-movement window of the week. Sharps watch live.
- **Daily during season** — reporter-sourced alerts (Schefter/Rapoport/
  Pelissero/Garafolo/Fowler) can move lines *ahead* of the Wednesday report
  (e.g. a Tuesday morning "unlikely to play" beats the Wed filing).

## 4. Market reaction speed (the edge window)

- Modern books react to **confirmed** injury news within **2–3 minutes**
  (industry estimate: LSports, Action Network). Gap news-break → market-adjust
  is measured in minutes, not hours.
- Process = Circle → Re-open → Price discovery:
  1. **Circle**: game taken off the board briefly (≈1–2 min) while books
     recalibrate; no bets accepted.
  2. **Re-open**: new line posted (often over-corrects on star names).
  3. **Price discovery**: sharp money forces the line to true equilibrium.
- **Unconfirmed** news (early signal stage) → little/no move, just widened
  internal risk tolerance. Don't over-bet early rumors.
- **Reporter-sourced > official report** for timing: a beat-writer's "unlikely
  to play" moves the line before the Friday designation. But walk-back risk:
  Tuesday report → Friday Questionable → Sunday active (CLV can evaporate).

## 5. Optimal scrape timing (vs. market adjustment)

Edge = scrape / ingest signal BEFORE the market adjusts, then either
(a) capture value early, or (b) detect the 2–3-min adjustment window to
confirm your read. Recommended multi-window scrape schedule:

| Window | What to scrape | Why | Market phase |
|---|---|---|---|
| **Day -3/-2 (Wed 5–7pm ET)** | Wed practice report (first signal) | Trajectory starts here; early-line traps if you scrape after Friday close. | Early-signal / widening |
| **Day -2 (Thu 5–7pm ET)** | Thu practice report | Trend confirmation; 2nd-day pattern (DNP→LP up, FP→DNP down) is the first real move trigger. | Building concern |
| **Day -1 (Fri 4–7pm ET)** | Fri practice + game status | Primary reaction point. Scrape *as reports drop* (not after the market has priced them). | Primary reaction |
| **Day -1 eve (Fri 7–9pm ET)** | line-ohlcv snapshot | Capture open vs. close of Friday's adjustment to know how much the line already moved. | Price discovery |
| **Sat (Mon-game only, 4–6pm ET)** | Sat game-status | Late scratch window for MNF. | Building concern |
| **Gameday (-90 min, Sun 11:30am ET)** | 90-min inactives | Sharpest, fastest move. Scrape & react within the 2–3 min circle window. | Confirmed-status shock |

**Decision framework (scrape then act):**
- Early week (Wed/Thu): scrape for *trajectory*. If trajectory says "down" (FP→LP→DNP)
  and a reporter confirms "out," front-run Thursday's move. If "up" (DNP→LP→FP),
  the line is already baked in Friday; avoid stale longshots.
- Friday: scrape the game-status + the post-report line together. Questionable
  (75% play) → market usually overprices absence; if a quality backup exists,
  the line is often too far. Doubtful (25% play) → lean with the market.
- Sunday 90-min: scrape inactives, compare to the last Friday line. A player
  who was "Questionable Friday" but is inactive Sunday produces the sharpest
  late move — act inside the 2–3 min window or it's gone.

**Key pitfall (scrape timing):** Scraping only the Friday game-status report
and then betting it means you're ~2–3 minutes behind the sharpest books and
likely getting the post-price-discovery (re-priced) number, not the value.
Real-time reporter alerts + Wed/Thu trajectory scraping beat the "scrape
Friday only" strategy.

## 6. Position groups that matter for the scrape priority

Scrape priority = (position impact) × (confirmation certainty):
1. QB (especially starter vs backup quality)
2. Elite WR1 / TE / Bell-cow RB
3. LT / pass rush (matchup-dependent)
4. Secondary anchors vs pass-heavy offenses
5. Everything else = marginal

## 7. Source-of-truth & data providers (for the scraper)

- Official: nfl.com/injuries, team injury-report pages (Ravens/Bears/etc.),
  Rotowire practice-report.php, ESPN injuries endpoint.
- Real-time reporter alerts (beat the official report): Schefter, Rapoport,
  Pelissero, Garafolo, Fowler — scrape their X/Twitter feeds or use a wire
  feed aggregator.
- Line-ohlcv + market reaction timing: sportsbook APIs / LSports Scouts Feed /
  SpankOdds injury alerts.

## 8. Caveats / issues encountered during research

- **"MP" is not an official NFL designation.** Do not expect it on the official
  Ravens/NFL legends. It's an aggregator/walkthrough code; map it to "weak LP."
- No public, single source publishes *exact* scrape-vs-line-move second-level
  data; the "2–3 min" and "Friday evening" figures are industry-reported
  estimates (Action Network, LSports). Treat as guidance, not law.
- "Questionable" play-rate (~70–75% actually play) is the highest-leverage
  stat: it's why the market *moves* on Friday but often *overreacts*, which is
  the arbitrage the scraper is trying to front-run.
