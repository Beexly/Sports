# B2B Widgets + API — Specification

**Status:** Phase 5 build. Per DEC-017.
**Owner of code:** Codex.
**Owner of buyer personas + sales copy + pricing taxonomy:** Claude.
**Location:** `apps/web/app/embed/`, `apps/web/app/api/intelligence/`, `apps/web/lib/b2b/`.
**Decision reference:** master plan Part 2.F.4, Part 6 DEC-017.

---

## TL;DR

Embeddable widgets and a paid REST API turn Galaxy's Intelligence Graph into a B2B product line. Sports newsletters embed Market Pulse; Discord communities embed Model Court; fantasy creators embed Slate Weather; sportsbook affiliate content arms consume the API.

Galaxy stops being just a consumer subscription and becomes infrastructure for the sports-betting media ecosystem (the Whop-ecosystem reference notwithstanding — we're the legitimate infrastructure, not the touts).

---

## Two product lines

### Widgets (embeddable)

Rendered via `<iframe>` or `<script>` tags. Each widget targets one specific use case.

### API (programmatic)

REST endpoints under `/api/intelligence/*`. Authenticated via API key. Returns Intelligence Graph projections.

Both share the same data foundation (the Intelligence Graph) and the same compliance enforcement.

---

## Widgets

### `/embed/edge-index/[gameId]` — FREE, public

Branded badge showing the Edge Index for one game.

```
┌─────────────────────────────┐
│  GALAXY EDGE  |  +2.7       │
│  BOS @ NYY  |  v6.0.5       │
│  galaxysportsedge.com       │
└─────────────────────────────┘
```

Use case: any sports media site that wants to display Galaxy's read on a game as a credibility signal.

Authentication: none. Iframe embeddable anywhere.

Branding: always shows the Galaxy logo + link. Functions as a free SEO + credibility distribution channel.

### `/embed/market-pulse/[gameId]` — PAID

Live market state widget for one game.

Shows:
- Current consensus across reporting books.
- Line movement since open.
- Volatility flag.
- Sharp money signal (when present).
- Last update timestamp.

Use case: sports newsletters embedding live market state in their daily send.

Authentication: API key passed via `?key=...`. Domain whitelist enforced. Rate limited per key.

### `/embed/slate-weather` — PAID

Daily slate context widget. Shows the day's slate state across all sports the buyer subscribes to.

Use case: fantasy DFS content shops with daily content cycles. Embed in their morning newsletter or homepage.

### `/embed/model-court/[gameId]` — PAID (higher tier)

Conversational Q&A widget grounded in one game's Intelligence Graph.

Same Model Court interface as on Galaxy's own Game Rooms (Phase 4 spec), embedded in third-party context.

Use case: Discord capper communities (the legit ones) that want to give their members a "ask the model" interface without rebuilding it.

Authentication: API key + Galaxy user OAuth flow embedded.

Cost note: Model Court is the most expensive widget to operate (Claude API calls per question). Pricing reflects this.

---

## API endpoints

All under `/api/intelligence/`. Authenticated with `Authorization: Bearer <api_key>` header.

### `GET /api/intelligence/game/[id]`

Returns the full `GameIntelligenceNode` projection for the requested game.

Tiers:
- **Basic tier:** projection includes Edge Index, Market Pulse, basic factor breakdown.
- **Pro tier:** adds full factor breakdown, pre-mortem.
- **Enterprise tier:** adds Galaxy Memory slot (post-settlement), Evidence Timeline, lens projections.

Caching: edge-cached for 60 seconds. Stable response for the same game in a 60-second window.

### `GET /api/intelligence/slate?date=YYYY-MM-DD`

Returns `SlateWeather` for the requested date plus a list of `GameIntelligenceNode` summaries.

### `GET /api/intelligence/creator-pack?gameId=...`

Returns a Galaxy Studio-style asset pack for the requested game — pre-generated short-form copy + citations for re-use.

Use case: content shops that produce daily blurbs across many games. Galaxy generates the citations + the structure; the shop's writer finalizes.

Pricing reflects the higher cost of Studio generation per call.

### `POST /api/intelligence/explain`

Body: `{ gameId, question, lens? }`. Returns a `ModelCourtCase`.

Use case: programmatic Model Court access for Discord bots or third-party apps.

### `GET /api/intelligence/ledger?from=...&to=...&filters=...`

Returns paginated settled-pick records matching the filter. Same shape as the public `/ledger` API but with full historical access (vs the public version which respects bootstrap gating).

Use case: academic researchers, fantasy operators, fintech adjacencies. Path-to-the-researcher-program per DEC-006.

---

## Authentication + key management

API keys are issued from a B2B portal at `/b2b/keys`.

```prisma
model ApiKey {
  id              String         @id @default(cuid())
  ownerUserId     String         // the Galaxy account that owns the key
  organizationId  String?        // optional org grouping
  keyPrefix       String         @unique  // visible prefix (e.g. "gse_live_...")
  keyHash         String         // SHA-256 of full key
  name            String         // user-facing label
  tier            ApiKeyTier
  rateLimitPerMin Int            @default(60)
  domainWhitelist String[]
  isActive        Boolean        @default(true)
  expiresAt       DateTime?
  createdAt       DateTime       @default(now())
  lastUsedAt      DateTime?

  owner           User           @relation(fields: [ownerUserId], references: [id])
  usageRecords    ApiKeyUsage[]

  @@index([keyPrefix])
  @@index([ownerUserId])
  @@index([isActive])
}

enum ApiKeyTier {
  BASIC
  PRO
  ENTERPRISE
}

model ApiKeyUsage {
  id          String   @id @default(cuid())
  apiKeyId    String
  endpoint    String
  statusCode  Int
  latencyMs   Int
  observedAt  DateTime @default(now())

  apiKey      ApiKey   @relation(fields: [apiKeyId], references: [id])

  @@index([apiKeyId, observedAt])
}
```

Usage is metered for billing + analytics.

---

## Pricing tiers (deferred — DEC-OPEN-C)

Pricing is owner-only per DEC-OPEN-C. Sketch (subject to revision):

- **Basic:** $99/month. 10,000 API calls/month. Edge Index widget free + Market Pulse widget. Rate-limited.
- **Pro:** $499/month. 100,000 API calls/month. All widgets except Model Court. Domain whitelist 5.
- **Enterprise:** Custom. Unlimited (with reasonable fair-use). Model Court widget. Domain whitelist 25. SLA. Account manager.

Researcher Program: free-or-discounted with explicit co-authorship credit (Phase 6 per DEC-006).

---

## Buyer personas

Sales work targets these specifically. Claude owns the personas; product owner approves sales copy.

### Persona A — Independent newsletter writer

- Audience: 5–50k Substack/Beehiiv subscribers.
- Use case: embeds Market Pulse + Slate Weather in daily send.
- Tier: Basic.
- Sales angle: "Save 90 minutes a day on prep. Galaxy's read embeds cleanly."

### Persona B — Discord capper community (legit)

- Audience: 500–5k server members, paid Discord premium tiers.
- Use case: Model Court widget for "ask the model" channel.
- Tier: Pro.
- Sales angle: "Your members get the Galaxy model in your server. You don't have to build it."

### Persona C — Fantasy DFS content shop

- Audience: 50k+ daily readers across multiple platforms.
- Use case: Slate Weather widget + creator-pack API for daily content.
- Tier: Pro or Enterprise.
- Sales angle: "Citation-ready content with compliance built in."

### Persona D — Local sports media site

- Audience: regional, 100k+ monthly readers.
- Use case: Edge Index widget for credibility + Market Pulse for engagement.
- Tier: Basic.
- Sales angle: "Free Edge Index. Pro widgets when you're ready."

### Persona E — Sportsbook affiliate content arm

- Audience: built-in via the sportsbook.
- Use case: compliance scaffolding + Model Court for retention.
- Tier: Enterprise (often with custom contract).
- Sales angle: "Compliance + retention as a service."

### Persona F — Academic researcher

- Audience: research output.
- Use case: full ledger API for empirical studies.
- Tier: Free or discounted with co-authorship credit (Researcher Program).
- Sales angle: "First sports-betting platform that gives researchers real data with attribution."

### Persona G — Fintech adjacency

- Audience: prediction markets / events markets infrastructure.
- Use case: market state API for adjacent product.
- Tier: Enterprise.
- Sales angle: "Sports market state as a data layer."

---

## Compliance + brand-safety

All widget output runs through the platform compliance scanner. Hard refuse on:

- Banned vocabulary in any rendered content.
- Aggregate win-rate claims.
- "Best book" / "sharpest" / competitor comparisons.
- Personal betting advice.

API responses are JSON; the structured response shape prevents most banned-vocabulary leaks at the source. The compliance scanner runs on any Claude-generated content (Model Court answers, Studio asset packs) before returning.

---

## SLA + reliability

For Enterprise tier:

- 99.9% uptime SLA.
- 99th percentile latency under 500ms for Game / Slate / Ledger endpoints.
- Status page at `status.galaxysportsedge.com`.
- Direct support channel.

For Pro tier: best-effort, no contractual SLA.

For Basic tier: best-effort, public status page.

---

## Acceptance criteria (Phase 5 B2B v0 → green)

1. API key management at `/b2b/keys`.
2. Authentication + rate limiting enforced.
3. All API endpoints documented at `/b2b/docs`.
4. All four widgets shippable.
5. Domain whitelist enforced for widgets.
6. Usage metering recorded per key.
7. Compliance scanner runs on all returned content.
8. Status page live.
9. Documentation site complete (per-endpoint examples + SDK reference if any).
10. At least 3 buyer personas have pilot agreements signed (commercial measure, not engineering).

When 1-9 hold, the platform is shippable. #10 is the go-to-market gate.

---

## Open items

- **OPEN-B2B-1:** Should we ship an SDK (JS/Python) or just REST + docs? Default: JS SDK in v0; Python in Phase 6. REST docs cover everyone else.
- **OPEN-B2B-2:** Should keys be per-org or per-user? Default: per-user with optional org grouping. Codex confirms.
- **OPEN-B2B-3:** Should the Edge Index widget remain free forever or eventually tier? Default: free forever — it's the distribution wedge. Confirm.
- **OPEN-B2B-4:** Should we white-label the API (custom branding for Enterprise)? Default: yes, Phase 6+. Phase 5 ships under Galaxy branding only.
- **OPEN-B2B-5:** Pricing tiers — DEC-OPEN-C is unresolved. Defer to owner before launch.

---

*Spec authored by Claude. Codex implements API + widgets. Pricing decisions to owner per DEC-OPEN-C.*
