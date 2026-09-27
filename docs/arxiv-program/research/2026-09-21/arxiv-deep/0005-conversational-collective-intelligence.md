# 0005 Conversational Collective Intelligence (CCI) using Hyperchat AI in a Real-world Forecasting Task (arXiv:2511.03732v2)

**Citation:** Hans Schumann, Louis Rosenberg, Ganesh Mani, Gregg Willcox (2025). *Conversational Collective Intelligence (CCI) using Hyperchat AI in a Real-world Forecasting Task*. arXiv:2511.03732v2. URL: https://arxiv.org/abs/2511.03732v2. Published in: 2025 11th International HCI and UX Conference in Indonesia (CHIuXiD). IEEE, Dec 2025.
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 758 lines including references).
**Verdict:** REJECT — vendor-authored study (all authors are Unanimous AI, the company selling Hyperchat AI/Thinkscape) with n = 59 games, no preregistration, no control arm, and uncorrected multiple comparisons; the "beats Vegas" headline does not survive scrutiny, though the deliberation-intensity × confidence interaction is a cheap enough idea to test internally before dismissing the mechanism entirely.

## 1. Research question

Does real-time conversational deliberation among a networked human group — structured by AI "Conversational Surrogate" agents that relay insights across subgroups (Hyperchat AI on the commercial Thinkscape.ai platform) — produce sports forecasts that beat Vegas betting markets? Specifically: do the group's "High Confidence" picks (converged prediction that one team wins by ≥ 1.5 runs) outperform the published Vegas odds, do they generate hypothetical betting ROI (moneyline and against-the-spread), and does deliberation intensity (messages per minute) moderate accuracy?

## 2. Dataset / schema

- **Forecasts:** 60 MLB games collaboratively predicted, one rained out → final dataset of 59 forecasts.
- **Sessions:** 15 forecasting sessions run on Tuesday and Friday afternoons during seven consecutive weeks of the 2025 MLB season starting on July 18 (the abstract describes this as "an 8-week period" — both phrasings appear in the paper).
- **Participants:** approximately 20–25 per session (abstract: "approximately 24 sports fans"); sourced from Prolific, self-identified as "baseball fans," paid approximately $6.50 per session. Five subgroups ("Thinktanks") of 4–5 participants each, plus one AI Conversational Surrogate agent per subgroup.
- **Protocol:** per session, 4 games; per game, ~5 minutes of text-chat deliberation on Thinkscape.ai. Participants were shown the two teams, starting pitchers, and home field, then asked "Which team is most likely to win this game and by how many runs and why?" An LLM processed each participant's dialogue in real time to track beliefs; the weighted mean of predicted margin at the end of the 5 minutes was stored as the final collective forecast.
- **Benchmarks:** Vegas odds for each game "documented from a major sportsbook" (unnamed), plus ATS (run-line) prices.
- **Schema (per game):** date, session, teams, pitchers, home field, collective predicted winner, collective predicted margin, confidence class (High/Low), messages-per-minute, Vegas moneyline odds, Vegas ATS line, realized outcome.
- **Access:** proprietary. No dataset file, no code, no conversation transcripts published. Thinkscape.ai is a commercial product of Unanimous AI.

## 3. Method / model

No statistical model is fit in the ML sense. The "method" is the Hyperchat AI deliberation protocol: (1) split ~24 participants into 5 subgroups of 4–5; (2) insert an AI Conversational Surrogate into each subgroup tasked with (i) monitoring local discussion, (ii) extracting insights, (iii) sending insights to agents in other subgroups, (iv) expressing received insights conversationally locally — with an "intelligent matching algorithm" that preferentially injects counterpoints the subgroup has not yet considered; (3) after 5 minutes, aggregate via LLM-derived weighted mean predicted margin; (4) classify: predicted margin ≥ 1.5 runs → High Confidence; < 1.5 runs → Low Confidence. Analysis: accuracy by confidence class vs Vegas-implied win rates; Poisson-binomial test of High-Confidence accuracy vs per-game Vegas odds (p = 0.020); non-overlapping 95% CIs for High vs Low accuracy; Cohen's d = 0.82 for the High-vs-Low difference; hypothetical $100 flat-stake betting P&L (moneyline: 37% ROI, $997; ATS: 46% ROI, $1,245, p = 0.037); inverse betting against Low-Confidence picks (23% ROI, $736); and a post-hoc split by above/below-average messages-per-minute within each confidence class.

