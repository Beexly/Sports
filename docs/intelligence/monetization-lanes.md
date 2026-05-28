# Sports OS — Monetization Lanes

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3 · `docs/galaxy-monetization-expansion-master-plan-v3.md`
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

> This document maps the monetization lanes to the product ecosystem.
> It does not modify subscription logic, Stripe configuration, pricing pages,
> or any runtime behavior. All implementation changes require an approved
> change proposal per `docs/adr/pre-implementation-change-proposal-template.md`.

---

## Current Subscription Tiers (Implemented)

| Tier | Price | Access |
|---|---|---|
| Free | $0 | 1 pick/day, no confidence scores |
| Pro | $19/mo | All picks, confidence scores, line movement |
| Elite | $49/mo | All Pro + early access, analytics, alerts |

These are the live tiers. They are enforced server-side. They must not be
changed without a Stripe price ID update, schema migration, and owner approval.

---

## Monetization Lane Map

The 15 product ecosystem components map to six monetization lanes.
Lanes are ordered by readiness — Lane 1 has the lowest dependency count.

### Lane 1 — Subscription Intelligence (Current)

**Components**: Picks Intelligence [1], Fantasy Intelligence [2]
**Revenue model**: Monthly recurring subscription (Free / Pro / Elite)
**Current status**: Implemented — `/pricing`, Stripe checkout, webhook settlement
**Near-term levers**:
- Conversion optimization on `/pricing` (no code changes needed for copy)
- Confidence score as a visible Pro upgrade trigger
- Line movement alerts as Elite upgrade trigger
- Annual plan pricing (requires Stripe config change — approval needed)

**Constraints**: No win-rate claims without 30+ settled picks per model version.
No confidence score on Free tier.

---

### Lane 2 — Galaxy Vault (Premium Intelligence Community)

**Components**: Picks Intelligence [1], Signal Ledger [8], Operator Cockpit [10]
**Revenue model**: Higher-tier subscription or standalone community membership
**Current status**: `/vault` page exists — content and conversion flow pending
**Dependencies before launch**:
- Evidence Vault schema (BLOCKED — schema approval needed)
- Signal Ledger MVP (BLOCKED — schema approval needed)
- Vault content system (`docs/vault-content-system/` exists — review needed)

**Value proposition**: Access to full pick provenance timelines, settled-pick
history, calibration data, and the methodology that powers the intelligence.
Not gambling signals — intelligence transparency.

---

### Lane 3 — The Galaxy Almanac (Premium Content)

**Components**: Public Trust / Methodology [12], AI-Search / GEO [14]
**Revenue model**: Paid newsletter, paid research briefs, or Elite add-on
**Current status**: Planning only — `docs/rd-2026-05-23/galaxy-almanac-sample-essay.md` exists
**Dependencies before launch**:
- Methodology pages expanded (low friction — copy work only)
- GEO anchor pages complete (low friction — existing routes)
- Claim governance in place before any published accuracy claims

**Value proposition**: Long-form sports intelligence — scheme analysis,
model calibration breakdowns, source quality deep dives. Credibility content
that also serves GEO authority building.

---

### Lane 4 — Fantasy Intelligence (Premium Vertical)

**Components**: Fantasy Intelligence [2], Entity Graph [7], Evidence Vault [6]
**Revenue model**: Add-on to Pro/Elite, or standalone Fantasy tier
**Current status**: Planning only — `docs/brain/fantasy-war-room.md` (pending CC-2)
**Dependencies before launch**:
- Fantasy War Room schema (BLOCKED — schema approval needed)
- Entity Graph implementation (BLOCKED)
- Provider-agnostic fantasy entity layer

**Value proposition**: Fantasy decision support powered by the same intelligence
infrastructure as picks — not a separate, siloed product. Start/sit grounded
in source-backed usage trends, not aggregated consensus.

---

### Lane 5 — Developer / API (B2B)

**Components**: Developer / Innovation [13], Future API / B2B [15]
**Revenue model**: API usage-based billing, enterprise licensing
**Current status**: Planning only — `docs/intelligence/developer-innovation-layer.md`
**Dependencies before launch**:
- Evidence Vault (BLOCKED)
- Signal Ledger (BLOCKED)
- Entity Graph (BLOCKED)
- API governance, rate limiting, licensing, attribution policy
- At minimum Lanes 1–2 must be operationally stable

**Value proposition**: Sports OS intelligence as a platform. Let builders query
the entity graph, evidence vault, and signal ledger via a governed API.

---

### Lane 6 — Media / Content Studio

**Components**: Operator Cockpit [10], Public Trust / Methodology [12]
**Revenue model**: Sponsorship, licensing, B2B content partnerships
**Current status**: Doctrine only — `docs/design/media-studio-doctrine.md` (pending CC-4)
**Dependencies before launch**:
- Pick Provenance Timeline component
- Media studio workflow (no auto-publish — human review required)
- Content provenance and review policy

**Value proposition**: Differentiated intelligence content — Loss Room autopsies,
Market Gravity explainers, Brain answer walkthroughs — as distributable media.

---

## Revenue Sequencing

The recommended sequencing based on dependency count and build cost:

```
NOW (implemented):
  Lane 1 — Subscription Intelligence
  ↓
NEXT (low-dependency):
  Lane 3 — Galaxy Almanac (copy work, existing routes, GEO)
  ↓
AFTER VAULT + LEDGER APPROVAL:
  Lane 2 — Galaxy Vault (requires schema approval)
  Lane 4 — Fantasy Intelligence (requires schema + entity graph)
  ↓
AFTER LANES 1–4 ARE STABLE:
  Lane 5 — Developer / API (highest dependency count)
  Lane 6 — Media Studio (parallel to Lane 3, low technical friction)
```

---

## What Must Not Be Done Without Approval

| Action | Approval needed |
|---|---|
| Adding a new Stripe price ID or tier | Yes — Stripe config + schema + tests |
| Changing Pro or Elite feature access | Yes — server-side enforcement must be updated |
| Publishing win-rate or accuracy claims | Yes — minimum sample threshold must be met |
| Launching any new paid surface | Yes — claim governance must be in place |
| Introducing a B2B API | Yes — licensing, rate limiting, attribution policy all required |
| Adding affiliate or sportsbook partner integrations | Yes — legal review required |

---

## Monetization Anti-Patterns (Never Do)

- Fake win-rate claims to drive conversions
- "Guaranteed picks" or certainty language on any tier
- Showing confidence scores on Free tier (even temporarily "to drive upgrades")
- Affiliate links to sportsbooks without legal review
- Paywalls enforced only via CSS (server-side enforcement required)
- Publishing a pick before its evidence has been source-checked
