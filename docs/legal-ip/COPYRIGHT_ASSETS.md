# Copyright Assets — Galaxy Sports Edge

Copyright protection exists automatically the moment an original work is
fixed in a tangible medium. Registration is not required for protection,
but registration is required to **enforce** in U.S. federal court and to
seek statutory damages and attorney's fees.

This document inventories Galaxy's copyrightable assets and flags those
worth registering.

## Registration priority

| Priority | Type |
|---|---|
| High | Stabilized source code (snapshot for registration) |
| High | Distinctive long-form copy (methodology pages, doctrine, ADRs) |
| High | Logo, master visual identity |
| Medium | Academy module content (educational copy) |
| Medium | Report templates |
| Lower | Daily briefings (continuously updating) |

## Assets

### Source code

- **Asset:** Galaxy monorepo at HEAD as of registration snapshot
- **Type:** Computer software
- **Author:** Founder (single contributor at time of writing)
- **Notes:** Register snapshots at meaningful milestones (e.g., MVP, v1
  launch, major refactor). For software, the Copyright Office allows
  partial deposit (first 25 + last 25 pages of source) to preserve
  trade-secret status of intervening code.
- **Status:** Not registered

### Public copy — methodology and intelligence pages

- **Assets:**
  - `apps/web/app/methodology/page.tsx`
  - `apps/web/app/intelligence/**/page.tsx` (15 cluster pages)
  - `apps/web/app/picks/how-picks-are-scored/page.tsx`
  - `apps/web/app/picks/confidence-scores/page.tsx`
  - `apps/web/app/market-gravity/**/page.tsx`
  - `apps/web/app/fantasy/**/page.tsx`
  - `apps/web/app/rumor-radar/**/page.tsx`
  - `apps/web/app/brain/**/page.tsx`
- **Type:** Literary work / nondramatic literary work
- **Notes:** Long-form distinctive copy. Register as a collection.

### Public copy — decision-quality surfaces

- **Assets:**
  - `apps/web/app/parlay-mri/page.tsx`
  - `apps/web/app/market-mirage/page.tsx`
  - `apps/web/app/roster-shock/page.tsx`
  - `apps/web/app/coaching-edge/page.tsx`
  - `apps/web/app/autopsy/page.tsx`
  - `apps/web/app/profile/page.tsx`
  - `apps/web/app/no-bet/page.tsx`
- **Type:** Literary work
- **Notes:** Highest copy-distinctiveness. Strong registration candidates.

### Doctrine library

- **Asset:** `apps/web/lib/doctrine.ts` — 14 doctrine entries
  (CLV, No-Bet Doctrine, EV, Bankroll, Tilt, Parlay Discipline, etc.)
- **Type:** Literary work / educational
- **Notes:** Compile and register as collection.

### Academy modules

- **Asset:** `apps/web/lib/academy-modules.ts` — 18 modules
- **Type:** Literary work / educational
- **Notes:** Register after content stabilizes.

### Signal type and reason taxonomies

- **Asset:** `apps/web/lib/signal-types.ts` (NO_BET_REASONS,
  MARKET_MIRAGE_REASONS, SPORT_META, CONFIDENCE_BANDS)
- **Type:** Compilation
- **Notes:** Distinctive selection and arrangement. Compilation copyright
  applies even if individual elements are facts.

### Product surface registry

- **Asset:** `apps/web/lib/product-surfaces.ts` (14 surfaces with
  riskProtection, keyQuestion, nextAction fields)
- **Type:** Compilation / literary work
- **Notes:** Selection and arrangement original.

### ADRs (Architecture Decision Records)

- **Assets:** `docs/adr/ADR-004` through `ADR-007`
- **Type:** Literary work
- **Notes:** Original architectural reasoning.

### Comparison and trust pages

- **Asset:** `apps/web/app/vs/tout-services/page.tsx`
- **Type:** Literary work
- **Notes:** Distinctive argumentation; register.

### Visual identity

- **Asset:** Logo (TBD), color palette in `globals.css`, design tokens
- **Type:** Visual art
- **Notes:** Register logo as visual art once stabilized. Register UI
  screenshots as derivative visual works.

### Marketing copy and homepage

- **Asset:** `apps/web/app/page.tsx` Hero, IntelligenceSurfaces,
  DailyRoutine, SportNav, StackSection
- **Type:** Literary work
- **Notes:** Distinctive marketing voice. Register periodically.

---

## Anti-infringement posture

### Notices

- [ ] Add `© 2026 [Entity Name] — All Rights Reserved` to the footer
  once entity formed
- [ ] Add SPDX license header to first-party source files
- [ ] Confirm Terms of Use includes anti-scraping and no-derivative-works
  language

### DMCA

- [ ] Designate a DMCA agent with the U.S. Copyright Office (required
  for safe harbor)
- [ ] Publish DMCA takedown procedure on `/legal` or `/dmca`

### Provenance evidence

Every commit in the repo carries a timestamp and authorship metadata.
That commit history is part of the provenance chain. Do not rewrite
history on `main` or release branches.

---

## What is NOT copyrightable (don't waste time)

- Facts (odds, scores, schedules — these are facts, not authorship)
- Ideas, methods, systems (copyright protects expression, not the
  underlying idea — trade secret and patent cover those)
- Short phrases and titles (trademark territory)
- Functional configuration (e.g., the literal column names of a database)
- Common UI patterns (table, card, button)

---

## Registration sequence (suggested)

1. Stabilize logo + master visual identity → register
2. Snapshot source code at MVP → register (Class TX, computer program)
3. Register collection of methodology + decision-quality + doctrine
   pages as a compilation → Class TX
4. Register Academy module content after stabilization
5. Annual re-registration of evolving content with substantial revisions

## Review cadence

- Quarterly review of new copyrightable assets
- Annual registration push for significant new content
- Pre-launch full audit before any commercial release
