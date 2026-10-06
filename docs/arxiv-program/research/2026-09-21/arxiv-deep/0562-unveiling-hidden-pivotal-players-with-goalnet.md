# [0562] Unveiling Hidden Pivotal Players with GoalNet: A GNN-Based Soccer Player Evaluation System (arXiv:2503.09737)

**Citation:** Jiang, J. H., Cai, J., & Kyrillidis, A. (2025). *Unveiling Hidden Pivotal Players with GoalNet: A GNN-Based Soccer Player Evaluation System*. arXiv:2503.09737. URL: https://arxiv.org/abs/2503.09737
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2369 lines).
**Verdict:** ADAPT — port the event-graph + value-attribution-via-embedding-magnitude architecture to NFL play-by-play (players as nodes, EPA as the value to distribute) to quantify hidden contributors (linemen, blocking TEs, box safeties); the soccer event schema must be rebuilt for NFL down/state features, and no external held-out validation exists.

## 1. Research question
Can a GNN assign individual credit for changes in expected threat (xT) so that non-scoring, facilitator-type players (defensive midfielders, defenders) get recognition proportional to their true impact? The paper builds GoalNet: event-centric graphs with spatial + temporal features → predict ΔxT → distribute ΔxT across involved players proportional to learned embedding magnitudes.

## 2. Dataset / schema
- Event data: StatsBomb Open Data, Premier League 2015/2016: 380 matches, 758,426 events, 547 players. Events converted to SPADL (Decroos et al. 2019a) format; each action has 12 attributes (player ID, team, action type, start/end positions, receiver, result).
- Player-specific data: Sofascore season aggregates (goals, dribbles, tackles, pass %, rating, goal conversion %, interceptions, clearances, accurate passes, key passes), normalized per 90 minutes.
- Graph per event: up to 22 nodes (players on pitch), edges = interactions (pass/tackle), node features d=10, edge features d'=5 (pass info, event type/result, start/end coordinates, xT value, xT change). Temporal context: previous k events included per graph (ablation over k ∈ {1,3,5,7,9}).
- No held-out league/team; no NFL data.

## 3. Method / model
Three variants: (a) Basic GoalNet: 2 graph-convolution layers H⁽ˡ⁺¹⁾ = σ(AH⁽ˡ⁾W⁽ˡ⁾) (ReLU) over node features; edge features via 2-layer MLP; global mean pooling z = (1/|V|)Σ_v h_v; two FC layers ŷ = W₄·ReLU(W₃·z) predicting ΔxT (MSE loss). (b) GATGoalNet: GCN layers replaced with multi-head graph attention layers. (c) TransGoalNet: graph transformer layers with global self-attention, positional encodings from player roles + spatial coordinates, relational encodings r_uv from edge features. xT attribution: xT_v = (‖h_v⁽ᴸ⁾‖ / Σ_u ‖h_u⁽ᴸ⁾‖)·ΔxT (normalized embedding magnitude). Classical centrality metrics (degree/betweenness/closeness) are discussed as the static alternative the learned embeddings replace. Training: Adam, lr 1×10⁻⁴, weight decay 1×10⁻⁴, 25 epochs, 80/20 train/validation split, batch 64, Xavier init (linear) / Kaiming (conv/attention), LR ×0.5 every 10 epochs, early stopping patience 5.

