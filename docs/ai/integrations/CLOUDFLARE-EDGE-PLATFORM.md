# Cloudflare Edge Platform: R2 Storage + Workers + D1 + $250k Startup Credits

> Source: `cloudflare/workers-sdk` (Apache-2.0, 3k★) + Cloudflare for Startups program
> Purpose: Replace expensive Vercel Edge functions with Cloudflare Workers, cut storage costs with R2, earn $250k+ in Cloudflare credits via startup program

## What This Solves

GSN has three cost + capability gaps Cloudflare fills better than anything else in the stack:

1. **Vercel serverless cost** — Each `/api/picks` invocation costs ~$0.0002 on Vercel Pro. At 1M req/month = $200. Cloudflare Workers: $0.50 per million. Same traffic = $0.50.
2. **S3 egress fees** — If GSN stores pick images, PDFs, or data exports in S3, egress is $0.09/GB. Cloudflare R2: **$0 egress**. Ever.
3. **Edge SQLite** — D1 is a SQLite database that runs at the edge, in the same datacenter as the Worker. Ideal for caching odds snapshots, rate-limit counters, and session tokens without a round-trip to Neon Postgres.

## Cloudflare for Startups Program

**This is the biggest financial lever in the entire stack.**

Apply at: `cloudflare.com/lp/cloudflare-for-startups`

What you get:
- **$250,000 in Cloudflare Workers Paid Plan credits** over 2 years
- Workers KV, R2, D1, Durable Objects, Stream, Images — all included
- Direct access to Cloudflare's startup engineering team
- Featured in Cloudflare's startup showcase (SEO + backlink)

Requirements:
- Early-stage startup (< Series B)
- Not yet using Cloudflare Workers at scale
- Referred by a VC, accelerator, or Cloudflare partner (or self-apply; acceptance rate ~60%)

**Combined with other programs in the GSE-ECOSYSTEM-LEVERAGE.md doc, you can operate GSN infrastructure for near-zero cost in year 1.**

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| Vercel | Next.js app hosting (keep for SSR/App Router) |
| Upstash | HTTP Redis for Vercel Edge rate limiting |
| Neon | Primary Postgres database |
| BullMQ + Redis | Long-running worker jobs |
| **Cloudflare R2** | **Media/data file storage (zero egress)** |
| **Cloudflare Workers** | **Edge API routes, pick proxy, image transform** |
| **Cloudflare D1** | **Edge SQLite for caching and counters** |
| **Cloudflare KV** | **Session tokens, feature flags at the edge** |

Cloudflare Workers and Vercel coexist — you route specific high-traffic, low-complexity paths to Workers, keeping Next.js SSR on Vercel.

## Installation

```bash
# Install wrangler CLI
npm install -g wrangler
wrangler login

# Authenticate with Cloudflare account
wrangler whoami
```

## GSN Use Case 1: R2 — Zero-Egress Pick Data Storage

If GSN generates pick reports, exports, or stores any binary assets, R2 eliminates S3 egress fees.

**`packages/storage/src/r2.ts`**:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// R2 is S3-compatible — use the same AWS SDK, different endpoint
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadPickReport(gameId: string, pdf: Buffer) {
  await r2.send(new PutObjectCommand({
    Bucket: "gsn-pick-reports",
    Key: `picks/${gameId}.pdf`,
    Body: pdf,
    ContentType: "application/pdf",
  }));
}

export async function getPickReportUrl(gameId: string): Promise<string> {
  // R2 public bucket URL — no signed URL needed for public data
  return `https://picks.your-domain.com/picks/${gameId}.pdf`;
}
```

**Setup:**
```bash
wrangler r2 bucket create gsn-pick-reports
# Enable public access if needed in Cloudflare dashboard → R2 → Bucket settings
# Add custom domain: picks.your-domain.com → R2 bucket
```

**Environment variables:**
```bash
CLOUDFLARE_ACCOUNT_ID=abc123...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

## GSN Use Case 2: Workers — High-Traffic Odds Proxy at $0.50/1M req

Move the publicly-visible odds endpoint from Vercel to a Cloudflare Worker. Same behavior, 400x cheaper.

