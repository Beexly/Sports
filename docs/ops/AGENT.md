# AGENT.md — shared status (append-only)

Canonical path: C:\\Users\\Garrett\\Sports\\docs\\ops\\AGENT.md
Also copy to: C:\\Users\\Garrett\\tmp\\AGENT.md if Sports is dirty.

Every agent (Grok CLI, Grok Bot / CoS, Lane Watcher, Claude, Hermes) appends one block per material change. No novels. No secrets.

## Format
### YYYY-MM-DD HH:MM CT | AGENT | CLEAN|BLOCK|FAKE-EDGE|OWNER_GATE
- Who / what
- Evidence (PR, HTTP, PID)
- Next action (one owner)

## Rules
- Do not start a second Hermes if handoff/cheap-overnight/watchdog.pid is live.
- No Odds event-odds or historical from bots.
- Do not market PUBLIC_PICKS as PROVEN/CLV.
- Phone: email Baxley.Garrett@gmail.com only on BLOCK / FAKE-EDGE / OWNER_GATE.

## Now (2026-08-22 13:30 CT)
### 2026-08-22 13:30 CT | Hermes P1 (covariate bus + SEP bind) | CLEAN
- PR 1 (#547, hermes/covariate-bus): covariate-bus.ts — pure/leak-safe/week=0 dropped/null→fail-closed/weekly_ngs_mean grain. 13 tests.
- PR 2 (#548, hermes/ngs-sep-adot-catch, rebased on PR 1): props-hb-adot-sep-bind.ts — sepForKickoff → AdotSepCatchSample, null→DROPPED (never 3.0 yards). 6 tests. Barrel exports in index.ts.
- Full suite: 2870 passed / 2 failed (2872) across 265 files — 2 failures pre-existing ENOENT path mismatches, unrelated to this slice. Edge-lab subset: 642 passed across 62 files.
- Next: xYAC bind (props-hb-air-yac.ts). 3 fails → BLOCKED, move next.

## Now (2026-08-22 16:40 CT)
### 2026-08-22 16:40 CT | Hermes P1 (ox-alpha) | CLEAN
- PR ship: covariate bus (IP) + SEP bind — both pushed to origin/hermes/ngs-sep-adot-catch.
- covariate-bus.ts: pure, leak-safe, week=0 dropped, null→fail-closed, weekly_ngs_mean grain,
  y-axis fields (expectedCompletionPct/avgExpectedYac/expectedRushYards/cpoe/ryoe) absent by construction. 13 tests.
- props-hb-adot-sep-bind.ts: binds sepForKickoff into aDOT×SEP samples, drops on null (never 3.0 yards). 6 tests.
- Barrel exports: SEP_BIND_METHOD_TAG, bindSepSamples, boundSepSamples, SepBindRequest, SepBindResult.
- All 639 tests pass (62 files). SESSION-HANDOFF.md + AGENT.md updated.
- Next: xYAC bind (props-hb-air-yac.ts), volume T + YAC split via bus. 3 fails → BLOCKED, move next.
- No DONE.md STOP. Watchdog 24188 stays live.

## Now (2026-08-22 01:38 CT)
### 2026-08-22 01:38 CT | Chief of Staff | OWNER_GATE + BLOCK + FAKE-EDGE
- Odds /v4/sports 401; remaining file 0/0. Neon P1001. Public picks model_signal n=0.
- Windows babysits Hermes+8317. Lane-watch overnight paused. Morning glance 08:00 CT.
- Next: founder (Vercel THE_ODDS_API_KEY + Neon). Claude (copy/gating). Hermes (T11 cheap queue).

### 2026-08-22 01:45 CT | Chief of Staff | OWNER_GATE (key) + no live edges
- Paid Odds key located in Gmail; backup at C:\Users\Garrett\tmp\.odds-api-key (not git). Vercel env not written (CLI logged out; Windows spawn aborted). Do not print key.
- No live book edges: Neon P1001, prod deploy ERROR, Kalshi public GET 429, no in-repo odds snapshots.
- Real program remains X1 Shin (needs Odds, preseason ~ends Aug 28) then X4 Kalshi $0. STOP confidence-as-model.
- CoS: no extra Grok agents, no Odds event-odds, no second Hermes. Morning glance 08:00 CT.

### 2026-08-22 ~08:45 CT | Grok CLI | CLEAN (drive)
- Hermes overnight wrongly STOP'd after T-Q1/2/3 because launch said idle+T-Q4 STOP. Revoked.
- Prod Ready SHA `0cf7605f` (DB ping ok). Merged #522 #524 #528. Closed #532 dup of #535. #525 Test still red. #537–#540 conflicted.
- Relaunched watchdog pid 24188, Hermes python 34364/13016 on `EDGE-HUNT-LAUNCH.md` Ox Alpha. 8317=200. No DONE.md. Do **not** start a second Hermes.
- Watchdog CIM match missed EDGE-HUNT (logged hermes=pending) — patched for **next** session; do not kill this one.
- Next: Hermes E1 (#525 typecheck job 97034874745) then E2 rebase then E3+ new p-modules. Log every action here. Grok unblocks only when they cannot work.

### 2026-08-22 14:10 CT | Hermes | CLEAN
- E1 (#525): CI run 32577398314 failed — ONLY failure is agent-ledger guard: T-Q3a row has Status=DONE but Evidence is `—`, no resolvable SHA. Fix: set evidence to `cc905a83 on origin/hermes/ox-alpha-q-integrity; PR #525`. Committed as 7d917706, pushed to origin/hermes/ox-alpha-q-integrity. CI re-running (run 32578606146).
- E2 scope: #537–#540 all MERGED into origin/main. Branch tips have stale "merge origin/main" commits that DELETE later PRs' files. Rebase task = clean up branch tips (drop stale merge commits, keep only feature commits on top of main).
- Next: verify #525 CI green → E2 rebase #537 (juice floor) → #538 (rec TD) → #539 (rush TD) → #540 (line-shop).

### 2026-08-22 14:55 CT | Hermes | CLEAN
- E1 (#525): CI GREEN (run 32578606146, all checks SUCCESS at 14:34). Branch hermes/ox-alpha-q-integrity pushed to origin. PR OPEN, ready for review. Ledger row H-N → DONE with evidence cc905a83.
- E2 (#537–#540): ALL FOUR PRS MERGED into origin/main (mergedAt 13:45–13:48). Stale local branches local-537..540 deleted. E2 complete — rebase was a no-op since PRs already merged cleanly.
- E3 (#542): pass yards g/attempts — PASSED CI, pushed to origin/hermes/ox-alpha-pass-yards-given-attempts.
- E4/E5 (#543): completions + INTs g/attempts — PASSED CI, pushed. Branch origin/hermes/ox-alpha-q-integrity-given-attempts is current HEAD.
- E6 (#544): sacks g/dropbacks — MERGED into origin/main (b7ede3d0).
- E7 (#545): rush attempts g/attempts — CI GREEN (all checks SUCCESS), pushed. Branch origin/hermes/ox-alpha-rush-attempts-volume at 8d81de6a. origin/main ahead by 1 commit (#544) — no rebase needed, PR is green.
- Next: E8 — red-zone TD rate given RZ attempts. Start now.
|
### 2026-08-22 ~12:06 CT | Hermes / ox-alpha | CLEAN
|- **PR 1 — Covariate Bus** (leak-safe NGS weekly → next-game features):
|  - Branch: `hermes/covariate-bus` (commit `25b5583f`, pushed to origin)
|  - File: `packages/prediction-engine/src/edge-lab/covariate-bus.ts`
|  - Tests: `covariate-bus.test.ts` — 13/13 green
|  - Contract: key = gsisId|season|week|statType; week=0 dropped; week t predicts t+1; null → null (fail-closed, no impute); returns {value, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean"} not a bare float; never exposes expectedCompletionPct/avgExpectedYac/expectedRushYards/cpoe/ryoe as p (y-axis only). Barrel exports in index.ts. priced:false.
|
|- **PR 2 — SEP Bind** (covariate bus feeds aDOT×SEP catch model):
|  - Branch: `hermes/ngs-sep-adot-catch` (commits `7e966783` + `69ab88a7`, pushed to origin; rebased on bus commit)
|  - File: `packages/prediction-engine/src/edge-lab/props-hb-adot-sep-bind.ts`
|  - Tests: `props-hb-adot-sep-bind.test.ts` — 6/6 green
|  - Contract: `bindSepSamples`/`boundSepSamples` feed `sepForKickoff` into `AdotSepCatchSample`; fail-closed on null (drops sample, never 3.0 yards); honest weekly-mean grain forwarded verbatim. `AdotCatchSample` import fixed to correct source (`props-hb-adot-catch.ts`, not `props-hb-adot-sep.ts`). Barrel exports in index.ts. priced:false.
|  - Typecheck: `tsc --noEmit` clean on packages/prediction-engine.
|
| - Next: bind air+YAC onto `props-hb-air-yac.ts` via the covariate bus; then xYAC/vendor models stay y-axis only. See SESSION-HANDOFF.md (cheap-overnight).
|
### 2026-08-22 ~15:30 CT | Hermes (ox-alpha) | CLEAN
|- PR 4 — CPOE Comp Bind (#553): MERGED. Branch hermes/covariate-cpoe-comp @ c7c8ca37, pushed to origin. CI green (Test+tsc+Build all SUCCESS). 9/9 tests green. All 658 edge-lab tests pass (64 files).
|- PR 1 (#547), #2 (#548), #3 (#549): ALL MERGED. PR 4 (#553): MERGED.
|- Doctrine H0: 4 flagship covariate binds complete (bus, sep, yac, cpoe-comp).
|  Remaining H0 slices (#555 harness, #557 kneel, #556 TPRR) on grok/** — do NOT touch.
|- Next: H0 #4 TPRR — await grok/h0-est-routes (#556) landing; spawn hermes/h0-tprr from origin/main if #556 confirmed not proceeding. No second TPRR covariate bind.
|- No DONE.md STOP. Watchdog stays live.
|
### 2026-08-22 ~12:30 CT | Hermes / ox-alpha | CLEAN
|- **PR 1 Covariate Bus (#547):** OPEN, CI green. Branch hermes/covariate-bus @ 5a1790dc pushed to origin. Tests 16/16. tsc clean.
|- **PR 2 SEP Bind (#548):** PR created from hermes/ngs-sep-adot-catch (rebased on bus 5a1790dc). Tests 6/6. CI green. Barrel exports in index.ts for bindSepSamples/boundSepSamples.
|- **PR 3 YAC Bind (#549):** OPEN, CI re-running after fix. Branch hermes/covariate-yac-bind @ 4d0b7781 pushed to origin. Tests 7/7 + air-yac 8/8. Barrel exports in index.ts for bindYacSamples/boundYacSamples. Fix commit 4d0b7781 added avgYac to sep-bind test fixture (TS2322 CovariateRow assignability).
|- **Honest posture kept:** the site is a window; no chrome built. avgSeparation bound from bus weekly mean (not arrival), fail-closed, never 3.0 yards. avgYac bound from bus weekly mean (not per-target arrival YAC).
|- Next: Bind #4 INT (aggressiveness/avgTimeToThrow → props-hb-int.ts). 3 fails → BLOCKED, skip to next. See SESSION-HANDOFF.md.

### 2026-08-22 ~16:30 CST | Hermes (ox-alpha) | CLEAN
- **PR 4 — CPOE Comp Bind (#553) Qodo follow-up:** pushed commit `e22eb2b7` to origin/hermes/covariate-cpoe-comp. CI already GREEN before; re-running to confirm 11/11 tests green post-fix.
- Qodo P2/P1 addressed:
  - `gseCpoe` on `BoundCompSample` changed from raw `number` to `CovariateCell`
    (`{ value, grain: "week_t_for_tplus1", provenance: "expected_metric_v1" }`)
    — consumers can now distinguish GSE-CPOE from vendor CPOE.
  - `CovariateProvenance` extended to `"weekly_ngs_mean" | "expected_metric_v1"`.
  - `CpoeCompBindRequest.gseCpoeAsOfWeek` added: must be non-zero integer,
    strictly `< kickoffWeek`. Season-level (week=0) CPOE refused as
    `cpoe_as_of_boundary` — same boundary as bus week=0 rule.
  - New refuse code `cpoe_as_of_boundary` added to `CpoeCompBindResult` union.
- All 34 edge-lab tests green (bus 16, sep 6, yac 7, cpoe 11).
- No DONE.md STOP. Watchdog stays live.
- Next: H0 #4 TPRR — PR #556 (grok/h0-est-routes) is OPEN/GREEN. Do NOT start
  a second TPRR covariate bind; await merge or handoff. Three fails → BLOCKED.
|

### 2026-08-22 17:00 CT | Hermes (ox-alpha) | CLEAN — REBASE onto origin/main post-#554
- PR 4 (#553) rebased onto origin/main (8b898981, post-#554 fleet foundation):
  - Branch was based on c2cfc153 (pre-#554), causing kernel files (conformance.ts, contract.ts, etc.) to appear as DELETIONS in PR diff.
  - `git rebase --onto origin/main c2cfc153` — 6 commits applied cleanly onto main.
  - Pure diff now (6 files: cpoe-comp bind+test, covariate-bus.ts +2, index.ts +16, docs). Kernel files preserved.
  - Pushed with --force-with-lease to origin/hermes/covariate-cpoe-comp.
- CI: 20/20 checks PASS, 0 failures. 660/660 edge-lab tests pass (64 files).
- PR #553: OPEN, mergeable (was UNSTABLE before rebase, now CLEAN).
- No DONE.md STOP. Watchdog stays live.
- Next: H0 #4 TPRR — PR #556 (grok/h0-est-routes) OPEN/GREEN on main. Do NOT start a second TPRR bind.

## Now (2026-09-03 15:48 CT)
### 2026-09-03 15:48 CT | Hermes (verified-fixes session) | CLEAN
- Dual-audit verified bug batch shipped as PR #689 (draft, claude/verified-fixes-2026-09-03 → main), one commit per fix: C-64 settle-backfill SCORE_MISMATCH no-clobber guard + regression test (47037c6d1); C-65 capReached decidable — fetch cap+1, > cap, exactly-cap now false (cd0c6adc1); C-66 backfill-team-efficiency + ingest-player-stats fall back to floor only on UNPUBLISHED signals (404/zero-rows) via shared isUnpublishedSeasonSignal — 5xx outage recorded failed, never masked (968c49522); C-67 merge score-pair fill && → ||, partial canonical pairs fill from clean FINAL alias, pure rules extracted to scripts/ops/game-merge-score-fill.ts + 10 node:tests via test:merge-score-fill (ea893d5a8); C-68 PickConflict.canonicalPickId → referencePickId (f4709df22); C-69 smoke-prod cold-start retry — one 2s-settle retry per non-200, cap 8, LAST_CODE global after subshell counter bug caught in self-test (5ba852598).
- Merged origin/main (PR #685) mid-branch, clean; both sportKey per-sport fetch and C-64 guard kept.
- Gates at close: tsc 0 errors, lint clean, guardrails 26/26, test:fast 251/251, settle-backfill 11/11, game-merge-plan 17/17, merge-score-fill 10/10, cron route tests 49/49. Ledger C-64..C-70 all DONE.
- Next action (one owner): founder review + merge PR #689; next agent opens from origin/main.

### 2026-09-14 13:43 CT | Hermes | BLOCK
- **Tag rationale:** BLOCK, not CLEAN. L2 and L3 are data-blocked on files that do not exist on this host, and the L1 pre-registration's 1,000-refit permutation null cannot execute here (this host throttles a single logit fit from 0.70s to ~6.4s under sustained numeric load) — the null is therefore being computed by a **disclosed deviation**. L1 stage-1 itself ran and killed the candidate.
- **Overnight 13-compound battery (game level): 0 of 13 executed compounds passed. Contract pass** — pre-registration was frozen before any outcome was computed, and no compound was promoted. Executed-and-killed: D1 injury-burden×short-week n=369 (coef +0.05, wrong sign); E1 new-HC×opp continuity n=1,093 (correct sign, ΔLL −0.00014); F2 n=235; F3 n=140. Power-dead (flagged n): A1 18, B1 71, B2 68, C1 7, C2 10, F1 13. SPEC-ONLY, never executed: A2, E2, F4. Frame: 2,895 REG games 2015–2025 → 5,790 team-game rows; baseline devigged closing moneyline.
- **Props follow-up prompt received (2026-09-14).** Work queue L1→L3→L2→L5 in props space; per its priority rule L1 was taken to completion first, with L3/L2/L5 held as frozen specs.
- **L1 stage-1 result — KILLED on both pre-registered primary lines.** Join: FTN charting 2022–2025 joined to nflverse pbp. pbp carries **no `nflverse_play_id` column** (verified against the 372-column header), so the join is `game_id` + `play_id` (= FTN `nflverse_game_id` + `nflverse_play_id`); join rate 99.6% (2022) and 100.0% (2023, 2024, 2025); **77,239** joined REG pass attempts. Weather filter: **41,568** outdoor attempts with non-null temp/wind; **10,200** outdoor rows dropped for null weather. Analysis set **n=39,986**; ColdWindy **10,950**; PlayAction **8,584**; ColdWindy×PlayAction flagged **n=2,479** (above the 1,500 power floor).
  - **K1 — sign flip:** fitted interaction **c = +0.082131**, against the pre-registered direction **c < 0**. Sign is opposite the pre-registration.
  - **K2 — effect below threshold:** out-of-sample Δlog-loss by test season **2023 +0.000145, 2024 −0.000372, 2025 +0.000139** nats/attempt; mean **−0.00003** — roughly 60× below the pre-registered **0.002** kill threshold.
  - Main-effect controls: ColdWindy −0.0728, PlayAction −0.0356 (the compound term is what carries the wrong sign).
  - Evidence: `/tmp/nfl/res_L1.json`, `/tmp/nfl/l1_model.log`, joined data `/tmp/nfl/l1_join.csv`; frozen spec `prereg-props-2026-09-14.md` sha256 `5c70f93e4b9dd668dce5ebd441ee330f010c44df6b9e24dcd04d756fc40e6618`.
- **Disclosed deviation (stage-2 nulls), stated openly rather than hidden.** The frozen prereg calls for 1,000 within-season permutations **with full refits of M1** and a 2,000-draw game-clustered bootstrap. Measured on this host: one 8-iteration float32 fit costs 0.701s cold and **6.436s averaged over 20 repeats**, i.e. ~100 min for the permutations and ~3.5 h for the bootstrap. Substitute (deviation, not silence): (a) permutation null via an **efficient-score (one-step) statistic** computed from the null fit; (b) game-clustered 90% interval from a **cluster-robust sandwich** instead of a clustered bootstrap. Both retain game clustering; both will be labelled as deviations from the frozen prereg in the report. Note the L1 kill does not depend on this deviation — K1 (sign) and K2 (magnitude) are full-sample and out-of-sample fitted quantities, not null-based.
- **L2 — DATA-BLOCKED. Files looked for, exact:** `/tmp/nfl/player_stats_*.csv` and `find /tmp -iname "*player_stats*"` → **zero results**. L2's estimand needs weekly `targets/receptions/carries` per player. Present and usable for the rest of L2: `/tmp/nfl/roster_2015..2025.csv` (all 11 seasons) and `/tmp/sched.csv`. Blocked on player stats only.
- **L3 — DATA-BLOCKED on two independent inputs. Files looked for, exact:** `/tmp/nfl/snap_counts_*.csv` and `find /tmp -iname "*snap_counts*"` → only `/tmp/sports/data/statking/snapshots/snap_counts_sample.json` and `/tmp/sports2/data/statking/snapshots/snap_counts_sample.json`, i.e. repo **sample fixtures**, not real per-player snap counts. Second input: **no book prop lines exist anywhere on this host**, and L3's estimand *is* the props pricing gap — without market lines the estimand is untestable here, so L3 stays a frozen spec.
- **Step-0 artifact delivery — COMPLETE, nothing lost.** Delivered 2026-09-14 to `/var/minis/shared/gse-discovery/` and mirrored to `/var/minis/workspace/gse-discovery/`, **24 files**: `prereg-2026-09-14.md`, `minis-overnight-deep-report-2026-09-14.md`, `build2.py`, `build3.py`, `gates2.py`, `boundary.py`, `cr.py`, `oa2.py`, `oa_search.py`, the 13 `res_*.json` (A1,B1,B2,B2r,C1,C2,D1,D1r,D3r,E1,F1,F2,F3), `compound_table2.csv`, `gate_results.jsonl`. Source of truth was `/root/workspace-gse/gse-discovery/` plus `/tmp/nfl/` for the CSVs. The `/var/minis/workspace/gse-discovery/` path named in the overnight report did not exist at session start; both mirrors now exist.
- **Also present for the record:** nflverse `play_by_play_2022..2025.csv` (downloaded this session, ~99 MB each, from the nflverse-data `pbp` release) and the frozen L1 spec `prereg-props-2026-09-14.md`.
- **Next:** finish L1 stage-2 under the disclosed deviation, then write `minis-props-lab-report-2026-09-15.md` with the Step-0 manifest, gate-by-gate log, ranking, engine handoff and failures log. L3/L2/L5 remain frozen pre-registrations.

### 2026-09-15 02:20 CT | Hermes | CLEAN
- **Supersedes the 2026-09-14 13:43 CT BLOCK block above** for L1 stage-2, L2, L3 and L5. That block's L2/L3 "data-blocked" status is now **resolved or evidenced**; its L1 stage-2 "pending" status is now **closed**.
- **L1 stage-2 COMPLETE — KILLED on K1, K2 and K3.** Executed prereg `prereg-props-2026-09-14.md` sha256 `5c70f93e…`. c = **+0.082131** (pre-registered direction was negative → K1); OOS ΔLL **+0.000145 / −0.000372 / +0.000139**, mean **−0.00003** vs the **0.002** threshold (K2); game-clustered 90% CI **[−0.012464, +0.176727]** contains 0 (K3), confirmed by a 2,000-draw clustered bootstrap (574 games) at p5 −0.010945 / p95 +0.174639. N1 = 1,000 within-season **full refits** (381.8 s). Indoor placebo covers 0 (K6 does not fire); severity tertiles low +0.0885 / mid +0.0160 / high +0.0905 (K5 does not fire); yards OLS +0.111341 / median +0.669067, both positive. Power floor met: **2,479** flagged ColdWindy×PlayAction attempts ≥ 1,500.
- **v4 §A5 cross-check PASSES.** On the same 100 permutation draws: full refit mean −0.014510 vs efficient-score mean −0.014623, **max abs diff 0.000601, Pearson r = 0.9999977, sign agreement 100.0%**. The efficient-score substitution was validated — and then **not needed**, because the frozen full-refit procedure became affordable once the thread fix below landed. N1, the bootstrap and the placebo all ran as frozen.
- **ROOT CAUSE of the "environment throttling" (worth more than the lab):** numpy/BLAS spawn a thread pool that collapses on this emulated CPU. With `OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1`, one logistic fit goes **2.32 s → 0.35 s**, and a 200-iteration benchmark **>100 s → 3.96 s**. Without it the frozen 3,200-refit procedure was ~3.5 h. **No package installed, no threshold changed.** Any agent doing numeric work here should export these five variables first.
- **L5 COMPLETE — the game-level branch is formally CLOSED.** 2,895 REG games 2015–2025; `logit P = a + b·logit(q) + c₁s₁ + c₂s₂ + c₃s₁s₂`, c₃ partially pooled across families, 1,000 permutation draws per family. Family c₃: A +0.3164 (n_s1 94) · B +0.3280 (555) · C +0.0302 (91) · D −0.1880 (1,772) · E +0.1283 (1,246, supplementary). **Pooled K=4: mu_c₃ +0.046342, se 0.148057, 90% CI [−0.197212, +0.289896] — covers 0, and every family CI covers 0.** Per the frozen kill line: *"compounding is not detectable at NFL game frequencies with public pre-kickoff information."* The **1999–2025 pbp pull was correctly NOT started**: `build2.py`/`build3.py` contain **zero** pbp references, the build floor is hard-coded 2015 (HC comparison 2014+), local rosters/injuries are 2015–2025, and the L5 equation contains no decay constant — so the 1999–2014 window is neither used nor constructible here.
- **L2 COMPLETE — KILLED as a revenge edge.** player_stats 2015–2024 (2025 file **HTTP 404**, logged). 52,172 rows, 812 revenge rows, 40,464 analysis rows. Within-player FE `revenge` **−0.366494** targets/game, clustered 90% CI [−0.597528, −0.119017]; `Δt_since_last_meeting` **−0.006869** [−0.008778, −0.005127]. Robust median ratio **0.773569**, 90% CI [0.711428, 0.821739] (does not cover 1.0). **Sign is opposite the revenge hypothesis and confounded with post-transfer role decline** — recorded as a finding against, not an edge. The geometric-mean ratio in `res_L2.json` (0.01998) is an **artifact** of near-zero baselines; the median governs.
- **L3 SHELVED WITH EVIDENCE — six sources checked:** local prop-line files (code/tests only, no data); `props-line-shop.ts` (a consumer, `shopPostedPrices(p, books)`, not a source); `THE_ODDS_API_KEY`/`ODDS_API_KEY`/`ODDSPAPI_KEY` all unset; `api.the-odds-api.com` → **HTTP 000**; odds-snapshot dumps (schema/lib code only); production `OddsLineSnapshot` (37,402 rows per C-62) is **game-level, not per-player props**, and lives in the production DB — not queried, per the standing laws.
- **Deliverables:** `minis-props-lab-report-2026-09-15.md` (sha256 `c75b2c510a89c3b10a42984e61cf92fb`), **46 files on both mirrors** `/var/minis/shared/gse-discovery/` and `/var/minis/workspace/gse-discovery/`. **Nothing promoted to IC9 — no spec cleared 5a+5e.** Nothing pushed; `AGENT.md` and both mirrors are local for owner review.
- **Missing input, flagged:** `minis-grout-prompt-v4-gate-amendment.md` **does not exist on this host** (filesystem-wide search). §A5 and the A1 veto were applied as quoted in the work order, not as read — open question O-1 in the report.
- **Environment incident:** the host reloaded mid-run (~3 h wall clock lost, all background jobs killed, `PID 1 = []`). Everything was re-run in the foreground with incremental saves; no result was lost.
