# docs/handoff/INDEX.md — GSE fleet handoffs for coding agents

Each entry is a dated, verbatim status handoff from the GSE bot fleet (🩷 GSE MAIN BOT
plus the six division leads). The reports live in the repo's own filing location
(`docs/<bucket>/research/<YYYY-MM-DD>/`, per `docs/INDEX.md`), so the mind feed can
pick them up (`brain/feeds/append_day_feed.py`). This file is the index of them.

## 2026-10-18 — GSE fleet status (all division leads + X ingest)

Folder: [`docs/engine/research/2026-10-18/gse-fleet-status/`](../../docs/engine/research/2026-10-18/gse-fleet-status/)

Read in this order:

1. [`README.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/README.md): index and cross-cutting facts
2. [`X-INGEST.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/X-INGEST.md): X DM + topic-search ingest (priority area)
3. [`DIV-1.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/DIV-1.md): Football Intel
4. [`DIV-2.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/DIV-2.md): Signal & Research
5. [`DIV-3.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/DIV-3.md): Engine QA
6. [`DIV-4.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/DIV-4.md): Content & Media
7. [`DIV-5.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/DIV-5.md): Revenue & Kit
8. [`DIV-6.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/DIV-6.md): Owner Ops
9. [`ERRATA-DIV-3.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/ERRATA-DIV-3.md): corrections (read before acting on DIV-3 or README)

Rules for using it:

- **UNKNOWN means unverified.** Every item marked `UNKNOWN` is unverified. Confirm it
  or ask the owner. Never guess or fill one in.
- **ERRATA-DIV-3.md wins.** Where it conflicts with `DIV-3.md` or `README.md`, the
  errata is correct:
  - The `validate.py` BIAS enum bug (README / DIV-3 "line 13") is **already fixed**.
    The enum now comes from each file's `$schema` and the tests pass. Do not re-fix it.
  - The CFBD usage log totals **26** calls, not 27. The other estimates stand: about 24
    unique calls, about 399 remaining, about 577 unattributed.
  - Repair order **RO-2026-10-18-13 is closed**.
  - Today's QA result is 7 batches promoted and 5 rejected (16 files promoted, 35 rejected
    out of 51).
- **The X-ingest repairs are in the data, not the scripts.** Repair orders RO-02..05
  and RO-13 were applied to the data files under `/workspace/gse/blackboard/ingest/`.
  The `/workspace/xsearch` and `/workspace/xdm` scripts were not changed. Rerunning
  those scripts as they are would overwrite the data and undo the repairs. Port the
  fixes into the scripts first (see X-INGEST.md coding tasks).
- Paths under `/workspace/...`, `/home/box/...` and `/cursor/stores/...` are on the
  fleet's box. They are not in this repo, and `/workspace/gse` is not a git repo.
- Everything ingested stays at weight 0 until QA promotes it.

## Consumer rule (RO-16) — 2026-10-18

**Every consumer of x-dms `profile-intel.jsonl` MUST filter `eligible == true`.**

Do not select on `division` or `kind` alone. Quarantined rows use owning `division=DIV-3` with `routing="NONE"`, `eligible=false`, and `layer2_relevance=NONE_PURE_LAYER1`. A bare `division=DIV-3` or `kind=football` filter will pull quarantined off-topic rows into DIV-3 Lead and overheard intakes.

| Consumer | Required filter |
|---|---|
| DIV-3 Lead | `division=DIV-3` AND `eligible==true` |
| overheard | `kind=football` AND `eligible==true` |
| sherlock | `kind=ai_quant` AND `eligible==true` |
| account-book / DIV-1 | `division=DIV-1` AND `eligible==true` |
| DFS bot | `dfs.jsonl` rows with `eligible==true` |

See [`X-INGEST.md`](../../docs/engine/research/2026-10-18/gse-fleet-status/X-INGEST.md) § Consumer rule (RO-16) for details. Full DIV-1 row review lives on the fleet box at `ingest/x-dms/2026-10-18/div1-row-review-ro16.tsv`.

## Consumer rule (RO-17) — 2026-10-18

Every x-dms row now has an explicit `eligible` field. Consumers filter `eligible==true` (see X-INGEST.md § Consumer rule (RO-17)). The RO-16 table still applies; the missing-field fallback is retired.

## Consumer rule (RO-18) — 2026-10-18

X-INGEST inventory numbers (profile-intel 1,117 / dfs 79 / duplicates 35 / hype_flag 22 / lease 9) are generated from live files by `/workspace/xdm/gen_inventory.py`. `write2.py` no longer uses `--stabilize-from`; plain rerun is byte-identical. Eligible consumer rule unchanged: filter `eligible==true`. No missing-field fallback.

## Consumer rule (RO-19) — 2026-10-18

Selective stamp: only content-changing rows get new lease/RO/timestamp (`write2.py --prior`, CLI `--repair-order/--lease/--timestamp-ct`). dfs/removed/siblings at lease-8 checksums; profile/retag differ from lease 8 only on the 5 classifier reason-text rows. Eligible rule unchanged: `eligible==true`. No missing-field fallback.
