# MIMO — missed items → next steps → strengths
**Worktree:** `stats/books-ordering-2026-09-18` · **Date:** 2026-09-19

---

## 1. Weak spots found tonight (and what we did)

| Weak spot | Why it hurts | Fix → strength |
|---|---|---|
| `json.dumps(Infinity)` → invalid JSON | Fleet/jq/`JSON.parse` break; “infinite q̂” looks like a crash | `stats_json.py` `sanitize` + `allow_nan=False`; flags `qhat_infinite` stay boolean |
| Plan export snippet missing margins / sport key | MIMO-3 unblocked-in-theory, blocked-in-practice | Full `scripts/ops/board-export.mjs` with `actualMargin`, scores, `sport`, `bookmakerCount`, `espnEventId` |
| `export-settled-picks-for-calibration.mjs` game select uses `sportId` not sport key | Downstream Mondrian sport bins become opaque ids | Documented; board-export resolves `sport \|\| sportId` |
| Silent `pre_game or all rows` | Denominator drift without a label | `timing_filter` field: `pre_game_only` vs `FALLBACK_all_rows_…` |
| J+ time-split needs ~128 rows/sport for OOT | Fixture n=80 → INSUFFICIENT after half-split | `min_n_oot_total_per_sport: 128` stated; verdict names the need |
| Four CLI invocations, no suite | Fleet forgets a runner | `run_mimo_suite.py` one command + `out/mimo-suite-summary.json` |
| No NCAAF K1–K5 evaluator | Kill lines sat only in markdown | `ncaaf_zero_book_eval.py` (default **H_artifact** until K1+K4) |
| Plan claimed “Mimo unblocked” without file | False DONE risk on bus | Bus finding + status doc: **DATA_BLOCKED until file exists** |
| `performance-ci` jackknife ≠ Jackknife+ | Wrong MIMO-3 completion claim | Called out on bus; separate runner |
| Mimo not on bus roster | Could not post findings | Added to `sports/agents.json`; posts landed |
| Runners only on worktree | Main-tree agents can’t see them | Copied to `Sports/docs/ops/stats-lane/` (analysis artifacts, not engine code) |
| No unit test for refuse-n<9 | Silent clamp regressions | `stats_lane_selftest.py` pins Inf flags + valid JSON |

---

## 2. Still blocked (named, not “awaiting”)

| Item | Needs |
|---|---|
| MIMO-1 books coupling on **real** books | `board-export.jsonl` with `bookmakerCount` |
| MIMO-2 ordering duel sample P | same file + finite `rankingP` + `marketFairProb` + `confidence` on v5.2.2–v5.2.7 pre-game rows |
| MIMO-3 Jackknife+ OOT | margin columns; **≥128** decided pre-game rows **per sport** for time-split J+ |
| NCAAF K1 | `publicMlImpliedProb` (or lawful closing-price join) |
| NCAAF K3 | ESPN/event-id re-grade |
| Full 3,257-board Mondrian | export ≠ receipts harvest |

**Who runs export:** founder/ops/Gemini with real `DATABASE_URL` — law 7 forbids agents inventing credentials.

---

## 3. Next steps (ordered)

1. **Gemini/founder:** run `node scripts/ops/board-export.mjs --out docs/ops/stats-lane/incoming/board-export.jsonl` (worktree or main). Confirm line count + a sample row has `bookmakerCount` and either `actualMargin` or scores.
2. **Mimo:** `python docs/ops/stats-lane/run_mimo_suite.py` → read `out/mimo-suite-summary.json` + four result JSONs (valid JSON, no Infinity).
3. **Opus:** only then mark MIMO-1/2 (and 3 if margins present) DONE on bus with SHA of out files.
4. **If books buckets still all UNKNOWN:** join path broken — check `pick.bookmakerCount` column vs factorBreakdown.
5. **If J+ INSUFFICIENT:** pool seasons or drop time-split to calendar blocks with **pre-registered** embargo; never shrink min_n below 64.
6. **NCAAF:** attach public ML prices → run `ncaaf_zero_book_eval.py`; publish nothing until K5 copy rule satisfied.
7. **Standing loop (stats):** heteroscedastic CQR on margins once export has them; ACI only on kickoff-ordered stream; OOT coverage monitor per books/sport bin.

---

## 4. Process improvements worth keeping

- **Export contract first** (`ORDERING_AND_BOOKS_COLUMNS.md`) — every agent asks for columns, not “unblock Mimo.”
- **Kill lines in artifacts** — not only chat; suite re-reads them.
- **DATA_BLOCKED as a first-class JSON status** — bus can see blocked vs empty vs ran.
- **Invalid-JSON refuse** — honesty tools must be machine-readable.
- **Separate residual targets** — marketFairProb vs confidence/100 labeled; never call Edge Index a win probability.
- **Denominator doctrine** — B_pre eligibility-clean + L10 counts; never receipts-only public rates.

---

## 5. Commands cheat-sheet

```bash
# Worktree
cd C:\Users\Garrett\Sports\.worktrees\stats-books-ordering-2026-09-18

# Export (founder/ops only — real DATABASE_URL)
node scripts/ops/board-export.mjs --out docs/ops/stats-lane/incoming/board-export.jsonl

# Suite
python docs/ops/stats-lane/run_mimo_suite.py

# Individual
python docs/ops/stats-lane/books_mondrian.py --input docs/ops/stats-lane/incoming/board-export.jsonl --out docs/ops/stats-lane/out/mondrian-books-export.json
python docs/ops/stats-lane/ordering_duel.py --input docs/ops/stats-lane/incoming/board-export.jsonl --out docs/ops/stats-lane/out/ordering-duel-export.json
python docs/ops/stats-lane/jackknife_plus_margins.py --input docs/ops/stats-lane/incoming/board-export.jsonl --out docs/ops/stats-lane/out/jackknife-plus-margins.json
python docs/ops/stats-lane/ncaaf_zero_book_eval.py --input docs/ops/stats-lane/incoming/board-export.jsonl --out docs/ops/stats-lane/out/ncaaf-ml-0book-test.json
```

---

## 6. Do-nots (reinforced)

- Do not invent DB URLs or fabricate bookmakerCount/margins.
- Do not publish blended win rates (ML + spreads/totals) without price context.
- Do not treat 0-book NCAAF ML 87%+ as skill without K1.
- Do not mark MIMO DONE without `out/*.json` from a real export.
- Do not use hierarchical Mondrian fallback for published group-conditional claims.
- Do not push unless founder session authorizes.
