You are reviewing a local Google Drive dump against the live Sports checkout. Do not modify G:\ or C:\Users\Garrett\Sports or any worktree.

Dump:
G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26

Your slice: the loose *.ts and *.test.ts files in that folder root, plus the directories sports-prediction-platform-6F7Wa, sports-prediction-platform-6F7Wa (1), sports-intelligence-os-phase-9-ci, sports-wip-2026-06-04, sports-wip-2026-06-04 (1), galaxy-sports-corporate-structure-Cni9A. Do not unzip archives. If a file is 0 bytes, say unreadable.

Live checkout to compare against (read only):
C:\Users\Garrett\Sports-wt-intel
Branch motif/gse-intelligence-build-2026-10-02 at 1758cfa0d.

Already present, do not recommend a second copy:
- packages/prediction-engine/src/bridge/bridge-model.ts
- packages/ingestion-pipeline/src/reasoning-trace/from-bridge.ts
- packages/ingestion-pipeline/src/reasoning-trace-not-slate.ts (WITHHELD and INSUFFICIENT cannot open the slate)
- Both assessIndependentEdge sites on C:\Users\Garrett\Sports\.worktrees\calib-boundary already pass probabilityCalibrator

Doctrine: never invent a probability, a sample count, or a calibration fit. A restrictive license means learn the method, do not copy the file into the repo. Shadow before publish. The frontier is that scoreGames in packages/prediction-engine/src/scoring.ts and process-sport.ts publish picks without a reasoning-trace verdict.

Write only:
C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\gpt-code.md

Report:
- files you opened (path + size if you can)
- each TS module: already in the live tree, new and safe to reimplement, or blocked
- the smallest fail-closed change that stops a published pick when the trace is missing, WITHHELD, INSUFFICIENT, or INVALID, without changing scoring math and without requiring a MODEL_VERSION bump
- anything in the dump that would fake a pick if wired as-is
No pasted source longer than 15 lines. No invented tests.
