# Sports OS — Local Model Lane

**Status**: Doctrine only. No implementation. Owner decision required before any local model is used.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/brain/source-hierarchy.md` — source tier taxonomy (AI outputs are Tier 6)
- `docs/brain/claim-governance.md` — what Sports OS AI may and may not claim
- `docs/audit/codemod-safety-policy.md` — safety rules for any code changes related to model integration

---

## Purpose

This document defines the doctrine for if and how locally-hosted AI models
(models running on Sports OS infrastructure rather than via external API calls)
could be used in the Sports OS pipeline.

The current system uses the Claude API (Anthropic) for content generation.
This document addresses three questions:

1. What role could a local model legitimately play in Sports OS?
2. What are the risks and constraints that govern any local model use?
3. What would be required before a local model is activated?

This is doctrine only. No local model is currently in use. No implementation
of local model integration should proceed without owner approval and
satisfaction of the gates in Section 5.

---

## Sports OS Fit

The Sports OS intelligence model is built on a separation of concerns:
- **Data and evidence**: sourced from licensed, official, or fair-use-compliant
  external feeds (T1–T4 sources)
- **Scoring and confidence**: computed by the prediction engine using structured
  odds and evidence data
- **Content generation**: performed by AI models operating on already-vetted evidence

Local models are relevant only to the content generation and summarization
layer. They are NOT evidence sources. They are NOT permitted to originate
claims. This is consistent with the platform's treatment of Claude API outputs
as Tier 6 (synthetic/content-only).

A local model would be Tier 6 regardless of its size, architecture, or training.

---

## Section 1 — What a Local Model Can Do

If a local model were activated under the rules of this doctrine, its
permitted use cases would be:

| Use case | Permitted | Constraint |
|---|---|---|
| Summarizing already-vetted Tier 1/T2 evidence into plain language | YES | Must cite the source, not the model |
| Formatting pick card copy from a structured evidence payload | YES | Must run through claim governance scanner |
| Drafting Model Journal narrative from structured ledger data | YES | Operator review required before publish |
| Generating tweet-length summaries of settled picks | YES | Claim governance scanner must pass |
| Classifying incoming evidence items into tier categories | YES | Classification reviewed by operator, not published directly |
| Generating player or team research briefs from licensed data | YES | Clearly labeled as AI-generated summary, not intelligence |
| Answering Brain queries using retrieved evidence | YES | Evidence chain must be T1/T2; Brain answer cites source |

---

## Section 2 — What a Local Model May Not Do

Regardless of the model's capability, a local model is NEVER permitted to:

| Forbidden use | Reason |
|---|---|
| Generate pick recommendations without a structured evidence chain | Violates "no fake data" rule — model memory is not an evidence source |
| Produce confidence scores | Confidence scoring is the prediction engine's job, calibrated against settled results |
| Claim insider information or access to non-public data | A model cannot have Tier 1 knowledge by virtue of its training |
| Generate injury status claims | Injury status requires Tier 1 (official report) or Tier 3 (credentialed reporter) confirmation |
| Auto-publish any content | All model output requires operator review before publication |
| Access external APIs or scrape data during inference | Model inference is a content step, not a data ingestion step |
| Bypass the claim governance scanner | All model output must pass through `lib/compliance-scanner/rules.ts` |
| Store or learn from user data | No local model may persist user data in its weights or context |

---

## Section 3 — Why Local Models Are Relevant (Future Consideration)

The motivation for a local model lane is not current — it is preparatory
thinking for a future where:

1. **API cost scaling**: As Sports OS scales content volume (more picks,
   more Brain queries, more Model Journal entries), Claude API costs scale
   proportionally. A local model running on Sports OS infrastructure could
   reduce marginal cost per content generation event.

2. **Latency requirements**: Certain real-time surfaces (live Signal Ticker
   updates, live Market Gravity context) may require sub-100ms text generation.
   API round-trips add latency. A local model eliminates round-trip latency.

3. **Data sovereignty**: For high-sensitivity evidence chain content, routing
   structured sports data through an external API means the data leaves
   Sports OS infrastructure. A local model keeps sensitive evidence internal.

4. **Offline resilience**: If external API connectivity is degraded, a local
   model could serve as a fallback for non-time-critical content generation
   tasks, keeping the platform partially functional.

These motivations are valid but do not create an implementation imperative.
The current Claude API integration satisfies all platform needs. Local model
consideration is Phase 4+ territory.

---

## Section 4 — Model Selection Criteria

If a local model is ever selected for evaluation, it must meet all of the
following criteria before evaluation begins:

### 4.1 — Licensing

- The model must be released under a license that permits commercial use
- The model license must permit redistribution of derived outputs
- The model must not require revenue sharing or per-inference reporting
- **Examples of acceptable licenses**: Apache 2.0, MIT, CC BY 4.0, Llama
  community license (check current terms)
- **Examples requiring review before use**: Models with use-case restrictions,
  models requiring attribution in outputs, models with revenue thresholds

### 4.2 — Verifiability

- The model must have published architecture documentation
- The model must have a public training data disclosure (or a written
  confirmation that it was not trained on copyrighted sports content in
  a way that creates redistribution liability)
- The model weights must be obtainable from an official source (Hugging Face
  official organization page, model developer's official release)
- Models from unofficial redistribution sites are prohibited — same rule as
  software from warez sites in `docs/audit/piracy-malware-do-not-use-register.md`

### 4.3 — Security

- Model weights must be scanned for embedded malicious payloads before loading
- The inference runtime must run in an isolated environment with no external
  network access during inference
- Model weights must be checksummed and verified against the published hash
  before each deployment
- No model that requires outbound network calls during inference is permitted

### 4.4 — Quality Threshold

- The model must be validated against a Sports OS-specific evaluation set
  before any production use
- The evaluation set must include at minimum:
  - 20 claim governance tests (forbidden language detection)
  - 10 evidence citation tests (correct source attribution)
  - 10 voice and tone tests (brand voice consistency)
- A model that fails more than 5% of claim governance tests may not be used
  for public-facing content generation

---

## Section 5 — Activation Gates

No local model may be used in production Sports OS without satisfying all
of the following gates:

| Gate | Status | What satisfies it |
|---|---|---|
| Owner approval | **REQUIRED** | Explicit written decision from owner |
| License verified | Not started | Legal review of the specific model's license |
| Security scan complete | Not started | Model weights scanned and checksummed |
| Evaluation suite pass | Not started | <5% failure on claim governance eval set |
| Claim governance integration | Not started | Scanner runs on all model outputs |
| Operator review pipeline | Not started | No auto-publish path exists |
| Infrastructure cost model | Not started | GPU/compute cost documented and approved |
| Rollback plan | Not started | Plan to revert to Claude API if local model fails |

All eight gates must be marked complete before activation. Owner approval
is a prerequisite for the other seven — they should not begin without it.

---

## Section 6 — Deployment Architecture (Doctrine Only)

If a local model is ever activated, the correct architecture is:

```
Prediction Engine → Evidence Vault (T1/T2 data)
    ↓
