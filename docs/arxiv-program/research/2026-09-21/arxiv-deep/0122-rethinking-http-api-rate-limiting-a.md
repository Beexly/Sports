# [0122] Rethinking HTTP API Rate Limiting: A Client-Side Approach (arXiv:2510.04516)

**Citation:** Behrooz Farkiani, Fan Liu, Patrick Crowley (2025). *Rethinking HTTP API Rate Limiting: A Client-Side Approach*. arXiv:2510.04516v3. URL: https://arxiv.org/abs/2510.04516v3
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML.
**Verdict:** ADOPT — the Adaptive Token Bucket (ATB) algorithm is directly applicable as the client-side retry/backoff policy for GSE's data-fetch harness against rate-limited APIs (Odds API, FreePublicAPIs, TheSportsDB, etc.).

## 1. Research question
Can clients, without server-side cooperation, coordinate their consumption of a shared rate-limited HTTP API quota using only the standard HTTP 429 signal — reducing throttled errors without increasing total completion time? The paper develops an oracle MILP benchmark plus two practical algorithms: ATB (fully decentralized Adaptive Token Bucket) and AATB (ATB + aggregate UDP telemetry sharing).

## 2. Dataset / schema
Two experimental regimes (Section III): (a) real-world traffic from a search API log: avg 131K requests/day, 27K unique IP addresses; test scales of 400/500/600/700/800 requests with 18/22/23/25/27 users respectively; (b) synthetic: Poisson traffic via wrk2, scenarios of 5 clients and 100 clients, 400–800 requests each in 5-minute windows. Envoy token bucket limiter: capacity 100, rate 80/min (≈500 accepted requests per 5 min). Result aggregation: averaged over ≥30 runs. Code/data on GitHub (see §8).

## 3. Method / model
(a) Oracle: mixed-integer linear program minimizing total request completion delay subject to token-bucket capacity and FIFO request ordering — the unachievable upper bound, solved for small instances. (b) ATB: each client maintains a local token bucket; on a 429 the client adapts its local rate estimate downward; pacing converges to a fair share of the global quota without any server changes. (c) AATB: ATB augmented with aggregate telemetry over UDP — clients broadcast coarse rate/limit state (not per-request data) so each client can set its bucket closer to the true fair share faster. All requests consume exactly 1 token (Section III assumption).

## 4. Equations & assumptions
Paper is systems-design work; exact equations as stated (transcription note: ar5iv HTML faithful; no LaTeX reconstruction performed):
- Token-bucket constraint (oracle): "the number of tokens consumed by requests up to time t cannot exceed capacity + rate × t" (verbal form; the MILP is written in Section III-A with variables x_i (request acceptance time), objective minimizing Σ_i (completion_i − arrival_i)).
- ATB adaptation: local rate r ← r × (1 − β) on receiving a 429 (β = backoff factor); slow recovery r ← r + α per successful response; exact α, β values not numerically stated in the paper body ("Not stated in paper" — must be read from the GitHub code).
- Assumptions (Section III): independent clients sharing one quota; server returns HTTP 429 on overload; one token per request (non-uniform token costs explicitly excluded); telemetry channel for AATB is UDP broadcast with coarse aggregates only.

## 5. Features / target
Input features: 429 feedback (binary per request), local success rate, shared telemetry aggregates (AATB), configured request volume, number of active clients, token-bucket capacity/rate. Target: optimal per-client request pacing such that (i) total 429 errors minimized, (ii) request completion duration ≈ baseline WB (wait-before-retry) policy. Prediction horizon: per-request online decisions.

## 6. Validation design
Real search-log replay (Table II: 800-request scenario) and synthetic wrk2 experiments (Tables III-V); baselines = WB (wait-backoff) policy and a non-adaptive oracle comparison; results averaged over ≥30 runs each (Section III). Not a train/test ML setup — this is a systems benchmark; the ≥30-run averaging is the anti-noise measure.

