# Jarvis OS Architecture

The Jarvis OS is the operating-intelligence layer of Galaxy Sports Edge: 13
layers that sense, interpret, decide, explain, act safely, remember, audit,
and improve — with hard approval boundaries everywhere. Statuses below are
honest; nothing is claimed as live before it is.

## Layers

| # | Layer | Code | Status |
|---|---|---|---|
| 1 | Scribe system | `apps/web/lib/jarvis/scribe-types.ts`, `scribe.ts` | WIRED (code + file-backed) |
| 2 | Obsidian vault | `docs/ai/jarvis/vault/` | WIRED (git-versioned markdown) |
| 3 | Memory protocol | `memory-types.ts`, `memory-protocol.ts` | NOT_WIRED (designed; no store) |
| 4 | Agent council | `agent-council.ts` (pre-existing) | DRAFT_ONLY/MANUAL/NOT_WIRED seats |
| 5 | Tool router | `tool-router.ts` | WIRED registry; most tools NOT_WIRED |
| 6 | Voice protocol | `voice-protocol.ts`, voice console | NOT_WIRED (designed) |
| 7 | Prompt library | `prompt-library.ts` | WIRED (code-backed, 8 templates) |
| 8 | Action queue | `action-queue.ts` | WIRED (lifecycle; no executor) |
| 9 | Unified OS state | `os-state.ts` | WIRED (pure composition) |
| 10 | Ask Jarvis expansion | `lib/cockpit/ask-jarvis.ts` | WIRED (13 new OS intents) |
| 11 | Cockpit integration | `components/jarvis/`, `/cockpit/jarvis/os` | WIRED |
| 12 | Audit + improvement | `audit-ledger.ts`, `improvement-loop.ts` | PARTIAL / NOT_WIRED |
| 13 | Docs | `docs/ai/jarvis/JARVIS_*.md` | WIRED |

## How they connect

```
OwnerSummary (live DB truth)
        │
        ▼
buildJarvisOSState() ←─ scribe · memory · tool-router · voice ·
        │               prompt-library · action-queue · audit · improvement
        ▼
/cockpit/jarvis/os  +  Ask Jarvis OS_LAYER intents
```

- Everything is pure and deterministic: no I/O, no `Date.now()` at module
  level, no model calls at runtime.
- The Scribe renders entries; humans/approved jobs write files to the vault.
- The action queue enforces the approval boundary; the audit ledger (once
  wired) records every transition; the improvement loop proposes — never acts.

## Hard invariants

1. No write tool runs without owner approval (`canRunNow=false` for writes).
2. Only `READ_ONLY_CHECK` actions can execute without approval.
3. The prediction engine is never adjusted automatically.
4. No secrets in scribe entries, memories, or transcripts — redaction enforced.
5. NOT_WIRED stays NOT_WIRED in every display until the wiring exists.
