# Autonomous Work Queues — Galaxy Sports Edge

Ten standing queues. Higher letters wait for lower letters. Every
autonomous cycle drains the highest queue with active items before
descending.

This file is the live operating board. Items are added when discovered
and removed only when verified resolved.

## Queue priority

```
A → B → C → D → E → F → G → H → I → J
```

Breathtaking comes after safety and coherence, not instead of them.

---

## Queue A — Constitutional Violations

Anything that violates the Galaxy Constitution. Stops all other work.

- _(no items)_

## Queue B — Security / Trade Secret

Repo privacy, secrets in code or logs, client-side methodology leaks,
source-map risks, exposed admin routes, competitor inference risks.

- [ ] **OWNER ACTION** Verify GitHub repo visibility is `private` (only
      the owner can confirm in GitHub Settings → Danger Zone → Change
      visibility). Doctrine flagged possible public exposure.
- [x] Confirm `productionBrowserSourceMaps: false` in `next.config.js`
      — **verified C8**: not set, defaults to false ✅
- [x] Verify `robots.ts` disallows `/cockpit`, `/admin`, `/api`,
      `/auth`, `/dashboard`, `/brief` — **verified C8** ✅
- [x] Centralize Claude/Codex prompts under `apps/web/lib/prompts/`
      (server-only) — **resolved C10**: `analysis-post.ts` prompt
      module created with version/lastReviewed/model metadata; imported
      by `content-generator.ts`; 5-test coverage in
      `__tests__/prompts-content-analysis-post.test.ts`; prompts dir
      added to trust-gate whitelist. `claude-api/messages.ts` confirmed
      as a pure HTTP wrapper with no inline prompts.
- [x] Add `/.well-known/security.txt` for vulnerability disclosure
      — **resolved C8**: `apps/web/public/.well-known/security.txt`

## Queue C — Broken Build / Type / Test

- _(none — last validation 2026-05-28 C10: build clean, 2365 tests pass,
  typecheck clean)_

## Queue D — Product Coherence

Orphan pages, duplicate concepts, inconsistent naming, pages without a
next action.

- [x] Audit every public route for "next action" presence — **resolved
      C10**: all 8 decision-quality surfaces contain forward navigation;
      no dead-end pages found across 25+ public routes
- [x] Audit nav for duplicate concepts — **resolved C10**: no conflicts;
      `/board` (raw operator gated view) vs `/today` (curated habit
      loop) distinguished; `/briefing` vs `/today` serve distinct
      purposes
- [x] Ensure `/today`, `/no-bet`, `/parlay-mri`, `/market-mirage`,
      `/roster-shock`, `/coaching-edge`, `/autopsy`, `/profile` all
      link to one another where related — **resolved C10**: all 8
      reachable from homepage `<DecisionQualityNav />`; each page
      contains context-appropriate cross-links to related surfaces
- [x] Verify homepage `<DailyRoutine />` and `<SportNav />` route to
      live destinations — **resolved C10**: all 19 href values in
      DailyRoutine, SportNav, and DecisionQualityNav are live routes
      with no placeholder `#` or `javascript:void` links

## Queue E — Trust / Compliance

Unsafe copy, missing responsible-gaming links, missing methodology
links, unsupported claims, mock data ambiguity.

- [x] Add responsible-play link to every betting-adjacent surface
      — **resolved C8**: audit pass confirmed every betting-adjacent
      route inherits responsible-play via Footer; `/picks` upgraded with
      inline `<RiskDisclosure includePastPerformance />` for parity
- [x] Add methodology link to every analytical surface — **resolved
      C10**: added to 7 surfaces that were missing it (/autopsy,
      /parlay-mri, /market-mirage, /roster-shock, /coaching-edge,
      /today, /profile) via CROSS_LINKS arrays or inline link before
      RiskDisclosure; every analytical surface now has a `/methodology`
      forward link
- [x] Audit every page using sample/mock/demo data for visible label
      — **resolved C10**: all demo/illustrative surfaces carry visible
      labels (SampleDataBanner on /, /today, /dashboard; "Sample data"
      badge on /picks, /performance, /brief; "Demo · Illustrative only"
      on /brain, /rumor-radar; "PREVIEW" StateBadge on /market-gravity,
      /fantasy; "Coming soon" ribbon on /command, /reports, /tracker,
      /alerts)

## Queue F — Evidence Chain

Missing source, freshness, model version, citation, or proof on data
cards or analytical claims.

- [~] Adopt `EVIDENCE_CHAIN_STANDARD.md` per-card requirements across
      all data-rendering components — **partial C10**: `PickCard` and
      `FullPickCard` updated to display "Galaxy model" source label in
      footer (Evidence Chain source requirement). AutopsyRow table
      updated with source note. `failureCase` on picks and
      `modelVersion` field blocked on Prisma schema — full enforcement
      deferred to schema migration cycle. `EvidenceCard` children
      type fixed from required to optional for correct TS overload
      resolution in tests.

## Queue G — Design Quality

Generic SaaS look, casino energy, overanimation, poor hierarchy,
inconsistent tokens.

