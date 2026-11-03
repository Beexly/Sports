# GSE Standard Operating Workflow Contract

**Version:** 1.0 · **Created:** 2026-11-03
**Runner:** `scripts/ops/gse_structured_workflow_runner.py`
**Checkpoints:** `data/engine/workflow_runs/run_<UTC timestamp>.json`

This contract fixes the order of operations for an unattended GSE run so two
operators (or two nights) execute the same steps in the same sequence. It is
enforced by the runner, not by prose: every seat either passes its named checks or
the checkpoint records why it did not.

---

## Invariants

1. **Cleanup precedes diagnosis.** Free space below 6 GB is a *trigger to clean*,
   never an abort. The runner cleans, then doctors.
2. **Never touch a dirty worktree.** A stale worktree is removed only when
   `git status --porcelain` is empty **and** HEAD is an ancestor of `origin/main`
   or `hermes/week8-forensic-tracks-1-3`. `C:/c/wt-week8-forensic` is never a
   candidate for pruning.
3. **Canonical ledger is `verified_record`, not a continuity view.**
   `36-13-1 (+20.14u)`. `38-13-1 (+22.85u)`, `40-15-1 (+22.50u)` and
   `47-19-1 (+24.92u)` derive from it and may never be promoted over it.
4. **Secrets are reported, never printed.** `.env` checks emit `SET` / `MISSING`.
5. **Exit code 0 means "the run completed", not "everything passed."** Seat
   results live in the checkpoint. A non-zero exit would make a run look like a
   crash rather than a report.
6. **No fabricated telemetry.** Missing sources are recorded as missing.

---

## Seats

| # | Seat | What it enforces |
|---|------|------------------|
| 0 | `cleanup_and_doctor` | disk pressure cleanup → git HEAD reachable → ledger base `36-13-1 / +20.14u` → secondary `38-13-1` present → `.env` key status |
| 1 | `ingest_and_provenance` | the 6 Nov-2/3 downloads exist on disk **and** are indexed in `data/engine/INGESTION-MANIFEST-2026-11-02.json` |
| 2 | `vision_and_simulation` | `nfl_video_2026_harvester.py --pages 2` writes the replay catalogue; `replay_weeks_1_to_8_trainer.py --epochs 5` writes team priors |
| 3 | `equations_and_situational` | `tests/verify_out_of_sample_calibration.py --enforce-gate` exits 0 |
| 4 | `market_and_dfs_gate` | `scripts/dfs/build_week9_dual_slate_dfs_packets.py` writes both Week 9 packets |
| 5 | `audit_and_voice_briefing` | spoken digest builds from on-disk artifacts; full `pytest` suite exits 0 |

Each seat returns `{seat, name, status: PASS|FAIL|SKIP|ERROR, passed, checks,
details, elapsed_s}` and the checkpoint is rewritten immediately after it, so a
crash leaves the completed seats on disk.

## Flags

```
--run-all          seats 0..5
--stage <0..5>     seats 0..N
--status           print the most recent checkpoint
--dry-run          every read-only check, every subprocess skipped
--speak            speak the seat-5 digest
--epochs <n>       trainer epochs (default 5)
```

---

## Current known gaps (measured, not assumed)

- **Replay pages carry no video.** `nfl_video_2026_catalog.json` records
  `embeddable_pages: 0` across every page audited: no `<video>`, no `.m3u8`, no
  `.mp4`, no player iframe. The "Server #N" buttons are links to unrelated
  streaming hosts. Feature extraction therefore runs on the tracking/validation
  data that is genuinely on disk, and the catalogue says so.
- **Week 6 vision features are absent**, and week 2 has 138 rows — below the
  150-row floor. Reported in the feature-store coverage table.
- **Week 8 play-by-play is not in the source parquet**, which stops at week 7.
  The trainer reports `week8_status: ABSENT_FROM_SOURCE_PARQUET` rather than
  synthesising rows.
- **No `OPENROUTER_API_KEY` on this host**, so the Nemotron VL describe path is
  wired but idle and returns `NO_API_KEY`.

## Verification on 2026-11-03

```
python -m pytest tests -q                        174 passed
python scripts/ops/gse_structured_workflow_runner.py --dry-run --stage 1
                                                 seats 0-1 PASS
```
