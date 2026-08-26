# 07 — Immediate Wins From the 2026-08-24 Dump (ready-to-execute)

> Companion to `06-resource-dump-grok-paas-monetization-2026-08-24.md`. These are the
> triage outcomes that need NO new infra, NO spend, and NO dependency installs — just
> execution inside the existing stack. Each section is copy-pasteable work for any agent.
>
> CONSTRAINT HONORED: repo was mid-overnight-swarm (branch `hermes/w2-audit-settlement`)
> when this was written, so nothing here touches application code. All items are docs,
> configs-to-add-later, or isolated scripts. Code integrations wait for the discovery
> round (`08-discovery-50.md`, pending).

---

## WIN 1 — Pre-Rejected-On-Sight Blocklist (guardrail speedup)

Future resource dumps contain repeat offenders. Anything matching these families is
REJECTED without re-research (source: 06 file §hard-rejects):

| Family | Examples seen | Why |
|---|---|---|
| Scraped-token "free API" gateways | chenyme/grok2api, omgpizzatnt/grok-free-web-api-vercel, DE0CH/grok-frontend | Extract auth tokens from web sessions = ToS violation + credential-theft pattern |
| X/Twitter automation via browser injection | per-simmons/ai-reply-guy-opensource, aaronjmars/tweazy | Keystroke-injection spam bypasses; X ToS |
| OSINT / person-tracking | sherlock-project/sherlock | Privacy red line, no legitimate GSE use |
| Crypto payment rails | zcash/zcash, x402 wallet scrapers | Stripe-only guardrail |
| GPL/AGPL code to EMBED in GSE | automatisch, MoneyPrinterV2/Plus, classifai, Countly | Copyleft infection vs commercial picks product (self-host separately = OK) |
| WordPress-only plugins | 10up/classifai | Wrong platform |

Rule for triagers: if a candidate matches a family row, cite the row and move on.

## WIN 2 — Programmatic SEO Checklist (from bmpi-dev/awesome-seo)

Apply to every auto-generated matchup/game-preview page. Distilled to what changes
GSE code/config:

1. **One canonical URL per entity pair** — `/nfl/[season]/[week]/[away]-at-[home]`;
   canonical tag self-referencing; redirect trailing variants.
2. **JSON-LD on every page** — `SportsEvent` (with startDate, location, teams) +
   `FAQPage` for the pick-explainer Q&A block. This is the highest-leverage item:
   rich-result eligibility is free CTR.
3. **Unique above-the-fold content per page** — ≥150 words of generated analysis
   (own-model output is rights-clean by construction); never republish feed text.
4. **Internal linking mesh** — every game page links to both team hubs, the week
   hub, and 3 related matchups (same week, division, or model-similar). Sitemap
   must include all of it (`next-sitemap` or App Router `sitemap.ts`).
5. **Crawl budget hygiene** — noindex thin pages (stale/incomplete data states),
   keep `FORCE_NO_BET_IF_STALE` pages out of the sitemap until populated.
6. **Titles:** `{Away} at {Home} — {Week} {Season} Picks & Prediction | Galaxy Sports Edge`.
   Model-confidence % in meta description lifts CTR honestly.

Owner hook: items 2+4 are pure additive Next.js work — safe first PR after the
swarm lands (new `lib/seo/jsonld.ts` + sitemap expansion, zero engine changes).

## WIN 3 — BullMQ Cron Patterns (distilled from enescingoz/awesome-n8n-templates)

No n8n install. Five transferable workflows mapped onto the existing worker setup:

1. **RSS → Discord digest** (cron */30): poll sports RSS feeds → dedupe against
   last-run state → embed-formatted digest to announcement channel. Pairs with the
   June plan's Miniflux/RSSHub intake.
2. **Injury-report watcher** (cron hourly in-season): diff today's official injury
   feeds vs yesterday → alert + auto-flag affected edges as `stale` (feeds
   FORCE_NO_BET_IF_STALE naturally).
3. **Social cross-post queue** (cron 3x/day): blog post published → generate
   social variants (internal LLM tier) → stage in a `social_posts` table →
   scheduled publisher posts via OFFICIAL APIs only.
4. **Competitor content tracker** (cron daily): watch named competitor blogs'
   RSS → store titles+links only (facts+links rule) → weekly LLM summary of their
   angles vs ours → content-gap ideas into the editorial queue.
5. **Stripe dunning nudge** (cron daily): failed payments >24h → email via
   transactional provider when wired; until then, flag account state in admin.

All five are plain BullMQ repeatable jobs — no new runtime, patterns only.

## WIN 4 — Stripe Webhook + Anti-Abuse Hardening Checklist (from velobase-harness)

For the LIVE-key swap step in START_HERE.md's launch sequence:

- [ ] Verify webhook signature on EVERY route (raw body, before JSON parse).
- [ ] Idempotency: key handlers on `event.id` (Stripe retries deliveries).
- [ ] Handle: `checkout.session.completed`, `customer.subscription.updated/deleted`,
      `invoice.payment_failed` → drive tier flags from ONE subscription-state
      reducer, never ad-hoc per-route logic.
- [ ] Anti-abuse: rate-limit signup + checkout-initiation endpoints; block
      disposable-email domains at checkout; cap free-tier pick views per IP+account.
- [ ] Meter audit trail: log entitlement changes with receipt-style provenance
      (matches the existing proof-receipts pattern).
- [ ] Test mode matrix: sub create → upgrade → downgrade → fail payment → cancel;
      assert tier flags after each (script it once, run before going live).

## WIN 5 — Discord Community Bot — Minimal Spec (from hihumanzone/Gemini-Discord-Bot pattern)

Reference architecture only (that repo is Gemini-coupled; GSE swaps its own model
router). Spec for the post-C3 community push:

- discord.js, slash commands only (no message-content intent = fewer permissions,
  less ToS surface): `/pick [game]` returns the PUBLIC free pick + provenance link;
  `/record` returns the track-record widget stats.
- Thread-per-game auto-channels during slate windows; bot posts the public pick
  stub, discussion happens in-thread.
- Rate-limit + moderation controls copied conceptually (per-user command cooldowns).
- Runs as one more BullMQ-adjacent worker process; token in env; NEVER scrapes.

## WIN 6 — Adopt-Later Cards (parked, with trigger conditions)

| Item | Trigger | Integration point |
|---|---|---|
| harry0703/MoneyPrinterTurbo (MIT) | Gates C3+C7 flipped; blog has ≥10 posts | Content-engine video arm: post → short-video for Shorts/TikTok w/ own narration text |
| Postiz (AGPL — self-host ONLY, never embed) | Social distribution becomes manual pain | Separate host (Oracle VPS), official OAuth apps, GSE content pushed via its API |
| Coolify (Apache-2.0) | Vercel bill OR worker limits bite | Oracle free VPS: Coolify runs Next.js + workers + Redis; migrate Postgres last |
| XPack-MCP-Marketplace (Apache-2.0) | Engine stable post-launch | Expose pick-explainer as paid MCP server — new channel, zero core risk |
| Grok Imagine Image 2.0 | Marketing visuals needed & API GA | OG images / track-record widget graphics only |

---
*Written 2026-08-24 by ox-alpha triage session. Discovery round (50 repos) compiling separately.*
