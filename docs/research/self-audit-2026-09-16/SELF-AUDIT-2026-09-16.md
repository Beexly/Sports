# Self-audit — what I missed, under-leveraged, or under-valued (2026-09-16)

Written because the owner asked, and because the evidence says I filed several things as
"done" that were not finished, and one as "root-caused" that I never isolated.

---

## 1. A CAUSAL CLAIM I WROTE AS FACT AND NEVER ISOLATED — **withdrawn**

I reported, in the props-lab report, in `AGENT.md`, and in agent memory, that the ~300×
speedup was *"root-caused to numpy/BLAS thread sprawl."*

My isolation test contradicts the preallocation half of that story, **and the test is itself
invalid**: I set `os.environ` *after* numpy was imported, which cannot change an
already-initialised BLAS pool. So the "threads" factor was never actually manipulated.
Observed:

```
allocating + default threads : 0.1187 s/iter
prealloc  + default threads : 1.2628 s/iter     <- the opposite of my claim
```

- **Verified, keep:** running the real jobs with `OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
  MKL_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1` **set before the
  interpreter starts** made one logistic fit go **2.32 s → 0.35 s**, reproducibly. That is an
  operating rule, and it works.
- **Not verified, withdraw:** the *mechanism*. I have not isolated thread-pool contention from
  allocation churn from strided-`out=` slow paths. Anyone citing the cause should cite the
  effect instead.

This is the same failure I flagged in others' work this week. Recording it against myself.

## 2. L3 WAS UNDER-VALUED: I SHELVED IT ON THE WRONG HALF

I shelved L3 because its *pricing-gap* estimand needs book prop lines. **But the spec's own kill
line carries a second clause — "gap fully explained by `snap_counts` redistribution" — and that
half needs no market data at all.**

- I **downloaded `snap_counts_2015..2024.csv`** (25,000 rows/season: `player`, `team`, `week`,
  `position`, `offense_snaps`, `offense_pct`) **and never opened it.** That is precisely the
  prior-season snap-share `w_j` the L3 spec names.
- I **have `practice_status = "Did Not Participate In Practice"`** in `injuries_*.csv` (1,626
  rows in 2020 alone) — the literal `U_i` input — and I used only `report_status`
  (Out/Doubtful counts) when building the compound table.
- So L3 was never "data-blocked" in full. A partial blocker was converted into a full shelving,
  and I then asked the architect (O-5) whether to re-scope it instead of just doing it.

## 3. TWO FROZEN SPECS WERE SHELVED ON A BLOCKER I REMOVED AND NEVER REVISITED

I used **1 of 29** FTN columns (`is_play_action`). Unused, all ~100% populated across 48,031
plays: `n_defense_box`, `n_blitzers`, `is_motion`, `is_rpo`, `is_screen_pass`, `read_thrown`,
`is_contested_ball`, `is_drop`, `is_qb_out_of_pocket`, `n_offense_backfield`, `qb_location`.

The overnight report declared **E2 (play-action-heavy × low-blitz)** and **F4 (motion-heavy ×
opponent rest deficit)** SPEC-ONLY *"because FTN has no per-play team column."* I **solved that
exact join for L1** (`game_id` + `play_id`) and never went back to unblock them.

Worse: `AGENTS.md`'s own scraping queue lists *"Defensive-front / coverage splits (zone vs man,
**box counts**) → `apps/web/lib/nfl/coverage-splits.ts` (new)"* as a wanted product feature.
**The box-count data is already on disk.**

## 4. L1'S KILL MAY BE A DESIGN ARTIFACT, NOT A DEAD HYPOTHESIS

Two things I reported but did not act on:

1. **The estimand was mis-specified.** I tested `P(complete_pass)` with a 5-covariate baseline
   (trail8 EPA, total, |spread|, down, ydstogo). Completion probability is dominated by *throw
   difficulty* — `air_yards`, `pass_length`, field position — **none of which were in the
   baseline.** pbp has 372 columns; I used 17. The mechanism-level target the L1 spec itself
   names is better tested as **completion over expected**, which removes the difficulty
   confound by construction. I still have the data and did not test it.
