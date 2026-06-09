# RD20-12: Trust UX and Evidence Badges

Status: R&D handoff
Priority: P0
Horizon: Design foundation
Owner mode: UI system + claim governance

## Strategic Thesis

Trust should be visible in the interface. Source state, confidence, staleness, contradiction, hypothetical mode, official status and entitlement should each have consistent visual and semantic treatment.

## Why This Matters Now

AI and betting-adjacent products face a trust plateau. GSE can make trust feel like product quality, not legal fine print.

## Competitor Pressure

Many competitors show confidence but hide evidence. GSE can make evidence and uncertainty part of the brand.

## Current Repo Anchors

- docs/brain/public-trust-layer.md
- docs/brand-safety-rules-v2.md
- docs/evidence-engine.md
- apps/web/lib/brand-safety

## External Sources

- [W3C WCAG 2.2 new success criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) - Accessibility requirements for target size, focus, dragging and authentication.
- [web.dev Interaction to Next Paint](https://web.dev/inp/) - Current responsiveness standard and lifecycle interaction metric.
- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/) - Provenance vocabulary and interchange model for source lineage.
- [Braze 2026 Customer Engagement Review](https://www.braze.com/press-releases/the-2026-braze-customer-engagement-review-ai-innovation-meets-the-trust-plateau) - Trust gap and privacy risk in AI-assisted customer engagement.

## Product Surfaces

- Badge system
- evidence drawer
- stale state UI
- hypothetical mode banner
- source timeline
- claim caveats

## Data Inputs

- provenance state
- source tier
- confidence ladder
- activation state
- claim type
- entitlement state
- accessibility labels

## R&D Questions

- Which trust states need separate UI tokens?
- How do badges avoid visual clutter?
- What is the screen-reader story?
- Which states block actions vs warn?

## MVP Plan

1. Trust state taxonomy
2. badge copy and color rules
3. accessibility labels
4. fixture component states

## V1 Plan

1. Reusable TrustBadge and EvidenceDrawer components
2. public/stale/hypothetical UI states
3. brand-safety scanner coverage
4. component maturity Level 2

## V2 / Moat Plan

1. Interactive evidence graph
2. user trust preference settings
3. automated contradiction ribbons
4. trust score trend

## Claude Build Tasks

1. RD20-12-01: Create trust state design tokens and copy list
2. RD20-12-02: Define TrustBadge props and accessibility labels
3. RD20-12-03: Draft EvidenceDrawer data contract
4. RD20-12-04: Map brand safety rules to UI states
5. RD20-12-05: Write component promotion checklist

## Acceptance Criteria

- Badges are keyboard/screen-reader accessible
- Colors are not the only source of meaning
- Stale and hypothetical states are unmistakable
- Badge state comes from data contract, not free-form copy

## Risk Register

- Badge overload
- false precision
- accessibility gaps
- trust theater without real source data

## Metrics To Track

- source drawer opens
- user comprehension test
- trust-related support issues
- component accessibility pass rate

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
