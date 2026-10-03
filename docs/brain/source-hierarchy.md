# Sports OS — Source Hierarchy

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §4.1
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

Every piece of intelligence in Sports OS carries a source tier. The tier
determines: how much weight the evidence receives, how quickly it expires,
whether it can appear on a public surface, and what language must surround it.

No claim reaches a user without a declared source tier. No tier is treated
as equivalent to a higher tier. Tier 6 is never a source of truth.

---

## Six-Tier Taxonomy

### Tier 1 — Official / Primary

**Definition**: Direct statements from the authoritative entity.

| Source type | Examples |
|---|---|
| Team official communications | Injury designations, roster moves, press conferences |
| League official feeds | Transaction wire, official injury report (NFL, NBA, etc.) |
| Coach / GM / player direct statements | Press conference audio/transcript, official team statements |
| Credentialed beat reporters on-site | Reporters physically present at practice with confirmed access |

**Freshness TTL**:
- Standard: 15 minutes
- Game-day injury update: 5 minutes
- Pre-game practice report: 30 minutes

**Allowed use**: All surfaces — public, premium, cockpit.

**Public-safe**: Yes, with source attribution.

**Citation rule**: Must cite source name and timestamp. Example:
`Source: Official NFL injury report — retrieved [timestamp]`

**Contradiction behavior**: Tier 1 overrides all lower tiers on the same claim.
When two Tier 1 sources conflict, flag as CONTRADICTED and require human review.

---

### Tier 2 — Licensed / Structured Data

**Definition**: Data received under a formal API agreement or data license.

| Source type | Examples |
|---|---|
| Licensed sports data APIs | The Odds API (odds/lines), licensed stats providers |
| Official data partnerships | League-sanctioned advanced stats feeds |
| Paid structured feeds | Injury data services with SLA and terms |

**Freshness TTL**:
- Live game data: 2 minutes
- Pre-game odds/lines: 5 minutes
- Historical stats: 24 hours (re-fetch on material update)

**Allowed use**: All surfaces — subject to license terms.

**Public-safe**: Yes, subject to license redistribution terms.
The Odds API data may not be redistributed raw — display as derived intelligence only.

**Citation rule**: Must cite provider name. Raw API data must not be republished
verbatim unless the license permits it.

**Constraint**: No raw odds redistribution without explicit licensing from
The Odds API. Odds must be displayed as Sports OS intelligence context,
not as a data product.

---

### Tier 3 — Trusted Secondary

**Definition**: Reporting from credentialed journalists and established outlets
with a track record of accuracy. Not primary source — subject to verification.

| Source type | Examples |
|---|---|
| Established sports media | ESPN, The Athletic, major market beat coverage |
| Credentialed analysts with history | Analysts with verifiable track records |
| Aggregated consensus from T1/T2 | Aggregations where primary sources are named |

**Freshness TTL**: 2 hours standard. 30 minutes for breaking news.

**Allowed use**: Public with caveat language. Premium without caveat if
corroborated by Tier 1 or Tier 2.

**Public-safe**: Yes, with source attribution and freshness disclosure.

**Citation rule**: Cite outlet and reporter name where known.
`Reported by [Outlet] ([reporter if known]) — retrieved [timestamp]`

**Contradiction behavior**: If Tier 3 conflicts with Tier 1, Tier 1 wins.
Log the contradiction in the Evidence Vault when implemented.

---

### Tier 4 — Market Signals

**Definition**: Price action and consensus signals from betting markets.
Informative about perceived probability — not a direct information source.

| Source type | Examples |
|---|---|
| Line movement | Opening line vs. current line, speed of movement |
| Book consensus | Agreement or disagreement across sportsbooks |
| Public vs. sharp proxy | High-volume vs. low-volume-high-sharp indicators |
| Implied probability shifts | Calculated from odds changes |

**Freshness TTL**:
- Live market: 2 minutes
- Pre-game market: 10 minutes

**Allowed use**: Premium and cockpit surfaces. Public surfaces may show
market context without implying inside information.

**Public-safe**: Conditionally. Market signals may be described as
"market movement" or "line context" — never as "sharp money confirmation"
without supporting Tier 1–2 evidence.

