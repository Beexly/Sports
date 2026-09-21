# [0588] Learning to Identify Top Elo Ratings: A Dueling Bandits Approach (arXiv:2201.04480v2)

**Citation:** Yan, X., Du, Y., Ru, B., Wang, J., Zhang, H., and Chen, X. (2022). *Learning to Identify Top Elo Ratings: A Dueling Bandits Approach*. arXiv:2201.04480v2. URL: https://arxiv.org/abs/2201.04480v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 8456 lines).
**Verdict:** ADAPT — the UCB candidate-set dueling-bandit scheduler that replaces per-round MLE with online batch SGD (constant time/memory in T, \(\tilde O(\sqrt{T})\) regret) is portable to GSE's evaluation-budget scheduling and pick-selection, but only with contextual features, time-varying strengths, and time-forward NFL validation added, since the paper's proof and experiments assume static skills and no features.

## 1. Research question
Accurate Elo estimation for the top players normally requires many expensive competition rounds. Can we schedule matches adaptively — choosing the most informative pair at each round — so that the top Elo player is identified with far fewer samples, while keeping the classic online gradient-descent Elo update (rather than the O(t)-per-step maximum-likelihood refits used by prior work like MaxInP)? The paper answers by casting match scheduling as a dueling-bandits problem and proposing MaxIn-Elo (for transitive Elo) and MaxIn-mElo (for intransitive mElo): maintain a UCB-based candidate set of promising players, then pull the pair with the highest outcome uncertainty from that set. It asks: does this give the same \(\tilde O(\sqrt{T})\) regret bound as the MLE-based MaxInP while reducing per-step time/memory from linear-in-\(T\) to constant-in-\(T\); does the mElo extension handle intransitive games; and do both beat random (round-robin), RG-UCB, DBGD, α-IG, and MaxInP empirically on synthetic and real game benchmarks?

## 2. Dataset / schema
No NFL data. Two data families:

**(a) Twelve real-world games from Czarnecki et al. (2020), mostly on OpenSpiel:**
- Transitive games (evaluate MaxIn-Elo): Transitive game, Triangular game, Elo game, and three noisy variants "Elo game + noise = 0.01 / 0.05 / 0.1" (additive Gaussian noise on winning probabilities). All 100 policies, top SSCC size 1, transitive.
- Intransitive games (evaluate MaxIn-mElo): Kuhn-poker (64 policies, top SSCC 64), AlphaStar (100 policies, top SSCC 1 — cycles exist outside the top SSCC), tic_tac_toe (100 policies, top SSCC 2), hex board_size=3 (100 policies, top SSCC 2), Blotto (100 policies, top SSCC 99), 5,3-Blotto (21 policies, top SSCC 18). Transitivity marked No.
- Per Table 2 in Appendix B: top SSCC is "the smallest set of players such that the winning probabilities of outside players against inside players are less than 0.5".
- A 4×4 transitive game ("2 Good, 2 Bad" from the α-IG paper) used for the α-IG comparison (α-IG was too expensive to run on larger games: computing α-rank 80,000 times on a 4×4 game).

**(b) Synthetic / ablation settings:** parameter sweeps over batch size τ, UCB balance γ, and mElo vector dimension C; results averaged over 5 random seeds with standard deviations.

