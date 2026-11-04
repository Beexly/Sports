# Downloads Batch 2 Triage — 2026-11-04

71 listed paths, 71 present, 723,397,517 bytes total. Metadata-only inspection —
no archives extracted, no document bodies read beyond headers and a small sample.

## Verdict: the batch is 99% redundant, but not entirely

### Redundant — already committed to the repo

- **All 12 key plan/strategy documents are byte-identical** to their archived
  copies under `docs/engine/research/2026-10-28/downloads/`:
  `GSE-CONSOLIDATED-MASTER-PLAN`, `GSE_BUNDLE`, `GSE-CONSOLIDATION-CONFLICT-
  RESOLUTION`, `GAP-REPORT`, `MASSIVE-RECON`, `FOUR_ASKS`, `ENGINE_BLUEPRINT`,
  `SHARP_MONEY`, `SCHEME_LAYER`, `IG-SWEEP`, `SHARED-ITEMS-REGISTER`,
  `GSE-CONTENT-OS` — `IDENTICAL=12 DIFFERS=0`.
- **Two of the three scripts are already in the repo and the repo is AHEAD**:
  - `scheme_effects.py` — identical.
  - `load_scaling.py` — repo version adds type hints plus
    `effective_competitors()` and `scale_concentration_n_eff()`. Downloads copy
    is the earlier draft.
  - `engine_reverse.py` — repo version adds a scipy `erf`/`erfinv` fallback
    (Winitzki approximation) and `fit_book_pricing_kernel()`. Downloads copy is
    the earlier draft.
- The Downloads batch is therefore the *source* of the archived
  `2026-10-28/downloads/` folder, not new material.

### Genuinely new — the EYI Package zip only

`EYI Package_10-27-2026_1793067044.zip` is 657,707,672 bytes, 1,368 entries,
767 MB uncompressed. The repo already snapshots 173 of them
(`data/snapshots/eyi_package/`, 5.4 MB — a partial extraction). **538 markdown
files in the zip have no basename match anywhere in the repo.**

Distribution of the absent 538:

| Count | Directory |
|---:|---|
| 235 | `workspace/your_files/agy-handoff-2026-10-16` |
| 67 | `workspace/your_files/proactive_messages` |
| 44 | `workspace/your_files/agy-supplement-2026-10-16` |
| 22 | `workspace/user/files` |
| 9 | `workspace/your_files/galaxy-documentation-2026-10-16` |
| 5 | `workspace/goals/gse-engine-v5-3-0-calibration-rebuild` |
| 4 | `workspace/goals/gse-advanced-metrics-benchmark-sweep` |

So the new material is an **October 16 Antigravity handoff archive**, not new
engineering work. Sample contents:

- `agy-handoff-2026-10-16/00-README.md` — "Garrett's Fleet Memory & Interaction
  Corpus", explicitly self-described as containing **sensitive personal,
  financial and legal records**.
- `agy-handoff-2026-10-16/00c-completeness-audit.md` — 77 KB completeness audit.
- `agy-supplement-2026-10-16/00-COVER.md` — Claude web pulls, agent-bus sweep
  (6,150-file tree, 381 files read), Galaxy aggregate audit.
- `proactive_messages/research/…` — incident notifications, including a
  **GitGuardian secret incident** on a `Beexly/Sports` commit dated 2026-10-04.

## Two flags

1. **PII / secret risk.** The zip's own README declares it holds sensitive
   personal, financial and legal records, and its `proactive_messages` include a
   GitGuardian secret-incident notice. **Do not bulk-extract this zip into the
   repo.** The earlier Downloads PII sweep in this session already flagged a GCP
   service-account key, an SSN/passport PDF and bank statements in the same
   folder. Anything extracted needs a redaction pass first, and the secret-
   incident file needs its own look before any of it is copied near a commit.
2. **The redundant plan docs are not worthless** — they are byte-identical to
   what is committed, which means the archive is trustworthy. No action needed,
   but the equivalence is now proven rather than assumed.

## Recommendation

- **Ignore the 71 Downloads files for engineering purposes.** Already archived,
  and the repo copies are newer where they differ.
- **Treat the EYI zip as an archive to be indexed, not ingested.** Extract
  selectively into a scratch area with a redaction pass; do not commit bodies.
- **Read the GitGuardian incident file first.** If that secret is still live on a
  `Beexly/Sports` commit, that is an active exposure and outranks any corpus work.
