# Research loop — find solutions, replace, optimize, test, improve
**Mimo stats lane · worktree `stats-books-ordering-2026-09-18` · 2026-09-19**

Corpus extracted to `docs/ops/stats-lane/research-corpus/` (Downloads audits, CQR/conformal, 10Hz, dossiers).

---

## 1. What we were wrong about (research → correction)

| Claim we made | Research says | Correction (not deletion) |
|---|---|---|
| NFL J+ “MISSION_FAIL” vs split 0.90 | Barber et al.: **J+ guarantee is 1−2α** (0.80 at α=0.10) | Dual-report floors. Observed J+ **0.814 ≥ 0.80** → **meets theorem**, narrower (0.80×). Split remains better for **1−α** product bands. |
| “Promote J+ as primary NFL margin engine” after first fail | Blueprint: J+ for **scarce** samples; split CQR for **n>200** | **Role split:** NFL thin H2H → J+ @ **1−2α label**; large margin sets → **split CQR @ 1−α** with fail-closed n. |
| cqr.ts “fine enough” | Founder HEARSAY + code: **rank clamped to n−1** = fake tightness (n=5 → 83.33% labeled 90%) | **Replace clamp with +Inf** + `qhatInfinite` + fail-closed intervals; **rewrite tests** to pin refusal. Same for `conformal-calibration.ts` `conformalQuantile`. |
| MarketFairProb Brier as sole margin metric | Blueprint: **CRPS** for continuous margins; Brier for binary only | Add `crps_gaussian_margin.py` baseline; kill line CRPS_density < CRPS_base − 0.01 on n≥150. |
| 10Hz tracking as near-term feature source | Blueprint + research audit: **legal/cost dead end** (BDB CC BY-NC; enterprise 10Hz $$$$$) | **Replace:** offline-only validation; production on **nflverse** + market microstructure (Shin, line archive) — matches our DATA_BLOCKED 10Hz path. |
| Global calibrator across sports | Literature: **σ_game sport-specific** | Keep Mondrian **per sport/market**; never pool MLB+NFL residual q̂ for product claims. |

---

## 2. Defects found in-repo (fix → replace → test)

### D1 — CQR / split quantile clamp (CRITICAL)
**Where:** `apps/web/lib/calibration/cqr.ts` (was `rank = min(max(...), n-1)`); `conformal-calibration.ts` same pattern. Tests **expected** the clamp.  
**Evidence:** Conformal audit §Clamp; n=5, α=0.1 → k=6>5 → true coverage 5/6≈83.33% if clamped.  
**Replacement (shipped this pass):** fail-closed `+Infinity` when `k>n`; `cqrInterval` returns infinite lo/hi + status `fail_closed_insufficient_n`; `jackknifePlusTheoremCoverage()` exported.  
**Tests:** `cqr.test.ts` rewritten — n=5 Inf; n=9 finite; n=500 rank 451; fail-closed interval; J+ floor 0.80.  
**Optimize next:** audit every `conformalQuantile` / `mondrian` call site for clamps; unit-test `n=ceil(1/α)−1` boundary.

### D2 — Jackknife+ mislabeling (CRITICAL honesty)
**Where:** `nfl_jackknife_corpus.py` mission verdict.  
**Replacement:** dual floors `1−2α` vs `1−α`; corrected mission string when J+ ≥ 0.80.  
**Test:** re-run on nflverse games.csv; bus correction to Opus.

### D3 — Brier on continuous margins (method error)
**Replacement:** CRPS closed-form helper + baseline report on board-export margins when present.  
**Kill line:** density must beat widened-Gaussian CRPS by ≥0.01 (n≥150) or stay baseline-only.

### D4 — Export sport keys are CUIDs
**Already fixed:** `sport_resolve.py` via ESPN id. **Optimize:** board-export.mjs should join sport table so fleet doesn’t need resolver.

### D5 — K1 blocked (no public ML price)
**Not a deletion:** add `publicMlImpliedProb` to export; optional join from line archive / ESPN. Until then K1 NOT_RUN; H_artifact stands.

### D6 — Hex32 ESPN ids (45/109 NCAAF)
**Replacement:** id crosswalk table (team name + date → ESPN event id); don’t drop rows silently — keep UNRESOLVED_ID.

### D7 — Pooling ECE / residual q̂
**Already measured** (books coupling + standing monitor). **Optimize:** ops surface must show **stratum n + value** (L10); pooled only secondary.

### D8 — Confidence as probability
**Research consensus + live ordering duel:** marketFairProb wins Brier; confidence non-monotone.  
**Replacement path (not “delete confidence”):** keep as **Edge Index score**; publish **market-anchored p** for book-priced ML; rankingP only when `rankingSource` is not pure confidence echo.

---

## 3. What to research next (ordered)