## 3. Method / model
MaxIn-Elo is a dueling-bandit match scheduler wrapped around the standard SGD Elo update:
1. **Initialization.** Randomly sample τ pairs (batch size τ), run τ comparisons, fit the MLE \(\hat r_\tau\) by solving \(\nabla_r \sum_{t=1}^{\tau} \ell_{\text{Elo}}(o_t, \hat p(x_t, y_t)) = 0\), and maintain the convex ball \(\mathcal{C} = \{r : \|r - \hat r_\tau\| \le 2\}\) as a projection set.
2. **Online batch SGD rating update.** Every τ rounds (batch \(j = \lfloor(t-1)/\tau\rfloor\)), compute the gradient of the batch loss \(l_{j,\tau}(r) = \sum_{t=(j-1)\tau+1}^{j\tau} \ell_{\text{Elo}}(o_t, \hat p(x_t,y_t))\) and project: \(\tilde r_j \leftarrow \prod_{\mathcal{C}}(\tilde r_{j-1} - \eta_j \nabla_r l_{j,\tau}(\tilde r_{j-1}))\) with \(\eta_j = 1/(\alpha j)\). Keep the running average \(\bar r = \frac{1}{j}\sum_{q=1}^j \tilde r_q\). Choosing τ per Eq. (14) makes \(l_{j,\tau}\) α-strongly convex on the ball \(\mathcal{B} = \{r : \|r - r^*\| \le 3\}\), which is what yields the \(\tilde O(\sqrt{T})\) rate.
3. **UCB candidate set.** Define the pair score \(h(x_t,y_t) = \bar r_{x_t} - \bar r_{y_t} + \gamma \|e_{x_t} - e_{y_t}\|_{V_t^{-1}}\), where \(V_t = \sum_{i=1}^{t-1}(e_{x_i}-e_{y_i})(e_{x_i}-e_{y_i})^\top\) is the pair-history covariance. The candidate optimal set is \(\mathcal{S} = \{x \mid h(x,y) > 0,\ \forall y \neq x\}\).
4. **Maximum-uncertainty pair selection.** \((x_t, y_t) = \arg\max_{(x,y) \in \mathcal{S} \times \mathcal{S}} \|e_x - e_y\|_{V_t^{-1}}\) — the least-observed pair among the candidates. Compete them, observe \(o_t(x_t,y_t)\), update \(V_{t+1} = V_t + (e_{x_t}-e_{y_t})(e_{x_t}-e_{y_t})^\top\).

MaxIn-mElo is the same skeleton with the mElo prediction (Eq. (12)) and UCB score (Eq. (13)), plus SGD updates for the 2k-dimensional cyclic vector \(c_x\) (Eqs. (18)–(20)) and its average \(\bar C\).

