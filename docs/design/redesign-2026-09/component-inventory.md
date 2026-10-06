# Component inventory: brief vs. what exists today

Maps the brief's component library list (`8970241d-claudedesignprompt.md` §9: "buttons,
inputs, tabs, tables, pick row, chart frame, badge set (win, loss, void, push, stale,
locked, verified), drawer, sheet, toast, empty state, skeleton") to what is actually in
`apps/web/components` today. For each item: file path(s), exported name, its
variant/prop axes read from the real `Props` interface, whether it is one of the 53
components already bundled into `.design-sync/entry.tsx`, and a verdict: **reuse as-is**,
**reuse with restyle**, or **missing**.

Method: `grep`/`find` across `apps/web/components` and `apps/web/app`, cross-checked
against `.design-sync/entry.tsx`. Every file path and prop name below is quoted from a
file I opened.

## `.design-sync/entry.tsx` coverage

`.design-sync/entry.tsx` currently re-exports **53 named components** (confirmed by
counting: 50 `export { ... }` statements, one of which exports three names, two of which
export two names each, totalling 53 individual exports, plus 21 separate `export type`
statements for their prop types). Full list, for reference:

`KpiCard, PageHero, Tabs, FilterBar, DataTable, ToneCell, MetricExplainer,
MetricHonesty, Term, Ticker, CountUp, RiskDisclosure, SourceError,
MethodologySection, ToolPageSkeleton, NavMenu, MobileNav, Footer, PickCard,
LineFreshnessBadge, ValueGapBadge, DevigMethodDisclosure, VerifyPickButton,
EvidenceAuditDrawer, ResultCard, PlayerCard, StatusTile, ChecklistRow,
JarvisDiffBadge, JarvisTrend, HealthRing, Reveal, Stagger, Marquee, SignalRule,
HoloTilt, HonestyNote, FormulaPlaque, OddsFormatToggle, BoardHealthBadge,
BoardSurfaceChip, LogoMarkInline, BrandLockup, GsnLockup, PricingPlans,
TierGatePanel, CalibrationCurve, ToutComparison, StartInSixty, DoorCard,
WorldSection, ReliabilityChart, HonestBand`

Of the brief's twelve component categories, this bundle already carries real
implementations of **Tabs, DataTable (tables), PickCard (pick row), EvidenceAuditDrawer
(drawer), ToolPageSkeleton (skeleton)**, plus most of the individual pieces that would
feed a badge set (`LineFreshnessBadge`, `ValueGapBadge`, `BoardHealthBadge`,
`BoardSurfaceChip`, `JarvisDiffBadge`, `JarvisTrend`) and two of the app's several
one-off chart implementations (`CalibrationCurve`, `ReliabilityChart`, plus
`HealthRing`). It carries nothing for **Buttons, Inputs, Sheet, or Toast**, because
those do not exist anywhere in the codebase to bundle (see below), and nothing for a
unified **Badge** component or a unified **chart frame**, because those also do not
exist as single components, only as the fragments listed above.

## The mapping