## 7. Numerical results / baselines
Exact reported numbers: Real 800-request scenario — WB: 62.70% fewer errors, 25.45% longer duration; ATB: 70.13% fewer errors, 21.26% longer duration; AATB: 93.23% fewer errors, 27.62% longer duration, 276.25 telemetry messages. Synthetic 5-client at 500/800: AATB errors −96.9%/−97.3%, duration +13.3%/+19.8%. 100-client: ATB at 500/800 → errors −91.5%/−90.5%, duration +24.3%/+23.1%; AATB errors −77.8%/−91.7%, duration +26.4%/+11.7%. Conclusion (Section VI): at 800 requests, ATB/AATB reduce errors 70.13%–97.3% at the cost of 11.7%–27.62% longer completion time vs WB baseline. Note the duration trade-off: AATB is ~27.6% slower to complete in the real trace.

## 8. Code / data availability
Yes — https://github.com/Bfarkiani/ratelimiter (Section I / reproducibility statement). Real search log is proprietary (per-day stats given, raw log not released).

## 9. Leakage & limitations
Adversarial read: (a) uniform 1-token-per-request assumption — APIs with variable token costs (OpenAI-style) break the fairness math; (b) 27.6% longer completion with AATB is non-trivial when GSE pulls are time-sensitive (Sunday morning lines); (c) telemetry channel adds operational complexity — the paper's UDP broadcast works in a lab, not across GSE's single VM; (d) compared only against its own WB baseline, not against standard exponential-backoff-with-jitter clients or existing adaptive limiters (e.g., Netflix's concurrency-limits library); (e) no adversarial-client analysis (a selfish client can grab quota); (f) NFL overlap: none directly — infra research. Strength vs paper 0121: this one has code, a real trace, ≥30-run averaging, and a working oracle upper bound.

## 10. GSE overlap
From existing-research-map.md: the GSE corpus's API work is usage-oriented (2026-09-18-props-reverse-engineering/firecrawl API deep-dives for OddsPapi/API Vault/FreePublicAPIs/TheSportsDB; the Odds API 20K-credits/month plan at $30/mo from MEMORY.md) — no adaptive retry/backoff policy research. No duplication: nothing in the map covers client-side coordination or retry-policy design.

## 11. GSE implementation spec
Lift ATB as the retry/backoff policy for the GSE data-fetch harness (single-client case first): implement a per-API token bucket with the α/β adaptation from the paper's GitHub (extract exact constants from code since not in paper), keyed per endpoint (Odds API 20K/mo, FreePublicAPIs, TheSportsDB, nflverse CDN). Replace naive fixed-sleep/exponential-backoff in all fetch scripts. AATB's UDP telemetry is unnecessary on a single VM — skip it; ATB alone gave 70.13% fewer errors on the real trace. Effort: half a day (port + wire into fetch scripts).

## 12. Reproducible test
Dataset: GSE fetch logs over 2026-09-21 → 2026-09-28 hitting the same APIs. Metric: HTTP 429 count per 1,000 requests; total pull completion time. Baseline: current fixed-sleep retry policy. Run side-by-side (two API keys or staggered days) for one week.

## 13. Acceptance / rejection gate
ADOPT ATB as the default retry policy iff 429s drop ≥50% vs the fixed-sleep baseline with completion-time increase ≤30% (matching the paper's own trade-off bounds) over the 1-week test; if 429s are already ~zero with the current policy, the marginal gain is nil — reject adoption as unnecessary.

## 14. Improvement experiment
One follow-up: make ATB quota-aware — feed it each API's published quota (e.g., The Odds API's 20K credits/month, per-provider tier headers) as a prior so the initial bucket starts at the true fair share instead of converging from cold start; measure cold-start 429s in the first 60 seconds of a pull as the metric. This directly addresses the paper's 27.6% completion-time cost by shortening the convergence window.
