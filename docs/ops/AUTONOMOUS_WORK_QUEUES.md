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
      all data-rendering components — **partial C9**: canonical
      `<EvidenceCard />` primitive shipped at
      `components/ui/evidence-card.tsx` with TS-enforced
      `failureCase` on `kind="pick"`; freshness/source pill anatomy
      matches the Standard. Migration of existing PickCard /
      BoardCard / AutopsyRow to compose this primitive queued.

## Queue G — Design Quality

Generic SaaS look, casino energy, overanimation, poor hierarchy,
inconsistent tokens.

- [ ] Apply `DESIGN_QA_RUBRIC.md` to every new surface
- [ ] Audit lime/cyan usage — lime reserved for freshness ping only
- [ ] Audit any animated backgrounds on telemetry surfaces (remove)

## Queue H — Performance / Accessibility

Core Web Vitals, keyboard nav, contrast, focus, reduced motion, mobile.

- [ ] Measure LCP / INP / CLS on top routes (`/`, `/today`, `/picks`,
      `/autopsy`, `/parlay-mri`) — target: LCP ≤ 2.5s, INP ≤ 200ms,
      CLS ≤ 0.1 at 75th percentile mobile + desktop
- [ ] Run axe / Lighthouse a11y on top routes
- [ ] Verify focus-visible rings on all interactive elements
- [ ] Verify `prefers-reduced-motion` respected by all animations

## Queue I — Retention / Monetization

Account loops, saved cards, newsletter, pricing clarity, premium upgrade
paths, Command Center usefulness.

- [ ] Verify pricing feature matrix maps to real product surfaces (no
      tier promises something that doesn't ship)
- [ ] Saved-card primitive — design but do not implement until auth
      gating is live

## Queue J — Delight / Breathtaking Layer

Cinematic hero, Orbit View, shareable artifacts, premium report design,
memorable interactions.

- [ ] Galaxy Orbit View concept page
- [ ] Shareable artifact components (PickCard share-image, No-Bet card,
      Autopsy card, Parlay MRI verdict card)
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

**Last refresh:** 2026-05-28 (initial population from doctrine adoption)
