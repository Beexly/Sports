# [1191] Player-Team Heterogeneous Interaction Graph Transformer for Soccer Outcome Prediction (arXiv:2507.10626v1)

**Citation:** Wang, L., Xu, S., Horton, M., Gudmundsson, J., & Wang, Z. (2025). *Player-Team Heterogeneous Interaction Graph Transformer for Soccer Outcome Prediction*. In KDD '25 (31st ACM SIGKDD, Toronto). arXiv:2507.10626v1. URL: https://arxiv.org/abs/2507.10626v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 755 extracted lines, all read).
**Verdict:** ADAPT

## 1. Research question
Can explicitly modeling heterogeneous player–player interactions (via event-defined graph edges) and team–team competition history (via win-rate graphs), fused through a transformer, improve pre-match soccer outcome prediction beyond MLPs, RNNs, and existing graph baselines?

## 2. Dataset / schema
- **WyScout Open Access Dataset** (Pappalardo et al., Scientific Data 2019 [42]): **1,941 matches** across 7 competitions — Spanish (380), English (380), Italian (380), German (306), French (380) men's first divisions (2017/18 seasons), European Cup 2016 (51), World Cup 2018 (64). **3,293 players, 154 teams, 3,251,294 events** (Table 1).
- Preprocessed into match-level records (date, match ID, outcome, team ID, coach ID, player IDs) plus a pre-built per-match interaction graph and per-player historical match ID lists.
- Label distribution (win/draw/lose, home perspective): train **[695, 397, 460]**, test **[177, 80, 132]**; weighted random sampler mitigates class imbalance.
- Public dataset (widely available WyScout open access release).

## 3. Method / model
**HIGFormer** — three components (§3, Fig. 2):
1. **Player Interaction Network.** Per historical match, a heterogeneous directed graph G^i = (V^i, E^i, A, K): 46 player nodes (23/team, starters), node features = 10 key-event counts (**duel, foul, free kick, goalkeeper leaving the line, interruption, offside, others on the ball, pass, save attempt, shot**); two edge types K = {pass-related, defense-related} with event-count features. Two branches:
   - Heter. Transformer: extends TokenGT [31] — |V|+|E| tokens into a standard transformer with Laplacian-eigenvector node identifiers (extended for direction) and three trainable embeddings (node type P_A, edge type P_K, node identifiers P_V); edge augmentation [X_E, P_u − P_v + P_k]; node augmentation [X_V, P_v + P_v + P_a].
   - Heter. GCN: GAT [53] backbone extended with per-edge-type weight matrices W^{l,k}; attention α^l,k_{vu} = Softmax(a^T[W_α x_v, W_α x_u]) with self-loops.
   - **MoE gating:** an MLP gating network on player features X_V predicts per-player weights [p^i_glo, p^i_loc] = Softmax(Gating(X_V)); final player embedding Z^i_player = (p^i_glo ⊙ Z^glo,i_player) + (p^i_loc ⊙ Z^loc,i_player).
2. **Team Interaction Network.** Directed graph over teams; edges = historical head-to-head **winning rate** (retain only the higher-rate directed edge, e.g., 20/30 → edge A→B valued 2/3). Node features learnable; homogeneous GAT encoder → Z_team.
3. **Match Comparison Transformer.** Player embeddings approximated pre-match by average pooling over last **T = 10** historical matches (empirically chosen over 5/10/20). Team embeddings are frozen at test time and added to player embeddings; Enc_match outputs updated embeddings; team representations r^i = AvgPool(home 23), b^i = AvgPool(away 23); prediction **ŷ^i = σ(f_MLP(r^i − b^i))**.
- **Training:** two-stage. Stage 1: pre-train Heter. Transformer (with class token) and Heter. GCN separately per match with the outcome loss (2,328 steps). Stage 2: freeze player network (except gating), train gating + team network + match comparison transformer (2,134 steps). **Adam, lr 1e−3.** All graph encoders: 3 layers, hidden 64, output 16; Match Comparison Transformer: 1 layer.
- **Loss:** **MSE on ordinal targets** (win=1, draw=0.5, lose=0) — deliberately not cross-entropy, to capture Lose < Draw < Win ordering. Classification binning at inference: [0, 4/7] home lose, [4/7, 5/7] draw, [5/7, 1] home win.

