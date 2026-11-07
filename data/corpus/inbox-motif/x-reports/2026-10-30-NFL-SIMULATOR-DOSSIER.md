# Repo dossier + reproduction — dgrifka/nfl_simulator ("Deserve-To-Win-O-Meter")

Run date: Fri 2026-10-30 (overnight sprint). Author: Derek Grifka, X @nfl_simulator.
Repo: https://github.com/dgrifka/nfl_simulator — the catch-up target from Garrett's
2026-10-30 phone-feed video (method post + CAR@GB post).

## REPRODUCTION VERDICT — read this first

The CAR@GB post (Week 8, Thu 2026-10-29, final Packers 27, Panthers 19) claimed:

| Claim (post) | Reproduced (shipped library, run here) | Verdict |
|---|---|---|
| Green Bay deserve-to-win **88%** / Carolina **12%** | p_home = **0.8799** → 88% / 12% at the poster's whole-percent display | **REPRODUCED EXACTLY** |
| Likely points GB **22.3** | plug-in deserved points **22.29** → 22.3 | **REPRODUCED EXACTLY** |
| Likely points CAR **12.7** | plug-in deserved points **12.68** → 12.7 | **REPRODUCED EXACTLY** |
| "40K simulations" | the shipped model runs exactly **40,000 draws** per game | **Number matches; the word "simulations" does not (see below)** |
| Method: every loose ball, field goal and drop re-priced (method post; "160K reruns" per Garrett's capture) | the shipped model never looks at a field goal, an extra point, a drop, a punt or a kickoff. There is no play re-pricing in it at all | **DOES NOT DESCRIBE THE SHIPPED MODEL** — it describes retired v1 (see §1) |

Control check: before trusting the run, the same pipeline reproduced the repo's own
published README example (CIN@CLE, Week 1 2025) to the digit — p_home 0.7488
(README: 0.7488), likely points 16.26 / 11.11 (README table: 16.3 / 11.1), same
play counts, yards and rates. The environment and data path are the author's.

### The CAR@GB inputs the number is built from (all from the scored row)

| | own plays N | own yards Y | takeaways T (return yds R) | folded success rate (K+T_s)/(N+T) | yards/play (Y+R)/N | likely points |
|---|---|---|---|---|---|---|
| GB (home) | 67 | 354 | 2 (4) | 33/69 = 0.478 | 5.343 | 22.29 |
| CAR (away) | 69 | 258 | 2 (17) | 26/71 = 0.366 | 3.986 | 12.68 |

- Deserved margin: **GB +9.61**. Actual margin: GB +8. Luck gap (actual − deserved,
  home view): **−1.61 points** — the final score slightly *understated* Green Bay's
  play. Carolina's 19 points included 6 from two made field goals (39 and 50 yards)
  that the model never credits to anyone; Green Bay also missed an extra point and
  lost a fumble on a kickoff return — both invisible to the model (see §6).
- Margin draws: mean +9.50, SD 5.98, 89% interval [−0.07, +18.98]. Note the
  mechanics: 94.4% of raw margin draws sit above zero, but the published percent is
  the mean of Φ(draw / 5.4528), which pulls it to 88.0%. The 88% is a smoothed
  share, not a raw win frequency of the draws.

---

## 1. WHAT IT IS

One deserve-to-win number per finished NFL game, computed only from the plays each
team ran. It is a **retrospective verdict, not a prediction and not a replay
engine** — the author says all three plainly.

The repo holds two different models, and telling them apart is the whole story of
this dossier:

**v1 (2026-08-31 → 2026-09-16, RETIRED; code only at tag `v1.4.3`, no longer in
`main`).** The event re-pricing engine the method post describes: for every play
whose outcome contained a coin flip — a fumble on the ground, a field-goal or
extra-point attempt, a dropped interception, a receiver drop — it replaced the
realized EPA with its expectation and bootstrapped the flips into a margin
distribution. It needed FTN charting (`is_interception_worthy`,
`is_catchable_ball`, available only from 2022), so its coverage changed by season.
The general-reader write-up is on Medium ("Who Deserved to Win? Pricing Luck in
NFL Games", @dmgrifka_64770) and describes v1 only.

**v2 — the "process meter" (shipped as library v2.1.0, 2026-09-23; current tag
v2.1.2) — the model of record, and the one that produced the CAR@GB post.** No
event re-pricing, no charting, no special teams. Each team-game is reduced to two
numbers from its scrimmage plays (pass/run with EPA, regular season, garbage time
kept, two-point tries out):

- **Success rate with the takeaway fold:** (K + T_s) / (N + T) — a team's own
  successes K over its own plays N, plus its takeaways T (interceptions + lost
  fumbles forced), each takeaway counting as one more play for the *taking* team,
  successful when the offense lost EPA on it (99.4% of takeaways qualify).
- **Yards per play with the asymmetric fold:** (Y + R) / N — takeaway return yards
  R are credited, but a takeaway is *not* a play in this denominator. That
  asymmetry is the entire difference between v2.0 (unreleased) and v2.1.

Likely points come from one OLS fit on 2016–2023 team-games (4,190 rows):
**points = −16.829 + 35.126 × success rate + 4.178 × yards per play** (in-sample
R² = 0.609). The weights ship as a committed 1 KB `weights.json` and are
pin-checked at load (`WEIGHTS_PIN` refuses any other fit); the library never
refits at score time.

The percent: per game, a dedicated RNG seeded from SHA-256(seed 0 ‖ game_id)
draws 40,000 times from three closed-form posteriors — weights ~ Normal(β̂, Σ̂),
each team's true rate ~ Beta(K+T_s+1, N−K+T−T_s+1), each team's true yards/play ~
Normal(ȳ, s_y/√N) — forms the margin draw, and reports
**p_home = mean of Φ(margin draw / 5.4528)**, where 5.4528 is a "noise-once"
scale: the margin regression's residual SD (8.875) with the sampling noise the
draws themselves carry removed again, so noise is not counted twice. A game
scored alone reads identically to the same game inside a batch — verified by
design and by the stage-0 test suite (six reference percents pinned to 4
decimals; CIN_CLE 0.7488 is one of them, and this run hit it exactly).

Repo shape: `src/nfl_simulator/` (ingest, validate, paths, figure layer, and
`process_meter/` — plays/features/posterior/record/score/fit/readiness/weights),
`research/` (~100 numbered scripts — v1's evidence base, byte-frozen at v1.4.3),
`docs/research/` (76+ numbered decision documents; every gate pre-registered
before the fit that had to pass it), `tests/` (pytest; all but `-m slow` run
network-free), `docs/writeup/figures/`. The research record is unusually honest:
it publishes its failures, a known-defect register, and the components it
*refused* (special teams, field position, penalties, opponent adjustment,
dropped picks in v2) with the measurements behind each refusal.

## 2. WHERE TO FIND IT

- Repo: https://github.com/dgrifka/nfl_simulator (default branch `main`, HEAD =
  v2.1.2, last commit 2026-09-28; tags v1.4.0–v1.4.3, v2.1.0–v2.1.2)
- Method of record: `docs/research/75-process-meter-foundations.md` (the arm
  `foldn_take_sr`, every constant defended); `76-sampler-of-record.md` (seed,
  draw count, scale); `05-neutralization-principle.md` (v1's founding rule)
- v1 write-up: https://medium.com/@dmgrifka_64770/who-deserved-to-win-pricing-luck-in-nfl-games-02d5ae4ced91
- Data: nflverse via `nflreadpy` (play-by-play + schedules, credited in every
  figure the project renders)
- Local copy from this run: `~/workspace/tests/nfl-simulator/` (source pulled
  file-by-file via the GitHub API at `main`/v2.1.2 after two git clones failed on
  network errors — see §7; plus venv, cache for 2025–2026, `run_repro.py`)
- Repo vitals at audit: 6 stars, 1 fork, 0 open issues, created 2026-09-02,
  single author. Small and young — the documentation depth is the maturity
  signal, not the community.

## 3. HOW TO USE IT

Requirements: Python ≥3.12 <3.14; core deps only — nflreadpy, polars, pyarrow,
numpy, pandas, scipy, matplotlib, pillow (the PyMC/ArviZ sampler stack is a
separate `research` extra that scoring never imports). License: **MIT** for code,
CC BY 4.0 for docs/figures.

```bash
uv sync --extra dev                          # locked env from uv.lock
uv run python -m nfl_simulator.ingest        # cache pbp 2016–2025 + schedules to data/
# a live-season game needs the live path (ingest.ingest_live_season) — 2026 is
# outside the frozen PBP_SEASONS window by design
```

```python
from nfl_simulator.process_meter import load_weights, score_games
table = score_games(2026, ["2026_08_CAR_GB"], load_weights())
# one row: scoreboard, p_home, both sides' likely points ("deserved"),
# deserved_margin, and per-side plays / yards / ypp / success rate / (k, n, y_mean, y_sd, n_y)
```

This run's actual path (equivalent, documented in `run_repro.py`): the loaders
were pointed at a hand-built cache in the library's own layout
(`cache/pbp/pbp_<season>.parquet` + `cache/schedules.parquet`, built from the
same nflverse release files nflreadpy serves), frames were built with the
library's `team_game_features_foldn` + `production_posterior_foldn`, and scoring
went through `score_games(..., frames=...)` — the library's own seam, not a
reimplementation. A 25-play floor (`readiness.MIN_SCRIMMAGE_PLAYS`) marks games
with too little pbp as not-yet-scoreable.

## 4. WHICH SYSTEM IT PLUGS INTO

**Primary: postgame grading — the results/ledger layer, not pick formation.**

- The meter answers "did the play deserve the result?" for a game already
  played. That is exactly the question GSE's official ledger and results posts
  need answered honestly: which wins were process and which were variance. Run
  it over every spotlight game after the final, store `p_home`, deserved points
  and the luck gap beside the graded card in the vault package.
- **Situations layer (descriptive context only):** a team's trailing luck gap
  (actual − deserved margin, summed over recent weeks) is a clean, reproducible
  "running hot/cold" descriptor for the reasoning trail. It must stay
  descriptive — see the author's own evidence in §6 before anyone treats it as
  a signal.
- **Not the matchup/usage/health layers, and never side selection.** The meter
  reads a finished game; it has no pregame form. Matchup-first doctrine already
  keeps post-hoc luck out of pick formation, and the author's testing agrees
  (§6). It also cannot price a market: its "likely points" are
  scrimmage-production points from a two-input regression, not a score
  projection — special-teams points are structurally absent from both sides.

## 5. CREATIVE ANGLES

1. **Grade GSE's own card against deserve-to-win — worked example, this game.**
   The margin draws behind the percent are a full deserved-margin distribution,
   so any spread can be graded from the same run (extension beyond the author's
   claims — labelled as such): for CAR@GB, P(deserved margin > 3.5) = **84.2%**
   — the GB −3.5 position was process-backed, not a lucky cover. The points
   draws give a deserved-total distribution: mean **35.2**, P(deserved total <
   46.5) = **97.1%**, 89% interval [25.6, 44.7] — the Under 46.5, which survived
   the actual total landing on 46, was overwhelmingly the process side. A
   postgame card graded this way separates "we were right" from "we got away
   with one" in the ledger, in units language Garrett already uses.
2. **A weekly luck ledger as content.** The meter scores every game from free
   data in seconds. A Monday "who actually deserved it" table — deserved
   winner, luck gap, the poster's own "luck merchant" flag (won the game with a
   share ≤ 47%) — is a repeatable results-week content surface for the site,
   and it is settled-fact postgame material, not pick leakage.
3. **Cross-check for the engine's verdict JSON.** Where GSE's five-stage
   verdict and the meter disagree sharply on a finished game (verdict loved a
   side the process says was outplayed), that game goes on the review list.
   Two independent process reads disagreeing is a research lead; agreeing is a
   receipt.
4. **Benchmark harness for GSE's own luck ideas.** The repo's refused-component
   record (docs 09, 33, 61–62, 68) is a pre-registered graveyard of luck
   adjustments that did not survive measurement — fumble luck, sequencing,
   possession caps. Before GSE builds any luck adjustment of its own, this is
   the checklist of what already failed and why.
5. **The takeaway fold as a defensive-credit pattern.** The asymmetric fold
   (takeaway = a play in the rate, return yards but no play in yards/play) is
   a reusable way to credit defenses in GSE's own per-game team sheets without
   double-counting — it is the one modelling idea in v2 worth lifting even if
   the meter itself were not adopted.

## 6. RISKS AND LIMITS

- **The description gap is the headline risk.** The account's method story
  (loose balls / field goals / drops re-priced) is v1's. The shipped v2 — the
  one producing today's numbers — contains **no field-goal, extra-point, drop,
  punt, kickoff, penalty or field-position component at all**. In this very
  game it never saw: Carolina's two made FGs (6 of their 19 points), Green
  Bay's missed XP, or Green Bay's lost kickoff-return fumble. Anyone citing
  the 88% as "the sim re-ran every bounce" is citing a model that no longer
  exists. v1's code survives only at tag v1.4.3 and additionally needed paid
  FTN charting.
- **Two inputs is a deliberate, severe compression.** Success rate + yards per
  play, no opponent adjustment (measured, found to be shrinkage), garbage time
  counted, no drive context. Two teams with identical rate/ypp get identical
  likely points wherever their drives started. "Deserved" means "deserved by
  scrimmage production volume/efficiency" — nothing more.
- **Scoreboard lean (author's own defect #4, accepted).** In 69.6% of games
  the percent moves toward the team that actually won. The meter partly
  ratifies the scoreboard it claims to audit; treat extreme agreement with
  the result as expected, not as independent confirmation.
- **Never held out, by design.** Brier 0.1436 / log loss 0.4376 on the 543
  gate games are descriptive statistics about a verdict on its own game. The
  author tested the forward-looking version and reports it plainly:
  **stripping luck did not improve next-game prediction** (the v2.1 arm's
  next-game log-loss gain was −0.0007 with a 95% interval straddling zero;
  adopted on definition, not on forecast gain). Any GSE use as a predictive
  input starts from that negative result, not from the headline percent.
- **EPA is the foundation, and EPA is nflverse's model.** "Success" = EPA > 0.
  nflverse occasionally revises historical pbp values; the repo carries a
  whole manifest-drift apparatus (doc 73) because a re-pull once moved numbers
  at the 1e-6 scale. A number quoted from a post is pinned to the author's
  pull; a later re-pull can move the third decimal. (This run pulled pbp on
  2026-10-30 and hit the published values exactly.)
- **The percent hides the interval.** CAR@GB's deserved-margin 89% interval
  is [−0.07, +18.98] — it nearly touches zero. The Φ-smoothing that produces
  88% is a modelling convention (pooled σ = 5.4528, itself measured from the
  *rounded* margin_sd — author's convention #5, stated openly), not a
  frequency. Quote the interval beside the percent in any GSE surface.
- **Single-author, six-star repo, eight weeks old.** MIT-licensed and fully
  inspectable, so abandonment risk is low-impact (the artifact model means the
  weights never need the author again), but there is no community validation
  behind it. The pre-registered research record is thorough; it is still one
  person's record.
- **Display rules live with the poster.** Whole percents and the ≤47%
  "luck merchant" line are the account's presentation choices, explicitly not
  in the library — do not attribute them to the model.

## 7. FIRST TEST AND VERDICT

**First test — already run (this dossier).** Reproduce one published post
end-to-end from the shipped library and free data: **passed exactly** on both
the percent and both likely-points figures, with the repo's own README example
as a control reproduced to 4 decimals first. The follow-on test, if adopted:
score the full Week 8 slate and the Week 9 spotlight game on the same cache
and check the meter's rows against the vault's graded card — one evening of
compute, all of it scripted by `run_repro.py` as-is.

**Run log (what it took, including the failures):**
- `git clone` failed twice (HTTP/2 stream error; then a pack-object error) and
  a codeload tarball attempt failed the same way — the source was instead
  pulled file-by-file through the GitHub API (full `src/` tree, pyproject,
  README, LICENSE, CITATION) at `main` = v2.1.2. The `research/` scripts and
  `docs/research/` beyond docs 75 + the README were inventoried from the repo
  tree but not executed (the research scripts are v1's evidence and run at tag
  v1.4.3; they are not the scoring path).
- System Python lacked pyarrow and the current pyarrow requires NumPy ≥ 2
  against the system's 1.26 — run in an isolated venv (Python 3.12.3, numpy
  2.5.4, pandas 3.1.0, scipy 1.18.1, pyarrow 26.0.0). Pandas 3.1.0 is newer
  than the repo's lockfile generation; the control game matching the author's
  published outputs to 4 decimals is the evidence the version drift does not
  touch this code path.
- Data: `play_by_play_2026.parquet` + `play_by_play_2025.parquet` from the
  nflverse-data GitHub releases (the same files nflreadpy serves) and
  schedules built from nflverse's `games.csv`, all pulled 2026-10-30. The
  game row confirms GB 27, CAR 19, Thu 2026-10-29, Lambeau, spread GB −3.5,
  total 47.5.

**Verdict: TEST → adopt for the postgame grading lane.** The published numbers
are real, reproducible to the digit from free data and MIT code, and the
artifact-pinned design means GSE can freeze the exact model the posts use.
Adopt it as a grading/descriptive instrument (ledger receipts, luck-ledger
content, verdict cross-check). Do **not** wire it into pick formation or
pregame reasoning as a predictive input — the author's own pre-registered
tests say the forward gain is not there, and the model's "deserved" is a
two-input scrimmage-production statement that structurally ignores special
teams, field position and every bounce the method post advertises.
