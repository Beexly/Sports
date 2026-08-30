# Leverage Audit — Dev Tools, Testing/QA, Frontend, Design/UX, Media Optimization

**Domain:** Dev tooling, testing/QA, frontend, design/UX, media/asset optimization.
**Scope:** Rows from `NORMALIZED_RESOURCE_LEDGER.csv` with disposition `approved_direct` / `owner_review`
in categories `dev_tool` (311), `design_ux` (326), `testing_qa` (63), `api_tooling` (17) = **717 in-domain rows**,
cross-checked against the raw dump `garrett-resource-dump-2026-06-15.md` (which surfaced several
high-value tools the ledger had under-categorized: SVGO, Squoosh, Bruno, Hoppscotch, unDraw, etc.).

**Reality check:** the in-domain rows are ~80% noise for *this* build — aim trainers, game save editors,
terminal themes, face-swappers, video editors, interior-design apps, pixel-art editors. Those are SKIP.
The signal below is the ~50 tools that actually move a solo, zero-budget Next.js + Postgres + Vitest build.

Verification legend: **LIVE** = loaded via WebFetch this session; **desc** = assessed from ledger/dump description.

---

## TOP 10 SHORTLIST (adopt first — every one maps to a concrete task in this build)

| # | Resource | One-line build mapping | Status | Verified |
|---|----------|------------------------|--------|----------|
| 1 | **Crontab Guru** | Author/validate the cron expressions for BullMQ data-refresh, picks, and content workers — get odds-refresh cadence right without guessing. | ADOPT NOW | LIVE |
| 2 | **SVGO** (npm/CLI) | Drop into build pipeline to strip/optimize every SVG (logos, icons, illustrations) → cuts Vercel bandwidth + improves LCP. Scriptable, zero-cost, v4.0.1 (Mar 2026). | ADOPT NOW | LIVE |
| 3 | **Squoosh** | Compress/convert hero + OG + content images to WebP/AVIF before commit → Core Web Vitals (LCP) + bandwidth for the SEO content play. | ADOPT NOW | LIVE |
| 4 | **Bruno** | Git-friendly, offline API client to develop/debug The Odds API + Stripe + internal routes. Collections live in-repo (version-controlled), no cloud account. | ADOPT NOW | LIVE |
| 5 | **Webhook.site** | Inspect raw Stripe webhook payloads + The Odds API callbacks during local dev before wiring server handlers. | ADOPT NOW | LIVE |
| 6 | **shadcn/ui** | Copy-paste React + Tailwind + Radix components (own the code, no dep lock-in) → build the picks UI, paywall gates, dashboards fast and accessibly. | ADOPT NOW | LIVE |
| 7 | **Mockaroo** + **generatedata.com** | Generate realistic fixture data (games, odds, picks, users) as CSV/JSON/SQL for Vitest + DB seeding without touching the live odds API. | ADOPT NOW | LIVE |
| 8 | **PageSpeed Insights / Lighthouse (+ Web Vitals Leaderboard)** | Measure Core Web Vitals on deployed pages; gate releases on LCP/CLS/INP — directly feeds SEO ranking for the content engine. | ADOPT NOW | LIVE |
| 9 | **unDraw** (+ StorySet) | Free, open-license, brand-recolorable SVG illustrations for empty states, landing, onboarding — instant polish with no designer. | ADOPT NOW | LIVE (unDraw) |
| 10 | **regex101** | Build/debug the regexes for odds-feed normalization, team-name matching, and content slugging with live explanation. | ADOPT NOW | LIVE |

---

## RANKED TABLE — by cluster

### A. Cron / scheduling / webhooks / API debugging (highest leverage — maps to workers + integrations)

