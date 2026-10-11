# DISPATCH: Milestone 1 Worker (Surface Unification & Authoritative Board Route)

## Mission
Implement Milestone 1 (Surface Unification & Authoritative Board Route) according to the blueprint in `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md` and requirements in `ORIGINAL_REQUEST.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m1_1`

## Inputs
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\PROJECT.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md` (Full implementation blueprint)

## Exclusive File Boundaries
You exclusively own and may edit the following files:
- `apps/web/next.config.mjs`
- `apps/web/app/board/page.tsx`
- `apps/web/app/picks/page.tsx`
- `apps/web/components/ui/nav.tsx`
- `apps/web/components/ui/mobile-nav.tsx`
- `apps/web/__tests__/board-picks-route-equivalence.test.ts`
- Links in:
  - `apps/web/app/proof/page.tsx`
  - `apps/web/app/sealed/page.tsx`
  - `apps/web/components/trust-ledger/verify-console.tsx`
  - `apps/web/components/ui/command-palette.tsx`
  - `apps/web/lib/brand.ts`
  - `apps/web/lib/seo/sports-jsonld.ts`

DO NOT edit files outside this list (specifically do not edit pricing page or fantasy components).

## Implementation Checklist
1. **Next.js Config**: Add `{ source: "/picks", destination: "/board", permanent: true }` to `redirects()` in `apps/web/next.config.mjs`.
2. **Consolidate `/board`**: Update `apps/web/app/board/page.tsx` to handle `searchParams?.tab` with two distinct tabs:
   - "Actionable Signals" (default or `tab=signals`): renders all published picks (`PickCard`s with plain-English factor trails, filters, `SlateBar`, `PaywallBanner`, etc.).
   - "Gated & Held Games" (`tab=held` or `tab=gated`): renders transparent pass discipline (`PassListItem`s, `BoardLane`s for Scoring Now / Passed On, board metrics tiles, suppression banners).
   - Remove the old "You are here" link pointing to `/picks`.
3. **Runtime Redirect in `app/picks/page.tsx`**: Update `PicksPage()` to execute `redirect('/board' + query)` at runtime, while strictly retaining existing types and exported helper functions to preserve compatibility with the 20 existing static tests.
4. **Navigation Menus**:
   - In `apps/web/components/ui/nav.tsx`: Remove `{ label: "Today's picks", href: "/picks" }`, label trigger "The Board", and clean up duplicate function declarations from the rebase anomaly.
   - In `apps/web/components/ui/mobile-nav.tsx`: Remove `{ label: "Today's picks", href: "/picks" }`.
5. **Route Equivalence Test**: Update `apps/web/__tests__/board-picks-route-equivalence.test.ts` into a 5-assertion suite verifying the 301 redirect, authoritative canonical `/board`, the 2 tabs, navigation links, and absence of `/picks` links.
6. **Public Links**: Update any remaining `href="/picks"` links to `href="/board"` in `proof`, `sealed`, `verify-console`, `command-palette`, `brand.ts`, and `sports-jsonld.ts`.
7. **Verification**:
   - Run `npm run test --workspace=apps/web -- __tests__/board-picks-route-equivalence.test.ts`
   - Run `npm run test --workspace=apps/web -- __tests__/nav-route-integrity.test.ts`
   - Run `npm run lint:brand` and `npm run guard:trust`
   - Document commands and results in `handoff.md`.
8. Report completion to the Project Orchestrator via `send_message`.


## 2026-10-11T21:04:26Z
[Message] timestamp=2026-10-11T21:04:26Z sender=54bf42d6-0187-42fc-84af-ba49e183495d priority=MESSAGE_PRIORITY_HIGH content=You are the Implementation Worker for Milestone 1 (Surface Unification & Authoritative Board Route).
Your working directory is: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m1_1
Read C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m1_1\DISPATCH.md and C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. 301 permanent redirect /picks -> /board in next.config.mjs.
2. apps/web/app/board/page.tsx: single consolidated board with two tabs (?tab=signals "Actionable Signals", ?tab=held "Gated & Held Games").
3. apps/web/app/picks/page.tsx: runtime redirect to /board while retaining exported types/helpers for the 20 static Vitest test files.
4. apps/web/components/ui/nav.tsx & mobile-nav.tsx: remove /picks, label trigger 'The Board', clean duplicate functions in nav.tsx.
5. apps/web/__tests__/board-picks-route-equivalence.test.ts: update to 5-assertion consolidation suite.
6. Public links to /picks -> /board across proof, sealed, verify-console, command-palette, brand.ts, sports-jsonld.ts.
7. Run tests, lint:brand, and guard:trust to verify.
Document results in handoff.md and send_message upon completion.
