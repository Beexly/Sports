# Excel LADZ — NFL prediction model assessment (2026-09-25)

Independent-builder research lane. Source: the Excel LADZ YouTube channel (Excel-based NFL prediction model builder); most recent 2026-season model videos watched and assessed 2026-09-25.

## Verdict: legit working model, with an asterisk — method to learn, not a file to take

## Method (as presented on the channel)

- **SOS-adjusted attack/defense ratings** on a **12-game trailing window**.
- **Bayesian blending** of last season's data into the current-season ratings.
- **Home-field advantage ~10%** (explicit parameter, not hand-waved).
- **Touchdowns modeled with a generalized Poisson** (not a plain Poisson — handles over/under-dispersion in scoring).
- **5,000 Monte Carlo simulations per matchup**, run in Excel.
- **Data ingestion via Power Query** pulls from **TeamRankings.com** and **Pro Football Reference**.

## GSE-relevant kernels

1. The 12-game trailing window + Bayesian prior-season blending is a clean, simple answer to early-season sample-size problems — directly comparable to GSE's own priors.
2. Generalized Poisson for TD counts is a step up from plain-Poisson scoring models; worth testing against GSE's scoring distributions.
3. Power Query as a no-code ingestion layer (TeamRankings + PFR) is a legitimate free-data pipeline pattern.

## Caveats (explicit, from the author and the assessment)

- **No published track record** — no verifiable ATS/profitability history shown.
- The author himself runs an **explicit accuracy/profitability disclaimer**.
- The model **omits injuries, QB changes, and weather** — known blind spots.
- The workbook itself is **gated behind a $27.50/month Patreon** — the method is learnable from the videos; the file is not freely available.

## Doctrine note

Per Garrett's standing independent-builder doctrine: learn the method, re-implement as GSE's own output. Do not copy the workbook or redistribute the author's gated material.
