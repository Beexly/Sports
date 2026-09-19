# Column contract — ordering comparison + books Mondrian export

**Feature:** stats-books-ordering-denominator  
**Branch:** stats/books-ordering-2026-09-18  
**Pre-reg:** docs/ops/stats-lane/PRE-REG-ordering-comparison (prior) + spec S2.3

Founder/ops: pull **one row per pick**. JSONL preferred (one JSON object per line) or CSV with the same headers.

---

## Drop paths

1. Ordering sample P / books export:  
   `docs/ops/stats-lane/incoming/board-export.jsonl`  
   (worktree: `C:\Users\Garrett\Sports\.worktrees\stats-books-ordering-2026-09-18\docs\ops\stats-lane\incoming\board-export.jsonl`  
   or main: `C:\Users\Garrett\Sports\docs\ops\stats-lane\incoming\board-export.jsonl`)

2. Optional scripts already in repo:  
   `scripts/export-settled-picks-for-calibration.mjs`  
   (requires `DATABASE_URL` — founder/ops runs it; agents do not invent credentials.)

---

## Required columns

| Column | Type | Notes |
|---|---|---|
| `pickId` | string | Primary key |
| `gameId` | string | Join / dedupe |
| `sport` | string | e.g. NFL, MLB, NCAAF, MLS |
| `pickType` | string | MONEYLINE \| SPREAD \| TOTAL (exact engine strings) |
| `selection` | string | Chosen side / total |
| `line` | number\|null | Spread/total line |
| `result` | string | WIN \| LOSS \| PUSH \| VOID |
| `modelVersion` | string | e.g. v5.2.7 |
| `generatedAt` | ISO-8601 | Publish/generate clock |
| `commenceTime` | ISO-8601 | Game start (pre-game filter) |
| `confidence` | number | Edge Index 0–100 (always present on engine rows) |
| `rankingP` | number\|null | (0,1); null when absent |
| `rankingSource` | string\|null | `confidence` \| `independent_trueProb` \| `blend_indep_conf` \| null |
| `marketFairProb` | number\|null | (0,1); publish-time market de-vig preferred |
| `bookmakerCount` | integer | **Required for books Mondrian** — 0 / 1–2 / 3–9 / 10+ |
| `isBootstrap` | boolean | Must be false for analysis file (or include and we filter) |
| `isPublished` | boolean | Prefer true only |
| `isFounder` | boolean | Prefer false only |

### Optional (helps controls; not required to start)

| Column | Why |
|---|---|
| `independentTrueProb` | Independent model P when present |
| `marketFairShinProb` | Shin vs proportional sensitivity |
| `settledAt` | Settlement lag / contamination checks |
| `tier`, `pickGrade`, `riskLevel` | Composition controls |
| `dataFreshnessAt` | Odds staleness |
| `game.startTime` | Alternate kickoff if `commenceTime` missing |
| `game.homeTeamName`, `game.awayTeamName` | NCAAF 0-book ground-truth join |
| `espnEventId` / external game id | Ground-truth re-grade (C-150) |
| `slateKey` / signal-slate marker | Separate model-signal lane |
| `factorBreakdown.rankingP` | If top-level `rankingP` not denormalized |

---

## Filters we apply in-lane (you may pre-filter)

**Sample P — ordering duel**

- `isPublished=true`, `isBootstrap=false`, `isFounder=false`
- `result ∈ {WIN, LOSS}`
- `generatedAt < commenceTime` (pre-game)
- `modelVersion ∈ {v5.2.2, v5.2.3, v5.2.4, v5.2.5, v5.2.6, v5.2.7}`
- finite `confidence` **and** finite `rankingP` **and** finite `marketFairProb`
- Stratify: MONEYLINE / SPREAD / TOTAL (do not pool for the winner call)

**Books Mondrian**

- Same pre-game decided published non-bootstrap filter
- `bookmakerCount` non-null (null → `UNKNOWN` bucket, not mixed into 0)
- Buckets: `0`, `1-2`, `3-9`, `10+`
- Residual primary: `|y − marketFairProb|`; diagnostic: `|y − confidence/100|`

**NCAAF ML 0-book test**

- `sport=NCAAF`, `pickType=MONEYLINE`, `bookmakerCount=0`
- decided, pre-game, non-bootstrap
- Plus optional public closing ML price column when you have it:  
  `publicMlImpliedProb` (0,1) or `publicMlAmerican` (odds)

---

## Minimum viable pull (if time-constrained)

If you can only supply one file quickly, **priority order:**

1. All columns in **Required** for settled published non-bootstrap rows with `bookmakerCount` and `marketFairProb` (books + denominator cells).  
2. Then add `rankingP` + `rankingSource` for `modelVersion >= v5.2.2` (ordering sample P).  
3. Then NCAAF ML extras: team names + any public ML price + event id.

Even **without rankingP**, books Mondrian + denominator cell standardization can run.

---

## What we will output when the file lands

| Artifact | Content |
|---|---|
| `mondrian-books-*.json` | Buckets 0/1–2/3–9/10+: n, hit, q̂, coverage own vs pooled, coupling verdict |
| `denominator-cells-*.json` | Hit by sport × pickType × books; R vs B standardization if both present |
| `ordering-duel-*.json` | O1 confidence / O2 rankingP / O3 marketFairProb / O4 dumb — intervals per ordering, stratified |
| `ncaaf-ml-0book-test-*.json` | Kill-line evaluation vs H_artifact / H_edge |

---

## Explicit non-asks

- Do **not** send DATABASE_URL in chat.
- Do **not** fabricate `rankingP` or `bookmakerCount`.
- Signal-slate rows with `bookmakerCount=0` are welcome **as their own stratum**, not as a silent blend.
