# RD20-11: Founder-Only Intelligence Layer

Status: R&D handoff
Priority: P1
Horizon: Moat protection
Owner mode: Operator cockpit

## Strategic Thesis

The public product should be clean and trusted; the founder layer should expose the messy internal truth: formulas, source risk, provider costs, experiments, competitor watch and decisions.

## Why This Matters Now

GSE needs speed without leaking its formula or confusing users. A private layer lets Claude and the founder improve the system while public surfaces stay disciplined.

## Competitor Pressure

Competitors hide formulas entirely. GSE can keep private transparency internally while exposing only source-safe explanations publicly.

## Current Repo Anchors

- docs/brain/operator-cockpit-governance.md
- docs/cockpit-spec.md
- apps/web/app/cockpit

## External Sources

- [OpenLineage](https://openlineage.io/) - Open standard reference for pipeline, dataset and run lineage.
- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/) - Provenance vocabulary and interchange model for source lineage.
- [The Odds API](https://the-odds-api.com/liveapi/guides/v4/) - Current repo odds provider and market data reference.

## Product Surfaces

- Founder cockpit
- source war room
- formula notebook
- competitor watch
- provider budget dashboard
- experiment registry

## Data Inputs

- feature weights
- source registry
- provider costs
- model versions
- competitor notes
- approval logs
- shadow factors

## R&D Questions

- What is founder-only forever?
- What can graduate to Elite?
- How are experiments tracked and retired?
- What can Claude edit vs only propose?

## MVP Plan

1. Founder-only taxonomy
2. cockpit page spec
3. experiment registry docs
4. approval log contract

## V1 Plan

1. Founder dashboard route
2. source risk and provider cost panels
3. formula notebook with redaction rules
4. experiment status board

## V2 / Moat Plan

1. Automated competitor diff ingestion from manual research
2. provider ROI dashboard
3. shadow-factor promotion workflow
4. Claude proposal review queue

## Claude Build Tasks

1. RD20-11-01: Define founder-only data classes
2. RD20-11-02: Create cockpit route spec and navigation placement
3. RD20-11-03: Draft formula notebook redaction policy
4. RD20-11-04: Create experiment registry schema
5. RD20-11-05: Add tests preventing founder fields in public responses

## Acceptance Criteria

- Founder-only fields never leave internal routes
- Each experiment has owner, status, source and decision log
- Every provider cost estimate is labelled verified/unverified
- Claude can propose changes without silently applying formulas

## Risk Register

- Formula leakage
- overbuilding cockpit before user value
- unverified competitor claims
- operator overload

## Metrics To Track

- time to source diagnosis
- experiment cycle time
- provider spend visibility
- blocked public leak tests

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
