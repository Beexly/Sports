# Sports OS — Content Provenance and Review

**Status**: Doctrine. Binding on all published content.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/media/media-studio-workflow.md` — production workflow
- `docs/audit/prompt-leak-and-sensitive-source-policy.md` — sensitive source rules
- `docs/audit/final-wave-source-risk-register.md` — source risk classification
- `docs/brain/claim-governance.md` — claim rules
- `docs/brain/source-hierarchy.md` — source tier taxonomy

---

## Purpose

Content provenance is the documented chain from a published claim back to
its original source. For a sports intelligence platform, provenance is not
optional — it is the structural foundation of the trust model.

Every piece of content Sports OS publishes must be traceable to its source.
If a claim cannot be traced, it cannot be published.

This document defines:
1. What provenance records must contain
2. How provenance is reviewed before publication
3. What the provenance review process looks like for different content types
4. How to handle content that fails a provenance review

---

## Section 1 — The Provenance Chain

For any published claim, the provenance chain is:

```
Published claim
    ↓
Evidence item in the Evidence Vault
    ↓
Source tier (T1–T6)
    ↓
Source entry in the Source Acquisition Mesh
    ↓
Original primary source (the league feed, licensed API, or credentialed report)
```

A claim is PROVENANCE-VALID only if every link in this chain can be
reconstructed by an operator who did not author the content.

A claim is PROVENANCE-INVALID if:
- There is no Evidence Vault item backing it
- The Evidence Vault item references a Tier 5 or Tier 6 source as the primary backing
- The Evidence Vault item's TTL has expired and was not refreshed before publication
- The source has been classified RED in the Source Risk Register

---

## Section 2 — Content Provenance Record

Every published piece of content must have a provenance record. The record
does not have to be public — it is an internal audit trail.

**Minimum provenance record fields**:

```
Content Provenance Record

Content identifier: [URL or internal ID]
Content type: [pick card | Brain answer | Model Journal | Loss Room | blog | social | video]
Publication date: [ISO date + time]
Platform: [website | Instagram | X | YouTube | newsletter]
Author: [Operator]

Claims made in this content:
  - Claim 1: [the claim text]
    Evidence source: [Evidence Vault item ID or source description]
    Source tier: [T1 | T2 | T3 | T4]
    Evidence freshness at publication: [FRESH | DEGRADED | STALE]
    Claim governance check: [PASSED | FLAGGED — reason]

  - Claim 2: [...]

AI tools used in production:
  - [Claude API for copy drafting — output reviewed by operator before publication]
  - [None]

Rights and attribution:
  - [Licensed stock imagery: source and license reference]
  - [AI-generated imagery: disclosed in content]
  - [Music: CC BY from [artist], attribution in description]

Review log:
  - [Claim governance scanner: PASSED]
  - [Brand safety review: PASSED]
  - [Operator review: APPROVED — [name] — [date]]
  - [Owner review: APPROVED (if required) — [date]]
```

---

## Section 3 — Review Levels by Content Type

Different content types require different review depths:

### Tier 1 Review — Pick Cards and Brain Answers

**Required because**: Highest claim sensitivity. Users may make decisions
based on this content.

**Review steps**:
1. Claim governance scanner — automated
2. Evidence chain completeness check — operator
3. Source freshness validation — automated (TTL check)
4. Paywall gate verification — automated + operator spot check
5. Operator approval — required before pick enters the Signal Ledger
6. Owner approval — required if pick includes win rate performance claim

**Provenance record**: Required. Stored in the Signal Ledger alongside the pick.

---

### Tier 2 Review — Model Journal Entries

**Required because**: Public performance record. Historical accuracy matters.

**Review steps**:
1. Claim governance scanner — automated
2. Win rate claim check (requires ≥30 settled picks, defined window, model version)
3. Voice and tone review — operator
4. Operator approval — required before journal entry is published to the site

**Provenance record**: Required. Model version and calibration data logged.

---

### Tier 3 Review — Loss Room Autopsies

**Required because**: Public accountability content. Accuracy about what was
claimed and what happened matters for the trust model.

**Review steps**:
1. Claim governance scanner — automated
2. CALLED / DID_NOT_HAPPEN cross-reference against original pick evidence chain
3. Operator review for completeness and voice
4. Operator approval before publish

**Provenance record**: Required. Original pick provenance record linked.

---

### Tier 4 Review — Galaxy Almanac Essays

**Required because**: Long-form editorial content that may contain historical
analysis and quantitative claims.

**Review steps**:
1. Claim governance scanner on the full text — automated
2. Data source verification for all quantitative claims
3. Operator editorial review
4. Operator approval

**Provenance record**: Required. Source list documented in the essay or
in an internal record linked to the essay.

---

### Tier 5 Review — Social Media Posts

**Required because**: Widest reach, least permanence. A bad claim spreads fast.

**Review steps**:
1. Claim governance scanner on the post text — automated or operator-run
2. Visual review for brand safety (if image is attached)
3. Operator per-post review and approval

**Provenance record**: Lightweight. Claim type and backing source noted.

---

### Tier 6 Review — Video Content

**Required because**: Richest medium, highest brand exposure, hardest to retract.

**Review steps**:
1. Script claim governance review before recording
2. Visual claim governance review during editing
3. Rights and attribution verification
4. Full operator review of the final cut
5. Owner approval if investor demo, win rate claim, or new content category

**Provenance record**: Full. Video title, description, claims, sources, rights,
and review log documented.

---

## Section 4 — Handling Provenance Failures

If a provenance review identifies a failure at any stage:

### Failure before publication

1. Content does not publish
2. The specific failure is documented (which claim, which chain link failed)
3. The operator either resolves the failure (obtains a valid evidence item) or
   removes the claim from the content
4. Re-review after modification

### Failure discovered after publication

1. Operator removes or corrects the content immediately
2. If a pick claim was affected: the pick is voided in the Signal Ledger
3. Provenance failure is documented in the internal audit trail
4. The content provenance record is updated to reflect the failure and correction
5. Severity assessed: P0 (false win rate claim), P1 (false intelligence claim),
   P2 (attribution error or missing disclosure)

---

## Section 5 — AI Content Provenance

When AI tools assist in content production, the provenance record must document:
- What AI tool was used (Claude API, canvas design skill, etc.)
- What the AI produced (a draft, a design, a summary)
- What the operator changed before publication
- That the AI output was reviewed and is not published as-is without review

**Rule**: "Claude wrote this" is never a sufficient provenance record.
The operator's review and approval — and the underlying evidence chain for any
claims — must be documented regardless of AI involvement.

---

## Forbidden Actions

- Do NOT publish any content without a provenance record
- Do NOT publish any intelligence claim without an evidence chain backing it
- Do NOT publish content whose evidence chain relies on a Tier 5 or Tier 6 source
- Do NOT publish content with an expired evidence TTL
- Do NOT publish AI-generated content without operator review and approval
- Do NOT omit the provenance failure record when correcting published content

---

## Codex Audit Requirements

1. Confirm Signal Ledger stores provenance data alongside every pick
2. Confirm no pick publishes to the site without operator APPROVED event logged
3. Confirm the claim governance scanner is integrated at every content pipeline stage
4. Confirm no Brain answer routes data from Tier 5 sources into a pick evidence chain
5. Confirm Loss Room autopsy records link to the original pick provenance record
6. Report any content pipeline that produces output without a logged provenance record as P1