## 4. Equations & assumptions
Elo model (Bradley–Terry form, Eq. (2)):
\[\hat p_{xy} = \sigma(r_x - r_y), \quad \sigma(x) = \frac{1}{1+e^{-x}}.\]
Elo cross-entropy loss (Eq. (3)):
\[\ell_{\text{Elo}}(p_{xy}, \hat p_{xy}) = -p_{xy}\log \hat p_{xy} - (1-p_{xy})\log(1-\hat p_{xy}).\]
Standard SGD Elo update (Eq. (4)):
\[r_x^{t+1} \leftarrow r_x^t - \eta \cdot \nabla_{r_x}\ell_{\text{Elo}}(o_{xy}^t, \hat p_{xy}^t) = r_x^t + \eta \cdot (o_{xy}^t - \hat p_{xy}^t).\]
Cumulative regret (Eq. (5), matching Saha & Gopalan 2020):
\[R(T) = \sum_{t=1}^T \left[r^*_{x^*} - \frac{1}{2}(r^*_{x_t} + r^*_{y_t})\right], \quad x^* = \arg\max_{x \in [n]} r^*_x.\]
Batch projected SGD update (Eq. (8)):
\[\tilde r_j \leftarrow \prod_{\mathcal{C}}\left(\tilde r_{j-1} - \eta_j \nabla_r l_{j,\tau}(\tilde r_{j-1})\right), \quad \eta_j = \frac{1}{\alpha j}, \quad \bar r = \frac{1}{j}\sum_{q=1}^j \tilde r_q.\]
UCB pair score (Eq. (9)):
\[h(x_t, y_t) = \bar r_{x_t} - \bar r_{y_t} + \gamma \|e_{x_t} - e_{y_t}\|_{V_t^{-1}}.\]
Candidate set (Eq. (10)) and max-uncertainty selection (Eq. (11)):
\[\mathcal{S} = \{x \mid h(x,y) > 0,\ \forall y \in [n]/\{x\}\}, \quad (x_t,y_t) = \arg\max_{(x,y) \in \mathcal{S}\times\mathcal{S}} \|e_x - e_y\|_{V_t^{-1}}.\]
mElo prediction (Eq. (12)), with \(\Omega_{2k\times 2k} = \sum_{i=1}^k (e_{2i-1}e_{2i}^\top - e_{2i}e_{2i-1}^\top)\):
\[\hat p_{xy} = \sigma\left(r_x - r_y + c_x^\top \cdot \Omega_{2k\times 2k} \cdot c_y\right).\]
mElo SGD updates (Eqs. (18)–(20)):
\[r_x^{t+1} = r_x^t + \eta(o_{xy}^t - \hat p_{xy}^t),\]
\[c_x^{t+1}(2i-1) = c_x^t(2i-1) + \eta(o_{xy}^t - \hat p_{xy}^t)c_y^t(2i),\]
\[c_x^{t+1}(2i) = c_x^t(2i) - \eta(o_{xy}^t - \hat p_{xy}^t)c_y^t(2i-1).\]
mElo UCB score (Eq. (13)):
\[h(x_t,y_t) = \bar r_{x_t} - \bar r_{y_t} + \bar c_x^T \Omega \bar c_y + \gamma \|e_{x_t} - e_{y_t}\|_{V_t^{-1}}.\]
Regret bound (Theorem 1), with \(J = \lfloor T/\tau \rfloor\), \(\Delta_{\max} = \max_i r^*_i - \min_i r^*_i\):
\[R(T) \le \tau\Delta_{\max} + (2+\tau)\,g_1(T)\sqrt{2nT\log\left(\frac{2\tau+T}{n}\right)} + 4g_2(J)\sqrt{\tau T},\]
holding with probability at least \(1 - 10/T\), where \(g_1(T) \sim O(\sqrt{n\log T})\), \(g_2(J) \sim O(\sqrt{\log T})\), \(\tau \sim O(\max\{n, \log T\})\), so \(R(T) \sim O(n\log T\sqrt{T}) = \tilde O(\sqrt{T})\).
Key assumptions: **Assumption 1** — \(c_3 = \inf_{\{\|r-r^*\| \le 3\}} \sigma'(r_x - r_y) > 0\) (link-function derivative bounded away from zero near the truth); \(\lambda_{\min}(V_{\tau+1}) \ge 1\); \(\lambda_{\min}(\mathbb{E}[(e_{x_t}-e_{y_t})(e_{x_t}-e_{y_t})^\top]) \ge \lambda_f > 0\); the optimal–suboptimal rating gap satisfies \(\Delta = r^*_{x^*} - r^*_{x'} > g_1(T)C\) with \(C = \sqrt{2nT\log((T+\tau)/n)}\); \(\gamma = 2g_1(t)\); \(\alpha \ge \max\{c_3, \sqrt{2}\tau\sqrt{1+\log j}/((\Delta - g_1(T)C)\sqrt{j})\}\); and **all players' true skills are static** over the \(T\) rounds (explicitly flagged in the paper's Ethical Statement as unrealistic for humans).

## 5. Features / target
No features: the paper explicitly discusses this as a limitation — "the match outcome prediction in our algorithm is based on only ratings without considering features that describe players. Future work may consider adding features into the match prediction." The only inputs are player identities (one-hot \(e_x\)); the target at each round is the binary comparison outcome \(o_t(x_t,y_t) \sim \text{Bern}(p_{xy})\); the output is the rating vector \(r\) (MaxIn-Elo) or \((r, C)\) (MaxIn-mElo, \(C\) = 8 columns in experiments). Baselines use Random pairs, RG-UCB (\(\delta=0.2\)), DBGD, α-IG, and MaxInP (each player one-hot, parameter \(\theta\) = ratings).

