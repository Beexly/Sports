# Live Catalog Sweep — Prediction/Forecasting Platforms

Verified: 2026-08-25 (live fetches via web_extract + web_search). Verdicts: REAL-AND-LIVE / REAL-BUT-STALE / LIKELY-FABRICATED.
ACCESS legend: open-read (no auth, free read API) / auth-free (free, needs signup key) / auth-gated (OAuth/account) / none-documented.
Corrections from review-platform-catalog.md supersede inline verdicts below: PredictionBook = RETIRED; INFER missing from this sweep; rate limits noted in the review file.

## Forecasting / Prediction Markets
- Numerai — REAL-AND-LIVE | ACCESS: auth-free (numerapi token) | https://numer.ai/ (live) | PUBLIC API: yes — docs https://docs.numer.ai/ ; numerapi.readthedocs.io (free read pipeline possible)
- QuantConnect — REAL-AND-LIVE | ACCESS: auth-gated | https://www.quantconnect.com/ (live) | PUBLIC API: yes — REST/docs at https://www.quantconnect.com/docs/
- Metaculus — REAL-AND-LIVE | ACCESS: open-read (read endpoints; write throttled/auth) | https://www.metaculus.com/ (live) | PUBLIC API: yes — https://www.metaculus.com/api/
- Manifold (manifold.markets) — REAL-AND-LIVE | ACCESS: open-read (~500 req/min per IP, no auth for reads) | https://manifold.markets/ (live) | PUBLIC API: yes — https://docs.manifold.markets/api
- Good Judgment Open — REAL-AND-LIVE | ACCESS: none-documented | https://www.gjopen.com/ (live, title present) | PUBLIC API: no free public data export documented; site loads
- Polymarket — REAL-AND-LIVE | ACCESS: open-read (Gamma/CLOB read ~15k req/10s; trading auth-gated) | https://polymarket.com/ (live) | PUBLIC API: yes — https://docs.polymarket.com/ (market data / predictions endpoints)
- Augur — REAL-BUT-STALE/REBOOTING | https://www.augur.net/ (live, "Rebooting") | PUBLIC API (legacy): v2 docs exist but current activity minimal; site says reboot
- Zeitgeist — REAL-AND-LIVE | ACCESS: none-documented (Substrate RPC, not REST) | https://zeitgeist.pm/ (live) | PUBLIC API: Substrate-based; docs/site available; no obvious free REST endpoint advertised on landing
- Cultivate Labs — REAL-AND-LIVE | ACCESS: auth-gated (enterprise) | https://www.cultivatelabs.com/ (live) | PUBLIC API: enterprise-focused; no documented free public read API on site
- Hypermind — REAL-AND-LIVE | ACCESS: none-documented | https://www.hypermind.com/ (live, page loads minimal) | PUBLIC API: none visible; site sparse
- Saga (forecasting check sagacvo.com) — LIKELY-FABRICATED / MISIDENTIFIED | https://sagacvo.com/ BLOCKED/private-net; no forecasting platform there; "Saga" results are crypto price predictions (SAGA token), not a forecasting site
- Fatebook — REAL-AND-LIVE | ACCESS: none-documented | https://fatebook.io/ (live) | PUBLIC API: none advertised; Slack integration noted
- PredictionBook — RETIRED (per review-platform-catalog.md re-check 2026-08-25) | https://predictionbook.com/ | previously listed "low activity"; review found it retired
- 'In预测' — LIKELY-FABRICATED | Search returns only Chinese predictive-analytics docs (BigQuery forecasting, IBM); no platform by that exact name exists
- CERN-backed Zenodo — REAL-AND-LIVE (archive, not forecasting-specific) | ACCESS: open-read | https://zenodo.org/ (live) | PUBLIC API: yes — REST/API at https://zenodo.org/api/ (free)
- Arweave / IPFS for proofs — REAL INFRASTRUCTURE (not forecasting platform) | arweave.org / ipfs.tech (known) | PUBLIC APIs: yes — both have free read gateways / gateways
- Kaggle Models — REAL-AND-LIVE | ACCESS: auth-free (API token) | https://kaggle.com/docs/api (live) | PUBLIC API: yes — https://www.kaggle.com/docs/api (free tier with limits)
- Hugging Face Hub — REAL-AND-LIVE | ACCESS: open-read | https://huggingface.co/docs/hub/en/api (live) | PUBLIC API: yes — https://www.huggingface.co/docs/hub/en/api (free)
- Papers with Code — REAL-AND-LIVE (now HF-backed) | ACCESS: none-documented | https://paperswithcode.com/ (live, HF branding) | PUBLIC DATA: site browseable; no dedicated public REST docs; GitHub client exists
- HAL Science — REAL-AND-LIVE | ACCESS: open-read | https://hal.science/ (live, bot-check page) | PUBLIC API: yes — HAL has a public REST/API (documented via API endpoint)
- MathOverflow — REAL-AND-LIVE | ACCESS: open-read (SE API + Data Explorer) | https://mathoverflow.net/ (live) | PUBLIC API / DATA EXPORT: StackExchange Data Explorer (free queries) + Stack Exchange API; site is Q&A, not forecasting

## Missed platforms (added per review-platform-catalog.md)
- INFER (RAND forecasting tournaments) — MISSING from original sweep; tournament archives are public forecasting data. Add to next live check.
- Kalshi — REGULATED event contracts with public market data; repo already has `kalshi-fairvalue-spike.mjs`; sports contracts browsable free. Add to next live check.
- Smarkets / Betfair exchange APIs, PredictIt — flagged by review as relevant exchange-data sources (auth tiers vary).

Summary counts: REAL-AND-LIVE = 14; REAL-BUT-STALE/DEAD = 1 (Augur reboot); LIKELY-FABRICATED/MISIDENTIFIED = 2 (Saga forecasting claim / 'In预测'); Non-forecasting real infra = 4 (Zenodo, Arweave/IPFS, Kaggle, HF, PWC, HAL, MathOverflow — included for completeness).
