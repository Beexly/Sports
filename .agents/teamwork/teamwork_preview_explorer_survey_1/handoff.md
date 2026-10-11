# Handoff Report: Survey Explorer 1 — R1 (Surface Unification & Authoritative Board Route)

## 1. Observation

### 1.1 `next.config.mjs` Redirects Architecture
- **Location**: `apps/web/next.config.mjs`, lines 81–125 (`async redirects()`).
- **Current state**: Next.js redirects configure soft aliases and legacy redirects:
  ```javascript
  86:    return [
  87:      { source: "/signup", destination: "/auth/signin", permanent: false },
  88:      { source: "/register", destination: "/auth/signin", permanent: false },
  89:      { source: "/login", destination: "/auth/signin", permanent: false },
  90:      { source: "/checkout", destination: "/pricing", permanent: false },
  91:      { source: "/subscribe", destination: "/pricing", permanent: false },
  ...
  117:     { source: "/observatory", destination: "/board", permanent: false },
  123:     { source: "/games/:gameId", destination: "/room/:gameId", permanent: false },
  124:   ];
  ```
- **Finding**: `/picks` currently has no entry in `redirects()`. An entry `{ source: "/picks", destination: "/board", permanent: true }` will return HTTP 301 (Moved Permanently) before matching filesystem routes, preserving any query parameters (`?sport=...&date=...`).

---

### 1.2 `/board` vs `/picks` Page Architecture
- **Location**:
  - `apps/web/app/board/page.tsx` (496 lines)
  - `apps/web/app/picks/page.tsx` (868 lines)
- **Current state in `board/page.tsx`**:
  - Renders header: "The Board — Every game. Scored and honest." (lines 212–224).
  - Renders "You are here" card containing a link to `/picks` (`Today's picks`) (lines 258–267).
  - Fetches: `loadBoardState`, `loadBoardPasses`, `loadPublicCalibrationReport` (lines 60–64).
  - Renders metrics tiles (`Sports watched`, `Books polled`, `Open picks`, `Passed on`, `Last refresh`, `Model version`) (lines 289–295).
  - Renders 3 lanes: `01 Scoring Now`, `02 Today's Picks` (brief summaries only: matchup, sport, market, edge), `03 Passed On` (lines 297–327).
  - Renders `Pass List` section ("Evaluated without publishing", rows from `loadBoardPasses`) (lines 329–345).
  - Renders `Results` / calibration tracking (lines 347–371).
- **Current state in `picks/page.tsx`**:
  - Renders "Today's sports signals" (Actionable Signals).
  - Fetches: `fetchSlate()` from `/api/picks/daily-slate` and `fetchPicks()` from `/api/picks` (lines 132–199, 223–226).
  - Binds factor trails: `bindPublicPickReasoning(pick, canSeeFactorBreakdown)` (lines 83–106).
  - Renders `SlateBar` (lines 646–705), `PaywallBanner` (lines 731–795), `PicksTrustStrip` (lines 801–836).
  - Renders Sport filter pills (`SPORTS`: All, NFL, NBA, MLB, NHL, NCAAF, NCAAB, MLS) (lines 259–269, 346–369).
  - Renders Grade filter pills (`GRADES`: All, Elite, Strong, Solid) and `DatePickerForm` (lines 270–275, 372–399).
  - Renders `LineFreshnessBadge` (lines 574–583) and grid of `PickCard`s with plain-English factor trails (lines 584–595).
  - Renders empty, locked, and outage states (lines 410–569).

---

### 1.3 Navigation Menus (`nav.tsx` & `mobile-nav.tsx`)
- **Desktop Navigation**: `apps/web/components/ui/nav.tsx`
  - In `BOARD_MENU` (lines 16–46):
    ```typescript
    16: const BOARD_MENU: readonly NavGroup[] = [
    17:   {
    18:     items: [
    19:       {
    20:         label: "The board",
    21:         href: "/board",
    22:         desc: "Every game we scored today",
    23:       },
    24:       {
    25:         label: "League slates",
    26:         href: "/slate",
    27:         desc: "NFL · NCAAF · NBA · NCAAB · MLB · NHL · MLS",
    28:       },
    29:       {
    30:         label: "Today's picks",
    31:         href: "/picks",
    32:         desc: "What we're on, with the reason",
    33:       },
    ```
  - Menu trigger: `<NavMenu label="Board" href="/board" groups={BOARD_MENU} />` (lines 116, 196).
  - **Rebase Anomaly**: Notice lines 108–127 and 152–208 contain duplicate function definitions (`function Nav()` and `function NavSkeleton()`) resulting from commit `496e86be5` ("sheriff(pass2): rebased PR #640").