## 6. Validation design
Benchmark-style validation, no train/test split in the NFL sense:
- Evaluate top-1 identification on the 12 real games (6 transitive for MaxIn-Elo, 6 intransitive for MaxIn-mElo) using metrics: cumulative regret (Eq. (5)), Reciprocal Rank \(\text{RR} = 1/R(x^*)\) of the true best player under the current average ratings \(\bar r\), plus NDCG@k and Hit Ratio@k for top-\(k\). "True" ratings are computed via Eq. (2) when the win-probability matrix fits the Elo model, else via mElo Eq. (12).
- Hyperparameter selection: grid search over initial step size \(\eta \in \{0.01, 0.05, 0.1, 0.5, 1, 5, 10\}\) (baselines and MaxIn-*) and \(\gamma \in \{0.2, 0.4, \dots, 2.0\}\), with batch size \(\tau = 0.7n\); "We perform a grid search to select parameters with the best RR performance for each random seed" — i.e., tuning is done per-seed on the evaluation metric itself.
- 5 repetitions with different random seeds; averaged performance with standard deviations plotted.
- Ablations (Appendix B, Figures 5–7): γ sweep, mElo dimension C sweep, batch-size τ sweep.
- Compute: single x86_64 GNU/Linux machine, 256 AMD EPYC 7742 64-core CPUs, 2 A100 PCIe 40GB GPUs; sklearn 0.24.2 used for MLE solves.

## 7. Numerical results / baselines
From the Experiments section and Appendices A–B (exact claims quoted):
- **4×4 "2 Good, 2 Bad" game (Figure 1):** MaxIn-Elo has the highest convergence rate on both RR and cumulative regret; cumulative regret "close to 0".
- **Transitive games (Figure 2):** MaxIn-Elo "significantly outperforms all other baselines on five games and achieves similar performance on Triangular game". RR "can converges to 1 on four games"; on Transitive game RR "up to 0.6" and on Elo game + noise = 0.1 RR "up to 0.8" — i.e., the top player is ranked no worse than 2nd. On Elo game and its noise=0.01/0.05 variants, "the cumulative regret are closed to convergence at around 500 rounds"; once converged, "the candidate optimal set \(\mathcal{S}\) only contains the top player, and no regret increasing". DBGD finds the best player quickly on the deterministic Triangular game but has large cumulative regret from random opponent selection.
- **Intransitive games (Figure 3):** MaxIn-mElo "has the lowest cumulative regret and the highest RR on all six games". RR reaches 1 on all except Blotto (attributed to its very large top SSCC of 99, plus low-rank approximation of the rotation matrix); still better than all baselines on Blotto.
- **Top-\(k\) (Figure 4):** MaxIn-Elo has the best top-1 on all games; top-\(k\) comparable on most games (γ trades off: larger γ → larger candidate set → better top-\(k\), worse top-1).
- **Complexity (Table 1):** MaxIn-Elo and MaxInP both achieve \(\tilde O(\sqrt{T})\) regret (DBGD is \(O(T^{2/3})\), RG-UCB/Random have no bound). Per-round costs: MaxIn-Elo \(O(n^2 T)\) time, \(O(n^2)\) memory; MaxInP \(O(nT^2 + n^2T)\) time, \(O(nT)\) memory. The paper's headline efficiency claim: "the memory cost is constant with respect to \(T\) while MaxInP's memory cost is linear in the time horizon \(T\)" and SGD per-round cost does not grow with history.
- **Ablations:** best top-1 at \(\gamma = 0.6\) on Elo games and Triangular (but \(\gamma = 0.4\) "misidentifies the best player" on Elo game); on Transitive game \(\gamma = 0.4\) best for both top-1 and top-\(k\); \(\gamma = 0.8\) balances; \(\gamma = 1.2\) worse than \(\gamma = 1\) for top-\(k\). mElo dimension \(C = 8\) best, "performance drops when \(C = 16\)". Batch size: \(\tau = 1\) "bad performance"; \(\tau = 0.5n\)–\(1.0n\) "satisfactory" on Elo game; \(\tau = 0.7n\) best on Kuhn-poker; \(\tau = 4.0n, 8.0n\) degrade (fewer updates per sampling round).

## 8. Code / data availability
Code: "Code of this project is available at https://github.com/yanxue7/MaxIn-Elo.git". Data: the twelve games come from Czarnecki et al. (2020) "Real World Games Look Like Spinning Tops" (NeurIPS 2020), most implemented on OpenSpiel (Lanctot et al. 2019). Local availability of the code repo was not verified (no network per worker constraints); exact random seeds and the 4×4 game specification are not stated in the extracted text.

