# [0255] SportsMetrics: Blending Text and Numerical Data to Understand Information Fusion in LLMs (arXiv:2402.10979v2)

**Citation:** Hu, Y., Song, K., Cho, S., Wang, X., Foroosh, H., Yu, D. & Liu, F. (2024). *SportsMetrics: Blending Text and Numerical Data to Understand Information Fusion in LLMs*. arXiv:2402.10979v2. URL: https://arxiv.org/abs/2402.10979
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1046 lines).
**Verdict:** ADAPT — no reusable model, dataset, or code for GSE's engine, but the adversarial stat-tracking task design (new rules, affiliation swaps, shuffled narratives, recap fill-in) is directly portable as an evaluation harness for the LLM-generated stat claims in GSE's content pipeline (X posts, clip scripts, DFS write-ups), where hallucinated numbers are the exact failure mode Garrett polices.

## 1. Research question
Can large language models fuse unstructured play-by-play narratives with numerical records — cross-referencing entities, aggregating statistics over long contexts, and maintaining a working memory for complex data queries — and how robust is that numerical reasoning under adversarial perturbations (new scoring rules, swapped team affiliations, shuffled narratives, renamed players)?

## 2. Dataset / schema
NBA + NFL play-by-play data scraped from ESPN.com, 2002–2023: 28,492 NBA games, 5,867 NFL games. Schema per game: timestamped play descriptions, player actions, team affiliations, box scores. Scoring actions are withheld from LLMs in the tracking tasks. Test set: 100 randomly selected games per sport. Scale: NBA games average 466 plays / 6,229 tokens (max 7,322); NFL games average 173 plays / 6,166 tokens (max 7,659). Data access: "available through ESPN's archives" — the assembled benchmark release is not clearly stated as public; no download link given in the paper.

## 3. Method / model
Four novel tasks on the same play-by-play substrate:
- (a) Long-form narrative tracking: LLM receives full game (or quarter-by-quarter for ≤8k-context models) and fills a JSON object (initially null) with key stats — NBA: 11 stats (team points, FG made/attempted, FT made/attempted, offensive/defensive rebounds, steals, assists, blocks, personal fouls; turnovers excluded as unreliable in pbp, box-score truth substituted for Game Score computation); NFL: passing yards, TDs, INTs, completions, attempts → NCAA Passing Efficiency. Holistic scoring via Hollinger's NBA Game Score (team-adapted) and NCAA Passing Efficiency.
- (b) New scoring rules: basketball under a "every scoring action = 1 point" rule (ground truth = count of scoring actions); player-affiliation swaps (2 players/team swapped in the roster table, pbp unchanged; ground truth recomputed under new affiliations).
- (c) Scrambled narratives: play-by-plays shuffled (timestamps preserved); non-scoring-play density varied by duplicating (p ∈ {+20%, +50%}) or removing (p ∈ {−20%, −50%}) non-scoring plays; NFL variant: players renamed to science-fiction characters.
- (d) Game-summary fill-in: LLM builds an internal JSON working memory in three steps (create → enrich + self-reflect on sufficiency → populate from pbp), then fills masked key statistics in real ESPN recaps; accuracy measured per stat type.
Models evaluated (Table 1): Claude-2.1 (200k), GPT-4-1106-preview (128k), Gemini-Pro (32k), GPT-3.5-Turbo-1106 (16k), GPT-3.5-Turbo-0613 (4k), Mistral-7B-Instruct-v0.1 (8k), Llama-2-13B-Chat (4k).

## 4. Equations & assumptions
No equations stated. Scoring aggregates used: Hollinger Game Score (referenced, formula not restated) and NCAA Passing Efficiency (referenced, formula not restated). Metrics: average absolute deviation Δ between model-predicted and box-score values per statistic (ΔPoints, ΔGScore, ΔYards, ΔATT, ΔCOMP, ΔTD, ΔINT, ΔPE; adversarial ΔNewRule, ΔSwap, ΔShuffle). Assumptions: ESPN pbp is ground truth; shuffling preserves totals (basketball actions treated as causally independent); turnovers cannot be tracked from pbp; box-score truth is the correct evaluation target.

## 5. Features / target
Inputs: full play-by-play text + team-player affiliation table (+ ESPN recap with masked stats for task d). Target: the game's key statistics (JSON fields) matching the official box score; under adversarial variants, the recomputed ground truth (e.g., 1-point-per-action totals, swapped-affiliation team scores).

## 6. Validation design
Fixed 100-game-per-sport test set; no training (zero-shot / prompted evaluation of frozen models). Comparison is across models on identical games and perturbations — a benchmark, not a trained system. No statistical significance testing reported; results are mean absolute deviations.

