# Sports OS — AI-Search / GEO Visibility Strategy

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3.7
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## What GEO Means

GEO (Generative Engine Optimization) is the practice of making content
discoverable, citeable, and retrievable by AI answer engines — ChatGPT,
Perplexity, Google AI Overview, Claude, Gemini — in addition to traditional
search. AI engines retrieve structured, authoritative, clearly-sourced content.
Hype copy, unsupported claims, and thin pages are invisible to them.

Sports OS is well-positioned for GEO because its core value proposition —
source-aware, evidence-weighted, auditable intelligence — is exactly what AI
engines trust and cite.

---

## Why This Matters for Sports OS

Picks sites and tout services cannot be cited by credible AI engines. They have:
- No methodology transparency
- No source attribution
- Unverifiable claims
- Casino-adjacent language

Sports OS wins GEO by doing what they cannot:
- Publishing methodology that AI engines can read and cite
- Attributing every claim to a source tier
- Updating pages with timestamps AI engines can parse
- Using clear, non-hype language that passes AI content quality filters
- Building topical authority clusters around intelligence, not gambling

---

## Core Requirements

### 1. Stable URLs

Every intelligence surface must have a stable, semantically meaningful URL.
URL changes break AI citations. Do not rename routes without a redirect plan.

Current stable public routes that anchor GEO:
- `/methodology` — explains how Sports OS works
- `/observatory` — data freshness and system transparency
- `/responsible-play` — responsible gambling doctrine
- `/blog` — topical authority content
- `/vs/tout-services` — competitive differentiation page

Future GEO anchor pages (pending implementation approval):
- `/intelligence/how-it-works` — full intelligence network explanation
- `/intelligence/source-hierarchy` — six-tier source taxonomy
- `/intelligence/calibration` — model accuracy and calibration methodology
- `/intelligence/glossary` — canonical sports intelligence terminology

### 2. Entity Clarity

Every AI-indexed page must make clear:
- What entity is being discussed (player, team, game, market, concept)
- What the current status of that entity is
- When the information was last verified

AI engines resolve entities. Ambiguous pages do not get cited.

### 3. Updated-at Timestamps

Every intelligence page must carry a visible `Last updated: [timestamp]`.
AI engines rank freshness. Undated content is treated as potentially stale.

### 4. Source Transparency

Every claim on an AI-indexable page must either:
- Attribute to a named source with a tier designation
- Or clearly state the source tier and observation type

Unsourced claims are not citeable by AI engines.

### 5. Structured Answer Blocks

Pages intended for AI citation should contain a clean, direct answer block
before supporting context. AI engines extract the first clear, complete answer.

Format:
```
[Direct answer — 1–3 sentences]
[Source attribution]
[Last updated: timestamp]
[Confidence: HIGH / MEDIUM / LOW]
```

### 6. Schema Markup

Where appropriate, use JSON-LD structured data:
- `FAQPage` for methodology and how-it-works pages
- `Article` for blog and intelligence brief pages
- `SportsEvent` for game-specific pages (future)
- `Dataset` for calibration and performance transparency pages

### 7. Non-Hype Language

AI engines de-rank content that matches patterns associated with:
- Gambling advertising ("guaranteed picks", "locks", "free money")
- Fake testimonials
- Unsupported performance claims
- Affiliate spam

Sports OS language must pass these filters by default. The public-copy scanner
and brand voice vocabulary tests already enforce this at the code level.

### 8. Topical Authority Clusters

AI engines reward sites that comprehensively cover a topic, not sites with
scattered single pages. Sports OS should build authority clusters:

**Cluster: Sports Intelligence Methodology**
- How source quality is ranked
- How freshness is handled
- How rumors are separated from facts
- How confidence is calculated
- How model calibration works

**Cluster: Responsible Sports Intelligence**
- What Sports OS will and will not claim
- How performance is tracked
- What happens when a pick is wrong
- The difference between confidence and certainty

**Cluster: Sports Data Transparency**
- Source hierarchy (Tier 1–6)
- Data freshness TTLs
- Evidence Vault architecture (once public)
- Signal Ledger overview (once public)

**Cluster: Fantasy Intelligence**
- How start/sit recommendations are made
- How usage trends are tracked
- How scheme changes affect projections

---

## What to Avoid for GEO

| Pattern | Why it hurts GEO |
|---|---|
| Unsupported win-rate claims | AI engines flag as unverifiable |
| "Lock," "guaranteed," "sure thing" | Gambling language, AI content filters |
| Thin pages with no substance | AI engines ignore them |
| Duplicate or near-duplicate content | Cannibalizes authority |
| Pages with no updated-at timestamp | Treated as potentially stale |
| Hype-heavy headlines | Signals low-trust content to AI engines |
| Content that contradicts itself | AI engines detect contradictions |

---

## GEO Readiness Checklist (per page)

Before any public page is considered GEO-ready, verify:

- [ ] URL is stable and semantically clear
- [ ] Page has a visible `Last updated` timestamp
- [ ] Every claim attributes to a source or source tier
- [ ] Direct answer block appears before supporting context
- [ ] No forbidden language (casino, guaranteed, lock, etc.)
- [ ] JSON-LD structured data added where appropriate
- [ ] Page is part of a topical authority cluster
- [ ] Internal links connect this page to related cluster pages
- [ ] Page passes the public-copy scanner test

---

## Current GEO Status

**Existing**: `/methodology`, `/observatory`, `/responsible-play`, `/blog`,
`/vs/tout-services` are the current GEO-anchoring pages. These should be
prioritized for timestamp addition, structured data, and internal linking
as approved work packages arise.

**Gaps**: No source hierarchy page. No calibration transparency page. No
entity-specific intelligence pages. No glossary. These are all blocked until
the underlying Evidence Vault and Entity Graph components exist.

**Immediate safe action**: Ensure existing GEO-anchor pages have updated-at
timestamps and pass all existing public-copy and brand-safety tests. This
requires no new routes and no schema changes.
