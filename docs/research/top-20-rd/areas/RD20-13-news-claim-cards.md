# RD20-13: News Claim Cards

Status: R&D handoff
Priority: P1
Horizon: Source governance
Owner mode: Content + evidence

## Strategic Thesis

News should enter the system as claims, not truth. A claim card captures who said what, when, source tier, related entities, confidence, contradictions and public-safe status.

## Why This Matters Now

Injuries, roster changes and rumors move fast. Claim cards let GSE use news without copying content or laundering weak signals into facts.

## Competitor Pressure

Fantasy media and betting tools move fast with blurbs and alerts. GSE should move fast only when source status is clear.

## Current Repo Anchors

- docs/brain/claim-governance.md
- docs/media/content-provenance-and-review.md
- docs/content-automation.md

## External Sources

- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/) - Provenance vocabulary and interchange model for source lineage.
- [NFL injuries](https://www.nfl.com/injuries/) - Official injury designation reference surface.
- [Braze 2026 Customer Engagement Review](https://www.braze.com/press-releases/the-2026-braze-customer-engagement-review-ai-innovation-meets-the-trust-plateau) - Trust gap and privacy risk in AI-assisted customer engagement.

## Product Surfaces

- Claim card cockpit
- public attributed note
- contradiction queue
- player timeline
- weekly briefing source notes

## Data Inputs

- source entry
- claim text summary
- entities
- claim type
- timestamp
- confidence
- contradictions
- quote limits

## R&D Questions

- What is the smallest legally safe claim summary?
- How do we handle direct quotes?
- Which claim types need human review?
- When does a claim graduate to fact?

## MVP Plan

1. ClaimCard schema
2. source tier and TTL rules
3. quote/attribution policy
4. fixture contradiction examples

## V1 Plan

1. Internal claim capture workflow
2. contradiction detector by entity/claim type
3. public-safe renderer
4. human review queue

## V2 / Moat Plan

1. Publisher/API integrations if licensed
2. claim reliability by source
3. automatic digest assembly
4. appeal/correction workflow

## Claude Build Tasks

1. RD20-13-01: Define ClaimCard type and claim categories
2. RD20-13-02: Map claim states to source hierarchy
3. RD20-13-03: Draft quote and attribution constraints
4. RD20-13-04: Create contradiction fixture cases
5. RD20-13-05: Specify human review queue states

## Acceptance Criteria

- Claim card stores metadata, not copied article body
- Tier 5 claims remain cockpit-only
- Contradictions require visible state
- Public summaries include attribution and timestamp

## Risk Register

- Copyright overcapture
- rumor amplification
- medical speculation
- LLM summarizer inventing details

## Metrics To Track

- claim review time
- contradiction count
- public correction count
- claim-to-delta conversion

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
