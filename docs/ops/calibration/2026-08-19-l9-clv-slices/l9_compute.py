#!/usr/bin/env python3
"""
L-9: CLV verdict slices computed from local L-7 artifacts.
Computes the 3 locally-derivable items + marks 2 as BLOCKED.
Saves to docs/ops/calibration/2026-08-19-l9-clv-slices/
"""
import json
import math
import os
from collections import defaultdict

# Load artifacts
with open('C:/Users/Garrett/Sports/docs/calibration-proposals/2026-08-19-clv-forensics/raw.json') as f:
    raw = json.load(f)

with open('C:/Users/Garrett/Sports/docs/calibration-proposals/2026-08-19-clv-forensics/ml-and-books.json') as f:
    ml = json.load(f)

with open('C:/Users/Garrett/Sports/docs/calibration-proposals/2026-08-19-clv-forensics/per-book.json') as f:
    per_book = json.load(f)

BASE = 'C:/Users/Garrett/Sports'

def wilson_ci(beat, total, z=1.96):
    if total == 0:
        return 0.0, 0.0, 0.0
    n = total
    phat = beat / n
    denom = 1 + z*z/n
    center = (phat + z*z/(2*n)) / denom
    margin = z * math.sqrt((phat*(1-phat) + z*z/(4*n)) / n) / denom
    lower = max(0, center - margin)
    upper = min(1, center + margin)
    return phat, lower, upper

# ============================================================
# 1. Decided-only beat rates per market x month
# ============================================================
results_1 = {"market_x_month": []}

for month_data in raw['by_month']:
    month = month_data['month']
    for market, stats in month_data['by_type'].items():
        n_decided = stats['beat'] + stats['lost']
        beat = stats['beat']
        lost = stats['lost']
        matched = stats['matched']
        rate, ci_low, ci_high = wilson_ci(beat, n_decided)
        results_1["market_x_month"].append({
            "month": month,
            "market": market,
            "n_total": stats['n'],
            "n_decided": n_decided,
            "n_matched": matched,
            "beat": beat,
            "lost": lost,
            "beat_rate_decided": round(rate, 4),
            "ci_lower": round(ci_low, 4),
            "ci_upper": round(ci_high, 4),
        })

results_1["sport_limitation_note"] = "Sport-level aggregation requires DB join; by_month has no sport dimension. Spot check has n=10 (insufficient for per-sport inference)."

# ============================================================
# 2. TOTAL deep-dive
# ============================================================
results_2 = {}
total_beat = 73 + 103
total_lost = 45 + 80
total_matched = 36 + 44
total_decided = total_beat + total_lost
rate, ci_low, ci_high = wilson_ci(total_beat, total_decided)

results_2["total_decided"] = {
    "beat": total_beat,
    "lost": total_lost,
    "matched": total_matched,
    "n_decided": total_decided,
    "beat_rate": round(rate, 4),
    "ci_lower": round(ci_low, 4),
    "ci_upper": round(ci_high, 4),
    "clears_524_threshold": rate > 0.524
}

# Close-lock values from spot_check TOTAL rows
total_spot = [r for r in raw['spot_check'] if r['pick_type'] == 'TOTAL']
results_2["total_spot_check_rows"] = []
for r in total_spot:
    lock = r.get('lock_price') or r.get('lock_line')
    close = r.get('close_price') or r.get('close_line')
    if lock is not None and close is not None:
        results_2["total_spot_check_rows"].append({
            "pick_id": r['pick_id'],
            "sport": r['sport'],
            "selection": r['selection'],
            "lock": lock,
            "close": close,
            "close_minus_lock": close - lock,
            "verdict": r['stored_verdict']
        })
results_2["total_spot_check_note"] = "Only 3 TOTAL picks in 10-row spot check. Full close-lock distribution requires the 301 decided TOTAL picks from the DB."

# ============================================================
# 3. Pub-vs-lock sign-flip classification
# ============================================================
sm = raw['spread_movement']
sign_flips = []
for r in raw['spot_check']:
    if r['pick_type'] == 'SPREAD':
        lock_line = r.get('lock_line')
        close_line = r.get('close_line')
        if lock_line is not None and close_line is not None and lock_line * close_line < 0:
            sign_flips.append({
                'pick_id': r['pick_id'],
                'sport': r['sport'],
                'selection': r['selection'],
                'derived_side': r['derived_side'],
                'published_line': r.get('published_line'),
                'lock_line': lock_line,
                'close_line': close_line,
                'verdict': 'SIGN_FLIP' if abs(lock_line) != abs(close_line) else 'CHECK'
            })

