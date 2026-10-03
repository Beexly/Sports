# TRAINING HANDOFF — GSE Mind (2026-10-03)

## Status
EXTRACTION IS FROZEN. No new feeds until trainer consumption is proved.
The corpus below is training MATERIAL. No model has been trained on it.
"Corpus is in" never again means "files on a branch."

## The corpus (exact, from branch manifest — verify before training)
Branch: `Beexly/Sports@research/engine-plan-2026-10-03`, dir `brain/`.
Total: **68,694 rows** across 14 shard groups.

| Shards | Rows | Bytes | Fidelity |
|---|---|---|---|
| mind_knowledge_u_00.jsonl | 22,282 | — | truncated ~4-5k chars |
| mind_knowledge_u_01.jsonl | 1,461 | — | truncated |
| mind_knowledge_u_02.jsonl + u_04_00..02.jsonl | 9,650 | — | markdown only, as-reported |
| mind_knowledge_u_03.jsonl | 536 | — | selected fields, as-reported |
| mind_knowledge_u_05_reveng.jsonl | 633 | 2,648,655 | FULL — 144 NFL-measured equations |
| mind_knowledge_u_06_agents.jsonl | 142 | 5,869,590 | FULL — 29 AGENTS.md |
| mind_knowledge_u_07_compintel_deep_00..18.jsonl | 12,518 | 153,284,548 | FULL — 1,915 rows w/ equations |
| mind_knowledge_u_08_local_00..08.jsonl | 9,085 | 67,455,986 | FULL — 3,802 local files |
| mind_knowledge_u_09_sportsdeep_00..06.jsonl | 1,590 | 57,147,392 | FULL — 1,811 equations |
| mind_knowledge_u_10_fulldepth_00..01.jsonl | 4,794 | 8,703,567 | FULL bodies, ZERO equation rows extracted (known hole) |
| mind_knowledge_u_11_dataassets_00.jsonl | 247 | 1,498,112 | schema/stats only, no raw bytes |
| mind_knowledge_raw_00..06.jsonl | 5,102 | 134,721,317 | FULL raw text, 127M chars |
| mind_knowledge_u_12_drive_00..06.jsonl | 649 | 20,066,880 | FULL — Drive deep feed, secrets redacted |
| mind_knowledge_u_13_tinkabot_eq.jsonl | 5 | 3,543 | column-backed equations |

## What the trainer must do
1. `mind_train.py` / `mind_train_b.py` MUST read every sidecar above (not just u_00).
   If the trainer doesn't read `mind_knowledge_raw_*` and `mind_knowledge_u_*`,
   say so explicitly — do not silently train on a subset.
2. Produce the consumption receipt (below). No receipt = not trained.
3. Land the receipt in the agent-bus `outbox/` (Windows worktree) AND report
   `mind.jsonl` / `mind_b.jsonl` final line counts + byte sizes.

## Consumption receipt (required fields)
- trainer_id (A or B), pid, start/end timestamps
- per-shard: filename → rows read → rows accepted → rows rejected (with reason)
- mind.jsonl (A) / mind_b.jsonl (B): line count + bytes BEFORE and AFTER
- total training rows incorporated
- any shard the trainer could NOT parse (name it, don't skip silently)

## Gates (Garrett's standing orders)
- Picks stay dark until the trained model exists AND its reasoning benchmarks
  against top LLMs. "Files on a branch" clears nothing.
- One walk-forward only, after integration (existing bar: n=1914, log loss 0.610490).
- Trainer A exclusively owns brain\mind.jsonl. Trainer B owns brain\mind_b.jsonl.
  No second writer. Ever.

## Queued behind the training proof (DO NOT START until receipt lands)
1. Drive `PC-offload/Downloads/`: 3× Spark part CSVs (~2.07GB) + `cfb_pbp_2025_all.csv` (554MB) — structured, directly trainable, never opened.
2. 14 Google Docs skipped as "name-dupes" without hashing — 2 are NEWER than kept copies.
3. Drive Computers corpus: `GSE_FRONTIER_ORCHESTRATOR.zip`, reverse-engineering research, `GSE_MASTER_COMPILATION.md` (~1GB).
4. `engine-handoff.zip` (142MB) + grok-workspace snapshots (~0.9GB).
5. Drive `GSN/`: design-audit docx packages, probability-engine corpus audit.
6. u_10 equation re-extraction (zero equation rows in 4,794).
7. 14 TS tools the mind knows but the engine can't run (9 disabled, 5 never built) — wiring lane.

## Open question for Garrett
Connected Drive holds ~35GB total, not 249–370GB. Second Google account, or was
that number the PC disk / Google One total? If there's another account, say the
name and the inventory re-runs there.
