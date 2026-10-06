# [2209] Decentralized Collective World Model for Emergent Communication and Coordination (arXiv:2504.03353) — REJECT

**Citation:** Nomura, K., Aoki, T., Taniguchi, T. & Horii, T. (2025). *Decentralized Collective World Model for Emergent Communication and Coordination*. arXiv:2504.03353. URL: https://arxiv.org/abs/2504.03353
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** REJECT — In-lane (multi-agent world model) and mechanistically interesting, but fails the GSE value bar: the paper's own experiments show the decentralized emergent-communication approach is second-best to centralized models, and GSE's prediction problem runs on centralized tracking data, so the paper's motivating constraint does not apply. No concrete NFL implementation passes a numeric gate. Replaced by a stronger paper.

## 1. Research question
Can decentralized world models support both symbol emergence (learned communication protocols) and coordination simultaneously, via temporal extension of collective predictive coding? Two agents with divergent perceptual capabilities exchange learned messages to coordinate on a joint trajectory-drawing task. (Abstract, §I)

## 2. Dataset / schema
Synthetic two-agent trajectory-drawing task: agents draw hypotrochoid trajectories; point P randomly positioned per trial; observation binned into finite-bin Dec-POMDP conditions (bin count controls perceptual divergence). 100 trials per condition. No real-world data, no public dataset.

## 3. Method / model
Each agent has an RSSM world model (representation q(s_t^k|s_{t−1}^k,m_{t−1},a_{t−1}^k,o_t^k), transition p(s_t^k|s_{t−1}^k,m_{t−1},a_{t−1}^k), observation p(o_t^k|s_t^k)) plus a shared message variable m_t. Key trick (§III-B): the joint message posterior q(m_t|{s_t^k}) is incalculable in a decentralized system (agents can't access each other's internals), so they approximate prior and posterior with a Product-of-Experts over per-agent message estimates m_t^k, with bidirectional message exchange and contrastive learning for message alignment. Policies trained by behavioral cloning on pre-generated expert cooperative data — no RL skill acquisition (stated explicitly, §III note).

## 4. Equations & assumptions
- Dec-POMDP formalization (§II); CPC variational objective with message variable; PoE approximations p(m_t)≈C∏_k p(m_t^k), q(m_t|{s_t^k})≈C∏_k q(m_t^k|s_t^k) (eq. 3).
- Assumes: exactly the setting where agents cannot access each other's internal states; expert demonstrations available for BC; tiny 2-agent synthetic task.

## 5. Features / target
Inputs: per-agent partial observations + exchanged messages. Target: coordination measured by maximum cross-correlation between drawn trajectories and ideal hypotrochoid; message quality via RSA (Spearman correlation between message dissimilarity matrices and true trajectory).

## 6. Validation design
Conditions: Markov Game (full observability, infinite bins), BC (behavioral cloning baseline with communication), EC (proposed emergent communication), NC (no communication). 100 trials per condition. Metric: mean max cross-correlation ± std.

## 7. Numerical results / baselines
- Full observability: all conditions comparable to baseline (communication unnecessary — §V-A).
- Dec-POMDP: BC > EC > NC; EC beats NC increasingly as bins decrease (greater perceptual divergence). But w/ vs w/o communication (Fig. 5): "minimal differences" with overlapping std except at bin=1. Abstract concedes: "achieving the second-best coordination after centralized models."
- RSA: emergent messages structurally reflect environment state (positive signaling) — a representation result, not a performance result.

## 8. Code / data availability
None stated. Synthetic task only.

## 9. Leakage & limitations
- 2 agents, synthetic drawing task — no evidence the mechanism works at 23 entities or on real dynamics.
- No RL — policies are BC on expert demos; the world model isn't used for planning/imagination at all.
- The w/ vs w/o communication gap is mostly within noise (§V-B).
- Cognitive-science framing (symbol emergence, FEP) — no path to a prediction or simulation product.

## 10. GSE overlap
No corpus overlap (no emergent-communication papers in the map). But ledgers 2207/2208 already cover centralized aggregation (hub attention, Perceiver) for the same multi-agent coordination problem — with quantitative wins, not second-best.

## 11. Why it fails GSE value (the rejection)
1. **The paper defeats its own premise for our use case.** Its headline result is that emergent communication helps *when agents can't see the full state and can't access each other's representations*. GSE's engine trains and serves on centralized NGS tracking — every entity's state is observed. The motivating constraint is absent.
2. **Centralized wins.** The authors' own ranking (BC/centralized > EC > NC) means the best-performing recipe in their paper is the one we already have (centralized aggregation, ledgered in 2207/2208).
3. **No concrete NFL implementation passes a gate.** "Learned inter-agent message channels" for football reduces to either (a) centralized aggregation (already ledgered, better), or (b) modeling on-field player communication (no data, no measurable prediction target). I could not construct an implementation spec with a numeric accept/reject gate that isn't already covered by ledgers 2207/2208.
4. Symbol-emergence quality is measured by RSA correlation — a representation diagnostic, not a performance metric transferable to win probability or EPA.

## 12. Reproducible test (not run — paper rejected before implementation)
N/A — no GSE test constructed; the mechanism's value proposition is negative under GSE's data regime.

## 13. Acceptance / rejection gate
REJECT stands unless: a follow-up shows emergent-communication world models beating centralized aggregation on a ≥10-agent continuous-control task with full observability available — i.e., evidence the decentralized constraint buys performance rather than just matching it. That evidence does not exist in this paper.

## 14. Improvement experiment (for the replacement, not this paper)
Replaced by a stronger candidate below. If symbol emergence ever becomes relevant (e.g., modeling opponent play-calling as communication over a hidden channel), revisit with that concrete target.