results_3 = {
    "total_spread": 388,
    "sign_flips": 57,
    "toward_our_side": sm['toward_our_side'],
    "away_from_our_side": sm['away_from_our_side'],
    "unchanged": sm['unchanged'],
    "spot_check_sign_flips": sign_flips
}

# ============================================================
# Blocked items
# ============================================================
blocked_lock = {
    "item": "Lock provenance audit (30 samples x 3 markets)",
    "reason": "Requires JOIN of picks.lock_price/lock_line against odds_batch rows nearest generated_at. Local artifacts do not contain full odds_batch data.",
    "required_query": """SELECT p.pick_id, p.pick_type, p.sport, p.lock_line, p.lock_price, p.published_line,
       ob.spread AS batch_spread, ob.total AS batch_total, ob.home_price, ob.away_price,
       ob.fetched_at,
       CASE 
         WHEN ob.spread = p.lock_line THEN 'SINGLE_BOOK'
         WHEN ABS(ob.spread - AVG(ob2.spread) OVER w) < 0.01 THEN 'BATCH_MEAN'
         ELSE 'MODEL_DERIVED'
       END AS classification
FROM picks p
JOIN odds_batch ob ON ob.game_id = p.game_id 
  AND ob.market = CASE p.pick_type WHEN 'SPREAD' THEN 'SPREADS' WHEN 'TOTAL' THEN 'TOTALS' ELSE 'H2H' END
  AND ob.fetched_at <= p.generated_at
LEFT JOIN LATERAL (
  SELECT ob2.spread FROM odds_batch ob2 
  WHERE ob2.game_id = p.game_id AND ob2.market = ob.market AND ob2.fetched_at = ob.fetched_at
) ob2 ON true
WHERE p.graded_verdict IN ('BEAT_CLOSE', 'LOST_TO_CLOSE')
  AND p.clv_captured_at IS NOT NULL
  AND p.graded_at >= '2026-06-01' AND p.graded_at < '2026-08-01'
WINDOW w AS (PARTITION BY ob.game_id, ob.market)
ORDER BY p.pick_type, p.sport, p.graded_at
LIMIT 30;""",
    "partial_evidence": "per_book_at_captured_at: 909 graded picks, 0 have odds at clv_captured_at. All 909 lock prices fail to find a batch match."
}

blocked_ml = {
    "item": "ML monster-lock provenance (59 locks < -1000)",
    "reason": "Requires JOIN of picks.lock_price against odds_batch.home_price for ML picks. Local artifacts (ml-and-books.json) have lock/close pairs but no odds_batch data to verify.",
    "required_query": """SELECT p.pick_id, p.selection, p.lock_price, p.published_line, p.close_price,
       ob.home_price AS batch_home_price, ob.away_price AS batch_away_price,
       ob.fetched_at, ob.book
FROM picks p
JOIN odds_batch ob ON ob.game_id = p.game_id 
  AND ob.market = 'H2H'
  AND ABS(ob.home_price - p.lock_price) < 1
WHERE p.pick_type = 'MONEYLINE' AND p.lock_price < -1000
ORDER BY p.lock_price;""",
    "partial_evidence": "59/140 ML locks < -1000. All 140 closes in [-500, 500]. Lock_min=-21200, lock_max=105. 1 lock at +105 (impossible for ML favorite). If no odds_batch row matches any of the 59 < -1000 locks, -27.4pp ML mean CLV is entirely an artifact."
}

# ============================================================
# Assemble and save
# ============================================================
output = {
    "analysis_date": "2026-08-19",
    "source": "docs/calibration-proposals/2026-08-19-clv-forensics/{raw.json, ml-and-books.json, per-book.json}",
    "graded_n": raw['graded_n'],
    "spot_check_verified": "10/10, 0 mismatches",
    "decided_only_beat_rates_market_x_month": results_1,
    "total_deep_dive": results_2,
    "sign_flip_classification": results_3,
    "blocked_items": {
        "lock_provenance_audit": blocked_lock,
        "ml_monster_lock_provenance": blocked_ml
    }
}

