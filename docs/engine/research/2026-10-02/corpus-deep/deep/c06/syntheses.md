# c06 Syntheses — Cross-File Connections (Deep Research)

**Slice:** c06 · **Date:** 2026-10-02 · Companion: `verified-claims.md` (numbers), `challenges.md` (verdicts), `buildable-systems.md` (code targets).

---

## S1 — The trust lane is a transcript-first, speech+NLP problem wearing a video costume

Six independent lines of evidence converge:
- The slice's strongest trust-adjacent findings are all transcript-derived (d06 coverage-conditional tendencies from episode transcripts; the Rodgers/WR trust-circle read).
- The entire video/CV corpus (8 briefs, hundreds of pages) contains zero ASR, speaker ID, transcript alignment, or affect methods — it answers "what happened physically," not "what was said and by whom."
- The Rodgers–Metcalf miss was a **discovery/triage failure** (findable clip, no sweep), not a classification failure — no video transformer in the slice would have fixed it.
- 0379's honest −5pp on uncontrolled video says viral clips are the worst regime for vision models; audio is the primary signal in press conferences.
- 0841/1119 show that *sentiment* on social is weak signal (κ=0.25, no odds baseline); the registry's 6 accounts are curated experts — a different object requiring likelihood elicitation, not sentiment scoring.
- The corpus's own provenance doctrine (r19 defect: 990 rows labeled CONFIRMS by source-counting) demands quote-level evidence, which only transcripts provide.

**Consequence:** the trust-signals extraction framework is architecturally transcript-first (ASR → diarization/ID → NLP claim extraction → structured signal record). CV plays three supporting roles only: shot segmentation, speaker-presence confirmation, dedupe. Text extractors must run with zero GPU dependency — the trust pipeline must not wait on the CV stack.

## S2 — LEAP is the scoring mechanism; the market is the gate