**`cloudflare/workers/odds-proxy/src/index.ts`**:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const sport = url.searchParams.get("sport") ?? "americanfootball_nfl";

    // Check KV cache first (100ms TTL)
    const cacheKey = `odds:${sport}`;
    const cached = await env.ODDS_CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    // Fetch from The Odds API
    const oddsResponse = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${env.ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h`
    );
    const odds = await oddsResponse.text();

    // Cache for 5 minutes
    await env.ODDS_CACHE.put(cacheKey, odds, { expirationTtl: 300 });

    return new Response(odds, {
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  },
};

interface Env {
  ODDS_CACHE: KVNamespace;
  ODDS_API_KEY: string;
}
```

**`cloudflare/workers/odds-proxy/wrangler.toml`**:

```toml
name = "gsn-odds-proxy"
main = "src/index.ts"
compatibility_date = "2024-01-01"

kv_namespaces = [
  { binding = "ODDS_CACHE", id = "your-kv-namespace-id" }
]

[vars]
# Non-secret vars here

# Secrets via: wrangler secret put ODDS_API_KEY
```

**Deploy:**
```bash
cd cloudflare/workers/odds-proxy
wrangler deploy
# → Deployed to: gsn-odds-proxy.your-account.workers.dev

# Add custom domain in Cloudflare dashboard or:
wrangler domains add api.your-domain.com/odds
```

**In Next.js, update odds fetching to use the Worker:**
```typescript
// Before: direct API call from Vercel serverless
const odds = await fetch(`https://api.the-odds-api.com/v4/...?apiKey=${ODDS_API_KEY}`);

// After: through Cloudflare Worker (cheaper, cached, no API key in Next.js)
const odds = await fetch(`https://api.your-domain.com/odds?sport=${sport}`);
```

## GSN Use Case 3: D1 — Edge SQLite for Rate Limiting + Counters

D1 runs in the same Cloudflare datacenter as the Worker — latency is ~0ms. Use it for rate-limit counters and session tracking without a Redis round-trip.

```typescript
// In the odds-proxy worker (above), add D1 for per-IP rate limiting
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

    // Check rate limit in D1
    const { results } = await env.DB.prepare(
      "SELECT count FROM rate_limits WHERE ip = ? AND window = strftime('%Y-%m-%d %H:%M', 'now')"
    ).bind(ip).all();

    const count = (results[0] as any)?.count ?? 0;
    if (count >= 100) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Increment counter
    await env.DB.prepare(
      "INSERT INTO rate_limits (ip, window, count) VALUES (?, strftime('%Y-%m-%d %H:%M', 'now'), 1) ON CONFLICT(ip, window) DO UPDATE SET count = count + 1"
    ).bind(ip).run();

    // ... rest of handler
  },
};
```

**Create D1 database:**
```bash
wrangler d1 create gsn-edge-db
wrangler d1 execute gsn-edge-db --command "CREATE TABLE IF NOT EXISTS rate_limits (ip TEXT, window TEXT, count INTEGER, PRIMARY KEY (ip, window))"
```

## GSN Use Case 4: Cloudflare Images — Pick Thumbnail Generation

If GSN generates pick card images for social sharing (Twitter/OG cards), Cloudflare Images transforms and serves them at cost:

- **Free tier**: 100,000 images stored
- **Cost**: $5/month for 100,000 images stored + $1/100,000 served
- **Auto-resize**: One source image → any size via URL params: `?width=1200&height=630&fit=cover`
- **WebP conversion**: Automatic

```typescript
// Generate OG image URL for pick sharing
export function getPickOGImageUrl(pickId: string, selection: string): string {
  return `https://imagedelivery.net/${process.env.CLOUDFLARE_IMAGES_ACCOUNT}/${pickId}/og`;
}
```

## Architecture: Cloudflare + Vercel Together

```
Browser/App
  │
  ├── Static assets, picks UI, auth → Vercel (Next.js App Router)
  │
  ├── /odds, /picks-summary → Cloudflare Worker (cheap, cached, edge)
  │
  ├── Pick PDFs, media files → Cloudflare R2 (zero egress)
  │
  └── Rate limit counters → Cloudflare D1 (edge SQLite)
                              OR Upstash Redis (either works)
```

## Local Dev

```bash
# Wrangler local dev server (runs Workers locally)
wrangler dev

# Test D1 locally
wrangler d1 execute gsn-edge-db --local --command "SELECT * FROM rate_limits LIMIT 10"

# Test R2 locally (wrangler simulates R2)
wrangler dev --local
```

## Environment Variables

```bash
# Add to wrangler.toml [vars] or via wrangler secret put
ODDS_API_KEY=...          # The Odds API key (secret)

# In your Cloudflare dashboard, bind:
# KV namespace: ODDS_CACHE
# D1 database: DB
# R2 bucket: PICK_REPORTS

# In Next.js .env.local (for R2 uploads from Next.js API routes):
CLOUDFLARE_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=gsn-pick-reports
```

## Cost Comparison

| Service | Vercel/AWS | Cloudflare |
|---|---|---|
| Edge function (per million) | ~$200 | $0.50 |
| Storage (10GB) | ~$0.23/mo + egress | ~$0.15/mo, $0 egress |
| KV reads (per million) | $0.50 (Upstash) | $0.50 (free tier: 10M/day) |
| Images (100k served) | $9 (S3 + CloudFront) | $1 |

At 1M API calls/month, switching the odds proxy alone saves ~$200/month.

## Apply for Cloudflare for Startups

1. Go to `cloudflare.com/lp/cloudflare-for-startups`
2. Fill in company info (early-stage startup)
3. If asked for referral: check if your accelerator/VC is a Cloudflare partner. Otherwise, self-apply.
4. Timeline: 2-5 business days
5. Credits: $250k in Workers Paid plan over 24 months

**Also apply to these Cloudflare programs:**
- Cloudflare Workers Launchpad ($25k additional + community)
- Cloudflare Stream (video hosting, if GSN adds pick analysis video content)

## Status

- [ ] `npm install -g wrangler && wrangler login`
- [ ] Apply to Cloudflare for Startups program (`cloudflare.com/lp/cloudflare-for-startups`)
- [ ] Create R2 bucket: `wrangler r2 bucket create gsn-pick-reports`
- [ ] Create KV namespace: `wrangler kv namespace create ODDS_CACHE`
- [ ] Create D1 database: `wrangler d1 create gsn-edge-db`
- [ ] Deploy odds-proxy Worker: `wrangler deploy` → move `/api/odds` to Worker
- [ ] Add custom domain to Worker (via Cloudflare dashboard)
- [ ] Swap S3 storage references to R2 in `packages/storage/`
- [ ] Verify: 1M test requests → confirm Worker billing vs Vercel billing
- [ ] Enable Cloudflare Images for pick OG card generation
