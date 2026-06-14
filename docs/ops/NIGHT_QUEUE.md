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
- (none — cohesion mission complete; see "Cohesion: COMPLETE" below.)

## Cohesion: COMPLETE across all non-reference / non-stub public surfaces
Verified by `grep gray-[0-9]` over every public `page.tsx`: the ONLY remaining grays are
(1) the white Google button on /auth/signin (`text-gray-900`/`bg-gray-100`, required by
Google brand convention), (2) the semantic GradeBadge map on /dashboard (grade-tier
colors), and (3) the intentionally-untouched reference-quality pages (/board, /journal)
and noindex stub (/brief). Everything else rides void/carbon/eclipse/titanium/mineral/ink
+ orbital-cyan/ion-magenta/soft-ultraviolet, with the magenta brand-* CTAs intact.
Locked by `public-cosmic-cohesion.test.ts` (119) against loud-token drift.

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

### DONE — shipped + pushed (gate green each)
- [x] **W1-1 picks rebrand** (b5bd7ce) — loud off-brand → cosmic; logic/gating intact.
- [x] **W1-2 accent-300 sweep** (b5bd7ce) — 7 pages.
- [x] **W1-3 room rebrand** (b5bd7ce).
- [x] **W2-2 auth/signin** (3799b09) — rebrand + removed "Email sign-in coming soon".
- [x] **Cohesion guard + picks hero accent** (b3d0355) — 119-test palette lock + static
  gradient hero.
- [x] **room self-canonical + top-route SEO test** (7a4bdf5).
- [x] **pricing + promotions + blog sweep** (aff4dd1).
- [x] **auth/error + fantasy/baseline** (19e8d29).
- [x] **dashboard chrome sweep** (gate pending) — member home; GradeBadge semantics kept.
- [~] **W1-4 hero warmth** — DESCOPED: global cosmic bg already present; legal pages don't
  need added motion. (Did add a tasteful static accent to /picks.)

### VERIFIED ALREADY-SATISFIED on this branch (no action needed — see NIGHT_AUDIT)
- [x] a11y keyboard parity (all onClick on native/wrapping-button elements).
- [x] hero-video LCP (GeneratedPlate gates video on motion + preload="none").
- [x] stats/source-suggest /promotions action (already clean).
- [x] WAVE-2 honesty surfaces (fantasy/contests, brief, academy, trends) already honest.

### PARKED — owner decision / blocked
- Preview skeptic-verification (§8): no Vercel preview URL/auth in-session → visual changes
  verified via gate + source review + the academy reference pattern, not a live preview.
- source-suggest form persistence (no backend; needs API/DB + clearance) — owner/product.
- flagship hero-video transcode to WebM/AV1 (owner-curated paid media).
- Bold build-vision §6 (WebGL particle-nav, bespoke per-surface motifs): high-impact but
  UNVERIFIABLE without a preview → deferred rather than ship-on-faith (violates §8).

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
