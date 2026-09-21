# [0129] Choosing the Right Communication Protocol for your Web Application (arXiv:2409.07360)

**Citation:** Mohamed Hassan (2024). *Choosing the Right Communication Protocol for your Web Application*. arXiv:2409.07360v1. URL: https://arxiv.org/abs/2409.07360v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via pdftotext; ar5iv had no HTML conversion — abs page only).
**Verdict:** REJECT — a 7-page narrative literature review with no dataset, no experiments, no equations, and no quantitative comparison; not research evidence. Flagged for replacement in the sweep.

## 1. Research question
Which communication protocol (REST, SOAP, GraphQL, gRPC, WebSockets, SSE, HTTP/2/3, MQTT) should a web application choose for a given use case? The paper surveys each protocol's characteristics and gives selection guidance.

## 2. Dataset / schema
None. No dataset, no schema, no measurements. This is a literature review (Section I–V): protocol descriptions, feature tables, and generic recommendations.

## 3. Method / model
Narrative review methodology (Section I): summarize each protocol's design (request/response model, framing, multiplexing, statefulness), tabulate strengths/weaknesses, and map protocols to use cases. No experiments, no benchmarks, no simulations, no code.

## 4. Equations & assumptions
No equations ("Not stated in paper"). Assumptions are implicit: the reader accepts the paper's qualitative characterizations; no performance model is formalized.

## 5. Features / target
Not applicable — no features, no target, no prediction task. The "output" is qualitative guidance: REST for simple CRUD; gRPC for typed, high-performance service-to-service calls; WebSockets for bidirectional real-time; SSE for server-to-client streaming; MQTT for constrained IoT devices; GraphQL for flexible client-driven queries; SOAP for legacy enterprise contracts.

## 6. Validation design
None. No validation of any kind — no latency/throughput measurements, no case studies with numbers, no user study of the guidance.

## 7. Numerical results / baselines
None. Zero quantitative results, zero baselines, zero tables of measurements. The only numbers in the paper are protocol version labels (HTTP/2, HTTP/3) and the 7-page length.

## 8. Code / data availability
None. No repository, no data, no artifacts.

## 9. Leakage & limitations
Adversarial read: (a) this is undergraduate-survey quality — the reference base leans heavily on glossary and vendor documentation pages rather than primary sources or measurements; (b) the paper declares GPT-4 was used for grammar/fluency polishing (acknowledgment section) — the prose polish exceeds the analytical depth; (c) several recommendations are truisms any practitioner knows (WebSockets for bidirectional real-time); (d) no treatment of operational concerns that actually drive protocol choice (TLS overhead, CDN cacheability, firewall traversal, client library maturity); (e) published 2024, already dated on HTTP/3 deployment guidance. As evidence for any engineering decision, this paper contributes nothing beyond a checklist.

## 10. GSE overlap
From existing-research-map.md: GSE's stack uses REST (odds APIs, nflverse), SSE/WebSocket-class streaming (live data), and FastAPI-style serving. Protocol selection for GSE's fetch harness and any future live-odds streaming is a real decision — but this paper provides no data to inform it. No duplication (no protocol research in the corpus), and no usable content either.

## 11. GSE implementation spec
No implementation from this paper. The real GSE need it gestures at — choosing transports for live odds/data streaming — should be answered by measurement, not by this review (see §14).

## 12. Reproducible test
Not applicable to the paper (nothing to reproduce). The paper's conclusions should be treated as unverified assertions.

## 13. Acceptance / rejection gate
REJECT as evidence: a literature review with no data cannot clear any evidence bar. Recommend replacing this paper in the sweep with a measurement study (e.g., a WebSocket vs SSE vs polling benchmark under sports-data payload shapes). The paper may serve as a student reading-list pointer and nothing more.

## 14. Improvement experiment
One follow-up (the study GSE actually needs): benchmark REST polling vs SSE vs WebSocket for GSE-shaped workloads — 1 KB JSON odds snapshots at 1–10 s cadence to 1–50 concurrent consumers on the VM; measure median/p99 delivery latency, bytes on the wire, and server CPU. Dataset: replayed odds-API-shaped fixtures. Metric: p99 update latency and CPU per consumer. Gate: adopt the transport with ≥2× lower p99 latency at equal CPU before building any live-odds feature.
