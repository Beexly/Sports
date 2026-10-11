# BRIEFING — 2026-10-11T20:53:00Z

## Mission
Investigate R1 (Surface Unification & Authoritative Board Route) to provide a complete, evidence-based survey and implementation blueprint.

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, synthesis
- Working directory: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_1
- Original parent: 54bf42d6-0187-42fc-84af-ba49e183495d
- Milestone: Survey & Investigation (R1: Surface Unification & Authoritative Board Route)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Produce comprehensive survey report in handoff.md
- Ground all findings with exact line numbers, code snippets, and evidence
- Check next.config.mjs, /board, /picks, navigation menus, route equivalence tests, and dead link inventory

## Current Parent
- Conversation ID: 54bf42d6-0187-42fc-84af-ba49e183495d
- Updated: 2026-10-11T20:42:14Z

## Investigation State
- **Explored paths**:
  - `apps/web/next.config.mjs`: lines 81-125 redirects configuration
  - `apps/web/app/board/page.tsx`: 496 lines, state & passes loading, lanes, pass list, calibration
  - `apps/web/app/picks/page.tsx`: 868 lines, signals cards, slate bar, paywall, filters, freshness
  - `apps/web/components/ui/nav.tsx`: lines 16-46 BOARD_MENU, lines 108-208 nav structure & rebase anomaly
  - `apps/web/components/ui/mobile-nav.tsx`: lines 15-27 SECTIONS Board links
  - `apps/web/components/ui/tabs.tsx`: accessible tab navigation component
  - `apps/web/__tests__/board-picks-route-equivalence.test.ts`: 54 lines, test requirements and consolidation design
  - `apps/web/__tests__/nav-route-integrity.test.ts`: nav link integrity and door checking
  - Global codebase sweep for all references to `/picks`
- **Key findings**:
  1. `next.config.mjs` redirects array easily takes `{ source: "/picks", destination: "/board", permanent: true }`.
  2. `/board` can host both tabs seamlessly with `?tab=signals` (Actionable Signals) and `?tab=held` (Gated & Held Games) using URL query param state and `buildTabHref`.
  3. `nav.tsx` and `mobile-nav.tsx` currently have redundant "Today's picks" links alongside "The board". Removing `/picks` leaves "The Board" as the sole primary signals door.
  4. Discovered that 20 existing regression test files statically read `app/picks/page.tsx` via `readFileSync`. Keeping `app/picks/page.tsx` as a runtime redirect component (`redirect('/board')`) while maintaining its exported types/helpers avoids breaking these 20 regression tests!
  5. Found ~8 public customer-facing links that still pointed to `/picks` (in `proof`, `sealed`, `pricing`, `verify-console`, `command-palette`, `brand.ts`, `sports-jsonld.ts`) and need repointing to `/board`.
- **Unexplored areas**: None within R1 scope.

## Key Decisions Made
- Architecture finalized: single authoritative `/board` with two tabs driven by URL search params (`?tab=signals` vs `?tab=held`), Next.js 301 redirect in `next.config.mjs`, and backward-compatible redirect component in `app/picks/page.tsx`.

## Artifact Index
- DISPATCH.md — incoming instructions
- BRIEFING.md — persistent working memory
- progress.md — liveness heartbeat
- handoff.md — final survey report and implementation blueprint
