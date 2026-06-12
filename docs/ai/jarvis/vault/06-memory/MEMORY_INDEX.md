---
vault: jarvis
folder: 06-memory
created: 2026-06-12
updated: 2026-06-12
tags: [jarvis, galaxy, memory]
---

# 06 — Memory Index

File-backed holding area for memory candidates until a queryable store is wired.

## Honest status

- Backing: FILE_BACKED (this folder, git-versioned). The protocol and types are
  code (`apps/web/lib/jarvis/memory-protocol.ts`), classification is DESIGNED.
- There is NO cross-session recall. Jarvis rebuilds context from the database
  and these files on every load. Claiming otherwise is fabrication.

## Memory types

OWNER_PREFERENCE · PROJECT_FACT · SYSTEM_STATE · DECISION · PROMPT_PATTERN ·
AGENT_CAPABILITY · RISK_RULE · DESIGN_DOCTRINE · LEGAL_POLICY · BUILD_STATUS

## Protocol

- Candidates are classified by `classifyMemoryCandidate()` before landing here.
- DESIGN_DOCTRINE and PROMPT_PATTERN are always worth storing.
- `sensitive: true` candidates are redacted before writing. Never store secrets.
- Next wiring step: persist `JarvisMemoryRecord` rows to Postgres with
  timestamps, then add retrieval to the cockpit (per JARVIS_MEMORY_PROTOCOL.md).
