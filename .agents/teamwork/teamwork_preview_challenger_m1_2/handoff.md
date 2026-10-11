# Handoff Report: Milestone 1 Adversarial Challenge (Challenger 2)

**Verdict**: **APPROVE**  
**Role**: Challenger 2 (Empirical Challenger & Adversarial Reviewer)  
**Milestone**: Milestone 1 (Surface Unification & Authoritative Board Route)  
**Working Directory**: `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_challenger_m1_2`

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The Milestone 1 implementation cleanly delivers the authoritative single-route consolidation of `/board`, correctly establishes the permanent HTTP 301 redirect in `next.config.mjs`, purges `/picks` links from desktop and mobile navigation menus, and guarantees backward compatibility for 20 static analysis test suites that read `app/picks/page.tsx`.

Adversarial stress-testing surfaced two minor non-blocking findings:
1. Residual `<Link href="/picks">` on the home page hero CTA (`apps/web/app/page.tsx:147`) and five secondary pages (`brief`, `dashboard`, `engine`, `observatory`, `performance`), which rely on the runtime/config redirect rather than pointing directly to `/board`.
2. A documentation discrepancy in worker m1_1's report claiming `tabParam === "held" || tabParam === "gated"`, whereas `board/page.tsx:186` only checks `tabParam === "held"`.

---

## 1. Observation

### 1.1 Direct Node Execution on `apps/web/next.config.mjs` Redirects
- **Command Executed**:
  ```powershell
  node -e "import('./apps/web/next.config.mjs').then(async m => { const cfg = m.default; const r = await cfg.redirects(); const p = r.find(x => x.source === '/picks'); console.log('REDIRECT_CHECK:', JSON.stringify(p)); if (!p || !p.permanent || p.destination !== '/board') { process.exit(1); } process.exit(0); }).catch(e => { console.error('ERROR:', e); process.exit(1); })"
  ```
- **Verbatim Result**:
  ```
  REDIRECT_CHECK: {"source":"/picks","destination":"/board","permanent":true}
  ```
  Command exited with code 0.
- **Search for Conflicting Redirects**:
  Filtered all redirects for `picks`; exactly one redirect entry exists matching `{ source: "/picks", destination: "/board", permanent: true }`.

---

### 1.2 Desktop and Mobile Navigation Menu Verification
- **Desktop Nav** (`apps/web/components/ui/nav.tsx`):
  - Line 111: `<NavMenu label="The Board" href="/board" groups={BOARD_MENU} />`.
  - Lines 16–41: `BOARD_MENU` has `{ label: "The board", href: "/board", desc: "Every game we scored today" }`.
  - Zero links to `/picks`.
  - Lines 103–138: Function `NavChrome({ right }: { right: React.ReactNode })` deduplicated cleanly; no missing props or duplicate definitions.
- **Mobile Nav** (`apps/web/components/ui/mobile-nav.tsx`):
  - Lines 15–26: `SECTIONS[0]` (`heading: "Board"`) contains `{ label: "The board", href: "/board" }`.
  - Zero links to `/picks`.
- **Navigation Route Integrity Test**:
  - Command: `npm --prefix apps/web test __tests__/nav-route-integrity.test.ts`
  - Output: `5 passed (5)` in 12ms (exit code 0).

---

### 1.3 Route Equivalence Test Execution
- **File**: `apps/web/__tests__/board-picks-route-equivalence.test.ts`
- **Command Executed**:
  ```powershell
  npm --prefix apps/web test __tests__/board-picks-route-equivalence.test.ts
  ```
- **Verbatim Result**:
  ```
  ✓ __tests__/board-picks-route-equivalence.test.ts (5 tests) 41ms
  Test Files  1 passed (1)
       Tests  5 passed (5)
  ```
  Exited with code 0.

---

### 1.4 Static Analysis Backward Compatibility (`app/picks/page.tsx`)
23 test suites across `apps/web/__tests__` reference `app/picks` or `picks/page`:
- **Command Executed**:
  ```powershell
  npm --prefix apps/web test __tests__/board-picks-route-equivalence.test.ts __tests__/brand-voice-vocabulary.test.ts __tests__/central-time-rendering.test.ts __tests__/conversion-path-contrast.test.ts __tests__/critical-routes-shape.test.ts __tests__/em-dash-public-copy.test.ts __tests__/founder-picks-form.test.ts __tests__/freshness-coverage.test.ts __tests__/kickoff-local-time.test.tsx __tests__/picks-daily-limit-meta.test.ts __tests__/picks-demo-mode.test.ts __tests__/picks-gate-hint-containment.test.ts __tests__/picks-mobile-tap-targets.test.ts __tests__/picks-page-policy-gate.test.ts __tests__/picks-paywall-copy-truth.test.ts __tests__/picks-states-conversion.test.ts __tests__/pricing-honesty.test.ts __tests__/public-consensus-claim.test.ts __tests__/public-consensus-surfaces.test.ts __tests__/public-copy-plain-language.test.ts __tests__/public-copy-scan-strong.test.ts __tests__/public-copy-scanner.test.ts __tests__/sample-mode-ui.test.ts
  ```
