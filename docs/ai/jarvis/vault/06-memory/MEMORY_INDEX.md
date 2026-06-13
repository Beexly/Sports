# Memory Index

Last updated: 2026-06-13
Status: DESIGNED — session memory protocol is wired; persistent store is NOT_WIRED.

This index documents the Jarvis memory architecture. Two tiers exist: session memory (wired, ephemeral) and persistent memory (designed, not wired).

## Tier 1 — Session Memory (WIRED)

File: `apps/web/lib/jarvis/session-memory.ts`

Session memory accumulates facts within a single browser session. Facts are never deleted — only superseded. Each supersession creates an immutable audit trail with both the old fact (marked `supersededBy`) and the new fact.

### Fact Types

| Type | When added |
|---|---|
| `PLATFORM_STATE` | Jarvis assesses overall platform health |
| `PICKS_DATA` | Jarvis reports pick counts or status |
| `OWNER_DECISION` | Owner approves or rejects a proposal |
| `TASK_DISPATCHED` | Owner approves a dispatch plan |
| `RISK_SURFACED` | Jarvis surfaces a risk for owner awareness |
| `PATTERN_NOTED` | Pattern recognition surfaces a recurring pattern |
| `CORRECTION` | Jarvis corrects a prior statement |

### Deduplication Rule

An identical fact (same `factType` + same `content`) is never added twice to an active session. Active = not superseded. This prevents repeated status broadcasts from flooding the fact store.

### Supersession Rule

When a fact becomes outdated (e.g., platform state changes from GREEN to YELLOW), the old fact is superseded — not deleted. The audit trail preserves both.

```
addFact(ctx, { factType: "PLATFORM_STATE", content: "GREEN" })
→ ctx.facts = [{ id: "f1", content: "GREEN", supersededBy: null }]

supersedeFact(ctx, "f1", { factType: "PLATFORM_STATE", content: "YELLOW" })
→ ctx.facts = [
    { id: "f1", content: "GREEN", supersededBy: "f2" },   // audit trail
    { id: "f2", content: "YELLOW", supersededBy: null },   // active
  ]
```

### Session Handoff

At session end, `buildSessionHandoff(context)` produces a `ScribeEntry`:

```
type: HANDOFF
vaultPath: 01-daily/YYYY-MM-DD.md
body: decisions + dispatched tasks + risks surfaced + open items
```

This handoff is the primary cross-session memory mechanism until the persistent store is wired. The owner copies it to the vault manually or via the "Scribe this session" UI button.

## Tier 2 — Persistent Memory (NOT_WIRED)

The persistent memory store (PostgreSQL + pgvector) is fully designed in `JARVIS_MEMORY_PROTOCOL.md` but not wired.

Until wired:
- `memory.wired` is always `false` in `JarvisIntelligenceState`
- `memory.store` is always `"Not Connected"`
- `memory.truth` declares the honest state
- Jarvis does NOT claim to remember anything from prior sessions

## Vault Structure

```
docs/ai/jarvis/vault/
  01-daily/          ← session handoff notes, one file per date
  04-agents/         ← department report notes, agent charter notes
  06-memory/         ← this file and memory-related protocol docs
```

The vault is the human-maintained institutional memory until the persistent store is wired. Session handoffs land in `01-daily/`. Agent charter updates land in `04-agents/`.