out_dir = os.path.join(BASE, 'docs', 'ops', 'calibration', '2026-08-19-l9-clv-slices')
os.makedirs(out_dir, exist_ok=True)

with open(os.path.join(out_dir, 'clv-slices.json'), 'w') as f:
    json.dump(output, f, indent=2)

# Also write a RESULTS.md
results_md = f"""# L-9 CLV Slices — Results

**Date:** 2026-08-19  
**Source:** Local L-7 artifacts (`raw.json`, `ml-and-books.json`, `per-book.json`)  
**Graded picks:** {raw['graded_n']}  
**Spot-check verification:** 10/10, 0 mismatches

## 1. Decided-only beat rates per market × month (Wilson 95% CI)

| Month | Market | Decided | Beat Rate | 95% CI |
|-------|--------|---------|-----------|--------|
"""

for row in results_1["market_x_month"]:
    results_md += f"| {row['month']} | {row['market']} | {row['beat']}/{row['n_decided']} | {row['beat_rate_decided']*100:.1f}% | [{row['ci_lower']*100:.1f}%, {row['ci_upper']*100:.1f}%] |\n"

results_md += f"""
**Sport breakdown:** NOT available from local artifacts. The `by_month` aggregation
groups by market × month only (no sport dimension). Spot-check has n=10 (insufficient).
Sport-level decomposition requires DB JOIN against the `picks` table.

## 2. TOTAL deep-dive

- **Decided-only beat rate:** {total_beat}/{total_decided} = **{rate*100:.1f}%**
- **Wilson 95% CI:** [{ci_low*100:.1f}%, {ci_high*100:.1f}%]
- **Clears 52.4% threshold:** {'YES' if rate > 0.524 else 'NO'}
- This is the only market whose decided-only beat clears 52.4%.

**Close−lock distribution (from spot_check, n=3 — NOT representative):**
"""

for row in results_2["total_spot_check_rows"]:
    results_md += f"  - pick_id={row['pick_id'][:12]}... sport={row['sport']} selection={row['selection']}: lock={row['lock']}, close={row['close']}, delta={row['close_minus_lock']:.4f}, verdict={row['verdict']}\n"

results_md += f"""
Full close-lock distribution for all 176 decided TOTAL picks requires DB access
to the `picks` table. The 10-row spot check is insufficient for distribution analysis.

## 3. Pub-vs-lock sign-flip classification (57/388 SPREAD)

- **Total SPREAD picks:** 388
- **Sign flips:** 57 (14.7%)
- **Movement:** toward our side={sm['toward_our_side']}, away={sm['away_from_our_side']}, unchanged={sm['unchanged']}
- **Beat rate (toward/away):** {sm['toward_our_side']}/{sm['toward_our_side']+sm['away_from_our_side']} = {sm['toward_our_side']/(sm['toward_our_side']+sm['away_from_our_side']):.1%}

**Classification method:** Lock line and close line with opposite signs = potential sign flip.
If |lock| == |close|, it's likely the lock is the wrong side's number (artifact).
If |lock| != |close|, the runline genuinely moved through zero (real movement).

**Spot-check sign flips found (3 in 4 SPREAD rows — illustrative only):**
"""

for sf in sign_flips:
    results_md += f"  - pick_id={sf['pick_id'][:12]}... {sf['sport']} {sf['selection']}: published={sf['published_line']}, lock={sf['lock_line']}, close={sf['close_line']}, derived_side={sf['derived_side']}, verdict={sf['verdict']}\n"

results_md += f"""
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
"""

with open(os.path.join(out_dir, 'RESULTS.md'), 'w') as f:
    f.write(results_md)

print(f"Files written:")
print(f"  {os.path.join(out_dir, 'clv-slices.json')}")
print(f"  {os.path.join(out_dir, 'RESULTS.md')}")
print(f"\nKey results:")
print(f"  TOTAL decided-only: {total_beat}/{total_decided} = {rate*100:.1f}% (clears 52.4%: {'YES' if rate > 0.524 else 'NO'})")
print(f"  SPREAD sign flips: 57/388 ({57/388*100:.1f}%)")
print(f"  ML locks < -1000: 59/140 (blocked - needs DB)")
print(f"  Lock provenance: 0/909 match odds batches at clv_captured_at (partial evidence)")
