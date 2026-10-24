# Integration spec — wiring gse-weather-edge into the feature store

Audience: the build session. This module is a **de-risked building block** (leak-safe as-of loader, unit-tested). Below is exactly how to integrate it without violating the engine's no-lookahead / trials-registry discipline.

## 1. Prerequisites you own
- **Stadium registry.** A table of NFL venues → `{ latitude, longitude, isIndoor }`. `isIndoor` must be true for domes **and** retractable roofs that were closed for that game (roof state is itself an as-of fact — default closed→indoor if unknown, the conservative no-weather-effect choice).
- **Kickoff + freeze times in UTC.** `kickoffUtc` = game commence time; `asOfUtc` = the pick's `frozenAt`. These already exist on your receipts.

## 2. The one thing to smoke-test live — "Strict as-of backtests"
The live/upcoming path (`open-meteo/forecast`) is unambiguous: the current forecast for a future hour is knowable now.

The **backtest** path needs care. Open-Meteo's `historical-forecast-api` returns an archived forecast for a past date, but by default it may stitch together the *best* (shortest-lead) forecast for each hour — which could be a forecast issued **after** your `asOfUtc` (leakage). Before admitting any weather feature from backtests:
1. Confirm Open-Meteo's current **previous-runs / model-run** capability (e.g. requesting a forecast as it stood N days before valid time) and select the run issued **≤ `asOfUtc`**.
2. Enforce it in the feature store: **reject** any weather feature whose underlying forecast issue time is `> asOfUtc`. The loader surfaces `provenance` and `leadTimeHours` for exactly this gate.
3. If the strict run can't be obtained for a given (game, asOf), treat the feature as **missing** (honest `available:false`) — never fall back to observed weather.

This is the single load-bearing check. Everything else is mechanical.

## 3. Feature-store wiring (behind `MODEL_VERSION`)
- Compute weather features **as-of each pick's `frozenAt`**, cache by `(lat, lon, kickoffHourUtc, asOfBucket)`.
- Store raw fields (`windMph`, `windGustMph`, `precipInch`, `precipProbPct`, `tempF`, `windDirDeg`) + `provenance`. Keep raw; derive signals downstream so you can re-derive without re-fetching.
- Adding these to **scoring** is a deliberate, founder-gated `MODEL_VERSION` step (same rule as every other feature). Until then, accumulate silently for backtesting.

## 4. Trials-registry admission (do NOT skip)
The `candidateSignals` (`passingSuppressionIndex`, `kickingDifficultyIndex`) are **hypotheses**, not edges. Route them through the §5 trials registry:
- Register each as a trial **before** looking at out-of-sample results.
- Purged walk-forward validation; FDR control across the weather-feature family (wind, gust, precip, temp, and the two indices) so you don't harvest noise by testing many variants.
- Admit to scoring only what survives — and only via a `MODEL_VERSION` bump with an audit-trail entry. Most plausible weather signals will help **totals/unders and kicking markets** more than sides; test per market.

## 5. Operational
- **Rate limits.** Open-Meteo free tier is generous (~10k calls/day) but batch: one call per (venue, day) covers all games there; dedupe by `(lat,lon,date)`.
- **Refresh.** For live picks, the forecast moves — re-fetch near freeze time and store the forecast that was live at `frozenAt` (that IS the as-of value; don't overwrite it later).
- **Caching key** must include the `asOf` bucket so a later, better forecast never overwrites the as-of one.
- **Attribution.** Open-Meteo requires attribution ("Weather data by Open-Meteo.com") on surfaces that display it.

## 6. Non-goals / guards (kept honest)
- No observed/reanalysis weather in features — ever. Outcome data is for grading, not features.
- No accuracy claim ships with the raw module; only trials-registry-admitted, `MODEL_VERSION`-gated signals reach scoring.
- Indoor sites contribute a neutral (no-effect) feature, not a missing one — so "dome" is itself signal the model can use.