[Structured evidence payload assembled]
    ↓
Local Model Inference (isolated, no network)
    ↓
[Raw model output]
    ↓
Claim Governance Scanner (compliance-scanner/rules.ts)
    ↓
[Flagged draft OR clean draft]
    ↓
Cockpit Queue (operator review)
    ↓
Operator APPROVES / REJECTS / EDITS
    ↓
Publication
```

Key architectural invariants:
- Local model inference must be isolated from external network access
- Evidence payload must be assembled BEFORE model inference, not during
- Claim governance scanner must run AFTER model output, before cockpit queue
- Auto-publish from local model output is never permitted

---

## Section 7 — Relationship to Claude API

The local model lane does not replace the Claude API. It is a parallel
capability that, if activated, handles specific high-volume or low-latency
content generation tasks.

The Claude API remains the primary content generation method and the only
currently approved AI content generation method.

**Decision hierarchy**:
- Use Claude API for all current content generation needs
- Evaluate local model lane only when API costs or latency constraints
  create a documented production problem
- Never activate a local model to replace a Claude API capability that
  is working correctly

---

## Source Evidence and R&D Rationale

The local model lane doctrine was created because:
1. Multiple R&D Batch reference projects used local models without safety
   constraints — in several cases, local models were used to generate pick
   recommendations directly from their training weights, bypassing evidence
   chain requirements entirely
2. The Sports OS doctrine of "AI outputs are Tier 6" must apply equally to
   local models and external API models — there is no architecture exception
   for size or hosting location
3. The cost-scaling and latency-reduction motivations are legitimate long-term
   considerations that deserve a documented evaluation framework rather than
   an ad hoc decision under production pressure

The doctrine establishes the framework now so that when local model evaluation
becomes relevant, the safety guardrails are already in place.

---

## Forbidden Actions

- Do NOT integrate any local model without owner approval
- Do NOT use a local model to generate pick recommendations without a
  structured evidence chain
- Do NOT use a local model to produce confidence scores
- Do NOT allow local model outputs to bypass the claim governance scanner
- Do NOT allow local model outputs to auto-publish without operator review
- Do NOT load model weights from unofficial redistribution sources
- Do NOT allow local model inference runtime to make outbound network calls
- Do NOT use a model that fails more than 5% of claim governance eval tests

---

## Approval Gates

| Action | Who approves |
|---|---|
| Initiating local model evaluation | Owner |
| Selecting a specific model for evaluation | Operator (after owner approves evaluation) |
| Activating a local model in production | Owner (requires all 8 activation gates) |
| Adding a new permitted use case | Operator (document in this file) |
| Adding a new forbidden use case | Operator (document in this file) |

---

## Validation Expectations

- No local model inference endpoint exists in `apps/web/` or `workers/`
- No model weights are present in the repository
- No direct pick generation from model memory exists anywhere in the codebase
- All AI content generation routes through Claude API or (if activated)
  a local model that has satisfied all 8 activation gates

---

## Codex Audit Requirements

1. Confirm no local model inference endpoint exists in `apps/web/app/api/`
2. Confirm no model weight files (`.bin`, `.safetensors`, `.gguf`, `.onnx`)
   exist in the repository or any mounted volume referenced in `docker-compose.yml`
3. Confirm all AI content generation uses `ANTHROPIC_API_KEY` and the
   Claude API exclusively
4. Confirm no route generates pick recommendations from AI model outputs
   without a structured evidence payload input
5. Report any local model integration code as a P1 violation requiring
   owner approval before proceeding
