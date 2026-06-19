# A++ Grade Report — front door + Phase-0/1/2 consolidation

**Branch:** `claude/compassionate-ramanujan-qqt5nb` · **Date:** 2026-06-18
**Method:** an independent critic panel (6 dimensions) graded the shipped front door
and consolidation; each below-A++ dimension got a second independent verifier before
any fix was made (workflow: `reports/consolidation/aplusplus-grade.workflow.js`).
Findings were then fixed and re-verified. The bar: **A++ = best-in-class, zero
blocking issues.**

---

## Round 1 — independent panel

| Dimension | Grade | Key finding |
|---|---|---|
| 10-second clarity | **below** (verified) | The `CinematicEntrance` cold-open is a fixed, scroll-locking modal that did not hand off to a clear front door until ~15.6s on first visit — so a *passive* first-timer never saw the hero or the three intent CTAs inside the locked 10-second window. Confirmed by code **and** the repo's own screenshot. |
| Copy — no AI-smell | A+ | Reads operator-written; zero banned template tells; "we're not AI" absent. Minor: hero paragraph is dense. |
| Visual — no AI-template | A | Coherent, intentional system — but the Tailwind `ink-400`/`ink-500` ramp kept WCAG-**failing** hexes (#5E6878 = 3.36:1, #3D4555 = 1.97:1) that the team's own `design-tokens.css` had already corrected. Minor: glow-token drift between the two sources. |
| Founder voice | A+ | "know it / review it / weight it / score it" maintained; quiet earned confidence; no hype drift. |
| Consolidation contract | A | The home "GSN" card and ⌘K palette still pointed at the retired `/gsn` (now a redirect) — a label/destination mismatch on a front-door surface; plus several internal links routed through redirect hops. |
| Accuracy-proof honesty | **A++** | Every performance claim gated + loader-backed; honest empty/gated states; no fabricated win-rate/ROI/percentage. |

## What was fixed (this session)

1. **10-second clarity (blocking).** Compressed the first-visit cold-open cadence so the
   handoff (identity + the three intent CTAs) lands at **≈7.6s**, comfortably inside the
   10-second window, with no click required (`cinematic-entrance.tsx`). Re-aligned the
   handoff CTAs to the **locked trio** — Enter today's board / See a sample read / Join
   the Founding Desk — replacing the old board/observatory/fantasy/the-beat row. Added a
   Playwright test that fails if a *passive* first visit doesn't surface all three intents
   within 10s.
2. **Visual a11y (major).** Re-valued Tailwind `ink-400`→`#9AA6B8` and `ink-500`→`#8B97AB`
   to match the corrected `design-tokens.css` ramp — both now pass WCAG AA on the dark
   canvas while preserving the 300>400>500 hierarchy.
3. **Reduced-motion a11y.** Added the universal `prefers-reduced-motion` reset so
   fade/slide-ins resolve to their final fully-opaque frame instantly — fixes a real
   reduced-motion gap (Tailwind `animate-*` previously ran regardless of the preference)
   and removes the transient mid-fade low-contrast state.
4. **Consolidation contract.** Retargeted the home "GSN" card and the ⌘K "GSN" entry to
   the canonical **The Beat**; swept the remaining redirect-source internal links
   (`/picks`→`/board`, `/stats/players`→`/players`) across pricing, dashboard, stats, and
   the player detail back-link. Zero redirect-source links remain on live pages.

## Verification status

| Bar | Status | Evidence |
|---|---|---|
| Whole-monorepo build | **GREEN — 217 routes** | `npm run build` exit 0 |
| TypeScript | clean | `tsc --noEmit` exit 0 |
| Trust-gate / model-freeze | OK | 1059 files, 0 banned; MODEL_VERSION v5.0.0 unbumped |
| Change-relevant unit tests | pass | middleware-contract (+/today), critical-routes, public-metadata, data-first-surfaces, guardrails (isolated) |
| Redirects + auth gate | **verified** | HTTP + Playwright: /picks→/board, /stats/players→/players, /gsn→/the-beat, /brief→/founding-desk; /today→/auth/signin |
| a11y (axe, serious/critical) | **board + founding-desk: 0** | `e2e/a11y.spec.ts` (reduced-motion baseline); pricing fix applied, re-verify pending |
| 10-second test | hero asserted; passive-first-visit proof added | `e2e/ten-second-test.spec.ts` |

### Honest blockers (environmental, not code)

- **No working local DB.** The local Postgres rejects the `.env.local` `sports`
  credentials, so the full local test suite emits `prisma:error` for DB-backed surfaces
  (12 such failures, all environmental — proven by isolation runs) and the **force-dynamic
  home/board pages render slowly** (each DB call retries), which intermittently times out
  Playwright on `/` and inflates a11y/perf runs. None of this affects the shipped code:
  the production build is green and DB-backed pages render honest empty states. Reliable
  local Playwright/Lighthouse + a fully-green local suite need the DB credentials (a local
  action — the superuser password is the owner's; I did not guess it).
- **Lighthouse perf budget** (LCP<2.0s, CLS<0.05, ≥95) is best measured against the prod
  build *with* the DB; deferred to the DB-enabled run. Steady-state server TTFB on `/` was
  ~0.5s warm, which is a sound foundation.
