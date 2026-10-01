# Rankings Program — FantasyPoints-style player rankings (2026-09-28)

> **STATUS (2026-10-01, audit): QUEUED — NOT BUILT, NOT LIVE.** The three
> products below (rest-of-season, week-by-week, positional rankings) have no
> implementing code, no API route, and no page as of 2026-10-01. This document
> is the plan only. Foundation-gated per §6; build assigned to the coding agent
> once the foundation gates clear. Do not present rankings as shipped.

**Trigger:** Garrett heard a FantasyPoints.com radio ad claiming the most accurate 2025 NFL projections because they "hand-graded every single play of the season." His directive: we do this going forward — rest-of-season rankings, week-by-week rankings, positional rankings — weeks 4 through 10 and onward, built by the coding agent once the foundation work is done.

## 0. What the ad's claim actually is (and what we must beat)

FantasyPoints' claim has three load-bearing parts, each of which we can and should test rather than accept:

1. **"Most accurate 2025 projections"** — a benchmark claim on a specific population (their projection set, presumably season-long player projections for fantasy-relevant positions) under a specific error metric (never stated in the ad — most likely MAE or RMSE on fantasy points vs. actuals). An unstated metric and an unstated population is a claim we can beat on the record by being explicit.
2. **"Hand-graded every play of the season"** — a labor claim. It means humans reviewed every play's charting tags (coverage, route, personnel, blocking assignment, etc.) and corrected automated errors. The value is real: play-level charting errors are the single largest noise source in play-level projection models. The honest question is what portion of the gain comes from the humans vs. the charting data itself — see §5.
3. **"Most accurate" vs. whose?** — A beatable claim only needs one head-to-head we can document: our 2026 rankings vs. theirs, same players, same weeks, same metric, published before kickoff, scored after. See §4 for the scoreboard.

**The honest gap we will not fake:** we are not going to claim 32 charting analysts overnight. §5 specifies the automated equivalent and what genuinely needs human eyes, with cost honesty.

## 1. The three ranking products

All three ship from the same projection core; they differ in aggregation and horizon.

| Product | Definition | Update cadence | Audience |
|---|---|---|---|
| **Rest-of-season rankings** | Projected fantasy value, remaining weeks of the season, by position | Weekly (Tuesday publish, after waivers settle) | Season-long managers, trade decisions |
| **Week-by-week rankings** | Projected fantasy points for the *upcoming* week, by position | Weekly (Wednesday publish, frozen Thursday AM) | Start/sit, DFS cross-check |
| **Positional rankings** | Ordered boards QB/RB/WR/TE (K/DEF optional) with tier breaks | Updated with each weekly publish | Draft prep, ROS planning |

**Start window:** Week 4 onward, continuing through the fantasy playoffs (weeks 4–10 named explicitly; the machine does not stop at 10). First publish targets the week after the foundation gates clear (Phase 10 dependencies, §6).

## 2. What the rankings consume (inputs, in dependency order)

The rankings are a *consumer* of the engine, not a parallel build. Each input must exist before rankings can ship honestly:

1. **Locked projection source** (Phase 1 — Garrett's call). The projection source is the atomic unit everything else hangs off. Rankings without a locked source are decoration.
2. **Adjustment layer v1** (Phase 4) — injury/depth-chart adjustments in TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG form. A ranking that doesn't move when a backup LT starts is wrong on arrival.
3. **Player signals table** (Phase 4) — populated, not empty. Rankings consume the same signals the engine consumes; there is exactly one signal pipeline, not a rankings-specific one.
4. **NGS reasoning fuel** (internal only, §7) — NGS-derived features inform the *reasoning* (movement priors, matchup adjustments) but never appear as NGS metric names or values in any ranking output or public surface.
5. **Off-field intake** (Phase 9) — nutrition/psychology/cognitive signals where backtested, folded into the same pipeline.

**Hard rule:** the rankings never maintain a separate projection fork. One projection core, three presentation aggregations. A divergence between the engine's pick and the published ranking for the same player/week is a bug, not a feature.

## 3. Computation and versioning

- **Deterministic core:** same inputs → same ranking. Seeds fixed and recorded; the training log discipline from the movement spec (every number file-verifiable) applies here too.
- **Snapshot per publish:** every weekly publish is an immutable snapshot `{season, week, product, generated_at, input_hashes, model_version}`. Once published, a snapshot is **frozen** — never edited in place.
- **Revision policy:** if a material input changes after publish (late injury news, source correction), the correction ships as a *new* snapshot with a changelog entry: `{old_snapshot, new_snapshot, changed_players, reason}`. The changelog is part of the product — it is what makes the accuracy scoreboard auditable.
- **Confidence display:** rankings carry tiers/bands, not false precision. The `nflalgorithm` confidence-tier pattern (Premium/Strong/Marginal/Pass) from the sweep is the presentation model, dropped onto the 9.2 Hold quality floor.

## 4. Public benchmarks (Garrett killed the head-to-head scoreboard — this replaces it)

Garrett's call, 2026-09-28: no "our accuracy vs FantasyPoints" scoreboard. The public benchmarks already exist. What follows is what they are, how they're computed, and the evidence for/against the radio claim — researched 2026-09-28.

**The public benchmarks that exist:**

1. **FantasyPros accuracy rankings** (fantasypros.com/nfl/accuracy/) — the canonical analyst benchmark. 150+ fantasy analysts scored on how well their rankings predicted actual results; weekly and in-season leaderboards. Methodology: rankings-vs-actuals accuracy gap, worst week dropped. Reference points: 2025 in-season winner Justin Boone (Yahoo); 2024 winner Tyler Orginski; Nathan Jahnke (PFF) has been the most accurate in-season ranker in six straight seasons per FantasyPros' competition. Draft rankings accuracy is tracked separately: fantasypros.com/2026/07/2025s-most-accurate-fantasy-football-draft-rankings/ — 3-year rolling window, Jody Smith (Draft Sharks) #1.
2. **Fantasy Football Analytics (FFA) MAE study** (fantasyfootballanalytics.net/2024/12/which-fantasy-football-projections-are-most-accurate.html) — projection-level accuracy, Mean Absolute Error, 2019–2023, startable pool (top-20 QB/TE, top-50 RB/WR). Findings: per-position leaders rotate year to year (FFToday, CBS, FantasySharks, NumberFire each lead somewhere); the FFA simple average is consistently near the top across positions and seasons — the consensus beats almost every individual source. ESPN excluded for incomplete data.
3. **FSTA awards** — the industry awards (Fantasy Sports Trade Association) include "most accurate projections" categories (Sean Koerner, Action Network, 4x winner per public bios).

**The evidence for/against the FantasyPoints "most accurate 2025" claim:**

The radio ad's claim is *narrower* than it sounds. FantasyPoints' own page (fantasypoints.com/nfl/projections) states it as: **"#1 DFS Fantasy Projections"** — 2025 season, DraftKings, "weekly correlation testing across 18 regular-season main slates," their projections "landed closer to the actual DraftKings results than the other leading competitors we tracked." Their newsletter cites 0.71 CORREL, "#1 among the top 5 biggest DFS sites, after finishing 2nd-best last year" (newsletter.fantasypoints.com/p/early-bird-discount-2026). Supporting color on the same page: they hand-chart every snap of every game; Milly Maker subscriber wins 2023–2025; FSWA nominations.

Against it: the competitors are anonymized ("Comp. 1–3"), the full methodology is unpublished, and **no independent benchmark tracks FantasyPoints** — FantasyPros' analyst leaderboards and the FFA MAE studies do not include them as a source. Their claim is DFS-projection correlation on DK slates, which is a *different measurement* from what FantasyPros scores (analyst ranking accuracy) and from what FFA scores (projection MAE). Self-reported correlation against unnamed competitors is not independently verifiable from public data.

**What this means for GSE:** if we want public validation, the existing arenas are (a) the FantasyPros accuracy leaderboards (register as a ranking analyst), or (b) an FFA-style MAE comparison published with the same startable-pool methodology. The claim we'd be measured against is stated above — same population, same weeks, same metric. That choice is decision #15's replacement item in the decision log.

**Internal accuracy tracking stays:** MAE/RMSE/Spearman vs. actuals per position per week, scored automatically after games finalize, confidence intervals on differences, misses recorded honestly. It is the record; the public benchmarks are the arena.

## 5. The "hand-graded every play" problem — automated equivalent vs. human review

FantasyPoints' edge, if real, comes from corrected play-level charting. Decompose it:

**Automatable (the coding agent builds this):**
- Play-level tagging pipeline over all-22/coaches film where legally available: personnel, formation, coverage shell, route concepts, blitz identification. This is the charting-data half of their claim, and it is buildable.
- Automated QC: cross-tag consistency checks (personnel vs. formation geometry, coverage shell vs. safety depth), anomaly flags on tags that break physical plausibility (the movement spec's physics sanity checks, applied to charting).
- Diff-against-source: every automated tag carries a confidence; low-confidence tags are the review queue, not the whole season.

**Genuinely needs human review:**
- Ambiguous coverage rotations and disguised shells (the exact plays where automated charting fails most).
- The review queue from the automated QC — a sampled, prioritized subset, not "every play."
- Edge-case adjudication that feeds back as training labels (the human pass improves the automated tagger over the season — this is the compounding version of their labor claim).

**Cost honesty:** full hand-grading of every play is a staffing decision with a real price tag, not an engineering decision. The program ships the automated pipeline + prioritized review queue first; the staffing question (how many reviewers, which plays, what it costs) goes in the decision log, not in the build. We do not claim "hand-graded" until humans actually graded.

## 6. Build order dependency (non-negotiable)

The rankings program is **Phase 10** of the orchestration — it cannot start until:

1. Phase 1: projection source locked (Garrett's call — the master gate).
2. Phase 4: adjustment layer v1 + player signals populated.
3. Phase 9 (partial): off-field intake wired where backtested — rankings v1 may ship on on-field signals alone, with the intake folded in as it clears backtest.

Building rankings before the projection source is locked would produce numbers with no foundation — the exact failure mode Garrett flagged ("we obviously can't do that until everything's fucking done"). The coding agent brief for rankings (brief H in `coding-agent-briefs.md`) carries these gates as hard preconditions, not suggestions.

## 7. NGS internal-only doctrine applies in full

NGS data and metric names **never appear** in any ranking output, article, or public surface — not even a little. NGS is reasoning fuel only: the engine learns from it the way a person studies film and forms their own judgment. The fence rule in `ngs-feed-creation-plan.md` §0.A applies to the rankings pipeline verbatim: any NGS field or metric identifier in a rankings-facing route fails CI. Rankings display our own derived judgments, never their data.

## 8. Open items for the decision log

- Public benchmark arena: which leaderboard(s) GSE appears on (FantasyPros analyst registration vs. FFA-style MAE comparison), and the scoring formats per those benchmarks' rules.
- Human review staffing: queue size, cost, and whether v1 ships automated-only.
- Scoring formats: publish PPR primary; record half-PPR/standard for audit.
- K/DEF rankings: in or out of v1.

*Research only. No code written. No credentials in this document.*
