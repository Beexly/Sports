# Data Rights Register — Galaxy Sports Edge

Galaxy depends on external data — odds feeds, player data, injury reports,
schedules, league marks, sportsbook content. Each source has its own
license, terms, and restrictions.

**Acquisition diligence will scrutinize this.** A buyer wants to know
that Galaxy's data pipeline is legally clean: that everything stored,
displayed, and resold is properly licensed.

This register is a per-provider record of what is allowed and what is not.

## Schema

| Field | Meaning |
|---|---|
| Provider | Name and contact |
| Service | Specific API or data product |
| License terms | Link or document reference |
| Allowed use | What we are permitted to do |
| Forbidden use | What we are prohibited from doing |
| Can store? | Yes / No / Conditional |
| Can display publicly? | Yes / No / Conditional |
| Can display to paid users? | Yes / No / Conditional |
| Can use in derived analytics? | Yes / No / Conditional |
| Can use in AI training? | Yes / No / Conditional |
| Can resell? | Yes / No / Conditional |
| Attribution required? | What and where |
| Rate limits | API quota |
| Retention limits | How long we can keep data |
| Cost | Pricing tier |
| Renewal | Contract renewal date |
| Status | Active / Pending / Terminated |

---

## Active providers

_None active at the time of this writing. Galaxy is in bootstrap mode
without `THE_ODDS_API_KEY` or other live data integrations._

---

## Pending / planned providers

### The Odds API

- **Provider:** The Odds API LLC (https://the-odds-api.com)
- **Service:** Real-time and historical sportsbook odds
- **License terms:** Per their Terms of Service — to be reviewed before
  activation
- **Env var:** `THE_ODDS_API_KEY` (not yet provisioned)
- **Allowed use (pending review):** Typically read-only consumption for
  application display
- **Forbidden use (pending review):** Reselling raw data, sublicensing,
  bulk redistribution
- **Can store?** Likely conditional — historical retention often capped
- **Can display publicly?** Yes for derived display, often with attribution
- **Can display to paid users?** Yes
- **Can use in derived analytics?** Yes
- **Can use in AI training?** **TO REVIEW** — many sports-data licenses
  prohibit training third-party models on the data
- **Can resell?** No
- **Attribution required?** **TO REVIEW**
- **Rate limits:** Per-tier (500–5,000,000 requests/month depending on
  plan)
- **Retention limits:** **TO REVIEW** — typically 30–90 days for free tier
- **Cost:** Free tier available; paid tiers from $30/month
- **Renewal:** Monthly
- **Status:** Pending

### Anthropic / Claude API

- **Provider:** Anthropic PBC
- **Service:** Claude API for content generation and Brain Q&A
- **License terms:** Anthropic Commercial Terms of Service
- **Env var:** `ANTHROPIC_API_KEY`
- **Allowed use:** Building applications that use Claude; production
  commercial use under commercial terms
- **Forbidden use:** Generating content that violates Anthropic's
  Usage Policy; reselling Claude as a standalone service; using outputs
  to train competing models
- **Can store?** Output stored as application data, yes
- **Can display publicly?** Yes (subject to attribution norms)
- **Can use in AI training?** Outputs may be used per Anthropic's terms;
  cannot use to train competitor models
- **Can resell?** Not as raw API access; can build paid product
- **Attribution required?** Not required for output display but
  recommended for transparency
- **Rate limits:** Per-tier
- **Retention limits:** Per Anthropic's data retention policy (zero
  retention available with zero-data-retention agreements)
- **Cost:** Per-token
- **Status:** Planned

### Stripe

- **Provider:** Stripe, Inc.
- **Service:** Payment processing
- **License terms:** Stripe Services Agreement
- **Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`
- **Notes:** Payment data is HIGHLY regulated. Galaxy must never store
  raw card numbers. Stripe handles PCI scope.
- **Status:** Planned

---

## Data categories and per-category posture

### Odds data

- **Source:** Live providers (The Odds API or alternatives)
- **License posture:** Read-display-derive permitted under most plans;
  resale and bulk redistribution prohibited
- **Internal rules:**
  - Store odds with provider attribution metadata
  - Cache no longer than provider-permitted TTL
  - Never expose raw provider IDs in public APIs

### Player and game data

- **Source:** TBD (potentially through odds provider or separate stats
  provider)
- **License posture:** Often more restricted than odds data due to
  league licensing
- **Internal rules:**
  - Do not display team logos or league marks without license
  - Use text-only references where mark licensing is unclear
  - Identify players by name only; do not use league-licensed images

### Injury reports

- **Source:** Public sources (team announcements, beat reporter feeds)
  plus aggregator if licensed
- **License posture:** Public-domain facts are unprotected, but
  aggregator services may impose terms
- **Internal rules:**
  - Cite source for material claims
  - Treat aggregator content as licensed; do not re-host

### League marks (NFL, NBA, MLB, etc.)

- **Source:** Leagues directly
- **License posture:** Restricted. Galaxy is not a licensee.
- **Internal rules:**
  - Use league names descriptively only (nominative fair use)
  - Do not display official logos
  - Do not imply league endorsement
  - Use generic "NFL Intelligence" framing, not "Official NFL Picks"
  - Add disclaimer footer where league names appear prominently

### Sportsbook marks

- **Source:** Sportsbooks
- **License posture:** Restricted absent affiliate agreements
- **Internal rules:**
  - List book names in comparisons (DraftKings, FanDuel, etc.) under
    nominative fair use
  - Do not display book logos without affiliate terms
  - If affiliate program joined, comply with their content rules

### User data (when accounts launch)

- **Categories:** Email, hashed password (or OAuth identity),
  subscription tier, bet log (if Tracker used), profile responses,
  exposure preferences
- **Posture:** Galaxy is the controller. Privacy policy required.
- **Internal rules:**
  - Minimize collection (do not collect what isn't used)
  - Encrypt at rest
  - Document retention period
  - Provide deletion on request
  - Never share with third parties without consent
  - GDPR/CCPA-compliant data subject request handling

---

## Pre-launch checklist

Before commercial launch:

- [ ] Review and accept terms of every active data provider
- [ ] Confirm each provider's AI-training posture (some prohibit;
  some require explicit opt-in)
- [ ] Document attribution requirements per provider
- [ ] Implement provider-required attribution in UI/footer
- [ ] Confirm caching and retention windows match license terms
- [ ] Confirm no league marks displayed without license
- [ ] Confirm no sportsbook logos displayed without affiliate terms
- [ ] Document user-data retention and deletion procedures
- [ ] Publish privacy policy that matches actual practice
- [ ] Designate DPO if any EU users in scope

## Review cadence

- Per-provider terms re-read annually or on T&C update notification
- Per-category posture reviewed quarterly
- Pre-launch full audit before commercial release
- Re-audit at any acquisition diligence event
