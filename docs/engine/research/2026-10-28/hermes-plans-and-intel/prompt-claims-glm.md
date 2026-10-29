FULL-READ EXTRACTION — you own every file in your partition. Read EACH one completely. No sampling.

Base: C:\Users\Garrett\Sports\.worktrees\calib-boundary\docs\engine\research\2026-10-02\corpus-deep\deep\
Your partition: c04, c05, c06 (ALL .md files in those dirs, including working/ subdirs — 21 files).

For EACH file, extract EVERY distinct buildable/verified/refuted claim into one row:
| file | claim (1 line) | method | numeric gate | disposition | repo evidence |

Disposition is exactly one of:
- IMPLEMENTED — you verified the path exists in C:\Users\Garrett\Sports-wt-intel (name it)
- IMPLEMENTED-CALIB-BOUNDARY — exists in C:\Users\Garrett\Sports\.worktrees\calib-boundary only (name it)
- QUEUED-BUILDABLE — concrete system spec, nothing in repo; name what would be built
- QUEUED-RESEARCH — open question, no build spec
- NOT-APPLICABLE — no GSE seam (say why in claim)
- DUPLICATE — same claim as another row (name the file)
- CONTRADICTS-DOCTRINE — claims shadow-forbidden behavior (cite the doctrine)

Rules:
- Verify every IMPLEMENTED with a real file check (dir/file listing). No memory, no guessing.
- Numeric gates: quote them exactly. No invented numbers.
- One row per DISTINCT claim; a file may yield 0 rows (say so in a trailing note) or many.
- End the report with: TOTALS (rows per disposition), FILES READ (count + any unreadable), and the 5 highest-leverage QUEUED-BUILDABLE items ranked.

Write the report to: C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\claims-c04-c06.md
Read-only on both checkouts. No git commands.