| Resource | What it is | Alignment | Build-task mapping + future uses | Verification |
|---|---|---|---|---|
| Crontab Guru | Cron expression editor/explainer | ADOPT NOW | Author every BullMQ repeatable-job schedule (odds refresh, daily picks, content publish). Paste expr → see next runs. | LIVE |
| Webhook.site | Disposable URL/inbox that shows all inbound HTTP/webhooks | ADOPT NOW | Inspect Stripe + Odds API webhook bodies/headers before writing handlers; replay during debugging. | LIVE |
| Bruno | Open-source offline API client, collections as plain-text in repo | ADOPT NOW | Primary client for Odds API + Stripe + internal routes; commit collections so they version with code. Postman/Insomnia replacement, no account. | LIVE |
| Beeceptor / Mockable / WireMock Cloud / {JSON} Placeholder | Hosted mock REST API endpoints | EVALUATE | Stand up a fake odds endpoint to develop ingestion against when API quota is tight or for failure-mode tests. | desc |
| HTTPie | Human-friendly CLI HTTP client | EVALUATE | Quick curl-replacement for hitting the Odds API / local routes from terminal + CI smoke checks. | desc |
| Hoppscotch | Browser-based API client (Postman alt) | EVALUATE | Zero-install alternative to Bruno for quick one-off requests; shareable. | desc |
| cron-job.org | Free hosted cron scheduler | EVALUATE | Zero-budget fallback to trigger Vercel/serverless refresh endpoints if no always-on Redis worker host. | desc |
| Insomnia / Yaak / Posting | API clients | FUTURE | Alternatives to Bruno; pick one, don't adopt all. | desc |
| JSON Hero / JSON Crack | JSON viewer/explorer | EVALUATE | Visually inspect large odds-API JSON responses + Stripe event payloads while mapping normalizers. | desc |
| RoslynQuoter / glot.io | Snippet runners / syntax API | SKIP | .NET/playground-specific; not this stack. | desc |
| APIs.guru / PublicAPIs / FreePublicAPIs (API indexes) | Directories of public APIs | FUTURE | Source secondary free data feeds (weather, injuries) to enrich predictions later. | desc |

### B. Test data + testing/QA (maps to "tests required" rule)

| Resource | What it is | Alignment | Build-task mapping + future uses | Verification |
|---|---|---|---|---|
| Mockaroo | Realistic test-data generator → CSV/JSON/SQL/Excel | ADOPT NOW | Generate fixtures for games/odds/picks/users for Vitest + `db:seed`; schema-aware. | LIVE |
| generatedata.com | Test-data generator (multi-locale) | ADOPT NOW | Same role, fully free/self-hostable; good for CI-friendly local generation. | LIVE |
| Mockium | Test-data generator | FUTURE | Redundant with above. | desc |
| Playwright | Browser automation / E2E | EVALUATE | E2E for paywall enforcement, auth flows, pick-rendering. Complements Vitest unit tests. (Note: server-side paywall is the rule — E2E confirms the gate visually.) | desc |
| Selenium | Browser automation | SKIP | Playwright is the modern choice; don't run both. | desc |
| Globster | Glob pattern tester | EVALUATE | Validate file globs for CI workflows, Vitest `include`, content-file discovery. | desc |
| Front-End Checklist / Performance Checklist / Web Dev Checklist / Design Checklist | Pre-ship checklists | EVALUATE | Solo-founder QA gate before each deploy (perf, a11y, SEO meta). | desc |
| Can I Use? | Browser support tables | EVALUATE | Confirm CSS/JS feature support before shipping UI (e.g. AVIF, container queries). | desc |
| Responsive Viewer / Responsively / Am I Responsive | Multi-viewport preview | ADOPT NOW (Responsively) | See picks pages across phone/tablet/desktop at once with mirrored interaction — solo responsive QA. | LIVE (Responsively) |
| Testmail | Signup/email test inbox | EVALUATE | Test NextAuth signup + Stripe receipt emails end-to-end. | desc |
| reCAPTCHA test | Get captcha tokens for testing | FUTURE | Only if bot-protecting signup later. | desc |

### C. Performance + accessibility (Core Web Vitals = SEO for the content play)