## 4. Equations & assumptions
- Player history: h^i_{p_n} = [c^{i−1}_{p_n}, y^{i−1}_{p_n}] (event counts + past outcome); prediction ŷ^i = f_θ({H_{p_n}^i}, H_R^i, H_B^i) (eq. 2).
- Graph transformer: Z^{glo,i}_player = Enc^{glo}_player{Q,K,V} = f_{Q,K,V}(X^i_aug) (eq. 5).
- Heter. GCN: x^{(l+1)′}_v = Σ_k Σ_{u∈N(v)} α^l,k_{vu} W^{l,k} x^{(l)}_{u}; x^{(l+1)}_v = σ(x^{(l+1)′}_v) (eq. 7).
- MoE: [p^i_glo, p^i_loc] = Softmax(Gating(X_V^i)) ∈ R^{|V|×2} (eq. 9); Z^i_player = (p^i_glo ⊙ Z^{glo,i}_player) + (p^i_loc ⊙ Z^{loc,i}_player) (eq. 10).
- Team: Z_team = Enc_team(X^team_V, X^team_E) (eq. 11).
- Pooling: Z^{i′}_player = [AvgPool(z^t_{p_n} | t = i−1−T…i−1)] (eq. 12); Z^i_match = Enc_match{Q,K,V}(Z^{i′}_player + Z^i_team) (eq. 13); ŷ^i = σ(f_MLP(r^i − b^i)) (eq. 14).
- Loss: L_out(y_i, ŷ_i) = ‖y_i − ŷ_i‖² (eq. 15).
- Assumptions: (a) pass/defense event edges suffice to capture meaningful interactions (shooting/dribbling excluded, acknowledged in limitations); (b) historical player embeddings averaged over last 10 matches approximate current form; (c) team embeddings frozen at test time are stable; (d) head-to-head winning rate is an adequate team-dynamics signal; (e) ordinal MSE is superior to cross-entropy for three-class outcomes.

## 5. Features / target
- **Inputs:** per-player key-event counts (10 types) + team historical head-to-head win rates; no heavy handcrafted features (deliberately minimal; MLP/RNN baselines get historical event counts + height/weight/age/role).
- **Target:** pre-match outcome {win, draw, lose} (home perspective), modeled as ordinal value {1, 0.5, 0}.
- **Prediction horizon:** next match.

## 6. Validation design
- **Time-ordered 80/20 split per division** (train on earlier matches, test on later); EC+WC combined for stability due to small test samples.
- Baselines: MLP [47], RNN [12] (many-to-one on past matches), P-Graph [4] (GAT on player graphs), T-Graph [65] (GAT on win/loss team graphs), DraftRec [36] (transformer, adapted).
- Metrics: accuracy split by win/draw/lose + average. No calibration metrics (ECE, log-loss) reported — a gap.

## 7. Numerical results / baselines
Table 2 totals (Win / Draw / Lose / Avg accuracy %, higher better):
- **Ours (HIGFormer): 57.96 / 24.53 / 68.25 / 52.19** — best total accuracy; best lose; second-best win.
- DraftRec: 57.33 / 24.53 / 57.14 / 48.33. RNN: 57.96 / 33.02 / 46.03 / 47.30. P-Graph: 58.47 / 26.09 / 51.67 / 47.69. MLP: 53.50 / 37.74 / 46.03 / 46.79. T-Graph: 58.47 / 9.78 / 58.33 / 46.92.
- **Ablation (Table 3, total Win/Draw/Lose/Avg):** Ours 57.96/24.53/68.25/52.19; w/o Heter. GCN → 54.14/28.30/63.49/50.13; w/o Heter. Transformer → 55.41/24.53/61.11/48.84; w/o Player Inter. Net → 52.87/32.08/52.87/48.59; w/o Team Inter. Net → 53.50/30.19/58.73/48.84; alternate binning [0,2/5,3/5,1] → 55.30/27.50/57.06/50.39; [0,1/3,2/3,1] → 52.27/32.50/57.06/48.84; cross-entropy → 53.03/17.50/64.97/51.16; one-stage training → 54.24/21.74/57.22/47.95.
- **Player-evaluation application (Table 4):** substituting L. Messi into Real Betis raises predicted win % by **+7.14** (−2.24 draw, −4.92 lose); Girona +8.94 win; Celta Vigo (low-ranked) only +1.49 — single stars barely move weak teams, which the paper attributes to soccer's team nature.
- **Attention analysis:** midfielders and defenders receive the most attention within/across teams; goalkeepers the least — consistent with match reality.

