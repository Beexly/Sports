# MIMO mission report — K3 re-grade · NFL Jackknife+ · standing OOT
**Agent:** Mimo · **Worktree:** `stats/books-ordering-2026-09-18`  
**Date:** 2026-09-19 · **Source export:** `board-export.jsonl` (3,261 rows; 2,380 pre-game decided)

---

## 1. NCAAF 0-book K3 — ESPN public re-grade (C-150 protocol)

**Method:** Node `fetch` to `site.api.espn.com` college-football `summary?event=` (Python/curl from this host get **403**; Node works). Match `selection` team to ESPN competitor; grade from `winner` flag / scores. **Do not invent outcomes.** Unresolved ids are **NOT RUN**, not agrees.

| Quantity | Observed |
|---|---:|
| Cohort (NCAAF ML, bookmakerCount=0, decided) | **109** |
| id kinds | espn:ncaaf **42** · espn:other **22** · hex32 **45** |
| Checkable (fetchable ESPN event id) | **64** |
| Agree with stored result | **64** |
| Disagree | **0** |
| Unresolved (hex32, no ESPN id) | **45** |
| Unresolved rate | 41.3% of cohort |
| Graded WIN / LOSS on checkable | 53 / 11 |
| **Verified hit (checkable only)** | **0.8281** (53/64) |
| Stored hit (all 109) | **0.8716** |
| **K3 disagreement rate** | **0.0%** |
| **K3 result** | **PASSES** (≤5% disagreement) |

**Example agreement (observed):** stored WIN “Pittsburgh Panthers ML (model signal)” → ESPN Pitt 27 – Syracuse 13.

### Interpretation (separate obs / inf / spec)

- **OBSERVATION:** On the 64 rows with real ESPN event ids, stored settlement **matches** independent ESPN finals in **100%** of cases. Verified hit **82.8%** on that subset.
- **INFERENCE:** K3 does **not** kill the cohort for **grading corruption** on the checkable subset. Stored 87.2% vs verified 82.8% on a subset is consistent with hex32 rows being a different mix — **not** proof that the full 109 is clean.
- **INFERENCE:** K3 **pass ≠ H_edge**. Cohort remains **100% signal-slate**, **100% null marketFairProb**, mean conf ~77 — **K2 selection signature still PRESENT**.
- **K1:** **NOT RUN** — `publicMlImpliedProb` absent on export. Mission follow-up (“if verified hit >75% unlock K1 via closing proxy”) **cannot fire without a price column**. Needed: lawful close/open ML or consensus implied p per gameId at/near publish.
- **Default verdict unchanged:** **H_artifact** until **K1 + K4** pass. Do **not** publish 87% (or 83%) as skill.

**Named data for next K1 attempt:** `publicMlImpliedProb` or archived odds at `generatedAt` for the same NCAAF ML sides; espn ids for the 45 hex32 rows (or team-name ↔ ESPN crosswalk).

---

## 2. NFL Jackknife+ on nflverse schedules

**Mission claim:** 14,251 games (1999–2025), 5 walk-forward folds; J+ must **strictly beat** split-conformal coverage **without** width blow-up >10%.

**OBSERVED corpus:**

| Path | n rows with scores+spread |
|---|---:|
| `C:\Users\Garrett\nfl_ot\games.csv` | **7,276** |
| Downloaded `nflverse-data` `schedules/games.csv` (CC BY 4.0) | **7,293** |

**Gap vs mission:** −6,958 vs claimed 14,251 (**not** the full historical nflverse schedules archive on this host / release asset). Report uses **observed n**, not the claimed 14k.

**Convention (pre-registered in script):** predicted home margin = `−spread_line`; actual = `home_score − away_score`.

**Walk-forward (5 temporal folds), n≈7,293:**

| Metric | Jackknife+ | Split conformal |
|---|---:|---:|
| Mean OOT coverage | **0.814** | **0.902** |
| Mean interval width | narrower | baseline |
| Width ratio J+ / split | **0.80** | 1.00 |

| Mission rule | Result |
|---|---|
| J+ coverage **>** split AND width ≤ 1.10× split | **FAIL** |
| Verdict | **MISSION_FAIL_or_width_blowup** → specifically **J+ undercovers** (0.81 vs 0.90) while being **narrower** (0.80×) |

**INFERENCE:** On this market-anchored NFL home-margin residual, **Jackknife+ does not beat split-conformal** at α=0.10 under walk-forward. Prefer **split-conformal (or Mondrian split)** for NFL margin sets until a different centering model is justified. **Preserve this negative result** — it is not a reason to relax min_n or swap the label.

**Kill line honored:** do not report J+ as superior; widths did **not** blow up — coverage did.

---

## 3. Standing OOT coverage monitor

**Shipped:** `docs/ops/stats-lane/standing_oot_monitor.py`  
**Ran on** `board-export.jsonl` → `docs/ops/stats-lane/out/standing-coverage.json`

| | |
|---|---|
| n pre-game decided | 2,380 |
| Axes | `bookmakerCount` bucket · `books × pickType` |
| Residual | \|y − marketFairProb\| |
| **Alerts** | **6** (UNDER_POOL or OOT own coverage &lt; 0.85) |

Alerts flag fat/thin cells where **pooled** residual q̂ mis-covers vs **own-bin** q̂, or OOT own coverage &lt; 0.85 — same defect family as Mondrian pooling. Rerun on every new export; action = widen / infinite / retire stale q̂, never silent clamp.

---

## 4. Standing constraints (unchanged)

- Law 4: every number above is from a command run this turn.
- Law 7: no DB writes; no invented `DATABASE_URL`; ESPN public only.
- Law 8: no fabricated grades; 45 hex32 = **UNRESOLVED_ID**.
- L10: any published rate needs n + population + exclusions.
- K1–K5: 0-book NCAAF stays **unpriced lane**; default **H_artifact**.
- Mondrian/J+ **do not fix inverted ranking scores**.

---

## 5. Bus / next actions

1. **Post finding** to `agent-bus` (opus + all): K3 pass on 64/64 checkable; verified hit 82.8%; H_artifact default; NFL J+ **fails** vs split (0.81 vs 0.90); standing monitor 6 alerts; nflverse n=7,293 not 14,251.
2. **Gemini/founder export v2:** add `publicMlImpliedProb`, resolve sport keys, ESPN ids for hex32 rows, optional settled-only filter.
3. **K1** only after price join exists.
4. **Do not** mark NFL Jackknife+ “done superior” — negative result stands.
5. Rerun `standing_oot_monitor.py` when new settles land.

**Artifacts:**  
`out/ncaaf-k3-regrade.json` · `out/nfl-jackknife-nflverse.json` · `out/standing-coverage.json` ·  
`ncaaf_k3_espn_regrade.mjs` · `nfl_jackknife_corpus.py` · `standing_oot_monitor.py`
