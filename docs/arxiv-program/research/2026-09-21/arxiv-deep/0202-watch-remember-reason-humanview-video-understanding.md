# [0202] Watch, Remember, Reason: Human-View Video Understanding with MLLMs (arXiv:2606.07433v1)

**Citation:** Jiahao Meng, Yue Tan, Qi Xu, Kuan Gao, Weisong Liu, Yanwei Li, Jason Li, Lingdong Kong, Haochen Wang, Qianyu Zhou, Jiangning Zhang, Guangliang Cheng, Yunhai Tong, Lu Qi, Minghsuan Yang (2026). *Watch, Remember, Reason: Human-View Video Understanding with MLLMs*. arXiv:2606.07433v1. URL: https://arxiv.org/abs/2606.07433v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — adopt the watch–remember–reason decomposition as the reference architecture for GSE's broadcast-video lane, and mine its sports-video pointers (DeepSport, FineQuest, SPORTU, Unisoccer) as follow-up reads; there is no method here to adopt wholesale.

## 1. Research question
A **survey paper** (no new model proposed, no experiments run). Its question: can the fragmented MLLM-based video-understanding literature be unified under a human-cognitive functional decomposition — *watching* (acquire evidence), *remembering* (preserve context), *reasoning* (derive grounded answers) — and what do that taxonomy's gaps reveal about the frontier (long-video efficiency, memory modeling, streaming, faithful reasoning)?

## 2. Dataset / schema
No experiments, hence no experimental datasets. The paper catalogs **training datasets** (§V-A, Table V) by task type:
- **Video QA:** VideoChat2-IT 1.9M, LLaVA-Video-178K 1.3M, VideoCoT 22K, VideoEspresso 202K, Video-R1 165K CoT + 260K RL, VideoRFT 102K CoT + 310K RL, LongVideo-Reason 52K, STGR 30K CoT + 36K RL, ReWatch-CoT 135K, VideoZoomer 11K, VideoSIAH 247.9K, Conan 91K, Seeker-173K 173K, LongVideo-R1 33K.
- **Video Captioning:** Panda-70M 70M, ShareGPT4Video 4.8M, Video ReCap 5.3M, Vript 420K, MiraData 330K.
- Scales are (video clip, text) pair counts unless marked. Benchmarks are cataloged across task types, supervision formats, modalities, and capability dimensions (§V-B; per-paper numbers not extracted in this read).

