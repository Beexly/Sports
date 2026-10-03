# L-9 CLV Slices — Results

**Date:** 2026-08-19  
**Source:** Local L-7 artifacts (`raw.json`, `ml-and-books.json`, `per-book.json`)  
**Graded picks:** 909  
**Spot-check verification:** 10/10, 0 mismatches

## 1. Decided-only beat rates per market × month (Wilson 95% CI)

| Month | Market | Decided | Beat Rate | 95% CI |
|-------|--------|---------|-----------|--------|
| 2026-06 | SPREAD | 30/49 | 61.2% | [47.2%, 73.6%] |
| 2026-06 | TOTAL | 73/118 | 61.9% | [52.9%, 70.1%] |
| 2026-06 | MONEYLINE | 1/35 | 2.9% | [0.5%, 14.5%] |
| 2026-07 | SPREAD | 10/100 | 10.0% | [5.5%, 17.4%] |
| 2026-07 | TOTAL | 103/183 | 56.3% | [49.0%, 63.3%] |
| 2026-07 | MONEYLINE | 9/100 | 9.0% | [4.8%, 16.2%] |

**Sport breakdown:** NOT available from local artifacts. The `by_month` aggregation
groups by market × month only (no sport dimension). Spot-check has n=10 (insufficient).
Sport-level decomposition requires DB JOIN against the `picks` table.

## 2. TOTAL deep-dive

- **Decided-only beat rate:** 176/301 = **58.5%**
- **Wilson 95% CI:** [52.8%, 63.9%]
- **Clears 52.4% threshold:** YES
- This is the only market whose decided-only beat clears 52.4%.

**Close−lock distribution (from spot_check, n=3 — NOT representative):**
  - pick_id=cmqa3snbu04f... sport=MLB selection=OVER 9.5: lock=8.642857142857142, close=9.454545454545455, delta=0.8117, verdict=BEAT_CLOSE
  - pick_id=cmqa3snae04f... sport=MLB selection=UNDER 8.0: lock=7.9375, close=7.95, delta=0.0125, verdict=LOST_TO_CLOSE
  - pick_id=cmqa9i7s004m... sport=MLB selection=OVER 8.0: lock=8, close=8, delta=0.0000, verdict=MATCHED_CLOSE

Full close-lock distribution for all 176 decided TOTAL picks requires DB access
to the `picks` table. The 10-row spot check is insufficient for distribution analysis.

## 3. Pub-vs-lock sign-flip classification (57/388 SPREAD)

- **Total SPREAD picks:** 388
- **Sign flips:** 57 (14.7%)
- **Movement:** toward our side=40, away=109, unchanged=239
- **Beat rate (toward/away):** 40/149 = 26.8%

**Classification method:** Lock line and close line with opposite signs = potential sign flip.
If |lock| == |close|, it's likely the lock is the wrong side's number (artifact).
If |lock| != |close|, the runline genuinely moved through zero (real movement).

**Spot-check sign flips found (3 in 4 SPREAD rows — illustrative only):**
  - pick_id=cmqa3snde04f... MLB New York Mets -1.5: published=-1.5, lock=1.5, close=-1.5, derived_side=HOME, verdict=CHECK
  - pick_id=cmqbexwko053... MLB Atlanta Braves -1.5: published=1.5, lock=1.5, close=-0.4090909090909091, derived_side=AWAY, verdict=SIGN_FLIP
  - pick_id=cmqa9i80c04n... MLB Cleveland Guardians -1.5: published=-1.5, lock=1.5, close=-1.227272727272727, derived_side=HOME, verdict=SIGN_FLIP

Full classification of all 57 sign flips requires per-pick lock_line and close_line
from the DB. The 10-row spot check found 3 sign flips, all in MLB SPREAD picks.

## BLOCKED items (require DB JOIN against odds_batch)

### 3. Lock provenance audit (30 samples × 3 markets)
Requires JOIN of `picks.lock_price/lock_line` against `odds_batch` rows nearest
`generated_at`. Local artifacts do not contain the full odds_batch table.

**Partial evidence:** `per_book_at_captured_at` shows 909/909 picks have NO odds_batch
rows matching `clv_captured_at`. All lock prices appear model-derived.

**Required query saved in clv-slices.json** as `blocked_items.lock_provenance_audit.required_query`.

### 4. ML monster-lock provenance (59 locks < -1000)
Requires JOIN of `picks.lock_price` against `odds_batch.home_price` for ML picks.

**Partial evidence:** 59/140 ML locks < -1000 (3 < -10000, 56 in -1000..-500).
All 140 close prices are in normal range [-500, 500]. Lock_min=-21200, lock_max=105.
One lock at +105 (impossible for ML favorite — model artifact).
If no odds_batch row matches any of the 59 < -1000 locks, the entire -27.4pp
ML mean CLV is an artifact.

**Required query saved in clv-slices.json** as `blocked_items.ml_monster_lock_provenance.required_query`.