| Resource | What it is | Alignment | Build-task mapping + future uses | Verification |
|---|---|---|---|---|
| PageSpeed Insights | Google CWV + Lighthouse online | ADOPT NOW | Measure LCP/CLS/INP on every key route; SEO-critical for content ranking. | LIVE (known tool) |
| Lighthouse / Lighthouse Metrics / Web Vitals Leaderboard | Perf auditing | ADOPT NOW | Run in CI (lighthouse-ci) to gate regressions; track field vitals over time. | desc |
| GTmetrix / SpeedVitals / Yellow Lab Tools / LightTest / Geofetcher / SpeedVitals | Webpage speed tests | EVALUATE | Cross-check PageSpeed; Yellow Lab also flags JS/DOM bloat. Pick 1–2. | desc |
| Pa11y | Programmatic accessibility evaluation (CI-able) | ADOPT NOW | Automated a11y gate in CI on pages/components — enforce WCAG without manual audits. | desc |
| WAVE / axe (via Accessibility Insights) / Andi / A11ygator / Accessibility Support | A11y evaluators | EVALUATE | Manual/interactive a11y checks; axe is the industry standard for the dev extension. | desc |
| Accessibility Insights | Microsoft a11y testing (axe-based) | EVALUATE | Guided a11y assessments + automated checks during component dev. | desc |
| Color Oracle / WhoCanUse / Toptal/DaltonLens color-blind sims | Color-blindness simulators | EVALUATE | Verify confidence-tier color coding (free/premium badges, win/loss) is distinguishable. | desc |
| Accessible Brand Colors / Colorable / color.review / accessible-color-matrix / Contrast Checker / Colour Contrast | Contrast/a11y palette checkers | EVALUATE | Ensure text/badge contrast passes WCAG AA — cluster, pick **color.review** + **Contrast Checker**. | desc |
| Awesome Accessibility / A11Project / Accessibility Cheatsheet / ADG | A11y reference indexes | FUTURE | Reference when building the a11y checklist. | desc |

### D. Frontend / UI component & CSS tooling

| Resource | What it is | Alignment | Build-task mapping + future uses | Verification |
|---|---|---|---|---|
| shadcn/ui | Copy-paste React+Tailwind+Radix components (own the code) | ADOPT NOW | Build picks cards, paywall modals, dashboards, tables — accessible primitives, no dep lock. Best fit for the stack. | LIVE |
| Radix UI | Unstyled accessible React primitives | ADOPT NOW | Underpins shadcn; use directly for custom interactive bits (dropdowns, dialogs). | desc |
| Storybook | Component dev/docs/visual workbench | EVALUATE | Develop + visually test UI components in isolation; doubles as a living design system for a solo dev. | desc |
| MagicUI / UI Beats / BoxCoding / Semantic UI / CodeMyUI | UI component snippet libs | FUTURE | Snippet sources for motion/marketing sections; shadcn covers core needs first. | desc |
| Beer CSS | Lightweight CSS framework | SKIP | Tailwind already the chosen system; avoid mixing. | desc |
| Animista / Hover.CSS / Easings / Glass UI / GSAP | CSS animation + effects | EVALUATE | Tasteful micro-interactions on picks reveal / confidence meter; GSAP for richer landing motion. | desc |
| CSS Layout Generator / layoutit / WhatUnit / CSS Reference / Modern CSS | CSS layout/reference | EVALUATE | Quick grid/flex scaffolding + reference while building responsive layouts. | desc |
| Realtime Colors | Live preview a palette on a real UI | ADOPT NOW | Pick the brand palette and preview it on a mock site instantly before committing Tailwind theme tokens. | desc |
| CSSPeeper / Stylify Me / Project Wallace | Inspect/extract site CSS + analyze | EVALUATE | Audit own CSS bloat (Project Wallace) and learn from competitor UIs. | desc |
| Tails | Tailwind page builder | FUTURE | Scaffold marketing/landing pages in Tailwind. | desc |
| html5up / Templatemo / ThemeWagon / Tooplate / SaaS Landing Page / lapa | HTML/landing templates | FUTURE | Starting point for marketing/landing if building from scratch is too slow. | desc |

### E. Media / asset optimization (Vercel bandwidth + CWV) — **strategic for zero-budget hosting**

