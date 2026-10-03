# Sports OS — Final Wave Source Risk Register

**Status**: Doctrine. Updated when source risk profile changes.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/brain/source-hierarchy.md` — six-tier taxonomy
- `docs/brain/source-acquisition-mesh.md` — source registry and evaluation rubric
- `docs/audit/piracy-malware-do-not-use-register.md` — hard-banned sources
- `docs/source-providers/scores24-source-review.md` — specific provider review

---

## Purpose

This register documents the risk profile of each source category and specific
source provider reviewed as part of the Prompt 4 final wave. It is the
aggregate risk assessment used when deciding whether a source can be admitted
to the Source Acquisition Mesh.

Every source that Sports OS uses or considers using must have an entry in
this register (or in the piracy/malware register for hard-banned sources).

---

## Sports OS Fit

The platform's trust model depends on source integrity. A single bad source
admitted to the evidence pipeline can produce invalid picks, incorrect
confidence scores, and claims that expose the platform to legal or reputational
risk. This register is the first line of defense.

---

## Public / Private Boundary

This register is internal — it is not published on the public methodology page.
The methodology page discloses the tier taxonomy and general source categories.
It does not expose individual source risk profiles.

---

## Source Risk Framework

Each source is evaluated on four dimensions:

| Dimension | Description | Scale |
|---|---|---|
| **Data quality** | Accuracy, completeness, freshness | 1 (poor) – 5 (excellent) |
| **Legal / licensing** | License clarity, redistribution terms | 1 (unclear/risky) – 5 (clean/licensed) |
| **Reliability** | Uptime, SLA, historical continuity | 1 (fragile) – 5 (SLA-backed) |
| **Manipulation risk** | Susceptibility to deliberate misinformation | 1 (high risk) – 5 (low risk) |

**Overall risk tier**:
- GREEN — all dimensions ≥ 4: Admit immediately
- YELLOW — one dimension 3–3.9: Admit with documented constraints
- ORANGE — one dimension 2–2.9: Requires owner approval before admitting
- RED — any dimension < 2 or legal concern: Do not admit

---

## Source Category Risk Profiles

### Official League Feeds (Tier 1)

**Examples**: NFL official injury report, NBA transaction wire, MLB official
statistics (via official data program), MLS official feed

**Risk profile**:
- Data quality: 5 — authoritative, official
- Legal / licensing: 4 — public feeds (no redistribution issues for displayed output)
- Reliability: 4 — some league feeds have known API instability during playoffs
- Manipulation risk: 5 — official source has no incentive to misinform

**Overall**: GREEN  
**Constraint**: Display as derived intelligence, not raw redistribution.
Cite the league and timestamp. Never claim more freshness than the feed provides.

---

### The Odds API (Tier 2 — Current licensed provider)

**Risk profile**:
- Data quality: 5 — structured, multi-book, standardized odds format
- Legal / licensing: 5 — formal API agreement in place
- Reliability: 4 — API has known rate limits; burst handling required
- Manipulation risk: 4 — odds data reflects real market; some books deliberately mislead on opening lines

**Overall**: GREEN  
**Constraint**: Raw odds data may not be republished verbatim per license.
Derive and display as "market context." Attribute "odds data via The Odds API."
Rate-limit handling must prevent quota exhaustion. Burst failures must be
logged and flagged — do not silently serve stale odds.

---

### Licensed Stats Providers (Tier 2 — Future)

**Examples**: Sportradar, Stats Perform, Elias Sports Bureau, SportsDataIO

**Risk profile**:
- Data quality: 5 — professional-grade structured data
- Legal / licensing: 3–4 — licensing required; some providers prohibit derivative publishing
- Reliability: 5 — SLA-backed
- Manipulation risk: 5 — professional data providers

**Overall**: YELLOW (pending license review per provider)  
**Constraint**: Each provider must be individually licensed before use.
License terms must be reviewed for redistribution restrictions.
Do not ingest any stats provider data without a signed agreement.
Integration requires owner approval.

---

### Beat Reporters / Established Sports Media (Tier 3)

**Examples**: ESPN, The Athletic, team beat reporters on Twitter/X, credentialed beat writers

**Risk profile**:
- Data quality: 3–4 — high quality for breaking news; occasional errors on injury reports
- Legal / licensing: 4 — public reporting; fair use for attribution and summary (not full reproduction)
- Reliability: 3 — social media beats can go offline; publication shutdowns possible
- Manipulation risk: 3 — reporters are human and occasionally misreport

**Overall**: YELLOW  
**Constraint**: Cite reporter and outlet. Do not reproduce full article text.
Summarize and attribute. Apply 2-hour TTL standard. Never use as sole Tier 3
evidence without corroboration by Tier 1 or another Tier 3 source.

**Specific risk note — Twitter/X beats**: Twitter/X accounts can be hacked,
suspended, or impersonated. A beat reporter's tweet must be verified against
a second source before use as Tier 3 evidence for injury status. "Breaking"
reports with unusual claims (surgery, trade) require Tier 1 before use.

---

### Market Data / Sportsbook Feeds (Tier 4)

**Examples**: Closing line data, line movement feeds, public betting percentage data

**Risk profile**:
- Data quality: 3 — useful for market context; not a source of fact
- Legal / licensing: 3 — varies by provider; some require licensing
- Reliability: 4 — market data is broadly available
- Manipulation risk: 2 — sportsbooks deliberately shade lines; "public betting %" is
  often a manufactured engagement metric, not a real sharp/square signal

**Overall**: YELLOW  
**Constraint**: Market data is context only, never a primary evidence source.
"Sharp money" claims require specific Tier 1 or Tier 2 confirmation —
line movement alone is not sharp money evidence. Public betting percentages
must be disclosed as "public sentiment proxy" not "fact."

---

### Reddit / Forums / Community (Tier 5)

**Examples**: r/fantasyfootball, r/nfl, team subreddits, beat writer forums

**Risk profile**:
- Data quality: 1 — unverified, frequently incorrect, gameable
- Legal / licensing: 5 — public content, no license needed
- Reliability: 5 — consistently available
- Manipulation risk: 1 — high vulnerability to deliberate misinformation,
  astroturfing, and coordinated narrative manipulation

**Overall**: RED for evidence; YELLOW for watchlist-only cockpit monitoring  
**Constraint**: Tier 5 sources may never be used as evidence for any pick,
Brain answer, or recommendation. They may be monitored for weak signal detection
(watchlist purposes only). Any Tier 5 signal that reaches watchlist must trigger
a Tier 1 verification attempt before any action.

**Specific manipulation risk**: Bad actors can post coordinated false injury
reports to Reddit to move betting lines. The system must never let Reddit-
originated claims influence public picks without Tier 1 confirmation.

---

### AI-Generated Content / Aggregators Without Attribution (Tier 6)

**Examples**: GPT-generated sports summaries, sites aggregating without sourcing

**Risk profile**:
- Data quality: 1 — fabricated or unverifiable
- Legal / licensing: 2 — copyright status unclear; often reproduces copyrighted content
- Reliability: N/A
- Manipulation risk: 1 — trivially gameable; can contain injected misinformation

**Overall**: RED — Do not admit under any circumstances  
**Rule**: Sports OS model outputs are also Tier 6. Claude API responses used
in the content pipeline are content generation tools — not evidence sources.

---

## Specific Source Reviews — Final Wave

### Scores24

See `docs/source-providers/scores24-source-review.md` for full review.  
**Summary**: ORANGE — legal and licensing status unclear; scraping is forbidden;
monitoring for future official partnership only.

### DraftKings / FanDuel (Sportsbook Sites)

**Risk profile**:
- Data quality: 4 — real, timely odds
- Legal / licensing: 1 — Terms of Service prohibit automated scraping
- Reliability: 4
- Manipulation risk: 2 — lines are set by the books themselves

**Overall**: RED for scraping; GREEN for The Odds API aggregation (DK/FD included)  
**Rule**: Do NOT scrape DraftKings or FanDuel directly. Their Terms of Service
explicitly prohibit automated access. Access their odds via The Odds API, which
has the appropriate licensing agreements.

### ESPN / The Athletic

**Risk profile**:
- Data quality: 4
- Legal / licensing: 3 — public reporting; no direct data license
- Reliability: 4
- Manipulation risk: 3

**Overall**: YELLOW — Tier 3 with attribution rules  
**Rule**: May be used as Tier 3 sources for beat reporting and injury context.
Full article reproduction is not permitted. Summary + attribution is permitted.
Do not scrape ESPN's structured data feeds without a license.

---

## Source Evidence

This register was compiled from:
- R&D Batch 0–6 reference project reviews
- `docs/rejected-data-sources.md` (prior wave exclusions)
- `docs/data-source-options.md` (prior wave options review)
- Legal review completed 2026-05-20
- The Odds API license terms review

---

## Forbidden Actions

- Do NOT admit any RED source to the Source Acquisition Mesh
- Do NOT scrape any source whose Terms of Service prohibit automated access
- Do NOT use Reddit or forum content as evidence for picks
- Do NOT use AI-generated summaries as source evidence
- Do NOT use market movement alone as a "sharp money" claim
- Do NOT admit a Tier 2 licensed source without a signed agreement

---

## Approval Gates

| Change | Who approves |
|---|---|
| YELLOW source admission | Operator with documented constraints |
| ORANGE source admission | Owner approval required |
| New licensed provider | Owner + legal review |
| Any change to a RED classification | Owner approval |

---

## Validation Expectations

- No ORANGE or RED source appears in the Source Registry as ADMITTED
- The Odds API is the only active Tier 2 licensed source until additional licenses are signed
- All Tier 3 sources in use have documented constraint entries in this register
- Reddit and Tier 5 sources never appear in the Evidence Vault as evidence items
- This register is reviewed quarterly or when a new source is proposed

---

## Codex Audit Requirements

1. Confirm Source Registry contains no entries for RED-classified sources
2. Confirm The Odds API is the only active Tier 2 source
3. Confirm no direct scraping of DraftKings, FanDuel, or ESPN structured data
4. Confirm Tier 5 sources appear in cockpit watchlist only — never in Evidence Vault
5. Confirm any new source proposal references this register for risk classification
