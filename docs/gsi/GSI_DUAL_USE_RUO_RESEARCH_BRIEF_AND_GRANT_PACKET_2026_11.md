# GSI Dual-Use Research Use Only (RUO) Brief & Non-Dilutive Grant Packet (2026-11)

**Organization:** Galaxy Science Institute / Galaxy Sports Institute (GSI) -- Texas Domestic Nonprofit Corporation (SOS `#15043440630001`, IRS EIN `43-2804773`), dual-use research division paired with Galaxy Sports Network LLC / Galaxy Sports Edge (GSE).  
**Status:** Research Use Only (RUO) Computational Biology, Critical-Care Trajectory & Rotational Neuro-Biomechanics Infrastructure.  
**Capital Policy:** 0% equity dilution, $0 debt/loans, strict `HARD_REFUSE` on sportsbook CPA partnerships, zero unconfirmed grant promises or ROI claims.

---

## 1. Strict Dual-Use RUO Isolation Doctrine (ADR-0003)

GSI and GSE share a unified mathematical substrate -- distribution-free conformal uncertainty quantification, Sinkhorn-Knopp optimal transport, thermodynamic ergodic braiding, and non-stationary state-space filtering -- while enforcing **hard mathematical, architectural, and legal isolation** between clinical/translational RUO modules and commercial sports analytics:

1. **Zero Sports Weight (`0.0` Hard-Pinned Across Every GSI Module):**
   - `CLINICAL_RUO_GTEX_SPORTS_WEIGHT = 0.0` (`src/gse_engine/science/wave38_gsi_gtex_transcriptomics_and_schrodinger_bridge_engine.py`)
   - `CLINICAL_RUO_HPA_SPORTS_WEIGHT = 0.0` (`src/gse_engine/science/wave39_gsi_hpa_proteomics_mrna_concordance_and_chronic_sofa_engine.py`)
   - `CLINICAL_RUO_REACTOME_UNIPROT_SPORTS_WEIGHT = 0.0` (`src/gse_engine/science/wave41_gsi_reactome_pathway_uniprot_stokes_einstein_and_icu_los_engine.py`)
   - `CLINICAL_RUO_ALPHAFOLD_INTERPRO_SPORTS_WEIGHT = 0.0` (`src/gse_engine/science/wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory_engine.py`)
   - `CLINICAL_RUO_DARK_BRIDGE_SPORTS_WEIGHT = 0.0` (`src/gse_engine/workflows/dark_intelligence_activation_bridge.py`)
2. **Rule-In-Only & Anti-Diagnostic Guardrail (`gsi_translational_bridge.py`):**
   - `rule_in_only_doctrine = True` is enforced on every `BiomarkerStructuralProfile` instance; diagnostic, prescription, or return-to-play clearance phrasing raises `ValueError` at runtime.
3. **Zero-Odds Clinical & RLVR Purity:**
   - `412` verified zero-odds RLVR training trajectories (`scripts/ops/run_overnight_w1_to_w11_simulation_battery.py`) pass automated verifier checks with `zero_odds_contamination: True`, keeping `brain/mind.jsonl` single-writer isolated.

---

## 2. Verified MIMIC-IV & 5-Database Translational Biology Pipeline

All metrics below are reproducible on checked-in repository code and benchmark outputs (retrospective MIMIC-III figures from legacy notes remain explicitly quarantined and are excluded from prospective claims):

### 2.1 Critical-Care Physiological Trajectory Benchmarks (MIMIC-IV)
| Benchmark / Engine | Dataset & Design | Measured Result | Reference Module / Report |
|---|---|---|---|
| **Wave 42 Dynamic Trajectory SOFA + Chronic Elixhauser Mortality** | `140` MIMIC-IV ICU stays (`20` mortalities); strict chronological GCS-Motor, MAP, RR, pulse-pressure features + pre-existing comorbidities | **AUROC `0.8050`** (vs Wave 39 `0.7883`, Wave 37 `0.7562`); calibrated **Brier `0.0939`** (vs base `0.1224`) | `src/gse_engine/science/wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory_engine.py` |
| **Wave 41 First-24h Prolonged ICU LOS (`>= 4.0d`) Triage** | `140` MIMIC-IV ICU stays (`41` prolonged, prevalence `0.2929`); strictly causal `[-2h, +24h]` vitals & admission acuity | **AUROC `0.7480`**; calibrated **Brier `0.1716`** (vs base `0.2071`) | `src/gse_engine/science/wave41_gsi_reactome_pathway_uniprot_stokes_einstein_and_icu_los_engine.py` |
| **GSI v3.0 Unified (Conformal-OT + Quantum TDA + TEB Braid)** | Real MIMIC-IV cohort (`N=138`, `38` positive); survivor-calibrated `D_cal -> D_test` split, zero label leakage | Full-stay **AUROC `0.8545`** (`[0.778, 0.922]`), 24h **`0.8387`**, 12h **`0.8118`**, 6h **`0.7368`**; **`7.08h`** mean lead time prior to `MAP < 65 mmHg` | `docs/engine/research/2026-11-04/GSI-WP-05-V2-MIMIC-IV-RESULTS.md` |

