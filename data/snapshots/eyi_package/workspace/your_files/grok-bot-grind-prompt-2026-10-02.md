# Grok Bot Prompt — Full Corpus Grind (night of 2026-10-02)

*5,091 files. One bot. All night. The manifest does the finding; you do the reading.*

---

## THE PROMPT (paste this to Grok Bot)

```
You are doing a full-corpus extraction run. This is a grind task: read files,
extract, log, repeat. Work steadily top to bottom. Do not stop to summarize
until a checkpoint.

YOUR READING LIST
Open this manifest — it is your exact work queue, priority-ordered, 5,091 files:
https://raw.githubusercontent.com/Beexly/agent-bus/main/inbox/from-motif/GROK-BOT-READ-MANIFEST-2026-10-02.txt
(The manifest will be at that path. If it 404s, say so immediately and stop —
do not guess file paths.)
Fetch each file via: https://raw.githubusercontent.com/Beexly/agent-bus/main/<path>
Never use api.github.com (it rate-limits). If a fetch fails twice, log the file
as UNREAD and move on. Never silently skip.

WHAT'S ALREADY DONE (do not redo)
Two Grok Heavy passes already read the 11 slice maps, 4 search notes,
reconciliation files, and 9 key Sports source files. Their verdict, which you
are stress-testing — not re-deriving:
- BUILD: (1) run the selective publish sweep (empty table, deltas
  0/0.08/0.10/0.12/0.15/0.18); (2) provenance column on isPublished.
- KILLED as measured builds: conformal gate NFL result (ledger 0743 is vision
  tasks), per-QB EPA delta (third-party finding, never measured vs the close),
  QB pressure-to-sack lift (no out-of-sample), props share-core edge (design
  deck, no holdout), staleness as a model (gate already shipped), scale-fit
  rebuild (already shipped 2026-09-30), favorite-leaf model (file kills it).
- Settled kills: bridge-model.ts rebuild, 1704.00197 as anything but an in-game
  logistic, market-moneyline recalibration, team-level pressure-to-sack,
  per-QB uncertainty bands, soft-Elo, coverage transformer.

YOUR JOB PER FILE
One tight paragraph per file. No essays:
1. Method in one sentence.
2. Math/estimator, if any.
3. Dataset and sample size.
4. Claimed result WITH its metric (or "no metric stated").
5. License/provenance, if stated.
6. GSE relevance: HIGH / MEDIUM / LOW / NONE, one-line justification.
GSE is an NFL prediction engine (win probabilities, research → wire → weight →
calibrate → test → polish; uncalibrated runs in shadow; public site shows only
projections). HIGH means: a wireable signal, an implementable method, a
calibration technique, or a training dataset for that engine.

CHECKPOINTS — every 500 files, emit:
- Files completed / unread so far.
- Every HIGH item found in that batch, with file path and the metric.
- Anything that CONTRADICTS or OVERTURNS the verdict above — quote the file.
If the session ends mid-run, the next session resumes from the last completed
file in the manifest. State the resume point explicitly at every checkpoint.

FINAL REPORT (when the manifest is exhausted, or the night ends)
1. COVERAGE: read / unread counts. Honest numbers.
2. ALL HIGH ITEMS: the complete list with paths and metrics.
3. VERDICT CHANGES: for each killed item above — does the new material
   resurrect it? For each build item — does anything weaken it? Quote sources.
4. NEW BUILDS: anything the prior passes missed that deserves the build list,
   with the test that would prove it (data in, held-out metric, pass/fail bar).
5. DEDUPES: any duplicates beyond the known ones.

RULES
- Never invent a number, metric, or citation. "Not stated in the file" is a
  complete and correct extraction.
- A restrictive license means learn-the-method, not copy-the-code. Flag it.
- Do not touch: bridge-model.ts, 1704.00197 re-litigation, anything in open
  PRs #1018/#1019/#860 on Beexly/Sports. You are READING, not building —
  no code, no PRs, no repo writes.
- If you finish the manifest, say "MANIFEST COMPLETE" and give the final report.
```

---

## OPERATOR NOTES (for Garrett, not the bot)

- The manifest is priority-ordered: 3,457 briefs → 1,115 fulltexts → scored batches → deep/handoff → waves → everything else.
- 5,091 files is enormous for one bot in one night. The 500-file checkpoints mean partial progress is never lost — if it only gets through the briefs, that's still the highest-value slice.
- Resume: if the session dies, paste the prompt again plus "Resume from checkpoint N" and it continues.
- The verdict it's stress-testing is the abyssal run's: 2 builds, 7 kills. The bot's job is to try to break that verdict with new evidence, not to re-derive it.
