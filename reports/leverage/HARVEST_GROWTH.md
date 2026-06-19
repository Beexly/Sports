# HARVEST_GROWTH.md — Growth / Engagement / Shareability / SEO-AEO Feature Mine

_Research date: 2026-06-19. Galaxy Sports Edge (GSE) — Next.js 14 / TypeScript._

---

## GSE BASELINE — what already exists (skip unless noting a GAP)

| Feature | Status |
|---|---|
| Default OG image | `app/opengraph-image.tsx` — Satori/ImageResponse, edge runtime, 1200×630, brand-designed |
| Per-matchup OG | `app/performance/opengraph-image.tsx` — second slot only; **gap: no per-pick opengraph-image.tsx in `/preview/[sport]/[slug]/`** |
| Organization + WebSite JSON-LD | Root `layout.tsx` — with `SearchAction` / SiteLinksSearchBox |
| SportsEvent + FAQPage + BreadcrumbList JSON-LD | `lib/seo/sports-jsonld.ts` — generated per matchup preview page |
| Sitemap | `app/sitemap.ts` — dynamic, includes journal + preview game routes |
| robots.txt | `app/robots.ts` — crawl gates for cockpit/admin/api |
| RSS feeds | `app/journal/rss.xml/route.ts`, `app/stats/media/rss`, `app/admin/statking/rss` — **journal feed exists; picks feed is a gap** |
| PWA manifest | `public/site.webmanifest` — standalone display, brand colors, SVG icons |
| Service worker / offline | **NOT found** — manifest exists but no `sw.js` / Serwist; install prompt may fail |
| Web push | **NOT found** |
| Share widgets | **NOT found** — no share buttons, copy-link, or Web Share API in codebase |
| QR codes | **NOT found** |
| llms.txt / AEO | **NOT found** |
| Referral mechanics | **NOT found** |
| Embed widget | **NOT found** |
| ViewTransition API | **NOT found** in next.config |
| Article / HowTo / ItemList JSON-LD | **NOT found** — SportsEvent/FAQ/Breadcrumb exist; Article on blog/journal pages is a gap |

---

## TOP 10 COPY-NOW (ranked by leverage × effort)

### 1. Dynamic Per-Pick / Per-Game OG Image
**Adopt-mode: COPY-NOW (TS-native, keyless)**
`@vercel/og` (Satori) is already a Next.js 14 built-in — GSE already uses it for the root and performance pages.

Gap: `/preview/[sport]/[slug]/opengraph-image.tsx` does NOT exist. Every matchup share on X/Reddit currently falls back to the generic brand card, losing the "show the actual pick" moment that drives clicks.

What to copy: Place an `opengraph-image.tsx` colocated inside `app/preview/[sport]/[slug]/`. Access `params` (sport + teams) and fetch the pick from DB to render the team names, confidence score, model line, and GSE brand in JSX → PNG at edge. Keep the edge runtime constraint (Flexbox only, no Grid). Mirror the pattern in `app/opengraph-image.tsx` — same gradient treatment, add the pick card data overlay.

GSE surface: `app/preview/[sport]/[slug]/`
Effort: ~2–3 hours (the hardest part, data fetch + design, is already patterned)
License/cost: MIT (Next.js built-in, no extra dep)
Reference: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image

---

### 2. Share Buttons (X/Threads/Reddit/Bluesky + Copy-Link + Web Share API)
**Adopt-mode: COPY-NOW (TS-native, keyless)**

`react-share` v5.3.0 (MIT, March 2026) ships `XShareButton`, `ThreadsShareButton`, `BlueskyShareButton`, `RedditShareButton`, `TelegramShareButton`, `WhatsAppShareButton` — 25+ platforms, zero external scripts, tree-shakeable, React 17/18/19 compatible.

Pair with a `navigator.share()` wrapper: on mobile (91% support), call `navigator.share({ title, text, url })`; fall back to the `react-share` button grid on desktop. Add a copy-link button using `navigator.clipboard.writeText()`.

GSE surface: A `<ShareBar pick={pick} url={canonicalUrl} />` component dropped into every `/preview/[sport]/[slug]` page, the picks board cards (free tier), and the daily journal entries. Keep it out of the paywall; shareability is a growth channel.
Effort: 2–3 hours (install + component + tests)
License/cost: MIT — https://github.com/nygardk/react-share
Reference: https://www.npmjs.com/package/react-share

---

### 3. PWA Service Worker + Offline Shell (Serwist)
**Adopt-mode: COPY-NOW (TS-native, keyless)**

