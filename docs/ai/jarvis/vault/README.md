---
vault: jarvis
folder: root
created: 2026-06-12
updated: 2026-06-12
tags: [jarvis, galaxy]
---

# Jarvis Vault

Obsidian-compatible knowledge vault for the Galaxy Sports Edge platform. Every
note is plain markdown with YAML frontmatter, version-controlled in git, and
safe to open directly in Obsidian (point a vault at `docs/ai/jarvis/vault/`).

## Folders

| Folder | Purpose |
|---|---|
| `00-inbox/` | Unsorted captures. Triage to a destination folder. |
| `01-daily/` | Daily operating notes. One note per day from `TEMPLATE.md`. |
| `02-decisions/` | Decision log. One note per owner decision, immutable once approved. |
| `03-prompts/` | Prompt library notes (mirrors `apps/web/lib/jarvis/prompt-library.ts`). |
| `04-agents/` | Per-agent notes: charters, handoffs, observations. |
| `05-projects/` | Project notes: GSE, GSN, AIRWAVE, JARVIS, DESIGN, OPS. |
| `06-memory/` | Memory index. Candidate memories awaiting a wired store. |
| `07-runbooks/` | Operational runbooks (manual procedures). |
| `08-audit/` | Audit ledger. Append-only record of approvals and actions. |

## Usage rules

- Notes are written via the Scribe (`apps/web/lib/jarvis/scribe.ts`) format —
  YAML frontmatter plus markdown body. Hand-written notes follow the same shape.
- Never store secrets, keys, tokens, or credentials. The Scribe redacts; humans must too.
- Use `[[wikilinks]]` for backlinks between notes; ids are stable for linking.
- Visibility tiers: PRIVATE (owner only), INTERNAL (team), PUBLIC_SAFE (could be published).
- This vault is the file-backed layer of Jarvis memory. It is WIRED (git + files);
  the queryable memory store is not wired yet.