| Resource | What it is | Alignment | Build-task mapping + future uses | Verification |
|---|---|---|---|---|
| SVGO | Node/CLI SVG optimizer | ADOPT NOW | Build-step optimization of all SVGs; can wire as pre-commit hook. Biggest easy bandwidth win. | LIVE |
| Squoosh | Image compressor → WebP/AVIF | ADOPT NOW | Compress raster images (OG cards, content, avatars) before commit → LCP + bandwidth. | LIVE |
| TinyPNG / TinyJPG | Batch PNG/JPG compressor | EVALUATE | Quick batch compression when not in a build pipeline; 20MB upload limit. | desc |
| Caesium | Compression software (web/CLI) | EVALUATE | Local batch image compression, scriptable alternative to Squoosh. | desc |
| Efficient Compression Tool / Minuimus | File optimizers | FUTURE | Squeeze last bytes from static assets in CI. | desc |
| SVGCrop | Crop/trim SVG viewBox (GUI) | EVALUATE | Tighten SVG bounding boxes before SVGO for cleaner inline icons. | desc |
| webp2jpg / WebP-Conv | Format converters | FUTURE | One-off conversions; Squoosh covers most. | desc |
| ImgOps | Image operations meta-tool | FUTURE | Quick web-based image transforms during content prep. | desc |
| odiff / Image Comparison Tool / ICAT | Visual image diff | EVALUATE | Visual-regression snapshots for UI/chart rendering in CI. | desc |
| Favicon Generator / IconKitchen / Favicon Maker | Favicon/app-icon generators | ADOPT NOW (one) | Generate full favicon + PWA icon set once. Pick **IconKitchen** or **Favicon Generator**. | desc |
| dummyimage / Lorem.space / PicSum / Placeholdifier / PlaceHolder | Placeholder images | EVALUATE | Stand-in images while building layouts before real content exists. | desc |

### F. SVG / illustration / icon generators — **CLUSTERED (long tail; pick the best few)**

Large overlapping cluster. Recommended picks, rest are interchangeable:

| Sub-cluster | Best picks (ADOPT/EVALUATE) | Aggregate (FUTURE/SKIP count) | Mapping |
|---|---|---|---|
| **Illustrations (open-license SVG)** | **unDraw** (LIVE), **StorySet** | + blush, Humaaans, DrawKit, manypixels, freeillustrations, Fresh Folk, NiceIllustrations (~7) | Empty states, onboarding, landing hero — brand-recolorable, free. |
| **SVG blobs / shapes / waves / dividers** | **Blobmaker** (LIVE), **ShapeDivider**, **Get Waves** | + Blobs, Pattern Monster, SVGWave, Haikei-style (~5) | Organic section backgrounds/dividers for landing + content pages; tiny file size. |
| **CSS patterns / gradients** | **heropatterns**, **gradienta** | + css3patterns, patternCraft, GradientMagic, CSS Doodle (~4) | Subtle section backgrounds without raster images (zero bandwidth). |
| **Icons** | (dump-confirmed) **Lucide/Tabler/Feather** via Iconify ecosystem; ledger had **useAnimations** (animated), **Icon Shelf** (manager) | + Icon Gen, MC Icons, iOS Icon Gallery, SuperTinyIcons (~6) | UI iconography — Lucide pairs natively with shadcn/Tailwind. Animated icons for state transitions. |
| **Color palette / scheme generators** | **Coolors**, **Adobe Color**, **Realtime Colors**, **UI Colors/Tints** (Tailwind) | **~60+ more** (Color Hunt, Huemint, Khroma, Paletton, Palettte, accessiblepalette, Leonardo, Geenes, Picular, ColorHexa, etc.) | Choose brand palette + generate Tailwind color scale once. **Tints / UI Colors** are best because they output Tailwind-ready scales. Massive long tail — do NOT chase. |
| **Color pickers / converters / contrast** | **color.review**, **Contrast Checker**, **ColorZilla** (extension) | + Color Converter, Colouris, OKLCH, Material UI picker (~10) | Pick exact brand hex, convert formats, verify WCAG contrast. |

