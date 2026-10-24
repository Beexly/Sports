# Sports OS — Public Trust Layer

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3 · Component 12 (user-facing doctrine)
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/brain/claim-governance.md` — internal governance rules (the other half of Component 12)
- `docs/brain/source-hierarchy.md` — tier taxonomy disclosed on /methodology
- `docs/brain/calibration-feedback-loop.md` — calibration transparency disclosed publicly
- `docs/brain/picks-intelligence.md` — public performance tracking rules
- `docs/intelligence/ai-search-geo-strategy.md` — GEO/AI-search visibility layer

---

## Purpose

The Public Trust Layer is how Sports OS earns and maintains credibility with
users, search engines, AI citation systems, journalists, regulators, and
potential partners.

It is Component 12 of the ecosystem — the user-facing half. The other half,
Claim Governance, governs what the system is allowed to say. The Public Trust
Layer governs what the platform publicly commits to, how it discloses its methods,
and what language it uses when talking about itself.

Trust is not marketing. Trust is the honest, clear, consistent explanation
of how the system works — including what it does not know, what it will not claim,
and how it has performed.

A platform that buries its methodology, overstates its accuracy, or refuses
to disclose how it makes picks is indistinguishable from a tout service.
Sports OS is not a tout service. This layer makes that distinction legible.

---

## The Five Public Commitments

Sports OS makes five commitments to users on all public surfaces. These
commitments are the foundation of the trust layer. They are not marketing
slogans — they are operational rules that the system must actually uphold.

### Commitment 1: Every Pick Has a Source

Every pick displayed to a user — free or premium — is backed by real data.
No pick is fabricated. No pick is invented for content purposes.
Every pick can be traced to a Tier 1 or Tier 2 source.

**What this means in practice**:
- The evidence chain exists before the pick is published
- The pick is withheld if it has no qualifying evidence
- The user can see (at PRO/ELITE tier) which evidence chain backed the pick

**What this does NOT mean**:
- The pick is correct
- The pick will win
- The pick is better than what the user could research themselves

### Commitment 2: Confidence Is Earned, Not Assigned

Confidence scores reflect calibrated model history, not invented certainty.
A confidence score of 72 means the model has a historical record consistent
with 72 — it does not mean the pick will win 72% of the time.

**What this means in practice**:
- Confidence scores are not published until 30 picks are settled
- Confidence scores are recalibrated against settlement outcomes
- New model versions start with capped confidence until they have a record

**What this does NOT mean**:
- Past calibration predicts future performance
- A high confidence score is a safe bet

### Commitment 3: Rumors Are Labeled as Rumors

Community chatter, unverified social media posts, and forum speculation are
never presented as confirmed fact. Every piece of intelligence is labeled with
its source tier. A Tier 5 signal is clearly marked as unverified.

**What this means in practice**:
- Tier 5 content appears in the cockpit only — it never reaches public surfaces
  as a stated fact or pick rationale
- When a rumor is publicly relevant, it is disclosed with explicit uncertainty
  language: "Unverified reports suggest X — no Tier 1 confirmation as of [time]"
- Market movement is presented as a market signal, not as evidence of fact

**What this does NOT mean**:
- Sports OS claims it has no access to community information
- Sports OS ignores community chatter — it monitors it for early signals,
  but it does not present it as intelligence until verified

### Commitment 4: Losses Are Counted

Sports OS tracks wins and losses. Losses are not hidden. When the system is
wrong, that outcome is on the public record.

**What this means in practice**:
- Settlement records are public and immutable
- Win-loss records are published per model version after 30 picks
- PUSH and VOID picks are disclosed separately — not counted as wins

**What this does NOT mean**:
- Past performance predicts future results (this is explicitly NOT claimed)
- Sports OS has special predictive capability

### Commitment 5: The System States What It Does Not Know

Every pick includes stated weaknesses — what evidence is missing, what would
change the call. Every Brain answer includes gaps — questions the system cannot
answer from available evidence.

Not knowing is not a failure. Pretending to know when you do not is a failure.

**What this means in practice**:
- The `weaknesses` field of every pick is required and never empty
- Brain answers include a "What is not known" section
- Stale evidence is disclosed, not hidden: "Based on data from [timestamp]"

---

## The /methodology Surface

The `/methodology` route is the primary public expression of the Trust Layer.
It currently exists. Its doctrine-level content is defined here.

### Required sections on /methodology:

**1. How We Source Data**
- Description of the six-tier taxonomy (high level, not the full rubric)
- Statement that Tier 1 and Tier 2 are the pick evidence standard
- Statement that raw data is not republished without license
- Statement that AI model outputs are never treated as evidence

**2. How Confidence Works**
- Explanation that confidence is 0–100, calibrated against outcomes
- Explanation that confidence scores are not published for new model versions
  until 30 picks settle
- Explicit statement: "Confidence is not a win probability"
- Statement that confidence scores are recalibrated continuously

**3. How We Handle Rumors**
- Statement that community and social media content is monitored
- Statement that it is never presented as confirmed fact
- Statement that rumors require Tier 1 verification before any pick action
- Explanation of what "Tier 5 — Watchlist only" means in plain language

**4. How We Track Performance**
- Statement that win-loss records are tracked per model version
- Statement that records are only shown after 30 settled picks
- Display of current model version record (when threshold met)
- Statement that past performance does not predict future results

**5. What We Will Not Claim**
- Explicit list of forbidden language types (see Claim Governance)
- Statement that "locks," "guarantees," and "sure things" are not terms
  Sports OS uses — ever
- Statement that sharp money claims require specific Tier 1/2 evidence,
  not line movement inference

**6. How to Read a Pick**
- Plain-language guide to the pick card: what confidence means,
  what evidence chain means, what weaknesses mean, what risk means
- Guide to the difference between FREE, PRO, and ELITE tiers
- Statement that picks are decision support tools, not financial advice

---

## Public Language Standards

These standards apply to all public surfaces: marketing pages, pick cards,
Brain answers, social media, press, and any content under the Sports OS brand.

### Required framing language for picks on public surfaces

**Approved**:
- "The evidence points toward [side]"
- "Based on current Tier 1 and Tier 2 data, …"
- "Market movement and source context suggest …"
- "Confidence: [N]/100 — see evidence details for the full picture"
- "What would change this: [list of weaknesses]"
- "As of [timestamp] — check for updates before game time"

**Forbidden**:
- "Lock" — implies certainty that does not exist
- "Guaranteed" — implies certainty
- "Risk-free" — implies no downside
- "Sure thing" — implies certainty
- "Free money" / "easy money" — implies no risk
- "Cannot lose" — implies certainty
- "Sharp money is on [side]" — unless backed by specific Tier 1/2 data
- "Our model knows something the market doesn't" — implies privileged access
- "Verified inside information" — ever
- "We go X% on [pick type]" — without 30+ settled picks and a defined window
- Any implied win rate without a defined model version, time window, and source

### Required framing language for Brain answers on public surfaces

**Approved**:
- "Based on [N] sources reviewed as of [timestamp]"
- "Confidence: LOW / MEDIUM / HIGH — see source breakdown"
- "This answer may be incomplete — [state what is not known]"
- "No Tier 1 confirmation of this claim as of [timestamp]"
- "Market context: [statement] — market movement is not evidence of fact"

**Forbidden**:
- "Confirmed" — unless a Tier 1 source has explicitly confirmed it
- "Our sources indicate" — without naming the source tier
- "The market knows" — implies certainty from market signals
- Any statement of injury status without a Tier 1 source and timestamp

---

## Trust Signals on Pick Cards

Every pick card on a public surface must carry the following trust signals:

| Signal | Location on card | Content |
|---|---|---|
| Freshness timestamp | Always visible | "Data as of [timestamp]" |
| Model version | Always visible | "Model [version]" |
| Tier label | Always visible | "FREE" / "PRO" / "ELITE" |
| Weaknesses (PRO+) | PRO and ELITE tiers | At least one stated weakness |
| Evidence tier (PRO+) | PRO and ELITE tiers | "Backed by Tier 1 and Tier 2 sources" |
| Settlement record | Footer | "[W]W–[L]L — model [version] — last updated [date]" |

A pick card that omits the freshness timestamp or model version is non-compliant
with trust layer doctrine.

---

## What NOT to Disclose Publicly

The trust layer discloses methods, not implementation details.

**Do NOT publicly disclose**:
- The complete list of registered sources in the Source Acquisition Mesh
- Internal source reliability scores
- The specific algorithm used for confidence scoring
- Internal calibration thresholds or alert conditions
- Withheld pick reasons
- Cockpit-only intelligence (Tier 5 signals, contradiction flags)

**Why**: Publishing source lists creates gaming risk — bad actors can target
specific sources to manipulate signals. Publishing calibration internals
creates manipulation risk. Publishing withheld reasons creates information
asymmetry that can be gamed.

The methodology discloses the system's principles. It does not disclose
the system's internal state.

---

## Trust Layer and AI-Search / GEO Visibility

The Public Trust Layer is a direct input to the AI-Search / GEO Visibility
strategy (`docs/intelligence/ai-search-geo-strategy.md`).

AI citation systems (ChatGPT, Perplexity, Google AI Overviews, Gemini) cite
sources that are:
- Clearly authored with named methodology
- Transparent about uncertainty
- Consistent in language and claims
- Regularly updated with fresh timestamps
- Not making claims that contradict their stated methods

The /methodology page, the trust signals on pick cards, the settlement records,
and the stated weaknesses on answers all serve the trust layer AND the GEO
visibility layer simultaneously.

A platform that earns trust from users earns citations from AI systems.
They are the same standard.

---

## Trust Layer Maintenance

The Public Trust Layer is not a one-time publication. It requires ongoing
maintenance:

| Trigger | Required action |
|---|---|
| Model version increment | Update version label on methodology page |
| 30th pick settled | Publish win-loss record for the version |
| Methodology section becomes outdated | Update within 48 hours of change |
| Claim governance rules change | Reflect in forbidden/approved language section |
| New pick type added | Add to "How to Read a Pick" guide |
| Source tier taxonomy changes | Update tier description on methodology page |

An outdated methodology page is a trust violation. If the page says the system
does X and the system has changed to do Y, the page must be updated.

**Maintenance responsibility**: The operator is responsible for keeping the
methodology page current. Codex and Claude may propose content updates —
the operator approves and publishes them.