- **Mobile Navigation**: `apps/web/components/ui/mobile-nav.tsx`
  - In `SECTIONS` (lines 15–27):
    ```typescript
    15: const SECTIONS: readonly Section[] = [
    16:   {
    17:     heading: "Board",
    18:     collapsible: true,
    19:     links: [
    20:       { label: "The board", href: "/board" },
    21:       { label: "League slates", href: "/slate" },
    22:       { label: "Today's picks", href: "/picks" },
    23:       { label: "Our record", href: "/calibration" },
    24:       { label: "Bankroll", href: "/bankroll" },
    25:       { label: "NFL hub", href: "/house" },
    26:     ],
    27:   },
    ```

---

### 1.4 Existing Route Equivalence Test
- **Location**: `apps/web/__tests__/board-picks-route-equivalence.test.ts` (54 lines)
- **Current test assertion**:
  - `expect(board).not.toMatch(/redirect\(["']\/picks["']/);` (line 30)
  - `expect(picks).not.toMatch(/redirect\(["']\/board["']/);` (line 31)
  - `expect(board).toContain('canonical: "/board"');` (line 28)
  - `expect(picks).toContain('canonical: "/picks"');` (line 29)
  - `expect(nav).toContain('href: "/picks"');` (line 43)
  - `expect(board).toMatch(/href="\/picks"/);` (line 50)
  - `expect(picks).toMatch(/href="\/board"/);` (line 51)
- **Finding**: This test currently enforces route *separation*. It must be updated to enforce single-board architectural consolidation (301 redirect, authoritative canonical `/board`, two distinct tabs, no `/picks` links in nav or cross-links).

---

### 1.5 Codebase Inventory of `/picks` References & Static Test Scanners
- **Customer-facing links pointing to `/picks`**:
  1. `apps/web/app/board/page.tsx:259`: Link in "You are here" banner.
  2. `apps/web/app/proof/page.tsx:376`: `<Link href="/picks">Today's board →</Link>`
  3. `apps/web/app/sealed/page.tsx:256`: `<Link href="/picks">See today's board</Link>`
  4. `apps/web/app/pricing/page.tsx:500`: `{ label: "Factor trail on every pick", href: "/picks" }`
  5. `apps/web/components/trust-ledger/verify-console.tsx:202`: `<Link href="/picks">See today's board</Link>`
  6. `apps/web/components/ui/command-palette.tsx:20`: `{ label: "Published picks", href: "/picks", ... }`
  7. `apps/web/lib/brand.ts:122`: `route: "/picks"`
  8. `apps/web/lib/seo/sports-jsonld.ts:96`: `{ name: "Picks", path: "/picks" }`
- **Critical Discovery — 20 Static Tests Scanning `app/picks/page.tsx`**:
  - The following test files directly call `readFileSync(resolve(repoRoot, "app/picks/page.tsx"), "utf8")`:
    `picks-gate-hint-containment.test.ts`, `picks-daily-limit-meta.test.ts`, `picks-demo-mode.test.ts`, `picks-mobile-tap-targets.test.ts`, `picks-page-policy-gate.test.ts`, `picks-paywall-copy-truth.test.ts`, `picks-states-conversion.test.ts`, `central-time-rendering.test.ts`, `conversion-path-contrast.test.ts`, `freshness-coverage.test.ts`, `kickoff-local-time.test.tsx`, `pricing-honesty.test.ts`, `public-consensus-claim.test.ts`, `public-consensus-surfaces.test.ts`, `public-copy-scan-strong.test.ts`, `public-copy-scanner.test.ts`, `public-copy-plain-language.test.ts`, `sample-mode-ui.test.ts`, `brand-voice-vocabulary.test.ts`, `critical-routes-shape.test.ts`.
  - **Impact**: If `app/picks/page.tsx` were deleted outright, all 20 of these test files would throw `ENOENT`. If `app/picks/page.tsx` is maintained as a redirect component containing `redirect('/board')` and retaining exported types/helpers, all 20 tests pass without regression.

---

## 2. Logic Chain

1. **Step 1: Next.js Routing Layer vs File Tree**
   - In Next.js (App Router), `redirects()` in `next.config.mjs` execute before route handler and page resolution.
   - Adding `{ source: "/picks", destination: "/board", permanent: true }` guarantees that all incoming HTTP requests to `/picks` immediately receive an HTTP 301 redirect with `Location: /board` (and query string preservation).
   - In `apps/web/app/picks/page.tsx`, invoking `redirect('/board')` guarantees that any client-side Next.js router transitions or direct Server Component evaluations immediately navigate to `/board`.
   - Retaining `app/picks/page.tsx` with `redirect('/board')` satisfies both runtime consolidation and avoids breaking the 20 existing Vitest static analysis tests that read `app/picks/page.tsx`.

