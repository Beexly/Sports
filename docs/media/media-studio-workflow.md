# Sports OS — Media Studio Workflow

**Status**: Doctrine only. No automated implementation. All outputs require operator review.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/design/media-studio-doctrine.md` — media types and approval gates
- `docs/design/obs-inspired-scene-system.md` — scene production architecture
- `docs/audit/media-automation-risk-policy.md` — automation risk boundaries
- `docs/brain/claim-governance.md` — claim rules applied to all media

---

## Purpose

This document defines the end-to-end workflow by which Galaxy Sports Edge
media content is produced — from the content brief through operator review
to publication.

The Media Studio workflow is distinct from the Stitch Agent workflow
(`docs/design/stitch-agent-workflow.md`): Stitch handles text-based
intelligence content (pick cards, Model Journal, Loss Room autopsies).
The Media Studio workflow handles multimedia output — graphics, GIFs,
video clips, and social cards.

---

## The Seven-Stage Media Production Workflow

### Stage 1 — Brief

**Who initiates**: Operator

**What happens**: The operator defines the content brief:
- Content type: social graphic / GIF / video thumbnail / OG image / investor demo clip
- Target platform: Instagram / X / Newsletter / Website / YouTube / Internal
- Key message: the one thing this piece of media communicates
- Data referenced: which pick, model version, or intelligence output the
  media supports (if any)
- Required elements: brand marks, disclosures, claims

**Gate**: Brief must be documented before any asset creation begins.
Undocumented briefs lead to undocumented assets — a brand safety and
provenance gap.

**Brief format** (minimum):
```
Content type: [social graphic]
Platform: [Instagram 1080×1080]
Key message: [Galaxy Sports Edge intelligence brief for the week of [date]]
Data referenced: [N/A — brand awareness, no pick data]
Disclosures required: [None — no pick data]
Approved template: [weekly-brief-square]
Operator: [name or handle]
```

---

### Stage 2 — Asset Selection

**Who executes**: Operator (with optional AI draft assistance)

**What happens**: Based on the brief, the operator selects or creates the
raw inputs:
- Design template (from approved template library)
- Data payload (from Signal Ledger or Evidence Vault — if data is referenced)
- Typography content (headline, subhead, body copy)
- Brand elements (monogram, wordmark, tagline)

**Claim governance pre-check**: If the asset references any pick, confidence
score, win rate, or intelligence claim — run the claim governance review
NOW, before asset creation begins. Do not create an asset with a claim
that will fail governance review.

**AI draft assistance** (permitted at this stage):
- Claude API can generate headline copy drafts for social graphics
- Claude API can suggest layout descriptions based on the brief
- Claude API output at this stage is a DRAFT — it must be reviewed and
  edited by the operator before being placed in any asset

---

### Stage 3 — Asset Creation

**Who executes**: Operator using approved tools

**Approved tools** (per `docs/design/media-studio-doctrine.md`):
- Figma (design mockups, pick card graphics)
- Canvas design skill (programmatic PNG/SVG from Claude tools)
- Canva via approved connector (social graphics)
- Standard image editors (Affinity Photo, Photoshop) — operator-run

**Required checks during creation**:
- Colors from `DESIGN.md` token set only — no off-brand colors
- Typography from approved font list only
- Required elements present (GSE monogram, freshness disclosure if applicable,
  "entertainment purposes only" if pick data present)
- Forbidden elements absent (lock emoji, sportsbook green, casino imagery)

---

### Stage 4 — Claim Governance Review

**Who executes**: Operator (or Stitch claim governance scanner for text)

**What happens**: Every text element in the asset is reviewed against the
claim governance rules:

| Claim type | Check |
|---|---|
| Pick direction | Source freshness disclosure present? |
| Confidence score | "Not a guarantee" context present? |
| Win rate | ≥30 settled picks? Defined window? Model version? |
| Injury status | Tier 1 or "Unconfirmed" label? |
| Sharp money claim | Tier 1/2 backing present? |
| "Lock" language | BLOCKED — no exceptions |
| "Guaranteed" language | BLOCKED — no exceptions |

**If any check fails**: The asset is modified or the claim is removed.
No asset with a governance failure proceeds to publication.

---

### Stage 5 — Brand Safety Review

**Who executes**: Operator

**What happens**: Visual review of the completed asset:
- [ ] GSE monogram or wordmark present in approved position
- [ ] "Entertainment purposes only" visible on any pick-facing surface
- [ ] No sportsbook green, casino imagery, lock icon, fire emoji, or tout-adjacent visual
- [ ] Colors are from the approved token set
- [ ] Typography is from the approved font list
- [ ] No real-athlete AI-generated images
- [ ] No watermarked or unlicensed stock imagery

**If any check fails**: The asset is revised. No asset with a brand safety
failure proceeds to publication.

---

### Stage 6 — Rights and Attribution Review

**Who executes**: Operator

**What happens**: If the asset contains any of the following, confirm rights:
- Sports team logos → editorial use for commentary confirmed
- Player images → editorial license or operator-taken photograph
- Background music (for video) → license documented
- Stock imagery → license confirmed, source documented
- AI-generated imagery → model's commercial use license confirmed

**Attribution in the asset or accompanying post**:
- If The Odds API data is displayed: "odds data via The Odds API"
- If a licensed stats provider is used: attribution per their license terms
- If AI-generated imagery is used: "AI-generated imagery" disclosure

---

### Stage 7 — Operator Publish Action

**Who executes**: Operator

**What happens**: The operator manually posts the approved asset to the
target platform. No automated posting system is involved.

**Post-publish**:
- Log the asset: content type, platform, date, associated pick/data reference
- Store asset in the appropriate directory (internal record)
- If the asset referenced a pick: link the asset record to the pick in the Signal Ledger

---

## AI Assistance Permitted at Each Stage

| Stage | AI permitted? | What AI may do |
|---|---|---|
| 1. Brief | Yes | Suggest content angles, draft brief structure |
| 2. Asset selection | Yes | Generate headline copy drafts for review |
| 3. Asset creation | Limited | Generate PNG/SVG via Canvas design skill (operator reviews output) |
| 4. Claim governance | Yes | Run claim governance scanner on text content |
| 5. Brand safety | No | Operator visual review only |
| 6. Rights and attribution | No | Operator legal review only |
| 7. Publish | No | Operator posts manually — no AI posting |

---

## Template Library

Current approved templates:
- `social-pick-card-square` (Instagram 1080×1080)
- `social-pick-card-wide` (X / Twitter 1200×630)
- `og-image-standard` (OpenGraph 1200×630, generated by `/api/og`)
- `story-brief` (Instagram Story 1080×1920)
- `galaxy-almanac-thumbnail` (YouTube 1280×720)

**Adding a new template**: Requires operator approval. Document the template
dimensions, required elements, and approved use cases before adding to the library.

---

## Emergency Takedown Protocol

If a published asset is found to contain a claim governance violation or
brand safety failure after publication:

1. Operator manually removes the asset from the platform immediately
2. Document the violation: which asset, which platform, how long it was live
3. Identify how the violation passed the review (which Stage was insufficient)
4. Update the review checklist to prevent recurrence
5. If the asset contained a pick claim that was false: void the associated
   pick in the Signal Ledger and update the performance record

**Severity**: A published asset with a false win rate claim is P1.
A published asset with a governance violation is P2. A published asset
with an incorrect pick settlement is P0.

---

## Forbidden Actions

- Do NOT skip any stage in the seven-stage workflow
- Do NOT post any asset without completing Stage 4 (claim governance review)
- Do NOT use an auto-post tool for any platform
- Do NOT publish an asset with a failed claim governance check
- Do NOT use unlicensed imagery, music, or footage
- Do NOT use AI to post the asset to any platform

---

## Codex Audit Requirements

1. Confirm no automated posting endpoint exists for any platform
2. Confirm the `/api/og` route produces assets compliant with Stage 5 brand
   safety requirements (monogram, carbon bg, correct typography)
3. Confirm no media in `public/` lacks provenance documentation
4. Confirm no auto-publish scheduler is wired to any social platform
