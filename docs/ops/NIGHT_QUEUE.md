# NIGHT_QUEUE — live task queue & resume anchor

> Resume rule (§0): read this file + `NIGHT_AUDIT.md` + `LESSONS.md`, run the GATE
> (§7), then continue from the first unchecked `[ ]` item. Scores are
> **Impact × Confidence ÷ Effort** (§2). Public + revenue + trust surfaces outrank
> operator/cockpit pages. Highest score next.

**Branch:** `claude/nifty-hopper-au7wib` (= `origin/main` 0e70605 at boot — the latest
good state; carries the immersive/re-theme line that post-dates eloquent-goldberg's
PR #29). Hard constraint from this session's harness: develop + push **only** on this
branch; do NOT merge to main / deploy. Brief §1 said base on eloquent-goldberg, but
that line is OLDER than this one — re-verified the punch-list against the actual tree
instead of trusting it (see LESSONS L1).

---

## In progress
- [ ] Boot: gate baseline running (typecheck ✓ all 10 workspaces, lint→build→test in flight).

## Queue (scored, highest first)

### WAVE 1 — Cohesion (off-brand gray/accent → cosmic system). Re-verified on this tree.
- [ ] **W1-1 · `app/picks/page.tsx` rebrand** — score ~6.7 (Impact 5 × Conf 4 ÷ Eff 3).
  Revenue surface. Confirmed off-brand: `bg-gray-950/900/800/700`, 13× `cyan-400`,
  `text-accent-300`, many `text-gray-*`. → void/carbon/eclipse + `border-mineral` +
  `#00E5FF` orbital-cyan + `text-ink-*`. Keep server-side paywall + all logic intact.
- [ ] **W1-2 · accent-300 sweep (mechanical, Haiku)** — score ~7.5 (Imp 3 × Conf 5 ÷ Eff 2).
  Swap off-palette `text-accent-300`/`text-accent-200` → `text-orbital-cyan` across
  `app/about`, `app/contact`, `app/changelog`, `app/faq`, `app/terms`, `app/privacy`,
  `app/responsible-play`. Pure token swap; no layout change.
- [ ] **W1-3 · `app/room/[gameId]/page.tsx` rebrand** — score ~5.3 (Imp 4 × Conf 4 ÷ Eff 3).
  Decision Room. `bg-gray-950/900`, `border-gray-800`, `text-gray-100..500` → carbon/
  eclipse + ink tokens + subtle accent glow.
- [ ] **W1-4 · hero warmth for flat public pages** — about/contact/changelog/faq/terms/
  privacy/vault/integrations/responsible-play: ensure explicit cosmic bg + eyebrow/title
  hero w/ radial-gradient accent (academy hero pattern). Decompose per page.

### WAVE 2 — Honest, finished public surfaces (never fabricate)
- [ ] **W2-1 · fix `app/stats/source-suggest` form action** — score HIGH (real bug, Conf 5).
  Brief flags `action` → `/promotions` (broken). Verify + point at correct handler.
- [ ] **W2-2 · `app/auth/signin` "email sign-in coming soon"** — finish or remove the
  half-feature so auth feels complete. Decide per code reality.
- [ ] **W2-3 · `app/fantasy/contests` "under construction"** — gate out of public nav or
  convert to honest, polished in-progress state.
- [ ] **W2-4 · `app/terms` "pending counsel"** — keep honest (no fabricated legal text),
  make presentation production-grade.

### WAVE 3 — Performance / A11y / Tests
- [ ] **W3-1 · hero video perf** — confirm `GeneratedPlate` uses `preload="none"` + poster
  + mounts only when motion allowed; flag oversized clips in `public/immersive/**`.
- [ ] **W3-2 · keyboard parity (Haiku, mechanical)** — ~90 `onClick` without `onKeyDown`/
  role/tabIndex; add focus-visible ring. Start: dfs-optimizer, draft-assistant,
  galaxy-slate-twin, cinematic-entrance, observatory controls.
- [ ] **W3-3 · page-level tests** — smoke/snapshot for top routes (home, pricing, board,
  picks, performance, room, intelligence, academy). Never weaken a test to go green.

### WAVE 4 — Bold build-vision (after Waves 1–3 stable)
- [ ] **W4-1 · per-surface signature interaction** — distinct, reduced-motion-safe motif
  per hero surface (board=command constellation, performance=calibration ribbon, etc.).
- [ ] **W4-2 · scroll choreography** — extend `components/motion/reveal.tsx`.
- [ ] **W4-3 · WebGL particle-nav prototype** — flagged, lazy, perf-budgeted, isolated.

## Blocked — owner
- Vercel preview verification (§8): requires Vercel MCP auth / preview URL — attempt via
  MCP; if unauthenticated, park and note in NIGHT_AUDIT.
- Production go-live, Stripe/Odds API live keys, presenter wiring — owner-only.

## Done
- [x] Boot: located real brief (PR #29 branch), ported to this branch, created state files.