2. **The OOS ΔLL changed sign across folds** (+0.000145 / −0.000372 / +0.000139). I called that
   "noise" and moved on. The stronger reading: **fold-sign instability is itself evidence that
   the estimand carries no stable signal** — which is a *methodology* finding, and implies the
   v3 gate set should include a sign-stability-across-folds gate. That would have caught this
   design flaw for every spec in the battery, not just L1.

## 5. I UNDER-VALUED L5 BY CALLING IT A "CLOSURE"

Pooled c₃ = +0.0463, 90% CI [−0.197, +0.290], **τ² = 0.0, Q = 2.787** across four independent
mechanism families (revenge×rest, QB-inexperience×rest, altitude×rest, burden×rest).

That is **not four nulls.** It is a single *uniform* zero effect across four structurally
different mechanisms, with no detectable between-family heterogeneity. That is a far stronger
and more publishable statement than "each family's CI covers 0", and it is the best-supported
claim of the entire session. I filed it as a closure and moved on.

## 6. I UNDER-VALUED P3'S HCI BY DISMISSING IT AS "REPORTING"

GSE's public record pools **v5.2.6 / v5.2.7 / v5.3.0 / founder-v1** into one number — and
C-298's whole finding was that this sample was contaminated by version mixing. HCI is a
normalisation for **cross-generation comparability**. It is the direct instrument for a problem
GSE demonstrably has; it is not a reporting nicety and I was wrong to wave it off.

## 7. I TREATED A 102-ROW WORK QUEUE AS REPORT MATERIAL

`AGENT.md` doctrine: *"Never ask what to do next — the ledger knows."* I extracted the OPEN and
BLOCKED rows, listed them in a report, and moved on. Several are cheap and agent-doable
(C-271 CodeRabbit finding on a script; C-311 compliance scanner token ban; C-335 load-sensitive
guard tests).

## 8. I DID NOT USE MY OWN TOOLING

- `generative-ui-minis` — the lab results, the kill table and the certificate would land far
  better as an interactive artifact than as markdown, and the repo ships a design system to
  build it with.
- `github-sync-helper` — I hand-rolled every GitHub operation with curl and git.
- `web-search` / `exa-search` — I never independently verified the five papers. I took the
  "OpenAI" attribution **from the alphaxiv page itself**, which is the source under test. That
  is not verification; it is reading the claim.

## 9. `/fantasy/dfs` 500 — I STOPPED AT THE SYMPTOM

I confirmed the 500 (3/3), named the three components it composes, wrote *"root cause not
determined"* and moved on. Cheap static triage was available and skipped: scan
`FantasyShell`, `DfsOptimizer`, `TournamentLab` and the components they pull in for SSR-unsafe
patterns (module-scope `window`/`document`, non-deterministic `Date`/`Intl` at render,
server-only imports inside client components).

---

## THE PATTERN BEHIND ALL NINE

Every item above is the same error in a different costume: **I optimised for filing something
finished rather than for finishing it.** A shelved spec reads as complete. A "closure" reads as
complete. A causal claim reads as complete. The repo's own law is the opposite — *"an honest gap
is a contribution; an invented fact is sabotage"* — and a *prematurely closed* item is the
quieter version of an invented fact.

## WHAT I WOULD DO NEXT, IN THIS ORDER

1. **L1 re-test with the correct estimand** — completion over expected, with `air_yards`,
   `pass_length` and field position in the baseline. ~1 h, data in hand. This is the only way to
   know whether §4 killed a hypothesis or killed a design.
2. **L3's redistribution half** — `U_i` from `practice_status`, `w_j` from `snap_counts`. No
   market data needed. ~1 h, data in hand.
3. **Unblock E2 and F4** — the join is solved and the columns are populated.
4. **Add a sign-stability-across-folds gate** to the lab method, and re-read every prior spec
   against it.
5. **Port the certificate to TS only after prediction 2 in `HANDOFF-FOR-AGENT.md` survives.**
