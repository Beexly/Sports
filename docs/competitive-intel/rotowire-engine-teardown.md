# How RotoWire's Fantasy Engines Work — and how to build better, license-clean

*Internal briefing — Galaxy Sports Edge · 2026-07-07*
*Epistemic discipline: every mechanical claim is tagged **(documented)** = verbatim in a public RotoWire source, **(inferred)** = reproducible industry-standard reconstruction that fits their disclosed behavior but is not confirmed by them, or **(speculative)** = plausible guess with weak support. Never read an inference as fact.*

---

## 1. Epistemic summary

**What is genuinely knowable.** RotoWire publishes unusually candid *conceptual* "how it works" copy on its own tool pages, FAQs, and a methodology article. From that public material we can document, verbatim and with confidence: the **shape of the pipeline** (volume-first statistical projections → a floor/median/ceiling "predictive model" layer → a human team-context/depth-chart adjustment → per-format customization); the **one disclosed re-rank formula** (Custom Rankings blends four metrics — league-fit ADP + Median + Ceiling + Floor — through a stage-dependent weighting where ADP decays and Ceiling grows deeper into a draft); the **ADP formula** (a plain arithmetic mean of draft slots, with a worked example and a 5-day trend-arrow mechanic); the **auction method they publish as a manual recipe their tool automates** (money pool = teams × budget → allocate a player pool → distribute budget proportional to projected points, with positional-scarcity/replacement-level language); the **full league-settings surface** that re-prices every player; the **draft-simulator and live-assistant input/output contracts**; and the **data lineage at the disclosure level** (licensed STATS LLC / Stats Perform + Sports Info Solutions data feeding an undisclosed "proprietary modeling engine," under the GDC Media → GDC America → Roto Sports corporate chain).

**What is a trade secret.** Everything algorithmic. No model type (regression vs. gradient-boosted trees vs. Monte Carlo), no feature set, no coefficients, no floor/ceiling generation method (percentile? std-dev band? simulation?), no weighting schedule inside the 4-metric blend, no quantification of "regression indicators / strength of schedule / pace of play / injury probability," no auction equation (they never say the words "VOR" or "VORP"), no CPU-opponent randomization function, and no draft-grade formula. The model-vs-analyst arbitration rule ("our projections aren't just algorithms") is asserted but never specified.

**Honest bottom line (one paragraph).** RotoWire's public documentation tells you *what the engines consume and emit and roughly how the concepts fit together, but not the math that turns inputs into numbers.* Their durable moat is two things a competitor cannot copy by reading the site: (a) **licensed granular data** (STATS Perform + Sports Info Solutions) and (b) a **25-year human-analyst layer** with named writers and a certified athletic trainer. Their exposed *weakness* is that **none of it is calibrated or accuracy-proven in public** — the whole system is presented as authoritative rather than *demonstrated*. That gap is exactly where a license-clean, open-data, calibration-first product (GSE) can win: not by out-guessing their projections, but by *proving* accuracy the way they never do, on data they don't own.

---

## 2. Engine-by-engine teardown

### 2.1 Projections engine

**Documented behavior.** Projections are the acknowledged **key/primary driver** of everything downstream. The disclosed flow is a four-layer stack:

