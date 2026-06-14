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
- [ ] **W2-2b · pricing/dashboard subtle gray polish** — DEFERRED/low-value (see note below).

## GROUND-TRUTH RECALIBRATION (verified on this tree, supersedes brief assumptions)
- Global `body` already sets `background: var(--carbon)` + fixed cosmic bg-image
  (globals.css:25-35) → "missing background" is NOT a defect here; pages inherit cosmic bg.
- `bg-gray-900/950` are visually NEAR brand `carbon/void` (lack only the violet tint), so
  pages using dark grays look near-cosmic. The high-value rebrands are surfaces with LOUD
  off-brand accents (harsh cyan-400/fuchsia-400/blue-600/white cards): that was picks+room
  (DONE) + auth/signin (DONE). Remaining gray-only pages (pricing 26, dashboard 49,
  promotions 28, blog) are SUBTLE → low visible impact, low priority.
- `board` + `journal` are brief-designated reference-quality; their gray usage is
  acceptable in context → DO NOT rebrand (respect the brief).
- `stats/source-suggest` is ALREADY on-brand on this tree and has NO broken `/promotions`
  action (brief's W2-1 superseded). New minor finding: its form has no real submit handler
  yet StatusRibbon says "accepted and reviewed" → honesty nuance, deferred (needs API/DB).
- fantasy/contests, brief, academy film-room, trends all already carry HONEST in-progress
  gating → no fabrication; leave as-is (polish only if time).

## Queue (scored, highest first)
- [ ] **W3-3 · page-level smoke tests (HIGH durable value)** — score ~6 (Imp 5 × Conf 4 ÷
  Eff 3). Brief: "112/113 public pages have no page-level test." Add happy-path/smoke tests
  for top routes (home, pricing, board, picks, performance, room, intelligence, academy).
  Would have caught tonight's brittle-test breakage class. Durable regression prevention.
- [ ] **W3-2 · a11y keyboard parity** — score ~4 (Imp 3 × Conf 3 ÷ Eff 2). NOTE: brief's
  "~90 onClick missing parity" is overstated here — 47 client comps use onClick, ~all on
  native `<button>/<a>/<Link>` (already keyboard-safe). Real gap = onClick on
  `<div>/<span>` w/o role/tabIndex/onKeyDown. Scope precisely in dfs-optimizer,
  draft-assistant, galaxy-slate-twin, cinematic-entrance, observatory/simulation-cloud.
- [ ] **W3-1 · hero video perf** — confirm `GeneratedPlate` uses preload="none"+poster+
  motion-gated mount; flag oversized `public/immersive/**` clips.

### DONE — WAVE 1 (cohesion) + auth honesty
- [x] **W1-1 picks rebrand** — shipped b5bd7ce. Loud off-brand → cosmic; logic/gating intact.
- [x] **W1-2 accent-300 sweep** (7 pages) — shipped b5bd7ce.
- [x] **W1-3 room rebrand** — shipped b5bd7ce.
- [x] **W2-2 auth/signin** — rebranded + removed "Email sign-in coming soon" half-feature
  (Google OAuth is a complete auth experience). Gate pending.
- [~] **W1-4 hero warmth** — DESCOPED: global cosmic bg already present; accent sweep
  delivered cohesion; legal pages don't need added motion. Optional polish only.

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
