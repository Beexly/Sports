# [0185] FENCE: Fairplay Ensuring Network Chain Entity for Real-Time Multiple ID Detection at Scale In Fantasy Sports (arXiv:2310.05651v1)

**Citation:** Akriti Upreti, Kartavya Kothari, Utkarsh Thukral, Vishal Verma (2023). *FENCE: Fairplay Ensuring Network Chain Entity for Real-Time Multiple ID Detection at Scale In Fantasy Sports*. arXiv:2310.05651v1. URL: https://arxiv.org/abs/2310.05651v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 440 lines).
**Verdict:** REJECT — read in full; a competent fraud/account-abuse system for Dream11's 190M-user cash-bonus operation, but it is platform-integrity infrastructure, not sports prediction or GSE engine research, and its reusable core (two lines of defense: heuristic equality edges + Random Forest link prediction + connected components with human-in-the-loop actioning) is documented here in case GSE ever needs contest-integrity tooling. No build recommended now.

## 1. Research question
How can a fantasy-sports platform (Dream11, 190M+ users) detect multiple-ID (duplicate) accounts created by a single user to abuse referral/promotional cash-bonus schemes — both in real time at registration (delayed detection is "as good as no detection") and in delayed batch fashion as more behavioral data arrives — while keeping false positives low enough that genuine users are never auto-blocked?

## 2. Dataset / schema
Dream11 production data, proprietary and not publicly accessible. Scale: ~10^8 registered users; the daily batch flow collapses the graph to an edge list "on the scale of billions." Ground truth: manually validated edges from historical risk-operations runs (positives) and cross-joins of validated unique (non-MI) users (negatives). Registration attributes collected per user (full list deliberately withheld — "we have to refrain from providing our complete attribute list"): IP address (latest extracted), date of birth (encrypted), device attributes (cleaned). Exact schema, row counts, and time ranges are not stated in the paper. Not replicable outside Dream11.

## 3. Method / model
FENCE has 5 components (§5):
1. **Pre-processing** of user-registration attributes (§5.2): extract latest IP, encrypt DOB, clean device attributes.
2. **Edge creation** (§5.3): two lines of defense. (a) *Heuristic edges*: deterministic attribute-wise associations from heuristically curated features — e.g., exact IP equality between a new and old user creates an edge; high precision, lower recall. (b) *Model-based edges*: link prediction as binary classification — for each new user, cross-join against all pre-existing users to form candidate edges; edge features Fe = C(Fu1, Fu2) from exact/partial/similarity comparisons of user attributes; predict edgePresent propensity P(edge) = f(Fe) with a **distributed Random Forest from PySpark MLlib** (Algorithm 1); edges with P(edge) > threshold are kept. All edges treated equally once formed.
3. **Graph creation** (§5.4): user graph G = (E, V) on AWS Neptune (Gremlin). Heuristic and model edges added dynamically at different intervals.
4. **Multiple-ID detection** (§5.5): three approaches compared — (i) Gremlin connected-components queries on Neptune (rejected: latency escalates with graph size, unsuitable for real time); (ii) distributed **Alternating algorithm** (Kiveris et al. 2014, Small Star / Large Star operations alternating to convergence, O(n), via Spark MapReduce — rejected for real time: needs all edge/vertex combinations); (iii) **caching-enhanced hybrid** (adopted): run connected components offline on existing edges, store user→cluster mapping in Redis (O(1) lookup); at registration, fetch the new user's 1-degree connections from the graph DB, inherit the cluster from cache (largest cluster on conflict), with a separate reconciliation job merging clusters. Scoring is per cluster (0–1) from a statistical function of cluster size, node types, n-degree connections, and family-device handling.
5. **User actioning** (§5.6): cluster score > 0.95 → automated real-time blocking; score ≤ 0.95 or batch highlights → manual human-in-the-loop review before action. Manual feedback (1–10% of highlights sampled for review) feeds retraining via the data warehouse; MLFlow end-to-end for training/inference/registry/monitoring.

## 4. Equations & assumptions
The paper's mathematics are definitional (quoted faithfully):
- Undirected edge: E = (u1, u2), user (node) U.
- User attributes: Fu = a1, a2, ..., ap. Edge features: Fe = f1, ..., fq, with fi = C(a1i, a2i) where C is a comparison operator outputting a hash of the association for that attribute type.
- Graph: G = (E, V); edge e = {x, y}, x, y ∈ V.
- Connected component: C ⊆ {u1, ..., un} where an x-degree connection (x ∈ Z+) exists between users in C.
- Edge prediction: P(edge) = f(Fe) (Random Forest; thresholded).
- Alternating algorithm: repeat { large-star; small-star } until convergence (no node/vertex changes).
Stated assumptions: MI accounts exhibit dense connections and are found in clusters while benign accounts are sparse; a user forming an edge with a cluster member is a potential FPV user; delayed detection is worthless for prevention (but still needed for metric reporting).

## 5. Features / target
Input features: registration attributes (IP, encrypted DOB, device attributes — full list withheld as proprietary); edge-level features Fe derived by exact-match, partial-match, and distance-based similarity comparisons of paired user attributes. Target: binary edgePresent (edge exists between user pair) for the link-prediction model; downstream, a cluster-level MI score in [0, 1] with actioning threshold 0.95.

