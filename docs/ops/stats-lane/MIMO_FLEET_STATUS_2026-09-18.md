# MIMO fleet status — Statistics & Conformal Math
**Agent:** Mimo · **Lane:** agent-bus/sports · **Date:** 2026-09-18/19  
**Worktree:** `C:\Users\Garrett\Sports\.worktrees\stats-books-ordering-2026-09-18`  
**Branch:** `stats/books-ordering-2026-09-18` · head `9fd118e30`

---

## Plan artifact (observed)

| Item | Status |
|---|---|
| `autonomous_agent_fleet_domination_plan.md` | **FOUND** at `C:\Users\Garrett\.gemini\antigravity-cli\brain\559f8edf-9418-487c-817b-e1c66d332873\` — **not** in Sports tree, **not** on agent-bus as a repo file |
| Claim: “Mimo unblocked via board-export.jsonl” | **FALSE tonight** |

---

## Unblock check (law 4 — observed, not assumed)

| Path | Exists? |
|---|---|
| `.worktrees/stats-books-ordering-2026-09-18/docs/ops/stats-lane/incoming/board-export.jsonl` | **NO** |
| `Sports/docs/ops/stats-lane/incoming/board-export.jsonl` | **NO** |
| `Sports/scripts/ops/board-export.ts` | **NO** (plan snippet only; not in repo) |
| incoming dir contents | fixture-schema-selftest.jsonl + receipts-as-jsonl.jsonl only |

**MIMO-1 (books Mondrian on real bookmakerCount):** **DATA_BLOCKED** — runner ready; receipts have no books field.  
**MIMO-2 (ordering duel sample P):** **DATA_BLOCKED** — `ordering_duel.py` ready; needs rankingP+marketFairProb+confidence on same pre-game rows.  
**MIMO-3 (Jackknife+ margin calibration):** **DATA_BLOCKED** — runner `jackknife_plus_margins.py` **shipped this turn**; needs `actualMargin` or scores + prediction. **Plan’s `board-export.ts` snippet does not export margin columns** — even after Gemini runs it as written, MIMO-3 stays blocked.

---

## What Mimo has delivered (ready to fire)

| Artifact | Purpose |
|---|---|
| `docs/ops/stats-lane/books_mondrian.py` | Buckets 0 / 1–2 / 3–9 / 10+; strict q̂; coupling verdict vs hit-rate inversion |
| `docs/ops/stats-lane/ordering_duel.py` | O1 conf / O2 rankingP / O3 mfp / O4 dumb; stratified pickType; interval-overlap rule |
| `docs/ops/stats-lane/jackknife_plus_margins.py` | **NEW** Jackknife+ LOO margin sets, sport Mondrian, dumb split-conformal duel, kill line |
| `docs/ops/stats-lane/ORDERING_AND_BOOKS_COLUMNS.md` | Exact export contract |
| `docs/ops/stats-lane/NCAAF_ML_ZERO_BOOK_TEST_2026-09-18.md` | K1–K5 kill lines; plan preserves zero-book quarantine |
| `docs/ops/stats-lane/DENOMINATOR_DIAGNOSIS_2026-09-18.md` | Published denominator = B_pre eligibility-clean + L10 counts |
| Compose spec + commits | `b284848c4`, `9fd118e30` |

**Jackknife+ kill line (pre-registered):** *J+ OOT coverage may not fall >3pp below split-conformal OOT unless width improves ≥10%; else kill J+ preference.*

**Note for Opus/Grok:** Repo already has jackknife **SE for BCa** (`performance-ci.ts`) — that is **not** Jackknife+ prediction sets. Bus traffic referencing “jackknife+ landed” may mean BCa; do not treat as MIMO-3 complete.

---

## Required export additions (for Gemini / founder)

Plan snippet is good for MIMO-1/2 **if** `bookmakerCount` / `rankingP` / `marketFairProb` resolve from factorBreakdown. **Add for MIMO-3:**

```
actualMargin | homeScore, awayScore
predictedMeanMargin   # engine point margin if stored
line + pickType + marginKind  # SPREAD → home margin convention documented
game.homeTeamName, game.awayTeamName, espnEventId  # NCAAF K1/K3
```

Drop path: `docs/ops/stats-lane/incoming/board-export.jsonl` (worktree or main ops).

---

## Commands when file lands

```bash
python docs/ops/stats-lane/books_mondrian.py \
  --input docs/ops/stats-lane/incoming/board-export.jsonl \
  --out docs/ops/stats-lane/out/mondrian-books-export.json

python docs/ops/stats-lane/ordering_duel.py \
  --input docs/ops/stats-lane/incoming/board-export.jsonl \
  --out docs/ops/stats-lane/out/ordering-duel-export.json

python docs/ops/stats-lane/jackknife_plus_margins.py \
  --input docs/ops/stats-lane/incoming/board-export.jsonl \
  --out docs/ops/stats-lane/out/jackknife-plus-margins.json
```

---

## Standing constraints (non-negotiable)

1. Law 7 — agents do not invent `DATABASE_URL` or write the DB.  
2. Law 4 — no claim without observed command output.  
3. Law 10 / L10 — any published rate carries n + population + exclusion counts.  
4. K1–K5 zero-book quarantine — plan WARNING agrees; 0-book NCAAF ML stays unpriced lane until public implied p.  
5. Mondrian/J+ **partition residuals; they do not fix inverted confidence.**  
6. No push unless founder session explicitly authorizes.

---

## Mimo asks of the fleet

| Agent | Ask |
|---|---|
| **Gemini** | Land real `scripts/ops/board-export.ts` (not brain-only snippet) **or** emit JSONL via ops path; **include margin columns**; write to incoming path |
| **Opus** | Do not mark MIMO-1/2/3 done until `out/*.json` exist from the export; claim MIMO tasks on bus with DATA_BLOCKED status until then |
| **Founder** | Run export with production read credentials if agents cannot; confirm push policy for `stats/books-ordering-2026-09-18` |
