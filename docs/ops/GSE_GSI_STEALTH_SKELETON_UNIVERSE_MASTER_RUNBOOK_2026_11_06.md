# GSE + GSI + `stealth-skeleton` Universe Master Baseline & Step-by-Step Runbook

**Date:** 2026-11-06  
**Baseline Status:** Verified on Windows Host & `origin/main` + `muse/formal-verification-and-ns32-2026-11-06`  
**Official Season Ledger of Record:** `47-19-1` (`71.2%`, `+24.92u` | Base Card `38-13-1`, `+22.85u` — Note: the legacy `47-19-1` Nov 5 batch is voided per standing doctrine and is never cited as a standing record)

---

## 1. Visual Architecture of the Four Interlocking Universes

```mermaid
flowchart TD
    subgraph U1["UNIVERSE 1: GSE (Galaxy Sports Edge — Consumer & Syndicate Sports Intelligence)"]
        S0["Stage 0: Roster & Injury Allowlist\n(Sleeper + ESPN + nflverse injuries_2026.csv)"]
        S1["Stage 1: Coaching, Film, FTN Charting, Weather & Rest\n(PROE+, DC Pressure, 11-Layer Matchup Ranks, player_gp)"]
        S2["Stage 2: SITUATIONAL REASONING FIRST\n80-Rule Firewall + 5,620-Node Cognitive Router +\n721 openai/math Operators + NS32 Spectral Kernel"]
        S3["Stage 3: Full-Game Snap-by-Snap JEV (~typesafe/jev-latest)\n10,000 Worlds x 175 Snaps = 1,750,000 Snaps + Sinkhorn OT"]
        S4["Stage 4: Barber Weighted Conformal Prediction +\nFrisch-Waugh-Lovell Market Residualization"]
        S5["Stage 5: Class B Shin De-Vig & 19-Rule doctrine.py Gate\n(PASS Discipline + GSE-LiveBench Leakage-Free Lock)"]
        S0 --> S1 --> S2 --> S3 --> S4 --> S5
    end

    subgraph U2["UNIVERSE 2: GSI (Galaxy Sports Institute — Sports Medicine, Neuro-Biomechanics & $20M+ Non-Dilutive Pipeline)"]
        G1["Bare-Metal 256 KB STM32H7 C++20 Kernel\n(20,769 / 262,144 B SRAM, <85 us WCET, 10/10 C++ Tests)"]
        G2["Theorem 4 Non-Invasive ICP & TBI Phase-Transition Detector\n(0.8545 MIMIC-IV Sepsis AUC, 7.08h Lead Time, 45/45 Pytest)"]
        G3["Theorems 10, 11, 12 USPTO Provisional Patent ($65)\n(Completes Abandoned Manwaring US 9,895,070 B2 + Guardian Cap)"]
        G4["Federal OTA & Grant Pipeline ($20M+ Target)\nARPA-H ($9.3M) + DoD MTEC ($7.0M) + NIH ($3.7M) + DARPA ERIS ($2.5M) + HCB 501(c)(3)"]
        G1 --> G2 --> G3 --> G4
    end

    subgraph U3["UNIVERSE 3: LLM stealth-skeleton (OpenRouter v2.4 Provider & Crowd-RLHF Flywheel)"]
        L1["OpenRouter v2.4 Provider Gateway\n(/api/openrouter-provider/models & workers/stealth-skeleton-provider)"]
        L2["Phase A: gse/stealth-skeleton-alpha\n(is_free: true, declared_zdr: false, Auto Exacto Grammar Healer)"]
        L3["3-Class Crown IP Firewall (PUBLIC / INTERNAL / CROWN)\n+ CROWD_RLHF_QUEUE DPO/GRPO Compiler"]
        L4["Phase B: Sovereign gse/skeleton-v1 & gse/skeleton-v1-fast\n($1.50/M Input, $6.00/M Output, $0.30/M Cache Read, ZDR: true)"]
        L1 --> L2 --> L3 --> L4
    end

    subgraph U4["UNIVERSE 4: Autonomous Fleet & Zero-Waste Compute Bus (workers/immortal-orchestrator)"]
        A1["Metamus Controller + Hermes JEV Daemon + Google Jules (v1alpha)"]
        A2["OpenDots (http://127.0.0.1:5173) + OpenBot + OpenTag + OpenMuse"]
        A3["Zero-Waste Credit Router: NVIDIA NIM (45 Free @ 40 RPM) +\nAlibaba DashScope + DeepInfra + RunPod FlashBoot + Google Vertex"]
        A4["PostHog $50k Grant Governor (Project 516325, 10% Sample)\n+ Pinecone 742 Hybrid Vectors + Sentry $5k Grant"]
        A1 --> A2 --> A3 --> A4
    end

    S2 <--> L3
    S2 <--> G2
    U4 --> U1
    U4 --> U2
    U4 --> U3
```