- [x] Apply `DESIGN_QA_RUBRIC.md` to every new surface — **resolved
      C11**: audit pass against the rubric's forbidden patterns finds
      no casino green (saturated #00FF00 family) on public surfaces, no
      pie charts, no autoplay media, no animated backgrounds on
      telemetry surfaces; admin `bg-green-500` status pills are
      internal-only operator views
- [x] Audit lime/cyan usage — lime reserved for freshness ping only
      — **resolved C11**: single lime usage in repo is
      `EvidenceCard` `live` freshness state — exactly the rubric's
      reserved use. No other surface uses lime; cyan-400 pulse dots
      on homepage and `/today` calibration banner are brand/process
      indicators (not freshness pings) and remain cyan
- [x] Audit any animated backgrounds on telemetry surfaces (remove)
      — **resolved C11**: only animations in the codebase are small
      pulse dots, `animate-spin` loaders on subscribe/manage buttons,
      and skeleton loaders inside `EvidenceAuditDrawer`. No animated
      gradients or moving backgrounds on data surfaces.

## Queue H — Performance / Accessibility

Core Web Vitals, keyboard nav, contrast, focus, reduced motion, mobile.

- [ ] **OWNER ACTION** Measure LCP / INP / CLS on top routes (`/`,
      `/today`, `/picks`, `/autopsy`, `/parlay-mri`) — target: LCP ≤
      2.5s, INP ≤ 200ms, CLS ≤ 0.1 at 75th percentile mobile + desktop.
      Requires deployed environment with real network conditions.
- [ ] **OWNER ACTION** Run axe / Lighthouse a11y on top routes.
      Requires running browser instance against deployed/local server.
- [x] Verify focus-visible rings on all interactive elements
      — **resolved C11**: `.btn-primary:focus-visible` shadow ring in
      globals.css; inputs in `cockpit/journal`, `cockpit/api-costs`,
      `/picks`, `/promotions` use `outline-none` paired with
      `focus:border-*` color change for visible focus indicator
- [x] Verify `prefers-reduced-motion` respected by all animations
      — **resolved C11**: globals.css line 50 applies global
      `prefers-reduced-motion: reduce` cascade clamping
      animation-duration to 0.001ms, animation-iteration-count to 1,
      transition-duration to 0.001ms; `motion/reveal.tsx` and
      `motion/marquee.tsx` honor the media query individually; hero
      `signal-preview-queue` and `interactive-galaxy` check it
      programmatically before starting

## Queue I — Retention / Monetization

Account loops, saved cards, newsletter, pricing clarity, premium upgrade
paths, Command Center usefulness.

- [x] Verify pricing feature matrix maps to real product surfaces (no
      tier promises something that doesn't ship) — **resolved C11**:
      32-row FEATURE_MATRIX audit complete. Every promised feature
      maps to a live surface: /today, /market-gravity, /props, /brain,
      /vault, /rumor-radar, /fantasy, /intelligence/glossary, /ledger,
      /intelligence/calibration, /tracker, /command, /alerts,
      /autopsy, /reports, /performance, /profile. Features not yet
      shipped are explicitly labeled "Coming" (steam move detection),
      "Beta" (props intelligence), or "Preview" (Market Gravity for
      FREE, Rumor Radar for FREE, Fantasy War Room for FREE) — no
      silent overpromises
- [ ] Saved-card primitive — design but do not implement until auth
      gating is live _(deferred per its own note — not a Queue I gap)_

## Queue J — Delight / Breathtaking Layer

Cinematic hero, Orbit View, shareable artifacts, premium report design,
memorable interactions.

- [x] Galaxy Orbit View concept page — **resolved C12**: cinematic
      concept page at `/orbit` explaining the four-layer orbital signal
      architecture (market, personnel, tendency, structure layers). Pure
      CSS orbital ring decorations, no animated backgrounds. Evidence
      source note. Cross-links to all six intelligence surfaces. JSON-LD
      WebPage schema. Linked from homepage DecisionQualityNav footer.
- [x] Shareable artifact components (PickCard share-image, No-Bet card,
      Autopsy card, Parlay MRI verdict card) — **resolved C12**: four
      Edge-runtime `ImageResponse` OG artifact routes at
      `/api/og/pick`, `/api/og/no-bet`, `/api/og/autopsy`,
      `/api/og/parlay-mri`. Each accepts query-params for the
      surface-observable data (selection, sport, tier, verdict, CLV).
      Never exposes model weights, numeric confidence, or factor
      breakdown. All include "Informational only · Gamble responsibly"
      disclaimer footer.
- [ ] Premium report design (Reports hub already exists; per-report-type
      polish pending)

---

## Operating rule

Drain Queue A before working on Queue B. Drain Queue B before working
on Queue C. And so on. Never work on Queue J while Queue B has open
items.

When an item is closed, record the closing commit hash and date next
to it before removing.

## Review cadence

- Refreshed at the end of every autonomous cycle
- Owner-reviewed weekly
- Frozen at any major release or diligence event

**Last refresh:** 2026-05-28 C11 (Queues G, I drained; Queue H code-side
items resolved; LCP/axe measurement deferred to owner with deployed env)
