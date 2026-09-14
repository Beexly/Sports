# L1 Sign Check — Independent Verification

**Date:** 2026-09-14  
**Analyst:** Motif (independent check, from scratch)  
**Target:** sign of the ColdWindy × PlayAction interaction in L1 (Minis reported c = +0.082, a sign flip vs. pre-registered c < 0)

## Verdict (attempt 2, completed)

**SIGN CONFIRMED — agrees with Minis's reported positive sign, not the pre-registered negative.**

The independent diff-in-diff on raw completion rates is **+0.0158** (PA effect in ColdWindy +0.0374 vs. +0.0215 in neutral), and an independently-coded logit with the same structure gives an interaction coefficient of **+0.0649** (se 0.0546, z = +1.19). Both agree in sign with Minis's c = +0.082.

This means the sign flip is **in the data**, not a sign-convention/orientation artifact of Minis's pipeline — the raw cell means show it without any model machinery. It does **not** mean the effect is real in the statistical sense: my quick logit z = +1.19 would not clear a significance bar either, and Minis's stage-1 kill (K1 sign flip + K2 ΔLL below the 0.002 threshold) stands as the correct disposition. The kill is directionally corroborated.

## Attempt 1 — BLOCKED (documented, not redone)

The `play_action` column does not exist in any local nflverse play-by-play parquet (verified against actual Parquet schemas, all four seasons 2022–2025, 372 columns each — `play_action` = False everywhere), and no `ftn_charting` files existed locally. `/tmp/nfl` (Minis's working dir) does not exist on this VM. No proxy was invented; the attempt stopped per protocol. (Original notes preserved in full at the bottom of this file.)

## Attempt 2 — completed 2026-09-14 ~14:05 CDT

### Data fetched

Exact URL pattern from nflreadpy 0.1.5 `downloader.py` (the same library that built the snapshot; `load_ftn_charting.py` uses path `ftn_charting/ftn_charting_{season}` + parquet extension against base `https://github.com/nflverse/nflverse-data/releases/download/`):

- `https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_2022.parquet` — HTTP 200, 501,910 bytes, 41,643 rows × 29 cols
- `https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_2023.parquet` — HTTP 200, 567,781 bytes
- `https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_2024.parquet` — HTTP 200, 563,180 bytes
- `https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_2025.parquet` — HTTP 200, 556,470 bytes

Saved as `~/workspace/gse-discovery/ftn_charting_{2022,2023,2024,2025}.parquet` via curl -sSL (GitHub release URLs 302-redirect; all final responses HTTP 200).

### Key columns used

- Charting: `nflverse_game_id` (String), `nflverse_play_id` (Int32), `is_play_action` (bool; 2022: 4,694 true / 36,949 false). Zero nulls in `nflverse_play_id`; no duplicate (game,play) keys in either table.
- pbp: `game_id` (String, same `2022_01_BUF_LA` format), `play_id` (Float64 in the local parquet — cast to Int64 after filtering; non-null in the analysis frame), plus `season_type`, `pass_attempt`, `complete_pass`, `roof`, `temp`, `wind`.
- pbp has no `nflverse_play_id` column, so the join is `game_id + play_id`, exactly as Minis did.

### Join rates (attempts matched to charting, per season)

| Season | Analysis-frame attempts (pre-join) | Joined | Rate |
|---|---|---|---|
| 2022 | 6,746 | 6,723 | 0.9966 |
| 2023 | 10,820 | 10,820 | 1.0000 |
| 2024 | 12,125 | 12,125 | 1.0000 |
| 2025 | 11,900 | 11,900 | 1.0000 |
| **Total** | **41,591** | **41,568** | — |

Matches Minis's reported rates (99.6% / 100.0% / 100.0% / 100.0%) and total (41,568) — the pipeline replication is faithful.

Analysis frame filters: `season_type == "REG"`, `pass_attempt == 1`, `roof ∈ {outdoors, open}`, `temp` and `wind` non-null. `ColdWindy = temp <= 40 OR wind >= 15`.

### Cell completion rates

| Cell | n | Completion rate |
|---|---|---|
| PA / ColdWindy | 2,522 | 0.6130 |
| nonPA / ColdWindy | 8,620 | 0.5756 |
| PA / neutral | 6,370 | 0.6174 |
| nonPA / neutral | 24,056 | 0.5959 |

- PA effect in ColdWindy: **+0.0374**
- PA effect in neutral: **+0.0215**
- Diff-in-diff (ColdWindy × PA interaction, linear): **+0.0158**

### Independently-coded logit

`complete_pass ~ 1 + coldwindi + pa + coldwindi×pa` (Newton-IRLS, 100-iteration cap, converged):

| Term | Coef | SE | z |
|---|---|---|---|
| const | +0.3884 | 0.0131 | +29.56 |
| cw | −0.0835 | 0.0254 | −3.28 |
| pa | +0.0902 | 0.0289 | +3.12 |
| **cw×pa** | **+0.0649** | 0.0546 | +1.19 |

Interaction sign: **POSITIVE**, same sign as Minis's +0.082 (magnitude difference is expected — Minis's model included baseline controls like down/distance; this check deliberately kept the control set minimal). Note the main effect of cold/wind is negative and significant (−0.0835, z = −3.28): weather does depress completion rates, but play-action does **not** differentially rescue it — if anything the PA premium is slightly larger in bad weather, the opposite of the pre-registered theory.

### Honest discrepancies vs. Minis's reported frame

Minis reported analysis n = 39,986, ColdWindy = 10,950, PA = 8,584; mine gives 41,568 / 11,142 / 8,892. The join totals match exactly, so the gap is a filter difference upstream (e.g., their weather-missing handling or season/week edge cases) — I did not force reconciliation by tweaking filters, and the sign result is robust to it. Minis's exact stage-1 ΔLL values and the efficient-score stage-2 procedure remain Minis-reported, not reproduced here.

## Plain-language verdict

- **Sign question: settled.** Independent re-computation from raw nflverse charting labels confirms Minis's positive interaction. The pre-registered negative theory (play-action suffers more in cold/wind) is contradicted by the data; the kill was correct on K1.
- **Caveat:** this check does not reproduce Minis's ΔLL numbers or validate the efficient-score substitution — those remain UNVERIFIED per the Claude audit's charge 2/3.
- **Bottom line for the program:** L1's death is a genuine null-with-evidence, not a coding artifact. It joins the 13-compound battery as another clean kill.

---

## Attempt 1 — original blocked notes (preserved verbatim from 2026-09-14)

**Verdict at the time: CANNOT VERIFY — STOPPED per protocol.** The `play_action` column does not exist in any local nflverse play-by-play data, and no proxy was invented.

Data inspected:
- Snapshot: `~/workspace/gse-discovery/data_snapshot_20260913/` (created 2026-09-14T02:49:49Z, nflreadpy 0.1.5 / polars 1.44.2, per MANIFEST.md)
- Files checked: `pbp_2022.parquet` (13,404,442 bytes, 372 cols), `pbp_2023.parquet` (20,534,088 bytes), `pbp_2024.parquet` (13,411,090 bytes), `pbp_2025.parquet` (13,266,724 bytes) — verified against actual Parquet schemas, `play_action` = False for all four; a sweep of every `pbp_20*.parquet` found it nowhere.
- Column availability: season, week, game_id, play_id, pass_attempt, complete_pass, roof, temp, wind — yes; `play_action` — NO.
- Searched the snapshot for `ftn_charting`: not present. `/tmp/nfl` does not exist on this VM.
- No invented proxy (e.g., guessing play-action from down/distance/formation would be fabrication — explicitly out of scope).
