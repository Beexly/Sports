# Jarvis Scribe Protocol

How agents write notes. Code: `apps/web/lib/jarvis/scribe-types.ts` +
`apps/web/lib/jarvis/scribe.ts`. Full protocol detail also lives in
`docs/ai/jarvis/scribe/JARVIS_SCRIBE_PROTOCOL.md` (vault copy).

## Format

Every entry is a typed `ScribeEntry`: id, createdAt (caller-provided ISO),
source, actor, project (GSE/GSN/AIRWAVE/JARVIS/DESIGN/OPS), type
(OBSERVATION/DECISION/PROMPT/ACTION_PROPOSAL/HANDOFF/RESULT/RISK/MEMORY/TODO),
title, summary, optional details, tags, related files/routes, approval status,
visibility (PRIVATE/INTERNAL/PUBLIC_SAFE), risk level, optional next action.

Rendered output (`formatScribeEntryAsMarkdown`) is an Obsidian-compatible note:
YAML frontmatter + `#` title + summary + optional sections.

## Lifecycle

create → validate → redact → format → human/approved-job writes the file to
`docs/ai/jarvis/scribe/`. The library itself never touches the filesystem.

## Redaction rules

- Assignment shapes matching `/key|secret|token|password|credential/i`
  (e.g. `api_key=...`, `token: ...`) → value becomes `[REDACTED]`.
- Raw `sk-…` keys, `Bearer …` tokens, and JWTs → `[REDACTED]`.
- Redaction runs at `createScribeEntry` time AND again inside
  `formatScribeEntryAsMarkdown` (defense in depth).
- `redactScribeEntry` may be applied to any existing entry.

## Per-agent defaults

`buildScribeProtocolForAgent(agentId)`: default project lane per agent
(ava→GSN, scout/tal/sarah/bobby→GSE, owner→OPS, jarvis/claude/codex→JARVIS),
default visibility INTERNAL, output path `docs/ai/jarvis/scribe/`.
