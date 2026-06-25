# Market Data Source Plan

*Fact class: `market`. Unlocks Book DNA, Market Twin, Absorption Half-Life, Alt-Line Geometry,
Tradability, CLV.*

## Required market facts

moneyline · spread · total · team_total · player_prop · alt_prop · futures · live_odds ·
**odds_history** · **book_update** (last-update timestamps) · closing_line · betting_splits (if
licensed).

The single biggest lever is **dense, timestamped odds + prop snapshots** — the opener→close
trajectory is the #1 projection feature AND the entire fuel for CLV forecasting and book-lag (Book
DNA / Absorption Half-Life) work.

## Source ladder

1. **The Odds API** (LICENSED, USE_NOW) — already exported in the repo. Raise quota; add the
   historical endpoint (point-in-time safe, `odds_history` / `book_update` / `closing_line`) and
   player props. Cache-first so re-runs cost zero. This is the first paid dollar if betting-market
   calibration is the next priority.
2. **OpticOdds / BALLDONTLIE / API-SPORTS** (PAID_EVALUATION) — denser snapshots, multi-sport
   breadth, webhooks. Evaluate against The Odds API on cost-per-useful-fact.
3. **SportsGameOdds** (RIGHTS_REVIEW) — review terms before any ingestion.
4. **Sportradar / Genius Sports** (ENTERPRISE_DOSSIER) — official-data lane and integrity posture;
   only when a revenue tier or B2B deal requires it.
5. **DraftKings / OddsPortal unofficial scrapers** (DO_NOT_USE / RIGHTS_REVIEW) — never wire a
   scraper that circumvents access controls.

## Why dense snapshots win for Book DNA

The Acquisition Governor ranks The Odds API's historical/props endpoints **first** for a Book DNA /
absorption-half-life target because they cover exactly the needed fact types (`odds_history`,
`book_update`), where broad sports-trivia feeds cover none — even though the trivia is also free.
Coverage of the *experiment's* facts, not raw breadth, decides the order.

## Point-in-time discipline

Every market fact enters the Temporal Fact Graph with `observedAt` and `firstSeenByGseAt`. CLV and
book-lag work must use `pointInTimeFacts()` so a snapshot taken after the decision can never leak
into a "we knew this" claim. The leakage fix (reading a *pre-game* implied total, not the closing
line) is enforced structurally by `knowableAt`.