1. **Volume-first statistical foundation (documented).** "Statistical projections are built using historical performance, usage trends and efficiency data. This data relies heavily on projected volume in key areas such as targets, carries and red-zone usage" — which RotoWire calls the **"crown jewels of fantasy scoring."** Analyst Paul Mammino: "we want players who project for more points. This should be the initial basis point for all rankings." ([methodology](https://www.rotowire.com/football/article/fantasy-football-rankings-created-projections-models-analysis-116129))
2. **Predictive-model refinement → floor/median/ceiling (documented).** On top of the base projection, a model "incorporate[s] elements such as strength of schedule, pace of play, regression indicators and injury probability … providing estimations for both floor and ceiling projections." It is used as a **tie-breaker**: "When two players have a similar median projection, we typically want to begin taking upside into account" (notably TD likelihood from usage). ([methodology](https://www.rotowire.com/football/article/fantasy-football-rankings-created-projections-models-analysis-116129))
3. **Human team-context / depth-chart adjustment (documented).** "All of the numbers in the world are worth little if they don't take into account team context … coaching changes, offensive scheme and quarterback play … Those depth charts define opportunity availability." A projection is treated as "a median and there (are) a range of outcomes," which context is used to parse. ([methodology](https://www.rotowire.com/football/article/fantasy-football-rankings-created-projections-models-analysis-116129))
4. **Human + model blend, not a black box (documented).** Weekly projections "aren't just algorithms; they're built by experienced analysts who watch the games." Seasonal: "You can get a good set of rankings with numbers alone, but you can take those rankings to the next level by incorporating … expert evaluation, NFL injury report updates and fantasy football ADP trends." ([weekly](https://www.rotowire.com/football/projections-weekly.php), [methodology](https://www.rotowire.com/football/article/fantasy-football-rankings-created-projections-models-analysis-116129))

**Scope & horizons (documented).** The FAQ formally defines a projection as a predictive production number over "a game, week, month, within a specified date, or for a partial or full season," computed under the league's scoring, across projected categories: yardage / TDs / catches for skill players; tackles / sacks / INTs / forced fumbles / defensive TDs for IDP; plus team-defense points. Three time horizons ship: **weekly, full-season, rest-of-season.** Weekly projections are "**updated daily throughout the regular season**," re-analyzing every matchup for news/roster/injury. ([FAQ](https://www.rotowire.com/faq/what-are-projections-in-fantasy-football-a43ccdf0), [weekly](https://www.rotowire.com/football/projections-weekly.php))

**Weekly inputs (documented).** Matchup analysis (WR vs. specific CB, OL vs. pass rush), usage trends (target share, snap counts), situational factors (game script, venue, weather), and real-time updates (starting lineups, practice reports, depth-chart changes). ([weekly](https://www.rotowire.com/football/projections-weekly.php))

**Inferred internals.**
- **Projection → points → rank (inferred).** The concrete "multiply each projected stat line by the league's point values → sum to a projected total → sort/tier" step is *standard practice they only partially spell out.* Their own custom-tool copy frames it as generic advice ("Adjust NFL projections accordingly, then re-sort by total projected fantasy points"), not a disclosure of the internal step.
- **Regression / SoS / injury quantification (inferred).** They *name* these components but never define them. Industry-standard implementation: mean-reversion of unstable efficiency rates (TD rate, catch rate, yards-per-touch) toward positional baselines; opponent-adjusted points-allowed-by-position for SoS; injury probability from history/athletic-trainer inputs. RotoWire does employ certified athletic trainer **Jeff Stotts** — a real, widely-known fact — but the computation itself is undisclosed.
- **Floor/median/ceiling generation (inferred/speculative).** Whether ceilings/floors are distribution percentiles, ±k·σ bands, or simulation outputs is **unknown**. Treat any specific band math as speculative.

**Confidence:** Pipeline *shape* and inputs — **documented**. All coefficients, model family, and band math — **not disclosed**; reconstructions **inferred**.

---

### 2.2 Rankings / Cheat-sheet engine

RotoWire ships **two parallel ranking products** that are easy to conflate:

**(A) The Custom Rankings tool — the one disclosed formula (documented).** For a user's specific league it "**blends four different metrics** … Using ADP that best fits your league settings, projected Median, Ceiling, and Floor scoring the algorithm blends these four components using a weighting system to determine the relative impact of each one. As we get later into drafts, ADP begins to matter less and Ceiling projections takes on a greater portion of the ranking. Positional scarcity and overall league depth also factor heavily." Granular inputs (team count, specialty scoring like "extra points for 300+ yard passing performances," and an auction dollar budget) are confirmed on the same page. ([custom](https://www.rotowire.com/football/rankings-custom.php))

Reproducible reading of that blend **(inferred — the *weights* are not published):**

```
Score_i(stage) = w_ADP(stage)·ADPfit_i
               + w_med ·Median_i
               + w_ceil(stage)·Ceiling_i
               + w_floor·Floor_i

where  w_ADP decreases and w_ceil increases as draft stage advances,
       and positional-scarcity / league-depth terms scale each player's
       marginal value at their position.   Σw = 1.
```
The **decay schedule and scarcity math are unknown** — only the *direction* (ADP↓, Ceiling↑ over draft time) is documented.

**(B) The consumer "Roundtable" Top-150 — an explicit human composite (documented).** Four named RotoWire writers — **Jeff Erickson, Mario Puig, Jim Coventry, Jerry Donabedian** — rank independently; the table publishes each writer's rank plus **average (AV)** and **median (MED)**, **defaults to median sort**, uses **PPR single-QB**, and refreshes from a **late-June first edition to a Sept 1 "final update"** with several interim updates, surfacing highest-variance players to expose disagreement. ([Roundtable](https://www.rotowire.com/football/article/fantasy-football-rankings-2025-roundtable-top-150-final-update-95711))

```
AV_player  = mean(rank across the 4 writers)
MED_player = median(rank across the 4 writers)   ← default publish sort
```

**Format customization (documented).** The same projection set is re-expressed for PPR / half / standard / Superflex / Best Ball / dynasty; positional value shifts by rules (an RB taken Round 1 in non-PPR "might fall to Round 2 … in a full PPR draft"; 2QB/Superflex and hybrid WR/TE slots change weighting). ([methodology](https://www.rotowire.com/football/article/fantasy-football-rankings-created-projections-models-analysis-116129))

**Unresolved (gap).** Whether the numeric projections table and the human Roundtable are the *same* rank source or two parallel products is **not reconciled** by RotoWire. Best reading: the model-driven projections power the tools; the Roundtable is a separate marketing/consensus artifact.

**Confidence:** 4-metric *blend existence and direction* — **documented**; exact weights — **inferred**. Roundtable mechanics — **documented**.

---

### 2.3 Auction-values engine

**Core definition (documented).** "Auction values are calculated by projecting each player's total fantasy points and assigning a dollar amount based on their relative value within your league's budget." FAQ: "It starts with projected fantasy points, then factors in **positional scarcity** … elite tight ends cost more because there aren't many of them." ([auction](https://www.rotowire.com/football/auction-values.php))

**Published "manual method" the tool automates (documented — but framed as a manual recipe, NOT their internal algorithm).** Under "How to Calculate Auction Values," RotoWire gives four verbatim steps, prefaced "*Follow these steps to calculate these values manually*," then says its tool "automates the process":
1. Project player points for your scoring format.
2. **Assign a total budget** = teams × per-team budget (e.g., 10 × $200 = **$2,000**).
3. **Set a player pool** — allocate budget across drafted positions (example split **~65% starters / 35% depth** — explicitly an "e.g.," *not* a confirmed internal weight).
4. **Distribute budget by points** — proportional to projected totals.
([auction](https://www.rotowire.com/football/auction-values.php))

**Replacement-level behavior (documented).** "In Superflex or 2-QB leagues, quarterback values can double or triple compared to 1-QB formats. TE-premium scoring increases the gap between elite tight ends and the **replacement level**." This is value-over-replacement behavior described conceptually — without the equation. ([auction](https://www.rotowire.com/football/auction-values.php))

**League-settings knobs that re-price everything (documented).** Budget; Teams 1–20; roster slots (QB/RB/WR/TE/K 0–5, Flex 0–10, Super 0–10, Reserves 0–15); and category scoring across Passing / Rushing / Receiving / Kicking / Misc including TE-premium fields (`TE Rec`, `TE 1st Down`), `FGM29/39/49/50`, `Kick Ret TD`, `Fumble`, `Fumbles Lost`. Output filters ALL/QB/RB/WR/TE/K. ([auction](https://www.rotowire.com/football/auction-values.php))

**In-season / FAAB re-pricing (documented).** Values recompute in-season off updated projections "to reflect player performance, injuries, and NFL depth chart changes," and are repurposed as **FAAB** guidance — "A handcuff running back worth $0 in August might command **40–50% of remaining FAAB** after the starter gets injured." ([auction](https://www.rotowire.com/football/auction-values.php))

**Inferred pricing math (reproducible VOR/VORP — NOT RotoWire's stated equation; they never name VOR/VORP).**

```
1. Money pool         M  = N_teams × B_perteam
2. Discretionary $    D  = M − (N_teams × rosterSize)      # reserve $1/slot
3. Replacement level  R_pos = ProjPts of the last "startable"
                              player given N_teams × starters_pos
                              (Superflex sharply raises R_QB → QB $ jump)
4. Marginal value     VOR_i = max(0, ProjPts_i − R_pos(i))
5. Dollars per point  k  = D / Σ VOR_i   (over the draftable pool)
6. Auction value      $_i = 1 + VOR_i × k
   (optional in-draft inflation: recompute k on remaining $ vs remaining VOR)
```
This reproduces every documented behavior (scarcity, replacement level, budget-proportional distribution, Superflex QB inflation) but is a **standard construction, not confirmed as their implementation.**

**Confidence:** Definition, manual recipe, settings surface, scarcity language, FAAB — **documented**. Precise pricing equation — **inferred**.

---

### 2.4 ADP engine

**Formula (documented, with worked example).** "ADP = Sum of All Draft Positions / Total Number of Drafts. For example, if a player is drafted at picks 10, 12, 11, and 15 across four drafts, their ADP would be: (10 + 12 + 11 + 15) / 4 = **12.0 ADP**." A plain arithmetic mean. ([adp](https://www.rotowire.com/football/adp.php))

**Sources & cadence (documented, with a real discrepancy).** Aggregated from "thousands of real drafts across multiple platforms, updated daily." Prose names **Underdog, ESPN, Sleeper, Fantrax** (plus linked MFL and NFFC feeds); the **live table only surfaces Underdog + Sleeper (Redraft) and Sleeper (Dynasty).** The prose-vs-live-columns mismatch is confirmed and is a genuine gap — RotoWire does not say which platforms currently feed each published number, nor whether platforms are sample-weighted. ([adp](https://www.rotowire.com/football/adp.php))

**Segmentation (documented).** Served in format/position slices, not one blended number: scoring toggle PPR / Standard / Half (URL params, default Half), position filters incl. IDP, and a Redraft-vs-Dynasty split. "A player going in Round 2 of a standard league may be a Round 1 asset in PPR or fall to Round 3 in a 2QB format." ([adp](https://www.rotowire.com/football/adp.php))

**Recency / trend mechanic (documented).** "Arrows indicate changes over the last 5 days. Players who have moved more than **0.5** will have an arrow. Players who have had their ADP move more than **10** will have two arrows." The underlying mean is daily-refreshed; "the more drafts included in the sample, the more accurate and reliable." ([adp](https://www.rotowire.com/football/adp.php))

**Inferred / undisclosed.** Lookback window, per-draft recency weighting/decay inside the mean (the 5-day arrow is a *display* flag, not the averaging window), minimum-draft threshold before a player earns an ADP, and whether RotoWire's *own* Mock Draft Simulator drafts feed the published ADP — all **unspecified** (the page emphasizes "real drafts").

**Confidence:** Mean formula, segmentation, trend thresholds — **documented**. Sample parameters and platform weighting — **not disclosed**.

---

### 2.5 Mock-draft simulator

**Documented behavior.** A practice engine where "you are drafting **vs the simulator rather than other users**"; other teams can be set to **auto-draft**, finishing a mock in "**five minutes or less**"; the FAQ confirms a mock "can also be done as a computer simulation." Unlimited free reps. ([mock-draft](https://www.rotowire.com/football/mock-draft))

**Board behavior is ADP-driven and platform-specific (documented).** "They reflect evolving fantasy football ADP and common draft tendencies … if Yahoo rates a player higher than Sleeper, that player will tend to be drafted earlier in Yahoo leagues." *Caveat: RotoWire frames this as an observable property of the board, not an explicit spec of the CPU opponents' selection function.* ([article 119785](https://www.rotowire.com/football/article/fantasy-football-mock-draft-simulator-119785))

**Configurable to league format (documented).** Superflex, keepers, IDP, auction, per-yard/milestone/first-down/TE-premium scoring, kicker-by-FG-distance — the same settings surface as the other tools.

**Post-draft evaluation (documented).** Returns "draft grades, possible outcomes, positional balance and suggested improvements," plus real-time "Assistant GM" notes during the draft. ([mock-draft](https://www.rotowire.com/football/mock-draft))

**Inferred internals — CPU pick algorithm (inferred).** The randomization function, ADP-variance window, and positional-need weighting are **not published.** Standard reconstruction:

```
For each CPU pick:
  candidates = available players sorted by platform ADP
  draw pick ~ weighted-random within an ADP window
      (e.g., Gaussian jitter σ around each player's ADP)   ← variability
  subject to positional-need constraints
      (must fill starters; cap over-drafting one position) ← realism
```
This is the conventional greedy-ADP + jitter + roster-constraint pattern; RotoWire confirms only that the board is ADP-driven and produces variable scenarios.

**Inferred — draft-grade formula (inferred).** Not disclosed. A defensible reconstruction: grade = your roster's total projected points (or Σ VOR) versus the league field (percentile or z-score), with positional-balance penalties for unfilled starters. Presented as inference only.

**Confidence:** Opponent model = CPU, ADP-driven board, configurability, grade *outputs* — **documented**. Randomization math and grade equation — **inferred**.

---

### 2.6 Live draft assistant + platform sync

**Documented behavior.** A real-time assistant that gives "instant recommendations that are based on **which players are still available, ADP shifts, roster needs and expert rankings**." ([mock-draft](https://www.rotowire.com/football/mock-draft) / draft-assistant copy)

**Two-way live sync (documented).** Live Draft Sync auto-pulls picks *and* lets you make picks/queue, importing settings and picks from **ESPN, Yahoo, Sleeper, CBS, NFL.com, Fantrax, NFFC** (and "MFFL") via a RotoWire **browser-extension login**.

**"Draft Plan" personalization (documented, via on-page Jake Letarski quote).** Biases recommendations **safe / balanced / upside by round** (early/middle/late; high-ceiling vs low-floor) and factors **consistency, injury risk, team-offense strength (stacks), exposure limits, and stacking.**

**Free/paid split (documented).** "Every customization above is free … Subscribe to RotoWire to unlock custom draft plans, expert in-draft guidance." Customizable auction outputs and deeper ADP tooling sit behind the subscriber wall.

**Inferred internals.** The scoring that ranks "best available" in real time is almost certainly the same VOR/replacement logic as §2.3–§2.4 applied to the live board state (remaining pool + your roster needs), but the **weighting between available-value, roster-need, and Draft-Plan bias is not disclosed** — treat any specific weighting as inferred.

**Confidence:** Inputs, sync surface, Draft-Plan levers, free/paid gate — **documented**. Recommendation-scoring math — **inferred**.

---

## 3. Data & people behind it

**Data providers (documented).**
- **STATS LLC / Stats Perform** and **Sports Info Solutions (SIS)** — the licensed raw statistical feeds, credited in the site-wide footer: "*Portions copyright by STATS LLC … Portions copyright Sports Info Solutions.*" ([partner](https://www.rotowire.com/partner/))
- **Proprietary modeling engine** — the /partner/ page states projected player stats and recommended DFS salaries are "built on our **proprietary modeling engine**" (no internals given). *Note the scope: that phrase describes player stats / DFS salaries; that the same engine specifically powers auction/ADP pricing is a reasonable **inference**, not a documented lineage statement.*
- **Corporate chain (documented):** © GDC Media Limited → licensed to GDC America Inc → sub-licensed to **Roto Sports Inc**. **No Sportradar** string appears on the partner page (absence scoped to that page).

**Architecture in one line (documented → inferred).** *Licensed data in (STATS/SIS) → proprietary model out (projected stats, DFS salaries) → human analyst layer → format-specific tools.* The "in → model → out" shape is documented; the exact hand-off from feeds to auction/ADP pricing is inferred.

**Named people (documented).**
- **Roundtable rankers:** Jeff Erickson, Mario Puig, Jim Coventry, Jerry Donabedian.
- **Methodology voice:** Paul Mammino (projections-as-driver, floor/ceiling tie-breaking, median-with-range framing).
- **Injury analysis:** Jeff Stotts, certified athletic trainer (real, widely known; injury-probability computation itself undisclosed).
- **Draft-assistant/Draft-Plan voice:** Jake Letarski.

**Human-vs-model blend (documented, un-quantified).** RotoWire repeatedly positions the product as a hybrid — a model baseline that analysts refine for context, injuries, scheme and depth-chart opportunity ("aren't just algorithms … built by experienced analysts who watch the games"). **The arbitration rule — whether analysts hand-edit final numbers and by how much — is not documented.** This is a strength (institutional judgment) and an opacity (unauditable overrides) at once.

---

## 4. How accurate it actually is

**Honest disclosure first.** *This research pass verified RotoWire's methodology copy, not third-party accuracy scores. No RotoWire source publishes accuracy metrics, calibration curves, or hit-rates* — a notable absence for a product sold on authority. The claims below about *how accuracy is measured* are general public knowledge; any specific placement is flagged unverified.

**The standard independent benchmark (general knowledge).** The recognized neutral evaluator of fantasy projections/rankings is the **FantasyPros Accuracy Challenge**, which scores dozens of expert/site rankings each season against realized fantasy points (season-long and weekly, by position, per scoring format). This is the closest thing to an objective league table in the industry. **(unverified in this pass — GSE should pull the live FantasyPros standings directly before citing any number.)**

**What the benchmark measures (methodology, documented by the benchmark itself, general knowledge).**
- **Season-long accuracy:** correlation / rank-error between preseason rankings and end-of-season finishes, by position.
- **Weekly accuracy:** average absolute error between projected and actual weekly points, aggregated over the season.
- These are **error/ordering metrics, not calibration metrics** — they reward being close on average, and say little about whether a stated "ceiling" actually occurs at the claimed frequency.

**Honest read on their edge.**
- **Where they likely are strong (inferred):** volume-heavy projections backed by licensed granular data (target/carry/red-zone detail) plus daily in-season updates and a certified-trainer injury layer are the ingredients that tend to place well in weekly-accuracy tables. Their positional context adjustments are a real, hard-to-replicate human edge.
- **Where they are unproven (documented gap):** they publish **no floor/ceiling calibration**, **no Brier/log-loss**, **no reliability diagram**, and **no year-over-year self-scored hit-rate.** The floor/median/ceiling framing — their headline differentiator — is asserted, never validated. "Updated daily" and "25+ years" are tenure claims, not accuracy claims.
- **Net:** RotoWire's edge is **data + human judgment**, not demonstrated calibration. A competitor cannot easily beat their raw projection accuracy without comparable data, but *can* beat them decisively on **provable, calibrated confidence** — because that arena is currently empty.

---

## 5. License-clean blueprint for GSE

Goal: **equivalent-or-better engines built only on open data**, mapped to GSE's existing pieces — **GSE Rating** (the proprietary single number: weighted, categorized, reasoned), **edge-engine** (independent estimators + CLV), and the calibration/proof-of-accuracy program (PAVA/isotonic). We do not need their licensed feeds to match the *shape* of their pipeline, and we can exceed them where they're weakest: **calibration and process transparency.**

### Step 0 — Open-data spine (replaces STATS/SIS)
Use **nflverse** (`nflreadr`/`nflfastR`, MIT-licensed play-by-play + rosters + depth charts + snap counts + participation), **NGS** public advanced metrics, and public ADP feeds. This gives the volume signals RotoWire treats as "crown jewels": **target share, air yards, aDOT, WOPR, YPRR, carry share, red-zone touches, snap rate** — all derivable from open PBP. Maps directly to GSE's existing **nflverse unlock + trend-discovery engine + WOPR/air-yards work.**

### Step 1 — Projections engine (volume-first, open)
Reproduce their disclosed pipeline shape, with open inputs and **published uncertainty**:
1. **Volume model:** project opportunity (targets, carries, RZ looks) from usage trends + depth-chart opportunity share (nflverse participation/snaps).
2. **Efficiency with regression-to-baseline (fixes their un-quantified "regression indicators"):**
   `stat_i = volume_i × regressed_rate_i`, where
   `regressed_rate_i = (n·observed_rate + k·positional_baseline) / (n + k)` (empirical-Bayes shrinkage; `k` = league-fit prior weight). This is the concrete mean-reversion RotoWire only names.
3. **SoS (fixes their un-quantified "strength of schedule"):** opponent-adjusted points-allowed-by-position, blended over a rolling window.
4. **Distribution, not a point (beats their opaque floor/ceiling):** run a **Monte-Carlo** over volume × rate uncertainty to emit `p10 (floor) / p50 (median) / p90 (ceiling)` as *actual percentiles of a simulated distribution* — then **calibrate them** (Step 6) so a "p90 ceiling" hits ~10% of the time. RotoWire asserts floor/ceiling; GSE *proves* them.
5. **Points conversion:** `ProjPts_i = Σ (stat_line × league_point_values)` → sort/tier under any scoring.

### Step 2 — Rankings / cheat-sheet (GSE Rating as the single number)
- **GSE Rating** subsumes their 4-metric blend into one *reasoned, categorized* number. Reproduce their disclosed direction explicitly:
  `Rating_i(stage) = w_ADP(stage)·ADPfit + w_med·Median + w_ceil(stage)·Ceiling + w_floor·Floor`, with `w_ADP` decaying and `w_ceil` growing over draft stage, plus a positional-scarcity term = per-position VOR (Step 3).
- **Publish the weights and the reasoning** (they don't). Every Rating shows its category breakdown — this is GSE's "know it / review it / weight it / score it" ethos, and a straight upgrade over an unexplained blend.
- **Consensus, self-scored:** if GSE runs a multi-analyst layer (RotoWire's Roundtable AV/MED), score each contributor's historical accuracy and weight them — a Roundtable that *learns* rather than a flat average.

### Step 3 — Auction values (explicit VOR/VORP; matches their behavior, shows the math)
Implement the reproducible pricing they never publish:
```
M = N_teams × B ; D = M − N_teams × rosterSize
R_pos = replacement points (last startable given N_teams × starters_pos,
        + flex allocation) ; Superflex raises R_QB
VOR_i = max(0, ProjPts_i − R_pos(i))
k     = D / Σ VOR_i
$_i   = 1 + VOR_i × k        (in-draft: recompute k on remaining $ / remaining VOR)
```
Expose the same settings surface (teams 1–20, roster slots, category scoring incl. TE-premium, budget) and reuse for **FAAB** in-season. GSE advantage: **inflation-aware live re-pricing** shown transparently.

### Step 4 — ADP engine (open feeds + honest sampling)
- **Documented formula:** `ADP = Σ pick_positions / N_drafts` — but fix their gaps: publish the **lookback window**, a **minimum-draft threshold**, and an optional **recency-weighted mean** (exponential decay) so ADP tracks live movement without the 5-day arrow being the only recency signal.
- Segment by format/position/redraft-vs-dynasty; emit trend arrows on a documented delta. Aggregate only from platforms whose terms permit it (public/consented feeds), and **disclose the source mix** (RotoWire's own prose-vs-live mismatch is a trust smell we avoid).

### Step 5 — Mock simulator + live assistant (open Monte-Carlo)
- **CPU opponents:** greedy-ADP + Gaussian jitter (σ tunable) + positional-need constraints — the reconstruction in §2.5, built openly. Run **N simulations** to produce outcome distributions, positional-balance grades, and "possible outcomes."
- **Draft grade (make it explicit):** `grade = percentile(Σ roster VOR vs. simulated field)` with penalties for unfilled starters — a *defined, reproducible* grade vs. their black-box letter.
- **Live assistant:** rank best-available by live VOR × roster-need, with GSE's Draft-Plan-style safe/balanced/upside bias, feeding off the **edge-engine** for value-vs-market. Platform sync only where ToS-permitted.

### Step 6 — The moat RotoWire doesn't have: proof-of-accuracy
This is where GSE **beats** RotoWire, not ties it:
- **Calibrate every confidence output** with **isotonic/PAVA** so p10/p50/p90 and any win-probability are *empirically true frequencies*, feeding the ≥70% win-rate north star (proven, not faked).
- **Publish** reliability diagrams, Brier/log-loss, and self-scored season-over-season hit-rates — the exact artifacts RotoWire omits.
- **Process transparency:** wire projections into GSE's Signal Courtroom / Decision Autopsy / GM Process Ledger so every number carries its reasoning and post-hoc grade. RotoWire tells you to trust the analyst; GSE **shows the work and keeps the receipts.**
- **CLV as truth serum:** grade auction/ADP/edge calls against closing lines and realized outcomes via the edge-engine's independent estimators — an objective scoreboard RotoWire has no equivalent of.

**Where GSE can credibly claim "better," not just "different":** (1) **calibrated, published accuracy** vs. their un-validated authority; (2) **fully reasoned, transparent single number (GSE Rating)** vs. an opaque blend; (3) **open, reproducible data lineage** vs. licensed black box; (4) **self-scoring consensus and process ledgers** vs. a flat human average.

---

## 6. Compliance note

We did **not** ingest, scrape, or reproduce any of RotoWire's proprietary or STATS/SIS-licensed data, computed projection values, subscriber-walled outputs, or model artifacts. This briefing draws **only** on RotoWire's own **public methodology copy** (tool pages, FAQ, and a methodology article they published to explain their approach) to characterize *what the engines do at a conceptual level*, and on **open, permissively-licensed data (nflverse and public advanced metrics)** for the build blueprint. Every algorithmic specific is confined to the **inferred/speculative** tiers precisely because their real math is a trade secret we neither accessed nor attempted to reverse-engineer. The GSE blueprint is a clean-room design built from first principles on open data — it is *inspired by the public shape of their pipeline*, not derived from their protected inputs or code.

---

## 7. Sources

**RotoWire (public methodology & tool pages — re-fetched/verified this pass):**
- [How Fantasy Football Rankings Are Created: Projections, Models and Context](https://www.rotowire.com/football/article/fantasy-football-rankings-created-projections-models-analysis-116129) — 3-layer pipeline, floor/ceiling tie-break, team-context/human layer, format customization; Paul Mammino quotes.
- [Fantasy Football Custom Rankings tool](https://www.rotowire.com/football/rankings-custom.php) — the disclosed 4-metric blend (ADP + Median + Ceiling + Floor), stage-dependent weighting, granular scoring/auction inputs.
- [Roundtable Top 150 (Final Update)](https://www.rotowire.com/football/article/fantasy-football-rankings-2025-roundtable-top-150-final-update-95711) — 4 named writers, AV/MED columns, median-default sort, PPR single-QB, late-June→Sept 1 cadence, variance disclosure.
- [Weekly NFL Projections](https://www.rotowire.com/football/projections-weekly.php) — weekly factors, "updated daily," "aren't just algorithms," three horizons, 25+ years.
- [FAQ: What are projections in fantasy football?](https://www.rotowire.com/faq/what-are-projections-in-fantasy-football-a43ccdf0) — official projection definition, determinants, projected categories (skill/IDP/team-D).
- [Fantasy Football Auction Values](https://www.rotowire.com/football/auction-values.php) — core definition, 4-step manual method, positional scarcity/replacement level, full settings surface, in-season/FAAB re-pricing.
- [Fantasy Football ADP report](https://www.rotowire.com/football/adp.php) — mean formula + worked example, platform sources (prose vs. live-column mismatch), format/position segmentation, 5-day trend-arrow thresholds.
- [Mock Draft Simulator](https://www.rotowire.com/football/mock-draft) — CPU/auto-draft opponents, configurability, grades/outcomes, assistant recommendations, free/paid split.
- [Mock Draft Simulator explainer (article 119785)](https://www.rotowire.com/football/article/fantasy-football-mock-draft-simulator-119785) — ADP-driven, platform-specific board behavior (Yahoo vs. Sleeper).
- [RotoWire Partner / data-licensing page](https://www.rotowire.com/partner/) — "proprietary modeling engine," STATS LLC + Sports Info Solutions footer, GDC Media → GDC America → Roto Sports chain, no Sportradar.
- *Secondary (not load-bearing, not re-verified this pass):* [Common Fantasy Football Rankings Biases](https://www.rotowire.com/football/article/common-fantasy-football-rankings-biases-117058); [RotoWire Fantasy Football Glossary](https://www.rotowire.com/fantasy/football/glossary) (used only to establish an absence of advanced-metric definitions).

**Third-party accuracy (referenced by methodology, not verified in this pass — pull live before quoting):**
- FantasyPros Accuracy Challenge — the standard independent evaluator of fantasy rankings/projections (season-long + weekly, by position/format). *Specific placements unverified here.*

**Open-data blueprint (license-clean build):**
- nflverse (`nflreadr` / `nflfastR`, MIT) — play-by-play, rosters, depth charts, snaps, participation.
- NFL Next Gen Stats (public advanced metrics) — air yards, aDOT, target share inputs.

---

*Prepared for internal GSE strategy. All algorithmic reconstructions are explicitly tagged **(inferred)**/**(speculative)**; only verbatim-sourced claims are tagged **(documented)**. RotoWire's real models remain undisclosed and were not reverse-engineered.*