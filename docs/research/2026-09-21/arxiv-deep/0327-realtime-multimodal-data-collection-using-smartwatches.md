# [0327] Real-Time Multimodal Data Collection Using Smartwatches and Its Visualization in Education (arXiv:2512.02651v1)

**Citation:** Alvaro Becerra, Pablo Villegas, Ruth Cobos (2026). *Real-Time Multimodal Data Collection Using Smartwatches and Its Visualization in Education*. arXiv:2512.02651v1. URL: https://arxiv.org/abs/2512.02651v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 456 lines).
**Verdict:** REJECT — an education-domain wearable data-collection tooling paper (Fitbit acquisition app + Plotly Dash dashboard, classroom feasibility demo). No model, no quantitative results, no sports application, and GSE has no biometric/wearable data lane or athlete sensor access. Nothing transfers to the NFL analytics engine or the content operation.

## 1. Research question
Can scalable, synchronized, high-resolution multimodal data acquisition be achieved with consumer smartwatches in real classroom settings? The authors build two tools — **Watch-DMLT** (real-time multi-device Fitbit Sense 2 data acquisition) and **ViSeDOPS** (dashboard for synchronized multimodal visualization) — and demonstrate feasibility in a classroom deployment of 65 students giving oral presentations. It is a systems/feasibility paper, not a modeling paper.

## 2. Dataset / schema
Classroom deployment at Universidad Autónoma de Madrid: 65 students, up to 16 Fitbit Sense 2 smartwatches in parallel. Streams: heart rate (bpm), gyroscope (angular velocity X/Y/Z), accelerometer (linear acceleration X/Y/Z), orientation (quaternion w,x,y,z) — each as timestamped CSVs; Logitech C920 webcam video+audio; clicker/mouse/keyboard interaction logs; Tobii Pro Glasses 3 eye-tracking (fixations, saccades) from one audience member; real-time contextual annotations by a research assistant (nervous gestures, eye contact, reading from slides). Fully anonymized; informed consent. No dataset release is described — the paper releases tools, not data.

## 3. Method / model
No statistical or ML model. Engineering contributions: (a) **Watch-DMLT** (Fitbit SDK): three modules — on-watch Data Collection (start/stop UI, device-ID +/− buttons, periodic local CSV writes because RAM can't buffer long sessions); phone-side Data Transmission (Redmi 9C; Bluetooth message queue watch→phone; HTTPS POST phone→server; **1-minute transmission interval** chosen empirically — <30 s overloaded the queue, >2 min overflowed watch memory); server-side Data Processing (Ngrok HTTPS tunnel; unification of per-device files into 4 per-participant session files). Solves Fitbit's restrictions: no real-time raw gyro/accel/orientation access in the consumer API, HR at ~1 reading/5 s with dropouts. (b) **ViSeDOPS** (Plotly Dash): per-student dashboards with HR line graphs segmentable by slide/annotation, paired statistical comparisons, timestamp-linked synchronized video playback (click HR graph → jump video), and slide design-feature extraction (font type/size/numbering).

## 4. Equations & assumptions
None — no equations, no formal model. Operative assumptions: (a) 1-minute transmit cadence balances queue load vs memory overflow (empirically tuned on this hardware); (b) Bluetooth proximity maintained (phone near student — flagged as a failure mode when violated); (c) Wi-Fi sync before/after sessions prevents loss; (d) smartwatch HR/motion are meaningful proxies for stress/engagement (cited, not tested here).

## 5. Features / target
N/A (tooling paper). Collected signals: HR, 3-axis gyro, 3-axis accel, quaternion orientation, video, gaze, interaction logs, annotations. No prediction target; the "output" is synchronized dashboards.

## 6. Validation design
Feasibility demonstration only: one classroom deployment (65 students, ≤16 devices). No controlled experiment, no baseline comparison against alternative acquisition tools, no quantitative metrics (no data-loss rates, latency distributions, or sync-error measurements reported — only qualitative statements like "reliable balance"). The dashboard's analytical value is asserted via example visualizations (Figure 3), not measured.

## 7. Numerical results / baselines
None. All numbers are deployment statistics: 65 students, up to 16 parallel smartwatches, 1-minute transmission interval (vs <30 s queue overload / >2 min memory overflow thresholds), 4 sensor files per participant. No baselines, no accuracy figures, no statistical tests on the collected data.

## 8. Code / data availability
Tools described; no repository URL given in the text. No dataset released. Ethics: informed consent, full anonymization, secure storage per privacy protocols.

## 9. Leakage & limitations
- **No quantitative validation**: data-loss rates, sync precision, and latency are never measured — the core claims (scalable, synchronized, high-resolution) are unquantified.
- **Hardware-specific tuning**: the 30 s / 1 min / 2 min thresholds are Fitbit Sense 2 + Redmi 9C specific; not generalizable.
- **Manual coordination bottleneck**: device assignment and sync "became progressively more complex" with device count — the scalability claim is undermined by the authors' own deployment notes.
- **Proximity fragility**: Bluetooth range violations cause queue overflow and data loss.
- **Ngrok tunnel**: a demo-grade networking choice, not production infrastructure.
- **Domain**: education/oral presentations — zero sports content; no athlete, no performance, no competition data.
- GSE has no access to athlete-worn sensors (no team/league partnership), so even the tooling pattern has no data source to attach to.

## 10. GSE overlap
Existing-research-map check: GSE's corpus is built on public/licensed data — nflverse, NGS tracking, odds APIs, broadcast video. There is **no biometric/wearable lane** and no prospect/athlete physiological data source anywhere in the repo. The paper's domain (classroom learning analytics) and its data (student smartwatches) are entirely outside GSE's sports. The Plotly Dash dashboard pattern is generic tooling GSE already has equivalents of. **Verdict: no overlap and no transfer path.**

## 11. GSE implementation spec
Not applicable — REJECT. No implementation is proposed. (For the record: if GSE ever gained access to athlete wearable data — e.g., a training-camp partnership — the paper's architecture of on-device buffering + batched transmission + timestamped unification is a reasonable reference design. That scenario does not exist today and is not worth planning around.)

## 12. Reproducible test
Not applicable — REJECT. There is no model, metric, or empirical claim to test. (A minimal honest test of the paper's own claims would be: report per-device data-loss rate and cross-device timestamp-sync error across a 16-device session — measurements the paper never provides.)

## 13. Acceptance / rejection gate
**Reject.** Education-domain tooling paper; no model, no quantitative results, no sports application; GSE has no wearable-data access and no biometric lane. Nothing in it improves an NFL analytics engine, a betting model, or a sports content operation.

## 14. Improvement experiment
For the authors: instrument what they claim — report (a) per-device packet-loss/loss rate vs device count (the scalability curve), (b) measured cross-device clock-sync error, (c) end-to-end latency distribution, and (d) a head-to-head against the stock Fitbit API pipeline on the same session. For GSE, the only salvageable idea is the ViSeDOPS interaction pattern (click a time series → jump synchronized video), which could inspire a future All-22 + tracking sync viewer for the film-study side of the content operation — a UI footnote, not a research transfer.
