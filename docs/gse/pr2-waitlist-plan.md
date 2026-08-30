# PR2 Waitlist Plan

## Structure verification required before implementation
- Confirm `apps/web` route architecture and current layout before adding new endpoints.
- Confirm existing DB schema for lead capture and consent fields.
- Confirm whether waitlist should use a dedicated table or reuse existing onboarding table.
- Confirm content-guard middleware and trust flags currently in use.

## Likely app route/component locations (after verified)
- `apps/web/app/waitlist/page.tsx` (waitlist landing)
- `apps/web/app/api/waitlist/route.ts` (submission API)
- `apps/web/components/gse/` for isolated waitlist and copy blocks
- `apps/web/lib/` for shared validation and UTM parsing helpers

## Storage options
- **Option A:** Use existing Cockpit/lead persistence tables if schema fits required consent and provenance fields.
- **Option B:** Add lightweight `gse_waitlist_leads` table with explicit consent + tracking columns.
- **Preferred now:** Option B for traceability and clean PR1 separation.

## Validation approach
- Keep a no-op analytics layer in PR2 only.
- Add schema migration in draft mode.
- Validate form input with zod-like validation and explicit server-side re-check.
- Include contract tests for backtest-truth banner and no-claim copy presence.

## No-op analytics plan
- Phase PR2: collect only event stubs for internal queue review.
- Do not connect third-party tracking without explicit owner approval.
- Keep aggregate counters minimal: started/viewed/submitted/blocked.

## Test plan
1. Form renders and validates required fields.
2. Consent required before submission.
3. Claim gate unit checks for banned terms.
4. Backtest truth visibility remains in public-safe section.
5. Manual owner-review queue status can be updated.

## Stop conditions
- Any request to include public performance claims.
- Missing source tracking or consent path.
- Need to expose money or pricing in PR2 without owner-approved billing path.
- Cross-lane data or brand leakage with XXX/other lanes.

## Owner gates
- No external sends or publishes
- No pricing changes
- No sportsbook/affiliate framing
- Final release blocked until trust and owner gates are explicitly approved
