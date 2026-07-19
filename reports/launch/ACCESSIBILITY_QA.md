# Galaxy Sports Edge — Accessibility / Responsive QA Pass

**Generated:** 2026-07-19 01:30 UTC

Closes the one remaining agent-buildable gap from LC-008's `RELEASE_ACCEPTANCE.md`
("Accessibility/responsive QA... not re-run fresh this pass"). Real browser (Chromium via
Playwright, pre-installed) against a genuine `npm run build` + `next start` of this branch —
not source-regex, not jsdom.

## Method

Built the app for production (`npm run build --workspace=apps/web`), served it locally
(`next start`), and drove headless Chromium against nine representative pages: `/`, `/pricing`,
`/tools`, `/watchlist`, `/sealed`, `/how-we-make-money`, `/verify`, `/journal`, `/track`. For each
page: HTTP status, console errors, landmark presence (`main`/`nav`/`h1`), 12-step keyboard tab
walk, `prefers-reduced-motion: reduce` emulation (checked for a resulting page error), and a
375px-viewport horizontal-overflow check (`document.documentElement.scrollWidth` vs.
`clientWidth`).

## Finding: real, confirmed, and fixed — CSS Grid `min-width: auto` overflow

**The bug:** `/sealed`'s "Live re-fold" / "Offline recompute" cards and `/glass-ledger`'s
"Independently re-computable" card sit inside a `grid sm:grid-cols-*` layout, each containing a
`<code>` block with `whitespace-pre` (deliberate — these are shell commands, which should not be
broken mid-word) and `overflow-x-auto` (a horizontal scrollbar once the box's own size is
determined). CSS Grid items default to `min-width: auto`, not `0` — so the *unbreakable* command
string forced the card's intrinsic minimum width past the viewport on mobile, and the whole page
scrolled horizontally, even though the `<code>` element's own `overflow-x-auto` looks like it
should have contained it. This is a well-known CSS Grid gotcha (the box's min-content size
propagates to the grid track before `overflow-x-auto` has anything to act on).

**Confirmed real via live 375px-viewport measurement, pre-fix:**
- `/sealed`: `scrollWidth 469` vs `clientWidth 375` (94px overflow)
- `/glass-ledger`: `scrollWidth 460` vs `clientWidth 375` (85px overflow)

**Fix:** added `min-w-0` to the grid-item container in both files —
`apps/web/app/sealed/page.tsx` (two cards) and `apps/web/app/glass-ledger/page.tsx` (one
article). This is the standard, minimal fix for this exact pattern; it does not change the
`<code>` block's own deliberate no-wrap/scroll behavior.

**Confirmed fixed via a second live 375px-viewport measurement, post-fix, against a genuinely
fresh production build and server (a stale `next start` process from earlier in this pass served
cached old output for one verification round and produced a false negative — caught by comparing
the served HTML's class list directly against the compiled bundle, then killing the stale process
and re-verifying against a confirmed-fresh one):**
- `/sealed`: `scrollWidth 375` vs `clientWidth 375` — clean.
- `/glass-ledger`: `scrollWidth 375` vs `clientWidth 375` — clean.

**Regression tests added** (real React rendering via `@testing-library/react`, asserting
`min-w-0` is present on the actual rendered grid-item element, not just in the source string):
`apps/web/__tests__/sealed-slate-page.test.tsx` (+1 test), `apps/web/__tests__/glass-ledger-page.test.tsx`
(+1 test). A repo-wide grep for the same `whitespace-pre"` pattern confirmed these are the only
two occurrences — not a wider sweep needed.

## Other pages checked, no defect found

| Page | Landmarks (main/nav/h1) | Keyboard (12-tab walk reached focusable elements) | Reduced motion | 375px overflow |
|---|---|---|---|---|
| `/pricing` | 1/1/1 | 12/12 | no page error | none |
| `/watchlist` | 1/1/1 | 12/12 | no page error | none |
| `/how-we-make-money` | 1/1/1 | 12/12 | no page error | not measured (browser crashed mid-check, see below) |
| `/verify` | 1/1/1 | 12/12 | no page error | none |
| `/journal` | 1/1/1 | 12/12 | no page error | none |

All five load with `main`/`nav`/`h1` landmarks present, complete a 12-step keyboard tab walk
without getting stuck, and raise no page error when `prefers-reduced-motion: reduce` is emulated.

## What's honestly NOT_TESTED

`/`, `/tools`, and `/track` could not be fully checked this pass: headless Chromium crashed
(`Target crashed`) partway through each, consistently correlated with Next.js's default `<Link>`
prefetch behavior aggressively prefetching dozens of on-page links simultaneously
(`net::ERR_INSUFFICIENT_RESOURCES` observed immediately before each crash) combined with this
sandbox's memory/`/dev/shm` constraints (already worked around once via
`--disable-dev-shm-usage`, `--no-sandbox`, `--js-flags=--max-old-space-size=512` for the pages
that did complete). All three DID return HTTP 200 and their `main`/`nav`/`h1` landmarks were
confirmed present before the crash on two of the three. This reads as a resource-constrained
*headless test environment* artifact — dense nav pages under real desktop/mobile Chrome have far
higher per-origin connection and memory headroom — not evidence of a real user-facing defect, but
it is recorded honestly as unverified rather than assumed clean.

No axe-core or other automated WCAG ruleset was run this pass (not an existing repo dependency;
the established convention here is source-level role/aria pinning tests, e.g.
`apps/web/__tests__/cockpit-a11y.test.ts`, `pick-card-a11y.test.ts`, `dashboard-stat-card-a11y.test.ts`).
Installing a new scanning dependency was out of scope for a QA verification pass — this is a
capability gap worth a founder/owner call if deeper WCAG rule coverage is wanted, not something
decided autonomously here.

## Verification

- New tests: `apps/web/__tests__/sealed-slate-page.test.tsx` (11 tests), `glass-ledger-page.test.tsx`
  (13 tests) — both fully green.
- `npx tsc --noEmit` (apps/web): clean.
- `npm run build --workspace=apps/web`: exit 0, full 214-page static/dynamic manifest emitted.
- Live Playwright re-measurement against the confirmed-fresh build/server: zero overflow on both
  previously-broken pages.