## 4. Equations & assumptions

No equations are stated in the paper — the statistical tests are named, not derived. Test procedures as described: Poisson-binomial distribution for the significance of 78% accuracy across 27 High-Confidence forecasts vs expected win percentage from published Vegas odds (p = 0.020); 95% confidence intervals for true accuracy of High and Low Confidence predictions (method for CIs not specified); Cohen's d = 0.82 for High vs Low difference.

Assumptions (mostly unstated; reconstructed here and labeled as analysis, not paper claims): the 1.5-run High/Low threshold is treated as meaningful but its choice is never justified or preregistered; the Poisson-binomial null assumes Vegas-implied probabilities (vig-inclusive, from an unnamed book) equal true win probabilities; the 59 games are treated as independent trials despite 4 games sharing each session's participant pool and conditions; the messages-per-minute split assumes conversation rate measures deliberation quality rather than game easiness; the hypothetical betting assumes $100 flat stakes obtainable at the documented odds with no line movement, limits, or fees. The paper does not state that participants were prohibited from checking odds, news, or lineups on their own devices during the unsupervised 5-minute sessions.

## 5. Features / target

No ML features. Inputs to the group: team identities, starting pitchers, home-field indicator (the only information the protocol deliberately provided). Target: binary game outcome (which team won), scored against the group's picked team; secondary "target" is the ATS cover (win by ≥ 2 runs). The confidence label (High/Low) is derived from the group's own predicted margin (≥ 1.5 runs or not), i.e., the stratification variable is a function of the forecast itself.

## 6. Validation design

There is no train/test split, no preregistration, and no control arm — this is a single-arm observational study. The critical missing control: the same participants' *pre-discussion* individual predictions (or a simple poll average) are never compared against the post-deliberation consensus, so the claim that *deliberation* caused the accuracy has no baseline. Game selection (which 4 games per session) is not described — selection criteria unstated. The High/Low threshold (1.5 runs), the above/below-average conversation-rate split, and the inverse-Low-Confidence betting rule are all applied post hoc with no stated pre-specification. Multiple p-values are reported (p = 0.020, p = 0.037, p = 0.010, p = 0.116) with no multiple-testing correction across the many slices (confidence × conversation-rate × moneyline/ATS × favorite-status). The ATS analysis re-uses the same 27 High-Confidence games as the moneyline analysis — not an independent confirmation.

## 7. Numerical results / baselines

All numbers below are the paper's, quoted exactly:

- 59 forecasts (60 games predicted, one rained out); 27 (46%) High Confidence, 32 (54%) Low Confidence.
- High Confidence accuracy: 78% vs "average Vegas odds of 57%," Poisson-binomial p = 0.020.
- 95% CIs: High Confidence between 59.2% and 89.4% accurate; Low Confidence between 25.5% and 57.7% — "These intervals do not overlap."
- Cohen's d = 0.82 ("large practical difference").
- Moneyline wagering: $100 on all 27 High-Confidence games → 37% ROI, total profit $997.
- ATS wagering on all 27: accuracy 63%, profit $1,245, 46% ROI, p = 0.037.
- Low Confidence: 32 games, 41% win rate vs Vegas odds predicting 53%; betting against all Low-Confidence picks → 23% ROI, $736 profit.
- Favorite bias: 43 out of 59 teams selected (73%) were the Vegas favorites. High-Confidence favorite picks (23 games): 78% accurate. Low-Confidence favorite picks (20 games): 41% accurate.
- Conversation quality: High Confidence + above-average conversation rate (16 games): 88% accurate vs 57% odds, p = 0.010; High + below-average: 64%. Low Confidence + above-average rate (13 games): 31% accurate vs 53% odds; betting against these → 69% accuracy, p = 0.116 (not significant).
- Worked session example: Friday, September 12, 2025 — Kansas City Royals (Michael Lorenzen pitching) vs Philadelphia Phillies (Walker Buehler pitching).
- Cited prior work (not this study's result): Thinkscape groups of 35 scored average IQ 128 (97th percentile) vs median individual IQ 100 and traditional CI methods IQ 115.

## 8. Code / data availability

None stated. No code, no dataset, no transcripts. Thinkscape.ai is a commercial product; the "intelligent matching algorithm" is proprietary and undescribed.

## 9. Leakage & limitations

- **Vendor-authored.** All four authors are affiliated with Unanimous AI (Rosenberg is its founder/CEO; Schumann and Willcox list Unanimous AI emails); the paper studies Unanimous AI's own commercial product. This is the single biggest reason for REJECT: the study is marketing collateral in conference-proceedings form, and no independent replication exists.
- **Tiny sample.** n = 59 games; the headline 78% is 21 of 27; the star "88%" cell is 14 of 16. The 95% CI on the headline result is 59.2–89.4% — a range that includes "barely above the 57% baseline."
- **No preregistration; post-hoc slicing.** The 1.5-run threshold, the conversation-rate median split, and the inverse-Low betting rule are never stated to have been fixed before seeing outcomes. With enough slices of 59 games, *some* slice will show p < 0.05; the paper reports p = 0.020, 0.037, 0.010 without any multiplicity correction.
- **No control arm.** Without the participants' pre-discussion picks, "deliberation caused accuracy" is unidentified. The conversation-rate correlation is observational — livelier discussion may simply mark easier-to-handicap games.
- **Repeated measures ignored.** The same Prolific pool likely appears across the 15 sessions (7 weeks of Tue/Fri sessions); the 4 games within a session share participants and session conditions. The Poisson-binomial treats all 59 as independent.
- **Unsupervised participants could look up anything.** Paid fans at home, 5 minutes per game, no stated prohibition on checking odds, injuries, or lineup news mid-session. Any "deliberation" effect is confounded with "24 people with web browsers."
- **The baseline is flattered.** Vegas-implied probabilities include the vig (~4–5% overround), so "57% average odds" overstates the true-probability baseline slightly, and the Poisson-binomial null assumes odds = truth.
- **Arithmetic the paper doesn't do (my analysis, not the paper's claim):** total group record is 34–25 (57.6%) vs ~32.4 wins expected from Vegas — the *overall* edge is negligible; 100% of the outperformance is concentrated in the High-Confidence slice. Further: High-Confidence favorites went ~18–5 while Low-Confidence favorites went ~8–12, so favorites picked overall went ~26–17 (60.5%) — roughly the naive always-pick-the-favorite rate — and picked underdogs went ~8–8. The "beats Vegas" story is, arithmetically, "the group sorted favorites into 23 it felt good about (78% won) and 20 it didn't (41% won)." That is consistent with genuine deliberative signal — but also with the group simply sensing game easiness, which is a far less magical mechanism.
- **Game selection unstated.** Researchers chose 4 games per session from "that evening's" slate; cherry-picking competitive or high-profile games would shape all results.
- **ROI figures are frictionless.** $100 flat stakes at documented odds, no line shopping, no limits, no fees; the 46% ATS ROI on 27 games is 17–10 — two games the other way and the story halves.
- **External validity to GSE: nil as presented.** 5-minute chats among paid baseball fans do not transfer to NFL forecasting operations, and the "up to 250 people" scaling claim is untested in this study (groups were ~24).

## 10. GSE overlap