## 9. Leakage & limitations
- **Static-skill assumption.** The whole theory and all experiments assume true ratings never change; the Ethical Statement admits this "likely does not hold for human players" — and in the NFL, rosters, injuries, and coaching change team strength within a season, which directly violates the regret analysis's foundation.
- **No features.** Match prediction uses only identities; in the NFL, QB status, injuries, weather, and rest are first-order signal, and the paper names this as limitation #1.
- **Top-1 focused, not top-\(k\).** Limitation #2: the scheduler is tuned for identifying the single best player; larger γ helps top-\(k\) at the cost of top-1.
- **Per-seed metric tuning.** Hyperparameters are chosen "with the best RR performance for each random seed" — i.e., selection uses the evaluation metric itself; reported margins are optimistic, and no held-out/sequestered comparison set exists.
- **No forward prediction.** Experiments measure in-sample ranking reconstruction (RR, regret on the same competition rounds), never out-of-sample future-outcome prediction. NFL use requires strictly time-forward validation.
- **Bandit-selection bias.** Adaptively oversampling uncertain/top pairs breaks i.i.d. sampling; ported to NFL rating estimation, naive reuse would bias the likelihood unless corrected (e.g., importance weighting) — the paper never addresses downstream prediction use.
- **Mild coverage assumptions.** Theorem 1 needs \(\Delta > g_1(T)C\) (a sufficiently large gap between the best and second-best player) and \(\lambda_{\min} \ge 1\) coverage; in the NFL, the 1st-vs-2nd-team gap is small, so the guarantee's key condition may fail in practice.
- **NFL schedule is fixed.** The NFL does not let GSE choose matchups; the literal "schedule games" application has no transfer path. The portable part is budget-allocation machinery (which pairs to spend simulation/evaluation effort on), not game scheduling.
- External validity: all validation is on board/AI-agent games (100-policy synthetic pools, Kuhn-poker, Blotto); nothing on sports data.