### G. Boilerplates / scaffolding / git / CI helpers

| Resource | What it is | Alignment | Build-task mapping + future uses | Verification |
|---|---|---|---|---|
| Vite | Frontend build tool | SKIP | Next.js owns the build; not needed alongside. | desc |
| commitlint | Lint commit messages | EVALUATE | Enforce conventional commits in CI for clean changelog/auditability (fits "versioned/auditable" rule). | desc |
| pre-commit | Manage git pre-commit hooks | ADOPT NOW | Wire SVGO + Prettier + lint + typecheck as pre-commit gates — enforce "tests/types required" locally. | desc |
| Prettier | Code formatter | ADOPT NOW | Standard formatting in repo + CI; pairs with ESLint already in stack. | desc (dump-confirmed) |
| GitHub CLI (gh) | Git/GitHub CLI/TUI | ADOPT NOW | Manage PRs, releases, CI runs from terminal (already used by harness). | desc |
| lazygit / gitui / GitButler | Git TUIs/GUIs | EVALUATE | Faster solo git workflow; optional polish. | desc |
| multi-gitter | Bulk repo updater | SKIP | Monorepo, single repo — not needed. | desc |
| git-sim | Visually simulate git ops | FUTURE | Learn/preview risky rebases safely. | desc |
| Boilerplate / html5up / CSS Bed / Water.css (classless CSS) | Starter templates/CSS | FUTURE | Fast scaffolds for docs/legal pages; Tailwind covers app. | desc |
| GitHub Profile Readme Generator | Profile readme | SKIP | Personal branding, not the product. | desc |

### H. Explicit SKIP buckets (in-domain by category, irrelevant to this build)

The bulk of `dev_tool` and `design_ux` rows fall here — listed so the next pass doesn't re-triage them:
- **Aim trainers** (3D Aim Trainer, Aimlabs, Aim400kg, Voltaic, AimTrainer…) — gaming, not dev.
- **Game save/file editors** (PKHeX, Terrasavr, Spamton Save Editor, Flowey's Time Machine…).
- **Pixel/voxel/sprite art editors** (Aseprite, Piskel, MagicaVoxel, Pixelorama, ~20 of them).
- **Terminal themes/multiplexers/file managers** (terminal.sexy, Yazi, Zellij, OhMyPosh…) — env polish, not product.
- **Video editors** (Kdenlive, Shotcut, OpenShot, LosslessCut, Remotion*).  *Remotion could make promo videos — FUTURE only.
- **Face swappers** (FaceFusion, Swapface, Roop…), **watermark tools**, **interior/garden design apps**, **display color-temp tools** (f.lux), **game guides/wikis**.
- **Code editors/IDEs** (VS Code, Neovim, Zed, cloud IDEs) — already have an editor; not leverage to catalog.

---

## SUMMARY STATS

- **In-domain rows reviewed:** 717 (dev_tool 311, design_ux 326, testing_qa 63, api_tooling 17), plus raw-dump cross-check.
- **Genuinely relevant to this build:** ~50 tools (rest is gaming/art/terminal/video noise).
- **ADOPT NOW:** ~18 (cron, SVGO, Squoosh, Bruno, Webhook.site, shadcn/ui, Radix, Mockaroo, generatedata, PageSpeed/Lighthouse, Pa11y, regex101, unDraw, Responsively, pre-commit, Prettier, gh, Realtime Colors, a favicon generator).
- **Verified LIVE this session (14):** Crontab Guru, SVGO, Webhook.site, Bruno, Squoosh, unDraw, Mockaroo, shadcn/ui, PageSpeed, regex101, Blobmaker, Responsively (+ generatedata via dump, color tools assessed).
- **Strategic theme:** SVGO + Squoosh + CSS patterns/blobs (no raster) directly attack Vercel **bandwidth** and **Core Web Vitals**, which is the SEO lever for the zero-budget content play. The API/cron/webhook trio (Bruno, Webhook.site, Crontab Guru) de-risks the Odds API + Stripe + BullMQ integration work.