No duplication — GSE has nothing like deliberation-based forecasting in its inventoried corpus. The adjacent lane is prediction markets (ecosystem triage 2026-08-09, Kalshi tooling, market-implied ratings): both aggregate crowd belief, but markets aggregate *stakes* while Hyperchat aggregates *conversation*. The paper's genuinely portable idea is not the product but the measurement: **deliberation intensity × self-rated confidence as a confidence signal** — High+high-deliberation was the best cell (88%), Low+high-deliberation the worst (31%), i.e., vigorous debate that fails to converge is itself a strong (inverse) signal. That interaction is cheap to test and does not require believing any of the paper's ROI claims. Everything else (the platform, the surrogates, the "beats Vegas" framing) has no GSE counterpart and, per the verdict, should not get one.

## 11. GSE implementation spec

Do NOT implement Hyperchat AI or license Thinkscape. The only thing worth building is a **minimal internal replication of the confidence × deliberation interaction**, because it is the one claim that is both interesting and cheap to falsify:

1. **Design:** before selected NFL games (or a paper-trading slate), run a 10-minute structured deliberation among 6–10 GSE-side participants (analysts and/or a recruited fan panel) in a plain group chat — no AI surrogates needed for v0. Each participant submits a pre-discussion pick + predicted margin and a post-discussion pick + margin; log message counts.
2. **Classify** exactly as the paper does: post-discussion predicted margin ≥ threshold → High Confidence (calibrate the threshold to NFL margins, e.g., ≥ 7 points, rather than copying 1.5 runs); split by above/below-median messages-per-participant.
3. **Score** against closing odds over one NFL half-season (~100+ games to exceed the paper's n = 59 severalfold). Preregister the threshold, the sample size, and the primary test (High+high-deliberation accuracy vs closing-odds-implied probability, Poisson-binomial) *before* the first session.
4. **Cost:** a few hours of panel time per week; zero licensing. If the interaction replicates at p < 0.05 with the preregistered test, then — and only then — consider whether a larger or AI-mediated version is worth building.

## 12. Reproducible test

The paper itself is not reproducible from its materials (no data, no code, proprietary platform), so the reproducible test is the preregistered internal replication in §11: NFL regular season, ≥ 100 games, pre-registered 7-point High-Confidence threshold and median message-rate split, primary metric = accuracy of High+high-deliberation picks vs closing-odds-implied win probability (Poisson-binomial, one-sided), with a pre-discussion poll control arm to isolate the deliberation effect the paper never measured. Baseline to beat: the closing line. Time window: one NFL half-season. The test is runnable with a group chat and a spreadsheet; it exists precisely because the paper's own evidence does not meet the bar.

## 13. Acceptance / rejection gate

REJECT the paper's claims as a basis for any GSE forecasting or wagering decision — the evidence (vendor-authored, n = 59, unpreregistered, uncontrolled, uncorrected) does not clear the bar, and the verdict stands regardless of how impressive 78% vs 57% looks. The rejection is overturned for the *mechanism only* (deliberation-intensity-gated confidence) if the §12 preregistered replication shows, on ≥ 100 NFL games: (a) High+high-deliberation accuracy exceeds closing-odds-implied probability with one-sided p < 0.05, AND (b) post-discussion consensus beats the pre-discussion poll average on log-loss (the control the paper omitted). If either fails, drop the idea entirely — do not escalate to a vendor pilot.

## 14. Improvement experiment

The paper's design cannot identify whether deliberation *causes* accuracy because it lacks the pre-discussion control. Improvement: run a **three-arm trial** on the same games — (A) Hyperchat-style deliberation, (B) silent poll of the same participants with no discussion, (C) a prediction-market treatment where participants stake play-money on outcomes. Score all three arms on log-loss vs outcomes and vs closing odds. This separates three confounded mechanisms the paper mashes together: information aggregation (B), deliberative reasoning (A−B), and incentive alignment (C−B). If A−B ≈ 0 while C wins, GSE should invest in internal markets, not chat rooms. As a second improvement, replace the paper's arbitrary 1.5-run cutoff with a **learned confidence gate**: fit the deliberation features (message rate, sentiment convergence speed, pre/post pick-switch rate) to predict forecast error on a training slate, then freeze the gate before the test slate — turning the paper's post-hoc slicing into an actual predictive model of when the crowd should be trusted.
