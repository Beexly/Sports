---
feature: stats-books-ordering-denominator
status: delivered
updated: 2026-09-18
branch: stats/books-ordering-2026-09-18
commits: f67631363..<HEAD>
---

# Stats books / ordering / denominator / NCAAF-0-book

## Report

**What was built** — STATISTICS compose-next package on worktree `stats/books-ordering-2026-09-18`: (1) strict books-bucket Mondrian runner (`docs/ops/stats-lane/books_mondrian.py`) with buckets **0 / 1–2 / 3–9 / 10+**, no borrowing, n<9 → +Inf, plus residual-scale vs hit-rate **coupling verdict** and pickType-stratified q̂ ratios; (2) denominator diagnosis reconciling receipts pre-game **0.4802** vs full board **0.5348** vs C-325 production anchors, naming **B_pre eligibility-clean + L10 strata** as the only published denominator; (3) exact **column contract** for the founder ordering/books pull (`ORDERING_AND_BOOKS_COLUMNS.md`); (4) NCAAF ML 0-book **edge vs artifact** test with **kill lines K1–K5 first** (`NCAAF_ML_ZERO_BOOK_TEST_2026-09-18.md`). Ordering duel runner (`ordering_duel.py`) implements pre-reg O1–O4 stratified by pickType with interval-overlap rule.

**Verification** — `books_mondrian.py` on fixture: ok, coupling computed, hit-by-books populated. On receipts-as-jsonl: n_pre=935 hit=0.4802, books=`UNKNOWN` only, coupling=`INSUFFICIENT_BINS` (expected — no bookmakerCount). `ordering_duel.py` on fixture: all strata `UNDERPOWERED_n<30`. On missing `incoming/board-export.jsonl`: `DATA_BLOCKED`. Real books/ordering measurement **blocked on founder export** (law 7 — no invented DB access).

**Journey log** — Receipts cannot refute/confirm the books prediction; the field must join via settled-picks export. In-sample Mondrian coverage is not a product guarantee; coupling must be read on OOT/stratified tables when export lands. NCAAF high ML hit is H_artifact by default until K1–K4 pass against public implied p. Pooled board win rate refused without market×books×pre-game splits.

## [S1] Problem

STATISTICS lane follow-ups after books prediction was refuted:

1. Re-run Mondrian residual bins with `bookmakerCount` buckets **0 / 1–2 / 3–9 / 10+**. Decide whether residual **scale** tracks hit-rate inversion or is independent.
2. Diagnose receipts pre-game hit **0.4802** vs full published non-bootstrap board **0.5348**. Name the correct denominator for a **published** number.
3. Name **exact columns** for the pre-registered ordering comparison pull (version-fixed pre-game rows with finite confidence, rankingP, marketFairProb).
4. Design (kill line first) the test that separates **real edge** vs **selection artifact** for NCAAF moneyline at `bookmakerCount=0`, hit **0.8716**, n **109**.

Prior receipts snapshot lacks `bookmakerCount`/`rankingP`. Founder can supply the field/export; lane must not invent DB access (law 7).

## [S2] Design

### S2.1 Residual Mondrian — books axis

- Buckets (pre-registered, do not change after seeing data): `0`, `1–2`, `3–9`, `10+`.
- Strict quantile: α=0.10, finite q̂ only if `n ≥ ceil(1/α)−1 = 9`; else `+Inf`, coverage null.
- **No borrowing** across bins (not `MondrianResidualManager` hierarchical fallback).
- Residual A: `|y − marketFairProb|` when finite in (0,1); else row dropped from residual A, counted.
- Residual B (diagnostic): `|y − confidence/100|` — product Edge Index, **not** a win probability claim.
- Report **hit rate**, mean residual, own q̂, pooled-vs-own coverage **per books bucket**, plus sport×books and market×books crosses where n allows.
- **Claim fork (must be answered from the table, not assumed):**
  - **Tracks inversion:** books buckets that show inverted/non-monotone **hit rate** also show systematically wider residual q̂ (or the same fat/lean ordering as hit-rate failure).
  - **Independent:** residual q̂ ordering does **not** match hit-rate ordering after conditioning on market/sport (e.g. 0-book high hit + narrow residuals vs 10+ book low hit + wide residuals, or vice versa).