## 7. Numerical results / baselines
NBA (Table 2; ΔPoints/ΔGScore; NBA teams typically score 100–120 points): GPT-3.5-Turbo-1106 ΔGScore 33.50 / ΔPoints 9.45 (best points; Gemini-Pro slightly better on GScore at 32.30); Claude-2.1 55.16/21.73; GPT-4-1106-preview 51.97/25.17 — with 79% of GPT-4's returned JSON objects containing zeros/nulls on long games, and flat-vs-degrading length curves favoring GPT-3.5-Turbo and Gemini-Pro. Adversarial (ΔNewRule/ΔSwap/ΔShuffle on points): GPT-3.5-Turbo-1106 14.10/13.53/9.89; Claude-2.1 22.28/17.12/31.11; GPT-4-1106-preview 14.55/39.91/49.57. Standard models are far worse (e.g., Llama-2-13B ΔPoints 70.77, ΔGScore 110.69).
NFL (Table 3; teams average 200–250 passing yards/game): GPT-4-1106-preview best — ΔYards 34.77, ΔATT 4.44, ΔCOMP 2.96, ΔTD 0.17, ΔINT 0.13, ΔPE 14.33; Claude-2.1 ΔYards 52.53; Llama-2-13B ΔYards 244.48, ΔPE 191.76. The authors attribute the GPT-3.5-vs-GPT-4 reversal across sports to scoring frequency (basketball's frequent scoring is harder for GPT-4 to track; football's sparser scoring is easier).
Robustness findings: performance degrades as non-scoring-play density increases (needle-in-haystack); renaming players "significantly decreases all models' performance," suggesting models lean on pretraining name familiarity rather than the provided pbp; recap fill-in (Figure 8): Claude-2.1 strongest, Mistral-7B best among standard models, GPT-4 and Llama-2 struggle to build working memory (hallucinated fields). All numbers are the paper's claims on their ESPN sample.

## 8. Code / data availability
None stated (no code or dataset link; data "available through ESPN's archives" — effectively not released).

## 9. Leakage & limitations
- Models evaluated (GPT-3.5/4, Claude 2.1, Gemini Pro, Llama-2) are 2023-era; results do not transfer to current models — a 2024 benchmark of obsolete models has limited shelf life.
- No significance testing; 100-game test sets with heavy-tailed deviations make model rankings fragile (the GPT-3.5 > GPT-4 reversal on NBA may be prompt/format luck — GPT-4's 79% null-JSON rate smells like a formatting failure, not a reasoning failure).
- Renaming-players finding is confounded: worse performance could reflect tokenization/length effects rather than "reliance on parametric memory."
- The benchmark dataset is not released, so the work is not directly reusable — only the task designs are.
- Adversarial scenarios (1-point basketball, shuffled pbp) are deliberately unrealistic; the authors acknowledge this may not translate to real analytical tasks.
- External validity to GSE's engine: none — this is an LLM evaluation paper, not a predictive model; it offers no probabilities, features, or calibration relevant to picks.

## 10. GSE overlap
Extension, not duplicate. The existing-research map has no LLM-evaluation or content-QC lane: GSE's content operation (X posting via x-poster skill, clip scripts from the second chat session, weekly DFS packets) is LLM-assisted, and Garrett's standing complaint is AI-voice/garbled output — but the specific failure this benchmark measures (hallucinated statistics in generated sports copy) is unaddressed anywhere in the repo. The ML research brief's area 13 (text/news as features) is about features for the engine, not about validating LLM outputs — adjacent, not overlapping. This paper supplies the missing test methodology, not a competing implementation.

## 11. GSE implementation spec
Build "GSE Stat-Claim Harness v1" (content-QC, not engine):
- Data: 50 recent NFL games' nflverse play-by-play + official box scores (public, reproducible — sidesteps the paper's unreleased ESPN set).
- Tasks (adapted): (1) pbp → JSON stat fill (team points, passing/rushing yards, turnovers, sacks); (2) masked-recap fill-in on GSE's own published DFS write-ups; (3) affiliation-swap adversarial (swap two players' teams in the roster table); (4) unit-change adversarial (report all yardage in meters — the "new rule" analogue).
- Metric: exact-match rate on filled stats + mean absolute deviation, per model; run against whatever LLM drafts GSE content (current stack).
- Use: gate LLM-generated stat claims before they reach X posts/scripts — any claim the harness shows the model gets wrong at >5% gets routed to deterministic template rendering from nflverse instead of free generation.
- Effort: 3–4 days (task scripts + 50-game fixture set + eval runner).

## 12. Reproducible test
Dataset: nflverse pbp + box scores, 2024 NFL season weeks 1–10 (public). Metric: exact-match rate on a 12-field JSON stat object per game, averaged over 50 games. Baseline: the paper's implied baseline is "no harness" — instead test two conditions: (A) current content-LLM prompted free-form vs (B) the same LLM with the paper's three-step JSON working-memory scaffold. Window: fixed 50-game fixture.

## 13. Acceptance / rejection gate
ADOPT the harness into the content pipeline IF condition (B) beats (A) by ≥10 percentage points of exact-match stat accuracy on the 50-game fixture AND the adversarial unit-change task shows <15% degradation (i.e., the scaffold genuinely grounds the model in the provided data rather than parametric memory); REJECT the scaffold (keep only the eval harness as a monitor) if it fails either.

## 14. Improvement experiment
Replace the paper's hand-rolled JSON working memory with a tool-using variant: the LLM must emit executable pandas queries against the provided pbp dataframe and paste back query results before filling stats (execution-grounded rather than memory-grounded). Hypothesis: execution grounding eliminates the residual deviation the paper observes even in the best models (ΔPoints 9.45), because aggregation errors become code errors that either run correctly or fail loudly — test on the same 50-game fixture with exact-match rate as the metric.
