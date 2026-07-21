# Scalar: API Documentation → B2B Revenue Channel

> Source: `scalar/scalar` (MIT, 12k★)
> Purpose: Turn GSN's existing Next.js API routes into a documented, marketable public API — the path to B2B data licensing, RapidAPI listing, and passive recurring revenue from sportsbooks + research firms

## What This Solves

GSN's pick generation, odds processing, and historical performance data are assets. Currently:
- These assets are only accessible internally, within the app
- No external party can pay to access them
- Zero B2B revenue, zero API discoverability

A documented, versioned API changes this:
- **Sportsbooks** pay $200-2000/mo for odds confirmation and pick data
- **Research firms** (DraftKings internal teams, sports analytics companies) pay for historical picks + outcomes
- **Competing pick sites** pay for data they can't generate themselves
- **RapidAPI listing** provides passive discovery — developers searching for "sports picks API" find GSN

Scalar generates beautiful interactive API documentation from OpenAPI specs with zero configuration. It becomes the landing page for GSN's API-as-a-product.

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| AgentOps | AI session telemetry (internal) |
| OpenTelemetry | Distributed tracing (internal) |
| PostHog | User behavior analytics (internal) |
| **Scalar** | **Public API documentation (external, revenue-generating)** |

Scalar is the customer-facing surface for the API product. It has no overlap with any existing tool.

## Installation

```bash
npm install @scalar/nextjs-api-reference --workspace=apps/web
```

## GSN Public API Design

The public API exposes three read-only namespaces with tier-based access:

```
/api/v1/picks       — Pick recommendations (FREE tier: today's picks only, PRO: 30 days, ELITE: 90 days)
/api/v1/results     — Historical WIN/LOSS outcomes (all tiers)
/api/v1/odds        — Current odds snapshots (PRO+)
/api/v1/sports      — Available sports and seasons (all tiers)
```

Authentication: API keys (generated in dashboard, billed via Stripe per API tier).

## GSN Use Case 1: Interactive API Docs Page

```typescript
// apps/web/src/app/api-docs/page.tsx
import { ApiReference } from "@scalar/nextjs-api-reference";

export default function ApiDocs() {
  return (
    <ApiReference
      configuration={{
        spec: {
          url: "/api/v1/openapi.json",  // Generated OpenAPI spec
        },
        theme: "purple",
        title: "Galaxy Sports Edge API",
        tagsSorter: "alpha",
        operationsSorter: "alpha",
        authentication: {
          apiKey: {
            token: "gs_demo_xxxxxxxxxxxx",  // Demo key for trying the API
          },
        },
      }}
    />
  );
}
```

## GSN Use Case 2: OpenAPI Spec Generation

Auto-generate the spec from existing route handlers:

**`apps/web/src/app/api/v1/openapi.json/route.ts`**:

```typescript
import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Galaxy Sports Edge API",
    version: "1.0.0",
    description: "AI-powered sports pick recommendations with historical performance tracking.",
    contact: { email: "api@your-domain.com", url: "https://your-domain.com/api-docs" },
    license: { name: "Commercial", url: "https://your-domain.com/api-terms" },
  },
  servers: [{ url: "https://your-domain.com/api/v1", description: "Production" }],
  security: [{ apiKey: [] }],
  components: {
    securitySchemes: {
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "Get your API key at your-domain.com/dashboard/api-keys",
      },
    },
    schemas: {
      Pick: {
        type: "object",
        required: ["id", "sport", "selection", "confidence", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
          sport: { type: "string", enum: ["nfl", "nba", "mlb", "nhl"], example: "nfl" },
          awayTeam: { type: "string", example: "Kansas City Chiefs" },
          homeTeam: { type: "string", example: "Las Vegas Raiders" },
          selection: { type: "string", example: "Chiefs -7.5" },
          spread: { type: "number", example: -7.5 },
          confidence: { type: "integer", minimum: 0, maximum: 100, example: 78 },
          outcome: { type: "string", nullable: true, enum: ["WIN", "LOSS", "PUSH", "VOID", null] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/picks": {
      get: {
        summary: "List picks",
        description: "Returns AI-generated pick recommendations. FREE tier: today only. PRO: 30 days. ELITE: 90 days.",
        operationId: "listPicks",
        tags: ["Picks"],
        parameters: [
          { name: "sport", in: "query", schema: { type: "string", enum: ["nfl", "nba", "mlb", "nhl"] } },
          { name: "date", in: "query", description: "ISO date (YYYY-MM-DD). Defaults to today.", schema: { type: "string", format: "date" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 10 } },
        ],
        responses: {
          "200": {
            description: "Success",
            content: { "application/json": { schema: { type: "array", items: { "$ref": "#/components/schemas/Pick" } } } },
          },
          "401": { description: "Invalid or missing API key", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/results": {
      get: {
        summary: "Historical results",
        description: "WIN/LOSS/PUSH outcomes for past picks. Available to all API tiers.",
        operationId: "listResults",
        tags: ["Results"],
        parameters: [
          { name: "sport", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": { description: "Success", content: { "application/json": { schema: { type: "array", items: { "$ref": "#/components/schemas/Pick" } } } } },
        },
      },
    },
  },
};

export function GET() {
  return NextResponse.json(spec);
}
```