### 2.2 Five-Database Molecular & Structural Biology Stack (Waves 38-42)
Across the 9-12 canonical neuro-cardiac and musculoskeletal tissue markers (`TNNI3`, `CKM`, `GFAP`, `NEFL`, `MAPT`, `ACTN3`, `COL1A1`, `COL5A1`, `PPARGC1A`, `TPM1`):
1. **AlphaFold DB v6 & InterPro (Wave 42):** Quantifies residue-level pLDDT structural confidence, PAE rigid domains, and intrinsically disordered region (`<50` pLDDT) proteolytic half-life separation (globular `CKM` `94.81` pLDDT vs disordered `MAPT` `49.22` pLDDT).
2. **Human Protein Atlas / HPA (Wave 39):** Joins IHC staining and organelle localization with sarcolemmal and neurovascular membrane leakage ODEs separating myocardial `TNNI3` and astrocytic `GFAP` from exertional `CKM`.
3. **GTEx v10 (Wave 38):** Evaluates 54-tissue GENCODE v39 RNA selectivity (`ACTN3` skeletal vs LV `>2000x`, `TNNI3` cardiac `>900x`, `MAPT` cortical/cerebellar `>350x`) coupled with a 5-state Sinkhorn-Knopp Schrodinger Bridge recovery operator (`l1` marginal divergence `< 1e-9`).
4. **Reactome v98 (Wave 41):** Over-representation enrichment across `178` Homo sapiens pathways (`0` unmapped identifiers across 12 canonical markers, including `R-HSA-9854907`, `R-HSA-1234158`, `R-HSA-1566977`, `R-HSA-390522`).
5. **UniProtKB / Swiss-Prot (Wave 41):** Computes physiological Stokes-Einstein plasma capillary diffusivity at `310.15 K` (`1.2e-3 Pa*s`) ordered monotonically by molecular mass from `24,008 Da` (`TNNI3`) to `183,560 Da` (`COL5A1`).

### 2.3 Conformal-OT & Standalone FastAPI Mathematical Sidecar (`gse-ml-service`)
- `packages/galaxy-conformal-ot/`: Distribution-free Split Conformal Quantile Regression (`SplitCQR`), one-sided pathological strain cone RFF Mahalanobis whitening, and multi-marginal Kantorovich optimal transport.
- `gse-ml-service`: CPU-only, stateless FastAPI sidecar exposing `GET /health`, `POST /predict/etkf` (exact square-root ensemble Kalman filter with MacKay moment-matching), and `POST /predict/tda` (persistent homology `H0`/`H1` persistence-image feature vectorization without `persim`), verified by 358 unit/API tests (`app/tests/`).

---

## 3. Non-Dilutive Grant Stack, NVIDIA Inception / DGX Cloud & Google Cloud Scale AI Brief

*(All numbers below reflect verified live credits and submitted/prepared applications tracked in `docs/ops/FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md`, `docs/ops/STARTUP-CREDITS-AND-GRANTS-EXECUTION-PACK-2026-11-06.md`, and `apps/web/lib/ops/credit-stack-posture.ts`. Applications are founder-executed; no unconfirmed award is ever claimed as secured.)*

| Track / Program | Verified Status | Stated Face Value / Ceiling | Concrete Technical Justification & Trap Avoidance |
|---|---|---|---|
| **Live Approved Credit Stack (9 Programs)** | **ACTIVE** | **`$55,618.33`** (`$55,656.31` incl. xAI) | PostHog (`$50,000` at 10% sampling), Sentry (`$5,000` at `0.1` traces), Pinecone (`$300`), Deepgram (`$200`), GCP (`$118.33`), AWS (`$137.15`), **NVIDIA Inception ACTIVE** (`#1086418431979798`), NVIDIA NIM (`40 RPM`), Google AI Ultra. |
| **Submitted Grant & Credit Pipeline (24 Apps)** | **SUBMITTED** | **`$256.5k`** (`$256,500`) | Submitted across startup/science grant programs tracked in `data/ops/funding_inventory_2026_11_06.json` (`submittedPipelineCount: 24`). |
| **NVIDIA Inception + DGX Cloud + AWS Activate** | **ACTIVE INCEPTION -> APPLYING** | **Up to `$100k` DGX Cloud + `$25k-$200k` AWS Activate Portfolio** | Attach active NVIDIA Inception Org ID to AWS Activate Portfolio (`Account 183295455211`, Bedrock `InvokeModel` ONLY, never AWS Marketplace) and DGX Cloud credit application for MIMIC-IV Conformal-OT / TDA scaling and zero-odds RLVR runs. |
| **Google DeepMind / Launchpad / Cloud Scale AI** | **SUBMITTED (DeepMind + Launchpad)** | **`$2k` Start -> `$200k` Scale -> up to `$350k` Scale AI (2-yr)** | Backed by verifiable live evidence URLs (`/llms.txt`, `/record`, `/case-studies/aws-governed-sports-intelligence`, `/parlay-mri`, `/api/health`) and scale-to-zero Cloud Run / Vertex AI / Pub/Sub burst architecture; strictly observe 31-day Workspace and anti-stacking rules. |
| **Federal Non-Dilutive R&D (MTEC / NSF SBIR / NIH NINDS / ARPA-H)** | **PACKET READY (Gated on SAM.gov UEI/CAGE)** | **`$305k` NSF Phase I; `$400k-$7.0M` NIH/MTEC/ARPA-H** | Sub-concussive rotational TBI (`BK-16..BK-22`), distribution-free conformal risk control, and MIMIC-IV ICU early-warning trajectories under strict `0.0` sports-weight RUO isolation. |

### Founder-Only Next Actions (Zero Autonomous Submission)
1. Confirm SAM.gov Entity Administrator UEI/CAGE status for federal SBIR/STTR/MTEC submissions.
2. Attach active NVIDIA Inception Org ID to AWS Activate Portfolio (`Account 183295455211`) and NVIDIA DGX Cloud burst request.
3. Track submitted Google DeepMind and Launchpad reviews using live verified evidence URLs prior to any Google Cloud Scale AI tier expansion.
4. Keep `CLINICAL_RUO_*_SPORTS_WEIGHT == 0.0` and `0% equity dilution` / `$0 debt` invariants enforced in CI on every commit.