## 10. GSE overlap
Classification: **new capability**. Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` (2026-09-21), GSE's corpus covers Elo, Glicko, TrueSkill, Bradley–Terry, Plackett–Luce, Massey, Colley, dynamic Elo, Kalman/particle filters, nested AR(1), state-space strength, EPA/EP, calibration, and extensive NFL metrics — all of which are *estimators* of team strength. The map's listed gaps include **contextual bandits/pick selection** and **ranking uncertainty**. Neither the map nor the 2026-09-18 ML brief (learning-to-rank + state-space team strength, not yet implemented) contains: (a) an active pair-selection/scheduling layer over a rating system, (b) dueling-bandit UCB candidate sets for top-player identification, or (c) constant-in-\(T\) online batch-SGD as a replacement for repeated MLE refits with a \(\tilde O(\sqrt{T})\) regret guarantee. There is partial adjacency to the dynamic-Elo work (both touch online Elo updates) and to the bandits/pick-selection gap, but this paper's contribution — maximum-uncertainty pair selection from a UCB candidate set with the \(V_t^{-1}\) uncertainty norm — is machinery GSE does not have. Not a duplicate; the natural classification is a new capability with extension-flavored overlap only at the Elo-update level.

## 11. GSE implementation spec
Because the NFL schedule is fixed, do not implement this as game scheduling. Implement the portable machinery in three places:
1. **Evaluation-budget scheduler (primary).** When GSE fits team-strength ratings under a compute budget (Monte Carlo sims, engine-config comparisons, ablation runs), replace uniform/random matchup sampling with the MaxIn scheduler: maintain \(V_t\) over the 32×32 team-pair space, keep a UCB candidate set \(\mathcal{S}\) of playoff-relevant teams, and spend simulation budget on \(\arg\max_{(x,y)\in\mathcal{S}} \|e_x - e_y\|_{V_t^{-1}}\) matchups. Updates use batch SGD on the Elo/BTL loss with \(\tau \approx 0.7 \times 32 \approx 22\) games per batch and \(\gamma \approx 0.6\) as starting points (paper's best on transitive games), tuned on historical seasons.
2. **Pick-selection bandit.** Extend to a contextual dueling bandit for weekly pick sheets: arms are candidate picks (spread/ML/total per game), the "comparison" is realized profit vs. the closing line, and the UCB candidate set prunes to high-edge, high-uncertainty plays. This directly addresses the map's contextual-bandits/pick-selection gap. Add team/game features the paper lacks (QB, injuries, rest, weather) via the contextual-dueling-bandit form of Saha & Gopalan 2020.
3. **Uncertainty display.** Reuse the \(V_t^{-1}\) uncertainty norm as a first-class ranking-uncertainty signal in GSE outputs (the map's ranking-uncertainty gap): publish per-team "rating uncertainty" alongside point estimates, computed from historical pair coverage rather than ad-hoc intervals.

Data: nflverse play-by-play + schedules (2020–2025), FTN charting for features, odds APIs (closing lines) for pick-selection rewards. Serving: ratings pipeline runs weekly; the scheduler sits between the sampler and the SGD rating update; estimated effort 2–3 weeks for the scheduler + uncertainty display, 4–6 weeks for the contextual pick-selection extension including backtesting.

## 12. Reproducible test
Mirror the paper's protocol on NFL-scale synthetic Bradley–Terry worlds before touching real data:
- Generate 20 synthetic seasons: \(n = 32\) teams with true ratings drawn from the empirical spread of historical NFL Elo ratings; outcomes \(o_{xy} \sim \text{Bern}(\sigma(r^*_x - r^*_y))\).
- Estimators: (a) baseline Elo with random pair sampling (round-robin analog), (b) MaxIn-Elo with \(\tau = 22\), \(\gamma = 0.6\), \(\eta\) grid-searched \(\{0.01, \dots, 10\}\) on RR.
- Horizon \(T = 1000\) rounds, 5 random seeds; metrics: cumulative regret (Eq. (5)) and RR of the true best team at each round.
- Then a real-data pilot: replay the 2020–2024 NFL seasons strictly time-forward — the scheduler may only select among games already played up to week \(w\) (simulating evaluation-budget choice), and rate top-1/top-4 team identification accuracy against the end-of-season market-implied ranking (Super Bowl futures) vs. the random-sampling baseline with identical update counts.

## 13. Acceptance / rejection gate
- **Synthetic test:** ADOPT/ADAPT the scheduler if MaxIn-Elo reaches RR = 1 with at least 30% fewer rounds than the random-sampling Elo baseline, and its cumulative regret at \(T = 1000\) is at most 60% of baseline, in at least 4 of 5 seeds.
- **Real-data pilot:** accept for production if, with identical numbers of pairwise updates, MaxIn-scheduled ratings achieve ≥ the baseline's top-4 identification accuracy against end-of-season futures-implied rankings in ≥ 3 of the 5 seasons, with no season worse than baseline by > 1 rank on the top team.
- **Reject** if the scheduler underperforms random sampling on real NFL data (non-transitivity, small Δ, or non-stationarity breaking the method), or if the real-data gain is smaller than the added implementation/maintenance cost — in which case keep only the \(V_t^{-1}\) uncertainty-norm idea for the ranking-uncertainty display.

## 14. Improvement experiment
Run one follow-up the paper does not attempt: **contextual, non-stationary MaxIn-Elo for forward prediction**. Replace static identities with team-game feature vectors (QB/epa features, injury adjustments, rest, weather) in a contextual dueling-bandit variant (player pairs represented by feature differences, cf. Saha & Gopalan 2020), add a forgetting/decay factor to \(V_t\) and the SGD updates so stale comparisons lose weight as rosters change, and evaluate on **strictly time-forward** 2021–2025 NFL prediction (log loss and Brier score on held-out future games, plus ATS ROI) rather than in-sample ranking. Success criterion: the contextual scheduler's forward log loss beats both the random-sampling Elo and the plain contextual baseline. This directly attacks the paper's two stated limitations (no features, static skills) and converts the machinery from ranking reconstruction into the predictive tool GSE actually needs.
