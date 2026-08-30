# Sports OS — Claim Governance

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §4.10 · Component 12
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

Claim Governance defines the process by which any factual or analytical
claim transitions from internal intelligence to a public-facing statement.

Every public claim on any Sports OS surface must be traceable to evidence.
No claim may be published without a declared source tier. No accuracy or
win-rate statistic may be published without meeting the minimum sample
threshold.

Claim Governance is the gate between the internal intelligence pipeline
and the public product.

---

## What Is a Public Claim?

A public claim is any statement on a Sports OS public surface that asserts
a fact, prediction, analysis, or performance statistic. This includes:

- Pick rationale ("this line is mispriced because of X")
- Confidence scores and their basis
- Injury status ("this player is expected to play")
- Model performance statistics ("our picks have returned X%")
- Source quality statements ("based on official team reports")
- Any assertion that a user could act on

Anything a user might read and use to make a decision is a public claim
and must meet this governance standard.

---

## Claim Approval Workflow

```
Step 1: Evidence linking
  Every claim must be linked to one or more EvidenceVault items.
  A claim with no evidence link is rejected at this step.
  Required: evidenceIds[] — at least one item with sourceTier ≤ 3

Step 2: Source tier check
  The minimum source tier required depends on claim type (see table below).
  If the available evidence does not meet the required tier,
  the claim is either:
    (a) Downgraded with a caveat, or
    (b) Withheld until higher-tier evidence is available

Step 3: Contradiction check
  The claim is checked against known contradicting evidence.
  If contradictionStatus is CONFLICTED on any linked evidence item,
  the claim is held for human review.

Step 4: Freshness check
  The linked evidence must not be stale (per source tier TTLs).
  Stale evidence triggers a re-fetch request or a claim hold.

Step 5: Language check
  The claim text must pass:
    - public-copy scanner (no casino / gambling / certainty language)
    - brand-voice vocabulary test (no forbidden phrases)
    - no-fake-percentages test (no unsupported win-rate stats)
    - trust-claims test (all stated claims traceable to evidence)

Step 6: Human review (required for certain claim types)
  Some claim types require operator review before publication.
  See required-review table below.

Step 7: Publish or withhold
  If all steps pass: publish with source attribution and timestamp.
  If any step fails: withhold and log the failure reason.
```

---

## Minimum Source Tier Requirements by Claim Type

| Claim type | Minimum tier | Human review required |
|---|---|---|
| Player injury status (official designation) | Tier 1 | No |
| Player injury status (expected return) | Tier 1 or corroborated Tier 3 | Yes |
| Lineup / depth chart position | Tier 1 | No |
| Odds / line context | Tier 2 (licensed API) | No |
| Line movement description | Tier 2 | No |
| Sharp money assertion | Tier 1 or Tier 2 specific source | Yes — always |
| Usage trend | Tier 2 | No |
| Scheme change impact | Tier 1–3 with corroboration | Yes |
| Rumor / unverified chatter | Not permitted on public surface | N/A — withheld |
| Model performance stat | Signal Ledger (30+ settled picks) | Yes |
| Win-rate claim | Signal Ledger (30+ settled picks, per model version) | Yes — always |
| Confidence score | Internal model (Tier 6) with Tier 1–4 evidence base | No (but display requires evidence) |

---

## Win-Rate and Performance Claim Rules

This rule is non-negotiable:

**No win-rate, accuracy, or ROI statistic may appear on any public surface
until the Signal Ledger records at least 30 settled picks for the model
version being cited.**

This applies to:
- Homepage or marketing copy ("our picks win X% of the time")
- Subscription pricing page ("Pro picks perform at X%")
- Any blog post, social post, or press release
- Any dashboard showing a performance metric to users

Before 30 settled picks per model version:
- Performance statistics must not be shown
- The product may state: "Calibration data accumulates as picks settle"
- No estimate or projection of expected win rate is permitted

After 30 settled picks per model version:
- Stats must be pulled directly from Signal Ledger
- Confidence intervals must be shown for small samples (30–100 picks)
- Model version must be cited alongside the statistic
- Stats must be updated on every settlement

---

## Prohibited Claims (Never Publish)

| Prohibited claim | Reason |
|---|---|
| "Guaranteed pick" | No pick is guaranteed |
| "Sure thing" / "lock" | Certainty language — forbidden |
| "Sharp money is on X" without Tier 1–2 source | Unverifiable inference |
| "Our system wins X% of the time" before 30 settled picks | Fabricated stat |
| "Risk-free" | Misleading |
| "We have insider information" | False and legally dangerous |
| "X player is definitely playing" | Only Tier 1 official designations permitted |
| "This bet is a free win" | Casino / gambling language |
| Any claim using Tier-5-only evidence as its basis | Evidence standard not met |

---

## Claim Retraction Protocol

If a published claim is found to be incorrect or unsupported after publication:

1. The claim is immediately retracted (removed from public surface)
2. A `public_claim_retracted` event is written to the Signal Ledger
3. The reason for retraction is logged
4. If the claim was used as pick rationale, the pick is reviewed
5. Users who acted on the pick receive a settlement note in the cockpit

Retraction is always better than leaving a false claim published.

---

## Claim Governance and the Public Trust Layer

Claim Governance is the operational backbone of Component 12
(Public Trust / Methodology). The public-facing methodology pages
(`/methodology`, future `/intelligence/how-it-works`) describe this
process in plain language.

The existence of a functioning Claim Governance workflow is a prerequisite
for:
- Expanding the public methodology pages
- Launching the Ask the Brain public beta
- Publishing any model calibration transparency data
- Any B2B API exposure

---

## Implementation Prerequisites

Before Claim Governance can be fully implemented:

1. Evidence Vault must be operational (claims link to EvidenceItems)
2. Signal Ledger must be operational (claim events recorded)
3. Public-copy scanner, brand-voice vocabulary, no-fake-percentages,
   and trust-claims tests must all be passing
4. A `PublicClaim` schema must be approved and implemented
5. Human review queue must be operational in the cockpit

---

## Cross-Reference

- Evidence Vault: `docs/brain/evidence-vault.md` — evidence linked to every claim
- Signal Ledger: `docs/brain/signal-ledger.md` — claim lifecycle events
- Ask the Brain: `docs/brain/ask-the-brain.md` — claim gate for Brain answers
- Operator Cockpit: `docs/brain/operator-cockpit-governance.md` — human review workflow
- ADR Source Freshness: `docs/adr/source-freshness-and-deploy-readiness-guide.md`
- ADR Promotion Checklist: `docs/adr/promotion-publication-checklist.md`
- Responsible Intelligence: `docs/intelligence/developer-innovation-layer.md`
