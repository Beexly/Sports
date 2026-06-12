---
vault: jarvis
folder: scribe
created: 2026-06-12
updated: 2026-06-12
tags: [jarvis, galaxy, scribe, protocol]
---

# Jarvis Scribe Protocol

Every agent and session leaves structured notes through the Scribe. Code:
`apps/web/lib/jarvis/scribe-types.ts` + `apps/web/lib/jarvis/scribe.ts`.

## Entry lifecycle

1. **Create** — `createScribeEntry({...fields, createdAt})`. The caller provides
   the ISO timestamp; ids are deterministic (`scribe-<source>-<type>-<stamp>`).
2. **Validate** — `validateScribeEntry(entry)` checks required fields and enums.
3. **Redact** — secrets matching `/key|secret|token|password|credential/i`
   assignment shapes, `sk-…` keys, bearer tokens, and JWTs become `[REDACTED]`.
   Redaction runs at creation and again at format time (defense in depth).
4. **Format** — `formatScribeEntryAsMarkdown(entry)` renders YAML frontmatter +
   markdown body for the vault.
5. **Write** — a human or approved job saves the markdown to
   `docs/ai/jarvis/scribe/` (the library never touches the filesystem).

## Required fields

source, actor, project, type, title, summary, riskLevel, visibility, approvalStatus.

## Forbidden content

API keys, secrets, tokens, passwords, credentials, raw env values, personal
data without privacy review, fabricated stats, and any claim of autonomy or
wiring that does not exist.

## Defaults per agent

`buildScribeProtocolForAgent(agentId)` returns the per-agent defaults:
project lane (e.g. AVA→GSN, SCOUT→GSE, claude/codex→JARVIS), visibility
INTERNAL, output path `docs/ai/jarvis/scribe/`.
