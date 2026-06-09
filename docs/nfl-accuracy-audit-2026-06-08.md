# NFL Data Accuracy Audit — Galaxy Sports Edge

_Synthesis report · 2026-06-08 · 9 cluster verifiers + adversarial re-check (17 agents, ~50 modules)_

## Bottom line (3 lines)

1. **Is the NFL data accurate enough to trust?** Largely yes — nflverse column names, 0..1-vs-0..100 unit handling, and id-namespace joins are correct across the great majority of ~50 audited modules, and missing data degrades to honest dashes/empty-states rather than fabricated numbers. But four confirmed defects make specific surfaces silently wrong, so it is **not deploy-clean as-is**.
2. **Must-fix before deploy:** (C1) Opportunity-Transfer reads a gzip file without gunzipping → every player shows 0 vacated volume; (C2) the Matchup board pairs prior-season grades/defense against next-season opponents in the offseason; (H1) the rushing-efficiency Box% column renders 0% for every RB; (H2) the rushing-efficiency "loaded boxes" narrative is inverted for every back.
3. **Coverage:** ~50 modules audited across 9 clusters. **13 findings confirmed** (2 critical, 2 high, 9 medium) + lower-severity items; **2 findings refuted and dropped** by the adversarial re-check (the PFR pressure-pct "ShareBar 100%" render bug and its companion fixture finding — real nflverse weekly advstats columns proved to be 0..1, so the code is correct and the proposed `/100` would have *created* a bug).

---

## CRITICAL

### C1 — Opportunity Transfer reads gzip without decompressing → all vacated volume reads 0
- **Location:** `apps/web/lib/intelligence/opportunity-transfer.ts:214-215`
- **Wrong value the user sees:** Every OUT/injured player on the Opportunity Transfer engine shows `vacatedTargets 0.0` / `vacatedCarries 0.0`, confidence forced to `low`, note "his recent target/carry footprint is negligible" — the engine's entire quantification collapses to zeros. (Also zeroes every `vacated-role` edge on the Edge Board.)
- **Fix:** Replace `parseCsv(await response.text())` with `parseCsv(await decodeDatasetText(response))` (the gzip-aware decoder every sibling loader uses: player-model, expected-points, qb-forward, predictiveness, receiving-opportunity, route-rate). Add a regression test feeding a `gzipSync`'d body.

### C2 — Matchup board pairs prior-season data against next-season opponents (offseason cross-season bug)
- **Location:** `apps/web/lib/intelligence/matchup.ts:510-514` (header at `:578,:583,:587`); consumed by `apps/web/app/intelligence/matchups/page.tsx`
- **Wrong value the user sees:** In the offseason the board attaches each player's prior-season (2025) GSE Rating + a prior-season opponent defensive read to that team's NEXT-season (2026) Week-N opponent, with a self-contradictory header (`season: 2025` but `week`/`gamesCovered` from 2026).
- **Root cause:** `loadMatchupEngine` calls `loadScheduleContext()` with no season pinned while all other sources default to `latestNflverseInspectionSeason()`; the live `games.csv` already ships the full 2026 schedule with empty scores.
- **Fix:** Pin `loadScheduleContext({ season, week })` to the resolved data season so all sources describe one season; reconcile `season`/`week`/`gamesCovered`. Add a fixture test.

---

## HIGH

### H1 — Rushing-efficiency "Box%" column renders 0% for every RB (double /100)
- **Location:** producer `lib/nflverse/next-gen-stats.ts:321` (correctly `/100` → 0..1) → carrier `lib/intelligence/rushing-efficiency.ts:96` → broken render `components/players/player-lab-table.tsx:194` (divides by 100 AGAIN).
- **Wrong value the user sees:** Box% shows `0%` with an empty bar for every RB; the real 8+-in-the-box rate is ~5–36%.
- **Fix:** `render: (r) => <ShareBar value={r.pctStackedBox} tone="bad" format={(v) => \`${(v*100).toFixed(0)}%\`} />` — drop the `/100`, matching the correct sibling render at line 262.

### H2 — Rushing-efficiency "loaded boxes" read inverted for every back (threshold scale mismatch)
- **Location:** `lib/intelligence/rushing-efficiency.ts:53` (`STACKED_BOX_HIGH = 20`) and `:61-65`.
- **Wrong value the user sees:** `pctStackedBox` is a 0..1 fraction but the threshold is a whole-number percent, so `0.22 >= 20` is always false — every efficient back is tagged "light boxes are helping — expect regression," inverting the buy/fade context. (The fixture passes only because it uses a whole-number 25.)
- **Fix:** `STACKED_BOX_HIGH = 0.20` and switch fixtures to 0..1.

---

## MEDIUM (confirmed)

