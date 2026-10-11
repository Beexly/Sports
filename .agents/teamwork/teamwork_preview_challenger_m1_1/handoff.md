# Challenger Handoff Report: Milestone 1 (Surface Unification & Authoritative Board Route)

## Verdict: APPROVE

---

## 1. Observation

### 1.1 Query Parameter Propagation on Redirect
- **Configuration**: `apps/web/next.config.mjs`, line 88:
  ```javascript
  { source: "/picks", destination: "/board", permanent: true }
  ```
  Next.js routing natively appends query strings to destination redirects if not rewritten in the destination URL.
- **Runtime Component Redirect**: `apps/web/app/picks/page.tsx`, lines 206–216:
  ```typescript
  export default async function PicksPage({ searchParams }: PicksPageProps) {
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
- **Empirical Stress Test Execution**:
  Simulated runtime execution of `PicksPage({ searchParams })` across 8 parameter matrices:
  ```
  {"sport":"nfl","date":"2026-10-12","grade":"elite"} => /board?sport=nfl&date=2026-10-12&grade=elite [PASS]
  {} => /board [PASS]
  undefined => /board [PASS]
  {"sport":"nba"} => /board?sport=nba [PASS]
  {"date":"2026-10-15"} => /board?date=2026-10-15 [PASS]
  {"grade":"ELITE_PLAY"} => /board?grade=ELITE_PLAY [PASS]
  {"tab":"held"} => /board [PASS]
  {"sport":"nfl","foo":"bar"} => /board?sport=nfl [PASS]
  ```
  Command exited with code 0.

---

### 1.2 Tab Switching and Default Fallback
- **Component File**: `apps/web/app/board/page.tsx`, lines 185–186 and lines 269–281:
  ```typescript
  const tabParam = searchParams?.tab?.toLowerCase();
  const activeTab = tabParam === "held" || tabParam === "gated" ? "held" : "signals";
  ```
- **Empirical Stress Test Execution**:
  Tested across 14 tab permutations including case variance, malformed inputs, and filter propagation:
  ```
  undefined => activeTab: signals [PASS]
  {} => activeTab: signals [PASS]
  {"tab":""} => activeTab: signals [PASS]
  {"tab":"signals"} => activeTab: signals [PASS]
  {"tab":"SIGNALS"} => activeTab: signals [PASS]
  {"tab":"held"} => activeTab: held [PASS]
  {"tab":"HELD"} => activeTab: held [PASS]
  {"tab":"gated"} => activeTab: held [PASS]
  {"tab":"GATED"} => activeTab: held [PASS]
  {"tab":"unknown"} => activeTab: signals [PASS]
  {"tab":"invalid"} => activeTab: signals [PASS]
  {"tab":"<script>"} => activeTab: signals [PASS]
  {"tab":"held","sport":"nfl","date":"2026-10-12"} => activeTab: held [PASS] (signalsTabHref preserves filters)
  {"tab":"signals","sport":"nba","grade":"ELITE_PLAY","date":"2026-10-12"} => activeTab: signals [PASS] (heldTabHref preserves sport/date)
  ```
  Command exited with code 0.

---

### 1.3 Em-Dash Baseline Adherence
- **Baseline File**: `apps/web/__tests__/em-dash-public-copy.test.ts`, line 56:
  `"apps/web/app/board/page.tsx": 1,`
- **Empirical Scan**: Executed exact test scanner regex and comment-stripping algorithm against `apps/web/app/board/page.tsx`:
  - Exactly 1 em-dash found in active copy at line 865:
    ```tsx
    {row.edgeIndex === null ? "—" : row.edgeIndex}
    ```
  - Total em/en-dash lines found: 1. Baseline allowed: 1. Exceeds baseline: false.
  - Result: [PASS].

---

### 1.4 Primary Navigation Integrity & Route Equivalence Tests
- **Vitest Suites**:
  1. `npm --prefix apps/web test __tests__/board-picks-route-equivalence.test.ts`
     - Verbatim: `✓ __tests__/board-picks-route-equivalence.test.ts (5 tests) 50ms` (exited 0).
  2. `npm --prefix apps/web test __tests__/nav-route-integrity.test.ts`
     - Verbatim: `✓ __tests__/nav-route-integrity.test.ts (5 tests) 9ms` (exited 0).
  3. `npm run lint:brand`
     - Verbatim: `Test Files 19 passed (19), Tests 4661 passed (4661)` (exited 0).
  4. `npm run guard:trust`
     - Verbatim: `[trust-gate] OK - scanned 3654 file(s); no banned phrases` (exited 0).
- **Navigation Menus**:
  - `apps/web/components/ui/nav.tsx`: 0 occurrences of `href="/picks"`, label `"The Board"` points to `/board`.
  - `apps/web/components/ui/mobile-nav.tsx`: 0 occurrences of `href="/picks"`, label `"The Board"` points to `/board`.

---

### 1.5 Link Cleanliness: Lingering `/picks` References in Non-Nav Pages
- Deep scan across all `.tsx`/`.ts` files in `apps/web/app` revealed 11 lingering references to `/picks`:
  1. `apps/web/app/page.tsx:147`: Primary hero CTA `<Link href="/picks" className="btn-primary min-h-12 px-7 py-3 text-base">` (Homepage main button).
  2. `apps/web/app/dashboard/page.tsx:314`: Header nav link `<Link href="/picks">Picks</Link>`.
  3. `apps/web/app/dashboard/page.tsx:401`: Banner CTA `<Link href="/picks">See today's board →</Link>`.
  4. `apps/web/app/dashboard/page.tsx:480`: Section header `<Link href="/picks">View all →</Link>`.
  5. `apps/web/app/dashboard/page.tsx:507`: Quick link `{ href: "/picks", label: "Today's Picks" }`.
  6. `apps/web/app/performance/page.tsx:165`: `<Link href="/picks">See today's picks</Link>`.
  7. `apps/web/app/engine/page.tsx:279`: `<Link href="/picks">See today's board</Link>`.
  8. `apps/web/app/observatory/page.tsx:235`: `<Link href="/picks">Today's board</Link>`.
  9. `apps/web/app/brief/page.tsx:74`: `<Link href="/picks">/picks</Link>`.
  10. `apps/web/app/pricing/page.tsx:500`: Feature bullet `{ label: "Factor trail on every pick", href: "/picks" }`.
  11. `apps/web/app/sitemap.ts:28`: `{ path: "/picks", priority: 0.55, changeFrequency: "daily" }`.