GSE already has `site.webmanifest` (standalone display) — the add-to-homescreen prompt will appear but silently fail without a service worker. Serwist (MIT, Workbox fork designed for Next.js) is the 2025 successor to the archived `next-pwa`.

What to add:
- `npm install @serwist/next serwist`
- `next.config.ts`: wrap with `withSerwist({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' })`
- `app/sw.ts`: `import { defaultCache } from '@serwist/next/worker'` — stale-while-revalidate for picks pages, cache-first for static assets
- PWA install prompt component: detect `beforeinstallprompt`, show a tasteful "Install Galaxy Sports Edge" card

Offline value for a sports pick site: yesterday's picks + performance stats stay readable on spotty stadium Wi-Fi.

GSE surface: `next.config.ts` + new `app/sw.ts` worker + optional `<PwaInstallBanner />` component
Effort: 3–4 hours
License/cost: MIT — https://github.com/serwist/serwist
Reference: https://javascript.plainenglish.io/building-a-progressive-web-app-pwa-in-next-js-with-serwist-next-pwa-successor-94e05cb418d7

---

### 4. Web Push Notifications (VAPID / web-push — no Firebase, no OneSignal)
**Adopt-mode: COPY-NOW (TS-native, keyless)**

GSE's Elite tier promises "real-time email & push alerts." This is the push half, fully self-hosted.

