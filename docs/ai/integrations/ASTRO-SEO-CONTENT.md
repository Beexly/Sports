# Astro: Sports Pick SEO Content Engine

> Source: `withastro/astro` (MIT, 47k★)
> Purpose: Static-generate every pick as an indexable, shareable URL — sports betting has $2–15 CPC keywords, and organic traffic compounds monthly while paid CAC stays fixed

## What This Solves

GSN's current state: all pick content is behind auth. Zero pages Google can index. Zero organic search traffic. Every subscriber is acquired via paid channels (social ads, influencer) at fixed CAC.

The opportunity: sports betting SEO is underserved. "Chiefs spread pick week 14" gets searched 5,000x/month with DR 20 sites ranking in the top 3. Every GSN pick, if published as a static page, is a potential #1 ranking that drives free trial signups.

**The math**: 
- 100 picks/week × 50 searches/pick/month = 5,000 monthly searches
- At 30% CTR (first result) = 1,500 visitors/month
- At 2% trial conversion = 30 new free trials/month
- At 15% paid conversion = 4-5 new subscribers/month from zero ad spend
- At $29/month = $1,740/month recurring from SEO alone
- Compounds monthly as more picks get indexed

Astro builds the public content layer on top of GSN's existing data without touching the Next.js app.

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| Next.js (Vercel) | Authenticated app (picks feed, dashboard, payments) |
| PostHog | User behavior analytics (conversion funnel) |
| n8n | Workflow automation (email, social) |
| **Astro** | **Public SEO site — free picks, team analysis, pick history** |

Astro and Next.js serve different routes. Astro → `picks.your-domain.com` or `/blog/*` and `/picks/public/*`. Next.js → the authenticated `/dashboard`, `/picks` (gated), payment flows.

## Architecture

```
picks.your-domain.com (Astro, static, Cloudflare Pages)
  ├── /picks/nfl/                    → Today's NFL picks (partial, teaser)
  ├── /picks/nfl/chiefs-vs-raiders/  → Individual pick page (JSON-LD structured data)
  ├── /picks/nba/                    → Today's NBA picks
  ├── /results/                      → Historical WIN/LOSS record (trust signal)
  ├── /blog/                         → Pick analysis articles
  └── /free-pick/                    → Email capture: "Get today's free pick"

your-domain.com (Next.js, Vercel)
  ├── /dashboard                     → Authenticated picks feed
  ├── /pricing                       → Upgrade flow
  └── /api/*                         → API routes
```

Data flow: Astro fetches from GSN's internal API at build time (ISR: rebuild every hour). New picks appear on the public site automatically.

## Installation

```bash
# In a new package: packages/seo-site/
npm create astro@latest packages/seo-site -- --template minimal --typescript strict
cd packages/seo-site
npx astro add tailwind
npx astro add sitemap
```

## GSN Use Case 1: Individual Pick Pages with JSON-LD

Each pick page is a self-contained SEO asset. Google's SportsEvent structured data schema gets these into rich results.

**`packages/seo-site/src/pages/picks/nfl/[slug].astro`**:

```astro
---
import Layout from '../../layouts/Layout.astro';
import PickCard from '../../components/PickCard.astro';
import { getPublicPicks } from '../../lib/picks';

export async function getStaticPaths() {
  // Fetch this week's free-tier picks from GSN's internal API
  const picks = await getPublicPicks({ tier: 'FREE', limit: 100 });
  return picks.map((pick) => ({
    params: { slug: pick.slug },  // e.g. "chiefs-vs-raiders-spread-week-14"
    props: { pick },
  }));
}

const { pick } = Astro.props;

// JSON-LD structured data — Google indexes this for rich results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": `${pick.awayTeam} vs ${pick.homeTeam}`,
  "startDate": pick.gameDate,
  "location": { "@type": "SportsActivityLocation", "name": pick.venue },
  "homeTeam": { "@type": "SportsTeam", "name": pick.homeTeam },
  "awayTeam": { "@type": "SportsTeam", "name": pick.awayTeam },
  "sport": pick.sport,
  "description": `Expert pick for ${pick.awayTeam} vs ${pick.homeTeam}: ${pick.selection} (${pick.spread > 0 ? '+' : ''}${pick.spread}). ${pick.publicRationale}`,
  "offers": {
    "@type": "Offer",
    "name": "Premium picks with full analysis",
    "url": "https://your-domain.com/pricing",
    "price": "29",
    "priceCurrency": "USD"
  }
};
---

<Layout
  title={`${pick.awayTeam} vs ${pick.homeTeam} Pick | ${pick.sport.toUpperCase()} Week ${pick.week}`}
  description={`Expert ${pick.sport} pick: ${pick.awayTeam} vs ${pick.homeTeam}. ${pick.selection} (${pick.spread > 0 ? '+' : ''}${pick.spread}). ${pick.publicRationale.slice(0, 140)}...`}
>
  <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />

  <PickCard pick={pick} />

  <!-- Paywall teaser: show selection, hide full analysis -->
  <div class="pick-teaser">
    <p class="selection">Our Pick: <strong>{pick.selection}</strong></p>
    <p class="confidence">Confidence: {pick.confidence}%</p>
    <div class="locked-content">
      <p>Full analysis, key factors, and betting recommendation</p>
      <a href="https://your-domain.com/pricing" class="cta">
        Unlock Full Analysis — Free Trial
      </a>
    </div>
  </div>
</Layout>
```

**`packages/seo-site/src/lib/picks.ts`**:

```typescript
export async function getPublicPicks({ tier = 'FREE', limit = 50 } = {}) {
  // Hit GSN's internal API (runs during Astro build or ISR)
  const res = await fetch(
    `${import.meta.env.GSN_INTERNAL_API_URL}/api/picks/public?tier=${tier}&limit=${limit}`,
    { headers: { 'x-internal-key': import.meta.env.GSN_INTERNAL_API_KEY } }
  );
  return res.json();
}
```