| Brief item | File(s) | Exported name(s) | Variant / prop axes | In design-sync? | Verdict |
|---|---|---|---|---|---|
| **Buttons** | `apps/web/app/globals.css:64-96` (`.btn-primary`, `.btn-secondary`, `.btn-ghost` CSS classes, applied by hand on native `<button>`/`<Link>` everywhere). Feature-specific one-offs: `components/pricing/subscribe-button.tsx` (`SubscribeButton`), `components/ui/manage-subscription-button.tsx` (`ManageSubscriptionButton`), `components/watchlist/follow-button.tsx` (`FollowButton`), `components/picks/verify-pick-button.tsx` (`VerifyPickButton`). | No generic component; three CSS classes with an already-defined visual variant, plus one-off action components. | The CSS classes are effectively `variant: primary \| secondary \| ghost`, with a separate `.btn-sm` size modifier seen in call sites, but this is convention, not an enforced prop. Each one-off button hardcodes its own markup and has no shared props. | Only `VerifyPickButton` is bundled (as itself, not as a generic Button). | **Missing.** The three CSS variants already give a redesign something to start from, but there is no `<Button variant size>` React component anywhere to reuse or restyle. |
| **Inputs** | No shared file. Hand-rolled per site: `apps/web/app/picks/page.tsx:791-801` (date input + visually-hidden label), `components/trust-ledger/verify-console.tsx:259-267` (text input + visually-hidden label), `components/gsn/waitlist-form.tsx:193-330` (text/select/checkbox fields, each with its own `<label htmlFor>`), `components/fantasy/dfs-optimizer.tsx:89,93` (checkbox, range slider). | None; no `Input`/`TextField`/`Checkbox` export exists anywhere. | Each site defines its own Tailwind class string for border, focus ring, and placeholder color; no shared size/state/variant axis. | Not bundled (nothing to bundle). | **Missing.** The accessibility patterns are good and consistent (every one found has a real label; see `accessibility-audit.md`), so a redesign can standardize the markup without fixing a labeling problem, but there is no component to reuse. |
| **Tabs** | `apps/web/components/ui/tabs.tsx` | `Tabs`, `FilterBar` | `TabsProps`: `param`, `active`, `items: TabItem[]`, `pathname`, `currentParams`, `ariaLabel` (default `"Views"`), `className`, `variant: "paper" \| "dark"` (`tabs.tsx:56-75`). Renders `role="tablist"`. `FilterBarProps`: `children`, `trailing`, `className` (`tabs.tsx:133`). | Yes (`Tabs`, `FilterBar`). | **Reuse as-is.** Query-param-driven, has a light/dark variant already, `role="tablist"` present. |
| **Tables** | `apps/web/components/ui/data-table.tsx` | `DataTable<Row>`, `ToneCell` | `DataTableProps<Row>` (`data-table.tsx:61-102`): `columns`, `rows`, `rowKey`, `initialSort`, `searchable`, `searchPlaceholder`, `searchAccessor`, `enumFilter`, `rowTone`, `rowTitle`, `emptyTitle`, `emptyHint`, `caption` (sr-only, `data-table.tsx:363`), `showRank`, `className`, `minWidth`, `variant: "paper" \| "dark"`. Renders a real `<table>` with `<th scope="col">` (`data-table.tsx:362-381`). | Yes (`DataTable`, `ToneCell`). | **Reuse as-is.** Already has sort, filter, an empty state, a caption, and a light/dark variant. A second, page-local table renderer exists at `apps/web/app/stats/_components.tsx:133` (also a real `<table>` with `<caption>`/`scope="col"`) but is not exported or unified with `DataTable`; a redesign should fold it in rather than keep two implementations. |
| **Pick row** | `apps/web/components/picks/pick-card.tsx` | `PickCard` (internal, non-exported sub-parts: `ResultBadge`, `LockedValue`, `MissingValue`, `ScoreBar`, `EdgeScoreBadge`, `FactorBreakdownPanel`) | `PickCardProps` (`pick-card.tsx:22-27`): `pick: PublicPick`, `canSeeConfidence: boolean`, `canSeeEdgeScore: boolean`, `canSeeFactorBreakdown: boolean`. Already carries the server-side tier gating the brief's "locked, never a blur" requirement needs. | Yes (`PickCard`). | **Reuse with restyle.** The gating logic, factor breakdown, receipt/verify link, and result badge are all already here and functionally sound (see `accessibility-audit.md`'s Pick detail section), but its internal badges (`ResultBadge`, `LockedValue`) are private to this one file, not composable pieces, and its visual language is the current neon-on-black palette the brief wants replaced. |
| **Chart frame** | No shared wrapper. Four to five independent implementations: `components/home/calibration-curve.tsx` (`CalibrationCurve`), `components/calibration/reliability-chart.tsx` (`ReliabilityChart`, a second, separate reliability-diagram implementation), `apps/web/app/stats/_components.tsx:92-119` (`BarChart`, `ScoreRing`, page-local, not exported), `components/motion/health-ring.tsx` (`HealthRing`). | `CalibrationCurve`, `ReliabilityChart`, `HealthRing` (each a standalone chart, not a frame around charts). | Each defines its own title/caption placement, its own axis-label convention, and its own (inconsistent) approach to an accessible text alternative: `CalibrationCurve` uses `role="img" aria-label` stating only sample size (`calibration-curve.tsx:83-84`); `ReliabilityChart` uses `<figure>/<figcaption>` plus `role="img" aria-label={title}` with no numbers in the label at all (`reliability-chart.tsx:32-34`); `BarChart`/`ScoreRing` need no alternative because their data is plain text, not an image. None of them enforces the brief's "every chart has a title that states the claim, axis labels with units, the sample size, and the timestamp" (§5) as a shared contract. | `CalibrationCurve`, `ReliabilityChart`, `HealthRing` are bundled; `BarChart`/`ScoreRing` are not (they are not exported outside `stats/_components.tsx`). | **Missing**, as a unifying component. The redesign needs one `ChartFrame` (title, claim, axis labels, n, timestamp, consistent AT text-alternative pattern) that the existing four/five chart bodies plug into, not a sixth bespoke chart. |
| **Badge set** (win, loss, void, push, stale, locked, verified) | Fragmented across at least eight places, no shared component or prop shape: win/loss/push/void is `ResultBadge` (private function, `pick-card.tsx:628-639`); locked is `LockedValue` (private function, `pick-card.tsx:648-666`); stale is approximated by `components/picks/line-freshness-badge.tsx` (`LineFreshnessBadge`, about line-data age in minutes, not a pick-state word) and by `BoardHealthBadge`'s `DEGRADED` tone (`components/board/board-health-badge.tsx`); verified has no static badge at all, only the interactive `VerifyPickButton` (`components/picks/verify-pick-button.tsx`). Other independent one-offs found in the same sweep: `BoardSurfaceChip` (`components/board/board-surface-chip.tsx`), `JarvisDiffBadge` (`components/cockpit/jarvis-diff-badge.tsx`), `ValueGapBadge` (`components/picks/value-gap.tsx`), `ProjectionsBadge` (`components/integrations/projections-badge.tsx`). | `LineFreshnessBadge`, `BoardHealthBadge`, `BoardSurfaceChip`, `JarvisDiffBadge`, `ValueGapBadge` are the only ones exported as standalone components; `ResultBadge` and `LockedValue` are not exported at all. | Every one of these hardcodes its own color map and its own markup shape (a `<span>` with different Tailwind classes per state); none shares a `variant` prop or a common visual footprint. | `LineFreshnessBadge`, `ValueGapBadge`, `BoardHealthBadge`, `BoardSurfaceChip`, `JarvisDiffBadge`, `JarvisTrend` are bundled (6 of the fragments); `ResultBadge`, `LockedValue`, and `ProjectionsBadge` are not (the first two because they are private to `pick-card.tsx`, not separate files). | **Missing**, as the single badge-set component the brief asks for. Every individual state the brief lists is implemented *somewhere*, correctly text-plus-color (see `accessibility-audit.md`'s color-only checks, all pass), but as seven-plus independent one-offs rather than one component with a `state` prop. |
| **Drawer** | `apps/web/components/picks/evidence-audit-drawer.tsx` | `EvidenceAuditDrawer` | `EvidenceAuditDrawerProps` (`evidence-audit-drawer.tsx:28`): `pickId`, `label`. Renders `role="dialog" aria-modal="true"`, Escape-to-close, initial-focus management (`evidence-audit-drawer.tsx:117-151`). | Yes (`EvidenceAuditDrawer`). | **Reuse with restyle.** This is the only drawer implementation in the app; there is no generic `Drawer` primitive independent of the evidence-audit use case, so a second consumer today would copy the file rather than import a component. It also needs the focus-trap fix noted in `accessibility-audit.md` (Tab is not constrained inside it despite `aria-modal="true"`) before or alongside a restyle. |
| **Sheet** | None. Zero matches for "sheet" anywhere in `apps/web/components`. | none | none | Not bundled (nothing to bundle). | **Missing.** The closest analog in spirit is `MobileNav`'s slide-out panel (`components/ui/mobile-nav.tsx`), which does implement a real Tab/Shift+Tab focus trap (`mobile-nav.tsx:157-175`, unlike the Drawer above), but it is hardcoded to the nav-menu's own content, not a generic, reusable Sheet a redesign could hand arbitrary content. |
| **Toast** | None. Zero matches for "toast" or "snackbar" anywhere in `apps/web/components` or `apps/web/lib`. | none | none | Not bundled (nothing to bundle). | **Missing.** There is currently no transient-notification pattern in the app at all; errors and confirmations are rendered as inline, persistent `role="alert"`/`role="status"` blocks (e.g. `components/gsn/waitlist-form.tsx:174-188`, `components/board/board-health-badge.tsx`), which is a legitimate accessible alternative to a toast, but it is a different UX pattern, not a toast under a different name. |
| **Empty state** | One narrow, feature-specific instance: `components/fantasy/live-pool-empty.tsx` (`LivePoolEmpty`). Otherwise, every page hand-rolls its own empty-state block inline: `apps/web/app/picks/page.tsx:349-420` (outage state and "signal gate collecting" / "freshness guard" empty state, each its own JSX block with its own icon/heading/body). | `LivePoolEmpty`; the inline picks-page blocks are not exported at all. | `DataTable` (above) already solves this case for tabular data specifically, via built-in `emptyTitle`/`emptyHint` props (`data-table.tsx:84-85,294-295,419-420`), rendered when `rows` is empty. | `LivePoolEmpty` is not bundled. `DataTable`'s built-in empty state is bundled as part of `DataTable`. | **Missing**, as a standalone, reusable component for non-table contexts. The one case that is solved (tables, via `DataTable`) is solved well; the board/picks-level empty and locked states the brief specifically asks to design (§4.1, §8.2) are each a bespoke, non-reusable block today. |
| **Skeleton** | `apps/web/components/ui/tool-page-skeleton.tsx`; consumed by `apps/web/app/picks/loading.tsx` and `apps/web/app/board/loading.tsx` (Next.js route-level Suspense loading files). | `ToolPageSkeleton` | `{ label?: string }` (default `"Loading"`), rendered with `aria-busy="true" aria-live="polite"` and an `sr-only` label (`tool-page-skeleton.tsx:13-14`). | Yes (`ToolPageSkeleton`). | **Reuse as-is.** Already accessible (busy/live region, screen-reader label) and already wired into the two most important routes' loading states. |

## Summary

**Reuse as-is (3):** Tabs, Tables (`DataTable`), Skeleton (`ToolPageSkeleton`). All
three are already in `.design-sync/entry.tsx`, already typed, already have a
light/dark or paper/dark variant axis, and already pass the relevant accessibility
checks in `accessibility-audit.md`.

**Reuse with restyle (2):** Pick row (`PickCard`), Drawer (`EvidenceAuditDrawer`). Both
are functionally solid and already in `.design-sync/entry.tsx`; both need a visual
restyle to the new token set, and the drawer additionally needs its missing focus trap
fixed.

**Missing (7):** Buttons, Inputs, Chart frame, Badge set, Sheet, Toast, Empty state
(as a standalone, non-table component). None of these seven has a single reusable
component today. For four of them (Buttons, Badge set, Empty state, Chart frame) the
individual pieces already exist scattered across the codebase and mostly work
correctly; the gap is that nothing unifies them into one component with a shared prop
shape. For the other three (Inputs, Sheet, Toast) there is close to nothing to start
from: Inputs is all one-off markup with duplicated Tailwind strings, and Sheet and
Toast do not exist in any form.
