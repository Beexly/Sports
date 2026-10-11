# DISPATCH: Survey Explorer 1 (Surface Unification & Authoritative Board Route)

## Mission
Investigate R1 (Surface Unification & Authoritative Board Route) from ORIGINAL_REQUEST.md across the codebase.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_1`

## Scope & Instructions
1. Read `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md` thoroughly.
2. Investigate:
   - `next.config.mjs` (or next config files): how redirects are configured, implementing 301 redirect from `/picks` to `/board`.
   - `/picks` and `/board` page components and routes under `apps/web/app/` or `apps/web/pages/`: current implementations, how they differ, how to consolidate into a single `/board` route.
   - The two tabs requirement on `/board`:
     1. Actionable Signals (published picks with plain-English factor trails).
     2. Gated & Held Games (pass-discipline showing games where edge < publish threshold).
   - Desktop and mobile navigation menus (`nav.tsx`, `mobile-nav.tsx`, and any other nav files): verify that navigation links label the primary signals route as "The Board" with route `/board`.
   - `apps/web/__tests__/board-picks-route-equivalence.test.ts`: analyze the test requirements, how it currently verifies the routes, and what changes are needed to reflect the single-board architectural consolidation.
   - Any other files, routes, or tests referencing `/picks`.
3. Provide:
   - Full inventory of all files that need modification.
   - Exact code locations, function signatures, props, state management.
   - Dependencies and constraints.
   - Recommended implementation steps for Worker.
4. Output: Write your comprehensive survey report to `handoff.md` in your working directory. Send a message upon completion.


## 2026-10-11T20:42:14Z
You are Survey Explorer 1 for the Galaxy Sports Edge (GSE) architectural overhaul.
Your working directory is: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_1
Read your instructions in C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_1\DISPATCH.md and C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md.

Focus: R1 (Surface Unification & Authoritative Board Route).
Investigate:
1. next.config.mjs: 301 permanent redirect from /picks to /board.
2. apps/web/app/ (or pages/): consolidate /picks and /board into single /board route with two distinct tabs:
   - Actionable Signals (published picks with plain-English factor trails).
   - Gated & Held Games (transparent pass-discipline showing games where edge < publish threshold).
3. Navigation: Desktop and mobile navigation menus (nav.tsx, mobile-nav.tsx, etc.) showing only 'The Board' for primary signals.
4. apps/web/__tests__/board-picks-route-equivalence.test.ts: update to reflect single-board architectural consolidation.
5. Check for any dead links, 404s, or remaining references.

Maintain progress.md in your working directory.
When complete, write your full findings and implementation blueprint to handoff.md in your working directory, and notify me with send_message.
