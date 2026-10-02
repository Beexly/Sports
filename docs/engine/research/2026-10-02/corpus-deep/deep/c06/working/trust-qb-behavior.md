# Trust-Signal / QB-Behavior Deep Research — c06 Slice

**Date:** 2026-10-02 | **Analyst:** subagent d69d0f3d | **Scope:** TRUST-SIGNAL / QB-BEHAVIOR claims in corpus slice c06
**Thesis under test:** "the safety blanket is a person, not a position" — QBs concentrate targets on trusted receivers (Rodgers→Adams/Nelson/Cobb template) vs distributors (Keenum template). Target-concentration (HHI) is the candidate metric.

**Files read (fully):** `~/workspace/corpus-intelligence/maps/c06-map.md`; briefs `r22/nflverse-data-catalog`, `d06/week3-multi-episode-transcripts`, `d04/stack-players-2026-09-13`, `d05/dfs-fulltables-README`, `d24/consensus-wr`, `d21/MISSION-BRIEF-2026-09-18`, `d22/report`.
**Source docs verified read-only:** `~/workspace/vendor/Sports/docs/nflverse-data-catalog.md`; `~/workspace/vendor/Sports/docs/dfs/research/2026-09-25/week3-multi-episode-transcripts.md`; `~/workspace/vendor/Sports/docs/dfs/research/2026-09-13/deep/stack-players-2026-09-13.md`; `~/workspace/vendor/Sports/scripts/analytics/qb-age-rb-target-share.mjs`; `~/workspace/vendor/Sports/packages/prediction-engine/src/trend-discovery.ts`.
**Bonus source-doc find (NOT in c06 — no c06 brief exists for it):** `~/workspace/vendor/Sports/docs/fantasy/research/2026-09-24/keenum-target-splits.md` (identical copy also at `~/workspace/vendor/Sports/docs/research/2026-09-24/keenum-target-splits.md`).

---

## 1. Verified claims (status per claim)

### 1a. Old-QB RB dump rate — VERIFIED AS REPORTED, with caveats (see §2)
- **Claim:** RB share of team targets is +14.7% relative when the starting QB is 34+ vs <34 (20.9% vs 18.2%), z=8.0, p=1.3e-15, n=4,936 team-weeks, 2016–2024, concentrated in the 37+ cohort.
- **Source:** `~/workspace/vendor/Sports/docs/nflverse-data-catalog.md` lines 48–54; computation script `~/workspace/vendor/Sports/scripts/analytics/qb-age-rb-target-share.mjs`; test helper `~/workspace/vendor/Sports/packages/prediction-engine/src/trend-discovery.ts` (`welchCompare`, lines 97–109).
- **Math review of the script:** sound. Team-week aggregation from nflverse `player_stats` (targets by position, grouped on `recent_team`/`week`); starter = QB with most attempts (≥10); age from roster `birth_date` as of Sep 1 of season; `MIN_TEAM_TARGETS=12` floor; standard Welch two-sample with normal-approx p. The `trend-discovery.ts` Welch helper is textbook-correct (variance/n pooling, two-sided p).
- **Arithmetic cross-checks (computed by hand):**
  - p at z=8.0: two-sided normal P(|Z|>8) ≈ 1.24e-15 ≈ 1.3e-15. ✓ Consistent.
  - Relative lift from the rounded means: (20.9−18.2)/18.2 = 14.8%, doc states 14.7%. INFERENCE: doc computed from unrounded means; rounding noise only, not a discrepancy.
  - **Sample-size ceiling check (INFERENCE, not yet run against data):** regular-season team-weeks 2016–2024 max out at 5×32×16 + 4×32×17 = **4,736**. The reported n=4,936 exceeds that by 200, which is consistent with nflverse `player_stats` including **postseason weeks** (13 playoff games × 2 teams × 9 seasons = 234, minus the 12-target floor drops ≈ 200 surviving). So the cohort almost certainly includes playoff game scripts. This is not stated in the doc and should be confirmed by re-running the script with season-type filtering.
