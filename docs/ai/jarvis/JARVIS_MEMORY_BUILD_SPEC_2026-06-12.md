# Jarvis Memory Protocol — owner build spec (2026-06-12, verbatim)

> QUEUED build. Owner directive: add to the queue behind current work —
> do not skip ahead. This file preserves the full dump; the tracker line
> points here. Companion protocol docs live in this directory.

Persistent memory · cross-session recall · episodic decisions

**Current state:** Memory is not wired. Jarvis has no persistent memory.
Operational truth is rebuilt from the database on every load.
Architectural truth lives in version-controlled markdown. Nothing is
reliably recalled across sessions.

**Mission:** Wire Jarvis memory so the system can remember owner
decisions, product doctrine, failure lessons, operating preferences, and
agent outcomes across sessions without inventing facts or polluting
itself with unverified assumptions.

**Core principle:** Jarvis memory must be evidence-based, typed,
timestamped, source-linked, reviewable, and reversible. Do not treat
memory as a vague chat history. Do not allow self-learning to become
self-corruption. Do not let vector memory become the source of truth.

## Canonical memory hierarchy

1. **Version-controlled markdown** — source of truth for architecture,
   doctrine, capability registry, agent council, operator protocol.
2. **Postgres episodic memory store** — source of truth for decisions,
   events, lessons, failures, owner approvals, cross-session recall.
3. **Vector / mem0 retrieval layer** — optional recall/index only; never
   the canonical authority.
4. **Runtime context** — temporary working memory, current session only.

## Memory categories

Episodic (what happened) · Semantic (what is true) · Procedural (how
Jarvis does things) · Preference (how Garrett prefers decisions, outputs,
escalation) · Decision (what was decided, why, by whom, when) · Failure
(what went wrong, what changed, recurrence prevention).

## Memory states

candidate · confirmed · repeated_pattern · conflicted · stale ·
superseded · rejected · expired

Memory must not become permanent because a model inferred it. Candidates
require confirmation, repeated evidence, or explicit owner approval.

## AI Ops panel — "Jarvis Memory Protocol"

Shows: memory status (Wired / Not Wired / Partial / Simulated) ·
persistent store (Postgres / mem0 / Not Connected) · last memory written
· last memory recalled · candidates awaiting approval · conflicted ·
stale · expired · memory health score · next action.

When not wired, show: "Jarvis has no persistent memory. Operational
truth is rebuilt from the database on every load; architectural truth
lives in version-controlled markdown. Nothing is recalled across
sessions." Next action: "Wire an episodic memory store that captures
owner decisions with timestamps, source references, review state, and
recall metadata per JARVIS_MEMORY_PROTOCOL.md."

## Recommended implementation (Postgres first)

**Table `jarvis_memory_events`:** id, memory_type, memory_state, scope,
title, summary, full_text, source_type, source_ref, source_timestamp,
actor, owner, confidence, sensitivity, tags, related_decision_id,
related_agent_id, supersedes_memory_id, expires_at, created_at,
updated_at, confirmed_at, rejected_at, embedding_ref (optional),
metadata jsonb.

**Memory types:** episodic, semantic, procedural, preference, decision,
failure, source, agent_performance, escalation_rule, public_claim_rule.

**Table `jarvis_decisions` (decision ledger):** id, decision_title,
decision_summary, decision_type, rationale, evidence,
alternatives_rejected, owner, decision_date, revisit_date, outcome,
status, source_refs, created_at, updated_at.

Every major owner decision creates BOTH a ledger entry and a linked
memory event.

**Memory-worthy events (examples):** owner approved a public-claims
rule; owner rejected a design direction; owner changed model routing;
Jarvis escalated for legal/compliance risk; a prompt repeatedly failed
and was demoted; a No-Bet pattern proved valuable; a source became
unreliable; a launch blocker was identified; an architectural rule was
added to markdown doctrine.

**APIs / server actions:** createMemoryCandidate, confirmMemory,
rejectMemory, expireMemory, supersedeMemory, recallRelevantMemory,
listMemoryByState, listMemoryConflicts, linkMemoryToDecision,
linkMemoryToAgentRun.

## Recall behavior

Before answering a meaningful owner / architecture / product /
legal-sensitive / public-claims / GSE-strategy question, retrieve
relevant memory: confirmed memories, relevant decisions, procedural
rules, failure memories, unresolved conflicts, stale warnings.

Surface transparently: "Using confirmed memory from [date]: Garrett
decided X because Y." Uncertain: "I found a related memory candidate,
but it has not been confirmed." Conflicting: "There are conflicting
memories. Owner review is required."

## Memory hygiene

Show: candidates awaiting approval · unused in 90 days · contradicted by
newer decisions · low confidence · missing source references · tied to
deprecated docs · should expire · need owner confirmation.

## Memory review queue

Each candidate card: proposed memory, why it matters, source,
confidence, sensitivity, suggested category, confirm/reject/edit/expire.

## Conflict detection

A new memory contradicting a confirmed one must NOT overwrite silently.
Create conflicted state; show both memories, source for each,
recommended resolution; owner approval required.

## Privacy & safety

No sensitive, legal, HR, personal, or public-claim-impacting memory
without clear source and review state. Public-facing claims, legal
interpretations, HR-sensitive conclusions, gambling-related claims,
privacy decisions, and spending authority require explicit owner
confirmation before confirmation.

## Retention

Per memory: no expiration · 30-day · 90-day · project-based ·
superseded. Don't keep temporary operational detail forever unless it
materially improves future decisions.

## Model Council integration

Track over time: agents with accepted vs rejected outputs; model
failures by task type; escalations; prompts promoted/demoted; failures
that created procedural memory.

**Agent memory:** trust score by task type, failure history, escalation
history, last useful output, common weaknesses, approved use cases,
blocked use cases.

## Owner Brief integration

Daily brief includes: new confirmed memories, pending candidates,
conflicts needing review, decisions awaiting outcome review, failure
lessons from recent runs, stale doctrine warnings.

## Protocol docs to update on build

JARVIS_MEMORY_PROTOCOL.md, JARVIS_ARCHITECTURE.md,
JARVIS_CAPABILITY_REGISTRY.md, JARVIS_AGENT_COUNCIL.md,
JARVIS_OPERATOR_BRIEF.md (all exist in this directory).

## Acceptance criteria

1. Jarvis can write a memory candidate from an owner decision.
2. Confirm / reject / edit / expire / supersede all work.
3. Confirmed memory persists across reloads and sessions.
4. Relevant confirmed memories are recalled before answering.
5. Candidate memory is never treated as confirmed fact.
6. Conflicts are surfaced, never overwritten.
7. Every memory has type, state, timestamp, source, confidence.
8. Major decisions create decision ledger entries.
9. Panel clearly shows Wired / Not Wired / Partial / Simulated.
10. Mock memory data is clearly labeled simulated.
11. Linked to Forecast Center, Owner Brief, Model Council, Learning
    Loop, Failure Autopsy.
12. Jarvis can answer: "What did we decide, when, why, on what
    evidence, and did it work?"

## Non-negotiables

Do not fabricate memory. Do not silently promote candidates. Do not
overwrite confirmed memory without a supersession trail. Do not let
mem0/vector become the source of truth. Do not bury conflicts. Do not
store sensitive decisions without review state. Do not treat chat
history as reliable operating truth. Do not make memory feel magical —
make it auditable.

**Final goal:** Jarvis should remember consequences, not just
conversations. The memory protocol should make Jarvis safer, sharper,
and more useful every time it is used.
