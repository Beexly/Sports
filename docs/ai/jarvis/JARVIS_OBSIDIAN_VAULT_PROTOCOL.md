# Jarvis Obsidian Vault Protocol

The vault lives at `docs/ai/jarvis/vault/` — plain markdown with YAML
frontmatter, version-controlled in git, openable directly as an Obsidian vault.

## Structure

```
vault/
  README.md           index
  00-inbox/           unsorted captures, triage within 7 days
  01-daily/           one note per day (TEMPLATE.md)
  02-decisions/       decision log, immutable once approved (TEMPLATE.md)
  03-prompts/         prompt library mirror + drafts
  04-agents/          per-seat notes
  05-projects/        GSE / GSN / AIRWAVE / JARVIS / DESIGN / OPS
  06-memory/          memory candidates until the store is wired
  07-runbooks/        manual procedures
  08-audit/           append-only audit ledger
```

## Frontmatter convention

```yaml
---
vault: jarvis
folder: XX-name
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [jarvis, galaxy]
---
```

## Backlink conventions

- Use `[[wikilinks]]` between notes; scribe/audit ids are stable link anchors.
- Daily notes link forward to decisions; decisions link to audit entries.
- A note that supersedes another links back to it — nothing is silently edited
  in `02-decisions/` or `08-audit/`.

## Sync protocol

- Git is the sync layer: the vault travels with the repo, reviewed in PRs.
- Agents never write files directly at runtime; rendered scribe markdown is
  committed by a human or an approved job.
- No secrets, credentials, or personal data without privacy review — same
  redaction rules as the Scribe.
