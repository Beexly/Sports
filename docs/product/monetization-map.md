# Monetization Map

> Every revenue stream the Sports Intelligence OS supports, organized
> by phase, with the surfaces that produce the revenue and the open
> commercial decisions (Part 6) blocking each one.
>
> The wedge stays the wedge: consumer subscriptions are the brand. The
> other streams compound the platform.

## The five streams

| # | Stream | Phase | Surface | Revenue model | Status |
|---|---|---|---|---|---|
| 1 | Consumer subscription | Live | `/pricing`, gated routes | $19/mo Pro, $49/mo Elite (Stripe) | **Live** |
| 2 | Creator tools (Galaxy Studio) | 3 → 6+ | `/cockpit/studio` | Solo (owner) in P3; Creator-tier subscription in P6+ | Spec drafted |
| 3 | B2B widgets + API | 5 | `/embed/*`, `/api/intelligence/*` | Per-call or per-seat API subscriptions, white-label arrangements | Future |
| 4 | Affiliate + commerce | 4 | One link per pick detail page | $50–$500 per qualifying sportsbook signup | Future |
| 5 | Trust + compliance toolkit | 5+ | License to other operators | Per-operator license fee | Internal use today |

## Phase-by-phase revenue plan

### Phase 0-1 (now → Phase 1 ships)

**Revenue:** consumer subscription only. Existing Stripe flow.

**Compounding work:** the new homepage (Phase 1) is purely a conversion
play — the templated chassis is brand damage every day it persists.
Master plan decision #22.

### Phase 2

**Revenue:** consumer subscription. Phase 2 wires real data into the
new surfaces and builds the Intelligence Graph foundation. Net revenue
impact: zero direct, but the Graph is the substrate for streams 2-5.

### Phase 3

**Revenue:** consumer subscription primary; Studio is internal (owner
uses it to produce more content faster, which compounds the wedge).

The autonomous Twitter/X bot (radical #3, free picks only) is a
**funnel surface** — drives traffic to the paywall — not a revenue
surface itself.

The Model Journal essays drive SEO + authority and reduce churn for
Elite tier (who get the "What Was Learned" weekly digest). Indirect
revenue impact.

### Phase 4

**Revenue streams added:**

- **Affiliate + commerce** — one subtle "Place this at [book]" link on
  pick detail pages. Estimated $50–$500 per qualifying sportsbook
  signup from DK/FD/MGM/Caesars.
- **Education product** — $99 course ("how to read a slate like
  Galaxy"). One-time purchase.

**Blocked on:**

- Sportsbook affiliate program enrollment (master plan Part 6 open
  decision; needs per-program licensing review against Texas LLC
  jurisdiction — see `docs/corporate-structure.md`).
- Education product pricing finalization.

### Phase 5

**Revenue streams added:**

- **B2B widgets + API** — paid API tier with key management, rate
  gates, per-widget pricing.
- **Researcher Program** — manual access to settled-pick data exports.
  Free with co-authorship credit, paid for commercial researchers.
- **Trust + compliance toolkit licensing** — sellable to other sports
  betting operators. Per-operator license fee.

**Blocked on:**

- B2B API pricing tiers (master plan Part 6 open decision).
- Trust + compliance toolkit pricing.
- White-label licensing structure (per-license, per-seat,
  revenue-share?).

### Phase 6+

**Revenue streams added:**

- **White-label engine licensing** — full engine plus methodology for
  other sports media properties (their UI, our math). Revenue per
  licensee.
- **Multi-contributor House picks** — named handicappers with
  individual track records. Either subscription tier upgrade or
  revenue-share with creators.
- **Self-service paid API tier** — full API with key management, SDKs,
  pricing per usage tier.
- **Local + youth sports expansion (TeamHub)** — separate revenue
  stream (sponsor slots, schedule data product). Defer until consumer
  + B2B products are mature (master plan decision #19).

## Open commercial decisions blocking specific streams

These all live in master plan Part 6 "Decisions still open (owner-only)":

- **Sportsbook affiliate program enrollment** — Phase 4 blocker. Needs
  per-program licensing review (DraftKings, FanDuel, BetMGM, Caesars,
  BetRivers, Underdog, PrizePicks).
- **White-label licensing pricing** — Phase 6+ blocker. Engage IP
  counsel and accountant.
- **B2B API pricing tiers** — Phase 5 blocker. Decide at Phase 5
  planning kickoff.
- **Education product price** — Phase 4 blocker. $99 is the default
  per radical #1.
- **Trademark filings** — Phase 5 blocker (B2B contracts need IP
  basis). File `Galaxy Sports Edge`, `Edge Index`, `Gate Cam`,
  `Galaxy IQ`, `Galaxy Studio`, `Galaxy Sports Network` as marks held
  by Galaxy Sports Network LLC.
- **Domain consolidation** — Phase 5 cosmetic. Register
  `galaxysportsnetwork.com` as corporate domain.

## Anti-monetization rules

These are master plan hard rules. Violating them breaks the brand.

1. **No aggressive affiliate placement.** One subtle link per pick
   detail page. No banners, no homepage, no upsell modals, no
   interstitials. (Master plan decision #12.)
2. **No fake scarcity or limited-time pop-ups.** That's
   AIPredictions.com territory.
3. **No "VIP card / must profit or week free" gimmicks.** That's the
   Whop tout ecosystem.
4. **No multi-asset prediction marketplace.** No crypto, no stocks,
   no hedge fund pitching. (Master plan Part 0.)
5. **No OS-language in consumer copy.** Sports Intelligence OS framing
   stays B2B-only. Consumer sees "math you can read."
6. **No upgrade-or-die paywalls on educational content.** Free tier
   gets one pick per day plus full public surfaces (Gate Cam, Pass
   List, Public Ledger preview, Live Calibration, Edge Lab tools,
   public Edge Index, methodology page). Pay only for picks + scripted
   alerts + advanced tools.

## Tier capacity summary (for reference)

| Tier | Picks/day | Confidence | Factor breakdown | Alerts | Tools | Live war room |
|---|---|---|---|---|---|---|
| Free | 1 | Hidden | Hidden | None | Edge Lab basics | No |
| Pro ($19/mo) | All | Yes | Yes | Custom (basic) | Edge Lab full + DSL filters | No |
| Elite ($49/mo) | All + early access | Yes + post-mortems | Yes + analytics | Scripted (DSL) | Edge Lab + DSL alerts + backtesting + cross-sport queries | Yes |

Master plan Part 0 holds the canonical tier narrative. Any change
requires owner approval (master plan Part 4 rule #1).

## Forecast methodology (for owner-only modeling)

This document does NOT include revenue projections. The owner models
those separately. The map above gives the surface inventory; the owner
applies expected conversion rates per stream.