---

## 2. Step-by-Step Runbook: How to Run Every System in the Exact Sequenced Order

### A. Launch & Test the LLM `stealth-skeleton` Provider (OpenRouter v2.4 Spec)
1. **Run the OpenRouter v2.4 Schema & Exacto Verification Suite:**
   ```powershell
   npx tsx --test workers/stealth-skeleton-provider/src/__tests__/stealth-skeleton-provider.test.ts
   ```
2. **Query the Live Production Endpoints on `galaxysportsedge.com`:**
   - **OpenRouter v2.4 Model Catalog (`ModelDocumentV2`):**
     `GET https://www.galaxysportsedge.com/api/openrouter-provider/models`
   - **Legacy OpenAI Flat Model Catalog (`sst/opencode`, `Cline`, `Roo Code`):**
     `GET https://www.galaxysportsedge.com/api/openrouter-provider/models?format=legacy`
   - **Chat Completions (JSON & SSE Streaming + Auto Exacto Tool Calling):**
     `POST https://www.galaxysportsedge.com/api/openrouter-provider/chat/completions`
   - **MCP Server Tool Manifest (`@galaxysportsedge/stealth-skeleton-mcp`):**
     `GET https://www.galaxysportsedge.com/api/openrouter-provider/mcp/manifest`
3. **Optional Standalone Cloudflare Worker Deploy:**
   ```powershell
   cd workers/stealth-skeleton-provider
   npx wrangler deploy
   ```

### B. Run the Autonomous Fleet & `ImmortalControlAgent` (`workers/immortal-orchestrator`)
1. **Verify the 8-Node Autonomous Fleet & Situational-First State Machine:**
   ```powershell
   npx tsx --test workers/immortal-orchestrator/src/__tests__/immortal-orchestrator.test.ts
   ```
2. **Open the Visual Dashboards:**
   - **Production / Local Web Cockpit:** `https://www.galaxysportsedge.com/cockpit` (or `http://localhost:3000/cockpit`)
   - **Workflow Pipeline Visualizer:** `https://www.galaxysportsedge.com/cockpit/workflows`
   - **Autonomous Agent Status:** `https://www.galaxysportsedge.com/cockpit/agents`
   - **API Cost & Credit Stack Posture:** `https://www.galaxysportsedge.com/cockpit/api-costs`
   - **Intelligence & Growth Observatory:** `https://www.galaxysportsedge.com/intelligence/observatory`
   - **Local OpenDots Workspace:** `http://127.0.0.1:5173`

### C. Run the Pre-Simulation Verification Gates (ALWAYS Before Game Simulations)
1. **Run the 19-Rule `doctrine.py` Self-Check & 5/5 Numeric Proofs:**
   ```powershell
   python data/audits/doctrine_selfcheck.py
   python data/audits/doctrine_numeric_checks.py
   ```
2. **Run the Unit-Box Navier-Stokes 32-Seed Spectral Kernel Validation (4/4 Analytic Proofs):**
   ```powershell
   python data/audits/ns_kernel_validation.py
   ```
3. **Run the `GSE-LiveBench` Leakage-Free Evaluation Harness & 1,116 Textbook Reconciliation:**
   ```powershell
   python scripts/eval/gse_livebench_harness.py
   python scripts/ops/reconcile_1116_textbook_and_muse_audits.py
   ```
4. **Run the Full 360-Degree Pre-Projection & Situational-First Simulator Test Suite:**
   ```powershell
   python -m pytest tests/python tests/test_week9_forensic_autopsy_fixes.py -q
   ```
5. **Run All 36 Repository Guardrails:**
   ```powershell
   node scripts/guardrails/run-all.mjs
   ```