**Forbidden**: Do not claim sharp money is on a side unless supported by
specific, verifiable Tier 1 or Tier 2 data. Market movement alone is
not evidence of sharp action.

---

### Tier 5 — Community / Weak Signal

**Definition**: Unverified information from community sources, social media,
forums, and unconfirmed reports.

| Source type | Examples |
|---|---|
| Reddit / forums | r/fantasyfootball, team-specific subreddits |
| Beat reporter social media | Twitter/X posts not yet corroborated |
| Fan accounts, unofficial insiders | Unverified sources claiming inside access |
| Keyword / sentiment spikes | Mentions of injury terms, player names, lineup chatter |

**Freshness TTL**: 30 minutes for watchlist purposes only.

**Allowed use**: Cockpit only — for watchlist flags and verification queuing.
Never on public surfaces as a standalone claim.

**Public-safe**: No. Tier 5 data must never appear on a public surface as
a stated fact, confirmed status, or pick rationale.

**Required language** (cockpit-only outputs):
- "Unverified community chatter detected"
- "No official confirmation found"
- "Treat as watchlist only — requires Tier 1 or Tier 2 verification"
- "Community discussion rising — not a confirmed signal"
- "Market movement does / does not align with chatter"

**Forbidden outputs from Tier 5**:
- Verified injury status
- Inside information claims
- Public accusations about players or coaches
- Picks or recommendations based solely on community chatter

---

### Tier 6 — Synthetic / AI / Low Trust

**Definition**: AI-generated content, aggregator summaries, content of
unknown origin, or sources that cannot be attributed to a human reporter
or official entity.

| Source type | Examples |
|---|---|
| AI-generated sports summaries | GPT-produced recaps without primary sourcing |
| Aggregator sites without sourcing | Sites that aggregate without citing primary sources |
| Unattributed content | Articles with no clear author or outlet |
| Sports OS internal model output | Claude API responses used in the product pipeline |

**Freshness TTL**: Not applicable — Tier 6 is not a valid evidence source.

**Allowed use**: Never as a source of truth for any pick, claim, or
recommendation. May be used internally for content drafting only, with
human review before publication.

**Public-safe**: No. Tier 6 content may never be cited as evidence on
any Sports OS surface.

**Critical rule**: Sports OS model outputs (Claude API) are Tier 6.
They are content generation tools, not intelligence sources. A Brain answer
is only as strong as the Tier 1–4 evidence it synthesizes.

---

## Source Tier Quick Reference

| Tier | Label | TTL (standard) | Public-safe | Pick evidence |
|---|---|---|---|---|
| 1 | Official / Primary | 15 min | ✅ Yes | ✅ Yes |
| 2 | Licensed / Structured | 5 min live | ✅ Yes (license terms) | ✅ Yes |
| 3 | Trusted Secondary | 2 hr | ✅ With attribution | ⚠️ With corroboration |
| 4 | Market Signals | 10 min pre-game | ⚠️ Context only | ⚠️ Supporting only |
| 5 | Community / Weak Signal | 30 min | ❌ Never standalone | ❌ Never |
| 6 | Synthetic / AI / Low Trust | N/A | ❌ Never | ❌ Never |

---

## Staleness Behavior

When a source exceeds its TTL, the following applies:

**Approved staleness language**:
- "Based on information retrieved [N] hours ago — may have changed"
- "This data was last verified at [timestamp]"
- "Check official sources for the latest status"

**Forbidden staleness language**:
- "Current" or "live" when data is stale
- "Confirmed" without a recent Tier 1 check
- Omitting the timestamp entirely

Any pick or recommendation using stale Tier 1 or Tier 2 data must be
withheld until fresh data is retrieved, or surfaced only in the cockpit
with a STALE flag.

---

## Cross-Reference

- Evidence Vault: `docs/brain/evidence-vault.md` — stores `sourceTier` on every item
- Claim Governance: `docs/brain/claim-governance.md` — tier requirements per claim type
- Source Freshness ADR: `docs/adr/source-freshness-and-deploy-readiness-guide.md`
- Weak Signal Engine: `docs/brain/weak-signal-engine.md` — Tier 5 processing rules