## 6. Validation design
No classical train/val/test split is described. Evaluation is production-based: **online precision** computed on active detection from user + risk-operations team feedback, separately for automated and manual flows; **training recall** computed against the known ground truth available at training time. Baselines: the three connected-component approaches compared on runtime (Fig. 6: runtime vs. connected-component size; Approach 3 roughly constant) and the Alternating algorithm benchmarked at varying edge/node counts on 6× r5d.4xlarge (Fig. 7). Splits are not time-ordered in any formal sense — monitoring is continuous with 1–10% of highlights sampled for manual review to track false-positive rate and precision drift.

## 7. Numerical results / baselines
All numbers quoted exactly from the paper (§6):
- **Business impact (§6.3):** "Post deployment of this system we observed a relative decrease of **86% in system FPV**," bringing overall system FPV to an acceptable level, sustained since.
- **Real-time latency (§6.1):** production pipeline "processes users within **4 seconds** of their registration," roughly constant irrespective of connected-component size (Fig. 6).
- **Model performance (Table 1, §6.4):** Automated flow — online precision **96.7%**, training recall **55.2%**; Manual flow — online precision **70.2%**, training recall **86.4%**. The paper notes training recall is based on known ground truth at training time; automated flow uses higher thresholds (high precision, low recall) so genuine users are not impacted, while the manual flow's lower threshold yields higher recall at lower precision because a human validates.
- Manual-review sampling for drift monitoring: **1% to 10%** of highlights (§5.7.5). Cluster auto-block threshold: score **> 0.95** (§4.2, §5.6).
- Paper's interpretation (distinguished from its claims): the automated flow deliberately sacrifices recall (55.2%) for precision (96.7%); ~50% of highlights still flow through manual review, with a stated goal of moving 80% to automated flows (§7).

## 8. Code / data availability
None stated — no repository link, no dataset release; the system is Dream11-proprietary and the attribute list is deliberately withheld.

## 9. Leakage & limitations
Adversarial view: (1) **Training recall is computed on known ground truth at training time** — the positives are manually validated edges, i.e., cases the risk team already caught, so recall is measured against the detectable subset, not the true fraud population; true recall is unknowable and likely lower. (2) Online precision comes from user/ops-team feedback, not blinded adjudication — appeals-driven feedback can inflate precision. (3) No direct false-positive rate on genuine users is reported; the 96.7% automated precision is the only guard. (4) The attribute list is withheld, so nothing is independently reproducible. (5) The authors admit the cache-based real-time flow **misses users due to outdated cache** (slightly reduced recall), relying on the batch flow to catch them. (6) Cluster-level scoring assigns the same score to all members of a component — the authors flag this as future work (label propagation). (7) Family members sharing a device are a known false-positive source, handled heuristically. (8) GSE relevance: Dream11's threat model (cash-bonus abuse at 190M-user scale) does not exist at GSE; GSE has no referral-bonus operation, no risk-ops team, and no auto-block action to protect. This is why the verdict is REJECT despite the paper being methodologically competent.

## 10. GSE overlap
Checked `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No overlap: the map contains no fraud-detection, abuse-detection, Sybil, or account-integrity research — nothing in the Sports repo, Drive, or Gmail threads covers this. Not a duplicate. It is adjacent only to GSE's *platform operations* (not the prediction engine): if GSE ever ran cash contests, paid promos, or affiliate programs, the account-linking design would be the starting point. **Overlap verdict: no duplicate, but no current application — reject for now, keep the design documented.**

## 11. GSE implementation spec
No build recommended. If GSE ever launches cash contests or paid promo programs and sees duplicate-account abuse, the concrete build plan is: pairwise attribute-similarity features (email, IP/subnet, device fingerprint, promo-code reuse) → scikit-learn RandomForestClassifier edge prediction (no need for the paper's PySpark Neptune stack at GSE scale) → in-memory union-find connected components → cluster score with a >0.95-equivalent threshold routing to a human review queue (never auto-block without a risk-ops team). Estimated effort if ever needed: ~2 engineer-weeks. Until that trigger exists: zero work.

## 12. Reproducible test
Not applicable now. If the trigger ever fires: train on months 1–9 of GSE signup/promo logs with historically confirmed abuse as positives and random clean-user cross-joins as negatives; test on months 10–12 time-ordered; metric = precision/recall at the 0.95-equivalent threshold vs. a heuristic-equality-edges baseline.

## 13. Acceptance / rejection gate
**REJECT.** Gate (stated before any test, and already failed on inspection): build only if GSE operates a cash-bonus/promo program with observed duplicate-account abuse — i.e., the paper's threat model exists at GSE. It does not: GSE has no referral bonuses, no cash contests, no risk-operations team, and no auto-block action. The paper's contribution is platform-integrity infrastructure with no path to improving GSE's prediction engine, content operation, or revenue lanes. Reject; re-examine only if the abuse trigger in §11 materializes.

## 14. Improvement experiment
The experiment worth running *if the rejection trigger ever flips*: implement the paper's own stated future work — replace the uniform cluster score with **label propagation over the user graph** (message-passing in the style of GCNs) to assign *user-specific* MI scores, so a genuine user one hop from a fraud cluster (e.g., a family member on a shared device) is not scored identically to the cluster core. Test whether per-user scores cut the false-positive review queue by ≥ 30% at fixed recall versus the uniform cluster score. This directly attacks the paper's admitted limitation (§7) and is the single upgrade that would matter for any future GSE adoption.