- Kill line (same line as prediction): *Prediction: residual scale and hit-rate inversion are **partially coupled via market type mix**, not a single books effect — kill “books alone drives residual scale” if after stratifying by pickType the books q̂ range collapses below 1.15× fat/lean ratio.*  
  *Prediction: 0-book rows are **selection** (signal-slate / unpriced favorites), not low-residual skill — kill if 0-book hit remains >10pp above 10+ book **within MONEYLINE only** AND residual q̂ is not wider than 10+.*

### S2.2 Denominator diagnosis (receipts vs full board)

Populations to separate explicitly:

| Tag | Definition |
|---|---|
| R_all | Receipts snapshot 2026-09-08, all scored WIN/LOSS |
| R_pre | R_all ∩ pre-game (`asOf`/`frozenAt` < commenceTime) → **0.4802** cited |
| B_pre | Full published board, non-bootstrap, decided, pre-game (`generatedAt < commenceTime`) — production doctrine (2026-09-14 measurement SQL) |
| B_all | Published non-bootstrap decided **including** in-play → **0.5348** cited |

Known production anchors (observed in repo, not re-queried tonight):

- C-325: pre_game 2,119 graded **52.34%**; in_play 170 graded **73.53%**.
- Placeability: NCAAF ML 102 decided **94.1%**; engine ML fairProb floor **0.58** — high ML win rate ≠ edge.
- Receipts: MLB-heavy (~2/3), API harvest, not full picks table; may omit rows without receipts; frozenAt window Jul–Sep.

**Right denominator for a published number:**  
**B_pre eligibility-clean** — `isPublished`, `isBootstrap=false`, not founder, `result∈{WIN,LOSS}`, `generatedAt < commenceTime`, plus L10 exclusion **counts** rendered on the same surface (in_play, three_way, no_market_p, unverifiable, signal-slate/bookmakerCount=0 if the claim is book-priced performance).  

**Not** receipts-only (biased harvest + sport mix). **Not** B_all mixed in-play (look-ahead inflation). Moneyline win rates **must not** be blended with spread/total without price context (Placeability §5).

### S2.3 Ordering comparison — column contract

Pull file (founder/ops): JSONL or CSV, one row per pick. **Required columns:**

```
pickId, gameId, sport, pickType, selection, line,
result,                    -- WIN|LOSS only in analysis file (or include PUSH/VOID and we filter)
modelVersion,
generatedAt, commenceTime, -- ISO-8601; pre-game filter
confidence,                -- number, 0-100 Edge Index
rankingP,                  -- number in (0,1) or null
rankingSource,             -- confidence | independent_trueProb | blend_indep_conf | null
marketFairProb,            -- number in (0,1) or null; publish-time odds-table order preferred
independentTrueProb,       -- optional
bookmakerCount,            -- integer
isBootstrap, isPublished, isFounder,
tier, pickGrade            -- optional controls
```

Sample P filter (pre-registered): published, non-bootstrap, non-founder, pre-game, `modelVersion∈{v5.2.2…v5.2.7}`, finite `confidence` AND finite `rankingP` AND finite `marketFairProb`.  
**Stratify MONEYLINE / SPREAD / TOTAL** — totals `rankingP` may be confidence-echo (`scoring.ts` totals path).  
Intervals per ordering; overlap ⇒ say overlap. Dumb baseline = time order or seeded shuffle.

Drop path: `docs/ops/stats-lane/incoming/ordering-p-sample.jsonl` (worktree or main ops dir).

### S2.4 NCAAF ML bookmakerCount=0 — test design (kill line first)

