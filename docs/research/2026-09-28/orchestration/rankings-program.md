# Rankings Program — FantasyPoints-style player rankings (2026-09-28)

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

## 4. The accuracy scoreboard (this is how we beat the claim)

The scoreboard is a first-class product, not an afterthought — it is the public record that proves or disproves "most accurate."

- **Population:** all fantasy-relevant players at QB/RB/WR/TE, weeks 4–18, our published snapshots vs. actual fantasy points (PPR + half-PPR + standard — record all three, publish the one the audience uses, keep the others for audit).
- **Metrics:** MAE and RMSE per position per week, plus rank-correlation (Spearman) for the ordering claim. MAE for the "most accurate" headline; RMSE to punish the big misses; Spearman because a ranking is an ordering.
- **Head-to-head protocol:** for any competitor claim we test (FantasyPoints or otherwise), the rules are: same player population, same weeks, same scoring, both published before kickoff (our snapshots are frozen; theirs must be their published final), scored on actuals after. No cherry-picked weeks, no re-picked populations.
- **Statistical honesty:** report confidence intervals on the MAE differences. "We beat them by 0.3" means nothing without the interval; the scoreboard shows it. If we lose a week, the scoreboard shows that too — Garrett's standing rule is that the failures log records our misses as well.
- **Cadence:** scored automatically after each week's games finalize; the running season tally is the "beat on the record in 2026" number.

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

- FantasyPoints claim benchmark methodology: which of their products we test against (their site publishes multiple projection sets — the protocol must name the exact one).
- Human review staffing: queue size, cost, and whether v1 ships automated-only.
- Scoring formats: publish PPR primary; record half-PPR/standard for audit.
- K/DEF rankings: in or out of v1.

*Research only. No code written. No credentials in this document.*
