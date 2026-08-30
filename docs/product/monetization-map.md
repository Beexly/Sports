# Monetization Map

**Status:** Strategic reference. Updated as monetization choices land.
**Decision reference:** master plan Part 6 DEC-013 (Sports Intelligence OS as business architecture), DEC-017 (B2B in Phase 5), DEC-018 (Trust toolkit as fifth monetization).

---

## The frame

The consumer position is **"We're not AI. We're math you can read."** That's what the public sees.

The business view is bigger. **Galaxy Sports Edge is a Sports Intelligence platform. Sports betting is the wedge product.** The same unit of intelligence — one game, one factor breakdown, one settled outcome — monetizes five ways.

The wedge stays the wedge. The OS frame does not show up in consumer marketing. It shows up in pricing pages for creators and B2B buyers, in licensing conversations, and in how we prioritize engineering work.

---

## The five monetizations

### 1. Consumer subscription

**Product:** Galaxy Sports Edge as it stands today, with tiers Free / Pro / Elite.

**Audience:** Skeptical, technically-literate sports bettors who don't trust touts and don't believe AI hype.

**What they pay for:**

- **Free** — One pick a day plus all free public surfaces (Gate Cam, Pass List, Public Ledger preview, Live Calibration chart, Edge Lab tools, public Edge Index, methodology page).
- **Pro ($19/mo)** — All picks, confidence scores, quick reasoning, factor breakdown, custom alerts, Discord/Telegram pipes, programmable alerts (Phase 5), cross-sport correlation queries (Phase 5).
- **Elite ($49/mo)** — Everything in Pro plus the "What Was Learned" weekly digest, alerts with reasoning, early access, programmable DSL filters (Phase 5), backtesting (Phase 4), live war room access (Phase 5).

**Pricing locked:** DEC-010. Tier narrative is See it / Bet it / Master it.

**Phase status:** Live. Phases 1–4 grow it.

---

### 2. Creator tools (Galaxy Studio)

**Product:** Galaxy Studio at `/cockpit/studio`. Packages a slate into shareable assets — threads, scripts, newsletters, sponsor-safe blurbs — with citations and compliance checks baked in.

**Audience:**

- Sports newsletter writers (Substack, Beehiiv, Ghost).
- Solo podcasters and YouTubers.
- Fantasy DFS content creators.
- Long-tail social-media accounts focused on sports betting.

**What they pay for:**

- A creator subscription tier (TBD, likely $99/mo or $999/yr — DEC-OPEN). Buys access to Studio asset generation, citations, compliance scanner, batch publishing tools.
- Sponsor-safe blurb generation for monetizing newsletters with sportsbook sponsorships.

**Phase status:** Phase 3 builds the v0. Phase 4+ adds Canva/TikTok script generation, Slack/Gmail draft routing.

**Strategic note:** This is the single biggest force multiplier on the platform. One game → ten assets → ten creators distributing for us.

---

### 3. B2B widgets and API

**Product:** Embeddable widgets and a paid REST API. Lets other operators consume Galaxy's intelligence in their own products.

**Audience:**

- Sports newsletter operators who want a Market Pulse widget in their daily send.
- Discord capper communities (the legit ones, not the touts) who want a Model Court Q&A widget.
- Fantasy DFS content shops who want Slate Weather context.
- Local sports media sites that want per-game Edge Index widgets for SEO + credibility.
- Sportsbook affiliate content arms that need compliant content scaffolding.

**Widgets (Phase 5):**

- `/embed/market-pulse/[gameId]`
- `/embed/slate-weather`
- `/embed/model-court/[gameId]` (paid)
- `/embed/edge-index/[gameId]` (free, branded)

**API endpoints (Phase 5):**

- `/api/intelligence/game/[id]`
- `/api/intelligence/slate`
- `/api/intelligence/creator-pack`

**Pricing TBD (DEC-OPEN-C):** Per-call, monthly minimum, or revenue-share. Decided at Phase 5 planning.

**Phase status:** Phase 5 build.

---

### 4. Affiliate and commerce

**Product:** One subtle sportsbook deeplink per pick. Future-state: tickets, tools, merch — never aggressive, never homepage placement.

**Placement (DEC-012):** Pick detail page only. No banners. No homepage placement. No upsell modals. No interstitials.

**Audience:** Existing Galaxy users who are about to place a bet anyway. We earn the affiliate fee for being the place they decided to bet.

**Revenue model:** $50–$500 per qualifying signup, varies by book. Recurring CPA + revenue-share deals available with some books.

**Phase status:** Affiliate links land Phase 4. Sportsbook enrollment (DK, FD, MGM, Caesars, BetRivers, Underdog, PrizePicks) is DEC-OPEN-A — owner decision.

**Strategic note:** This is the monetization with the highest ceiling and the most risk to brand. A single misjudged placement undoes a year of trust-building. The restraint is the product.

---

### 5. Trust and compliance toolkit

**Product:** The claim scanner, promo guard, Loss Room, and evidence registry — packaged and licensed to other operators.

**Audience:**

- Other sports betting media properties that want compliance scaffolding without rebuilding it.
- Fantasy operators facing regulatory scrutiny.
- Sportsbook affiliate content arms that need automated compliance checks on content their writers produce.

**What they buy:**

- The claim scanner as an API (checks copy against unsupported-claim patterns).
- The promo guard as an API (checks sportsbook promo copy for regulatory compliance).
- The Loss Room as a white-label widget (proves operator restraint to regulators + users).
- The evidence registry as a data product (audit trail for claims).

**Phase status:** Phases 2–4 build for Galaxy's own use. Phase 5+ packages and licenses.

**Strategic note:** Codex's insight — the restraint posture is itself a product. Other operators need it. We have it built.

---

## Cross-monetization stack

The five layers compound. The same engine produces:

- A consumer pick (monetization 1).
- A Studio thread that drives sign-ups to monetization 1 (monetization 2).
- A Market Pulse widget embedded in someone else's newsletter (monetization 3).
- A sportsbook deeplink on the pick detail page (monetization 4).
- A claim-scanner API call from a third-party content shop (monetization 5).

Engineering effort in the engine compounds across all five. Investing in the engine is investing in five revenue streams.

---

## Affiliate and licensing decisions deferred to owner

These do not block engineering work. They resolve at the relevant phase boundary.

- **DEC-OPEN-A** — Sportsbook affiliate program enrollment (Phase 4).
- **DEC-OPEN-B** — White-label engine licensing pricing (Phase 5).
- **DEC-OPEN-C** — B2B API pricing tiers (Phase 5).
- **DEC-OPEN-D** — Education product final price (Phase 5).

---

## What we do not monetize

These are deliberately free, forever:

- The public Edge Index per tracked game.
- The methodology framework page.
- The Pass List (every game we considered and didn't publish).
- The Public Ledger (every settled pick, with the signal snapshot).
- Live Calibration chart.
- The model changelog.
- Loss Room (public sub-archive).

Free + transparent at the foundation is the moat. Paywalling those surfaces would be a category error.

---

## What we do not pursue

These are explicit anti-products:

- Aggressive sportsbook affiliate placement (banners, interstitials, homepage takeovers).
- "VIP card" tout-coded subscription tiers.
- Multi-asset prediction marketplaces (crypto, stocks, etc.).
- White-labeling the consumer-facing brand. White-labeling the engine is fine; white-labeling Galaxy Sports Edge as a brand is not.
- Paid social ads that use any of the banned vocabulary from `docs/positioning.md`.

---

*Cross-references: master plan Part 0 (business architecture), Part 2.F (OS surfaces), Part 6 decisions. Updated when monetization decisions land.*