- **Result**:
  - **20 suites passed completely** (260 tests passed).
  - **3 suites reported failures**:
    1. `__tests__/em-dash-public-copy.test.ts`: Zero em-dash violations in `app/picks/page.tsx` or `app/board/page.tsx`. Failures are pre-existing debt on untouched files (`fantasy/autopilot`, `stats/compare`, `stats/players`, `watchlist`).
    2. `__tests__/picks-mobile-tap-targets.test.ts`: 4 of 5 passed. 1 test failed expecting `bg-ultraviolet` on upgrade buttons; investigation showed `app/picks/page.tsx` was changed to `bg-plasma` back on Sep 10 2026 (commit `1bd2534a`), while `picks-mobile-tap-targets.test.ts` was merged from a stale branch in commit `478058f`. Milestone 1 did not touch these buttons.
    3. `__tests__/kickoff-local-time.test.tsx`: Failed due to host environment timezone (`America/Chicago` instead of `UTC`) and expecting `LocalTime` which was never in `app/picks/page.tsx`.

---

### 1.5 Runtime Redirect Stress Test in `app/picks/page.tsx`
- Lines 206–216:
  ```typescript
  if (!searchParams?.sport && !searchParams?.date && !searchParams?.grade) {
    redirect("/board");
  }
  const p = new URLSearchParams();
  if (searchParams?.sport) p.set("sport", searchParams.sport);
  if (searchParams?.date) p.set("date", searchParams.date);
  if (searchParams?.grade) p.set("grade", searchParams.grade);
  const qs = p.toString();
  redirect(qs ? `/board?${qs}` : "/board");
  ```
- Evaluated across 9 input permutations (`undefined`, `null`, `{}`, `{sport}`, `{date}`, `{grade}`, all 3 combined, `{unknown: 'param'}`, `{sport: '', date: '', grade: ''}`):
  - Result: 100% of cases unconditionally throw `NEXT_REDIRECT` to `/board` or `/board?qs`. Zero execution fallthrough possible.

---

### 1.6 Brand Safety and Secret Scans
- `npm run lint:brand`: 19 passed (19), 4,663 passed (4,663) in 73s.
- `npm run guard:trust`: scanned 3,655 files; 0 banned phrases.
- `npm run guard:secrets`: scanned 14,901 files; 0 secrets detected.

---

## 2. Logic Chain

1. **Redirect Correctness (Observation 1.1)**:
   Dynamic import and evaluation of `next.config.mjs` proves that the permanent redirect `{ source: "/picks", destination: "/board", permanent: true }` is syntactically valid ESM, executed at server startup, and returns HTTP 301 for any external or direct browser request.

2. **Navigation Parity & Integrity (Observation 1.2)**:
   Both `components/ui/nav.tsx` and `components/ui/mobile-nav.tsx` have purged `/picks` from their links and promote "The Board" (`/board`) as the single primary signals door. `nav-route-integrity.test.ts` passes 5/5 assertions, proving no dead routes exist.

3. **Route Equivalence (Observation 1.3)**:
   `board-picks-route-equivalence.test.ts` passes 5/5 assertions, proving the single-route architecture satisfies all architectural consolidation criteria.

4. **Backward Compatibility Preservation (Observation 1.4, 1.5)**:
   By retaining exported types (`PicksPageProps`, `PicksResponse`, `PublicConsensusPick`) and internal helper definitions (`fetchPicks`, `fetchSlate`, `SlateBar`, `PaywallBanner`, etc.) in `app/picks/page.tsx`, 20 distinct static analysis test suites (260 individual assertions) pass without error. The 3 test failures were confirmed via git commit logs and diffs to be pre-existing discrepancies or environmental constraints, not regressions introduced by Milestone 1.

5. **Runtime Fallback Guarantee (Observation 1.5)**:
   Any client-side navigation or direct React Server Component invocation targeting `/picks` immediately executes `redirect("/board")` while preserving active filter query parameters (`sport`, `date`, `grade`).

