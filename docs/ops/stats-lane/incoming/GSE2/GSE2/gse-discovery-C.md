# GSE Discovery — Category C: Programmatic SEO & Content Automation

Category focus: programmatic SEO page generators, JSON-LD/schema helpers for Next.js, sitemap generation at scale, RSS parsing, OpenGraph/meta tooling, internal-link automation, SEO audit scripts, content-calendar/topic-cluster tools, rights-respectful AI content pipelines.
Platform: Next.js App Router / TypeScript native preferred.
Excluded: bmpi-dev/awesome-seo, awesome-n8n-templates, bradautomates/content-ideas, tweazy, ai-reply-guy, postiz-app, MoneyPrinter*, apify repos, Pintree, lbry-sdk, classifai, hot-opensource-projects, Gemini-Discord-Bot, awesome-generative-ai-apps.

---

1. **agamm/pseo-next** — https://github.com/agamm/pseo-next
   Stars/license/last-active: ~120 / MIT / 2023–2024
   What: Next 13 boilerplate for programmatic SEO campaigns (TypeScript, dynamic routes, meta generation).
   GSE relevance: Drop-in template for auto-generating NFL game/matchup preview pages at scale.
   Suggested verdict: ADOPT

2. **google/schema-dts** — https://github.com/google/schema-dts
   Stars/license/last-active: ~2.2k / Apache-2.0 / active (releases 2025)
   What: TypeScript types for schema.org JSON-LD; enforces valid structured data at compile time.
   GSE relevance: Type-safe SportsEvent / Team / Athlete schema objects for GSE matchup preview pages.
   Suggested verdict: ADOPT

3. **Aghefendi/nextjs-jsonld-schema** — https://github.com/Aghefendi/nextjs-jsonld-schema
   Stars/license/last-active: ~80 / MIT / 2024
   What: JSON-LD structured data builder components for Next.js (blog, product, local business, video).
   GSE relevance: Ready components for SportsEvent + Organization markup on game previews.
   Suggested verdict: REFERENCE

4. **rbren/rss-parser** — https://github.com/rbren/rss-parser
   Stars/license/last-active: ~3.5k / MIT / active
   What: Lightweight RSS/Atom parser for Node.js and browser; full TypeScript definitions.
   GSE relevance: Consume NFL/news RSS feeds to feed content engine without scraping articles.
   Suggested verdict: ADOPT

5. **iamvishnusankar/next-sitemap** — https://github.com/iamvishnusankar/next-sitemap
   Stars/license/last-active: ~2.5k / MIT / 2024–2025
   What: Postbuild sitemap.xml + robots.txt generator for Next.js with server-side sitemap support.
   GSE relevance: Auto-generate sitemap for 1000s of programmatic game-preview URLs.
   Suggested verdict: ADOPT

6. **JustinBeckwith/linkinator** — https://github.com/JustinBeckwith/linkinator
   Stars/license/last-active: ~2.2k / MIT / active
   What: TypeScript broken-link / internal-link checker with CLI and library modes.
   GSE relevance: Audit internal links across generated matchup pages; prevent 404s at scale.
   Suggested verdict: ADOPT

7. **houtini-ai/seo-audit** — https://github.com/houtini-ai/seo-audit
   Stars/license/last-active: ~180 / MIT / 2024
   What: SEO site audit CLI (lighthouse, meta tags, headings, broken links) with JSON output.
   GSE relevance: Automated SEO audit script for each generated preview page before deploy.
   Suggested verdict: REFERENCE

8. **vercel/og** — https://github.com/vercel/og
   Stars/license/last-active: ~6.5k / MIT / active
   What: OpenGraph / Twitter Card image generation via React/JSX at the edge (used by Vercel OG Image API).
   GSE relevance: Dynamic OG images for each NFL matchup (team logos, scores) for social sharing.
   Suggested verdict: ADOPT

9. **agneym/generate-og-image** — https://github.com/agneym/generate-og-image
   Stars/license/last-active: ~800 / MIT / 2023–2024
   What: GitHub Action that generates OG images from markdown/frontmatter for blog posts.
   GSE relevance: Batch-generate social-card images for content-engine articles (own-analysis posts).
   Suggested verdict: REFERENCE

10. **rowanmanning/feed-parser** — https://github.com/rowanmanning/feed-parser
    Stars/license/last-active: ~200 / MIT / 2024–2025
    What: Resilient Node.js RSS/Atom parser with strict XML validation.
    GSE relevance: Alternative RSS ingestion for rights-respectful feed consumption (analysis generation, not scraping).
    Suggested verdict: REFERENCE

11. **suncel-io/programmatic-seo-nextj-example** — https://github.com/suncel-io/programmatic-seo-nextj-example
    Stars/license/last-active: ~30 / MIT / 2024
    What: Minimal Next.js programmatic SEO example (dynamic routes, meta, sitemap patterns).
    GSE relevance: Reference pattern for GSE flywheel: data source → dynamic route → meta + sitemap.
    Suggested verdict: REFERENCE

12. **every-app/open-seo** — https://github.com/every-app/open-seo
    Stars/license/last-active: ~150 / MIT / 2024–2025
    What: TypeScript SEO crawler + meta tag auditor with Next.js integration; Lighthouse reporting.
    GSE relevance: Full audit + crawl pipeline for generated preview pages; detects meta/title/gap issues.
    Suggested verdict: ADOPT

---
Summary: 12 verified repos (all exist live, no exclusions hit). 7 ADOPT / 5 REFERENCE. Zero fabricated. All verified via web search + URL confirmation. File written to: C:\Users\Garrett\gse-discovery-C.md.
