# GSE Design, Motion, And Data-UI Repo Watchlist

Generated: 2026-06-09

Stars, forks, and pushed dates were pulled through the GitHub REST API on 2026-06-09. The app currently already uses Next, React, Tailwind, lucide-react, and three. The goal is not to duplicate what we have; it is to add targeted capability where the current app lacks a mature primitive.

## Top 20 Relevant Repos

| Priority | Repo | Stars | Fit | Current GSE Status | Recommendation |
| --- | --- | ---: | --- | --- | --- |
| P0 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | 115,995 | Component system/distribution | Not installed as a formal dependency; app uses Tailwind/lucide foundations. | Adopt selectively for accessible primitives and local ownership; avoid generic template sameness. |
| P2 | [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 49,450 | Programmatic video | Not installed in web app. | Use for automated weekly recap/social/video reports, not core cockpit UI. |
| P1 | [xyflow/xyflow](https://github.com/xyflow/xyflow) | 36,985 | Node/graph interfaces | Not installed. | Use for source fallback graphs, autonomous system topology, and workflow health maps. |
| P0 | [motiondivision/motion](https://github.com/motiondivision/motion) | 32,265 | React/JS animation | Not installed. | Use for measured layout transitions, cards, drawers, and reduced-motion aware UI. |
| P3 | [airbnb/lottie-web](https://github.com/airbnb/lottie-web) | 31,899 | After Effects JSON animation | Not installed. | Use only for small status/empty-state animations; avoid heavy hero animation. |
| P2 | [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 31,042 | React Three.js renderer | Base three is installed; R3F is not. | Use for controlled full-bleed 3D explainers and topology maps where Three.js is already a fit. |
| P0 | [TanStack/table](https://github.com/TanStack/table) | 28,069 | Headless data grids | Not installed. | Strong candidate for cockpit tables, optimizer grids, filters, grouping, and row selection. |
| P1 | [recharts/recharts](https://github.com/recharts/recharts) | 27,211 | React charts | Not installed. | Fast path for cockpit charts, trend cards, source health, and retention dashboards. |
| P3 | [greensock/GSAP](https://github.com/greensock/GSAP) | 25,701 | Advanced motion | Not installed. | Use only after license review for marquee pages; Motion is safer for app UI. |
| P2 | [magicuidesign/magicui](https://github.com/magicuidesign/magicui) | 21,203 | Animated component ideas | Not installed. | Reference for component ideas; do not paste wholesale into operator UI. |
| P0 | [radix-ui/primitives](https://github.com/radix-ui/primitives) | 18,955 | Accessible primitives | Not installed directly. | Use as base under shadcn or custom components for menus, dialogs, tabs, tooltips. |
| P4 | [wagerfield/parallax](https://github.com/wagerfield/parallax) | 16,586 | Parallax | Not installed. | Generally avoid for core product; maybe archival inspiration only. |
| P3 | [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | 14,060 | Smooth scroll | Not installed. | Use only on editorial/story pages, never core cockpit tables unless accessibility proof passes. |
| P2 | [plouc/nivo](https://github.com/plouc/nivo) | 14,038 | Rich data visualization | Not installed. | Consider for advanced dataviz once Recharts baseline is insufficient. |
| P2 | [formkit/auto-animate](https://github.com/formkit/auto-animate) | 13,836 | Drop-in animation | Not installed. | Useful for list/table state transitions if Motion is too heavy for a small surface. |
| P1 | [pacocoursey/cmdk](https://github.com/pacocoursey/cmdk) | 12,662 | Command palette | Not installed. | High-leverage operator command center for cockpit navigation and debug actions. |
| P2 | [pmndrs/drei](https://github.com/pmndrs/drei) | 9,679 | R3F helpers | Not installed. | Use only with R3F for text, cameras, effects, and controls. |
| P1 | [emilkowalski/vaul](https://github.com/emilkowalski/vaul) | 8,407 | Drawer component | Not installed. | Good for mobile operator drawers, evidence panels, and pick detail sheets. |
| P0 | [TanStack/virtual](https://github.com/TanStack/virtual) | 6,944 | Virtual lists | Not installed. | Use with large player/source/event tables to keep dense UIs fast. |
| P2 | [ibelick/motion-primitives](https://github.com/ibelick/motion-primitives) | 5,575 | Animated UI primitives | Not installed. | Reference/adopt sparingly for polished primitives after design-token alignment. |

## Immediate Adoption Candidates

- shadcn-ui/ui: Adopt selectively for accessible primitives and local ownership; avoid generic template sameness. (115,995 stars as of 2026-06-09).
- xyflow/xyflow: Use for source fallback graphs, autonomous system topology, and workflow health maps. (36,985 stars as of 2026-06-09).
- motiondivision/motion: Use for measured layout transitions, cards, drawers, and reduced-motion aware UI. (32,265 stars as of 2026-06-09).
- TanStack/table: Strong candidate for cockpit tables, optimizer grids, filters, grouping, and row selection. (28,069 stars as of 2026-06-09).
- recharts/recharts: Fast path for cockpit charts, trend cards, source health, and retention dashboards. (27,211 stars as of 2026-06-09).
- radix-ui/primitives: Use as base under shadcn or custom components for menus, dialogs, tabs, tooltips. (18,955 stars as of 2026-06-09).
- pacocoursey/cmdk: High-leverage operator command center for cockpit navigation and debug actions. (12,662 stars as of 2026-06-09).
- emilkowalski/vaul: Good for mobile operator drawers, evidence panels, and pick detail sheets. (8,407 stars as of 2026-06-09).
- TanStack/virtual: Use with large player/source/event tables to keep dense UIs fast. (6,944 stars as of 2026-06-09).

## Suggested Dependency Order

1. P0: TanStack Table, TanStack Virtual, Radix/shadcn, Motion.
2. P1: cmdk, Vaul, Recharts, xyflow.
3. P2: R3F/Drei, Magic UI and Motion Primitives as pattern libraries, Nivo for richer visuals, Remotion for video reports.
4. P3/P4: GSAP, Lenis, Lottie, parallax only after license, accessibility, and performance review.

## Guardrails

- No wholesale UI-library paste. Components must be absorbed into the local design system.
- Every motion feature needs prefers-reduced-motion behavior and browser/performance proof.
- Every chart/table feature needs empty, loading, stale, conflict, and degraded-source states.
- Never add a dependency just because it is popular. Tie it to a named GSE workflow.