## 8. Code / data availability
None stated (no repo link in the paper). Dataset is the public WyScout Open Access release (Pappalardo et al. 2019).

## 9. Leakage & limitations
- **No calibration reported:** only hard accuracy. For a betting/calibration company this is the critical missing piece — 52.19% accuracy without reliability curves cannot be sized.
- **Draw prediction is poor** (24.53% for HIGFormer; best any method achieves is 37.74% by MLP) — acknowledged as a domain-wide problem.
- Only pass-related and defense-related edges; attacking events (shots, dribbles) excluded by design.
- Minimal input features (basic event counts) — likely leaves performance on the table vs engineered features.
- Two-stage training and per-match graphs (up to 460 graphs per match in one-stage) are computationally heavy; one-stage ablation drops to 47.95, so the complexity is load-bearing.
- Soccer-only data; NFL transfer is plausible but untested (different event structure, 11v11 with heavy specialization, set plays).

## 10. GSE overlap
Per the existing-research map: GNN sports outcome modeling is partially covered (2207.14124 read in depth in the Drive dossiers; representation learning on play-by-play is an ML-brief area). HIGFormer is an **extension**, not a duplicate: none of Garrett's covered work models *heterogeneous* player interaction graphs (event-typed edges) fused with team win-rate graphs via an MoE-gated global/local split, nor the ordinal-MSE treatment of match outcomes, nor the embedding-swap what-if player evaluation. The X accounts inventoried do not include graph-based player-interaction forecasters.

## 11. GSE implementation spec
- **Data:** nflverse play-by-play (2009–2025) + FTN charting (route/coverage/pressure) for edge semantics.
- **Graph construction:** nodes = the 22 starters + key rotational players; edge types = {pass (QB→receiver), rush (RB/OL), target, tackle/pressure, coverage} with per-edge event counts — direct analogue of the paper's pass/defense typing. Team graph edges = head-to-head win rate (NFL: last N seasons, regression-to-mean blended).
- **Model:** reimplement the three-component architecture (heter. GCN + heter. transformer + MoE gating, T = last 10 games, MSE on ordinal {win=0.5/draw=0? → NFL has no draws; use win prob 0/1 targets or margin-based ordinal buckets}).
- **Add calibration:** the paper omits it — attach temperature scaling + Venn-Abers on the σ output, and evaluate ECE/RPS alongside accuracy.
- **Serving:** precompute player embeddings offline weekly (Stage-1 analogue); inference = Match Comparison Transformer only.
- **Effort:** medium — 2–3 weeks for a competent engineer with nflverse + PyG.

## 12. Reproducible test
- **Dataset:** nflverse play-by-play 2019–2024 (train through 2023, time-ordered test on 2024 season).
- **Metric:** accuracy + log-loss + ECE on moneyline direction; **baseline to beat:** Elo (nfelo) and logistic regression on the same event-count features.
- **Gate-input:** HIGFormer-NFL must beat Elo accuracy on the 2024 holdout with comparable-or-better ECE.

## 13. Acceptance / rejection gate
**ADAPT if:** the NFL reimplementation beats nfelo by ≥1.5 percentage points of accuracy on the time-ordered 2024 holdout AND its ECE ≤ Elo's after temperature scaling; **reject** otherwise. The draw class maps to nothing in NFL (overtime ties negligible) — use margin-based ordinal buckets (win by >7 / close / lose by >7) instead.

## 14. Improvement experiment
Go beyond the paper in two ways the authors flag: (1) add attacking edge types the paper omitted — for NFL this means separation/route-type edges from FTN charting and pressure timing edges, which should strengthen the player-interaction signal; (2) replace the frozen team-embedding scheme with a dynamic team-strength state (nested AR(1) from 1701.05976, already in Garrett's corpus) so team graphs adapt within-season. Test whether (1)+(2) close the draw/calibration gap the paper leaves open.
