# Sports OS — OBS-Inspired Scene System

**Status**: Doctrine only. No implementation. Architecture reference for future Media Studio build.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/design/media-studio-doctrine.md` — media output rules and approval gates
- `docs/design/stitch-agent-workflow.md` — content assembly workflow
- `docs/brain/claim-governance.md` — what may be claimed in media output
- `docs/audit/media-automation-risk-policy.md` — automation boundaries

---

## Purpose

OBS Studio (Open Broadcaster Software) provides a mature model for composing
visual output from multiple sources: a "scene" is a named arrangement of
"sources" (video captures, images, text overlays, browser windows), and the
operator switches between scenes via a scene list. Sources within a scene have
individual visibility toggles, position, size, and filters applied.

This document translates the OBS scene/source/filter/transition architecture
into a doctrine for Sports OS's future Media Studio — the system by which
the operator produces product demos, intelligence briefs, and social clips.

This is reference architecture only. No OBS integration, streaming API,
or automated media production pipeline should be implemented without
owner approval.

---

## Sports OS Translation

| OBS concept | Sports OS equivalent | Purpose |
|---|---|---|
| Scene | Intelligence Brief Layout | Named arrangement of data panels for a recording session |
| Source | Data Panel / Live Feed | Individual data surface (picks table, odds ticker, evidence chain) |
| Filter | Claim Governance Layer | Runs on every text source before it appears in media |
| Transition | Scene Switch | Animated transition between intelligence brief sections |
| Preview / Program | Draft / Published | Draft = operator review; Published = finalized media |
| Recording | Media Output | Saved intelligence brief clip |
| Scene Collection | Brief Template Library | Saved arrangement templates for recurring brief types |

---

## Scene Types

The following named scenes are the canonical production surfaces for
Sports OS media output:

### Scene 1 — Daily Intelligence Brief

**Purpose**: Daily operator-produced summary of active picks and market context  
**Sources**:
- Pick card panel (top 3 active picks, tier-gated)
- Market gravity meter (live odds context from The Odds API)
- Source freshness indicator (last data refresh timestamp)
- Galaxy Sports Edge logo / monogram overlay (lower right)
- "Entertainment purposes only" disclosure (lower left, always visible)

**Forbidden elements in this scene**:
- Any pick marked WITHHELD or UNRESOLVED in the Signal Ledger
- Confidence scores presented without "not a guarantee" context
- Any Tier 5 (community) signal as a displayed data point
- Win rate claims unless ≥30 settled picks in the defined window are available

### Scene 2 — Pick Provenance Walkthrough

**Purpose**: Screen-recording demonstrating how a single pick's evidence chain
is constructed (for methodology transparency)  
**Sources**:
- Evidence Drawer (cockpit view — INTERNAL, not for public distribution)
- Source tier badge overlay (showing T1/T2 status of each evidence item)
- Narration track (operator voice or approved text-to-speech)
- Disclaimer overlay: "This is a methodology demonstration. Not a recommendation."

**Important**: The cockpit evidence drawer contains internal source data. Any
recording of the evidence drawer for public distribution must blur or redact:
- Source API keys or authentication identifiers
- Internal source reliability scores
- Any user account data visible in the cockpit

### Scene 3 — Market Gravity Explainer

**Purpose**: Visual explanation of what line movement means and how Sports OS
uses it (educational content for public trust layer)  
**Sources**:
- Line movement chart (historical odds from The Odds API, attributed)
- Narrated explanation overlay
- Brand monogram

**Claim rule**: Market gravity explainers may describe what line movement is
and how it is used as context. They may NOT claim that line movement alone
constitutes a "sharp money" signal. See `docs/brain/claim-governance.md`.

### Scene 4 — Galaxy Studio Social Clip

**Purpose**: Short-form social media clip (30–90 seconds) for distribution  
**Sources**:
- Pick card graphic (static export from Stitch, operator-approved)
- Ambient motion background (design token colors only — no casino imagery)
- Text overlay: pick direction + sport + "For entertainment only"
- Galaxy Sports Edge branding

**Constraint**: Social clips may not auto-upload. Each clip must be individually
reviewed and posted by the operator.

### Scene 5 — Investor Demo

**Purpose**: Platform capability demonstration for investor or partner audiences  
**Sources**:
- Intelligence graph visualization (entity relationships, evidence tier flow)
- Cockpit walkthrough (blurred/redacted where internal data appears)
- Feature highlight panels
- Galaxy Sports Edge brand elements

**Constraint**: Investor demos must not present pick performance data without
satisfying the win rate claim rules (≥30 settled picks, defined model version,
defined window). No fabricated performance statistics.

---

## Source Rules

Every source displayed in a Sports OS media scene must satisfy:

1. **Data provenance**: The data displayed must come from a T1/T2/T3 source
   in the Source Acquisition Mesh. No T5 or T6 data may appear in media output.

2. **Freshness disclosure**: Any live or near-live data displayed (odds, injury
   status, pick status) must show a timestamp confirming when it was last updated.

3. **Claim governance scan**: Text sources must pass the claim governance scanner
   before appearing in the scene. Static text overlays must be reviewed by the
   operator for forbidden vocabulary before recording begins.

4. **Attribution**: Licensed data (The Odds API) must be attributed in the
   scene metadata and visible in any published clip that uses that data.

---

## Filter Architecture

Analogous to OBS filters that process a source's visual output, Sports OS
applies three logical filters to every media source:

| Filter | What it does | Hard requirement |
|---|---|---|
| Claim governance filter | Checks text for forbidden language before display | Yes — cannot be disabled |
| Brand safety filter | Checks visuals for forbidden design elements (casino green, lock emoji) | Yes — cannot be disabled |
| Freshness filter | Checks data timestamps; flags stale data | Yes — stale data must be labeled or removed |

---

## Transition Rules

Scene transitions (moving from one intelligence brief section to another)
must follow these rules:

- Duration: 300–600ms (matches design motion standard from `DESIGN.md`)
- Style: Fade or horizontal slide — no flashy wipe or spin transitions
- Forbidden: Any transition that could be misread as a pick result celebration
- Forbidden: Any transition that uses a winning sound effect or celebratory visual

---

## Approval Gates

| Action | Who approves |
|---|---|
| New scene type | Operator |
| Cockpit footage in a public clip | Owner (case-by-case) |
| Any scene with win rate performance claims | Owner |
| Publishing a clip to any external platform | Operator (per clip, per platform) |
| Adding an external data source as a scene source | Owner + source risk review |

---

## Forbidden Actions

- Do NOT integrate OBS API, streaming SDK, or any capture library into the app
- Do NOT implement auto-recording or auto-upload of any media
- Do NOT display Tier 5 (community) data in any scene
- Do NOT display performance statistics without satisfying claim governance rules
- Do NOT use copyrighted sports footage or broadcast clips in any scene
- Do NOT show cockpit data with unredacted internal source identifiers
- Do NOT display casino imagery, sportsbook logos, or betting slip graphics
- Do NOT fake a win rate counter, animated confidence score, or pick outcome

---

## Validation Expectations

- No auto-recording or auto-upload endpoint exists in `apps/web/` or `workers/`
- All media output is reviewed by the operator before any external distribution
- Claim governance scanner tests pass against all known-bad vocabulary
- Brand safety tests pass confirming no casino/sportsbook imagery in public assets

---

## Codex Audit Requirements

1. Confirm no OBS SDK, capture library, or streaming API dependency exists
2. Confirm no auto-upload endpoint exists in any API route
3. Confirm no media output bypasses the claim governance scanner
4. Report any auto-record or auto-stream endpoint as a P0 violation