## 4. Equations & assumptions
Copied faithfully:
- GCN: H⁽ˡ⁺¹⁾ = σ(AH⁽ˡ⁾W⁽ˡ⁾), σ = ReLU.
- Edge MLP: e′_uv = ReLU(W₂·ReLU(W₁·e_uv)).
- Pooling: z = (1/|V|)Σ_v h_v; prediction ŷ = W₄·ReLU(W₃·z), trained with MSE.
- GAT attention: α_uv = exp(LeakyReLU(aᵀ[Wh_u⁽ˡ⁾‖Wh_v⁽ˡ⁾])) / Σ_w∈N(v) exp(LeakyReLU(aᵀ[Wh_w⁽ˡ⁾‖Wh_v⁽ˡ⁾])); multi-head h_v⁽ˡ⁺¹⁾ = σ(‖_m Σ_u∈N(v) α_uv⁽ᵐ⁾ W⁽ᵐ⁾ h_u⁽ˡ⁾).
- Transformer attention: α_uv = exp((q_u·k_v + r_uv)/√d) / Σ_w∈V exp((q_u·k_w + r_uw)/√d); H⁽ˡ⁺¹⁾ = LayerNorm(H⁽ˡ⁾ + Att(Q,K,V)), then LayerNorm(H⁽ˡ⁺¹⁾ + FFN(H⁽ˡ⁺¹⁾)).
- xT attribution: xT_v = (‖h_v⁽ᴸ⁾‖ / Σ_u ‖h_u⁽ᴸ⁾‖)·ΔxT.
- ΔxT response: ΔxT = xT_current − xT_previous (same team); xT_current + xT_previous (different teams, i.e., erasing opponent threat + adding own).
- Assumptions (mine): embedding magnitude ∝ player contribution — an untested axiom, the credit mechanism is not grounded in any counterfactual; xT zones from Singh (2019) taken as given.

