# 1055 — A paradox of tournament seeding

## Citation / full-text source

- arXiv:2011.11277v6 — full text: https://arxiv.org/pdf/2011.11277
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2011.11277v6
- **Full-text URL**: https://arxiv.org/pdf/2011.11277v6
- **Authors**: László Csató
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1105.5065v1 ("M-estimators for Isotonic Regression") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion. From the deduped candidate pool, 2011.11277v6 was selected because (a) it exposes a concrete incentive-compatibility failure in coefficient-based seeding with a constructive fix, (b) it is short, rigorous, and fully verified by proof, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2011.11277` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v6 PDF text via pdftotext: 13 pages — abstract, the seeding paradox construction (coefficient-based seeding can punish better qualification performance), the proposed remedy, proofs, discussion, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

Under UEFA-style coefficient-based seeding, can a team be punished with a worse seed — and thus a harder draw — for performing better in qualification?

## Summary

The paper proves a paradox: under UEFA-style coefficient-based seeding, **a team can be punished for performing better in qualification** — a higher-ranked qualifier can receive a *worse* seed (and thus a harder draw) than a lower-ranked qualifier, because seeding uses historical coefficients rather than qualification performance. This violates incentive compatibility: teams could theoretically prefer worse qualification results.

The proposed fix is elegant: **assign each qualifier the maximum coefficient among all teams ranked below it in qualification**. This restores monotonicity — better qualification performance can never worsen your seed — while staying close to the coefficient system's intent. Core GSE lesson: **seeding/draw mechanics are not neutral background details; they create exploitable incentive structure.** For GSE, the paper's real value is as a template for *incentive-compatibility auditing* of any competition format GSE prices or writes about.

## Method

- Paradox construction: explicit example where team A outranks team B in qualification but \(c_A < c_B\) puts A in a worse pot.

- Incentive-compatibility condition: no team can improve its draw by worsening its qualification result.

## Equations / assumptions

- Formal model: set of qualified teams \(Q\) with qualification ranks; seeding pots assigned by UEFA coefficients \(c_i\).

- Remedy: adjusted coefficient \(\tilde{c}_i = \max\{c_j : \text{rank}_j \geq \text{rank}_i\}\); proof that pot assignment under \(\tilde{c}\) is monotone in qualification rank.

## Features / target

Inputs: qualified teams' qualification ranks and UEFA coefficients.

Target: seeding-pot assignment; the property under test is monotonicity — better qualification rank must never yield a worse pot (incentive compatibility).

## Validation

Proof-based: the paradox is constructed as an explicit example, and the max-coefficient remedy's monotonicity is proved.

Illustrative examples from UEFA competition seeding; no large empirical dataset (theoretical paper).

## Exact results / baselines

Paradox proved: a higher-ranked qualifier can receive a worse seed than a lower-ranked qualifier under coefficient seeding.

Remedy proved: the max-of-lower-ranks adjusted coefficient \(\tilde{c}_i\) restores monotonicity of pot assignment in qualification rank.

Baselines: standard UEFA coefficient seeding (the system exhibiting the paradox).

No numeric headline results — theoretical paper; the paradox's real-world frequency is unquantified (stated limitation).

## Code / data

Not stated in the paper.

## Dataset / schema

- Theoretical paper; illustrative examples from UEFA competition seeding (no large dataset).

## Implementation (GSE adaptation)

1. **Incentive-audit checklist for priced competitions**: before GSE prices any tournament's draw-dependent markets (group winners, qualification, outrights), run the paper's monotonicity audit — can a better result ever produce a worse draw? **Implementation**: encode each competition's seeding/draw rules as a function from results to pots; property-test monotonicity by brute force over result scenarios.
2. **Content edge**: paradoxes of format design are high-engagement content (the paper's construction is explainable in a single graphic) — a "draw mechanics" content series for GSE's X/YouTube.
3. **Draw-simulation correctness**: GSE's draw simulators must implement actual pot-allocation rules including coefficient quirks, not idealized seeding — the paradox shows the difference matters.

**Implementation difficulty** (folded in from the original standalone section):

Low. The audit is a property test over encoded draw rules.

## Leakage

- Pure theory; no empirical estimation, no leakage surface.

## Limitations

- Theoretical illustration, not an empirical prevalence study — the paradox's real-world frequency is unquantified.
- The max-coefficient remedy is one of several possible fixes; UEFA has not adopted it.
- Narrow scope: UEFA coefficient seeding only.

## GSE overlap

None in the tracked corpus. The map has no incentive-compatibility or mechanism-design coverage for tournaments; the gap list's contest-theory item is about DFS equilibria, not seeding paradoxes. **Mechanism-design auditing of competition formats is absent from the corpus** — novel.

## Reproducible test

- Reconstruct the paper's paradox example: find qualification-rank/coefficient pairs where a better qualifier lands in a worse pot; verify the max-coefficient remedy restores monotonicity on the same example.
- Property-test a recent UCL qualifying playoff's seeding rules for monotonicity violations by exhaustive scenario enumeration.

## Numeric gate

**ADAPT iff the audit finds real violations: apply the monotonicity property test to at least three competitions GSE prices (UCL, World Cup qualifying, one more); if any shows a realizable paradox scenario, the audit becomes a standing pre-pricing check;** if all are clean, keep the checklist as a one-time validation.

## Improvement experiment

(1) Generalize the audit to partial incentives (not just pot allocation but group-composition strength — a better seed could still draw a harder group); (2) quantify how often the paradox *nearly* binds in recent qualifying cycles (distance-to-violation metric); (3) extend to playoff bracket re-seeding rules. Success criterion: at least one near-violation in recent cycles that moves a team's outright price by a citable amount.

## Verdict

**ADAPT** — A clean, provable seeding paradox with a constructive fix (max-of-lower-ranks coefficient). GSE's adaptation is incentive-compatibility auditing: property-test every priced competition's draw rules for monotonicity before simulating. Cheap to implement, and the paradox construction doubles as high-engagement content.
