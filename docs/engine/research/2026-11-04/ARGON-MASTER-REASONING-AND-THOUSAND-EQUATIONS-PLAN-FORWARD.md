# ARGON MASTER REASONING & THOUSAND-EQUATIONS FORWARD PLAN
**Galaxy Sports Edge LLC (`Beexly/Sports`)**  
**Date:** 2026-11-04  
**Target Agent:** Argon (`opencode` / `hermes` / `claude-code`)  
**Baseline Commit:** `a53d8910c` on `origin/hermes/overnight-2026-11-03-corpus`  
**System Status:** Database `9 OK, 0 WARN, 0 CRIT` (100% clean) | Guardrails `35/35 PASSED` | Verified Record `38-13-1 (+22.85u, 74.5%)` / `47-19-1 (+24.92u)`  

---

## 1. THE FOUNDER'S ARCHITECTURAL MANDATE

> *"WHY ARE WE RUNNING THE JEV SIMULATION BEFORE WE LOOK AT THE SITUATIONAL IMPACT??? THAT MAKES ZERO SENSE TO ME, IF THE SITUATIONAL IMPACT AFFECTS THE OUTCOME THEN WHY WOULD WE SIMULATE ON HALF ASS INFO? FIX THIS... I want them to review everything but especially look over how our engine is reasoning — what equations, what gates, what situational edges. You listed 6 feature families and 80 rules... BUT WE SHOULD HAVE THOUSANDS!!!!!"*  
> — **Garrett, 2026-11-04**

### What Landed Today (`a53d8910c`):
We eliminated the legacy defect where the simulation ran before situational evaluation. The 5-stage pipeline has been re-sequenced to **Situational-First**:

```
[Stage 1: Coaching, Film & Active Injuries]
Tendencies, Charted Placement, Injuries, Weather, Travel/Rest
                         │
                         ▼
[Stage 2: Master Situational Reasoning & Cognitive Router] (SITUATIONAL FIRST)
• Evaluates 6 feature families (pressure, weather, restFatigue, coverage, qbSkill, microstructure)
• Runs 80-rule misleading-stat firewall
• Runs spectral cluster orthogonalization & James-Stein shrinkage
• OUTPUTS: Situational transition tensors, weather pass-rate penalties, 
  trench pressure hazards, second-half fatigue decay
                         │
                         ▼
[Stage 3: Full-Game Snap-by-Snap JEV Simulation & 10k Trajectory Engine] (SITUATIONAL-CONDITIONED)
• Every snap (Q1 15:00 → Q4 0:00) simulated through jevkit.client.ask()
• Transition probabilities directly conditioned on the Stage 2 situational priors
• Trajectory vectors generated using Sinkhorn-Knopp optimal transport
                         │
                         ▼
[Stage 4: Conformal Calibration, Distribution Whitening & Covariance Residualization]
• Barber weighted conformal prediction
• FWL market residualization on the simulated distributions
• Mapped to dedicated market-specific calibration heads
                         │
                         ▼
[Stage 5: Class B Market De-Vig & Conjunction Gate] (PASS Discipline)
• Compare post-simulation true probability p* against de-vigged market
• Fails tickets without genuine edge to PASS (publishAllowed: false)
• Outputs honest XX/100 conviction ratings
```

---

## 2. ARGON'S CORE MISSION: THE "THOUSANDS" REASONING EXPANSION

Our current routing groups features into **6 families** and **80 rules** (`x-situational-80-rules.ts`). That is a functioning scaffolding, but **our mind corpus contains thousands of rigorous equations, theories, empirical laws, and situational dynamics**. 

Argon's job is to create and execute the master plan to scale the reasoning engine from 80 rules to **thousands of live, active, situationally conditioned equations**.

### The Living Corpus Ready to be Activated:
1. **The 1,000-Valuable-Papers arXiv Program:** Statistical mechanics, game theory, conformal inference, non-parametric time series, Fokker-Planck drift diffusion, optimal transport.
2. **Goodfellow Deep Learning Corpus (Extracted 2026-11-04):** 14 chapters ingested into `data/research/books_and_repos_ingest_2026.jsonl` (energy-based models, graphical models, Monte Carlo sampling, partition functions, representation learning).
3. **Bojie Li AI-Infra-Book (Extracted 2026-11-04):** 14 chapters covering tensor parallelism, GPU kernel scheduling, high-throughput batching, and KV-cache state preservation.
4. **GSI Scientific Skills Catalog:** 177 scientific skills registered in `data/research/gsi_scientific_skills_catalog_2026.json`.
5. **Auto-Ontology Graph (`NVIDIA/auto-ontology` + `turbovec`):** Mathematical knowledge graph linking concepts across domains.
6. **Coaching & Trench Physics Stack:** 
   - 4-level trench pocket physics (`intelligence/coaching/trench_pocket_physics.py`).
   - QB biomechanical kinetic translation (`intelligence/coaching/biomech_kinetic_translation.py`).
   - FTN charted ball placement (CTBL%, OPENTGT%, PKP%, DROP%).
   - Gemma 171 coach-speak emotional deflection probes.
   - Schrödinger bridge PBP benchmarks (`packages/galaxy-conformal-ot`).

---

## 3. MASTER PLAN WORKSTREAMS FOR ARGON

### Workstream 1: The Thousand-Equation Mathematical Taxonomy
Map and index the equations into an active matrix queryable by the 288-bit context mask:

