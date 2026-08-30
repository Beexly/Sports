# Partner/Sponsor Review Fixtures

Status: local fixture pack only. This does not approve partners, activate affiliate links, send outreach, publish sponsor copy, expose routes, create database records, or grant sponsor control.

## Purpose

The partner/sponsor review fixture pack gives GSE a repeatable local proof set for commercial review before any partner or sponsor material reaches a public surface.

Code:

- `apps/web/lib/workflows/partner-sponsor-review-fixtures.ts`
- `apps/web/__tests__/partner-sponsor-review-fixtures.test.ts`

The fixtures reuse existing seams:

- draft fence workflow packets
- revenue offer eligibility
- disclosure policy
- responsible-gaming policy
- commercial copy scanning
- partner risk scoring
- sponsor package independence boundaries

## Fixture Set

| Fixture | Expected result | What it proves |
| --- | --- | --- |
| `creator_tool_affiliate_manual_review` | ready for manual review | Low-risk affiliate copy can enter owner review only when disclosure, surface approval, and offer approval are present. |
| `board_meeting_sponsor_independence` | ready for manual review | Sponsor copy can state sponsor boundaries without blocking truthful independence language. |
| `sponsor_control_attempt_blocked` | blocked | Sponsor attempts to approve or control picks/model outputs are blocked even when normal workflow fences would only send the copy to manual review. |
| `regulated_unknown_state_blocked` | blocked | Sportsbook-style offers fail closed when user state is unknown, even with disclosure and responsible-gaming text present. |
| `expired_offer_blocked` | blocked | Offer approval and partner approval are separate; an expired offer blocks even when the partner remains approved. |
| `unsafe_claim_copy_blocked` | blocked | Evidence-required commercial claims such as ROI/proven language block before manual review. |

## Live Action Locks

Every generated packet locks:

- `publishAllowed=false`
- `routeExposureAllowed=false`
- `externalSendAllowed=false`
- `liveIntegrationAllowed=false`
- `affiliateActivationAllowed=false`
- `sponsorApprovalAutomatic=false`

## Sponsor Independence Boundary

Sponsors cannot control:

- picks
- model outputs
- no-bet decisions
- loss autopsies
- calibration claims
- editorial conclusions

Truthful copy that says the sponsor cannot control these surfaces is allowed to reach manual review. Copy or metadata indicating the sponsor asks to approve or control those surfaces is blocked.

## Verification

Focused command:

```bash
npm.cmd run test --workspace=apps/web -- partner-sponsor-review-fixtures.test.ts draft-review-fixtures.test.ts affiliate-compliance.test.ts sponsor-copy-scan.test.ts partner-risk-engine.test.ts partner-opportunity.test.ts
npm.cmd run typecheck --workspace=@sports/web
```

Before merge:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Non-Approval Statement

This fixture pack is evidence for local review behavior only. It does not create a live partner registry, approve an offer, generate a real affiliate URL, send outreach, publish sponsor copy, or create any right for sponsors to influence picks, model outputs, no-bet decisions, loss autopsies, calibration claims, or editorial conclusions.
