Deep extraction pass 3. Do not modify G:\ or any Sports checkout. Extract archives ONLY to C:\Users\Garrett\AppData\Local\Temp\gse-extract\fledge\. Write one report file.

First verify the dump path (use whichever exists): G:\My Drive\GSE. 10.2.26 OR G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26

Your slice: the archive `Sports-main (8).zip` (14,087 entries). Prior passes only compared three scoped dirs (intelligence/reasoning_engine, intelligence/gates, packages/prediction-engine/src/calibration) against the live tree. Those are DONE — do not repeat them.

Your job — the REST of the snapshot vs the live worktree C:\Users\Garrett\Sports-wt-intel:
1. Extract to your temp dir.
2. Build the list of SOURCE files (skip docs/, *.md, tests fixtures unless they name a live mechanism) under: packages/ (all packages EXCEPT prediction-engine/src/calibration), workers/, apps/web/lib/, gse-ml-service/, scripts/ (only files that wire or gate something).
3. Diff that list against the live tree. Produce two lists:
   a) SNAPSHOT-ONLY: source files present in the zip but ABSENT from the live worktree — with a one-line read of what each does (read the file; do not guess from the name).
   b) DIVERGED: files present in both but materially different (not whitespace) — with the one-line substance of the difference.
4. Mark each SNAPSHOT-ONLY file: WIRE-CANDIDATE (would add a real mechanism to the live branch), STALE (superseded — name the live replacement), or JUNK (fixtures/one-off scripts).
5. Do NOT copy any file into the live tree. Report only.

Report: C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\fledge-snapshot-gap.md — with counts, the two lists (cap each list at the 40 most important rows), the wire-candidate verdicts, and an honest note on anything you could not read.
