# [0358] Scope Meets Screen: Lessons Learned in Designing Composite Visualizations for Marksmanship Training Across Skill Levels (arXiv:2507.00333v1)

**Citation:** Emin Zerman, Jonas Carlsson, Mårten Sjöström (2025). *Scope Meets Screen: Lessons Learned in Designing Composite Visualizations for Marksmanship Training Across Skill Levels*. arXiv:2507.00333v1. URL: https://arxiv.org/abs/2507.00333
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 788 lines incl. references).
**Verdict:** ADAPT — a small but methodologically honest design study whose findings transfer directly to GSE's sports-visualization and content lane: dashboard composites anchored on raw video beat detached charts; design separately for novices vs experts; guard against cognitive overload.

## 1. Research question
Which composite visualization design — raw video, stabilized video + text, time-series plots, polar aim plot, or a combined dashboard — best supports marksmanship training feedback for novice vs expert shooters, and what design lessons generalize to other precision sports?

## 2. Dataset / schema
- **System data:** first-person rifle-scope video (Raspberry Pi camera + 16 mm telephoto lens on a hunting rifle, Raspberry Pi 3 recorder); targets with fiducial markers for template-matching detection (OpenCV); derived per-frame attributes: elapsed time, aimpoint-to-target-center distance, aimpoint velocity and acceleration, accuracy, precision (last-second windowed means).
- **User study:** 10 participants — 5 experts (0F/5M; 6, 36, 40, 45, 46 years of practice), 5 novices (2F/3M, little/no experience). Four 1-minute videos recorded outdoors by a professional shooter. Three-stage protocol per participant (~1 hour): (1) watch 5 visualizations (fixed order; different raw video per visualization to avoid priming), rate aim understanding, count shots, explain shot-count reasoning, locate shots; (2) randomized pairwise preference comparisons; (3) semi-structured interview.

## 3. Method / model
- **Five visualizations:** Vis #1 raw video (control); Vis #2 stabilized video (recoil removed, target centered) + text overlay of position/accuracy; Vis #3 juxtaposed time-series plots (aimpoint–target distance, windowed mean, Euclidean distance, acceleration, last-second accuracy/precision); Vis #4 polar plot of aimpoint trajectory (last second in color, history dashed gray) over target; Vis #5 combined dashboard — juxtaposition of three Vis #3 time-series (accuracy, precision, acceleration) + Vis #4 polar plot + Vis #1 raw video with superimposed aimpoint/target highlights (uses both juxtaposition and superimposition per Javed & Elmqvist [17]).
- **Analysis:** non-parametric tests for ratings (Mann-Whitney U for novice/expert differences; Wilcoxon signed-rank for vis-vs-vis); pairwise preferences analyzed via coefficient of consistence ζ (circular triads), test of equality D vs χ², and multiple-comparisons threshold R.

## 4. Equations & assumptions
- No modeling equations; the quantitative machinery is statistical: ζ = 1 − (24 × circular triads)/(n³ − n)-style consistency (reported ζ = 1, no circular triads); D ≥ χ²(4, 0.05) ≈ 9.448 for within-group significance; D_combined ≥ χ²(9, 0.05) = 16.919.
- **Assumptions:** 10 participants suffice for design-lesson (not population) claims; fixed presentation order doesn't bias (acknowledged as a limitation, no effect observed); baked-in non-interactive videos proxy for an interactive tool's value; shot-counting via recoil cues generalizes; expert/novice binary captures the skill spectrum.

## 5. Features / target
- Inputs: first-person shooting video + derived aimpoint kinematics.
- Targets (study outcomes): self-reported aim understanding (rating), shot-count accuracy + reasoning, shot-location understanding, pairwise preference rankings, interview themes.

## 6. Validation design
- **Mixed-methods:** quantitative ratings + pairwise comparisons with significance testing (ζ, D, R) + qualitative semi-structured interviews.
- **Controls:** Vis #1 raw video as baseline; different raw video per visualization to avoid priming; novice/expert stratification.
- **Honest limitations section:** n = 10, non-randomized order, non-interactive prototype, unaesthetic visuals, camera-mount drift, separate laptop processing.

## 7. Numerical results / baselines
- **Preference:** Vis #5 (combined dashboard) ranked 1st for novices, experts, and combined; won 20/20 novice and 17/20 expert pairwise matchups (37/40 overall); preferred in 9 of 10 cases per abstract. Rankings — Novice: Vis5 > Vis4 > Vis2 > Vis3 > Vis1; Expert: Vis5 > Vis2 > Vis4 > Vis3 > Vis1; Combined: Vis5 > Vis4 > Vis2 > Vis3 > Vis1.
- **Consistency:** ζ = 1 (no circular triads) in all groupings; D_novice = 32.32, D_expert = 22.72, D_combined = 53.76 — all significant.
- **Understanding ratings:** novice/expert differences not significant (Mann-Whitney U); only Vis #1 significantly worse than Vis #2, #4, #5 (Wilcoxon).
- **Qualitative:** experts called the acceleration graph "very useful" and wanted data filtering; both groups wanted shot-hit locations, weapon/distance info boxes; both warned Vis #5 has "too much going on" (cognitive overload — needs prior learning); recoil in raw video was a key shot-counting cue for both groups; novices fixated on aesthetics, experts on functionality.