- **Status: cohort-level behavioral signal is real and the implementation is sound.** It is usable as an *age-conditional prior dimension*, not as an individual-QB rule (see §2 Challenge A).

### 1b. Goedert absence split — VERIFIED AS TRANSCRIBED, small-n
- **Claim:** Goedert 18.8% targets-per-route with A.J. Brown on field vs 27.1% off (last 2 seasons); 40.9% of PHI's inside-the-10 targets in 2025.
- **Source:** `~/workspace/vendor/Sports/docs/dfs/research/2026-09-13/deep/stack-players-2026-09-13.md` line 65, attributed to USA Today and marked "verified" in-file.
- **Status: confirmed present in source.** The same file (line ~78) flags that the without-Brown samples are "2-4 games with inconsistent definitions" — so the 27.1% is a small-n point estimate. Treat as a *measurable phenomenon* (absence-driven concentration), not a precise parameter. The 40.9% inside-the-10 share is a full-season 2025 stat — firmer.

### 1c. Barkley YBC collapse — VERIFIED AS TRANSCRIBED
- **Claim:** yards before contact/att 3.55 (RB-best) → 2.11 (23rd); explosive rate 7.2% → 4.6%; YAC 2.26 → 1.96.
- **Source:** `~/workspace/vendor/Sports/docs/dfs/research/2026-09-13/deep/stack-players-2026-09-13.md` line 56, attributed to Fantasy Points Data. Confirmed present verbatim.

