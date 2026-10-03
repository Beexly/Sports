# Sports OS — RAG Flow Governance

**Status**: Doctrine. Governs retrieval-augmented generation within Sports OS.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/brain/picks-intelligence.md` — pick evidence retrieval
- `docs/brain/intelligence-routing.md` — query response flow
- `docs/brain/calibration-feedback-loop.md` — evidence quality feedback
- `docs/models/answer-eval-benchmark-lab.md` — eval standards for RAG output
- `docs/audit/agentic-owasp-controls.md` — LLM01, LLM06, LLM09 controls

---

## Purpose

Retrieval-Augmented Generation (RAG) is the pattern where a language model's
response is grounded in evidence retrieved from a structured store, rather
than relying solely on the model's parametric knowledge. The Sports Brain
query handler (`docs/brain/intelligence-routing.md` — Flow 2) is the primary
RAG surface in Sports OS.

RAG governance defines:
- What evidence may be retrieved and injected into model prompts
- How retrieval is audited and logged
- What the model may say beyond retrieved evidence
- How hallucination in RAG outputs is detected and blocked
- What the retrieval failure path looks like

This document applies to all RAG pipelines in Sports OS, present and future.

---

## Source Evidence from Line Audit

Wave 3 audit reviewed RAG architectures and open-source RAG frameworks:

**Frameworks reviewed**:
- LangChain (Python): Popular RAG orchestration library; MIT license; used
  extensively in sports AI demos. Introduces significant abstraction that
  can obscure what evidence is actually injected.
- LlamaIndex (Python): Similar scope; MIT license; strong document-level
  chunking support.
- Haystack (deepset): Enterprise RAG; Apache 2.0; stronger audit trail
  than LangChain.
- RAGFlow (InfiniFlow): Open-source RAG platform; Apache 2.0; focuses on
  document-level retrieval with source attribution.

**Key findings**:
- All popular RAG frameworks allow arbitrary document retrieval without
  enforcing source tier quality. Sports OS cannot use a generic RAG pipeline
  without adding its own evidence tier gate.
- Several frameworks support "generative answering" where the model may
  answer from parametric knowledge if retrieval returns nothing. This is
  forbidden in Sports OS — empty retrieval must produce a "cannot answer
  without evidence" response, not a hallucinated answer.
- Citation attribution varies significantly between frameworks. Sports OS
  needs source ID + tier + freshness in every citation.

---

## User Value

When RAG governance is active:
- Brain answers are always grounded in verifiable, dated, tier-classified evidence.
- Users can see exactly what sources backed an answer (Evidence Drawer).
- The model never fills evidence gaps with parametric sports knowledge —
  an unanswered question produces "insufficient evidence" rather than a
  confident but fabricated answer.

---

## Operator Value

- Every Brain answer has a complete evidence audit trail.
- Operator can reproduce any answer by inspecting the evidence vault items
  that were retrieved and injected.
- Claim governance scanner runs on RAG output before it reaches the user —
  no RAG answer bypasses claim review.

---

## Current Sports OS Fit

The Sports Brain query handler is partially implemented. The evidence
retrieval step (Flow 2A–2C in `docs/brain/intelligence-routing.md`) pulls
from the Evidence Vault. RAG governance formalizes the rules that step
must follow.

No third-party RAG framework (LangChain, LlamaIndex, RAGFlow) is currently
a dependency. If one is added in the future, it requires Zone 3 approval
(adding a dependency). The current implementation is a direct query pattern —
this document governs that pattern.

---

## RAG Evidence Retrieval Rules

### Rule 1 — Evidence Must Come from the Vault

The language model may only be injected with evidence items that:
1. Exist in the Evidence Vault at query time
2. Have `status: 'ACTIVE'` (not STALE, EXPIRED, or REVOKED)
3. Have a source tier of T1, T2, or T3
4. Pass freshness validation (TTL not exceeded)

**No evidence may be retrieved from**:
- External APIs called at query time without going through the Evidence Vault
- The model's parametric knowledge (it cannot "fill in" missing evidence)
- T4, T5, or T6 sources
- Any source not registered in the Source Acquisition Mesh

---

### Rule 2 — Evidence Injection Format

All retrieved evidence items must be injected in a structured format that
the model can attribute:

```
[EVIDENCE START]
Source ID: {evidenceItem.sourceId}
Source tier: {evidenceItem.sourceTier}
Source name: {evidenceItem.sourceName}
Evidence date: {evidenceItem.evidenceDate}
TTL remaining: {evidenceItem.hoursUntilExpiry} hours
Content: {evidenceItem.content}
[EVIDENCE END]
```

The model must be instructed to cite source ID, source name, and evidence
date in its response. If it cannot produce a response using only the injected
evidence, it must output a structured "insufficient evidence" response —
not a best-effort answer from parametric memory.

---

### Rule 3 — No Parametric Fallback

When retrieved evidence is insufficient, the model's system prompt must
prevent parametric fallback:

```
You must answer using ONLY the evidence items provided between [EVIDENCE START]
and [EVIDENCE END] tags. If the evidence does not contain enough information
to answer the question, respond with exactly:

INSUFFICIENT_EVIDENCE: The evidence vault does not contain enough current,
verified information to answer this question. Relevant query: [restate query].
Suggestion: [suggest what evidence type would answer this].