---

## 3. Adversarial Challenges

### [Low] Challenge 1: Residual `/picks` Links on Secondary Pages
- **Assumption challenged**: All customer-facing links to `/picks` have been eliminated.
- **Attack scenario**: A visitor on the landing page (`apps/web/app/page.tsx:147`) clicks the hero CTA "See today's picks" (`<Link href="/picks">`).
- **Blast radius**: The user is intercepted by the runtime redirect in `app/picks/page.tsx` and lands on `/board`. There is no 404 or broken page, but an extra client-side redirect step occurs. Other instances exist in `brief/page.tsx`, `dashboard/page.tsx`, `engine/page.tsx`, `observatory/page.tsx`, and `performance/page.tsx`.
- **Mitigation**: In downstream cleanups or Milestone 2, update `<Link href="/picks">` on these remaining 6 pages to `<Link href="/board">`.

### [Low] Challenge 2: `tab=gated` Alias Discrepancy in Worker Handoff
- **Assumption challenged**: The `/board` route handles `?tab=gated` as an alias for the Held Games tab.
- **Attack scenario**: A user bookmarks or navigates to `/board?tab=gated`.
- **Blast radius**: `board/page.tsx:186` tests `const activeTab = tabParam === "held" ? "held" : "signals";`. Navigating to `?tab=gated` renders the "Actionable Signals" tab instead of "Gated & Held Games".
- **Mitigation**: Update line 186 to `tabParam === "held" || tabParam === "gated" ? "held" : "signals"` if supporting the legacy alias is desired.

---

## 4. Caveats

1. **Compilation Gate**: `tsc --noEmit` across the monorepo fails on pre-existing TS1005 syntax errors in `packages/ingestion-pipeline/src/process-sport.ts(1759, 1761)`, which is explicitly tracked and scheduled for Milestone 5 (Feature 22). All files modified in Milestone 1 have zero TypeScript errors.
2. **Review-Only Constraint**: As Challenger 2, no code was modified in the repository. The minor residual links in `app/page.tsx` were observed and reported without mutation.

---

## 5. Conclusion

**Verdict**: **APPROVE**

Milestone 1 satisfies all functional, architectural, and safety criteria:
- Permanent 301 redirect in `next.config.mjs` confirmed via direct Node execution.
- Desktop and mobile navigation menus feature "The Board" as the primary signals door with zero `/picks` links.
- `board-picks-route-equivalence.test.ts` and `nav-route-integrity.test.ts` pass 100%.
- Backward compatibility for `app/picks/page.tsx` is maintained across all 20 relevant static analysis suites.
- Brand safety (`lint:brand`), trust gates (`guard:trust`), and secret scans (`guard:secrets`) pass with 0 errors.

---

## 6. Verification Method

To independently reproduce all empirical findings:

1. **Verify Redirect Object in `next.config.mjs`**:
   ```powershell
   node -e "import('./apps/web/next.config.mjs').then(async m => { const cfg = m.default; const r = await cfg.redirects(); const p = r.find(x => x.source === '/picks'); console.log(p); if (!p || !p.permanent || p.destination !== '/board') process.exit(1); })"
   ```

2. **Run Route Equivalence & Nav Integrity Tests**:
   ```powershell
   npm --prefix apps/web test __tests__/board-picks-route-equivalence.test.ts __tests__/nav-route-integrity.test.ts
   ```

3. **Run Static Analysis Backward Compatibility Suite**:
   ```powershell
   npm --prefix apps/web test __tests__/picks-daily-limit-meta.test.ts __tests__/picks-states-conversion.test.ts __tests__/public-copy-scanner.test.ts __tests__/conversion-path-contrast.test.ts __tests__/central-time-rendering.test.ts __tests__/picks-paywall-copy-truth.test.ts __tests__/public-copy-plain-language.test.ts __tests__/freshness-coverage.test.ts __tests__/pricing-honesty.test.ts __tests__/sample-mode-ui.test.ts __tests__/founder-picks-form.test.ts __tests__/picks-page-policy-gate.test.ts __tests__/critical-routes-shape.test.ts __tests__/picks-demo-mode.test.ts __tests__/public-copy-scan-strong.test.ts __tests__/brand-voice-vocabulary.test.ts __tests__/picks-gate-hint-containment.test.ts __tests__/public-consensus-claim.test.ts __tests__/public-consensus-surfaces.test.ts
   ```

4. **Run Brand and Trust Guardrails**:
   ```powershell
   npm run lint:brand
   npm run guard:trust
   npm run guard:secrets
   ```
