# Galaxy AI Policy

**Status:** Internal-only. Documents the boundary between Galaxy's "not AI" public position and Galaxy's actual internal usage of Claude (Anthropic's LLM).

**Why this document exists:** Galaxy's brand position rejects "AI" framing publicly. Galaxy ALSO uses Claude internally for drafting, autopsy synthesis, content support. These two are not contradictory, but the boundary needs explicit documentation so Garrett (and any future hire) doesn't accidentally violate the brand position by surfacing internal AI usage in ways that read as the brand-position rejected.

**Read time:** 5 minutes.

---

## The core distinction

**Public position:** Galaxy publishes a deterministic factor model. The model is not AI. Galaxy's publications are not AI-generated.

**Internal practice:** Garrett uses Claude as a writing assistant, autopsy reasoner, and content drafter. Claude does NOT compute Galaxy's factor model. Claude does NOT make publication decisions. Claude does NOT generate Galaxy's confidence numbers.

The distinction:
- **The model is deterministic.** Hand-built. Factor weights are documented. Not AI.
- **The writing around the model can be Claude-assisted.** Drafting digest text, structuring autopsies, copyediting blog posts. Galaxy reviews and ships.

Galaxy doesn't lie. The "not AI" public position refers to the model — what Galaxy publishes. It does not claim that no AI tool ever touches any Galaxy surface. The distinction is real and defensible.

---

## What Claude does, internally

Acceptable Claude usage at Galaxy:

| Use case | What Claude does | What Galaxy keeps |
|---|---|---|
| Vault digest drafting | Claude drafts first version from Garrett's bullet notes on the week's publication | Garrett rewrites in his voice; final draft is Garrett's |
| Autopsy structure | Claude generates the 5-section template fill-in from factor data | Garrett writes the actual analysis, edits Claude's framing |
| Almanac essay drafts | Claude drafts supporting essays from Garrett's outline | Garrett edits; headline essay is Garrett-written from scratch |
| Customer support response drafts | Claude generates first-pass response to common inquiries | Garrett reviews + sends from his own email |
| Decision-log entry templates | Claude drafts entry structure from decision context | Garrett fills in rationale + signs |
| Press release boilerplate | Claude drafts standard paragraphs | Garrett approves before any external send |
| Internal strategic documents | Claude drafts (this document, planning docs, retrospective templates) | Garrett owns final form |
| Methodology page section drafts | Claude drafts explanatory prose around factor descriptions | Garrett verifies technical accuracy; Garrett owns the factor logic itself |

What Claude does NOT do at Galaxy:

| Use case | Why not |
|---|---|
| Compute confidence numbers | The model is deterministic. Confidence numbers come from the factor model only. |
| Decide which games to publish | Publication decisions are model + Garrett's judgment, not Claude. |
| Decide which games to pass on | Same. |
| Assign autopsy root-cause tags | Tagging is operator judgment, not LLM categorization. |
| Generate confidence number explanations as if Claude reasoned to them | Confidence has structured derivation from factor model. Claude can describe; cannot derive. |
| Write public-facing copy that surfaces "I (Claude)" or first-person LLM language | All public surfaces speak with Galaxy voice, not LLM voice. |
| Make any commercial decision (pricing, partnership terms, refund decisions) | Operator-only. |
| Moderate Discord | Operator-only with Discord's built-in tools. |
| Run customer dev interviews | Operator-only. |
| Respond to press inquiries directly | Operator-only. |

---

## What "not AI" means publicly

When Galaxy says publicly "Galaxy is not AI," "we're not AI, we're math you can read," or "Galaxy publishes a deterministic factor model" — these statements are TRUE about:

- The factor model itself (it is deterministic, hand-built).
- The confidence numbers (they derive from the factor model, not from an LLM).
- The publication decisions (operator + model, not LLM).
- The pass decisions (same).
- The autopsy root-cause logic (operator judgment, not LLM categorization).

These statements are NOT about:
- Whether any LLM ever touches any Galaxy artifact.
- Whether Garrett uses Claude as a writing assistant.
- Whether internal documents are Claude-drafted.

If a journalist or Vault member asks "do you use AI at all internally?" — the honest answer is:

> "I use Claude as a writing assistant. It drafts internal documents, supports autopsy structure, helps with content drafting. The factor model is hand-built and deterministic; that's the 'not AI' that Galaxy's brand position refers to. The writing around the model is Claude-assisted; the model itself is not."

This honest answer is brand-aligned. The dishonest answer ("we don't use AI at all anywhere") would be brand-violating because it would be false.

---

## When AI usage MUST be disclosed

Some uses of Claude at Galaxy require explicit external disclosure:

### 1. Customer-support draft responses

If Galaxy uses Claude to draft a response to a member, then sends it without significant revision: technically OK, but if the member asks "did you write this?" the honest answer is "I drafted it with Claude's help and reviewed it before sending." Don't pretend Garrett hand-wrote every sentence.

### 2. Public-facing AI-disclosed content

If Galaxy ever publishes content that is substantially Claude-drafted and not deeply Garrett-edited (this should be rare), the content should carry a footer note: "This page was drafted with AI assistance and reviewed by Galaxy editorial."

### 3. Almanac supporting essays

If supporting essays in the Almanac are Claude-drafted (which is the default approach per `copy/almanac-production-pack.md`), the Almanac's colophon page should include a note: "Supporting research essays were drafted with AI assistance and edited by Galaxy editorial. The Year-in-Review essay was written by Garrett Baxley."

The Year-in-Review essay must be Garrett-written from scratch. Other Almanac chapters (data sections, autopsies, methodology snapshot, changelog) are derived from the model + operator judgment, not Claude-generated.

### 4. Anything published under Garrett's byline as if hand-written

If a piece is published under "by Garrett Baxley" and is substantially Claude-drafted, the byline is dishonest. Either:
- Garrett rewrites it sufficiently that it becomes Garrett's voice, OR
- The byline is changed to "by Galaxy editorial" with a disclosure note.

Don't ship Claude-drafted content under Garrett's first-person voice without significant Garrett editing.

---

## The drift risk

The biggest brand-safety risk in Galaxy's AI policy is drift over time. Common drift patterns:

### Drift 1: "Claude drafted this; I'll edit later"

A Vault digest is Claude-drafted Tuesday morning. Garrett intends to edit but gets busy. Ships at 80% Claude voice / 20% Garrett edits.

**Counter:** read aloud. If the digest sounds like the same operator who writes the Loss Room, it's edited enough. If it sounds like generic LLM prose, more editing required.

### Drift 2: Using Claude for tasks the policy reserves for operator

Example: Garrett asks Claude to evaluate whether a refund request should be granted. Claude generates a reasoned response. Garrett ships it as the decision.

**Counter:** Claude can DRAFT a response, but the DECISION is Garrett's. The honest framing in support replies is "I evaluated your situation" — which is true if Garrett actually evaluated, false if Claude evaluated.

### Drift 3: Overstating "not AI" position externally

Example: A podcast host asks "so you're completely AI-free?" Garrett says "yes, completely." That answer is dishonest.

**Counter:** the honest answer is "the model is not AI. The writing around it is Claude-assisted. Most sports analytics platforms use both deterministic and AI components; what we publish about the model itself is hand-computed."

### Drift 4: Claude content shipping as Garrett's first-person voice without editing

Example: A Vault Discord post titled "My take on this week's autopsy" is entirely Claude-drafted from a model output. Garrett posts as-is.

**Counter:** any "my take" / "I think" / first-person Discord post or email MUST have Garrett's actual voice. If Claude drafted, Garrett rewrites until it's his voice. The reader assumes "my take" means the person posting actually thought it through.

---

## What the policy is NOT

1. **Not a compliance audit framework.** Galaxy doesn't have a formal AI-disclosure audit cadence. This policy is operator discipline, not external compliance.
2. **Not an anti-Claude position.** Claude is a useful tool. The policy enables responsible use, not prohibition.
3. **Not a public-facing document.** This document is internal. Galaxy's public AI position is in the brand voice canonical + brand-safety checklist.
4. **Not a substitute for the brand voice canonical.** The brand voice rules apply on top of this policy. "AI" is banned vocabulary on public surfaces regardless of internal usage.
5. **Not a policy on user data + AI training.** Galaxy member data is not used to train any AI model. (Galaxy uses Claude's API; member data flows through Anthropic's commercial API, not training data.)

---

## When to consult a lawyer

If Galaxy scales:
- Past 1,000 paid Vault members → lawyer reviews AI policy + disclosures for any regulatory implications (jurisdiction-specific).
- Before any acquisition conversation → AI usage disclosure becomes a due-diligence question; lawyer ensures policy is documented + auditable.
- Before any AI-disclosure-related public statement → lawyer reviews if statement is materially detailed.

Standard one-time lawyer review of this policy: $1,000–2,000 to confirm enforceability + completeness.

---

## Year-end audit

December of each year: Garrett audits this policy against the year's actual usage.

```
Year-end AI policy audit — 2026

1. Did Claude draft any public-facing content this year that I didn't disclose?
   [Yes/no + list specific surfaces]

2. Did Claude make any decision that the policy reserves for operator?
   [Yes/no + decision-log entries if yes]

3. Did I say "not AI" in any external context in a way that misrepresented internal usage?
   [Yes/no + context]

4. Did any drift pattern (Drift 1-4) fire repeatedly?
   [Yes/no + recovery action]

5. What changes to the policy would prevent drift in 2027?
   [Specific edits]
```

Save as `policy-audits/2026-ai-policy.md`. Update this document if year-end audit surfaces structural changes needed.

---

## Cross-references

- Brand voice canonical (where "AI" is banned vocabulary): `galaxy-brand-voice-canonical.md`
- Brand-safety enforcement: `brand-safety-checklist.md`
- Operating values (transparency demonstrated, not claimed): `galaxy-operating-values.md`
- Almanac production (where Claude-drafted essays get disclosed): `copy/almanac-production-pack.md`

---

*Galaxy's "not AI" brand position is defensible only as long as the boundary between AI assistance and AI-decision-making stays clean. This policy is the boundary. Honor it, especially when no one is watching.*
