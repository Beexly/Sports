---
vault: jarvis
folder: scribe
created: 2026-06-12
updated: 2026-06-12
tags: [jarvis, galaxy, scribe]
---

# Jarvis Scribe — Output Folder

This is the default `outputPath` for rendered scribe entries
(`buildScribeProtocolForAgent().outputPath`). Agents and sessions format
entries with `formatScribeEntryAsMarkdown()` and a human (or an approved job)
writes the file here, named `<entry-id>.md`.

- Protocol: see `JARVIS_SCRIBE_PROTOCOL.md` in this folder.
- Note shape: see `TEMPLATE.md` in this folder.
- The scribe library itself does no I/O — files land here by explicit action.
- Never store secrets. Entries are redacted at creation AND at format time.
