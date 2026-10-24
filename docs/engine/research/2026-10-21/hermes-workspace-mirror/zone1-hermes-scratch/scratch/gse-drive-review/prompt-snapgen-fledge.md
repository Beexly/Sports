Snapshot-generation diff — recover work that exists in older repo snapshots but not in the live tree. Read-only on checkouts; extract archives ONLY to C:\Users\Garrett\AppData\Local\Temp\gse-extract\snapgen\; no git commands.

Archives (all in G:\My Drive\GSN\):
- Sports-main (3).zip
- Sports-main (4).zip
- Sports-main (7).zip

Reference trees:
- newer snapshot: extract Sports-main (8).zip from G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26\ to the same temp dir (reuse a prior extraction under Temp if it exists)
- live tree: C:\Users\Garrett\Sports-wt-intel (branch motif/gse-intelligence-build-2026-10-02)

Scope (source that matters; skip node_modules, .git, lockfiles, reports/, .opencode-runs/):
- packages/*/src/**
- apps/web/lib/**, apps/web/app/**, apps/web/__tests__/**
- intelligence/**
- workers/**
- scripts/**
- docs/engine/**, docs/arxiv-program/**, docs/ops/**

Method:
1. Extract (3), (4), (7), (8) to temp.
2. Build the scoped file set per generation.
3. Every file present in (3), (4), or (7) but ABSENT from (8) AND absent from the live tree: list as MISSING-FROM-LIVE with newest generation, byte size, one-line gist (read the file head).
4. Files present in an older generation AND live but materially different (>30% size delta or >20 changed lines): list as DIVERGED with a short note on what the older generation may hold that live lacks.
5. Ignore differences that are line-endings only.

Report: write C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\fledge-snapgen.md containing:
- counts per generation (files, bytes, scoped files)
- the MISSING-FROM-LIVE table (path, generation, size, gist) — the recovery candidate list
- the DIVERGED table
- closing verdict: how many recovery candidates are real source code vs stale duplicates
Modify nothing outside the temp dir and this one report file.
