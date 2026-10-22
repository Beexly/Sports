# GSE_MIND_INGEST_6H_2026-10-03

This section wins over any earlier "LATER", "shadow", "display only", or "wait" wording on corpus ingest. It does not replace the target. Section E's ceiling still wins on NFL hit rate. Section G's kills still win on edges. No Neon production picks. No bets. Do not start a second mind_train.py.

Deadline: 14:16 CT, 2026-10-03. Clock started 08:16 CT.
Done means a mind.jsonl line with that path. A file not in the registry at 14:16 is a failed hour, not a later task. Do not shrink the corpus.

Scope, prompt numbers, do not subtract:
- `C:\Users\Garrett\_research\agent-bus`, about 5,000 text files, 0.11 GB. Research and arxiv paths are the mind. Inbox kit notes are not.
- Fulltext: `C:\Users\Garrett\_research\agent-bus\research\arxiv-sweep\fulltext`, 1,115 files, 0 empty, min 2,817 bytes, median 61,283. Claimed sweep 865 does not match.
- Extract already on disk: `C:\Users\Garrett\_research\ctx-2026-10-03\corpus_extract\extract.jsonl`, 5,103 records. Verify also the OUT next to `docs/research/2026-10-03/engine-plan/corpus_read.py` if that file exists. They may differ. Seed both. Dedup by path.
- mind.jsonl baseline: 1,471 lines, 11.6 MB. Extend. Do not truncate.
- Canonical reader failure: arXiv 0707.1051, 55,022 bytes, 0-character read. Retry. Do not delete. Do not subtract.

Runner (local, no API for the seed): `C:\Users\Garrett\_research\ctx-2026-10-03\brain\ingest_corpus_to_mind.py`
Copy from the attached ingest script if it is not there yet.
Command: `python -u C:\Users\Garrett\_research\ctx-2026-10-03\brain\ingest_corpus_to_mind.py`
Cursor: `brain\ingest_cursor.json`. Resume is automatic.
It does not launch `mind_train.py`. If `brain\mind_train.pid` is dead, resume only with `python C:\Users\Garrett\AppData\Local\hermes\scripts\mind_watch.py`.

## Clock

08:16–09:15. Local seed. No API. Stream extract.jsonl into mind.jsonl and paper_registry.jsonl. One line per record with a path. Skip inbox. Proof: ingested_from_extract count in the thousands within 20 minutes. If the line count does not jump, the path is wrong. Print both extract file sizes and switch. Do not call a model this hour. This is how the 5,000 get in.

09:15–12:00. Fulltext gaps. Files with no usable extract, including 0707.1051. Four workers, one answered model each: space-bunny-free, glm-5.3-flash, gpt-6-luna, xiaomi/mimo-v2.6-flash, deepseek/deepseek-v4.1-flash, z-ai/glm-5.3-flash, nvidia/nemotron-3-ultra-550b-a55b. Do not call the four 403 app-only models on the API. Override any sports-only system prompt in corpus_read.py so math, physics, vision, and learning equations are extracted. Flat 10 minutes: switch provider. Do not pause the clock. Stop a provider at $8 if responses go empty.

12:00–13:15. READER_FAIL second model. Then two-model agreement only on equations about to enter the index. Mismatch stays in the mind as UNVERIFIED. Do not block the seed on agreement. Held-out: arXiv id integer mod 10 equals 0 is scored, not used to propose a signal.

13:15–14:00. Path receipts for agent-bus research and arxiv files that are not in the 1,115 and are not inbox. A NO_EQUATION receipt still counts. A missing path does not.

14:00–14:16. Historical replay on any point-in-time (p, y) table already on disk. Append the measurement. Write kills.jsonl for the thousandths-of-log-loss features. Do not cite 0.6072. Push `research/engine-plan-2026-10-03`. A commit not on origin does not exist. If late, drop agreement depth, not files.

## Proof at 14:16

- unique paths in mind.jsonl cover the fulltext count, or each missing path is a READER_FAIL with bytes.
- extract records seeded, deduped by path.
- mind.jsonl lines greater than 1,471 by the number of newly ingested files.
- intelligence_index.json extended, not rebuilt. Every new row has source_path.
- branch pushed.

## What loses

Shadow file that is not mind.jsonl. Waiting for a later week. Display-only. A second mind_train.py. Inbox kit notes counted as papers. Subtracting the 865-vs-1115 gap. Citing 0.6072. A Neon production write. A placed bet.