| # | Research question | Why | Method | Kill line |
|---|---|---|---|---|
| R1 | Does **Shin** vs proportional de-vig change marketFairProb Brier/ECE on books≥2? | Blueprint: proportional biases favorites | Paired rows with both fields (schema has Shin display-only) | Kill Shin product path if ΔBrier ≥0 or CI includes 0 |
| R2 | CRPS: residual σ vs sport σ vs books×sport σ on settled spreads | Heteroscedastic residuals | `crps_gaussian_margin.py` on export | Keep simplest σ unless CRPS improves ≥0.01 |
| R3 | Rolling-origin / ACI on **kickoff-ordered** weekly settles | Exchangeability violated in-season | After enough REG weeks; m≥32 window | Kill if coverage not restored vs static split |
| R4 | Venn-Abers width gate Δp>0.20 → No-Bet on ML | Binary UQ limit (Barber 2020) | Use existing ivap/cvap modules | Publish only with n+width on surface |
| R5 | Per-sport σ_game from market-implied margins (1701.05976 shape) | Global calibrator fails | Fit residual scales by sport on clean pre-game set | Kill shared calibrator claims |
| R6 | Replace **Brier-only** PROVEN gates for **numeric** products with CRPS | Blueprint Rung 2 | Dual metrics in verifier exports | Don’t touch binary PROVEN floors (law) |
| R7 | B-spline steam vs Hawkes on short line archive | Blueprint rejects Hawkes on thin data | Shadow curvature on odds_line_snapshots | Kill steam alerts if false-positive rate > Hawkes on same window |
| R8 | Open **nflverse** full schedules (n≈14k claimed) | We have 7.3k | Download all seasons; re-run J+/split dual-label | Report gap; never claim 14k unless observed |

**Do not research as product path:** commercial 10Hz pipelines, BDB commercial training, dead-domain papers (MRI, astrophysics…), CLV-as-training-label.

---

## 4. Improve loop (repeat until kill lines stop moving)

```
1. MEASURE   — run suite + CRPS + standing OOT on latest export
2. LABEL     — every interval method labeled 1-α vs 1-2α; every rate with n+L10
3. REPLACE   — clamp→Inf; Brier→CRPS on margins; confidence→market p on display ML
4. OPTIMIZE  — per-sport residual stores; stratified ordering; export sport keys
5. TEST      — unit (cqr fail-closed) + OOT coverage + selftest valid JSON
6. POST      — bus finding with numbers, not vibes
7. REPEAT    — new export → 1; new paper → add kill line to PRE-REG YAML first
```

---

## 5. Test commands (this worktree)

```bash
cd C:\Users\Garrett\Sports\.worktrees\stats-books-ordering-2026-09-18

# CQR fail-closed unit tests
# (from apps/web — repo vitest)
npx vitest run apps/web/__tests__/cqr.test.ts

python docs/ops/stats-lane/stats_lane_selftest.py
python docs/ops/stats-lane/run_mimo_suite.py
python docs/ops/stats-lane/nfl_jackknife_corpus.py --input docs/ops/stats-lane/incoming/nflverse-games.csv --out docs/ops/stats-lane/out/nfl-jackknife-nflverse.json
python docs/ops/stats-lane/crps_gaussian_margin.py --input docs/ops/stats-lane/incoming/board-export.jsonl --out docs/ops/stats-lane/out/crps-margin-baseline.json
python docs/ops/stats-lane/standing_oot_monitor.py --input docs/ops/stats-lane/incoming/board-export.jsonl --out docs/ops/stats-lane/out/standing-coverage.json
```

---

## 6. Forgetting / not seeing — checklist

- [x] J+ **1−2α** not 1−α (research caught our label error)
- [x] cqr.ts **clamp still live** + tests pinned wrong behavior
- [ ] Conformal modules elsewhere (`mondrian.ts` hierarchical fallback for **published** claims)
- [ ] PROVEN gates still **binary Brier/ECE** — numeric products need CRPS path without flipping floors
- [ ] Firecrawl logs / extract-data dumps are **ingestion telemetry**, not outcome labels — don’t train on scrape success
- [ ] 10Hz PDF is **architecture fiction for production cost** — keep offline validation only
- [ ] CQR Research.docx listed as **UNREAD/BANNED** under Evidence Rule 0 in conformal audit — treat as internal notes, not literature authority; primary arXiv formulas govern
- [ ] Disposition ledger / xlsx (explore agent) — fold into factors YAML kill lines when returned

---

## 7. Replacement map (never pure removal)

| Remove / stop using | Replacement |
|---|---|
| Quantile clamp | +Inf + No-Bet / infinite interval |
| J+ labeled as 90% band | J+ labeled **1−2α** + optional split 1−α side-by-side |
| Brier/MAE on margins | **CRPS** (Gaussian closed form; then quantile models) |
| Global residual pool for product | Mondrian books×sport + standing OOT alerts |
| Commercial 10Hz / BDB training | nflverse + market microstructure + offline BDB method checks only |
| confidence/100 as win prob | marketFairProb display + rankingP when independent |
| CLV as training target | realized outcomes + optional e-process vs market |
| Scraped “research scores” as truth | arXiv primary formulas + disposition ledger |
| Dead-domain papers in queue | Clustered out; keep diagnostic baselines (Poisson, iWinRNFL) |