Do NOT answer from your training knowledge. Do NOT estimate. Do NOT say
"based on typical patterns..." or similar. If you cannot cite a specific
evidence item, do not make the claim.
```

---

### Rule 4 — Source Tier Floor

The minimum source tier for RAG evidence injection:
- Pick explanations: T1 or T2 only
- Brain answers (free tier): T1 or T2 only
- Brain answers (pro/elite enrichment): T1, T2, or T3 (T3 must be disclosed)
- Editorial context in Model Journal: T3 acceptable with operator disclosure

If the only available evidence is T4 or lower, the response must be
`INSUFFICIENT_EVIDENCE` — not an answer grounded in T4 sources.

---

### Rule 5 — Retrieval Audit Log

Every RAG retrieval event must produce an audit log entry:

```typescript
interface RAGRetrievalLog {
  queryId: string;              // Unique per Brain query
  queryHash: string;            // SHA-256 of query text (not plaintext — privacy)
  retrievalTimestamp: string;   // ISO 8601 UTC
  evidenceItemsRetrieved: string[];  // Array of evidence vault IDs
  evidenceItemsInjected: string[];   // May be subset of retrieved (after filtering)
  tiersInjected: string[];           // Array of source tiers
  retrievalStrategy: string;    // e.g., 'semantic_similarity', 'entity_match'
  complianceScanPassed: boolean;
  responseStatus: 'ANSWERED' | 'INSUFFICIENT_EVIDENCE' | 'BLOCKED_BY_SCANNER';
  modelVersion: string;
  responseLatencyMs: number;
}
```

Retrieval logs must be retained for 90 days minimum and be accessible
to the operator for audit purposes.

---

### Rule 6 — Claim Governance on RAG Output

Every RAG output, before it reaches the user, must pass through the
claim governance scanner (`apps/web/lib/compliance-scanner/rules.ts`).

If the scanner finds a violation:
- The response is blocked and not shown to the user
- The response is logged with `responseStatus: 'BLOCKED_BY_SCANNER'`
- The operator is notified via the Cockpit audit trail
- The model does NOT retry with a looser prompt

There is no "second attempt" if the first output violates claim governance.
The response is blocked, and the user sees:
"This query returned a response that requires additional review. Please check
back shortly or contact support."

---

### Rule 7 — No User Query Storage for Training

User queries (question text) submitted to the Brain may not be stored for:
- Model fine-tuning datasets
- Prompt engineering datasets
- Behavior analysis without consent
- Sale or sharing with third parties

Query hashes (SHA-256) may be stored for deduplication and rate limiting.
Query text is not stored beyond the immediate session unless the user
explicitly opts in with a documented consent mechanism.

---

## RAG Failure Modes and Responses

| Failure mode | Response to user | Internal action |
|---|---|---|
| No evidence retrieved | INSUFFICIENT_EVIDENCE response | Log retrievalStatus: 'EMPTY' |
| All retrieved evidence is stale | INSUFFICIENT_EVIDENCE response | Log TTL failure count |
| Evidence retrieved but below tier floor | INSUFFICIENT_EVIDENCE response | Log tier failure |
| Model output fails claim governance | "Requires additional review" | Log scanner block |
| Evidence Vault unavailable | "Service temporarily unavailable" | Alert operator |
| Retrieval latency exceeds 5s | "Service temporarily unavailable" | Circuit breaker |

---

## Forbidden Actions

- Allowing the model to answer from parametric knowledge when evidence is empty
- Injecting T4, T5, or T6 evidence items into any RAG prompt
- Bypassing the claim governance scanner on any RAG output
- Storing user query text for training without explicit consent
- Allowing a RAG failure to silently produce a hallucinated response
- Using stale evidence items (TTL exceeded) in any retrieval response
- Adding a third-party RAG framework without Zone 3 approval

---

## Licensing / Security Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Model answers from parametric knowledge (hallucination) | P0 | Rule 3: no parametric fallback |
| User query text logged for training without consent | P0 | Query hash only; no plaintext storage |
| Claim governance bypass | P0 | Rule 6: scanner runs before every response |
| T5 source injected via retrieval | P1 | Tier floor gate at retrieval |
| RAG framework dependency introduces supply chain risk | P1 | Zone 3 approval; dependency pinning |
| Prompt injection via evidence content (LLM01) | P1 | Sanitize evidence content before injection |

---

## MVP Path

**MVP**: The current Brain query handler implementation. Ensure Rules 1–7
are enforced in the existing code. No new dependency needed.

Key MVP validation:
- Confirm parametric fallback is disabled in system prompt
- Confirm claim governance scanner runs on every RAG output
- Confirm retrieval audit log is implemented

---

## Future Version

**V2**: Semantic similarity retrieval using embeddings (vector search)
to improve evidence relevance. Requires vector store infrastructure (Zone 3).
**V3**: Multi-hop RAG — retrieve evidence, synthesize intermediate question,
retrieve additional evidence. Higher hallucination risk; requires extended
evaluation.

---

## Validation Requirements

A task is NOT complete until:
- Empty retrieval produces INSUFFICIENT_EVIDENCE, not a hallucinated answer
- Claim governance scanner runs on 100% of RAG outputs
- Retrieval audit log records all RAG events with evidence IDs
- No user query plaintext is stored beyond session TTL
- T4/T5/T6 evidence tier gate is tested and verified to block

---

## Approval Gates

| Action | Approving party |
|---|---|
| Adding any third-party RAG framework | Owner (Zone 3) |
| Changing the evidence tier floor for any surface | Owner |
| Adding a new retrieval strategy | Operator |
| Storing any user query data beyond session | Owner + consent framework |
| Extending RAG to a new content surface | Operator + compliance review |

---

## Codex Audit Requirements

1. Confirm the Brain query handler system prompt disables parametric fallback
2. Confirm claim governance scanner is called on every RAG output before
   user response
3. Confirm retrieval audit log records evidence IDs and tier for every query
4. Confirm no user query plaintext appears in any log or database table
5. Confirm T4/T5/T6 tier gate rejects evidence items at retrieval time
6. Report any RAG surface without a claim governance scan gate as P0
