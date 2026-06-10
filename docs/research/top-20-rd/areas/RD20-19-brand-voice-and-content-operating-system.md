# RD20-19: Brand Voice and Content Operating System

Status: R&D handoff
Priority: P1
Horizon: Trust + acquisition
Owner mode: Brand + content

## Strategic Thesis

GSE's voice should be sharp, calm, source-aware and anti-tout. Content should teach the product vocabulary: changed, source-backed, confidence, risk, gate, scenario, autopsy.

## Why This Matters Now

The product cannot sound like every pick seller or generic AI site. Voice is a trust surface and acquisition channel.

## Competitor Pressure

Fantasy Footballers win with personality; Footballguys and FantasyPros win with practical trust; Action Network wins with betting OS language. GSE should be evidence-led and founder-accountable.

## Current Repo Anchors

- docs/brand/brand-guidelines.md
- docs/brand-safety-rules-v2.md
- docs/content-surfaces.md
- docs/design

## External Sources

- [Braze 2026 Customer Engagement Review](https://www.braze.com/press-releases/the-2026-braze-customer-engagement-review-ai-innovation-meets-the-trust-plateau) - Trust gap and privacy risk in AI-assisted customer engagement.
- [FantasyPros premium plans](https://www.fantasypros.com/premium/plans/) - Consensus rankings, league sync, draft and DFS premium pattern.
- [Footballguys premium](https://premium.footballguys.com/) - Long-running premium content and tools bundle reference.
- [Action Network subscriptions](https://actionnetworkhq.zendesk.com/hc/en-us/articles/14456167617805-Subscription-options) - Bet tracking, systems, premium picks and subscription pattern.

## Product Surfaces

- homepage copy
- player/game cards
- weekly briefing
- email digest
- model journal
- pricing page
- social snippets

## Data Inputs

- approved claim cards
- ChangeEvents
- source provenance
- model output snapshots
- brand-safety rules
- content templates

## R&D Questions

- What phrases are banned?
- What does sharp but not hype sound like?
- How do we cite without clutter?
- What content cadence supports retention?

## MVP Plan

1. Voice principles
2. allowed/banned phrase list
3. content template map
4. Claude content prompt contract

## V1 Plan

1. Weekly briefing templates
2. autopsy templates
3. What Changed cards
4. brand lint expansion

## V2 / Moat Plan

1. Content performance feedback loop
2. creator partnership playbook
3. multi-channel publishing with review gates
4. voice QA evals

## Claude Build Tasks

1. RD20-19-01: Draft voice system addendum for R&D areas
2. RD20-19-02: Create content template library
3. RD20-19-03: Map banned and preferred language to lint rules
4. RD20-19-04: Specify Claude content inputs and forbidden inventions
5. RD20-19-05: Create review checklist for public copy

## Acceptance Criteria

- No guaranteed-win or AI-pick language
- Every number in copy comes from source data
- Templates include uncertainty language
- Content can be generated only from approved inputs

## Risk Register

- Tout drift
- generic AI voice
- uncited claims
- overly legalistic copy

## Metrics To Track

- newsletter signup rate
- content-to-product conversion
- brand lint violations
- repeat content engagement

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
