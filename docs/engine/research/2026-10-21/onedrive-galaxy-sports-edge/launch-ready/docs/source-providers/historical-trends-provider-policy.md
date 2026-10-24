# Sports OS — Historical Trends Provider Policy

**Status**: Doctrine. Governs evaluation and admission of historical sports data providers.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/audit/final-wave-source-risk-register.md` — source risk classification framework
- `docs/source-providers/scores24-source-review.md` — specific provider review (ORANGE)
- `docs/source-providers/commercial-crawling-approval-gate.md` — crawling approval requirements
- `docs/brain/source-hierarchy.md` — source tier taxonomy

---

## Purpose

Historical sports trends data — season records, team performance across
conditions, head-to-head outcomes, weather effects on scoring, rest day
patterns, travel schedules — is a valuable input for the prediction engine's
scoring logic.

However, historical data providers are diverse in their data quality, licensing
clarity, and redistribution terms. Unlicensed use of historical data creates
the same legal and integrity risks as scraping live odds.

This policy defines how Sports OS evaluates, admits, and manages historical
trends data providers.

---

## The Distinction: Historical vs. Live Data

| Data type | Primary source | Provider tier | Example use |
|---|---|---|---|
| Live odds / lines | The Odds API (licensed) | T2 | Pick confidence context |
| Official scores / stats | League official feeds | T1 | Evidence chain, pick settlement |
| Historical odds | Specialized historical data providers | T2 (pending license) | Back-testing prediction models |
| Historical team/player stats | Licensed stats providers (Sportradar, Stats Perform) | T2 (pending license) | Engine calibration, Almanac essays |
| Historical trends compilations | Various aggregators | T2–T4 (requires review) | Context only; not primary evidence |

The key distinction: historical data used in the prediction engine's back-testing
and calibration must satisfy the same licensing requirements as live data used
in active picks. "It's historical — no one cares" is not a defense for unlicensed use.

---

## Section 1 — Provider Evaluation Criteria

Every proposed historical trends provider is evaluated on the four-dimension
framework from `docs/audit/final-wave-source-risk-register.md`:

| Dimension | What to check | Weight for historical data |
|---|---|---|
| **Data quality** | Completeness, accuracy, depth of historical record, update cadence | High |
| **Legal / licensing** | Commercial use license, redistribution rights for derived outputs | Critical |
| **Reliability** | API uptime, data format stability, historical data corrections policy | Medium |
| **Manipulation risk** | Is the historical record curated by a verified source? | High |

**For historical providers specifically**:
- The licensing dimension is CRITICAL because back-testing with historical data
  can produce publicly cited model performance claims. If the underlying data
  is not licensed, those performance claims rest on unlicensed data.
- The data quality dimension is HIGH because poor historical data (missing games,
  incorrect scores) will corrupt the calibration feedback loop.

---

## Section 2 — Provider Tier Classification

Historical data providers are classified using the same GREEN/YELLOW/ORANGE/RED
framework as all other sources:

| Classification | What it means for historical data |
|---|---|
| GREEN (all dimensions ≥4) | Admit immediately with documented constraints |
| YELLOW (one dimension 3–3.9) | Admit with documented constraints after operator sign-off |
| ORANGE (one dimension 2–2.9) | Requires owner approval; use for back-testing only, not public claims |
| RED (any dimension <2 or legal concern) | Do not admit |

**Important rule**: A historical provider classified ORANGE may be used for
internal model calibration testing ONLY — not for generating any public claim.
An ORANGE historical provider cannot be cited in a Model Journal win rate claim,
a public performance disclosure, or a Galaxy Almanac essay.

---

## Section 3 — Known Provider Profiles

### Official League Historical Records

**Examples**: NFL official historical stats, NBA historical box scores (via official
data licensing program), MLB historical records (Baseball Reference via official program)

**Risk profile**:
- Data quality: 5 — authoritative
- Legal / licensing: 4 — public records; redistribution of derived outputs generally
  permitted for editorial/commentary; raw data redistribution may require license
- Reliability: 5
- Manipulation risk: 5

**Classification**: GREEN  
**Use**: Back-testing, engine calibration, Almanac essays (with attribution)  
**Constraint**: Attribution required. Verify redistribution terms for any
bulk data use beyond editorial citation.

---

### Sportradar Historical Data

**Risk profile**:
- Data quality: 5 — professional-grade
- Legal / licensing: 3 — requires signed commercial agreement; redistribution restricted
- Reliability: 5 — SLA-backed
- Manipulation risk: 5

**Classification**: YELLOW  
**Use**: Requires individual licensing review. No use before signed agreement.  
**Constraint**: Owner approval + legal review required before integration.

---

### Stats Perform (Opta) Historical Data

**Risk profile**: Same as Sportradar — YELLOW, requires individual licensing.

---

### Pro Football Reference / Basketball Reference / Baseball Reference

**Risk profile**:
- Data quality: 4–5 — well-maintained, widely-cited
- Legal / licensing: 3 — Sports Reference LLC's ToS restricts bulk automated access
  and commercial redistribution of the data
- Reliability: 4
- Manipulation risk: 4

**Classification**: YELLOW — editorial citation permitted (T3 reference); bulk
automated ingestion requires license review  
**Use**: May be cited in Almanac essays as editorial reference. May NOT be
scraped in bulk. May NOT be used as a primary data source for engine calibration
without a commercial agreement with Sports Reference LLC.

---

### Academic / Public Research Datasets

**Examples**: Kaggle sports datasets, GitHub sports historical datasets

**Risk profile**:
- Data quality: 2–4 — varies significantly; many contain errors
- Legal / licensing: 2–4 — depends heavily on the specific dataset; many are
  compiled without clear provenance
- Reliability: 3
- Manipulation risk: 3

**Classification**: Case-by-case. Each dataset must be individually reviewed.  
**Default assumption**: ORANGE until license and provenance are confirmed.  
**Rule**: A dataset with unclear provenance (e.g., "scraped from ESPN" in the
dataset description) may not be used, even if it is publicly available on Kaggle.

---

### Scores24 Historical Data

See `docs/source-providers/scores24-source-review.md`.  
**Classification**: ORANGE. No use until licensing is resolved.

---

## Section 4 — Use Case Rules for Historical Data

| Use case | Allowed sources | Notes |
|---|---|---|
| Prediction engine back-testing | GREEN or YELLOW (licensed) | YELLOW requires signed agreement |
| Model calibration (confidence score tuning) | GREEN or YELLOW (licensed) | Calibration data quality directly affects public confidence scores |
| Galaxy Almanac historical analysis | GREEN or YELLOW (editorial citation) | Attribution required |
| Public win rate performance claim | GREEN or YELLOW (licensed) | Must satisfy full claim governance rules |
| Internal research only (never published) | ORANGE with owner approval | ORANGE may NOT be cited publicly |
| Evidence vault items | T1 or T2 licensed only | Historical data items follow same evidence rules as live data |

---

## Section 5 — Data Freshness for Historical Records

Historical data is not static. Records are corrected, supplemented, and
updated as data quality improves. Rules:

- Historical data used in engine calibration must be from a specific versioned
  snapshot — not a live feed that changes without notice
- If historical data is updated by the provider, the calibration must be
  re-run and the change documented in the model version log
- Historical data snapshots used for calibration must be stored internally
  so that calibration results can be reproduced

---

## Approval Gates

| Action | Who approves |
|---|---|
| Admitting GREEN historical provider | Operator |
| Admitting YELLOW historical provider | Owner + signed license agreement |
| Using ORANGE historical data for internal testing | Owner |
| Citing historical data in a public Almanac essay | Operator |
| Citing historical win rate data in any public claim | Owner (claim governance applies) |

---

## Forbidden Actions

- Do NOT scrape historical data from any source without confirming automated
  access is permitted
- Do NOT use a dataset with unclear provenance (e.g., crowd-sourced or re-scraped)
  for engine calibration
- Do NOT cite an ORANGE-classified provider in any public claim
- Do NOT use historical data to make forward-looking certainty claims
- Do NOT admit a historical data provider without completing this review framework

---

## Codex Audit Requirements

1. Confirm no bulk data scraper targets Sports Reference LLC properties
2. Confirm any historical data source used in `packages/prediction-engine/`
   calibration has a documented license and risk classification
3. Confirm no Kaggle or GitHub dataset is used in calibration without a
   provenance review record
4. Report any historical data source in the engine without a classification
   as P1 — calibration integrity depends on licensed data
