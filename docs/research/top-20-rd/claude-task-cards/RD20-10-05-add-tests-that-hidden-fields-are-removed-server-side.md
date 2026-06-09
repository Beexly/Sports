# RD20-10-05: Add tests that hidden fields are removed server-side

Area: RD20-10 - Free/Pro/Elite Entitlement Architecture
Priority: P0
Phase: Phase 1

## Suggested Scope

- docs/subscriptions-and-paywall.md
- apps/web/lib/entitlements.ts
- apps/web/app/api/picks/route.ts

## Guardrails

- Leaky gates
- dark-pattern pricing
- over-gating trust signals

## Acceptance Criteria

- Gating is enforced server-side
- Free tier remains useful without exposing paid data
- Upgrade prompts name the value being unlocked

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