### 1d. Keenum "spreads it around" — VERIFIED AS COMPUTED (out-of-slice source doc, no c06 brief)
- **Claim:** Keenum career positional target split (n=2,270 targets, 2013–2023) is WR 59.6% / TE 20.4% / RB-FB 20.0% vs league 59.3% / 20.9% / 19.7% (n=203,055) — i.e., **no career positional favoritism**.
- **Source:** `~/workspace/vendor/Sports/docs/fantasy/research/2026-09-24/keenum-target-splits.md` (data: nflverse PBP 2013–2023 cached parquets; every number from data except flagged football-knowledge alignment notes).
- **Also verified in same file:** layoff-return games (10 games, n=323 targets): WR 62.2% / TE 20.1% / RB-FB 17.6% — no checkdown spike when rusty at the position level. Single-game blankets: Chris Thompson 10/43 (23.2%) 2019-W1; Jarvis Landry 8/32 (25%) 2021-W7; Noah Brown 11/34 (32.4%) 2023-W15; Landry 8/24 (33.3%) 2022-W18.
- **Status: the strongest in-repo empirical support for the "safety blanket is a person, not a position" thesis** — but it reports positional shares + top-individual targets, not a formal HHI. The file itself states the blanket pattern is "suggestive, not predictive" (single-game variance) and confounded by scheme (Gruden's WAS, Stefanski's CLE, Ryans/Slowik's HOU). The blanket followed the *separation-friendly role* (slot, receiving RB, WR1), not a fixed position.

### 1e. Map's "only 1 brief mentions HHI" — CONFIRMED
- grep over all c06 briefs for `\bhhi\b|herfindahl`: exactly 1 hit — `c00/0983-three-point-rule-synthetic-control.brief.md`, where HHI = Σ team point-share² used as a **basketball scoring-concentration** metric. Zero connection to QB target concentration.
- Broader grep (`concentration|gini|entropy`): 17 briefs, all incidental uses ("concentration" in prose, entropy in ML papers, the d04 Goedert split). None define or compute a receiver-target concentration metric.
- Repo code Herfindahl uses (`packages/data-ingestion/src/*-markets.ts`) are all **market-side** (vote/handle concentration), not target-side.
- **Status: CONFIRMED — c06 has no in-slice methodological counterpart for target-concentration/HHI.** Note: the machinery lives elsewhere in the corpus (c01-map: "HHI / target concentration / top-1 & top-2 target share — the canonical QB fixation measure (Rodgers template), recomputed in DFS, props, and profile research independently"; c05-map: Masked-Minka Dirichlet-multinomial share modeling as "the trust-target/HHI machinery"). The Rodgers HHI 0.141 career / 0.112 2025 figures cited in the c06 map come from those other slices, not from c06 briefs (zero "rodgers" hits in c06 briefs).

---

## 2. Challenges (weak / overstated claims, named)

### Challenge A — Old-QB dump rate is a cohort tendency; the map's "individual rule" warning is correct and should be stronger
- The 34+ cohort over 2016–2024 is dominated by a handful of QB-scheme pairs (Brady, Brees, Rivers, Roethlisberger, Ryan, Wilson, Rodgers). INFERENCE: the "concentrated in the 37+" note likely reflects specific receiving-back usages (Kamara, Ekeler, White, McCaffrey-adjacent schemes) more than aging per se.
- Methodological gaps in the script: (1) starter attribution by most-attempts ≥10 misattributes injury-relief weeks (backup with most attempts gets the starter's age); (2) no team/scheme fixed effects; (3) postseason weeks likely included (see §1a) — playoff scripts differ; (4) age as of Sep 1 is fine but the cutoff 34 is post-hoc (the doc's "37+ concentration" suggests the 34 line was chosen after seeing buckets).
- **Verdict:** use as an age-conditional prior with per-QB hierarchical shrinkage; a QB at 41 (Rodgers) sits in the extreme cohort but his *individual* checkdown rate must be estimated from his own targets, not read off the cohort mean.

### Challenge B — Coverage-conditional tendencies from week-3 transcripts are UNVERIFIED host assertions, not computed numbers
All numbers below are confirmed present in `~/workspace/vendor/Sports/docs/dfs/research/2026-09-25/week3-multi-episode-transcripts.md` (lines 63–65, 88), but that file is itself an intake read of a 14,794-unit podcast-transcript docx. The numbers are analyst claims with **no denominators, no n, no computation** — mark each UNVERIFIED as a quantitative metric:
1. **"Cam Ward targets first read 84% when unpressured"** (line 63; Tate breakout mechanism). UNVERIFIED — no sample size; ceiling is Weeks 1–2 of a rookie's career (~50–60 dropbacks, unpressured subset smaller). Two games cannot support an 84% point estimate.
2. **"Geno Smith targets Wilson on 44% of routes vs man; 33% of targets when blitzed; 14/19 for 9.0 YPA vs blitz this year"** (line 64). UNVERIFIED — the one hard n given (19 blitz attempts) is tiny; the 44% vs man has no stated denominator over a 2-game window. "44% of routes" vs "33% of targets" also mixes denominators (per-route vs per-target), a classic chart-reading slip.
3. **"Drew Lock targets JSN on 41% of blitz dropbacks (4.8 YPRR)"** (line 65). UNVERIFIED — no n, no window stated. (The adjacent claim "JSN targeted on 39% of dropbacks vs blitz since start of last year" names a window — better grounded as a hypothesis, still a host assertion.)
4. **"Drake Maye 'terrible against cover six'"** (line 88). UNVERIFIED and not even numeric — qualitative host language, supported only by the Week-1-vs-SEA 3-INT anecdote. JAX "2nd-most cover-six since start of 2025" is the only countable part.
- **Verdict:** these are hypothesis seeds for the coverage×situation tendency cells, not features. The map's finding #2 ("price coverage×situation tendencies") should be reworded: the *construct* is buildable from charting data (see §3), but these *values* are not evidence.

### Challenge C — The d05 chart-sweep numbers are transcriptions with honest PARTIAL flags; do not treat axis-read values as data
- `d05/dfs-fulltables-README.brief.md` is admirably honest: several charts are PARTIAL (values approximated from axes), ranks unreadable, thin-sample flags noted. The QB read-distribution chart (@sfdata9ers: first/second read, designated receiver, checkdown, scramble shares; min 15 plays, FTN data) is the closest in-slice artifact to a trust metric — but it is a **per-QB outcome split, not a concentration metric**, and Week 2 only.
- Do not promote "≈70 WRs first-read share vs 1D/RR" scatter positions into a dataset; they are un-labeled chart coordinates.

### Challenge D — d04's Goedert split is directionally real, numerically fragile
- Same-file caveat: without-Brown samples are 2–4 games with inconsistent definitions (line ~78). A 27.1% TPRR off an ~2-game sample has a standard error on the order of ±8–10 pp. The *delta construct* (absence-driven concentration) is the durable takeaway; the *8.3 pp number* is not a parameter.

### Challenge E — "Trust" in c06 is behavioral-proxies only; no attitudinal trust signal exists in-slice
- Everything trust-adjacent in c06 is target-distribution behavior. There is no press-conference / beat-writer / quote-mining trust signal in c06 (c09-map confirms the Rodgers-video lesson has no corpus counterpart). Do not conflate "target concentration" with "trust" in feature naming — the measurable object is concentration; "trust" is the interpretation (INFERENCE).

---

## 3. Buildable trust metrics (formulas + nflverse fields)

All metrics below are directly computable from free nflverse play-by-play unless flagged. Field names are the nflfastR/nflverse `pbp` column names.

**Unit of analysis:** QB-season or QB rolling window (recommend ≥150 targeted attempts; shrink below that — see c05 Dirichlet machinery).

### M1 — Target HHI (the core trust-concentration metric)
```
share_i = targets_i / targets_total        (over receivers i with ≥1 target)
HHI_qb  = Σ_i share_i²                      ∈ [1/n_receivers, 1]
EffN    = 1 / HHI_qb                        (effective number of trusted targets)
```
- Fields: `passer_player_id` (or `passer_player_name`), `receiver_player_id`, filter `pass_attempt == 1`, exclude `qb_spike`, `aborted_play`, sacks (no receiver).
- INFERENCE — interpretation guide: HHI ≈ 0.10 ↔ EffN ≈ 10 (spread); HHI ≈ 0.20 ↔ EffN ≈ 5 (concentrated); HHI ≈ 0.33 ↔ EffN ≈ 3 (blanket). The c06 map's Rodgers 0.141 career / 0.112 2025 (from other slices) would read as EffN 7.1 → 8.9, i.e., *less* concentrated in 2025 — directionally testable once recomputed in-slice.
- Companions: top-1 share, top-2 share (c01 already recomputes these independently).

### M2 — Situational concentration deltas (pressure/leverage trust)
```
HHI_qb | 3rd down        (filter down == 3)
HHI_qb | red zone        (filter redzone == 1; inside-10: yardline_100 <= 10)
HHI_qb | trailing 4Q     (filter qtr == 4 & score_differential < 0)
Δ_trust = HHI_qb|situation − HHI_qb|baseline
```
- Fields: `down`, `redzone`, `yardline_100`, `qtr`, `score_differential`. All in pbp.
- Rationale: the blanket shows up under stress (Keenum study: return-game blankets were single-game, situational). A QB whose HHI spikes on 3rd down / in RZ has a measurable trust circle.

### M3 — Absence-driven concentration (the Goedert construct, formalized)
```
For alpha receiver A, per QB q:
  share_p|A_on   = targets_p / targets_total   over games A active
  share_p|A_off  = targets_p / targets_total   over games A inactive (0 targets)
  Δ_p            = share_p|A_off − share_p|A_on      (beneficiary lift)
  Δ_HHI          = HHI_q|A_off − HHI_q|A_on          (does the pie concentrate?)
```
- Computable from pbp alone at game grain (A active = ≥1 target that game). Route-grain version (TPRR delta) needs charting — see Gaps.
- Shrink small samples: without-A samples are typically 1–4 games (d04's own caveat). Use Beta-Binomial shrinkage toward the with-A share (c05 share-core recipe).

### M4 — First-read / checkdown distribution (d05-adjacent, charting-gated)
- The @sfdata9ers "QB Read Distribution" chart (first/second read, designated receiver, checkdown, scramble shares; FTN data, min 15 plays) is the template. **First-read rate and checkdown rate are NOT in nflverse pbp** — no read-progression field. Replicable only via FTN charting or manual charting.
- Partial pbp proxy: `air_yards` distribution by QB (checkdown proxy: share of attempts with air_yards < 5 and behind-LOS target) — computable, but it measures *throw depth*, not *read number*. Do not label it "first-read rate."

### M5 — Coverage-conditional target shares (hypothesis from d06, NOT pbp-computable)
```
share_i|coverage = targets_i,coverage / targets_total,coverage
```
- **Requires charting:** nflverse pbp has no man/zone or blitz-coverage field. Nearest free source: `ftn_charting` family (2022+, has motion/PA/RPO/box counts — coverage shells unconfirmed in-slice); confirmed coverage sources are paid (Fantasy Points Data Suite, PFF, SumerSports) or creator-charted (@MagicSportsGuy's man/zone + Cover 1/3/4 splits, @statyxio Route IQ).
- Until coverage charting is wired, the d06 numbers (Ward 84%, Geno→Wilson 44%, Lock→JSN 41%) are hypotheses to test *after* the feed exists — not inputs.

### Compositional modeling (cross-slice pointer)
- c05-map's Masked-Minka Dirichlet-multinomial share fit + Beta-Binomial×trials mixture is the correct likelihood for target shares (teammate shares sum to team total). Wire M1–M3 estimates through it rather than treating shares as independent.

---

## 4. Gaps

1. **No target-HHI anywhere in c06** (confirmed §1e). The metric must be built fresh; canonical definition to adopt is M1 above, cross-checked against c01's independent Rodgers-template recomputation.
2. **Routes run are not in nflverse pbp.** TPRR-based trust metrics (Goedert-style 18.8%→27.1%) need FTN charting or equivalent; pbp supports only per-target shares (M1–M3 at target grain). Any "targets per route" claim imported from creators must carry its charting source.
3. **Coverage/blitz fields absent from pbp.** All coverage-conditional trust claims (d06) are untestable in-engine until a charting feed (FTN/Fantasy Points/PFF/Sumer) is wired. The PFF/SIS/NGS acquisition need (map gap) stands.
4. **Keenum study has no c06 brief** — it was found via source-doc grep, not the brief pipeline. If it belongs to another slice's map, cross-link it; otherwise it is unmapped intelligence. Its method (nflverse PBP 2013–2023, n=2,270 Keenum targets) is the template for per-QB trust profiles.
5. **Postseason inclusion in the old-QB script is unconfirmed** (INFERENCE from the n=4,936 > 4,736 ceiling). Re-run with `season_type` filtering before citing n or z in any external/production context.
6. **No attitudinal trust signal** (quotes, pressers, beat writers) in c06 — the interpretation layer ("trust") has no non-behavioral measurement in-slice.
7. **180-QB metrics table (2026-10-01, cited in c06-map)** could not be located by filename search in `~/workspace/vendor/Sports/docs/` — verify where it lives before claiming it as the HHI vehicle.

---

## Bottom line for the parent

- **Keep:** old-QB dump rate as an age-conditional *prior* (math verified, z=8.0/p=1.3e-15 arithmetic consistent; confirm postseason inclusion before production use); Goedert-style absence deltas as a *construct* (M3); the Keenum study as the per-QB trust-profile template (strongest empirical "person not position" evidence found, out-of-slice).
- **Demote:** all four week-3 coverage-conditional numbers to UNVERIFIED hypotheses (no denominators; Maye cover-6 isn't even numeric); the 27.1% Goedert figure to a small-n illustration.
- **Confirmed absent:** any HHI/target-concentration method in c06 (1 incidental basketball hit only) — build M1–M3 fresh from pbp; coverage-conditional (M5) waits on a charting feed.
- **Naming discipline:** the measurable object is *target concentration*; "trust" is the interpretation. Label features accordingly.