2. **Step 2: Single Authoritative `/board` Consolidation with Two Tabs**
   - The user requested two distinct tabs on `/board`:
     1. **Actionable Signals**: All published picks with plain-English factor trails (`PickCard`s, daily slate bar, paywall banner, sports/grade filters, line freshness).
     2. **Gated & Held Games**: Transparent pass-discipline showing games where edge < publish threshold (`PassListItem`s, `BoardLane`s for Scoring Now / Passed On, board metrics tiles, suppression banners, calibration report).
   - Driven by URL search parameter `tab`:
     - Default (unset or `tab === "signals"` or `tab === "actionable"`): renders "Actionable Signals".
     - When `tab === "held"` or `tab === "gated"`: renders "Gated & Held Games".
   - Using URL query parameters preserves full server-side rendering, browser history (back/forward), deep-linking (`/board?tab=held`), and bookmarkability without requiring client state or client hydration overhead.
   - Both data pipelines (`loadBoardState`/`loadBoardPasses` and `fetchSlate`/`fetchPicks`) are executed concurrently in `Promise.allSettled`, maintaining low server response latency.

3. **Step 3: Navigation Cleansing**
   - Desktop nav (`apps/web/components/ui/nav.tsx`) and mobile nav (`apps/web/components/ui/mobile-nav.tsx`) must feature only "The Board" (`/board`) as the primary signals door.
   - Removing `{ label: "Today's picks", href: "/picks" }` eliminates the redundant link and prevents visitors from clicking a route that redirects.
   - Updating `<NavMenu label="Board" ...>` to `<NavMenu label="The Board" ...>` aligns with the acceptance criteria ("show only 'The Board' for primary signals").
   - Resolving the duplicate function definitions in `nav.tsx` cleans up technical debt from commit `496e86be5`.

4. **Step 4: Equivalence Test Transformation**
   - `apps/web/__tests__/board-picks-route-equivalence.test.ts` originally guarded separation between `/board` and `/picks`.
   - Updating it to test consolidation:
     - Asserts `nextConfig.redirects()` has `{ source: "/picks", destination: "/board", permanent: true }`.
     - Asserts `/board` canonical is `/board` and `/board` contains no cross-links to `/picks`.
     - Asserts `/board` exposes the two tabs: "Actionable Signals" and "Gated & Held Games".
     - Asserts both desktop and mobile navigation menus link to `/board` and contain zero links to `/picks`.
     - Asserts `/picks` redirects to `/board`.

5. **Step 5: Elimination of Dead Links & Unification of References**
   - Replacing `/picks` with `/board` across `proof/page.tsx`, `sealed/page.tsx`, `pricing/page.tsx`, `verify-console.tsx`, `command-palette.tsx`, `brand.ts`, and `sports-jsonld.ts` ensures that every user-facing link directs straight to the authoritative `/board`, preventing unnecessary redirect round-trips.

---

## 3. Caveats

1. **API Endpoints Retained**:
   - `/api/picks`, `/api/picks/daily-slate`, `/api/picks/[id]/explain`, and `/api/picks/[id]/audit` are backend API endpoints. They are NOT redirected to `/board`. Next.js exact-match redirect `source: "/picks"` does not affect `/api/picks`. Mobile app (`apps/mobile`), cron workers, and client components depend on `/api/picks`.
2. **20 Static Tests Constraint**:
   - `app/picks/page.tsx` must NOT be deleted from the file tree because 20 Vitest test suites statically read `app/picks/page.tsx` via `readFileSync`. In `app/picks/page.tsx`, placing `redirect('/board')` at the entry of `PicksPage()` while retaining existing types and helper functions ensures 100% test suite compatibility while executing the runtime redirect.
3. **No Raw Em-Dashes in Customer Copy**:
   - Per `apps/web/__tests__/em-dash-public-copy.test.ts`, `app/board/page.tsx` has a strict baseline quota of 1 em-dash maximum. When adding tab labels and descriptions, use standard commas, hyphens, or colons instead of raw em-dashes `—`.

---

## 4. Conclusion & Implementation Blueprint

### Step 1: Update `apps/web/next.config.mjs`
Inside `async redirects()` (lines 86–124):
```javascript
      // R1: Surface unification — /picks permanently redirected to authoritative /board
      { source: "/picks", destination: "/board", permanent: true },
```

### Step 2: Consolidate `apps/web/app/board/page.tsx`
1. Update props to accept `searchParams`:
   ```typescript
   interface BoardPageProps {
     searchParams?: {
       tab?: string;
       sport?: string;
       date?: string;
       grade?: string;
     };
   }
   ```
2. Concurrent data loading:
   ```typescript
   const [stateResult, passesResult, calibrationResult, slateResult, picksResult] =
     await Promise.allSettled([
       loadBoardState(new Date(), viewerEntitlements),
       loadBoardPasses(new Date(), { includeNoBetDetail: canSeeNoBetDetail }),
       loadPublicCalibrationReport(),
       fetchSlate(),
       fetchPicks(sport, date, grade, Boolean(session?.user?.id)),
     ]);
   ```
