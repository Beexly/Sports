# Galaxy Live OBS Plugin PRD

Status: Draft
Build gate: Scenario C runway and founding partner commitment gate
Agreement companion: `../copy/live-founding-partner-agreement-template.md` (draft only; lawyer review required before use)

## Problem

Sports streamers need clean, credible live data overlays that add context without making their streams feel like generic gambling ads. Galaxy needs a high-leverage brand surface that can expose its model discipline to large audiences.

## User

Primary user:

- Sports streamer, analyst, DFS creator, or sports betting podcast operator.
- Wants a visually sharp overlay that can be controlled during live content.
- Needs low setup burden and low stream-crash risk.

Secondary user:

- Viewer who sees Galaxy's Edge Index and factor breakdown and visits Galaxy through partner attribution.

## Product Promise

Galaxy Live gives creators a transparent research overlay: Edge Index, factor breakdown, and model context directly inside live sports content.

## V1 Scope

In scope:

- OBS plugin or browser-source overlay path
- Streamer authentication
- Overlay configuration dashboard
- Position, opacity, theme, and data toggles
- Edge Index display
- Factor breakdown display
- Partner-specific attribution links
- Basic usage analytics
- Crash-safe fallback behavior
- Setup docs and support workflow

Out of scope:

- DAZN/fuboTV platform integrations
- White-label enterprise SDK
- Custom per-partner model logic
- Gambling transaction flows
- Guaranteed monetization claims

## Founding Partner Gate

Proceed only if:

- 3+ of 5 founding partner targets commit, or
- Garrett explicitly records a decision to run a single-partner pilot.

If 0 partners commit after 90 days, defer Live.

## Technical Requirements

- Overlay must remain readable at common stream resolutions.
- Failure must not crash or block the stream.
- Streamer can hide overlay instantly.
- Auth token leakage must not expose broader Galaxy admin access.
- Dashboard changes should appear without requiring stream restart where feasible.
- UTM attribution must be partner-specific.

## Pricing

| Tier | Price | Intended user |
|---|---:|---|
| Solo | $99/month | Individual streamer |
| Team | $499/month | Channel, podcast, or small network |

Founding partners:

- $0 for launch period.
- 10% revenue share for attributable subscribers for first 12 months.

## Success Metrics

| Metric | Target |
|---|---:|
| Founding partners active at launch | 5 target, 3 minimum |
| Closed-beta stream crashes attributable to overlay | 0 |
| Month-3 paid subscribers | 10+ minimum |
| Month-6 paid subscribers | 25+ minimum |
| Month-12 paid subscribers doubling trigger | 200+ |

Zero stream crashes attributable to the overlay is a launch gate. If closed beta produces an overlay-caused crash, public launch waits until the failure mode is fixed or a safer browser-source fallback ships.

## Founding-Partner Objection Handlers

### Sports betting integrations damage my brand.

Lead with Loss Room and Pass List. Position Galaxy as a research overlay, not a tout product or betting sponsor.

### My audience does not bet on sports at scale.

Do not argue. Reposition the overlay as analytical-content support. Factor breakdowns can serve game analysis without pushing betting behavior.

### Zero cost sounds good, but what is the actual upside?

Show revenue-share math in the demo:

- Pro at $19/month means $2.28/year per attributable Pro subscriber.
- Elite at $49/month means $5.88/year per attributable Elite subscriber.
- Vault at $200/year means $20/year per attributable Vault subscriber.

### What if Galaxy goes under?

Be direct. Galaxy is small. If Galaxy goes under, the overlay stops working, but the stream does not depend on it.

### Will the overlay crash my stream?

Closed beta exists to prove it will not. The overlay must fail closed by disappearing, not fail loud by disrupting a stream.

### Is this a gambling sponsorship?

Use "sports research overlay" language. Galaxy does not take bets or process wagers.

### We do not do exclusive partnerships at this fee level.

Galaxy is not asking for exclusivity. The founding partner can run other products if they choose.

### My client gets paid more than zero for integrations.

For tier-1 targets, negotiate a flat partnership fee from the $5k-$15k/quarter contingency rather than forcing a revenue-share-only structure.

### Can we see the contract before agreeing to a demo?

Use the lawyer-reviewed version of `copy/live-founding-partner-agreement-template.md` before manager outreach. Budget $2k-$5k for legal template work.

### What is your existing partnership track record?

Do not manufacture one. Say: "We are recruiting our founding 5. The track record you can verify is the public Galaxy product."

## Risks

| Risk | Mitigation |
|---|---|
| Sketch does not partner | Start with mid-tier partners and build case study |
| OBS instability | Closed beta and fail-closed behavior |
| Streamer sees it as gambling ad | Lead with transparent research, not picks |
| Competitor copies overlay | Galaxy differentiates through public losses and Pass List |