## 3. Method / model
Not a method paper — a taxonomy. The organizational framework:
- **Watching** (§III-A): fine-grained (temporal/spatial grounding — TimeChat, LITA, UniTime, TimeLens, OMTG, Sa2VA, SAMA; SeViLA, LLaVA-MR, TimeSuite, SOONet, TRACE, TAR-TVG, Grounded-VideoLLM, Momentor, VideoPerceiver, VideoZoomer, TVG-R1, MUSEG), comprehensive (captioning/summarization — Streaming DVC, DoYouRemember, DIBS, PLLaVA, AuroraCap, Tarsier2), audio-visual (Baichuan-Omni, Qwen2.5-Omni, Ming-Omni, LLaMA-Omni, Stream-Omni, Omni-Captioner, OmniVinci), efficient (AKS, Q-Frame, FrameFusion, DyCoke, Video-XL-2, VideoNSA).
- **Remembering** (§III-B): STM (transient, task-local: KV caches, clip tokens) vs. LTM (persistent: vector stores, summaries, entity/event graphs); offline memory — agentic (VideoAgent, AdaVideoRAG, VideoLucy, MemVid, LVAgent, GCAgent, AVUA, EGAgent, MemGen, M3-Agent) vs. non-agent/deterministic (MovieChat, ReWind, LongVU, VidCompress, MARC, MA-LMM, VideoLLaMB, HierarQ, HERMES, HEM-LLM, ∞-Video, Hour-LLaVA); streaming memory — KV-cache compression (StreamMem, InfiniPot-V, StreamingTOM, rLiVS, Video-SALMONN S, StreamingVLM), dual/hierarchical (Flash-VStream, StreamChat, ProVideLLM, StreamForest, VideoStreaming), system co-design (QuickVideo, LiveVLM), proactive (StreamBridge, Dispider).
- **Reasoning** (§III-C): text-only agentic (VideoAgent, DoraemonGPT, Video-of-Thought, VCA, Flow4Agent, DVD, VideoAgent2, CoT-Vid) and non-agent (Video-R1, TW-GRPO, VistaDPO, VerIPO, VideoRFT, Time-R1, DeepVideo-R1, Video-CoT, SpaceR); thinking-with-videos agentic (VideoChat-R1.5, Pixel Reasoner, FrameMind, Love-R1, VideoZoomer, VITAL, Conan, VideoTemp-o3, Video-o3, VideoSeek) and non-agent (Video-Thinker, Open-o3-Video, Rewatch-R1).
- **Sports subfield** (§IV-B): SPORTU [241] (multi-level sports reasoning evaluation; gap between general perception and rule-oriented decision-making), Unisoccer [242] (soccer-centric multimodal data + unified soccer foundation encoder), Jiang et al. [243] (curriculum-style short-event-clip adaptation of a general video VLM to soccer QA/classification), DeepSport [244] (agentic think-with-videos loop refining temporal evidence retrieval; targets the failure mode where sparse uniform sampling misses brief decisive events), FineQuest [245] (training-free sports VideoQA grounding visual evidence into a sports knowledge scene graph; dual-mode structured reasoning robust to rapid actions and camera cuts). Survey's stated open problems for sports: explicit spatio-temporal evidence aligned with rules; generalization across leagues and broadcast styles.
- Training paradigms covered: SFT and RL post-training (GRPO).

## 4. Equations & assumptions
The paper's own contribution is definitional, not derived. Equations (1)–(9), quoted from §II-B (notation as in the paper):

**Unified video-understanding decomposition.** Video V = {f_t}_{t=1}^{N} (frames), audio A = {a_t}_{t=1}^{N}, aligned text T = {τ_t}_{t=1}^{N} (subtitles/ASR/captions). System F_VU : (V, A, T, q) → O for query q and output O (text, temporal segments, or spatial regions).
- (1) Watching: Z = {z_t}_{t=1}^{N} = F_watch(V, A, T, q), z_t = multimodal representation at time t (spatio-temporal grounding, query-aware frame selection, cross-modal alignment, semantic abstraction).
- (2) Remembering: m_t = F_remember(m_{t-1}, z_t, q), t = 1…N; M = {m_t} the memory sequence; m_0 initial memory.
- (3) Reasoning: R = F_reason(Z, M, q); R = reasoning trace (textual steps, grounded evidence such as timestamps/spatial regions, intermediate tool-use actions).
- (4) Output: O = F_out(Z, M, R, q).

**MLLM core.** Input x = (V, A, T, q), output tokens y = (y_1…y_L); autoregressive MLLM with parameters θ:
- (5) p_θ(y|x) = ∏_{i=1}^{L} p_θ(y_i | y_{<i}, x), where y_{<i} = (y_1…y_{i-1}).

**Training objectives (standard, restated):**
- (6) SFT: L_SFT = −E_{(x,y*)∼D}[Σ_{i=1}^{L} log p_θ(y_i* | y_{<i}*, x)].
- (7) GRPO: L_GRPO(θ) = −E[(1/G) Σ_{i=1}^{G} ℓ_i(θ)] + β D_KL(π_θ ‖ π_ref), G = group size, R̃_i = group-normalized reward.
- (8) ℓ_i(θ) = (1/|o_i|) Σ_{t=1}^{|o_i|} min(r_{i,t}(θ) R̃_i, clip(r_{i,t}(θ), 1−ε, 1+ε) R̃_i) (clipped surrogate).
- (9) r_{i,t}(θ) = π_θ(o_{i,t} | x, o_{i,<t}) / π_{θ_old}(o_{i,t} | x, o_{i,<t}) (token-level policy ratio); ε = clipping coefficient; β = KL strength.

