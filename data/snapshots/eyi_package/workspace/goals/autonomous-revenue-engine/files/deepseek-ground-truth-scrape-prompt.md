# DEEPSEEK GROUND-TRUTH PROMPT — "Scrape Everything"
**Purpose:** the third research wave. Foundation (15 tracks) built the floor. Extreme (7 tracks) went beyond it. THIS wave goes into the real world: DeepSeek self-scrapes a minimum of 30 live websites — competitors, tools, award-winners, infrastructure — and extracts structured, quoted, date-stamped intelligence from each. No summaries of summaries. Ground truth.
**Standard (Garrett):** OCD-level, meticulous dedication to being the best. Skimming is failure. Every site gets the full schema or it doesn't count toward the 30.
**File:** `~/workspace/your_files/deepseek-ground-truth-scrape-prompt.md` · agent bus `inbox/from-motif/DEEPSEEK-GROUND-TRUTH-SCRAPE-PROMPT.md`

---

# THE PROMPT (paste below this line)

## ROLE

You are a ground-truth intelligence instrument for a studio with an OCD-level, meticulous dedication to being the best. You have web browsing. Use it like a field researcher, not a search engine. Your job: visit a minimum of 30 live websites, extract structured intelligence from each using the mandatory schema below, then synthesize across all 30 into patterns, gaps, and novel combinations nobody has tried. Everything you assert must be traceable to a page you actually visited, quoted, and date-stamped. If you didn't visit it, you don't know it.

## THE STANDARD (read first — this is graded)

- **Skimming is failure.** A site dossier built from a homepage headline and a meta description is worthless. Minimum 3 pages per site: homepage, pricing page, and one deep page (docs, features, showcase, or changelog). Quote actual numbers. Name actual features.
- **30 is the floor, not the ceiling.** Scrape every site on the target list below, plus any additional relevant site you discover during research. There is no upper bound. But every site beyond 30 gets the same full schema — no drive-by mentions.
- **Integrity over coverage.** If a page is JS-blocked, paywalled, or dead: mark the field UNVERIFIED, note what you tried, and (for dead sites) substitute the closest live equivalent and log the swap. Never invent pricing, features, or tech stack. Never write "competitive pricing" — either quote the number or mark it unfound.
- **Self-score.** After each batch of 10 sites, grade your own dossiers 1–10 for completeness and re-scrape anything below 8.

## TARGET LIST (minimum 30 — scrape all, in this order)

### A. AI site builders (10)
1. wix.com — Wix Harmony (AI builder, Aria agent)
2. durable.co — 30-second AI sites for service businesses
3. 10web.io — automated WordPress AI builder
4. framer.com — Framer AI page generation
5. webflow.com — Webflow AI features
6. lovable.dev — prompt-to-app builder
7. bolt.new — in-browser AI dev environment
8. v0.dev — Vercel's AI interface generator
9. weinc.ai — prompt-to-production-website with white-label
10. lindo.ai — white-label AI website builder for agencies

### B. Immersive / award-winning studios (8)
11. unseen.co — Unseen Studio (our reference bar; dissect everything)
12. activetheory.net — Active Theory (creative dev studio)
13. resn.co.nz — Resn (immersive digital experiences)
14. hellomonday.com — Hello Monday (design + technology)
15. basicagency.com — Basic/Dept (brand + digital)
16. locomotive.ca — Locomotive (web design studio)
17. darkroom.engineering — Darkroom Engineering (Studio Freight; scroll/animation craft)
18. awwwards.com — Awwwards itself (what wins NOW: scrape 10 recent Site of the Day winners and log the patterns — this counts as deepening, not as one site)

### C. 3D / capture / render tools (7)
19. poly.cam — Polycam (LiDAR, photogrammetry, splats; pricing tiers)
20. lumalabs.ai — Luma AI (capture + generation)
21. kiriengine.app — Kiri Engine (phone photogrammetry)
22. matterport.com — Matterport (digital twins; Pro3, pricing)
23. sparkjs.dev — Spark (World Labs Gaussian Splatting renderer; docs, examples)
24. playcanvas.com — PlayCanvas (web 3D engine; pricing, features)
25. spline.design — Spline (browser 3D design tool; pricing, collaboration)

### D. Commerce / license / infrastructure (5)
26. keygen.sh — Keygen (software licensing API; pricing, features)
27. cryptolens.io — Cryptolens (licensing alternative; pricing)
28. medusajs.com — Medusa (headless commerce; pricing, features)
29. stripe.com — Stripe (billing, tax, radar; pricing pages for each)
30. resend.com — Resend (transactional email; pricing, deliverability claims)

**Substitution rule:** if any URL is dead, blocked, or acqui-hired into oblivion, substitute the closest live equivalent, log the swap with the date, and keep going. The count must stay at 30+.