Stack: `npm install web-push` (MIT). Generate VAPID keys once: `npx web-push generate-vapid-keys`. Store as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` env vars.

Implementation pattern:
1. Service worker (`public/sw.js`) — `push` event listener → `showNotification()`; `notificationclick` opens the pick URL.
2. `app/api/push/subscribe/route.ts` — stores `PushSubscription` JSON in DB (new `PushSubscription` Prisma model, indexed by userId).
3. `app/api/push/send/route.ts` (internal) — called by the picks worker after publishing; uses `webpush.sendNotification()`.
4. Client context provider: checks `Notification.permission`, calls `registration.pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY })`.
5. Guards: only Elite subscribers receive push; check `getEntitlements()` server-side before storing subscription and before sending.

Pairs with Serwist (item 3) since the service worker file overlaps.

GSE surface: `workers/` picks publish step + new API routes + Elite-gated client context
Effort: 6–8 hours
License/cost: `web-push` is MIT — https://github.com/web-push-libs/web-push
Reference: https://blog.designly.biz/push-notifications-in-next-js-with-web-push-a-provider-free-solution

---

### 5. llms.txt + AI-Crawler Robots Controls (AEO)
**Adopt-mode: COPY-NOW (TS-native, keyless)**

Vercel, Anthropic, Stripe, GitHub, OpenAI all publish `llms.txt`. The GSE content (picks reasoning, methodology, calibration) is exactly what AI answer engines should surface when asked "best transparent sports prediction site."

Two complementary tools (both MIT):

**Option A — @turbodocx/next-plugin-llms** (MIT): Next.js build plugin that scans `app/` for page files, extracts metadata from layouts, and emits `public/llms.txt` + `public/llms-full.txt` at build time. Zero-config start; customizable via pattern matching and priority levels. Repo: https://github.com/TurboDocx/next-plugin-llms

**Option B — Hand-rolled route handler** (`app/llms.txt/route.ts`): Returns a curated markdown document listing GSE's public surfaces, pick format, methodology, calibration stats, and anti-tout stance. More control; ensures the AI description matches brand voice. Reference: https://llms-txt.io/blog/how-to-add-llms-txt-to-nextjs-react

Also add `robots.txt` AI-crawler directives:
- Allow `GPTBot`, `ClaudeBot`, `PerplexityBot` on the public `/methodology`, `/performance`, `/ledger`, `/board` pages
- Disallow on `/cockpit`, `/admin`, `/api`

GSE surface: `app/llms.txt/route.ts` (or build plugin) + `app/robots.ts` update
Effort: 2–4 hours
License/cost: MIT (plugin) / zero-dep (hand-rolled)
Reference: https://www.tryprofound.com/blog/next-aeo; https://github.com/TurboDocx/next-plugin-llms

---

### 6. QR Share Codes on Pick Cards and Matchup Pages
**Adopt-mode: COPY-NOW (TS-native, keyless)**

`qrcode` npm (MIT, node-soldair, 1M+ weekly downloads, browser + Node + React Native) generates QR codes as SVG strings or data URIs in the browser — zero API calls, zero keys.

```ts
import QRCode from 'qrcode'
const svg = await QRCode.toString(canonicalUrl, { type: 'svg' })
```

Render a small `<QRCode />` component on each pick card and matchup page. On click or hover, a popover shows the code full-size. Enables physical share (screenshot → scan), TV/stream lower-thirds, printed media-kit mockups.

GSE surface: `components/picks/PickCard.tsx`, `app/preview/[sport]/[slug]/page.tsx`
Effort: 2 hours
License/cost: MIT — https://github.com/soldair/node-qrcode
Reference: https://www.npmjs.com/package/qrcode

---

### 7. Picks RSS/Atom Feed (Subscribers, Aggregators, Zapier)
**Adopt-mode: COPY-NOW (TS-native, keyless)**

GSE has a journal RSS feed and a statking RSS route. There is NO picks feed. A FeedSpot search shows 35 NFL Betting RSS feeds are actively aggregated — being in aggregators is free distribution.

```ts
// app/picks/feed.xml/route.ts
import { Feed } from 'feed'  // MIT, ~300 downloads/day
const feed = new Feed({ ... })
picks.forEach(p => feed.addItem({
  title: `${p.awayTeam} vs ${p.homeTeam} — ${p.pickType} ${p.line}`,
  link: canonicalUrl(p),
  description: `Confidence: ${p.confidence}/100. ${p.reasoning}`,
  date: new Date(p.generatedAt),
  category: [{ name: p.sport }],
}))
return new Response(feed.atom1(), { headers: { 'Content-Type': 'application/atom+xml' } })
```

Free-tier picks only in the public feed; premium picks behind a feed-token param stored per subscription in DB.

GSE surface: `app/picks/feed.xml/route.ts` + link rel="alternate" in picks page metadata
Effort: 2–3 hours
License/cost: `feed` npm is MIT — https://github.com/jpmonette/feed
Reference: https://rss.feedspot.com/nfl_betting_rss_feeds/; https://lev.engineer/blog/crafting-an-rss-feed-with-next-js-14

---

### 8. Article / ItemList JSON-LD on Journal and Blog Pages
**Adopt-mode: COPY-NOW (TS-native, keyless)**

GSE has `SportsEvent`, `FAQPage`, and `BreadcrumbList` schemas on matchup pages. Missing: `Article` schema on journal/blog entries and `ItemList` on the picks board — both are eligible for Google rich results.

For journal entries:
```json
{
  "@type": "Article",
  "headline": "...",
  "datePublished": "2026-06-19",
  "dateModified": "2026-06-19",
  "author": { "@type": "Person", "name": "Garrett Baxley" },
  "publisher": { "@type": "Organization", "name": "Galaxy Sports Edge", "logo": "..." },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://..." }
}
```

For the picks board:
```json
{
  "@type": "ItemList",
  "name": "Today's Sports Picks",
  "numberOfItems": 5,
  "itemListElement": [{ "@type": "ListItem", "position": 1, "url": "...", "name": "..." }]
}
```

The existing `buildFaqJsonLd` pattern in `lib/seo/sports-jsonld.ts` is the right pattern to extend.

GSE surface: `app/journal/[slug]/page.tsx`, `app/board/page.tsx`, `lib/seo/sports-jsonld.ts`
Effort: 2–3 hours
License/cost: Zero — schema.org is free
Reference: https://schema.org/Article; https://www.digitalapplied.com/blog/structured-data-seo-2026-rich-results-guide

---

### 9. View Transitions API (Native Page Animations)
**Adopt-mode: COPY-NOW (TS-native, keyless)**

Next.js 14+ ships `experimental.viewTransition: true` in `next.config.ts`. No library needed (React's `unstable_ViewTransition` wraps the browser-native API). Progressive enhancement: Chrome/Edge/Opera animate; Safari/Firefox fall back to instant navigation.

Key use: picks board → pick detail, journal list → journal entry. Apply `viewTransitionName` CSS to the pick card so the card morphs into the detail view — same "magical" transition pattern that made iOS 16 feel fast.

```ts
// next.config.ts
experimental: { viewTransition: true }
```

```tsx
// pick card (list view)
<div style={{ viewTransitionName: `pick-card-${pick.id}` }}>
// pick detail page (same name)
<div style={{ viewTransitionName: `pick-card-${pick.id}` }}>
```

GSE surface: `next.config.ts` + picks board + pick detail pages
Effort: 2–4 hours (initial setup fast; polish of animation curves takes longer)
License/cost: Built into Next.js — MIT
Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition

---

### 10. Self-Rolled Referral / UTM Cookie Tracking
**Adopt-mode: COPY-NOW (TS-native, keyless)**

No need for Viral Loops, ReferralHero, or Dub.co (AGPL — skip). A lightweight Prisma-native referral system:

1. Middleware captures `?ref=<code>` and `utm_*` params on every request; stores in a 30-day cookie.
2. New `Referral` model in Prisma: `{ code, referrerId, clicks, conversions, rewardGranted }`.
3. On signup (`NextAuth` `onSignUp` hook): read cookie, write referral record.
4. A founder/admin page shows "Your referral link: galaxysportsedge.com?ref=abc123" with a copy button.
5. Conversion reward: move subscriber up on founding tier queue, or gift 7-day Pro trial.

Pattern reference (MIT): https://github.com/mddanishyusuf/traffic-source — open-source web analytics with referrer + UTM + affiliate tracking, Prisma + Next.js native.

GSE surface: `apps/web/middleware.ts` + new Prisma model + `app/api/referral/` routes + cockpit referral view
Effort: 6–10 hours
License/cost: Zero (no third-party service), traffic-source repo MIT
Reference: https://dev.to/whoffagents/building-a-viral-waitlist-with-nextjs-prisma-and-resend-with-referral-tracking-11oc

---

## FULL CATALOGUE (items 11–30)

### 11. Dynamic html-to-image "Pick Card Download" (Client-Side)
**Adopt-mode: COPY-NOW (TS-native, keyless)**

`html-to-image` (MIT fork of dom-to-image) converts a rendered React pick card to PNG in the browser — no server, no API key. User clicks "Download Card" → gets an Instagram/Twitter-ready graphic of their betslip layout with GSE branding.

Key difference from server OG: this is user-initiated, client-side, and lets users customize before downloading. The Action Network launched "Playbook" doing exactly this (image-to-betslip), validating user demand.

GSE surface: Pick card detail page CTA
Effort: 3 hours
License/cost: MIT — https://github.com/bubkoo/html-to-image
Reference: https://www.dunetools.com/guides/html-to-image-developers/

---

### 12. Embed Widget (Shareable iFrame for Picks)
**Adopt-mode: COPY-NOW (TS-native, keyless)**

An `/embed/pick/[id]` route that renders a minimal branded pick card (no nav, no sidebar) suitable for embedding in any site via `<iframe src="...">`. Provide a one-click "Copy Embed Code" button on the pick detail page.

This follows the Makerkit pattern (Next.js route with custom CSS injection). The embed only shows free-tier picks; premium picks return a paywall placeholder.

GSE surface: `app/embed/pick/[id]/page.tsx` + "Embed" button on pick card
Effort: 4–5 hours
License/cost: Zero (pattern only)
Reference: https://makerkit.dev/courses/nextjs-turbo/building-javascript-widget

---

### 13. SportsOrganization JSON-LD Extension
**Adopt-mode: COPY-NOW (TS-native, keyless)**

GSE root has `Organization` JSON-LD. Google and schema.org recognize `SportsOrganization` as a subtype. Adding `"@type": ["Organization", "SportsOrganization"]` with `sport`, `memberOf` (league), and `athlete` properties may improve entity recognition for sports-specific AI overviews.

Also add `SportsTeam` JSON-LD on team hub pages (`/nflverse`, `/mlb`, `/nhl`) linking back to GSE as the `memberOf` organization.

GSE surface: `app/layout.tsx` org JSON-LD + sport hub pages
Effort: 1 hour
License/cost: Zero
Reference: https://schema.org/SportsOrganization

---

### 14. `<link rel="alternate">` Feed Discovery in `<head>`
**Adopt-mode: COPY-NOW (TS-native, keyless)**

GSE has feeds but they're not advertised in metadata. Add `alternates` to the picks board metadata so RSS readers and browsers auto-discover the feed:

```ts
// app/board/page.tsx metadata
alternates: {
  types: {
    'application/atom+xml': `${SITE_URL}/picks/feed.xml`,
  }
}
```

Also add the journal feed discovery to `app/journal/page.tsx`. Bridges item 7 into full discoverability.

GSE surface: `app/board/page.tsx`, `app/journal/page.tsx`
Effort: 30 minutes (pure metadata)
License/cost: Zero

---

### 15. `ntfy.sh`-Style Topic Push for Power Users (Self-Hosted Keyless)
**Adopt-mode: PARK → evaluate after VAPID push (item 4)**

ntfy (MIT, Apache-2.0 self-hosted) is a pub-sub HTTP push service — no SDK, no registration, subscribe to a topic via URL. It powers mobile push without writing native apps.

Relevant for GSE: a pro-user could subscribe to `ntfy.sh/gse-nfl-picks` and get a push the moment a new NFL pick publishes. The back-end call is a single `fetch('https://ntfy.sh/gse-nfl-picks', { method: 'POST', body: '...' })`.

Blocker: ntfy.sh shared instance has rate limits and no auth by default; self-hosting adds ops cost. Park until VAPID push (item 4) is live — then evaluate ntfy as a secondary channel for power users who don't want the web app open.

License/cost: MIT / Apache-2.0 self-hosted — https://github.com/binwiederhier/ntfy
Reference: https://ntfy.sh

---

### 16. Canonical `<link>` Audit + Hreflang Stub
**Adopt-mode: COPY-NOW (TS-native, keyless)**

GSE's `buildMatchupMetadata` returns a `canonical` string but the root `/` page and several static pages don't explicitly declare canonical. Next.js 14 `alternates.canonical` in metadata is the correct path. Audit all pages that currently omit it — especially the dynamic `/preview/[sport]/[slug]` pages — and ensure canonical is set before the site scales to thousands of matchup URLs.

GSE surface: Global metadata audit across `app/*/page.tsx`
Effort: 2–3 hours
License/cost: Zero

---

### 17. Open Graph `twitter:label1` / `twitter:data1` Twitter Card Metadata
**Adopt-mode: COPY-NOW (TS-native, keyless)**

X/Twitter supports `twitter:label1`/`twitter:data1` custom fields on summary_large_image cards to show structured stats directly in the card. For GSE pick pages these could show "Confidence: 78/100" and "Pick: Chiefs -3.5" without the user clicking through.

Add to matchup page metadata:
```ts
other: {
  'twitter:label1': 'Confidence',
  'twitter:data1': `${pick.confidence}/100`,
  'twitter:label2': 'Pick',
  'twitter:data2': `${pick.selection} ${pick.line}`,
}
```

GSE surface: `lib/seo/sports-jsonld.ts` → `buildMatchupMetadata` + page metadata export
Effort: 1–2 hours
License/cost: Zero (meta tag standard)
Reference: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup

---

### 18. `ClaimReview` JSON-LD on Settled Pick Pages
**Adopt-mode: COPY-NOW (TS-native, keyless)**

`ClaimReview` (schema.org, Google-supported) is designed for fact-checkers reviewing claims. A settled sports pick is a verifiable prediction: the claim was "Team A -3.5", the outcome is known. This schema type is novel for sports prediction sites and aligns perfectly with GSE's anti-tout transparency stance.

```json
{
  "@type": "ClaimReview",
  "url": "https://galaxysportsedge.com/preview/nfl/chiefs-vs-raiders",
  "claimReviewed": "Chiefs -3.5 (confidence 74/100)",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "1",
    "bestRating": "1",
    "worstRating": "0",
    "alternateName": "WIN"
  },
  "itemReviewed": {
    "@type": "Claim",
    "name": "Chiefs -3.5",
    "datePublished": "2026-01-01"
  }
}
```

Note: ClaimReview was intended for misinformation fact-checking; sports prediction use is valid but not a primary Google use case. Add it, validate in Rich Results Test, and monitor impressions.

GSE surface: Settled pick preview pages (after game result is stored)
Effort: 3 hours
License/cost: Zero
Reference: https://schema.org/ClaimReview

---

### 19. Waitlist Position / Referral Gamification UX
**Adopt-mode: COPY-NOW (TS-native, keyless — build on item 10)**

Once referral tracking (item 10) is live, add a public leaderboard / position indicator to the `/founding-desk` page: "You're #47 on the founding list. Refer 2 friends to jump to #31." This is the viral loop mechanic used by Superhuman, Robinhood, and Claude.ai's waitlist.

Implementation: `Referral` model stores position; a server action re-ranks on each referral. Display: a simple `<WaitlistPosition />` component showing rank, move-up count, and a pre-filled share URL.

Pattern reference (build from scratch, no external dep needed):
- https://dev.to/whoffagents/building-a-viral-waitlist-with-nextjs-prisma-and-resend-with-referral-tracking-11oc
- https://waitlister.me/growth-hub/guides/how-to-build-a-viral-referral-program-for-your-waitlist

GSE surface: `/founding-desk` page + post-signup email
Effort: 4–6 hours (depends on item 10 being done first)
License/cost: Zero (self-built)

---

### 20. Newsletter Signup UX Hardening
**Adopt-mode: COPY-NOW (TS-native, keyless)**

GSE has `components/founding-desk/newsletter-form.tsx` and `app/newsletter`. Key conversion improvements from 2025 research:

1. **Single-field form** (email only, no name) — simplest path, best conversion.
2. **Benefit-led CTA** — "Get daily picks + confidence scores free" not "Subscribe to newsletter."
3. **Social proof counter** — "Join 1,247 subscribers" (render real subscriber count from DB or a static number updated weekly).
4. **Exit-intent trigger** — client-side `mouseleave` on `document` shows the newsletter modal on desktop. No library needed: ~15 lines of vanilla JS.
5. **Double opt-in confirmation page** — after form submit, show "Check your inbox" with the X and Threads follow buttons from react-share (item 2).

GSE surface: `app/newsletter/page.tsx` + newsletter-form component + email confirmation flow
Effort: 3–4 hours
License/cost: Zero (UX pattern only)
Reference: https://www.optimonk.com/email-capture-best-practices

---

### 21. Picks Board Meta `<title>` Freshness Signal
**Adopt-mode: COPY-NOW (TS-native, keyless)**

Dynamic `<title>` on the picks board that includes today's date and pick count: "Today's NFL Picks — June 19, 2026 | Galaxy Sports Edge." Googlebot indexes title freshness as a recency signal; dated titles improve CTR for "today's picks" searches.

Implement via `generateMetadata()` in `app/board/page.tsx` with `new Date().toLocaleDateString('en-US', ...)`.

GSE surface: `app/board/page.tsx`
Effort: 30 minutes
License/cost: Zero

---

### 22. `ImageObject` JSON-LD on OG Images
**Adopt-mode: COPY-NOW (TS-native, keyless)**

Add `ImageObject` schema markup alongside the OG `<meta>` tags to give search engines a structured data anchor for the image:

```json
{
  "@type": "ImageObject",
  "url": "https://galaxysportsedge.com/opengraph-image",
  "width": 1200,
  "height": 630,
  "contentUrl": "...",
  "description": "Galaxy Sports Edge — Sports intelligence card"
}
```

This is particularly useful on matchup preview pages where the per-pick OG image carries real prediction data.

GSE surface: `lib/seo/sports-jsonld.ts` — add to `buildMatchupPreview` output array
Effort: 1 hour
License/cost: Zero

---

### 23. `robots.txt` AI-Crawler Allowlist Extension
**Adopt-mode: COPY-NOW (TS-native, keyless)**

Current `app/robots.ts` only has a generic `*` rule. Add explicit allow/disallow for AI crawlers to claim indexing:

```ts
{ userAgent: 'GPTBot', allow: ['/methodology', '/performance', '/ledger', '/board'] },
{ userAgent: 'ClaudeBot', allow: '/' },
{ userAgent: 'PerplexityBot', allow: '/' },
{ userAgent: 'Googlebot-Extended', allow: '/' },
// Block all bots from auth/admin surfaces (already in *)
```

Perplexity, ChatGPT Search, and Claude.ai pull from sites that explicitly allow their bots and publish structured content (methodology, calibration, ledger — all GSE strengths).

GSE surface: `app/robots.ts`
Effort: 30 minutes
License/cost: Zero
Reference: https://higoodie.com/blog/llms-txt-robots-txt-ai-optimization/

---

### 24. Atom Feed for Picks with Authentication Token
**Adopt-mode: COPY-NOW (TS-native, keyless)**

Extends item 7. Pro/Elite subscribers get a personalized Atom feed URL with a signed token: `/picks/feed.xml?token=<jwt>`. The route handler validates the token, returns their full tier's picks. This is a retention mechanic — Pro users add the feed to their RSS reader and never need to log into the app.

GSE surface: `app/picks/feed.xml/route.ts` + token generation endpoint
Effort: 3–4 hours (builds on item 7)
License/cost: Zero (JWT is already available via NextAuth)

---

### 25. `prefetch` on High-Intent Nav Links
**Adopt-mode: COPY-NOW (TS-native, keyless)**

Next.js `<Link prefetch={true}>` (default for viewport-visible links in App Router) is already on. But internal navigation from the homepage CTA (`/picks`, `/founding-desk`) can be explicitly prefetched with `router.prefetch()` on hover for the most critical conversion paths. This shaves 200–400ms of perceived latency on mobile.

For the picks board, prefetch the first 3 pick detail pages on mount.

GSE surface: `app/page.tsx` homepage CTA + picks board component
Effort: 1–2 hours
License/cost: Zero (Next.js built-in)

---

### 26. Structured `HowTo` JSON-LD on Methodology Page
**Adopt-mode: COPY-NOW (TS-native, keyless)**

`/methodology` is in the sitemap at priority 0.8. `HowTo` schema makes it eligible for Google "How-to" rich results — step-by-step callouts in SERPs for queries like "how to read sports model confidence scores."

```json
{
  "@type": "HowTo",
  "name": "How to read a Galaxy Sports Edge pick",
  "step": [
    { "@type": "HowToStep", "name": "Understand confidence score", "text": "..." },
    { "@type": "HowToStep", "name": "Check the line movement", "text": "..." }
  ]
}
```

GSE surface: `app/methodology/page.tsx`
Effort: 1–2 hours
License/cost: Zero
Reference: https://schema.org/HowTo

---

### 27. `react-share-lite` as Lighter react-share Alternative
**Adopt-mode: COPY-NOW (TS-native, keyless) — evaluate before item 2**

`react-share-lite` (MIT, ayda-tech) is a slimmer fork of react-share designed specifically for Next.js. Zero dependencies, SSR-safe, supports Facebook, Twitter/X, LinkedIn, WhatsApp, Telegram, Reddit, Email. Less platform breadth than react-share (no Bluesky yet as of last check), but lighter bundle.

If bundle size is a concern (GSE is performance-gated), benchmark both: react-share 5.3.0 is tree-shakeable, so the practical difference may be negligible.

GSE surface: Same as item 2
Effort: 1 hour (swap evaluation)
License/cost: MIT — https://github.com/ayda-tech/react-share-lite

---

### 28. `dom-to-image-next` for Server-Side Pick Card Screenshots
**Adopt-mode: PARK — evaluate after item 11**

`dom-to-image-next` (MIT fork maintained by intactile) generates images from DOM nodes server-side via headless rendering. Useful if GSE ever wants server-generated pick card images (for email embeds, Discord bot, etc.) beyond what Satori can render.

Satori (via `@vercel/og`) is the right first choice for OG images (CSS-subset, edge-fast). dom-to-image-next is the right choice for full-fidelity screenshot of an existing React component — more CSS support, more deps, slower.

Park this until the pick card design stabilizes and a need for full-component screenshots (e.g. email embed with chart) emerges.

License/cost: MIT — https://github.com/intactile/dom-to-image-next

---

### 29. `unfurl` / Open Graph Scraper for Link Preview UX
**Adopt-mode: PARK — low priority**

`unfurl` (Node.js, github.com/jacktuck/unfurl) scrapes oEmbed + OG + Twitter Card metadata from any URL. Useful if GSE ever shows "link previews" inline (e.g. an `/ask-galaxy` chat interface that previews sources, or a Discord-style link unfurl in the journal editor).

Not needed right now — GSE is a publisher, not a consumer of third-party previews. Park for the content editor or `/ask-galaxy` chat context.

License/cost: MIT — https://github.com/jacktuck/unfurl

---

### 30. Dub.co API (VENDOR — AGPL, skip self-host; API tier available)
**Adopt-mode: VENDOR (not COPY-NOW)**

Dub.co is AGPL-3.0 open source — cannot be embedded in GSE's stack without AGPL compliance (entire GSE codebase would need to be open-sourced). The managed API at api.dub.co has a generous free tier for basic short links and UTM tracking.

Use case: create short links (`gse.gg/nfl-picks`) with branded domains + QR codes + click analytics. Their React SDK (`@dub/analytics`) is MIT and can be used independently for UTM capture without the AGPL core.

Decision: if GSE wants short-link vanity URLs, use Dub.co API (vendor, not self-host). For UTM capture only, use the MIT `@dub/analytics` SDK or build item 10 (self-rolled referral).

License/cost: AGPL self-host (skip) / Dub API free tier — https://dub.co
Reference: https://dub.co/blog/utm-guide

---

## ADOPT-MODE LEGEND

| Mode | Meaning |
|---|---|
| **COPY-NOW TS-native/keyless** | No API key, no vendor contract, MIT-compatible, can be built in current sprint |
| **VENDOR** | Needs a paid plan or AGPL/proprietary license — evaluate separately |
| **PARK** | Valid but lower leverage or blocks on something else being done first |

---

## DEPENDENCY ORDER (recommended build sequence)

```
Sprint 1 (high leverage, low deps):
  #1  Per-pick OG images       (unlocks #17 twitter card metadata)
  #2  Share bar + Web Share    (unlocks #19 waitlist gamification CTA)
  #7  Picks RSS/Atom feed      (unlocks #14 feed discovery meta, #24 token feed)
  #5  llms.txt + robots AEO   (#23 robots update is 30 min add-on)
  #8  Article/ItemList JSON-LD

Sprint 2 (infrastructure):
  #3  Serwist PWA + SW         (prerequisite for #4)
  #4  VAPID Web Push           (requires #3 service worker)
  #10 Referral/UTM tracking    (prerequisite for #19)
  #6  QR codes                 (standalone, 2h)

Sprint 3 (polish + depth):
  #9  View Transitions
  #19 Waitlist gamification    (requires #10)
  #11 html-to-image pick card download
  #12 Embed widget
  #13 SportsOrganization JSON-LD
  #18 ClaimReview on settled picks
  #26 HowTo JSON-LD
  #20 Newsletter UX hardening
```

---

## SOURCES

- [react-share v5.3.0 (MIT)](https://github.com/nygardk/react-share)
- [react-share npm](https://www.npmjs.com/package/react-share)
- [next-plugin-llms (MIT)](https://github.com/TurboDocx/next-plugin-llms)
- [next-aeo / next-llms-txt intro](https://www.tryprofound.com/blog/next-aeo)
- [llms.txt / AEO guide](https://llms-txt.io/blog/how-to-add-llms-txt-to-nextjs-react)
- [Serwist (MIT, next-pwa successor)](https://github.com/serwist/serwist)
- [Serwist + Next.js guide](https://javascript.plainenglish.io/building-a-progressive-web-app-pwa-in-next-js-with-serwist-next-pwa-successor-94e05cb418d7)
- [web-push + VAPID Next.js (provider-free)](https://blog.designly.biz/push-notifications-in-next-js-with-web-push-a-provider-free-solution)
- [web-push npm](https://www.npmjs.com/package/web-push)
- [ntfy.sh (MIT/Apache-2.0 self-hosted push)](https://github.com/binwiederhier/ntfy)
- [node-qrcode (MIT)](https://github.com/soldair/node-qrcode)
- [react-qr-code npm](https://www.npmjs.com/package/react-qr-code)
- [html-to-image (MIT)](https://github.com/bubkoo/html-to-image)
- [dom-to-image-next (MIT)](https://github.com/intactile/dom-to-image-next)
- [unfurl Node.js OG scraper (MIT)](https://github.com/jacktuck/unfurl)
- [feed npm (MIT) — RSS/Atom generation](https://github.com/jpmonette/feed)
- [Next.js OG image docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Next.js View Transitions docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld)
- [schema.org SportsEvent](https://schema.org/SportsEvent)
- [schema.org SportsOrganization](https://schema.org/SportsOrganization)
- [schema.org ClaimReview](https://schema.org/ClaimReview)
- [schema.org HowTo](https://schema.org/HowTo)
- [Structured data 2026 rich results guide](https://www.digitalapplied.com/blog/structured-data-seo-2026-rich-results-guide)
- [NFL Betting RSS feeds aggregator](https://rss.feedspot.com/nfl_betting_rss_feeds/)
- [Crafting RSS feed Next.js 14](https://lev.engineer/blog/crafting-an-rss-feed-with-next-js-14)
- [Viral waitlist Next.js + Prisma referral](https://dev.to/whoffagents/building-a-viral-waitlist-with-nextjs-prisma-and-resend-with-referral-tracking-11oc)
- [traffic-source open source UTM analytics (MIT)](https://github.com/mddanishyusuf/traffic-source)
- [Dub.co UTM guide (AGPL — vendor only)](https://dub.co/blog/utm-guide)
- [agentmarkup.dev AEO + llms.txt for Next.js](https://agentmarkup.dev/blog/nextjs-llms-txt-json-ld/)
- [llms.txt robots.txt AI optimization](https://higoodie.com/blog/llms-txt-robots-txt-ai-optimization/)
- [Email capture best practices 2025](https://www.optimonk.com/email-capture-best-practices)
- [react-share-lite (MIT)](https://github.com/ayda-tech/react-share-lite)
- [Makerkit embeddable widget guide](https://makerkit.dev/courses/nextjs-turbo/building-javascript-widget)
- [Advanced Web Share API guide (LogRocket)](https://blog.logrocket.com/advanced-guide-web-share-api-navigator-share/)
- [Nayuki QR code library (MIT, TypeScript)](https://github.com/nayuki/QR-Code-generator)
- [next-view-transitions library](https://www.bengubler.com/posts/2025-06-14-smooth-page-transitions-next-view-transitions)
