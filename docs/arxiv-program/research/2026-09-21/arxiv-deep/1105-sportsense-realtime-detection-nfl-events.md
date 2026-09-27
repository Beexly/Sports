# [1105] SportSense: Real-Time Detection of NFL Game Events from Twitter (arXiv:1205.3212v1)

**Citation:** Siqi Zhao, Lin Zhong, Jehan Wickramasuriya, and Venu Vasudevan (2012). *SportSense: Real-Time Detection of NFL Game Events from Twitter*. arXiv:1205.3212v1. URL: https://arxiv.org/abs/1205.3212v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — a validated real-time social-signal event-detection recipe (matched filter + keyword trigger) directly transferable to GSE's live injury/news/event detection; the 2012 Twitter API assumptions need modernization.

## 1. Research question
Can NFL game events (specifically touchdowns) be detected in real time from Twitter activity, with latency and accuracy competitive with official broadcast feeds?

## 2. Dataset / schema
18 NFL games, 100 touchdowns, manually timed as ground truth. Tweets collected via Twitter streaming API filtered by game keywords. Schema: tweet timestamps, matched-filter scores per time window. Keyword-retrieval stage reported separately from detection stage.

## 3. Method / model
Two stages: (1) keyword-based tweet retrieval (claimed 60% recall, <5% irrelevant-tweet false-positive rate); (2) matched-filter event detector applied to tweet-rate time series, plus a combined detector fusing multiple signal components. Historical search variant: window=30, threshold=8. Manual timing of touchdowns as labels.

## 4. Equations & assumptions
Matched-filter formulation on tweet volume/activity time series; "Not stated in paper" for the exact template used at the equation level in this read. Assumptions: tweet surges are time-locked to game events with a learnable delay distribution; keyword retrieval captures most event-related tweets; manual timing is accurate.

## 5. Features / target
Input: per-second tweet-rate (and keyword-match rate) time series around NFL games. Target: event occurrence (touchdown) with detection latency as the key metric.

## 6. Validation design
Leave-one-out cross-validation (LOOCV) over the 18 games / 100 touchdowns. Keyword retrieval validated on a labeled subset. Historical-search detector (window 30, threshold 8) evaluated on archived data. Time-ordered by construction (streaming simulation).

## 7. Numerical results / baselines
LOOCV: combined detector 98% true-positive / 9% false-positive; single matched filter 96% TP / 13% FP. Keyword retrieval: 60% recall, <5% FP rate. Historical search (window 30, threshold 8): 97% TP, <4% FP. Average detection delay ~45 seconds; 60% of events within 40 seconds; all events detected within 90 seconds.

## 8. Code / data availability
None stated in paper.

## 9. Leakage & limitations
Small event set (100 touchdowns, 18 games). Twitter API and tweet volumes are from 2011–2012 — today's X API is paid, rate-limited, and tweet distribution has shifted (bots, engagement farming). Manual timing may bias latency numbers favorably. Keyword recall of 60% means 40% of signal is discarded upstream. Events are easy-mode (touchdowns); injuries, controversial calls, and news (the GSE-relevant events) are noisier and were not tested.

## 10. GSE overlap
Extension, not duplicate: GSE runs X-based reply-opportunity monitoring and signal-desk briefs (per the existing-research map, X-ops lanes) but has no published real-time *event-detection* recipe with calibrated latency/accuracy numbers. Cite `~/workspace/arxiv-sweep/existing-research-map.md` — text/news-as-features gap (GAP 12).

## 11. GSE implementation spec
(a) Modern ingestion: X API filtered stream on NFL keywords + beat-writer account lists; (b) per-game baseline tweet-rate model (rolling median/MAD over the last 15 min); (c) matched filter over z-scored rate with learned template from 2024 games (labels: official play-by-play event times); (d) fuse with keyword sub-streams (injury keywords, trade keywords); (e) alerting into the GSE event bus with latency SLO. Effort: ~1 engineer-week for the injury-news detector.

## 12. Reproducible test
Dataset: 2024 NFL regular season, X data (or a tweet-volume proxy such as Google Trends/news APIs if X API cost is prohibitive), official injury-report timestamps from nflverse. Metric: detection latency distribution + precision/recall on injury events. Baseline to beat: the paper's 45s average on touchdowns — match within 2× on injury events (≤90s median) with ≤15% FP.

## 13. Acceptance / rejection gate
ADAPT if a 2025-season pilot detects ≥90% of official injury-designation news with median latency under 3 minutes and FP rate under 15%; REJECT if FP exceeds 25% or X API costs exceed $200/season for the data lane.

## 14. Improvement experiment
Add a second-stage LLM classifier on the tweet *text* (not just rate) to disambiguate true injury news from rumor/joke spikes before alerting — addresses the paper's keyword-rate-only design and directly attacks its false-positive weakness on noisy event types.
