# Evidence Chain Standard — Galaxy Sports Edge

Every meaningful claim Galaxy displays must carry lineage. This document
is the standard.

## The rule

> No evidence, no claim.
> Thin evidence, no pick.
> Conflicting evidence, show conflict.
> No edge, show no-bet.

A data card without source and freshness is **incomplete**. A pick
without a failure case is **incomplete**. A confidence number without a
calibration anchor is **incomplete**.

## Required fields per claim

Every analytical surface or card must support:

| Field | Required when |
|---|---|
| Claim | Always — the assertion itself |
| Source | Whenever the claim cites external data |
| Freshness | Whenever the data is time-sensitive (odds, lines, injuries) |
| Model version | Whenever Galaxy's model produced the claim |
| Signal snapshot | Whenever a pick or no-bet was generated |
| Confidence / risk context | Whenever a numeric confidence appears |
| Public-safe explanation | Whenever the engine made a decision |
| Private-engine reference | For audit; never client-side |
| Human review status | For generated content |
| Compliance scan status | For generated content |
| Autopsy link | After settlement |

## Card anatomy

A compliant data card includes (in order):

1. **Header** — what the card is (e.g., "Pick", "No-Bet", "Movement")
2. **Subject** — what game / market / signal
3. **Claim** — Galaxy's assertion
4. **Evidence row** — source + freshness pill + model version
5. **Body** — supporting detail
6. **Failure case** — for picks: how this can be wrong
7. **Next action** — what the user should do
8. **Footer** — link to methodology, link to responsible-play (on
   betting-adjacent cards)

Cards that omit Evidence row, Failure case (for picks), or Next action
fail the Evidence Chain Standard.

## Freshness vocabulary

Standard labels (visible on cards):

- **Live** — fetched within last 5 minutes (lime ping reserved for this)
- **Fresh** — fetched within last hour
- **Today** — fetched today
- **Stale** — fetched yesterday or earlier
- **Sample** — illustrative or demo data, never live
- **Unknown** — provider did not return a timestamp

## Source labels

- **Provider** (e.g., "The Odds API")
- **Galaxy model** (e.g., "model v0.4.2")
- **Aggregate** (multi-source consensus; cite providers)
- **Public record** (league announcement, team press release)
- **Editorial** (Galaxy interpretation; flagged as such)
- **Illustrative** (educational, not from a live source)

## Demo / mock / sample labeling

Any surface rendering non-live data must carry a visible label:

- Banner on the page (e.g., `<SampleDataBanner />`)
- Per-card pill (e.g., "Sample data")
- Card cannot be screenshotted in a way that obscures the label

Stub mode (`@sports/db` with `DATABASE_URL` unset) and bootstrap mode
(`THE_ODDS_API_KEY` unset) both qualify.

## What this standard prohibits

- A pick card without a freshness pill
- A confidence number without a calibration context line
- A win-rate display without a sample size and confidence interval
- A line-movement claim without book attribution
- A "verified record" claim without a public ledger link
- An AI-generated paragraph without a compliance scan badge
- A "live odds" badge in bootstrap mode
- A factor trail that lists weights publicly

## Enforcement

- Code-level: `EvidenceCard` component (to build) accepts required
  props and refuses to render with missing fields
- Lint-level: page audit script verifies sample-data labels where
  stub mode active
- Trust-gate: forbidden copy scan already enforces certainty bans
- Review: every PR touching a data card must include an evidence-chain
  check

## Audit cadence

- Per-cycle for surfaces touched
- Monthly full audit
- Pre-launch full sweep
