# Sports OS — Fine-Tuning Governance

**Status**: Doctrine only. No fine-tuning until all prerequisites are satisfied.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/models/local-model-lane.md` — local model requirements
- `docs/models/answer-eval-benchmark-lab.md` — evaluation standards
- `docs/brain/source-hierarchy.md` — training data must be T1/T2
- `docs/audit/final-wave-source-risk-register.md` — data source classification

---

## Purpose

Fine-tuning is the process of training a pre-trained language model on
domain-specific data to improve its performance on a specific task.

For Sports OS, fine-tuning is a future consideration — potentially relevant
when:
- The prediction engine's content generation at scale requires consistent
  voice and claim governance adherence
- The Brain answer system needs to be calibrated on sports intelligence
  reasoning patterns
- A local model is deployed and needs to be specialized for the platform's
  content patterns

This document establishes the governance framework that must be satisfied
before any fine-tuning experiment is run. None of these prerequisites have
been satisfied. Fine-tuning is not currently planned.

---

## Section 1 — Fine-Tuning Prerequisites

Fine-tuning may NOT begin until ALL of the following are true:

### Prerequisite 1 — Evidence Vault Exists and Is Populated

Fine-tuning on sports intelligence data requires a curated dataset of
high-quality sports intelligence inputs and outputs. This dataset must
come from the Evidence Vault — real T1/T2 evidence items used in real picks.

**Status**: Evidence Vault exists as a schema proposal. Requires implementation
and population before fine-tuning dataset construction begins.

**Why**: Training on fabricated or low-tier data would encode Tier 5/6
reasoning patterns into the model, defeating the purpose of the intelligence
pipeline.

---

### Prerequisite 2 — Evaluation Datasets Exist

Before fine-tuning, you must know what "better" means — and that requires
a benchmark evaluation set that can measure improvement.

**Required evaluation sets** (see `docs/models/answer-eval-benchmark-lab.md`):
- Claim governance compliance set (does the model avoid forbidden language?)
- Evidence citation accuracy set (does the model correctly attribute claims?)
- Voice and tone consistency set (does the model match brand voice?)
- Hallucination resistance set (does the model avoid fabricating sports facts?)

**Status**: Evaluation set specification exists in the benchmark lab doc.
Individual test cases require population.

---

### Prerequisite 3 — Hallucination Tests Exist and Pass for the Base Model

Before fine-tuning, establish a baseline: how often does the base model
hallucinate sports facts? Post-fine-tuning, this rate must be equal or lower.

**Rule**: If fine-tuning increases hallucination rate by any measurable amount,
the fine-tune is REJECTED. A model that confidently produces false sports
facts is more dangerous than a model that says "I don't know."

---

### Prerequisite 4 — Public Claim Gates Are Implemented

Every output of a fine-tuned model must pass through the claim governance
scanner. If the claim governance scanner is not implemented and active when
fine-tuning begins, the fine-tuned model's outputs have no safety layer.

**Status**: Compliance scanner exists (`apps/web/lib/compliance-scanner/rules.ts`).
Must be verified as active on all content generation paths before fine-tuning begins.

---

### Prerequisite 5 — Model Output Can Be Traced

Fine-tuned model outputs must be logged with:
- Model version identifier
- Input prompt (or hash, for privacy)
- Output (before and after claim governance scan)
- Which evaluation set scores apply

Without traceability, a fine-tuning regression cannot be diagnosed.

---

### Prerequisite 6 — Training Data Licensing Is Cleared

Every item in the fine-tuning dataset must have a confirmed license for
use in AI training. This is not the same as a license for display.

**License requirements for training data**:
- T1 official league data: Check the specific data program's terms for
  ML training use. Some official data programs prohibit ML training use.
- T2 licensed data (The Odds API, Sportradar): Check each provider's license
  for ML training use specifically. This is often a separate commercial term.
- Operator-authored content (Model Journal, Galaxy Almanac): Sports OS owns
  this content and may use it for training.
- User-facing Brain queries (input text): NEVER used for training without
  explicit user consent and a documented privacy policy.

**Status**: No licensing review for ML training has been completed. This
is a prerequisite that requires owner + legal review.

---

### Prerequisite 7 — Owner Approval for Fine-Tuning Experiment

Fine-tuning is a significant platform decision. It requires explicit owner
approval before any compute resources are allocated or any data is processed
for training.

---

## Section 2 — Training Data Rules

If all prerequisites are satisfied and fine-tuning is approved:

| Data type | Permitted for training | Condition |
|---|---|---|
| T1 official evidence items | Conditional | Check specific data program's ML training terms |
| T2 licensed evidence items | Conditional | Check each provider's license for training use |
| Model Journal entries (operator-authored) | YES | Sports OS-owned content |
| Galaxy Almanac essays (operator-authored) | YES | Sports OS-owned content |
| Settled pick records | YES | Internal platform data |
| User Brain query inputs | NO | User data — requires consent + privacy policy |
| User Brain query responses | NO | User data — requires consent + privacy policy |
| Tier 5 community data | NO | Source quality too low; would corrupt model |
| Tier 6 AI-generated content | NO | Never train on AI-generated content |
| Scraped content from unlicensed sources | NO | License violation |
| Leaked competitor prompts or data | NO | Sensitive source — permanently forbidden |

---

## Section 3 — Model Versioning for Fine-Tuned Models

A fine-tuned model is a separate model version from the base model. All picks,
Brain answers, and content generated by a fine-tuned model must be tagged
with the fine-tune model version identifier.

**Version format**: `base-model-name/ft-v[major].[minor]-[date]`  
**Example**: `claude-3-haiku/ft-v1.0-2026-06`

All rules from the model versioning policy
(`docs/brain/calibration-feedback-loop.md`) apply to fine-tuned models.

---

## Section 4 — Fine-Tuning Red Lines

The following are permanently forbidden regardless of business motivation:

| Forbidden fine-tune goal | Why |
|---|---|
| Training a model to express higher confidence than evidence supports | Directly undermines calibration integrity |
| Training a model to use certainty language ("guaranteed", "lock") | Core claim governance violation |
| Training a model to recommend betting amounts | Gambling advice prohibition |
| Training on leaked competitor data or prompts | Sensitive source — permanently forbidden |
| Training on user data without consent | Privacy violation |
| Fine-tuning to impersonate a specific sports personality | Identity and legal risk |
| Training to suppress or minimize losses in performance disclosure | Brand trust violation |

---

## Section 5 — Evaluation Before Deployment

A fine-tuned model may not be deployed to any production content generation
path until:

1. All evaluation benchmarks are run on the fine-tuned model
2. The fine-tuned model scores ≥ the base model on claim governance compliance
3. The fine-tuned model scores ≥ the base model on hallucination resistance
4. The fine-tuned model scores ≥ the base model on voice and tone consistency
5. Operator has reviewed a sample of fine-tuned model outputs
6. Owner has approved deployment

If the fine-tuned model fails any of conditions 1–4, it is REJECTED and
may not be deployed. A failed fine-tune is not a reason to lower the benchmark.

---

## Approval Gates

| Action | Who approves |
|---|---|
| Beginning prerequisites assessment | Operator |
| Allocating compute for a fine-tuning experiment | Owner |
| Using any external data provider's data for training | Owner + legal review |
| Deploying a fine-tuned model to production | Owner (after benchmark pass) |
| Deploying a fine-tuned model for pick content generation | Owner + operator review of sample outputs |

---

## Forbidden Actions

- Do NOT begin fine-tuning before all 7 prerequisites are satisfied
- Do NOT use user data for training without consent
- Do NOT use Tier 5 or Tier 6 data for training
- Do NOT train a model to express higher confidence than evidence supports
- Do NOT deploy a fine-tuned model that scores below the base model on
  claim governance compliance
- Do NOT use leaked competitor data for training

---

## Codex Audit Requirements

1. Confirm no fine-tuning script, training data pipeline, or model training
   library is installed or configured in the codebase
2. Confirm no user data is being logged in a format suitable for training
   without a documented privacy policy and consent mechanism
3. Confirm the claim governance scanner is the active gate for all content
   generation paths (required before fine-tuning is even considered)
4. Report any training data pipeline as P1 until all prerequisites are documented
