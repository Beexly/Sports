# Deep verification: QB Pressure Indices proposal (c02 slice, work item a01)

- **Source file:** `~/workspace/vendor/Sports/docs/models/qb-pressure-indices-proposal.md` (68 lines, read completely)
- **Phase-1 map ref:** `~/workspace/corpus-intelligence/maps/c02-map.md`, finding #8
- **Phase-1 brief:** `~/workspace/corpus-intelligence/briefs/c02/c02-r44/docs__models__qb-pressure-indices-proposal.md.brief.md`
- **Analyst:** slice c02 deep-research subagent · **Date:** 2026-10-02
- **Scope note:** the source is a *pre-build math proposal* (68 lines, zero measured numbers). Verification here means: pinning exactly what the file claims, checking each claim against the repo checkout and against nflverse's actual data dictionaries, and stress-testing the math. Anything not in the file is marked **INFERENCE**.

---

## 1. VERIFIED CLAIMS

Format: claim — `file:line` — confidence. "HIGH" = verbatim in file. Lower grades explained.

### Index 1 — QB Pressure Sensitivity

1. **Formula (verbatim):** `sensitivity = EPA/dropback (clean pockets) − EPA/dropback (pressured)` — `qb-pressure-indices-proposal.md:16` — **HIGH**.
2. **Units/reporting:** "Reported in EPA per dropback, season-to-date, REG only. Higher = more pressure-fragile." — `:19-20` — **HIGH**.
3. **What it claims:** "how much a QB's per-play value degrades when pressured" — `:11` — **HIGH**.
4. **Source of the split:** "from play-by-play joined to FTN per-play charting (both nflverse)" — `:13` — **HIGH** (as a statement of intent; see Challenges §4.1 for whether the data exists).
5. **Null guard A:** "< 100 pressured dropbacks in the window → null (never a guessed split)" — `:23` — **HIGH**.
6. **Null guard B:** "if < 95% of the QB's dropbacks match an FTN row, null — a partial join is a silent bias" — `:24-25` — **HIGH**.
7. **Stated weaknesses** (file's own): FTN pressure is a human charting call, subjective at margins (`:28`); sensitivity conflates QB and line — "a QB pressured instantly has no clean baseline to be measured against" (`:29-30`); EPA inherits opponent strength, no opponent adjustment in v1 (`:31`) — **HIGH**.

### Index 2 — Protection Stress (team, weekly)

8. **Formula (verbatim):** `stress = pressure_rate_allowed − league_expected_rate(blitz_rate_faced)` — `:41` — **HIGH**.
9. **Expectation definition (verbatim):** "`league_expected_rate` is the season-to-date league regression of pressure rate on blitz rate (linear, refit weekly)" — `:44-45` — **HIGH**.
10. **Interpretation:** "Positive = the line gives up more pressure than its blitz exposure explains — losing one-on-ones." — `:45-47` — **HIGH**.
11. **What it claims:** "how hard the offensive line is being stressed, separated from blitz volume" — `:35-36` — **HIGH**.
12. **Source:** "from `pfr_advstats` (pressures, blitzes faced) per team-week" — `:38` — **HIGH** (as intent; column-level reality checked in §3).
13. **Null guards:** "< 3 team games → null; league fit uses ≥ batch of 32 team-weeks before any output (early-season → null, stated)" — `:49-50` — **HIGH**.
14. **Stated weakness:** "blitz count ≠ rusher quality; a simple linear expectation can't see scheme. v1 is a screen, not a verdict." — `:52-53` — **HIGH**.

### Program-level claims

15. **Derivation-only premise (verbatim block):** "Everything below derives ONLY from datasets already in the ingestion registry: `pfr_advstats` (live in `lib/nflverse/pressure-coverage.ts`), `pbp`, and `ftn_charting`. No new sources." — `:5-7` — **HIGH as a quote; LOW as a fact about this checkout.** Verification against the repo: there is **no** `lib/nflverse/` directory at all in this checkout (only `lib/statking/`), no `pressure-coverage.ts` anywhere the proposal's path implies, no artifact named an "ingestion registry" found by repo-wide grep (the phrase appears only in this proposal), and `pfr_advstats` has zero references under `lib/` or `docs/data-sources/`. The premise may hold on another branch or describe planned infra — in *this* checkout it is unverifiable. Flagged, not assumed.
16. **FTN-via-repo status:** the only FTN adapter in the checkout, `lib/statking/sources/adapters/ftnDataAdapter.ts`, is a stub: `adapter_status: "stubbed", activation_mode: "license_or_partner_required"`. Consistent with the NGS-internal doctrine lane (FTN direct = commercial), distinct from the free nflverse FTN mirror (§3).
17. **v1 usage bar:** "No pick-engine input in v1 — display + analyst use only until calibration says otherwise", surfaced in Players Lab (QB view) and matchup surfaces with the Stat Stability Grade + weakness line — `:57-60` — **HIGH**.
18. **Acceptance criteria:** owner approves the math in-file; pure derivations + tests (clean/pressured split fixtures, join-coverage guard, blitz-regression null path); bounded cached loader "like `pressure-coverage.ts`"; tracker line moves in the same commit — `:64-68` — **HIGH**. Note: criterion 3 references the same `pressure-coverage.ts` that does not exist in this checkout (see claim 15).

---

## 2. FORMULA SPEC (exact, implementable)

### Index 1 — `sensitivity(qb, season-to-date)`

```
Let D_qb   = set of the QB's dropbacks, REG season-to-date, each joined to an FTN row
Let P      = {d in D_qb : FTN labels d "pressured"}
Let C      = {d in D_qb : FTN labels d "clean"}

GUARD: |P| < 100                       → NULL
GUARD: |D_qb_matched| / |D_qb| < 0.95   → NULL   (FTN join coverage)

sensitivity = mean(epa over C) − mean(epa over P)     [EPA per dropback]
```

**Pinned from file:** difference of two means, clean minus pressured (`:16`); EPA per dropback units (`:19`); season-to-date REG window (`:19`); higher = more fragile (`:19-20`).
**Not pinned by file (implementer must decide — see §4.3):** the definition of "dropback" (file never defines it); which EPA column/variant; the join key; treatment of scrambles, spikes, kneels, throwaways; traded QBs; FTN label semantics.

### Index 2 — `stress(team, week)` (Protection Stress)

```
Per team-week (REG only), from pfr_advstats weekly pass rows summed over the team's QBs:
  dropbacks_tw           = Σ dropbacks
  pressured_tw           = Σ times_pressured
  blitzed_tw             = Σ times_blitzed
  pressure_rate_allowed  = pressured_tw / dropbacks_tw
  blitz_rate_faced       = blitzed_tw  / dropbacks_tw

League fit (refit weekly, season-to-date pool of team-weeks):
  OLS: pressure_rate_allowed ~ α + β · blitz_rate_faced     (file: "linear", :44-45)

GUARD: team games played < 3            → NULL
GUARD: team-weeks in the fit pool < 32  → NULL for every team (early-season null, :49-50)

league_expected_rate(blitz_rate_faced) = α̂ + β̂ · blitz_rate_faced
stress = pressure_rate_allowed − league_expected_rate(blitz_rate_faced)
```

**Pinned from file:** residual-vs-league-expectation structure (`:41`); linear regression on blitz rate (`:44-45`); weekly refit on season-to-date data (`:44`); both null guards (`:49-50`); positive = worse than blitz exposure explains (`:45-47`).
**Not pinned by file (see §4.3):** denominators of the two rates; whether the OLS has an intercept (assumed — "linear" regression conventionally includes one); weighting of team-week observations (by dropbacks? unweighted?); whether sub-3-game teams are excluded from the *fit* pool or only from *output*; PFR's own definitions of "pressured"/"blitzed".

---

## 3. DATA REQUIREMENTS (column-level)

### 3.1 What Index 1 actually requires — and the critical gap

Index 1 needs, per play: **a pocket-state label (pressured vs clean)** joined to pbp. Column-level needs:

| Need | nflverse pbp | nflverse `ftn_charting` release | Verdict |
|---|---|---|---|
| Play key | `game_id`, `play_id` ✓ | `nflverse_game_id`, `nflverse_play_id` ✓ | Join feasible |
| QB grain | `passer_player_id` / `passer_player_name` ✓ | — (no player key at all) | Must come from pbp side |
| Dropback flag | `qb_dropback` ✓ (INFERENCE on exact def — verify in dictionary; nflverse defines it as pass attempt/sack/scramble) | — | pbp side |
| EPA | `epa` ✓ | — | pbp side |
| Season/week/type | `season`, `week`, `season_type` ✓ | `season`, `week` ✓ | pbp side |
| **Per-play PRESSURED label** | **✗ — pbp has `qb_hit` only; no hurry/pressure column** | **✗ — the published 29-column FTN release contains NO pressure column** | **BLOCKED on nflverse alone** |

**The FTN-release gap is verified, not inferred.** The official nflverse FTN charting data dictionary (`nflreadr.nflverse.com/articles/dictionary_ftn_charting.html`, read 2026-10-02) lists exactly 29 fields: game/play ids, season, week, `starting_hash`, `qb_location`, `n_offense_backfield`, `n_defense_box`, `is_no_huddle`, `is_motion`, `is_play_action`, `is_screen_pass`, `is_rpo`, `is_trick_play`, `is_qb_out_of_pocket`, `is_interception_worthy`, `is_throw_away`, `read_thrown`, `is_catchable_ball`, `is_contested_ball`, `is_created_reception`, `is_drop`, `is_qb_sneak`, `n_blitzers`, `n_pass_rushers`, `is_qb_fault_sack`, `date_pulled`. **No `is_pressure` / `was_pressure` / hurry field exists in the nflverse-published subset.** (Some third-party summaries describe FTN charting as including "QB pressure" — the authoritative dictionary contradicts that for the nflverse release. The full commercial FTN feed may chart pressure; the free nflverse mirror does not publish it.)

Related facts, all verified:
- nflverse FTN charting covers **2022 onward only** (per nflreadr docs; ~48k plays/season). Index 1 is impossible before 2022 on any nflverse path.
- nflverse `pbp_participation` *does* carry `was_pressure` — but it is released **only after the season ends** (FTN-sourced), so it cannot feed an in-season "season-to-date, refit weekly" index.
- The nflverse FTN release is charted within ~48h of each game — a "season-to-date" index built on it lags reality by up to 2 days plus pull cadence. The file never states an as-of rule.

**Consequence:** Index 1 as specified is **unbuildable from nflverse alone**. It requires a play-level pressure label from outside nflverse: the commercial FTN direct feed (note the repo's `ftnDataAdapter` is stubbed `license_or_partner_required` — consistent), PFF charting (commercial), or a labeled proxy. The file's premise — "derives ONLY from datasets already in the ingestion registry… (both nflverse)" (`:5-7`, `:13`) — does not survive contact with the actual nflverse schemas.

### 3.2 The phase-1 `qb_hit` proxy — assessment: VIOLATES the spec

The phase-1 pipeline (`scripts/situational-edges.py`) builds its pressure feature as, verbatim from its own docstring (line 245): **"Pressure is qb_hit divided by dropbacks"** — team-week `qb_hit` counts over (`pass_attempt` + `sack`) dropbacks, REG only, min-30-dropback gate (lines 50–62, 95–96, 158–159, 198–199). Assessed against the spec:

1. **Letter of the spec:** violated. The spec mandates an FTN-charting clean/pressured split with a 95% join-coverage guard (`:13`, `:24-25`). Substituting `qb_hit` is a *source substitution*, and the file's own doctrine — "a partial join is a silent bias" (`:25`) — is precisely about not quietly replacing the mandated label source.
2. **Substance:** `qb_hit` ≠ pressure. In the standard taxonomy (PFR's: pressured ≈ hurried + hit + sacked), a QB-hit is a strict subset of pressures. Using it as the "pressured" set:
   - **Mislabels hurried-but-not-hit plays as "clean"**, dragging the clean baseline down and **attenuating** sensitivity toward zero (the clean group contains degraded plays).
   - **Includes hits that did not affect the play** (e.g., a late hit after release, or a hit on a completed deep shot) in the "pressured" set, adding noise in the other direction.
   - **Misses sacks-without-hit-flag edge cases** and inherits nflverse `qb_hit` missingness (NA handling unstated in the pipeline).
   - Operates at **team-week grain**, while the spec's index is **per-QB** — a different estimand.
3. **Verdict:** the `qb_hit` proxy does not satisfy the spec and must never be reported as the spec's `sensitivity`. If used at all as a stopgap, it must be labeled exactly what it is — a `hit_rate_proxy`, not pressure sensitivity (this matches the independent M89 casebook convention found during verification: label it `hit_sack_pressure_proxy`, never "full pressure"). The 100-pressured-dropback and 95%-join guards cannot even be evaluated on the proxy path, since neither "pressured dropbacks (charted)" nor "FTN join coverage" exists there.

### 3.3 What Index 2 actually requires — buildable from nflverse

Index 2 is the buildable half. nflverse `load_pfr_advstats(seasons, stat_type="pass", summary_level="week")` publishes weekly PFR advanced passing rows at (game, team, player) grain including, per the nflreadr reference docs (example output read 2026-10-02): `times_sacked`, `times_blitzed`, `times_hurried`, `times_hit`, `times_pressured`, `times_pressured_pct`, plus `def_` variants. Column-level needs:

| Need | Source column | Notes |
|---|---|---|
| Team-week grain | `season`, `week`, `game_type`, `team` | Filter `game_type == "REG"` (file: REG only, `:19`; Index 2 inherits — INFERENCE that REG-only applies to Index 2, the file states it under Index 1; the pfr path says "per team-week" without restating REG — flag as mild ambiguity) |
| Pressures faced | `times_pressured` summed over team's QB rows | PFR taxonomy: pressured ≈ hurried + hit + sacked (**INFERENCE** — PFR's exact dedup rule not verified; confirm before wiring) |
| Blitzes faced | `times_blitzed` summed over team's QB rows | PFR "blitz" definition (5+ rushers? — **INFERENCE**, unverified; confirm in PFR glossary) |
| Dropback denominator | attempts + sacks | File never states the denominator (**ambiguity**, §4.3); `times_pressured_pct` exists in PFR but its denominator should be confirmed rather than assumed |
| Coverage | 2018+ weekly | Verified via nflverse docs |

No charting needed. No new sources needed. Index 2 is fully buildable from nflverse today.

---

## 4. CHALLENGES (weaknesses found)

### 4.1 Foundational: the data premise fails verification (highest severity)

- The file's load-bearing premise — all three datasets "already in the ingestion registry", with `pfr_advstats` "live in `lib/nflverse/pressure-coverage.ts`" (`:5-7`) — is **unverifiable in this checkout**: no `lib/nflverse/` directory exists, no `pressure-coverage.ts`, no "ingestion registry" artifact (phrase occurs only in this file), zero `pfr_advstats` references under `lib/` or `docs/data-sources/`. Either the proposal was written against a different branch/state, or the registry is aspirational. **Do not treat the premise as true when scheduling the build.**
- Worse, the single hardest data requirement — a per-play pressure label inside nflverse — **does not exist**: not in pbp (only `qb_hit`), not in the nflverse FTN release (29-column dictionary has no pressure field), and the one nflverse source that has it (`pbp_participation.was_pressure`) is post-season-only. **Index 1 cannot be built from nflverse as specified.** The "No new sources" constraint (`:7`) is therefore in direct tension with Index 1: honoring it means Index 1 stays unbuilt until/unless the commercial FTN feed (or equivalent charting) is licensed — which *is* a new source in practice.

### 4.2 Null guards: asserted, never justified

The file states five numeric gates and derives zero of them:

| Guard | File | Justification in file | Assessment |
|---|---|---|---|
| < 100 pressured dropbacks → null | `:23` | None | **Arbitrary value, defensible direction.** INFERENCE on defensibility: a full-time starter faces pressure on ~1/3 of ~550 dropbacks ≈ ~180 pressured dropbacks/season, so 100 ≈ a half-season starter minimum — sane as a "no backups, no tiny samples" gate. But no power analysis: with σ(EPA/dropback) ≈ 0.7–1.0, SE of the clean−pressured difference at n_pressured=100, n_clean≈300 is ≈ 0.08–0.12 EPA — large relative to plausible sensitivity values (~0.3–0.5). The file never shows the threshold achieves any stated precision. |
| < 95% FTN join coverage → null | `:24-25` | "a partial join is a silent bias" (rationale, not derivation) | **Direction sound, value arbitrary.** INFERENCE: the bias concern is real — FTN missingness could correlate with team/game (e.g., charting lag) — but 95% vs 90% vs 99% is undefended. |
| < 3 team games → null | `:49` | None | **Arbitrary.** INFERENCE: 3 games ≈ ~100 team dropbacks, a plausible minimum for a rate; undefended. |
| ≥ 32 team-weeks for the league fit | `:49-50` | None ("early-season → null, stated") | **Bare-minimum OLS floor, noisy.** 32 team-weeks ≈ one full league week (less with byes — so in practice the gate likely binds through week 2). A 2-parameter fit on ~32 points has wide β̂ intervals; the file gates *output* on fit size but never gates on *fit quality* (no R² / SE(β̂) check). INFERENCE: consider also requiring a minimum t-stat or widening the gate. |
| REG-only | `:19` | None | **Stated, unjustified.** INFERENCE: defensible (playoff opponent strength and game scripts differ; keeps weekly refit clean), but it also discards the highest-leverage games and the file never says so. |

### 4.3 Edge cases, ambiguities, unstated assumptions

**Index 1:**
1. **"Dropback" is never defined.** nflverse `qb_dropback` vs `pass_attempt + sack` vs attempts-only changes both the denominator and which plays enter each EPA mean. Scrambles are the sharp edge: a scramble is usually *caused by* pressure — is it a "pressured dropback" with rushing EPA, or excluded? The file is silent; the choice moves the number materially.
2. **Which EPA?** nflverse `epa` vs air-EPA variants, penalty handling, aborted snaps — unstated.
3. **Join key unstated.** Presumably `(nflverse_game_id, nflverse_play_id)` (the FTN release carries both, plus its own `ftn_play_id`), but the file never says; the 95% guard is meaningless without the key.
4. **FTN label semantics unstated.** The file leans on "FTN's human charting call" (`:28`) — but the nflverse FTN release has no pressure label at all (§3.1), so whatever label source is eventually used, its codebook (hurry vs hit vs pressure; QB-fault handling) must be specified. The file's acceptance tests ("clean/pressured split fixtures", `:65-66`) cannot be written until it is.
5. **Traded / multi-team QBs:** season-to-date per QB — pooled across teams or split? Unstated. (Pooled mixes lines; split re-triggers the 100-dropback guard.)
6. **Selection effect of the 100-pressured-dropback guard (INFERENCE):** bad QBs behind bad lines reach 100 pressured dropbacks *faster* than good QBs behind good lines. The published leaderboard will therefore overselect QBs in bad situations — the exact population where the file's own "conflates QB and his line" weakness (`:29-30`) bites hardest. The guard meant to ensure precision also induces selection bias. The file does not acknowledge this.
7. **"Season-to-date" as-of is unstated** interacting with the ~48h FTN charting lag: is the index computed on charted-through-Sunday data mid-week, or frozen at pull time? Affects reproducibility.
8. **Pre-2022 seasons impossible** on the nflverse FTN path (2022+ only) — unstated; any backtest before 2022 needs another label source.

**Index 2:**
9. **Rate denominators unstated** (`:41`): per dropback? per pass attempt? PFR ships `times_pressured_pct` but the file doesn't say to use it or define the quotient. Reproducibility gap.
10. **Regression underspecified** (`:44-45`): intercept assumed but not stated; weighting (by dropbacks? unweighted?) unstated — unweighted OLS lets a 25-dropback team-week (backup QB, week 18) pull the league line as hard as a 45-dropback one; fit-pool inclusion rule for sub-3-game teams unstated (excluded from output, but are they in the fit?).
11. **Blitz rate is endogenous — the "separation" is partial (INFERENCE, not in file).** Defenses choose blitz volume *in response to* the offense: they blitz bad lines and statuesque QBs more, and blitz less against QBs who punish it. Regressing pressure on blitz rate and calling the residual "line losing one-on-ones" treats blitz rate as an exogenous exposure. It isn't. The file's stated weakness ("blitz count ≠ rusher quality", `:52`) covers *who* rushes, not *why* they were sent.
12. **QB-fault sacks inflate "Protection Stress" (INFERENCE).** PFR `times_pressured` includes sacks without fault attribution (unlike FTN's `is_qb_fault_sack`, which isn't in the nflverse release anyway). A QB who holds the ball makes his *line* look stressed. The index claims to measure the OL (`:35`) but inherits QB behavior — the mirror image of Index 1's stated QB/line conflation, unstated here.
13. **Time-to-throw confound (INFERENCE):** quick-game offenses (short TTT) suppress both pressure rate and blitz effectiveness; the league regression pools them with deep-drop offenses, so residuals partly measure scheme, not trench play. The file's "can't see scheme" (`:53`) gestures at this but doesn't name the mechanism.
14. **REG-only inheritance is ambiguous** for Index 2: stated under Index 1 (`:19`); Index 2's team-week path (`:38`) doesn't restate it. Presumably intended; confirm.
15. **Weekly refit instability:** "refit weekly" on season-to-date data (`:44`) means early-season stress values swing as the league line moves — the ≥32 team-week gate (`:49-50`) prevents *output* but the first publishable weeks still rest on a ~32–64-point fit. No fit-quality gate.

### 4.4 Challenge: QB-quality confounding of `sensitivity` — NOT addressed by the spec

The task's challenge question: *is `sensitivity` confounded by QB quality (bad QBs face more pressure AND perform worse under it)? Does the spec address this?*

**Answer: yes, it is confounded, and no, the spec does not address it.** What the spec *does* say is adjacent but different:

- The file's stated weakness — "Sensitivity conflates QB and his line: a QB pressured instantly has no clean baseline to be measured against" (`:29-30`) — is about **line quality contaminating the clean baseline** (instant pressure → the "clean" sample is a selected, non-representative subset; and a QB with no time never generates clean dropbacks at all). That is a *within-QB measurement* problem.
- The challenge is a **cross-QB comparison** problem, and it has (at least) three channels, none named in the file:
  1. **Level confound:** worse QBs have worse EPA/dropback in *both* states, and the *gap* plausibly scales with QB quality too (a bad processor degrades more under duress). Ranking QBs by raw `sensitivity` mixes "fragile under pressure" with "bad at football."
  2. **Exposure confound:** worse QBs (and worse lines/schemes around them) *face* more pressure — so the pressured sample for a bad QB is both larger and drawn from worse situations (more 3rd-and-longs, worse field position). The two means being differenced are not situation-matched, within or across QBs.
  3. **Behavioral confound (INFERENCE):** pressure isn't randomly assigned — QBs who hold the ball (deeper drops, longer reads) *cause* more of their own pressure. `sensitivity` then partly measures "plays long enough to get pressured," and cross-QB comparisons mix pocket-clock discipline with fragility.
- The file also explicitly disclaims opponent adjustment (`:31`), which is one more unmodeled confound stacked on the same estimand.
- **What would address it (INFERENCE, not in file):** report sensitivity alongside — or normalized by — the QB's clean-pocket baseline (a ratio or z-vs-own-baseline rather than a raw gap for cross-QB ranking); situation-match or regression-adjust the two means (down/distance/field position/pass-depth mix); or shrink toward a QB-quality prior. v1 does none of this, and its display-only gating (`:59-60`) is the file's only defense — which is honest but thin: a confounded number with a weakness label is still a confounded number.

### 4.5 Smaller but real

- **Acceptance criterion 3 is circular in this checkout:** "Loader stays bounded + cached like `pressure-coverage.ts`" (`:67`) references the file that doesn't exist here (claim 15). A builder cannot satisfy it as written.
- **"Higher = more pressure-fragile" (`:20`) bakes in a causal reading** ("fragile") of a descriptive gap. The file's own weaknesses undercut the label; consider "larger degradation" as the neutral display name.
- **Stat Stability Grade dependency:** values surface "carrying the Stat Stability Grade (existing)" (`:57-58`) — the proposal never checks that the grade's methodology covers a *difference of two means* (its stability semantics were presumably built for single rates). INFERENCE: verify the grade composes; a difference has roughly √2× the noise of its components.

---

## 5. BUILDABLE SPEC (pseudocode-ready)

**Scope discipline:** Index 2 is buildable from nflverse pbp-adjacent data *today*. Index 1 is **not** — the recipe below is complete *conditional* on a play-level pressure label, with the mandatory-charting step called out. The `qb_hit` stopgap is specified separately and labeled non-compliant.

### 5.1 Index 2 — Protection Stress (buildable now, nflverse only)

```python
# Inputs (nflverse):
#   pfr = load_pfr_advstats(seasons, stat_type="pass", summary_level="week")
# Columns used: season, week, game_type, team, pfr_player_name,
#               times_pressured, times_blitzed, <dropback denominator>
# VERIFY FIRST: PFR's definition of times_pressured (dedup of hurried/hit/sacked),
#               PFR's definition of a blitz, and the denominator of times_pressured_pct.
#               Do not assume; read the PFR glossary + actual schema.

def team_week_rates(pfr, season, week):
    rows = pfr[(pfr.season == season) & (pfr.week == week) & (pfr.game_type == "REG")]
    # Aggregate QB rows to team-week (team index; multiple QBs pooled by design)
    g = rows.groupby("team").agg(
        dropbacks = ("<denominator>", "sum"),   # attempts + sacks; CONFIRM column
        pressured = ("times_pressured", "sum"),
        blitzed   = ("times_blitzed", "sum"),
        games     = ("game_id", "nunique"),
    )
    g["pressure_rate_allowed"] = g.pressured / g.dropbacks
    g["blitz_rate_faced"]      = g.blitzed   / g.dropbacks
    return g

def protection_stress(pfr, season, week):
    # Season-to-date pool, refit weekly per spec (:44-45)
    pool = concat(team_week_rates(pfr, season, w) for w in 1..week)
    # SPEC AMBIGUITY — decide and document:
    #   (a) include sub-3-game teams in the FIT pool? (spec only nulls their OUTPUT, :49)
    #   (b) weight observations by dropbacks? (spec silent; unweighted OLS is the literal read)
    #   (c) intercept included? (spec says "linear"; include it — document the choice)
    if len(pool) < 32:                      # :49-50
        return {team: NULL for team in pool.teams}   # early-season null, stated
    α, β = OLS(pool.pressure_rate_allowed ~ α + β * pool.blitz_rate_faced)
    # INFERENCE: consider also gating on fit quality, e.g. require |t(β)| > 2,
    # else the first publishable weeks ship noise. Not in spec — owner call.
    out = {}
    for team, tw in team_week_rates(pfr, season, week).rows():
        if tw.games < 3:                    # :49
            out[team] = NULL
        else:
            expected = α + β * tw.blitz_rate_faced
            out[team] = tw.pressure_rate_allowed - expected     # :41; + = losing 1v1s
    return out
```

Test hooks the spec already names (`:65-66`): blitz-regression null path (pool < 32 → all null), <3-game null, plus new: denominator-zero guard, single-QB-team aggregation.

### 5.2 Index 1 — sensitivity (NOT buildable from nflverse; charting mandatory)

```python
# MANDATORY PREREQUISITE (no nflverse path exists — §3.1):
#   Obtain a PLAY-LEVEL pressure label per (nflverse_game_id, nflverse_play_id).
#   Candidate sources: commercial FTN direct feed (repo adapter currently stubbed,
#   license_or_partner_required), PFF charting, or another charted label.
#   Do NOT substitute qb_hit and call it sensitivity (§3.2, §5.3).
#   Record the label codebook: what counts as "pressured" (hurry? hit? sack?
#   QB-fault?), because the acceptance-test fixtures (:65-66) depend on it.

def qb_sensitivity(pbp, charting, season, week):
    # pbp: nflverse play-by-play. charting: play-level pressure labels.
    plays = (pbp
        .filter(season_type == "REG", season == season, week <= week)
        .filter(<dropback definition>)          # SPEC GAP: file never defines "dropback".
                                                # Decide: qb_dropback==1? pass_attempt|sack?
                                                # Document scramble/spike/kneel handling.
        .join(charting, on=["nflverse_game_id", "nflverse_play_id"], how="left")
                                                # SPEC GAP: join key unstated; this is the sane key.
    )
    out = {}
    for qb, d in plays.groupby("passer_player_id"):
        matched = d[d.pressure_label.notna()]
        if len(matched) / len(d) < 0.95:        # :24-25
            out[qb] = NULL; continue
        pressured = matched[matched.pressure_label == "pressured"]
        if len(pressured) < 100:                # :23
            out[qb] = NULL; continue
        clean = matched[matched.pressure_label == "clean"]
        out[qb] = clean.epa.mean() - pressured.epa.mean()   # :16, EPA/dropback
    return out
```

Notes for the implementer (all INFERENCE / spec gaps): decide dropback definition before writing fixtures; decide traded-QB pooling; freeze an as-of rule for the 48h charting lag; pre-2022 seasons need a different label source entirely (nflverse FTN starts 2022).

### 5.3 `qb_hit` stopgap (if the program wants *something* before charting) — NON-COMPLIANT, label honestly

```python
# This is the phase-1 pipeline's existing construction
# (scripts/situational-edges.py:50-62, docstring :245): team-week
# qb_hit / (pass_attempt + sack), REG only, min 30 dropbacks.
# It is a HIT-RATE proxy at TEAM grain. It is NOT the spec's sensitivity:
#   - wrong label (hit ⊂ pressure; hurries misclassified as clean → attenuation bias)
#   - wrong grain (team-week, not per-QB)
#   - neither spec null guard (100 pressured dropbacks, 95% FTN join) is evaluable
# If shipped anywhere, name it `hit_rate_proxy` / `hit_sack_pressure_proxy`
# and NEVER `sensitivity`. The spec's Index 1 stays NULL until charting lands.
```

---

## 6. BOTTOM LINE FOR THE PARENT

1. **Formulas verified verbatim** — `sensitivity = EPA/dropback(clean) − EPA/dropback(pressured)` (`:16`); `stress = pressure_rate_allowed − league_expected_rate(blitz_rate_faced)` with a season-to-date linear league regression refit weekly (`:41`, `:44-45`). All five numeric guards verified as stated (`:23-25`, `:49-50`); **none is justified or derived in the file**.
2. **Index 2 (Protection Stress) is buildable from nflverse today** via `pfr_advstats` weekly pass (`times_pressured`, `times_blitzed` per team-week). Three PFR definitions need confirming before wiring (pressure dedup rule, blitz definition, rate denominator).
3. **Index 1 (sensitivity) is unbuildable from nflverse as specified** — the nflverse FTN release's 29-column dictionary contains **no per-play pressure field** (verified against nflreadr's official dictionary 2026-10-02); pbp has only `qb_hit`; the one nflverse source with a pressure flag (`pbp_participation.was_pressure`) is post-season-only. Charting from outside nflverse is mandatory; the file's "No new sources" (`:7`) conflicts with Index 1.
4. **The phase-1 `qb_hit` proxy violates the spec** in letter (mandated FTN split + join guard) and substance (hit ⊂ pressure, team grain, attenuation bias). Label any such stopgap `hit_rate_proxy`, never `sensitivity`.
5. **The data premise doesn't verify in this checkout**: no `lib/nflverse/pressure-coverage.ts`, no ingestion-registry artifact, no `pfr_advstats` references — the proposal appears written against a different branch/state. The acceptance criterion referencing `pressure-coverage.ts` (`:67`) is unsatisfiable as written.
6. **QB-quality confounding is real and unaddressed**: the spec's stated weakness covers line-contamination of the clean baseline (`:29-30`), not the cross-QB confound (bad QBs face more pressure *and* degrade more under it; pressure exposure is behaviorally self-selected). The 100-pressured-dropback guard additionally overselects QBs in bad situations (INFERENCE). Display-only v1 (`:59-60`) is the file's only mitigation.
7. **Unsigned ambiguities for the owner** (need in-file amendment per the tracker law, `:64`): dropback definition; EPA variant; join key; traded-QB handling; as-of/freshness rule; Index 2 rate denominators; OLS weighting/intercept/fit-pool inclusion; REG-only restatement for Index 2; fit-quality gate for the early-season league regression.