## GSN Use Case 2: Results Page (Trust Signal)

A public win/loss record is the highest-converting trust signal for a picks service. Showing it openly, sorted by recency, is counter-intuitively better than hiding losses.

```astro
---
// pages/results/index.astro
import { getPickResults } from '../lib/picks';
const results = await getPickResults({ limit: 100 });

const wins = results.filter(r => r.outcome === 'WIN').length;
const losses = results.filter(r => r.outcome === 'LOSS').length;
const pushes = results.filter(r => r.outcome === 'PUSH').length;
const winRate = ((wins / (wins + losses)) * 100).toFixed(1);
---

<h1>Pick Results — {winRate}% Win Rate</h1>
<p>{wins}W-{losses}L-{pushes}P (Last {results.length} picks)</p>

{results.map(result => (
  <div class={`result ${result.outcome.toLowerCase()}`}>
    <span>{result.awayTeam} @ {result.homeTeam}</span>
    <span>{result.selection}</span>
    <span class="outcome">{result.outcome}</span>
  </div>
))}
```

Google values freshness. Daily updated results pages rank well for "sports picks record", "betting picks results", "[analyst name] record."

## GSN Use Case 3: Free Pick Email Capture

Convert organic SEO visitors to email subscribers before asking for payment.

```astro
---
// pages/free-pick/index.astro
// This page offers today's #1 free pick in exchange for an email address
---

<h1>Get Today's Free NFL Pick</h1>
<form action="/api/email-capture" method="POST">
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Send Me Today's Pick</button>
</form>
```

The API endpoint (`/api/email-capture` in Next.js) stores the email in your CRM and sends the free pick via Resend. This starts the react-email drip sequence.

## GSN Use Case 4: Blog / Analysis Articles

Long-form content ranks for research keywords ("how to bet NFL spreads", "what is a moneyline bet", "best NFL betting strategies"). Each article links to current pick pages.

```astro
---
// pages/blog/[slug].astro — pulls from a content collection
import { getCollection } from 'astro:content';
export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({ params: { slug: post.slug }, props: { post } }));
}
const { post } = Astro.props;
const { Content } = await post.render();
---

<article>
  <h1>{post.data.title}</h1>
  <Content />
  <!-- CTA after every article -->
  <a href="https://your-domain.com/pricing">Get Expert Picks — Free Trial</a>
</article>
```

Blog posts: write 1/week, 1,000-2,000 words. Topics:
- "How We Analyze NFL Spreads" (rank for "NFL spread analysis")
- "Chiefs vs Raiders: Week 14 Breakdown" (rank for specific matchup searches)
- "How AI Sports Picks Work" (rank for "AI sports picks")
- "Our Pick Record: [Month] Recap" (rank for "[site name] review")

## Deployment: Cloudflare Pages (Free)

Deploy Astro to Cloudflare Pages (free tier: unlimited sites, 500 builds/month):

```bash
# In packages/seo-site/wrangler.toml
[pages]
name = "gsn-seo-site"

# Build command:
npx astro build

# Output dir:
dist/
```

```bash
# Deploy:
wrangler pages deploy dist/ --project-name gsn-seo-site

# Set custom domain in Cloudflare Pages dashboard:
# picks.your-domain.com → gsn-seo-site
```

**Incremental Static Regeneration (ISR):** Astro's `hybrid` mode can rebuild individual pages every hour via `export const revalidate = 3600` — new picks appear on the public site within 60 minutes of generation.

## Sitemap Configuration

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://picks.your-domain.com',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/api/'),
      changefreq: 'hourly',
      priority: 0.9,
    }),
  ],
});
```

Submit sitemap to Google Search Console: `https://picks.your-domain.com/sitemap-index.xml`

## SEO Target Keywords (Immediate)

These are low-competition, high-intent queries GSN can rank for in 30-90 days:

| Keyword | Monthly Volume | Competition | Value |
|---|---|---|---|
| `[away team] vs [home team] pick` | 200-2k per game | LOW | Direct buy intent |
| `nfl week [N] picks` | 5k-50k | MEDIUM | High volume |
| `[team] spread pick today` | 100-500 per team | LOW | High intent |
| `ai sports picks` | 3k | LOW | GSN's differentiator |
| `best picks today` | 10k | MEDIUM | High volume |
| `nfl picks this week free` | 8k | MEDIUM | Free trial conversions |

## Environment Variables

```bash
# In packages/seo-site/.env
GSN_INTERNAL_API_URL=https://your-domain.com
GSN_INTERNAL_API_KEY=...  # Secret key for internal API access

# In Cloudflare Pages environment variables:
GSN_INTERNAL_API_URL=https://your-domain.com
GSN_INTERNAL_API_KEY=...
```

## Status

- [ ] `npm create astro@latest packages/seo-site -- --template minimal --typescript strict`
- [ ] Add `packages/seo-site` to turborepo `turbo.json`
- [ ] Create GSN internal API route: `/api/picks/public` (returns FREE tier picks, no auth)
- [ ] Build `[slug].astro` pick page with JSON-LD structured data
- [ ] Build `/results/` win-loss record page
- [ ] Build `/free-pick/` email capture page (connects to Resend drip via react-email)
- [ ] Add sitemap integration + submit to Google Search Console
- [ ] Deploy to Cloudflare Pages (free): `wrangler pages deploy dist/`
- [ ] Set custom domain: `picks.your-domain.com`
- [ ] Write first 3 blog articles (NFL spread analysis, AI picks explainer, record recap)
- [ ] Verify: Google Search Console shows GSN pages indexed within 72 hours