**KILL LINES (write first; do not move):**

1. **Artifact — selection/favorites:** *Kill “real edge” if*, after matching each pick to a **public closing (or publish-time) moneyline implied probability** for the same game/side, realized hit rate does **not** exceed mean market-implied p by **≥ +3.0 pp**, **or** the 95% Wilson lower bound on (hit − implied) is **≤ 0**.
2. **Artifact — composition:** *Kill “books-independent skill” if* ≥80% of the 0-book NCAAF ML cohort has `marketFairProb` null **and** mean `confidence/100` ≥ 0.75 **and** the cohort’s hit rate is within 5pp of the hit rate of book-priced NCAAF ML picks restricted to the same confidence band (selection on engine favorites, not private info).
3. **Artifact — grading:** *Kill any edge claim* if >5% of cohort results fail ESPN/event-id ground truth re-grade (C-150 class).
4. **Edge survive:** *Only if* (1) holds with n≥109 decided pre-game non-bootstrap non-signal-slate (or signal-slate reported as a **separate** stratum), **and** (2) fails to explain the gap, **and** (3) ground-truth error ≤5%, **and** the effect **replicates** on a second time window with the same rule.
5. **Denominator honesty:** Published claim must show n, books-bucket, pre-game filter, and “0-book = unpriced model/signal lane” beside any NCAAF ML rate. Blended board win rate **refused**.

**Test procedure:**  
A. Census 0-book NCAAF ML: n, hit, sport mix, modelVersion, signal-slate signature (`selection` model signal, line 0, tier), confidence distribution.  
B. Join public ML prices (ESPN/odds archive / export odds table at generatedAt when books later appear — **absent price ⇒ cannot claim edge vs market**).  
C. Compare to book-priced NCAAF ML same era, same confidence deciles.  
D. Ground-truth re-grade sample.  
E. Report edge vs artifact against kill lines only.

Repo prior (not a substitute for the test): Placeability already argued high NCAAF ML rate is **early-season mismatches + fairProb≥0.58 favorite selection**, not skill — that is hypothesis **H_artifact**; the kill-line test is what can promote **H_edge**.

## [S3] Out of Scope

- No schema/migration/guardrail/env/MODEL_VERSION changes.
- No `git push` unless founder session explicitly asks.
- No CLV-as-edge-label; no isotonic on confidence; no fabricating bookmakerCount.
- Full production Mondrian **NOT CLAIM RUN** until incoming export exists on disk.
- ACI kickoff-stream still blocked (named); not this feature’s acceptance.

## Tasks

- [x] T1: Worktree + feature doc — acceptance: worktree on `stats/books-ordering-2026-09-18`, spec path `docs/compose/spec/stats-books-ordering-denominator.md` (covers: process)
- [x] T2: Books Mondrian runner + bucket contract — acceptance: script runs on incoming export schema; buckets 0/1–2/3–9/10+; Inf if n<9; JSON report path stable (covers: S2.1)
- [x] T3: Denominator diagnosis note — acceptance: R_pre vs B_pre vs B_all table with cited anchors; published-number rule stated (covers: S2.2)
- [x] T4: Ordering column contract file — acceptance: exact columns + sample P filter + drop path named (covers: S2.3)
- [x] T5: NCAAF-0-book test design — acceptance: kill lines first in the artifact; procedure A–E; H_edge vs H_artifact (covers: S2.4)
- [ ] T6: If incoming export present, run books Mondrian + residual-vs-hit coupling verdict — acceptance: JSON + one-line claim fork answer; else status DATA_BLOCKED named path (covers: S2.1) — **DATA_BLOCKED** `incoming/board-export.jsonl`
- [ ] T7: If ordering sample present, run pre-registered duel stratified by pickType — acceptance: intervals per ordering; overlap stated as overlap; else DATA_BLOCKED (covers: S2.3) — **DATA_BLOCKED** same path