## GSN Use Case 3: API Key Management

Generate and manage API keys from the user dashboard. Keys are scoped to tiers and tracked with Stripe metered billing.

**`apps/web/src/app/dashboard/api-keys/page.tsx`**:

```tsx
"use client";
import { useState } from "react";

export default function ApiKeysPage() {
  const [key, setKey] = useState<string | null>(null);

  const generateKey = async () => {
    const res = await fetch("/api/v1/api-keys", { method: "POST" });
    const { key } = await res.json();
    setKey(key);
  };

  return (
    <div>
      <h1>API Keys</h1>
      <p>Use your API key to access the GSN API. See our <a href="/api-docs">API documentation</a>.</p>

      <button onClick={generateKey}>Generate New API Key</button>

      {key && (
        <div>
          <p>Your new API key (save it — shown only once):</p>
          <code>{key}</code>
        </div>
      )}

      <h2>API Pricing</h2>
      <table>
        <thead>
          <tr><th>Tier</th><th>Price</th><th>Requests/month</th><th>Data Access</th></tr>
        </thead>
        <tbody>
          <tr><td>FREE</td><td>$0</td><td>1,000</td><td>Today's picks</td></tr>
          <tr><td>DEVELOPER</td><td>$49/mo</td><td>10,000</td><td>30-day history</td></tr>
          <tr><td>PROFESSIONAL</td><td>$199/mo</td><td>100,000</td><td>90-day history + odds</td></tr>
          <tr><td>ENTERPRISE</td><td>$499/mo</td><td>Unlimited</td><td>Full history + bulk export</td></tr>
        </tbody>
      </table>
    </div>
  );
}
```

## GSN Use Case 4: RapidAPI Listing

Listing GSN on RapidAPI exposes it to 3M+ developers searching for sports data APIs:

1. Create account at `rapidapi.com/provider`
2. Add API: point to `https://your-domain.com/api/v1`
3. Import OpenAPI spec from `/api/v1/openapi.json`
4. Set pricing tiers (match your Stripe tiers)
5. RapidAPI handles billing (takes 20% commission)
6. Discovery is free — listed in "Sports" category alongside ESPN, SportsData.io

RapidAPI sports APIs average 50-200 subscribers at $30-200/month. At 50 subscribers × $49/month = $2,450/month passive income.

## B2B Sales Targets

Who buys sports picks APIs:
1. **Fantasy sports apps** — Need pick recommendations for their users
2. **Sportsbook internal tools** — Research teams tracking sharp money signals
3. **Sports analytics firms** — Backtesting prediction models
4. **Media companies** — ESPN affiliates, bleacherreport.com, podcasts
5. **Pick aggregator sites** — Sites that compare picks across services

Cold outreach template:
```
Subject: Sports Pick API — [Company] integration opportunity

We built an AI-powered sports pick API (GSN) with [X]% win rate over [N] picks.
Our API returns picks + confidence scores + historical outcomes in JSON.

API docs: your-domain.com/api-docs
Free trial: 1,000 requests/month, no credit card

Would a 30-min call make sense this week?
```

## Scalar Features for GSN

- **Interactive sandbox**: API consumers test endpoints directly in the docs (no Postman needed)
- **Code examples**: Auto-generated in Python, JavaScript, cURL, Go for every endpoint
- **Schema viewer**: Full JSON schema for every request/response
- **Authentication guide**: Step-by-step key setup
- **Changelogs**: Document breaking changes, new endpoints

## Status

- [ ] `npm install @scalar/nextjs-api-reference --workspace=apps/web`
- [ ] Create `/api/v1/openapi.json/route.ts` with complete spec
- [ ] Create `/api-docs/page.tsx` with Scalar component
- [ ] Create `/api/v1/picks/route.ts` with API key auth middleware
- [ ] Create `/api/v1/results/route.ts` with date range filtering
- [ ] Add API key generation to user dashboard (`/dashboard/api-keys`)
- [ ] Wire API key billing to Stripe (metered billing, per-request pricing)
- [ ] List on RapidAPI (20% commission, but 3M developer audience)
- [ ] Add API section to marketing site: "GSN API — picks for developers"
- [ ] Send cold outreach to 10 fantasy sports apps and sports analytics firms
