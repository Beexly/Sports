# SEO Route Factory

**Modules:** `apps/web/app/preview/[sport]/[slug]/page.tsx` (DB-backed matchup preview + JSON-LD),
`apps/web/app/matches/preview/*` (fixture-only Event Genome slices),
`packages/decision-field-runtime/src/route-authority-registry.ts` (per-route authority)
**Status:** preview pages are `noindex` until the live data + rights path is green.

## What it is

Scores24's scale comes from a programmatic route factory: one templated page per match × market ×
league, multiplied across sports and seasons, all interlinked. GSE absorbs the *architecture* — one
page per event, generated from a structured object, richly interlinked, machine-readable — without
absorbing their content. Every GSE page is built from our own genome and carries proof, not scraped
copy.

## Two route families

1. **`/preview/[sport]/[slug]`** — DB-backed SEO matchup preview. Slug encodes
   `away-team-vs-home-team`; the page attaches the best published pick if one exists, emits
   `SportsEvent` + `BreadcrumbList` + `FAQPage` JSON-LD, and degrades to 404 if the DB is unavailable
   or the game is not found. This is the indexable, programmatic surface (gated on real published data).

2. **`/matches/preview/{ecuador-germany,rays-royals,roughriders-argonauts}`** — fixture-only Event
   Genome slices. No DB, no live odds, no affiliate links, `robots: noindex`. These are the proof
   vehicles, not the indexable factory.

## Authority is per route

`route-authority-registry.ts` declares every route's status
(`LIVE_ALLOWED | PREVIEW_ALLOWED | FIXTURE_ONLY | OWNER_GATED | DATA_GATED | RIGHTS_GATED |
DO_NOT_PUBLISH`) and its gates: bonus/affiliate routes are `OWNER_GATED` + compliance-reviewed,
prediction routes are trial-gated, trend routes are passport-gated. `validateRouteAuthority()` fails
if any bonus route is wrongly marked preview-allowed.

## Invariants for scale

- A page is generated from a structured genome, never from copied source content.
- Fixture/preview pages are `noindex`; only real-data pages may be indexed.
- Public copy on every generated page passes the banned-phrase scan automatically
  (`public-copy-scan-strong.test.ts` walks `app/**/page.tsx`).
- Rights status travels with the page; a `RIGHTS_GATED` route does not publish.

## What it does NOT do

It does not scale by scraping, does not index fixtures as live, and does not generate a page whose
rights are unclear.