## 8. Code / data availability
Based on Carlsson's MSc thesis [6] (public, diva-portal link in references); supplementary videos mentioned. No code repo stated; processing in Python/OpenCV described but not released.

## 9. Leakage & limitations
- **n = 10** — preference rankings are directional, not population estimates; no effect sizes beyond ranks.
- **Fixed presentation order** — ordering/learning effects possible (authors acknowledge; claim none observed).
- **Non-interactive baked-in videos** — the actual training tool would be interactive; preference for a dashboard in passive viewing may not equal training efficacy.
- **No performance outcome measured** — the study measures *perceived* understanding and preference, not shooting improvement. The core training claim is unvalidated.
- **Domain distance:** marksmanship is a closed, precision, single-actor skill — transfer of specific findings (polar aim plots, recoil cues) to open team sports is by analogy only.

## 10. GSE overlap
Per the existing-research-map: no sports-visualization-design or coaching-feedback-visualization work in Garrett's corpus. Adjacent: the real-footage clip tooling lane (ledgers 0352/0356) and the content operation (telestrated clips). This is the first *visualization design* paper — no duplication. It also resonates with Garrett's standing video rule (AGENTS.md): real footage as the base layer, commentary/analytics as augmentation — the paper independently validates "video-first, analytics-overlaid" as the preferred composite.

## 11. GSE implementation spec
ADAPT the design lessons to GSE's analytics visuals and clip content:
- **(a) Video-anchored dashboard pattern:** for any GSE visual breakdown (X video, DFS packet graphics), the base layer is always real game footage; analytics (win probability, EPA traces, route charts) are superimposed/juxtaposed around it — never a detached chart alone. The paper's Vis #5 > Vis #3 (plots alone) result is direct evidence for the existing telestrated-clip doctrine.
- **(b) Two-version rule:** build every analytic visual in a novice version (casual followers: big numbers, color highlights, minimal traces) and an expert version (sharps: filterable data, full distributions) — the study found novices want aesthetics/customization while experts want data filtering; one version underserves both. Maps to GSE's public card (novice) vs engine-deep-dives (expert).
- **(c) Overload guardrail:** cap any single visual at ~4 concurrent data layers (the paper's Vis #5 hit "too much going on" with 5 panels + overlays); each added layer must pass a "can a first-time viewer parse this in 5 seconds" check.
- **(d) Polar/directional plots for directional data:** adopt the polar-plot idiom for genuinely directional football data (e.g., target direction distributions, pass-location charts) — the study's experts specifically valued trajectory-over-target spatial plots.
- **(e) Event markers participants asked for:** always mark the outcome event (shot-hit location in their study; the score/play outcome in GSE's) — both skill groups independently requested it, and its absence was the top complaint.
- **(f) Rapid terminal feedback:** the "review within minutes of the action" principle maps to GSE's post-game/next-morning content cadence — same-day visual breakdowns while the game is fresh.

## 12. Reproducible test
- **Data:** 2–3 candidate GSE visual formats for the same game event (e.g., a touchdown drive): (A) detached stat chart; (B) raw clip; (C) composite (clip + overlaid EPA/win-prob trace + polar target chart).
- **Pipeline:** run the paper's protocol at small scale — 8–12 viewers stratified casual/sharp, fixed task (explain what happened on the drive), pairwise preference + comprehension questions (not just preference).
- **Pass gate:** composite (C) beats both (A) and (B) on comprehension accuracy with ζ = 1 consistency and significant D, replicating the paper's ranking. **Fail gate:** (B) raw clip alone wins on comprehension → the analytics overlays are decoration, and GSE should invest in clip selection, not dashboarding.
- **Second test:** novice vs expert version split — show casuals the simplified composite and sharps the filterable one; pass if each group prefers its version (validates the two-version rule).

## 13. Acceptance / rejection gate
- **Accept as evidence** for visualization *design guidance* (preference + perceived understanding, honestly caveated, significant non-parametric tests) — clears the bar for design lessons, not for training-efficacy claims.
- **Gate any GSE build** on the reproducible test above: do not redesign the content pipeline on n = 10 marksmanship preferences alone; the analogy to football content needs its own small validation.

## 14. Improvement experiment
- **(i) The missing outcome study:** re-run their protocol but measure actual shooting performance improvement (pre/post group accuracy) for Vis #5 vs Vis #1 training — tests whether preferred visualizations actually teach; hypothesis: preference ≠ learning, and the overload complaints predict Vis #5 underperforms simpler Vis #4 for novices on real skill gain.
- **(ii) Interactivity dose-response:** rebuild Vis #5 as an interactive tool (filter lines, scrub timeline, toggle layers) and test whether interactivity resolves the "too much going on" complaint — the operational question for GSE's dashboard ambitions.
- **(iii) GSE-side improvement:** test the "4-layer cap" derived in §11(c) directly — produce composite game visuals with 2, 4, and 6 data layers and measure comprehension decay; if comprehension drops non-linearly past 4 layers, the cap becomes an evidence-based design rule for the content operation rather than a borrowed heuristic.