- **M1 — Trend loaders read `recent_team`; current nflverse player_stats may expose `team` (schema-drift → silent-empty).** `qb-age-rb-trend.ts:114`, `birthday-usage-trend.ts:232`, `player-lab.ts:190/213`, `usage-pulse.ts:151/185/189`, `edge-signals.ts:161/172`. Fix: tolerant `row["team"] ?? row["recent_team"]`. **UNCONFIRMED live header — verify one real row first.**
- **M2 — team-environment blends REG+POST (no `season_type` filter).** `team-environment.ts:296-450` + allowlist `:205-236`. Fix: add `season_type` to allowlist, skip non-REG.
- **M3 — play-design blends REG+POST.** `play-design.ts:193-228` + `ftn-charting.ts:94-108`. Fix: REG-filter / index only REG plays.
- **M4 — expected-points (xFP) includes postseason (ep_weekly has no `season_type`).** `expected-points.ts:96`. Fix: drop `week > 18`.
- **M5 — injury report surfaces a playoff "latest week" under active-slate copy.** `injury-report.ts:96-97`. Fix: REG-filter + max REG week, or label the round.
- **M6 — team pass-rush totals summed from a truncated top-30 coverage leaderboard.** `matchup.ts:191-221` ← `pressure-coverage.ts:304-329`. Fix: aggregate from the uncapped defender set / a dedicated team rollup.
- **M7 — matchup team-code joins lack relocation-alias normalization.** `matchup.ts:180-182,224-245`. Fix: shared nflverse team-alias normalizer.
- **M8 — depth-charts mis-handles the 2025+ ESPN schema (week scoping no-ops; non-unique starter).** `depth-charts.ts:62-92` → `offensive-line.ts`. Fix: starter = min `pos_rank` within team+`pos_name`.
- **M9 — usage-pulse computes ages against the requested season while reporting `activeSeason`.** `usage-pulse.ts:252-269`. Fix: pass `activeSeason` into the age/row builders.

---

## LOW / INFO (confirmed, low blast radius)

- **L1 — player-model coerces a missing anchor to 0 before ranking** (`player-model.ts:162-177`) — depresses GSE Rating for players genuinely lacking dakota/pacr. **GRADE-TOUCHING → founder-gated (MODEL_VERSION).**
- **L5 — QB EPA/play denominator omits sacks** (`player-model.ts:127-132`). **GRADE-TOUCHING → founder-gated.**
- L2 — route-rate splits mid-season-traded players across name|team buckets (undercount). `route-rate.ts:130-143`.
- L3 — combine class axis mixes `draft_year` with combine `season`. `combine.ts:63,95-99`.
- L4 — birthday-usage labels in-window game count as true career game N. `birthday-usage-trend.ts:298-306`.
- L6 — qb-forward disagreement note has a dead duplicate branch. `qb-forward.ts:99-101`.
- L7 — roster-advice obfuscated double-negative sort (correct, but unclear). `roster-advice.ts:110`.
- L8 — Scoring-Zone WR/TE filter chips match no rows (UX). `engine-view.tsx:527` vs `scoring-zone.ts:323`.
- L9 — schedule-context enum/week nits (`'retractable'` roof; gameType doc). `schedule-context.ts`.
- L10 — no `dataviz.test.ts` for the 0..1/0..100 bar contract everything depends on.

## Trend-plan join definitions (documentary — surfaced, never executed; `joinedTrendObservations:0`)
In `packages/data-ingestion/src/nflverse-trend-plan.ts`: `player_stats_week → snap_counts` keyed on `player_id`+`team` crosses GSIS/PFR namespaces (snap_counts has only `pfr_player_id`/name); `→ rosters` keyed on `player_id` (rosters key is `gsis_id`). No on-screen number is wrong today, but would mis-join if executed.

## REFUTED (dropped by adversarial re-check)
- PFR pressure-pct ShareBar "100%" render bug — live `advstats_week_{pass,def,rec}` columns are 0..1 fractions (Mahomes `0.367`); the code is correct and `/100` would create a 100× bug.
- `pressure-coverage.test.ts` "wrong scale" — fixtures are realistic 0..1; assertions hold.

## CLEAN (audited and confirmed accurate)
usage (snap-share, receiving-opportunity — WOPR = 1.5·target_share + 0.7·air_yards_share confirmed), efficiency (qbr, rushing-contact, next-gen-stats loader), scheme/environment (ftn-charting, schedule-context, offensive-line, dataviz primitives, render units, derivation math), scoring/edge (edge-signals, scoring-zone, expected-points basis), identity (qb-age-rb-trend, trend-discovery Welch z/p, availability, player-lab), model (predictiveness, qb-forward ANY/A hand-checked 6.81, qb-consensus), synthesis (colors, clv-calibration, metric-methodology, rating-why, dossier/edge-board unit paths), render (engine-view 14 ShareBar/10 PercentileBar consumers, views.tsx), plumbing (pbp streaming loader, nflverse-readiness, workbench, latestNflverseInspectionSeason June 2026 → 2025).

## Note on the test suite
Independent of the audit, `npx vitest run` (from apps/web) shows pre-existing failures worth reconciling against this report: `route-rate` (proxy-label), `clv-calibration` (CLV sign), `qb-forward` (agreement-note copy), `predictiveness` (WR split / multi-year), plus homepage cold-open doctrine tests and a `\block\b` trust-gate false-positive on "defenders lock down" in `app/intelligence/engines/registry.tsx`. These are separate from Phase 6 (which introduced zero regressions).