## PER-SITE EXTRACTION SCHEMA (mandatory — every field, every site)

```
## SITE N: [name] — [url]
**Visited:** [date]
**One line:** [what it is, in your own words — 15 words max]

**Pricing (quoted, not paraphrased):**
- [Tier name]: $[X]/[mo|yr] — [limits: projects, users, bandwidth, builds] — [overage policy]
- Free tier: [what's actually free vs trial]
- Pricing page gaps: [what they hide — e.g., "enterprise = contact us", "no overage listed"]

**Features (enumerated capabilities, not marketing prose):**
- [feature]: [what it actually does, in concrete terms]

**Tech signals:**
- Detectable stack: [framework, hosting, CDN, analytics — from docs, status pages, job posts, page source hints]
- Developer surface: [API? webhooks? CLI? embeds? white-label?]

**UX / conversion patterns (from actually navigating the site):**
- Homepage structure: [hero pattern, social proof placement, CTA hierarchy]
- Signup/onboarding friction: [steps to value, what they ask for, where they gate]
- Notable interactions: [anything in the experience design worth stealing]

**Positioning (their words):**
- Headline (quoted): "[...]"
- Who they target: [evidence from copy, case studies, pricing]

**Gaps (exploitable weaknesses):**
- [What's missing, weak, slow, confusing, or overpriced — be specific and cruel]

**Verdict:** STEAL (copy/adapt now) / WATCH (track quarterly) / IGNORE (and why) — one line.
**Completeness self-score:** [1–10]
```

## THE LOOP (same extreme loop, plus scrape discipline)

Research → **Scrape** (visit, extract per schema) → Verify (cross-check pricing/features against docs or second page) → Test (where testable: run their interactive demo, use the free tier, read the actual docs page) → Improve (attack your own dossier: what did you miss?) → Review (read as the engineer implementing Monday) → Polish → **Red-team** (assume your synthesis is wrong — why?) → **Stellman** (strongest case that scraping competitors is a waste vs building) → **10x** ("what would 10× better than the best site scraped look like?").

Deliver in batches of 10 sites. Each batch: 10 complete dossiers + batch synthesis. Then continue. Depth beats coverage — 10 complete dossiers beat 30 shallow ones, but the floor is 30 complete.

## SYNTHESIS DELIVERABLES (after all sites scraped)

### 1. Feature matrix
30+ sites × the 25 most important features (rows = sites, columns = features, cells = yes/no/partial + note). As a markdown table. No site gets a free pass — empty cells mean you didn't scrape deep enough.

### 2. Pricing benchmark
Every product's tiers in one table: price points, limits, overages, free-tier generosity ranked. Answer: where is the pricing umbrella (everyone overcharges)? Where is the race to the bottom? Where would OUR pricing ($350 sites, $49/mo receptionist, $29–79 products) sit — and who does it undercut?

### 3. Tech census
What stacks dominate (frameworks, hosting, 3D engines, analytics)? What's the default architecture of a 2026 web product? What's exotic (and does the exotic win)?

### 4. Gap map
Three lists, each with evidence (which sites prove the gap by lacking it):
- Features NOBODY has (across all 30)
- UX patterns NOBODY uses
- Prices nobody charges / tiers nobody offers

### 5. SYNTHESIS LAB (the creativity layer — minimum 10)
Novel combinations: take feature X from site A + pattern Y from site B (+ constraint Z from our doctrine) = a thing nobody sells. Each gets: the combination, why nobody's done it, what it would take to ship (30-day prototype?), expected value. **At least 10. If they're all obvious, do 10 more.** This is where innovation comes from — not from single sites, from collisions.

### 6. Top 10 steals
Ranked by expected value (impact × probability ÷ cost). Each: what to steal, from whom, how to adapt it to OUR doctrine (cinematic, 9.2 bar, local-business clients), what it costs to implement.

### 7. Bible amendments
Ready-to-paste amendments to our build doctrine: which section, exact text, why — grounded in scraped evidence (cite the sites).

### 8. Roadmap
30-day (prototypes from the steals), 90-day (shipped features), 12-month (structural advantages). Sequenced, dependencies marked.

## ANTI-SLOP + INTEGRITY CONTRACT

- Every price quoted or marked unfound. Every feature traced to a visited page. Every visit date-stamped.
- Banned: "competitive pricing", "robust features", "seamless UX", "user-friendly", and any adjective doing the work of a number.
- No site dossier under 300 words counts toward the 30.
- If you catch yourself writing the same gap for the 5th time, you're skimming — go deeper on the next site.
- Take positions. The verdicts have no "maybe". STEAL / WATCH / IGNORE — one line, with the reason.

## BEGIN

Start with batch 1: sites 1–10 (the AI site builders). Ten complete dossiers per the schema, then batch synthesis, then continue to 11–20. The loop runs until it's right.

# (END PROMPT)
