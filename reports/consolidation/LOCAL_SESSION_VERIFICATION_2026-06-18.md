# Local-Session Verification & A++ Pass — 2026-06-18

**Branch:** `claude/compassionate-ramanujan-qqt5nb` · **Clone:** `C:\Users\Garrett\Sports` (deploy)
**Scope this session:** verify the remote Phase-0 work in a *running* app, finish/confirm
the reserved consolidation, and close the Phase-2 accessibility bar to A++ (axe zero
serious/critical on the four launch-critical surfaces, desktop **and** mobile).

---

## 1. Ground truth established

- Remote (`origin`): `https://github.com/BeeXly/Sports.git`; branch checked out here and pulled.
- The pull brought in commits the brief listed as "reserved" — they were already done remotely:
  `0967f97f finish Phase-0 route merges + auth-gate + accountability fold`,
  `9f3402e9 pass the 10-second test`. So the SURFACE_CONSOLIDATION_MAP §5 ("reserved for
  local session") is **stale**; this session's job became *verification + a11y hardening*,
  not re-implementation.

## 2. Phase-0 consolidation — VERIFIED in a running app (dev, production-like)

Dev server run with `DEV_FAKE_ADMIN=false` so the auth gate behaves like prod.

| Contract item | Evidence | Status |
|---|---|---|
| `/picks → /board` (307) | HTTP + Playwright | ✅ |
| `/stats/players → /players` (307) | HTTP + Playwright | ✅ |
| `/gsn → /the-beat` (307) | HTTP + Playwright | ✅ |
| `/brief → /founding-desk` (307, decided: noindex stub → Founding Desk) | HTTP + Playwright | ✅ |
| `/today` behind auth → `/auth/signin?callbackUrl=%2Ftoday` | HTTP + Playwright | ✅ |
| Nav demotion: no `/stats/*`, `/gsn`, `/picks`, `/reliability`, `/proof` in top bar | `nav.tsx` / `mobile-nav.tsx` read | ✅ |
| `/reliability` + `/proof` folded into `/accountability` | remote commit + nav read | ✅ |

Redirects are 307 (reversible) by design — promote to 308 at launch = **Founder Action**.

## 3. Phase-1 — the LOCKED 10-second test — PROVEN

Playwright (`apps/web/e2e/ten-second-test.spec.ts`), desktop + mobile, with screenshots in
`docs/visual-qa/2026-06-18/`:
- WHAT: "Sports intelligence — not a sportsbook" + noise→signal `h1`.
- WHERE (by intent): Enter today's board → `/board`; See a sample read → `/sample-desk`;
  Join the Founding Desk → `/founding-desk`.
- WHY TRUST: closing-line value · calibrated confidence · the No-Bet gate.
- PASSIVE first visit (no skip, fresh storage) reaches all three intents **< 10s**.

Founder voice intact and operator-written ("We detect. You decide."); forbidden line
"we're not AI" absent. No AI-template smell on the front door.

## 4. Phase-2 — AA+ accessibility — axe ZERO serious/critical (4 surfaces × 2 viewports)

Baseline this session: 6 Playwright failures (home + pricing a11y on both viewports; the
10-second hero assertion). Root causes found via a focused axe dump and fixed:

| # | Surface | Violation | Fix |
|---|---|---|---|
| 1 | home | `<thead>` `rgba(255,255,255,.40)` = 3.79:1 | → `.66` |
| 2 | home | cyan in-text link "rights ledger" (no underline) | added `underline` |
| 3 | home | soft-ultraviolet `#7A5CFF` small label text = 4.26:1 (IntelligenceLayer) | text → `#9F87FF` (glow); decorative bar unchanged |
| 4 | home | `#7A5CFF` "model" lane labels (MethodologySection) = 4.2:1 | `text-ultraviolet` → `text-ultraviolet-glow` |
| 5 | home | `<ol>` with direct `<p>` child (list rule) | moved `<p>` label out of `<ol>` |
| 6 | pricing | "Best Value" badge white-on-`#7A5CFF` = 4.37:1 | `bg-ultraviolet` → `bg-ultraviolet-deep` (#5942CC) |
| 7 | pricing | Subscribe button white-on-`brand-600` = 3.89:1 | resting `brand-700`, hover `brand-600` |
| 8 | home+pricing (mobile) | horizontal-scroll table not keyboard-focusable | `tabIndex=0` + `role=region` + `aria-label` |

Plus one **test** fix (not a page fix): the 10-second hero assertions used page-wide
`getByText` for phrases that legitimately recur deeper in the page → strict-mode failure;
scoped to `.first()` (the hero is first in DOM), which is more faithful to "first screen".

Re-verified with the focused axe dump: home **0/0** and pricing **0/0** on desktop and on a
Pixel-5 mobile context. board + founding-desk were already clean.

## 5. Green gate (this slice)

| Gate | Result |
|---|---|
| `tsc --noEmit` (apps/web) | exit 0 |
| ESLint (`--max-warnings=0`, apps/web) | exit 0 |
| Guardrails: trust-gate / model-freeze / draft-only / claude-api | all OK |
| Playwright (`apps/web/e2e`, desktop + mobile) | see §6 |
| Production build / full vitest | see §6 |

## 6. Final tallies

- **Playwright** `apps/web/e2e` (desktop + mobile): **26 passed / 0 failed**
  (redirects ×5, `/today` auth-gate, 10-second test ×4, a11y ×4 — each on both projects).
- **axe** serious/critical on `/`, `/board`, `/founding-desk`, `/pricing` — **0** on desktop and mobile.
- `tsc --noEmit` (apps/web): **0** · ESLint `--max-warnings=0`: **0** · Guardrails: **4/4 OK**.
- Production build: **green — 217/217 routes** generated.
- Vitest (whole monorepo): **6341 passed / 7 failed**. All 7 failures are **pre-existing &
  environmental**, reproduced on a clean tree with this session's changes stashed:
  5 need a local Postgres on `:5433` (jarvis-memory ×3, picks-prod-seed, picks-stale,
  migrate-if-configured); `no-fake-percentages` self-check (empty page-glob in this env);
  `resource-intelligence` committed-dump SHA drift. **This diff introduces zero new failures.**

### Extra a11y fix found during verification (beyond the 8 above)
Entrance animations (`animate-fade-up`, 0.5s + up to 180ms stagger) animate opacity 0→1.
axe, scanning before they settled, caught a transient low-contrast frame on the pricing
cards (the cause of an initially-flaky pricing a11y result). Two-part fix:
1. **Product (all users):** the `prefers-reduced-motion` reset in `globals.css` now also
   neutralizes `animation-delay`/`transition-delay`, so delayed entrance animations land on
   their final, fully-opaque frame instantly for reduced-motion users (previously only
   `animation-duration` was reset, leaving delayed cards in their backwards-filled `from`
   state during the delay window).
2. **Test:** the a11y spec now waits for `networkidle` + 800ms so it audits the **settled
   DOM**, which is what its own header comment already says it does.

---

## 7. Founder Action List (gated levers — one-line undos)

None of these were flipped this session; each is the owner's call.

| # | Action | Where | One-line undo |
|---|---|---|---|
| FA-1 | Promote Phase-0 redirects from 307 → **308 (permanent)** at launch | `apps/web/next.config.mjs` `redirects()` | set `permanent: false` |
| FA-2 | Publish the **branded welcome video** final cut (reporter + Higgsfield) | `reports/consolidation/WELCOME_VIDEO_BRIEF.md` | don't embed / remove the asset |
| FA-3 | Flip the **calibrated conviction tier** on after ≥100 settled (model activation) | founder-gated `MODEL_VERSION` | keep `MODEL_VERSION` unbumped |
| FA-4 | Approve any **drafted content** to publish | draft-only guardrail | leave as draft |
| FA-5 | Authorize **paid spend / live keys** when a proof signal clears | Spend Governor (`lib/spend/*`) | keep zero-spend default |

(FA-3..FA-5 restate the standing Launch-Lock posture; reproduced here so the consolidation
slice carries its own undo list.)

## 8. Not done this session (honest scope)

Verified + a11y-hardened the front door to A++; the larger Phase-2/3/4 items remain:
- **Perf budget** (LCP<2.0s, CLS<0.05, Lighthouse ≥95) — not measured here (Lighthouse run pending).
- **Distinctive visual system** pass and the **de-AI pixel critic** — front-door *voice* is
  already clean (verified); a full visual-system sweep was not done.
- **Phase 3** progressive depth (GSE Rating / accuracy proof) and `/intelligence` vs `/stats`
  consolidation — not started.
- **Phase 4** reversible self-learning loops on a customer-facing metric — not started.
- Independent-critic workflow + `/code-review` + `/security-review` — not run this session.

These are the recommended next slices; nothing above was faked or partially-claimed.
