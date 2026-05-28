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
- [ ] Centralize Claude/Codex prompts under `apps/web/lib/prompts/`
      (server-only) so they are not scattered across feature code
- [x] Add `/.well-known/security.txt` for vulnerability disclosure
      — **resolved C8**: `apps/web/public/.well-known/security.txt`

## Queue C — Broken Build / Type / Test

- _(none — last validation 2026-05-28: 107 routes build, 2106 tests pass,
  typecheck clean)_

## Queue D — Product Coherence

Orphan pages, duplicate concepts, inconsistent naming, pages without a
next action.

- [ ] Audit every public route for "next action" presence (every page
      must answer: what should the user do next?)
- [ ] Audit nav for duplicate concepts (e.g., `/brief` vs `/briefing`,
      `/board` vs `/today`)
- [ ] Ensure `/today`, `/no-bet`, `/parlay-mri`, `/market-mirage`,
      `/roster-shock`, `/coaching-edge`, `/autopsy`, `/profile` all
      link to one another where related
- [ ] Verify homepage `<DailyRoutine />` and `<SportNav />` route to
      live destinations

## Queue E — Trust / Compliance

Unsafe copy, missing responsible-gaming links, missing methodology
links, unsupported claims, mock data ambiguity.

- [ ] Add responsible-play link to every betting-adjacent surface (all
      decision-quality surfaces, all sport pages, Tracker, Leaderboard)
- [ ] Add methodology link to every analytical surface
- [ ] Audit every page using sample/mock/demo data for visible label

## Queue F — Evidence Chain

Missing source, freshness, model version, citation, or proof on data
cards or analytical claims.

- [ ] Adopt `EVIDENCE_CHAIN_STANDARD.md` per-card requirements across
      all data-rendering components (PickCard, AutopsyRow, BoardCard,
      future ShareCards)

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