## 5. Features / target
Node features (d=10): goals, successful dribbles, tackles, accurate pass %, match rating, goal conversion %, interceptions, clearances, accurate passes, key passes. Edge features (d'=5): pass info, event type/result, start/end coordinates, xT value, xT change; plus temporal features (time elapsed, time between successive events). Target: ΔxT of the event (regression, MSE/MAE reported).

## 6. Validation design
80/20 train/validation split of the same 2015/16 EPL season — NO test set, NO out-of-season or out-of-league holdout. Baselines: VAEP (Decroos et al.) and the "Baseline" basic GCN variant. Validation is primarily qualitative: top-player rankings across VAEP/Baseline/GAT/TransGoalNet, per-team top players, and one worked case study (Freiburg vs Leverkusen, Xhaka's progressive pass credited more than the final cross). Ablation over temporal context k (Appendix A).

## 7. Numerical results / baselines
All numbers quoted exactly as in the paper (Appendix A ablation, Tables 3–5):
- Validation MAE by k (Baseline): k=1: 0.0103; k=3: 0.0082; k=5: 0.0227; k=7: 0.0139; k=9: 0.0187. (GATGoalNet): 0.0075, 0.0082, 0.0133, 0.0066, 0.0095. (TransGoalNet): 0.0030, 0.0031, 0.0030, 0.0031, 0.0042.
- Validation MSE by k (Baseline): 0.0104, 0.0058, 0.0074, 0.0197, 0.0380. (GATGoalNet): 0.0017, 0.0006, 0.0045, 0.0020, 0.0110. (TransGoalNet): 0.0001, 0.0002, 0.0001, 0.0002, 0.0043.
- Paper's reading: most models best at k=7; TransGoalNet best at k=5; performance deteriorates at k=9 (overfitting/noise).
- Player rankings (Table 1): VAEP top-3: Ryan Bennett (Norwich), Andrew Surman (Bournemouth), Harry Arter (Bournemouth); Baseline: Surman, Fàbregas (Chelsea), Özil (Arsenal); GAT: Özil, Fàbregas, Surman; TransGoalNet: Özil, Fàbregas, Junior Stanislas (Bournemouth). Table 2 per-team: e.g., Bournemouth — VAEP Surman, Baseline/GAT Surman, TransGoalNet Stanislas; Aston Villa — Baseline/GAT Idrissa Gana Gueye (defensive midfielder) vs VAEP Rudy Gestede (striker).
- Case study (Table in §5.2): model attributes the decisive xT gain to Granit Xhaka's progressive pass rather than Hložek/Frimpong's final actions.
- No confidence intervals, no statistical tests comparing architectures.

## 8. Code / data availability
None stated. StatsBomb Open Data (github.com/statsbomb/open-data) and Sofascore used. xT from Singh (2019). No repository link in the paper.

## 9. Leakage & limitations
Adversarial notes: (a) no test set and no out-of-season validation — all quantitative results are on an 80/20 split of one season, so "robustness" claims are unsupported; (b) the core contribution (attributing xT by embedding magnitude) is validated only qualitatively via ranked lists and one case study — there is no ground-truth player value to check against; (c) attribution axiom (‖h_v‖ ∝ contribution) is never defended — embedding magnitudes in a regression net trained to predict ΔxT need not correspond to causal player credit; (d) circularity: edge features already contain xT value/change, and the target is ΔxT — the net predicts from features that encode the answer; (e) one season of one league, one xT implementation, no cross-league generalization tested despite being listed as future work; (f) VAEP "bias" comparison is apples-to-oranges (VAEP values actions, GoalNet ranks players).

## 10. GSE overlap
Extension of an existing lane, not a duplicate. The existing-research map covers GNN sports-outcome models (2207.14124, Drive dossiers) and action-valuation ideas (VAEP/xT family is referenced via player models), but GSE has no per-play graph-attribution machinery that distributes EPA across all 22 players. The NFL analogue of the paper's "hidden pivotal players" is concrete and valuable: offensive linemen, blocking TEs, coverage safeties, box defenders whose contributions EPA/WPA never credits. The attribution-by-embedding-magnitude idea would be the new capability.

## 11. GSE implementation spec
1. Data: nflverse play-by-play (2018–2025) + FTN charting / PFF-style participation data to get all 22 players per play (GSE has FTN charting catalog access). 2. Node features per player-play: position, pre-snap alignment, target share/air yards (skill), blocks, pressure allowed/generated, plus game state. 3. Edge features: routes run, blocks, coverage assignments, pass rush matchups. 4. Build the play graph (players = nodes, interactions = edges), predict ΔEPA (or ΔWPA) of the play with a GAT (start with the simpler, cheaper GAT before the transformer). 5. Attribute ΔEPA via normalized embedding magnitudes to all 22 players → per-game/season "hidden value" leaderboards (e.g., run-blockers, coverage safeties). 6. Cross-validate attribution against independent measures (PFF grades, run-blocking win rates) — the paper skips this; GSE should not. Effort: 3–4 weeks for a prototype on one season; participation data is the gating dependency.

## 12. Reproducible test
Dataset: NFL 2022 season play-by-play (nflverse) with participation data. Split: train on weeks 1–12, validate on weeks 13–18 (time-ordered), mimicking the paper's 80/20 but time-respecting. Task: predict ΔEPA per play. Baselines: (a) linear EPA attribution by participation; (b) VAEP-style per-player action valuation summed per player. Metrics: validation MSE/MAE on ΔEPA, plus rank correlation between attributed per-game values and PFF grades (external sanity check the paper lacks).

## 13. Acceptance / rejection gate
Adopt GAT-based play attribution if (a) validation MAE on ΔEPA beats the linear-participation baseline by ≥10% on weeks 13–18, AND (b) the attributed per-game player values correlate with PFF grades at Spearman ρ ≥ 0.4 (attribution sanity), AND (c) at least 3 of the top-20 season "hidden value" players are non-skill positions with defensible film cases (the paper's core claim must be demonstrable). Reject if correlation with PFF grades is <0.2 — then embedding-magnitude attribution is not credit-worthy.

## 14. Improvement experiment
Replace the embedding-magnitude attribution axiom with a counterfactual one: train the GNN to predict ΔEPA, then attribute via per-player leave-one-out (mask each player's node features and measure the predicted ΔEPA drop) — Shapley-style credit on the trained model instead of the magnitude heuristic. Compare LOO attribution vs magnitude attribution against PFF-grade correlation; the counterfactual version should be strictly more defensible and would directly address the paper's weakest assumption.
