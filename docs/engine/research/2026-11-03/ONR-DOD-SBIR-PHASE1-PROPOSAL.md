# **Galaxy Science Institute (GSI)**  
**Defense R&D SBIR Proposal**  
*Document ID: GSI-GRANT-ONR-2026-01*  
*Topic: Resilient Tactical Decision Support & Adversarial Trajectory Simulation Under Extreme Sensor Disruption*  

---

## **1. Identification and Significance of the Problem**  
Modern naval command-and-control (C2) systems face escalating threats from adversarial electronic warfare (EW), including **jamming, spoofing, and AI-driven deception tactics**. Current decision-support tools fail catastrophically when:  
- **Sensor inputs are corrupted** (e.g., GPS spoofing, radar clutter injection).  
- **Enemy trajectories are disguised** (e.g., `def_shell_call` maneuvers mimicking friendly IFF signatures).  
- **Probabilistic fusion engines clamp unverified joint likelihoods**, leading to irreversible tactical errors.  

**Galaxy Science Institute (GSI)** proposes a **mathematically bounded decision framework** that:  
✔ **Rejects unverifiable sensor correlations** via spectral decomposition.  
✔ **Detects adversarial trajectory deception** through quantile-conformalized threat bounds.  
✔ **Operates under >80% sensor dropout** without degrading decision integrity.  

*Relevance to ONR Priorities*: Aligns with **Navy AI Trustworthiness** and **All-Domain Adaptive EW Resistance** mandates.  

---

## **2. Technical Objectives**  

### **Objective 1: Real-Time 288-Bit Context-Mask Filtering**  
- **Approach**: Deploy **neural-symbolic masking gates** to dynamically isolate compromised sensor feeds (RF/EO/IR) using entropy-bounded context windows.  
- **Metric**: Achieve **>95% spoof rejection** at 10ms latency on NVIDIA Jetson Orin.  

### **Objective 2: Spectral Cholesky Whitening**  
- **Approach**: Apply **modified Cholesky factorization** to decouple cross-sensor correlations, eliminating false alarms from adversarial interference.  
- **Metric**: **3σ reduction** in fused covariance error under 60% band-limited jamming.  

### **Objective 3: Asymmetric TA-CQR for Provable Safety**  
- **Approach**: **Tactical-Adaptive Conformalized Quantile Regression (TA-CQR)** to compute non-parametric threat bounds resilient to non-stationary EW.  
- **Metric**: **<1% violation rate** of kinematic safety envelopes against adaptive ML-based deception.  

---

## **3. Phase I Work Plan (6 Months)**  

| **Month** | **Task** | **Deliverable** |  
|-----------|----------|------------------|  
| 1-2       | Develop context-mask architecture | Sensor-agnostic masking prototype |  
| 3-4       | Implement spectral whitening in C++ | Benchmarked false-alarm suppression |  
| 5         | TA-CQR integration with MDP planner | Safety certificates for 3 adversarial scenarios |  
| 6         | Final system demo (simulated AEGIS EW environment) | Phase I report + Phase II roadmap |  

**Key Innovations**:  
- **"No-Trust" Fusion**: Never assumes sensor integrity without cryptographic/statistical proof.  
- **Adversarial Chaff Resistance**: Detects and ignores `def_shell_call` decoys via quantile crossing analysis.  

---

## **4. Commercial & Dual-Use Applications**  

### **Naval Use Cases**  
- **DDG(X) Tactical Decision Aids**: Counter-EW for shipboard CIC teams.  
- **Unmanned Swarm Resilience**: Recoverable autonomy under saturating ECM.  

### **Commercial Spin-offs**  
- **High-Risk Logistics**: Anti-jamming for autonomous cargo drones in contested airspace.  
- **Industrial IoT Security**: Spectral whitening for 5G sensor networks.  

---

## **5. Institutional Capacity, Facilities & Key Personnel**  
- **Requested Phase I Award**: **$250,000**  
- **Proposing Institution**: **Galaxy Science Institute (GSI)** / Galaxy Sports Edge LLC  
- **Key Personnel**:  
  - **Garrett Baxley** (Lead Investigator & Founder, Galaxy Science Institute) — Decision theory under non-stationary uncertainty, real-time combinatorial routing, and finite-sample distribution-free conformal calibration.  
  - **GSI Quantitative & Defense Systems Core** — Stochastic optimal control, Cholesky spectral decorrelation, and adversarial trajectory estimation.  
- **Core Verifiable Mathematical Framework**:  
  - **Sinkhorn-Knopp Conformal Optimal Transport**: GPU-accelerated mass-conserving entropy regularization ($\tau = 0.30 - 0.42$) preventing probability leakage under adversarial dropout.  
  - **Markovian State Transitions & Schrödinger Bridges**: Entropic interpolation establishing bounded kinetic risk trajectories under active ECM sensor disruption.  
  - **Finite-Sample TA-CQR**: Exact distribution-free marginal coverage ($\lceil (n+1)(1-\alpha) \rceil / n$) guaranteeing kinematic safety envelopes without parametric Gaussian assumptions.  
- **Computational Facilities & Infrastructure**:  
  - High-throughput dedicated simulation and neural-symbolic inference cluster running on Linux/Windows hybrid architecture with NVIDIA Tensor-core acceleration.  
  - Zero-dependency Apache-2.0 open research kernel (`galaxy-conformal-ot`) benchmarked on real-world continuous multi-agent collision streams and physiological telemetry with 100% test reproducibility.  

**Transition Path**: Phase II targets Naval Sea Systems Command (NAVSEA) and ONR tactical decision aid integration for shipboard and unmanned distributed surface/aerial platforms.  

---  
**Institutional Endorsement Block**  
*Submitted on behalf of Galaxy Science Institute (GSI) / Galaxy Sports Edge LLC by*:  
**Garrett Baxley**  
Lead Investigator & Founder, Galaxy Science Institute  
*Galaxy Science Institute R&D Office* | *Austin, TX*  

**END OF PROPOSAL**
