# SEO / Redirect Preservation Map

When the consolidation collapses 170 surfaces and merges duplicates, **getting the
redirects and canonical hygiene right is the difference between keeping and losing search
equity.** This is the spec local implements alongside the route merges.

## Rules (non-negotiable)
- Use **permanent (308/301)** redirects for merges, never temporary (307/302). In Next.js
  `redirects()`, set `permanent: true`.
- One **canonical** per page (`alternates.canonical`) pointing at the surviving URL.
- Update **`sitemap.xml`/sitemap route** to list ONLY the surviving canonical URLs — drop
  the merged/hidden ones so crawlers stop indexing dead paths.
- Keep `robots`/noindex correct: hidden-but-live niche pages that we don't want indexed
  should carry `robots: { index: false }` rather than being redirected (they still work via
  deep link, just off the search graph).
- Never redirect a URL that has inbound internal links without updating those links too
  (grep the codebase for the old path first).

## Merge → redirect table (from the consolidation map)
| Old URL | Action | New URL | Notes |
|---|---|---|---|
| `/picks` | 308 redirect | `/board` | Near-duplicate. Grep `href="/picks"` and update internal links first. |
| `/stats/players` | 308 redirect | `/players` | Player data unified in the Lab. |
| `/gsn` | 308 redirect | `/the-beat` | Already removed from nav; The Beat is canonical media. |
| `/brief` | decide | `/the-beat` or `/founding-desk` | Confirm intent; pick one and 308. |
| `/today` | move behind auth | `/dashboard` (or auth-gated) | Personalized — `noindex` if it stays public. |
| `/stats/*` tree | demote | keep code | `noindex` the parallel stat views that duplicate `/intelligence/*`; remove from sitemap + nav. |
| `/reliability`, `/proof` | fold into `/accountability` | section anchors | If kept as pages, canonical → `/accountability`; else 308. |
| `/mlb`, `/nhl` | demote | sport selector in `/house` | `noindex` stubs until they have real content. |
| `/promotions`, `/newsletter` | keep, off nav | — | Keep indexable if they have unique value; otherwise `noindex`. |

## Pre-flight grep (before any redirect)
For each old path, run a repo grep for `href="<old>"`, `push("<old>")`, `<Link href="<old>"`
and the sitemap entry. Update or remove every internal reference so users never hit a
redirect from inside the app (redirject chains hurt crawl budget + feel slow).

## AEO / answer-engine notes (2026)
- Add/keep **structured data** (JSON-LD) where it's truthful: `Organization`, `WebSite`
  + `SearchAction`, `FAQPage` on `/faq`, `Article` on blog posts. Never mark up fabricated
  ratings/reviews.
- The honesty moat IS the AEO angle: pages that transparently show calibration/CLV
  methodology are exactly the kind of authoritative, citable content answer engines favor —
  make `/methodology`, `/accountability`, `/clv` crawlable, well-titled, and self-contained.
- Unique `title` + 120–160-char `description` + canonical on every surviving page (the SEO
  metadata sweep already covers most routes; re-verify after the merges).

## Acceptance
- Every merged URL 308s to its canonical; no redirect chains; no broken internal links.
- Sitemap lists only survivors; merged/hidden paths are gone or `noindex`.
- Lighthouse SEO ≥ 95 on `/`, `/board`, `/founding-desk`, `/methodology`, `/accountability`.
- A crawl (or `next build` route list + a link checker) shows zero 404s from old internal links.
