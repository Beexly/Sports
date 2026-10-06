# PROGRESS — 2026-10-02 wiring brief

## Step 0 (measured on this host, not copied from the brief)

1. HOST: Beexly, Windows-10-10.0.26200, Sports worktree C:/Users/Garrett/Sports-wt-intel
2. SEED CSVs: C:/Users/Garrett/workspace/coaching-tendencies/data exists. It holds only pbp_2022.parquet through pbp_2026.parquet, hardlinked by this session from nflverse downloads. coach_offense.csv, coach_defense.csv, off_tendencies.csv, def_tendencies.csv are NOT in that directory. A 365,736-directory name search earlier today found zero coach_offense.csv on this machine. The brief's correction does not hold here.
3. HEAD: b3e15f21f [hermes-tau-producer] on motif/gse-intelligence-build-2026-10-02. Uncommitted: provider.py exclusivity fix (in progress), four untracked play_by_play_2022-2025.parquet.
4. DISK: 10.49 GB free of 476 GB.
5. SYNC: local HEAD is b3e15f21f. That commit is on origin. A provider.py edit is not yet committed.
6. AGENT-BUS: C:/Users/Garrett/agent-bus/inbox/from-motif has 17 TASK-* files (001-015 plus two dated) and BUILD-BIBLE.md. This is a local directory, not a GitHub inbox with an outbox from this run.
7. SHADOW CORPUS: ~/workspace has 9 children, not 40+. gse-research, qb-behavioral-profiles, creator-intel, arxiv-sweep, sports-merge are not on this host. coaching-tendencies exists and is the pbp hardlink dir above.

## Suite C (after tau commit, before exclusivity fix)

804 tests, 784 PASS, 14 FAIL, 6 SKIP. Ten are the missing seed CSVs. Four are tau-absence tests that fell through to the committed tau_hat.csv / pbp. Fix in progress: GSE_COACHING_DATA_DIR is exclusive for the tau table.

## HF re-query 2026-10-02T17:57:25Z

mimo-brain-engine RUNNING zero-a10g. studio-chat RUNNING zero-a10g. gse-watch-pipeline RUNNING cpu-basic. timesfm3-benchmark PAUSED. gse-proof-mcp PAUSED.
