GSE — Reconciled Build Plan from 3 Independent Grok Research Passes on the 58 High-Relevance Papers

Sources: Pass 1 = v1 brief output (clustered scaffolding, full-text reads, real repo links, strongest per-paper coverage). Pass 2 = v2 brief output ("independent" framing; broad coverage was thinner — many "not fully extracted" entries — but its focused deeper re-read of ~12 papers surfaced genuine corrections to Pass 1, including a real flaw in the proposed ensemble design). Pass 3 = unsolicited self-critique pass that introduced ~50 NEW arXiv IDs outside the original 58-paper set; those new IDs are UNVERIFIED (see caveat below) but its structural arguments are consistent with Pass 1 and Pass 2 and are included on that basis.

Data-integrity finding (verified directly, not by either Grok pass)

Pass 2 flagged 6 of the 58 IDs as "unresolved / no relevant paper found / misidentified": 2503.21713, 2503.23911, 2505.21543, 2602.08083, 2606.09327, 1906.05029. Direct arXiv metadata lookup confirms all 6 are real, on-topic papers (one of them, 1906.05029, is a genuinely relevant Bayesian in-game soccer win-probability model — a real gap in Pass 2's coverage, not a dead end). Titles are corrected in the "Grok 58 Dossiers (Reconciled)" tab. Net effect: Pass 1's per-paper coverage was more reliable than Pass 2's on basic paper identification, even though Pass 2's framing was the one explicitly designed for independence. Treat Pass 1 as the primary source and Pass 2/3 as review layers, not the reverse.

Top "build this first" — reconciled across all 3 passes

Where the passes agree: 2501.02505 + 2406.19563 (rank-clustering / partial rankings, as the Bootstrap-mode replacement) and 2408.08331 (run the Poisson baseline as a diagnostic before building anything new) appear in the top tier of all three passes — this is the highest-confidence recommendation in the entire set.

Where they disagree: Pass 1 leads with 1701.05976 (Lopez-Matthews-Baumer hierarchical state-space model) as the architectural foundation, because it is the only paper that simultaneously supplies a per-sport noise model, a generative backbone for the CEPT ensemble, and public JAGS code. Pass 2 (revised) instead leads with 1704.00197 (iWinRNFL) as a fast, low-cost diagnostic. These are not actually in conflict — 1704.00197 is cheap enough to run first as a sanity check (does a 10-feature logistic regression already beat GSE's current model?), and 1701.05976 is the right next step if it does, since it is the more structurally complete answer for a multi-sport platform. Recommended order: 1704.00197 → 2408.08331 → 1701.05976 → 2208.08598 → 2501.02505/2406.19563.

1. 1704.00197 (iWinRNFL) — run as a cheap NFL diagnostic first. Low cost.

2. 2408.08331 (ML vs. Poisson) — run the Poisson baseline as a diagnostic before building anything new. Very low cost.

3. 1701.05976 (hierarchical state-space) — the structural backbone: per-sport noise model, has public JAGS code, feeds the CEPT ensemble. Medium cost.

4. 2208.08598 (conformal win probability) — calibration wrapper with a public repo; pair with a well-specified base model (Pass 2's correction: conformal fixes coverage, not point-estimate bias, so base-model quality matters first).

5. 2501.02505 / 2406.19563 (partial rankings / rank-clustered BTL) — the Bootstrap-mode replacement all three passes converge on.

6. 1710.02824 (Beating the Bookies) — cheap one-time diagnostic: does CLV actually correlate with better Brier scores in GSE's own settled picks? If not, the CLV benchmark itself needs revisiting.

CEPT ensemble — corrected design

Pass 1's original 4-expert proposal (iWinRNFL + LinNet + rank-clustered BTL + conformal) does not compose as stated — Pass 2 caught this: the base models output probabilities over different units of analysis (in-game state, lineup matchup, ranking, interval), so they cannot be multiplicatively combined without an intermediate layer. Corrected design: (1) a common target across base models, (2) a meta-model / stacked generalization layer (e.g. logistic regression on base-model outputs + game-state features) that reconciles the different units of analysis, (3) Bayesian model averaging for expert weights, weighted by each model's posterior probability rather than fixed weights, (4) a conformal calibration layer wrapped around the meta-model's output using a sliding window (not the full history, since GSE's data is sequential and not exchangeable), (5) rank-clustered BTL as the sparse-data fallback.

Bootstrap mode replacement

Converged recommendation: replace the ad-hoc confidence cap with rank-clustering (2501.02505 for general ranking, 2406.19563 for pairwise BTL comparisons). When data is sparse, statistically indistinguishable picks are shown as a tied cluster rather than an arbitrarily capped point estimate. As picks settle and evidence accumulates, clusters split and rankings sharpen — this maps directly onto the existing pick lifecycle (proposed → modeled → published → graded → settled) and is more consistent with the "math you can read" brand than a numeric cap ("we can't tell these 5 picks apart yet" vs. "confidence: 0.62").

Structural critiques — things that argue GSE's current approach may be wrong, not just under-tuned

1. Model complexity does not appear to buy calibration or accuracy in this literature (2408.08331 in soccer, 1704.00197 in NFL, independently). If a 10-feature logistic regression or a plain Poisson baseline matches or beats GSE's current MAE, the problem is features/data/training procedure, not model architecture.

2. GSE's "maximize win probability" decision paradigm may itself be fragile under model uncertainty (2311.03490) — published picks may be overconfident because uncertainty isn't propagated into the published number. Concrete fix: bootstrap-resample the calibration gate itself (1,000 resamples of settled picks per window, require the 95th percentile of Brier/ECE — not just the point estimate — to clear the launch threshold).

3. The market-efficiency assumption behind the CLV benchmark is contested in the literature itself (1710.02824, 2008.01485) — run the cheap internal diagnostic (does high CLV actually correlate with better Brier in GSE's own data?) before continuing to treat CLV as the public accuracy standard.

4. The withdrawn FightTracker paper (2312.11067) is a direct warning about the "3 consecutive green windows" gate: short evaluation windows can make a losing model look profitable. Pair the windows requirement with the bootstrap-resampling check above.

5. (Pass 3, unverified citations, offered as a hypothesis worth testing rather than a confirmed finding): GSE's calibration failure may partly be a selection-bias/estimator-variance artifact of training on the platform's own historical settled picks, rather than a pure miscalibration problem — worth a simulation-based diagnostic (generate games with known true probabilities, measure how much of the observed calibration error is intrinsic estimator variance vs. genuine model misspecification) before assuming a full recalibration is needed.

Caveat on Pass 3

Pass 3 introduced roughly 50 new arXiv IDs not part of the original 58-paper / 1,343-paper corpus, and none of them have been verified the way the 6 disputed IDs above were. Given Pass 2 already showed a real failure mode (misidentifying genuine papers as dead ends), Pass 3's specific citations should be treated as unverified leads pending a spot-check, not as confirmed facts — its full text with all citations is saved separately for reference. Its structural arguments (feature relativization, checking for selection bias, bootstrapping the gate) are worth taking on their merits regardless of citation status, since they reinforce rather than contradict Pass 1 and Pass 2.