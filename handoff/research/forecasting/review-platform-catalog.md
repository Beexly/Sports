# Audit: `platform-catalog-live-sweep.md` (2026-08-25)

## Verdict Corrections
- **Saga / sagacvo.com**: Verdict LIKELY-FABRICATED is CORRECT. sagacvo.com is private-net / not a forecasting platform; "Saga" results are crypto SAGA token predictions. Confirmed.
- **PredictionBook**: Verdict WRONG. Site states "PredictionBook is now retired" (not low-activity); recommends Fatebook. Must be RECLASSIFIED: REAL-BUT-RETIRED / SUPERSEDED BY FATEBOOK.
- **Augur**: Verdict REAL-BUT-STALE/REBOOTING is PARTIALLY WRONG. Augur is actively rebooting: "Augur is no longer dormant" (site); v2 fork mechanism completed; whitepaper out; development tracks live. Not dead, but no active market resolution pipeline today.
- **'In预测'**: Verdict LIKELY-FABRICATED is CORRECT. No forecasting platform by that name.
- **INFER (RAND)**: NOT LISTED — major omission (see below).

## Missed Platforms / Data Sources (high relevance to sports forecasting repo)
- **INFER (infer.com / RAND Forecasting Initiative)**: Real forecasting tournaments (geopolitics/econ); public tournament dumps; highly relevant. MISSING ENTIRELY.
- **Kalshi (kalshi.com)**: Federally regulated event contracts with sports markets; public Gamma API; REPO ALREADY REFERENCES KALSHI (scripts/spikes/kalshi-fairvalue-spike.mjs) but sweep ignores it. Critical miss.
- **Smarkets / Betfair exchange APIs**: Not mentioned. Exchange APIs expose real market odds (sports-relevant).
- **PredictIt**: Not mentioned (US-regulated prediction market, sports-adjacent contracts).
- **Metaculus tournament data dumps**: Mentioned as PUBLIC API yes, but sweep does not note the tournament-specific CSV dumps / notebooks that are freely downloadable (no auth needed for historical aggregate forecasts).
- **OSF (osf.io)**: Real open-science framework hosting sports-research preprints/datasets; free API; MISSING.
- **Zenodo / OSF sports-datasets**: Zenodo listed but only as generic archive; should note sports-specific dataset tags (e.g., nfl, soccer, tennis) searchable free.
- **ESPN / nflverse feeds**: Already known to repo; should be listed as zero-cost feeds.
- **Good Judgment Project (GJP)**: Sweep lists GJOpen only; GJP tournament archives are separate source.

## API Details (gaps for platforms marked PUBLIC API yes)
- **Metaculus** (`https://www.metaculus.com/api/`): Rate-limits enforced (429 throttling); official API requires auth token; ~7000+ questions; data-access tiered — sweep should document this.
- **Manifold** (`api.manifold.markets/v0/`): Rate limit = 500 req/min/IP (public); no auth for read; docs note 15–60 sec lag on `/markets`. Should note.
- **Polymarket** (`docs.polymarket.com/`): Rate limits very generous for read — 15,000 req/10s general; 1,000 req/10s Data API; 200 req/10s `/trades`. Auth (API key) only for trade endpoints; read is free/IP-based.
- **Numerai** (`docs.numer.ai`): Read pipeline requires `NUMERAI_PUBLIC_ID` + `SECRET_KEY` auth token for dataset download; `numerapi` Python package; dataset versions pinned (v5.3). Not fully open — auth-gated.
- **QuantConnect**: REST docs exist but free tier rate limits / data-costs not documented in sweep.
- **Zeitgeist**: Substrate-based; no simple REST endpoint — should say "Substrate RPC required, not REST-friendly".

## Zero-Cost Opportunities (free read-only data the repo could consume TODAY)
1. Metaculus aggregate forecast CSV / tournament dumps (no auth for historical aggregates).
2. Manifold `/v0/markets` live feed (500/min, no auth) — sports prediction markets.
3. Polymarket Gamma public endpoint (15k/10s read) — event-contract prices including sports.
4. Kalshi public markets / APIs (referenced by repo spike) — sports contracts freely browsable.
5. INFER tournament datasets (RAND) — public forecasting archives.
6. OSF + Zenodo sports dataset tags — free dataset downloads.
7. NFLverse / ESPN Stats APIs (already known) — zero-cost seasonal data.
8. Kaggle sports datasets (free tier with limits) — quick download of historical match data.
9. Good Judgment Project historical tournament archives — public aggregate forecasts.
10. StackExchange Data Explorer (MathOverflow reference) — query sports forecasting Q&A data free.

## Polish / Structural Issues
- Sweep does not distinguish READ-ONLY free vs AUTH-GATED free vs PAID for API platforms. Recommend adding a `ACCESS: open-read / auth-free / auth-gated / paid` column.
- No mention of rate limits for any API platform — essential for a TypeScript consumer planning ingestion frequency.
- No cross-reference to existing repo artifacts (`kalshi-fairvalue-spike.mjs`, `docs/AI/` forecasting docs). Catalog should link.
- Non-forecasting entries (Zenodo, Arweave, Kaggle, HF, PWC, HAL, MathOverflow) should be separated into an `INFRA / DATA REPOSITORIES` appendix rather than mixed into forecasting verdicts.
- Date stamp 2026-08-25 should be paired with a `VERIFIED` evidence line (e.g., `curl -I`) per platform for reproducibility.