**Assumptions:** human video comprehension (focus on informative moments → retain → connect evidence) is a valid abstraction for MLLM system design; decomposing systems into watch/remember/reason exposes functional roles better than task- or technique-based taxonomies.

## 5. Features / target
n/a — survey paper; no model trained, no target variable. The "features" are the survey's coverage dimensions: perception representations, memory states, reasoning traces, predictions.

## 6. Validation design
n/a — no experiments. Comparative scope claim (Table I): the survey covers temporal+spatial grounding, captioning, omni-modal, efficiency, offline memory, streaming memory, text reasoning, o3-like video reasoning, subfields, training data, and benchmarks — all checked, vs. eight prior surveys that cover only subsets.

## 7. Numerical results / baselines
No experimental results (survey). Survey-level findings stated as prose claims:
- Long-form video understanding is not a simple extension of short-video modeling; it requires joint design of perception, memory, reasoning, efficiency, and evidence faithfulness.
- Core tension: redundancy vs. evidence sparsity — long videos are mostly redundant frames, yet decisive evidence may appear only briefly (directly echoes ledger 0201's heavy-tailed difficulty distribution, independently validating that design premise).
- Sports video finding (§IV-B): models still struggle to precisely localize decisive moments and consistently apply sports rules; key evidence is highly time-localized and requires both accurate temporal grounding and sports knowledge.
- Hour-scale finding (§VI-C): compression/sparse-selection/periodic summaries reduce cost but lose key details or break long-range dependencies; agentic memory is expensive and fails when retrieval is slightly wrong.
- Open problem §VI-D: treat grounded reasoning as *budgeted evidence search*, jointly optimizing answer correctness, evidence alignment (temporal/spatial IoU), and evidence compactness — via verifiable RL or verifier-guided preference optimization; plus uncertainty-aware inspection (request evidence only when uncertain).
- Open problem §VI-C: *structured multi-level memory with evidence pointers* — three tiers (short buffer for recent fine-grained evidence; event memory of temporally bounded episodes; long-term store for entities/relations), learned write/forget, retrieval returning both summary and supporting time spans.

## 8. Code / data availability
Companion living repository (stated in abstract): https://github.com/marinero4972/Awesome-HumanView-VideoUnderstanding — "Related works will be continuously traced" there. No model code in the paper itself (survey).

## 9. Leakage & limitations
- **Survey, not evidence:** no claim in it is empirically validated by the authors; every method summary is second-hand. Any GSE use must verify against the primary papers.
- **Coverage decay:** published 2026-06-05; the field moves in weeks. The 2026 citations (ICLR/CVPR/ICML/NeurIPS 2026) are very recent preprints — treat performance claims about them as unverified.
- **Sports coverage is thin:** the sports subfield (§IV-B) cites only 7 works [241–247], all soccer-centric or generic; no American football video-understanding work is covered. The survey's sports conclusions may not transfer to NFL broadcast structure (22 players, play segmentation, All-22).
- **No cost numbers:** efficiency methods are taxonomized without comparative compute/accuracy trade-off tables in the recovered text — the taxonomy does not tell you which method to pick under a budget.
- **Formulation is descriptive:** equations (1)–(4) define interfaces, not mechanisms; they cannot be falsified and provide no inductive bias by themselves.

## 10. GSE overlap
- Existing-research-map review: GSE has no MLLM video-understanding work and no memory-architecture work for video; the tracking lane (ledgers 0008, 0201) is about *extracting tracks from video*, while this survey covers *understanding video with MLLMs* — adjacent but distinct. **New capability class** (video QA / evidence-grounded reasoning over broadcast footage), not a duplicate.
- Connects directly to the two tracking ledgers: the survey's watch–remember–reason decomposition is a natural architecture for a GSE "broadcast video analyst" (watch = detection/tracking/grounding; remember = play/game memory across a broadcast; reason = evidence-grounded answers for content/research). The "budgeted evidence search" open problem (§VI-D) generalizes ledger 0201's margin-dispatch idea from tracking to reasoning.
- The redundancy-vs-sparsity tension is the same heavy-tailed-difficulty premise as 0201 — cross-validated from a different literature.
- Not among the 64 deeply covered papers.

## 11. GSE implementation spec
1. **Adopt the decomposition as architecture:** structure GSE's broadcast-video pipeline as F_watch → F_remember → F_reason. Watch = the 0201-style tracking stack (detections, tracks, temporal grounding of plays); Remember = a structured game memory (play-indexed event memory + entity store for players/teams, with evidence pointers back to timestamps); Reason = query-driven evidence retrieval producing timestamp/box-grounded answers (e.g., "show every 3rd-and-long blitz in Q3" returns clips + boxes, not just text).
2. **Follow-up reads first:** DeepSport [244] (agentic temporal-evidence retrieval — directly relevant to finding decisive plays), FineQuest [245] (training-free sports VideoQA with a knowledge scene graph — cheap to prototype), SPORTU [241] (evaluation harness for rule-aware sports reasoning — use to benchmark), Unisoccer [242] (domain foundation encoder pattern — consider an NFL analogue trained on broadcast footage).
3. **Budgeted evidence search (§VI-D):** implement the reasoner as an uncertainty-aware inspector — retrieve/inspect more clips only when the current answer's confidence is low; log evidence compactness (clips inspected per query) as an efficiency metric.
4. **Effort:** architecture adoption is a design decision (low cost); the memory tier and evidence-grounded reasoner are a multi-week build after the watch layer (0201/0008) produces tracks.

## 12. Reproducible test
- **Dataset:** 20 full NFL game broadcasts (public footage), with a query set of 100 football questions (play identification, "when did X happen", formation/counting questions) and ground-truth timestamps.
- **Metric:** answer accuracy + evidence alignment (temporal IoU of returned clips vs. ground truth) + evidence compactness (clips inspected per query).
- **Baseline to beat:** a naive uniform-frame-sampling VLM QA baseline on the same queries.
- **Window:** fixed query set; the architecture passes only if evidence IoU ≥ 0.5 on localized queries (the survey's own stated sports failure mode is imprecise localization of decisive moments).

## 13. Acceptance / rejection gate
- **ADAPT the architecture** (watch–remember–reason with budgeted evidence search) for GSE's video lane if: the primary read-throughs (DeepSport, FineQuest) replicate their core claims on inspection, and a prototype reasoner on the NFL query set beats uniform-sampling VLM QA by ≥ 15 points of answer accuracy with evidence IoU ≥ 0.5.
- **REJECT as an architecture** if prototype evidence IoU stays < 0.5 (the survey's own sports finding says precise localization is the unsolved part) or if per-query compute exceeds the content-production budget — fall back to the deterministic tracking pipeline (0201/0008) without the MLLM reasoner.

## 14. Improvement experiment
Beyond the survey: **play-structured memory instead of generic event memory.** Football has a natural discrete structure (plays, drives, quarters) that generic video-memory methods ignore. Build the Remember tier keyed on play boundaries from the watch layer: per-play records (down, distance, formation, outcome) as the event memory, with evidence pointers to frame spans. Why it might win: the survey's §VI-C open problem asks for structured multi-level memory with learned write/forget — football's play structure gives the write boundaries *for free* (no learned segmentation needed), and retrieval becomes play-indexed rather than similarity-based, sidestepping the "retrieval slightly wrong" failure mode the survey flags for agentic systems.
