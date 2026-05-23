# Galaxy — The Sports Intelligence OS

> The business architecture above the consumer position. Consumer-facing
> language stays *"We're not AI. We're math you can read."* This doc
> describes the platform shape underneath that consumer wedge — the
> five-way monetization frame from master plan Part 0.
>
> Read this when you need to understand *why* a specific surface
> exists; the individual surface specs explain *what* and *how*.

## The mental model

One unit of sports intelligence = one game's factor breakdown + its
settled outcome. That unit is produced once by the deterministic
prediction engine, stored in `Pick` + `PickSignalSnapshot` + `GameSignal`,
and projected five different ways depending on who's reading it:

```
                       ┌─────────────────────────┐
                       │  Sports Intelligence    │
                       │  unit (one game's       │
                       │  factor breakdown +     │
                       │  settled outcome)       │
                       └────────────┬────────────┘
                                    │
        ┌─────────────┬─────────────┼─────────────┬─────────────┐
        │             │             │             │             │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │Consumer │   │Creator  │   │  B2B    │   │Affiliate│   │  Trust  │
   │   sub   │   │  tools  │   │widgets +│   │+commerce│   │  +comp.  │
   │         │   │ (Studio)│   │   API   │   │         │   │ toolkit  │
   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

Each branch is a distinct product line. The same unit pays for itself
five times.

## The five branches

### 1. Consumer subscription — the wedge

Free / Pro / Elite tiers, See it / Bet it / Master it narrative
(master plan Part 0). This is what the homepage sells. This is the
brand. This is what users know.

Surfaces: `/`, `/picks`, `/board`, `/ledger`, `/methodology`,
`/observatory`, `/performance`, `/vault`, `/pricing`, `/responsible-play`,
plus Phase 4's calibration training, Edge Lab, GitHub-Issues-for-the-model,
plus Phase 4's `/room/[gameId]` Model Court conversational layer.

Revenue: Stripe subscriptions at $19/mo (Pro) and $49/mo (Elite).

### 2. Creator tools — Galaxy Studio

`/cockpit/studio`. Solo (owner) in Phase 3; multi-contributor in Phase
6+. One slate or one game becomes: fan explainer, fantasy angle,
betting education angle, X thread, TikTok/Reels script, newsletter
block, sponsor-safe blurb, YouTube title + thumbnail ideas, compliance
scanner pass, citations attached, "approved for public?" indicator.

No auto-posting. Always human-in-the-loop publish step.

Revenue: enables the owner to publish faster (compounds the wedge), and
is sellable as a creator-tier subscription at Phase 6+ when
multi-contributor lands.

See `docs/product/galaxy-studio-spec.md`.

### 3. B2B widgets + API

`/embed/*` widgets and `/api/intelligence/*` REST endpoints. Buyers:
sports newsletters (Substack, Beehiiv), Discord capper communities (the
legit ones), fantasy creators (DFS shops), local sports media,
sportsbook affiliate partners (for compliant content), and eventually
academic researchers + fintech adjacencies.

Revenue: API tier subscriptions (per-call or per-seat), per-licensee
white-label arrangements.

Ships Phase 5. See `docs/product/b2b-widgets-spec.md` (TBD).

### 4. Affiliate + commerce

One subtle "Place this at [book]" deeplink per pick on the pick detail
page only. Never homepage. Never interstitials. Never upsell modals
(master plan decision #12).

Revenue: $50–$500 per qualifying sportsbook signup from
DK/FD/MGM/Caesars. Enrollment requires per-program licensing review
against the Texas LLC jurisdiction (see `docs/corporate-structure.md`).

Phase 4.

### 5. Trust + compliance toolkit

Already running internally as `lib/trust-claims.ts`,
`lib/promotions/guards.ts`, `lib/promotions/public-payload.ts`, and the
extensive brand-safety test suite. Phases 2-4 we keep building this for
our own use. Phase 5+ we package it as a sellable B2B layer to other
sports betting operators who need compliance scaffolding without
rebuilding it from scratch.

Revenue: license fee per operator (TBD pricing — see master plan Part
6 open decisions).

## The Intelligence Graph — the platform brain

The five branches share one data substrate. The Intelligence Graph
(Phase 2 foundation work, `docs/product/intelligence-graph-spec.md`) is
the typed primitives module that projects `Pick` / `PickSignalSnapshot` /
`GameSignal` into the read-models each branch consumes:

- `GameIntelligenceNode` — the composite read model for a game
- `MarketPulse` — market state aggregate
- `EvidenceHealth` — source-trust scoring across signals
- `SlateWeather` — daily context aggregate
- `ModelCourtCase` — a Q&A exchange grounded in evidence
- `UserLens` — Fantasy / Fan / Bettor / Creator / Analyst view config
- `MonetizationSurface` — entitlement-aware projection
- `CreatorAsset` — the Studio output type

No UI. No DB writes (initially). Pure TypeScript types and pure
functions over existing data.

## Hard rules — do not violate without amending the master plan

1. **The consumer wedge stays.** This OS framing is for the business
   side. Don't market the OS to consumers. Market "math you can read."
2. **No LLM in the prediction pipeline.** The Claude API appears only
   in: content generation, Model Court conversational layer,
   methodology tutor, "Why this pick?" explainer. Never in scoring,
   confidence, gating, or settlement.
3. **No public EV / Kelly / win-rate / implied-probability claims**
   unless the relevant gate allows. The Intelligence Graph respects
   the bootstrap-canonical gating system.
4. **No auto-posting from Galaxy Studio.** Always human-in-the-loop.
5. **B2B widgets respect entitlements.** Free widgets (`edge-index`)
   expose only what's already free on the consumer site. Paid widgets
   gate behind API keys.

## Open positioning questions

- How do we describe the OS to B2B buyers without bleeding OS language
  into consumer surfaces? Provisional answer: separate
  `galaxysportsnetwork.com` corporate site at Phase 5 launches as the
  B2B / corporate landing surface; the consumer-facing
  `galaxysportsedge.com` never mentions the OS framing in user copy.
  See open commercial actions in `docs/corporate-structure.md`.

- When does the Sports Intelligence OS frame first appear in writing on
  any public surface? Provisional answer: Phase 5, on the corporate
  domain only. The press / about pages on the consumer site mention
  Galaxy Sports Network LLC as parent (master plan decision #26) but
  do not market the OS.
