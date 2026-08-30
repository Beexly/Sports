# ADR: AI Control Plane — Invariants and Gap Analysis

**Status:** Proposed. Documents required invariants for the eventual `packages/ai-control-plane/` facade and audits the current `cost-policy.ts`/`provider-dispatch.ts`/`credit-pool.ts` implementation (this session's work, #148/#151) against them. **No code changes in this document — audit only, per Phase 0 scope.**

## Context

This session built `LLM_COST_MODE` (`cost-policy.ts`) and dispatch telemetry (`provider-dispatch.ts` + ledger persistence, #151) believing it was building "the" economic control plane. It is a real, tested foundation — but auditing it against the invariants below shows it is a **dispatch guard for one call path**, not a control plane that governs every model call in the repository.

## Invariants (from the governing directive, verified against current code)

### 3.1 One canonical AI control plane — **NOT MET**
Current: `callClaude()` in `provider-dispatch.ts` is opt-in per call site. This session verified 7 call sites use it (`studio/claude.ts` and 6 others, wired in #151). **Not verified in this pass:** whether `free-lane.ts` and `messages.ts` (both referenced in the directive as bypass risks) can still be called directly by some other, unaudited call site. No CI import-boundary guard exists today.
**Gap:** No AST/import-boundary CI check preventing a new file from importing `messages.ts`'s `callClaudeMessages` directly, or a Bedrock/Vertex client directly, bypassing `cost-policy.ts` entirely.

### 3.2 Provider is not payer — **NOT MET**
Current: `credit-pool.ts`'s `creditPoolForModel()` classifies by model-ID string shape and its own docstring states this lets you "attribute each dollar of spend to the credit pool that paid for it" — this is an overclaim per the invariant. A Bedrock model ID proves Bedrock was the transport used; it does not prove AWS Activate credits paid that specific call (the AWS account could be billing cash if credits are exhausted, unapproved, or misconfigured).
**Gap:** No separation between `provider_used` (verifiable from the response) and `credit_allocation_confirmed` (requires an out-of-band reconciliation against an actual AWS/Google credit balance, which does not exist anywhere in this repository).

### 3.3 Cost mode must be explicit and fail-safe — **PARTIALLY MET**
Current: `resolveLlmCostMode()` DOES throw on an unrecognized `LLM_COST_MODE` value (verified — this was a deliberate design choice this session, tested). **However:** a MISSING `LLM_COST_MODE` env var resolves to `"normal"` (cash-capable, reliability-first fallback), not a fail-closed default. In a production deploy where the env var is simply never set, the system defaults to the least restrictive mode.
**Gap:** Per the invariant, missing configuration in a billable-capable environment should fail startup/deploy validation, not silently default to `"normal"`.

### 3.4 Local private is not external free — **NOT APPLICABLE YET**
`internal-llm.ts` exists (verified by direct read this session) but is entirely unwired — no call site uses it. The lane-separation concern is real but has no current runtime impact since the code path isn't reachable.
**Gap for when it IS wired:** `internal-llm.ts` conflates "point at localhost Ollama" and "point at Groq's free-tier API" behind one `INTERNAL_LLM_BASE_URL` config with no data-classification or retention-policy distinction between the two.

### 3.5 A successful paid call must remain a successful call — **MOSTLY MET, one bug found and fixed**
This session found and fixed exactly this failure mode in `provider-dispatch.ts`: the dispatch-telemetry `emit()` call for the final direct-Anthropic path only fired on success. If `callClaudeMessages()` itself threw, the record was silently dropped — meaning a caller catching `ClaudeMessagesError` would lose the exact telemetry needed to know a bypass/fallback had occurred. **Fixed in #151, with a regression test.** This is direct evidence the invariant is worth stating explicitly — it was violated by real code in this session, not hypothetically.
**Remaining gap:** telemetry writes to `recordClaudeApiCall()` are not on a durable outbox — a DB write failure during telemetry persistence is currently swallowed silently in the closure-based call sites (`pick-explainer/explain.ts`, `loss-autopsy/draft.ts` — verified by direct code read: `catch { // A ledger failure must never break the user's request. }`). This correctly protects the user-facing call from a telemetry outage, but it also means a telemetry outage produces silent data loss with no alert.

### 3.6 No silent model substitution — **NOT MET / not applicable to current scope**
Current model resolution (`resolveAnthropicModelId()`) is explicit-id-first, then surface-tier lookup, then a hardcoded default. There is no capability-contract declaration per task and no evaluation-gated substitution registry. This is a real gap but was out of scope for what this session built — flagging as unmet, not regressed.

### 3.7 Evidence before promotion — **VIOLATED, then corrected in-session**
This session's own integration guides (`AWS-BEDROCK-CLAUDE.md`, `GOOGLE-VERTEX-AI.md`) originally presented AWS Activate/Google Startups PROGRAM MAXIMUMS as usable runway before being corrected against an external audit mid-session. This is the exact failure mode invariant 3.7 exists to prevent, caught by a human-provided audit rather than a repository-enforced gate. **No automated enforcement of this invariant exists anywhere in the repo today.**

### 3.8 One cockpit and one founder queue — **AT RISK, not yet violated**
No second LLM-cost dashboard has been built by this session's work — the existing `loadClaudeApiCostsDashboard()` (pre-existing, on `main`) remains the one read-model, and #151 only extends its underlying data (5 new nullable ledger columns), not a parallel dashboard. **Risk:** if NOVA's `/cockpit/nova/founder` (from #146) builds its own independent LLM-spend summary rather than embedding `loadClaudeApiCostsDashboard()`'s output, invariant 3.8 will be violated. Not yet checked in this pass whether #146's founder page does this — flagged as a required check before #146 merges any persistence work.

## Summary table

| Invariant | Status |
|---|---|
| 3.1 One control plane | Not met — no import-boundary guard |
| 3.2 Provider ≠ payer | Not met — `credit-pool.ts` overclaims |
| 3.3 Explicit fail-safe cost mode | Partial — throws on invalid value, defaults to cash-capable on missing value |
| 3.4 Local ≠ external-free | N/A yet — `internal-llm.ts` unwired |
| 3.5 Telemetry can't retry a success | Mostly met — one real bug found+fixed this session; silent-swallow-on-DB-failure gap remains |
| 3.6 No silent substitution | Not met — no capability-contract/registry exists |
| 3.7 Evidence before promotion | Violated once (this session's own docs), corrected manually, no automated gate |
| 3.8 One cockpit | At risk — not yet checked against #146 |

## Decision

Retain `cost-policy.ts`/`provider-dispatch.ts`/dispatch-telemetry (#148/#151) as the **foundation layer** of the eventual control plane — the fail-closed mode logic, the dispatch-record shape, and the bug-fix work are genuinely correct and tested. Do **not** present this work as a completed economic control plane in any PR description, master plan, or owner-facing report going forward. The `MASTER-PLAN-SONNET-2026-07-21.md` document (in #149) is superseded by this ADR on this specific point.
