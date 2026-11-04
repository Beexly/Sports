# EYI Zip — Content Correction to the Batch 2 Triage

Correction to `DOWNLOADS-BATCH2-TRIAGE-2026-11-04.md`. The earlier assessment said
the 538 absent markdown files were "an October 16 Antigravity handoff archive, not
new engineering work." That was **partly wrong**. A full index of the zip
(`eyi_zip_index_2026-11-04.json`, 1,368 entries) shows the absent markdown splits
into two distinct populations.

## Population A — genuine GSE engineering documents (worth extracting)

These are primary engineering artifacts from the Oct 14–24 build window that exist
nowhere else:

| Path | What it is |
|---|---|
| `workspace/goals/gse-engine-v5-3-0-calibration-rebuild/files/jev-emission-gate-eval-protocol-2026-10-16.md` | **Frozen** JEV emission-gate evaluation protocol, doctrine header |
| `workspace/goals/gse-engine-v5-3-0-calibration-rebuild/files/work-order-emission-gate-build-2026-10-16.md` | Build order for the transparent emission gate |
| `workspace/goals/gse-engine-v5-3-0-calibration-rebuild/files/pr1180-merge-review-cleanup-2026-10-19.md` | PR #1180 merge-review spec, Q22 third-down sacks |
| `workspace/goals/gse-engine-v5-3-0-calibration-rebuild/files/premise-grading-sea-den-2026-10-16.md` | SEA@DEN premise grading, game 2026_06_SEA_DEN |
| `workspace/goals/gse-engine-v5-3-0-calibration-rebuild/files/watch-pipeline-alibaba-migration-spec-2026-10-14.md` | HF Space → Alibaba Cloud migration spec |
| `workspace/goals/gse-advanced-metrics-benchmark-sweep/files/30-NIGHTS-DELIVERED-2026-10-14.md` | 30-night delivery record, Sep 14 – Oct 13 |
| `workspace/goals/gse-advanced-metrics-benchmark-sweep/files/siriusxm-weekly/week-06.md`, `week-07.md` | Weekly intel rollups (Oct 12–25) |
| `workspace/goals/gse-advanced-metrics-benchmark-sweep/files/siriusxm-gameday/2026-10-18-brief.md` | Week 6 game-day intel |
| `workspace/goals/open-source-football-full-dissection/files/OPEN-SOURCE-FOOTBALL-DISSECTION-2026-10-24.md` | Per-post dissection of Open Source Football |
| `workspace/goals/open-source-football-full-dissection/files/OSF-WIRING-BRIEF-2026-10-24.md` | Wiring brief for 15 new methods |
| `workspace/user/files/AGENT-WORK-AUDIT-2026-10-14.md` | Full-fleet agent work audit |
| `workspace/user/files/FULL_STACK_DELIVERY__9.md` | Complete-stack single-file delivery |

These are the kind of documents the repo's `docs/engine/research/` tree is for. They
should be extracted and committed as primary source material — **but only these**,
and only after a PII pass.

## Population B — PII-heavy personal records (do not ingest)

The zip's own `00-README.md` declares it holds "sensitive personal, financial, and
legal records." Confirmed by sample titles:

- `workspace/goals/wells-fargo-financial-deep-dive/files/cashnetusa-oct23-hardship-call-2026-10-16.md`
  — hardship call prep, bank details.
- The `agy-handoff-2026-10-16` tree (235 md files) — fleet memory corpus with
  personal/financial/legal material per its README.
- The `proactive_messages` tree (67 md files) — incident notifications including the
  GitGuardian secret-incident pointer.

**These stay in the zip.** Index them, never extract bodies into the repo.

## Composition of the 1,368 entries

| Ext | Absent count |
|---|---:|
| .md | 538 |
| .jpg | 208 |
| .png | 177 |
| .docx | 22 |
| .json | 20 |
| .html | 18 |
| .mp4 | 15 |
| .csv | 15 |
| .py | 12 |
| .zip | 10 |
| .pdf | 7 |
| other | ~30 |

Top dirs: `workspace/your_files` 620, `workspace/user` 407, `workspace/goals` 80.
259 entries already exist in the repo; 1,109 do not.

## GitGuardian incident — assessed

The notification file is at
`workspace/your_files/proactive_messages/research/proactive_notification:phase-497540:…:item:1.md`.
It is a **pointer**, not a secret: it names commit `301f829` on `Beexly/Sports`,
dated 2026-10-04T08:16:02Z, and points at `muse.db` rows for lookup. The commit
itself is a legitimate measurement-gate commit ("overnight: rule 3 measurement
gate — 3,819 accepted"). No secret value appears in the notification.

**Verdict: no active exposure from this file.** If the secret is still live in the
`Beexly/Sports` tree, that is a separate repo-hygiene task — the notification only
says GitGuardian flagged a new secret on that commit. Worth a scan, not an emergency.

## Recommended action

1. Extract **Population A only** (12 named documents) to
   `data/snapshots/eyi_engineering_2026-10-16/`, after reading each for PII.
2. Leave Population B in the zip. The JSON index is enough to know what is there.
3. Do not commit the zip itself (657 MB, and it is a PII archive).