The corpus's news-fusion story, connected end to end:
- **LEAP (0440)** gives the mechanism: per-item isolated likelihood elicitation → story-clustered tempered Bayesian update → LOO Δⱼ audit trail. Verified gains (ECE halved, Brier −16.5) are paper-domain; the mechanism ports, the numbers don't.
- **The prior carries the weight** (LEAP ablation) + **RES≈0** (engine-native probabilities carry no discrimination) + **ŵ=0.000** (0670: the market adds zero to a structural model, and by symmetry a news-fused engine score must prove ŵ>0 against the close) → news fusion **calibrates the prior; it cannot create resolution**. The trust layer earns weight only where news precedes market pricing: injury/role changes, expert-model disagreement (Waldman's sims vs Vegas prop lines).
- **BoRaEM (0530)** gives the per-source reliability concept (v1: sibling's TIER_PRIORS × tipster EMA; v2: joint EM).
- **1556 γ=0.5** correction is the downstream layer, gated to post-calibration with the |e_t|>3σ skip rule.
- The ledger already specified the NFL port backtest (2024–2025, frozen pre-kickoff evidence, Brier ≥0.010 AND ECE ≥25% gates). It is specified but **not run** — that is the single most important unrun experiment for this lane.

## S3 — Target concentration is the behavioral half; opinion concentration is the social half — same math, different objects

- **Behavioral (Track 1):** target HHI `Σ share_i²` + EffN + situational deltas (3rd/RZ/trailing-4Q) + absence-driven deltas (M1–M3, all pbp-computable). c06 has no in-slice method; the canonical definition is adopted from the verified formulas (trust-qb-behavior §3). Coverage-conditional shares (M5) wait on a charting feed.
- **Social (this lane):** *expert consensus concentration* — τ-weighted direction HHI over story clusters. Same math, applied to opinion rather than targets. Do not conflate the two objects in feature naming.
- **The bridge:** the profile-anchored prior — Track 1 HHI as μ0 for the trust aggregator (v2, unfitted). A QB with EffN≈3 (blanket) whose press-conference trust signals turn negative is a sharper signal than either alone. This is INFERENCE (designed, not validated).
- **Naming discipline:** the measurable object is *concentration*; "trust" is the interpretation. Label features accordingly.

## S4 — Provenance is the load-bearing property of the whole lane

Connected doctrine:
- Registry rule: every item carries source URL or PROVENANCE-GAP (never invent content).
- r16 signal-ledger: append-only, corrections as new entries, never edits.
- LEAP LOO Δⱼ: per-item contribution to any published score, each traceable to a URL or gap note — the headline audit guarantee.
- Gap propagation: PROVENANCE-GAP items pin wᵢ to the 0.05 floor (LEAP's role-weight range); the two known registry gaps must carry gap weight if used at all.
- r19 anti-pattern enforced in code: agreement = τ-weighted direction HHI, **never source counts**; `CLEAR` requires ≥2 story clusters (one story-cluster, however many quote-posts, is one voice — LEAP's dependency-clustering lesson: removing it drove ECE 0.088→0.158).
- Temporal discipline: all evidence timestamp-frozen pre-kickoff (0841's missing time-ordered split is the exact failure to avoid); `frozen_pre_kickoff` computed from kickoff table.

## S5 — The d06 numbers are hypotheses; the d06 *ritual* is the asset

The week-3 transcript numbers (84%/44%/41%) are UNVERIFIED host assertions with no denominators — do not hard-code them as priors. But the file's ✅/❌/⚠️ verification ritual (injury claims verified, usage stats flagged) is the durable pattern for any transcript-mining pipeline: **extract claims, verify the verifiable, flag the rest**. The quote-miner's output contract follows this: emit the raw quote so a human can judge, never just the score (video-cv P3 rule).

## S6 — Calibration floors are inconsistent across the corpus — use the stricter, and say so

- ECE floor: 0.04 (wiring manifest) vs 0.05 (launch doc). Sample floor: n≥100 (launch doc) vs N≥500 (checklist, explicitly "strawman").
- The map slightly inflates the wiring manifest's floors. For the trust lane: adopt ECE ≤0.04 / N≥500 as the stated bar, note the discrepancy, and never lower floors to greenwash (the standing rule).
- The "unanimous RES≈0" verdict is one measurement family (MURPHY_COMPONENTS_EXPLORE) repeated across ~12 ops docs — the phenomenon is corroborated 3 independent ways, but cite it as one family, not twelve.

## S7 — What the slice says about build order (wire-first)

The corpus's own sequencing doctrine, assembled:
1. ŵ-vs-close protocol (0670) — does the new signal add anything over the market?
2. Sealed bridge bar (0.2120) — beat it before weight.
3. Walk-forward entry gates (|r| thresholds are author-set knobs; state them).
4. Resolution before recalibration — never recalibrate RES≈0 (the LAUNCH_FINISH_LINE mandate).
5. ECE-selection bake-off (1079) — calibration-selected beats accuracy-selected under Kelly.
6. Margin gating after feasibility arithmetic (1784) — analogies must be re-proven empirically.
7. γ=0.5 correction with |e|>3σ skip (1556).
8. Conditional-coverage audits for small windows (0450 — the 19% is illustrative, not constant).
9. Fee-aware sizing last (1755).
10. Display = market-anchored probabilities only; never legacy confidence as probability.

For the trust-signals module this means: **all scores ship shadow/UNCALIBRATED as triage indices** until the 0440 NFL-port backtest + 0670 ŵ>0.05 gates pass. The wire-first order (research → wire → weight → calibrate → test → polish) is not jumped.

## S8 — The three hard blocks, ranked

1. **No live X feed** (X direct fetch blocked; mirrors 403ing). No feed, no pipeline — needs an X-accessible environment, not more code.
2. **No charting feed** (man/zone, blitz, routes, first-read). Coverage-conditional trust claims (M5) are untestable in-engine until FTN/Fantasy Points/PFF/Sumer is wired.
3. **No speech pipeline** (ASR/diarization/speaker ID) and **no biometric policy**. The quote-miner assumes transcript text input; the real version needs both the tech lane and the policy decision.

Everything else in the build list is buildable today on stdlib+numpy+pandas+sklearn.