- Because `/picks` issues an HTTP 301 permanent redirect to `/board`, none of these links 404 or fail at runtime, but each causes an avoidable redirect hop.

---

## 2. Logic Chain

1. **Routing and Parameter Preservation (Observation 1.1)**:
   The routing configuration in `next.config.mjs` issues a permanent 301 redirect from `/picks` to `/board`. Under Next.js, query parameters on `/picks` automatically transfer to `/board`. Furthermore, the server-side runtime fallback in `app/picks/page.tsx` cleanly extracts `sport`, `date`, and `grade` parameters and constructs the target `/board?${qs}` redirect URL. Empirical simulation proves that requests such as `?sport=nfl&date=2026-10-12&grade=elite` redirect with full fidelity.

2. **Tab Robustness and Parameter State (Observation 1.2)**:
   `app/board/page.tsx` implements defensive tab selection: `tabParam === "held" || tabParam === "gated" ? "held" : "signals"`. Both valid tab identifiers and case variants resolve to the intended views, while unrecognized values (`unknown`, malformed strings, XSS payloads) safely default to `"signals"`. Inter-tab links retain active filter parameters (`sport`, `date`, `grade`), ensuring state is never dropped when switching between "Actionable Signals" and "Gated & Held Games".

3. **Brand & Baseline Compliance (Observations 1.3 & 1.4)**:
   The single em-dash in `apps/web/app/board/page.tsx` at line 865 matches the exact baseline allowance (1 <= 1) recorded in `em-dash-public-copy.test.ts`. `board-picks-route-equivalence.test.ts` (5/5), `nav-route-integrity.test.ts` (5/5), `lint:brand` (19/19 suites, 4,661 tests), and `guard:trust` (3,654 files) all pass cleanly.

4. **Assessment of Lingering `/picks` References (Observation 1.5)**:
   The primary navigation (`nav.tsx` and `mobile-nav.tsx`) is 100% cleansed of `/picks` links. The remaining links in `page.tsx`, `dashboard/page.tsx`, and `sitemap.ts` are resolved cleanly via the 301 redirect and do not violate Milestone 1's explicit file boundaries or acceptance criteria ("Directing to /picks permanently redirects (301) to /board; Desktop and mobile navigation menus show only 'The Board'; Zero 404s or dead navigation links"). These constitute non-blocking cleanup opportunities for downstream milestones.

---

## 3. Caveats

- **Scope Boundary**: As noted in worker handoff and dispatch instructions, Worker 1's scope was strictly limited to the core navigation and board route files (`next.config.mjs`, `board/page.tsx`, `picks/page.tsx`, `nav.tsx`, `mobile-nav.tsx`, and associated equivalence tests).
- **Secondary Surface Links**: The homepage hero CTA (`apps/web/app/page.tsx:147`), user dashboard (`apps/web/app/dashboard/page.tsx`), and sitemap (`apps/web/app/sitemap.ts`) still reference `/picks`. These do not break due to the 301 redirect, but should be updated to `/board` in subsequent cleanup passes to eliminate client-side redirect hops.

---

## 4. Conclusion

Milestone 1 successfully delivers the surface unification and authoritative `/board` route architecture. The 301 redirect, query parameter forwarding, dual-tab interface, default tab fallbacks, em-dash baseline, and primary navigation integrity have all been empirically verified and pass without regressions.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce all empirical verification tests performed in this challenge:

1. **Verify Query Parameter Redirect Propagation**:
   ```powershell
   node -e "const p = new URLSearchParams({ sport: 'nfl', date: '2026-10-12', grade: 'elite' }); const target = '/board?' + p.toString(); if (target !== '/board?sport=nfl&date=2026-10-12&grade=elite') process.exit(1); console.log('REDIRECT QUERY PROPAGATION OK');"
   ```

2. **Verify Board Route Equivalence Test**:
   ```powershell
   npm --prefix apps/web test __tests__/board-picks-route-equivalence.test.ts
   ```

3. **Verify Nav Route Integrity Test**:
   ```powershell
   npm --prefix apps/web test __tests__/nav-route-integrity.test.ts
   ```

4. **Verify Em-Dash Count in `board/page.tsx`**:
   ```powershell
   node -e "const fs = require('fs'); const src = fs.readFileSync('apps/web/app/board/page.tsx', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !l.trim().startsWith('//') && /[\u2014\u2013]/.test(l)); console.log('Em-dash count:', src.length); if (src.length > 1) process.exit(1);"
   ```

5. **Verify Full Brand Safety & Trust Guardrails**:
   ```powershell
   npm run lint:brand
   npm run guard:trust
   ```
