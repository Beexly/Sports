# Vendor / Terms Review — CollegeFootballData (CFBD)

**Registry source id:** `collegefootballdata` · **Current status:** `vendor_candidate`
(all rights flags `false`). **Goal:** clear the gate to `approved_api` for college-football
FACTS only (passing/scheme data feeding the QB college→NFL transition signal). Never
ingest proprietary ratings/outputs.

This is the concrete checklist behind the registry entry's `unlock_condition`. CFBD's
Terms page is JS-rendered and was NOT machine-verifiable — it needs a human/legal read.
Ingestion stays BLOCKED until every box below is checked.

## 1. Access

- [ ] Obtain a free CFBD API key (https://collegefootballdata.com/key).
- [ ] Store it ONLY as the env var `CFBD_API_KEY` (documented in `.env.example`). Never commit a key.
- [ ] Confirm auth scheme (Bearer token) and the free-tier limit (listed: 1,000 calls/month).

## 2. Terms & rights (human/legal read required)

- [ ] Read the Terms & Conditions in full (page is JS-rendered).
- [ ] Confirm commercial use is permitted for our product.
- [ ] Confirm storage of derived facts is permitted.
- [ ] Confirm derived-analytics use is permitted.
- [ ] Confirm attribution requirements ("College data via CollegeFootballData.com").
- [ ] Confirm no clause forbids model-training-style derived use (we only use facts → features).

## 3. Data scope (what we may extract)

- [ ] FACTS only: games, teams, box scores, schedules, college passing/scheme stats.
- [ ] EXCLUDE proprietary ratings/outputs (e.g. SP+ as a proprietary metric) from any
      ingestion that feeds a claim — treat as reference, not as our input or output.
- [ ] No images/logos (graphics — not extractable as facts).

## 4. Schema verification (no-fake-data)

- [ ] With the key, verify each endpoint's REAL schema live before building an adapter.
- [ ] Do not guess columns. Pin the verified schema in the adapter.
- [ ] Record freshness/update cadence; confirm it meets the no-stale-data rule.

## 5. Promotion

- [ ] On full clearance: flip `collegefootballdata` → `approved_api`, enable
      automation/storage/derived flags, set `reviewed_at`/`reviewed_by`, add evidence URLs.
- [ ] Remove CFBD from `sports-data-candidates.ts` (it graduates to the rights registry).
- [ ] Build the adapter against the verified schema; add ingestion tests.

## Notes

- cfbfastR is the MIT-licensed R wrapper; official Python/TypeScript/C# libraries exist.
- Free tier is generous for the targeted college→NFL signal; paid tiers ($1–$30/mo) raise limits.
- This source is the **highest-priority free CFB stats** candidate — prioritize the terms read.