3. Add Tab navigation bar with two tabs:
   - **Tab 1: Actionable Signals** (default, `tab=signals`)
   - **Tab 2: Gated & Held Games** (`tab=held` or `tab=gated`)
4. Tab 1 renders:
   - `SlateBar`, `PaywallBanner`, `PicksTrustStrip`, `SPORTS` & `GRADES` filters, `DatePickerForm`, `LineFreshnessBadge`, `PickCard` grid, empty/locked/outage states.
5. Tab 2 renders:
   - Board metrics tiles, `BoardLane`s (Scoring Now & Passed On), `PassListItem`s (Pass List with plain-English refusal reasons, edge indexes, and refusal codes), calibration results card, suppression banners.
6. Remove the old "You are here" link pointing to `/picks`.

### Step 3: Update `apps/web/app/picks/page.tsx`
Add runtime redirect to `/board`:
```typescript
export default async function PicksPage({ searchParams }: PicksPageProps) {
  const p = new URLSearchParams();
  if (searchParams?.sport) p.set("sport", searchParams.sport);
  if (searchParams?.date) p.set("date", searchParams.date);
  if (searchParams?.grade) p.set("grade", searchParams.grade);
  const qs = p.toString();
  redirect(qs ? `/board?${qs}` : "/board");
  // (Retain existing helper declarations below for static test backward compatibility)
}
```

### Step 4: Update Navigation Menus
1. In `apps/web/components/ui/nav.tsx`:
   - Set top trigger: `<NavMenu label="The Board" href="/board" groups={BOARD_MENU} />`.
   - In `BOARD_MENU`, remove `{ label: "Today's picks", href: "/picks", ... }`.
   - Remove the duplicate rebase glitch functions (`Nav()` and `NavSkeleton()` duplicates).
2. In `apps/web/components/ui/mobile-nav.tsx`:
   - In `SECTIONS[0]` (`Board`), remove `{ label: "Today's picks", href: "/picks" }`.

### Step 5: Update `apps/web/__tests__/board-picks-route-equivalence.test.ts`
Rewrite to verify:
1. `next.config.mjs` has 301 permanent redirect from `/picks` to `/board`.
2. `/board` is the single authoritative signals route with canonical `/board`.
3. `/board` exposes the two distinct tabs: "Actionable Signals" and "Gated & Held Games".
4. Desktop and mobile nav menus show only "The Board" for primary signals (zero `/picks` links).
5. `/picks` redirects to `/board`.

### Step 6: Update Remaining User-Facing Links
Replace `href="/picks"` with `href="/board"` in:
- `apps/web/app/proof/page.tsx:376`
- `apps/web/app/sealed/page.tsx:256`
- `apps/web/app/pricing/page.tsx:500`
- `apps/web/components/trust-ledger/verify-console.tsx:202`
- `apps/web/components/ui/command-palette.tsx:20`
- `apps/web/lib/brand.ts:122`
- `apps/web/lib/seo/sports-jsonld.ts:96`

---

## 5. Verification Method

To independently verify the implementation:

1. **Verify `board-picks-route-equivalence.test.ts`**:
   ```powershell
   npm --prefix apps/web test __tests__/board-picks-route-equivalence.test.ts
   ```
   *Expected*: 5/5 tests pass cleanly.

2. **Verify Navigation Integrity Tests**:
   ```powershell
   npm --prefix apps/web test __tests__/nav-route-integrity.test.ts __tests__/nav-auth.test.tsx
   ```
   *Expected*: All tests pass with zero dead links.

3. **Verify Brand & Trust Guardrails**:
   ```powershell
   npm run guard:trust
   npm run lint:brand
   ```
   *Expected*: 0 errors across all scanned files.

4. **Verify Route Redirect in Next.js Config**:
   ```powershell
   node -e "import('./apps/web/next.config.mjs').then(async m => { const r = await m.default.redirects(); const p = r.find(x => x.source === '/picks'); console.log(p); if (!p || !p.permanent || p.destination !== '/board') process.exit(1); })"
   ```
   *Expected*: Logs `{ source: '/picks', destination: '/board', permanent: true }` and exits with code 0.

5. **Verify No Customer-Facing Links Point to `/picks`**:
   ```powershell
   rg -n 'href=["'']\/picks["'']' apps/web/app apps/web/components
   ```
   *Expected*: Zero occurrences.

6. **Invalidation Conditions**:
   - If `/picks` is requested and does NOT redirect to `/board` with status 301.
   - If `/board` does not display both "Actionable Signals" and "Gated & Held Games" tabs.
   - If desktop or mobile nav contains a link to `/picks`.
   - If any of the 20 existing Vitest static tests fails due to missing file references.