```
Equation Matrix = [
  Category A: Fluid & Atmospheric Dynamics (Weather, Wind Vectors, Air Density, Grip Coefficient)
  Category B: Biomechanical & Kinetic Translation (Torque, Separation, Fatigue Hypoxia, Turf Shear)
  Category C: Trench Pressure & Pocket Physics (4-Level Trench Decay, Edge Bend, Anchor Strength)
  Category D: Information Theory & Entropy (Pre-snap Motion Attention, Disguise Disruption, Kullback-Leibler)
  Category E: Game Theory & Minimax Equilibrium (Sequence Penalty, Lag-1 Autocorrelation, Fourth-Down IRL)
  Category F: Behavioral, Incentive & Situational (Contract Thresholds, Revenge, Emotional Deflection)
  Category G: High-Dimensional Econometrics & Calibration (FWL, Barber Conformal, James-Stein, CSCV PBO)
]
```

#### Key Equations to Formalize:
- **Atmospheric Drag & Aerodynamic Trajectory:** $F_d = \frac{1}{2} \rho v^2 C_d A$ coupled with crosswind lateral deflection $\Delta x = \frac{F_{\text{wind}}}{m} \frac{t^2}{2}$ affecting deep-target catchable ball rates and field goal range degradation.
- **Biomechanical Fatigue & Oxygenation Decay:** Muscle glycogen depletion models $G(t) = G_0 e^{-k_{\text{pace}} t}$ modulated by Denver elevation altitude ($p_{O_2} = 0.83 \times \text{sea\_level}$) and short-week Thursday rest deficits.
- **Trench Pocket Collapse Wave Equation:** $P_{\text{collapse}}(t) = 1 - e^{-\int_0^t \lambda_{\text{trench}}(\tau) d\tau}$, where $\lambda_{\text{trench}}$ is modulated by offensive tackle injury drop-off and defensive coordinator blitz-disguise entropy.
- **Optimal Transport Sinkhorn Coupling:** $P^* = \text{diag}(u) K \text{diag}(v)$ where $K_{ij} = e^{-C_{ij}/\epsilon}$, reallocating 10,000 PBP trajectories based on situational cost matrices rather than naive normal noise.

### Workstream 2: Situational-First JEV Prompt & Matrix Coupling
Ensure that `jevkit.client.ask()` on every snap ($1..150+$) is explicitly seeded with the top-k situationally activated equations:
- **Snap State Vector:** `[qtr, clock, score_diff, down, ydstogo, yrdln, active_situational_mask, trench_pressure_prior, weather_degradation_factor, fatigue_decay_rate]`.
- **Dynamic Equation Dispatch:** Use the 288-bit context mask to select the 10–25 highest-relevance equations for that exact situation, feeding Jev their log-odds deltas so Jev reasons with deep physics and game theory rather than generic prose.

### Workstream 3: 360-Degree Board & Market Conjunction Gate
- Enforce the **`16-5` Official New Engine Record Doctrine** (`38-13-1` entering Week 9).
- Scan all 77 DraftKings market types per game (1Q–4Q, 1H/2H, Kicking, Defense/IDP, INTs, TDs, Props).
- Compare model situationally conditioned true probability $p^*$ against the de-vigged line.
- Enforce strict `PASS` discipline (`publishAllowed: false`) whenever edge does not clear the conjunction threshold.

---

## 4. CURRENT PRODUCTION FOUNDATION (WHAT IS ALREADY LIVE)

1. **Database:** Production Neon `summer-brook-99380762` (`gse-postgres`) reports **`9 OK, 0 WARN, 0 CRIT`**.
   - Zero schema drift, zero unknown columns, zero missing migrations.
   - `odds` analyzed (planner histograms refreshed across 9.1M rows).
   - `games` vacuumed (0% dead tuples).
   - Automated `pg_cron` jobs scheduled weekly: `weekly-vacuum-analyze` (Sundays 03:00 UTC) and `weekly-odds-analyze` (Sundays 04:00 UTC).
2. **Sentry for Startups:**
   - Org: `galaxy-sports-edge` ($5,000 credit grant active).
   - Sentry Seer zero-key GCP service account impersonation configured (`sentry-seer@galaxysportsedge.iam.gserviceaccount.com`).
   - Next.js Web runtime observability passing (16/16 Vitest).
   - Python `sentry_ai_tracer.py` with native `MCPIntegration` and OpenTelemetry GenAI span conventions passing (9/9 Pytest).
3. **Repository Guardrails:** All 35 guardrails pass in 65.1s (`node scripts/guardrails/run-all.mjs`).
4. **Active Worktree:** `C:\c\wt-week8-forensic` on branch `hermes/overnight-2026-11-03-corpus` (HEAD: `a53d8910c`, clean and pushed to `origin`).

---

## 5. ARGON INVOCATION COMMAND & EXECUTION DIRECTIVE

Launch Argon using:
```bash
# In C:\c\wt-week8-forensic (or target worktree):
claude --prompt "Review docs/engine/research/2026-11-04/ARGON-MASTER-REASONING-AND-THOUSAND-EQUATIONS-PLAN-FORWARD.md and build the master plan forward to scale our reasoning engine to thousands of live situational equations."
```

### Standing Operational Rules for Argon:
- **DIRECT-TO-MIND/ENGINE:** Nothing stays local. Every code change lands same-day on Beexly/Sports.
- **WIRE-FIRST SEQUENCING:** Research $\to$ Wire $\to$ Weight $\to$ Calibrate $\to$ Test $\to$ Polish.
- **SITUATIONAL-FIRST:** Never run simulations on baseline averages. Situational context must condition the game priors before and throughout the simulation.
- **NEVER HIDE CONFIDENCE:** Keep honest `XX/100` conviction ratings across all published markets.
- **HOSTILE SELF-AUDIT:** Run tests, definition-of-done, and all 35 guardrails before every commit.
