# CRC Knowledge-Integrity Wedge — Agent Handoff

**Path:** `artifacts/sheaf_integrity/`  
**Product name:** CRC (Certified Repair Class) / knowledge-integrity API  
**Status:** Path A technically complete. Commercial not started. Not merged into Beexly/Sports.

---

## 0. Image tasks (brief)

### Discrete curvature forms
| Form | Meaning | CRC use |
|------|---------|--------|
| Connection / holonomy curvature | $\kappa=\sum\varepsilon_e\theta_e\bmod 2\pi$ or $||\mathrm{Hol}-I||$ on cycles | **Structural** |
| Sheaf Dirichlet energy | $E=||\delta x||^2=\sum_e||x_t-R_e x_s||^2$ | **Statistical** |
| Forman / Ollivier Ricci | Metric graph curvature | Not used |
| Angular defect | Mesh vertex defect | Not used |

CRC uses **connection curvature** (maps) + **feature energy** (values) only.

### Characteristic classes in topology
Chern–Weil: invariant polynomials in curvature $\Omega$ → closed forms → cohomology classes (Chern, Pontryagin, Euler) independent of connection choice.  
Obstructions to bundle triviality; Gauss–Bonnet is the top Euler case.  
**CRC does not compute Chern classes.** Discrete stand-in is cycle holonomy + $\dim H^0$, not characteristic-class APIs.

---

## 1. What this is (one paragraph)

A classical multi-source consistency engine. Input: entities across systems with “should agree” maps and optional source-of-truth (SoT). Output: **repair_class** ∈ {consistent, statistical, structural, self_consistent_wrong_vs_ledger} plus gated proposals. The novel commercial claim is **coordinated false agreement** (systems agree with each other, disagree with ledger) without silent averaging.

---

## 2. Math core

```text
Stalks x_v ∈ R^d on nodes
Restriction maps R_e on edges (identity or SO(2) rotation R(θ))
δx|_e = x_t - R_e x_s
E = ||δx||² = xᵀ L x,  L = δ*δ
dim ker L = dim H⁰
Hol_γ = Π g_e  (or Σ θ mod 2π for SO(2))
```

| Signal | Class |
|--------|-------|
| E≈0, Hol trivial, sections exist | consistent |
| E>0, Hol trivial | statistical |
| Hol non-trivial | structural |
| Self E≈0 + mismatch vs SoT | self_consistent_wrong_vs_ledger |

Classical only. No path integral, no ⟨W⟩, no GNN training.

---

## 3. Code map

| Path | Role |
|------|------|
| `core/sheaf_core.py` | Coboundary, energy, basic sheaf ops |
| `core/crc.py` | CRC classify, EdgeMap, penrose fixtures, analyze_connection |
| `core/cohomology.py` | H⁰ / related |
| `core/cycle_space.py` | Cycle space / residuals |
| `core/surgery.py` | Minimal map edits |
| `core/repair_loop.py` | Gated realign/drop/relax |
| `core/ledger_policy.py` | Write-back default **refuse** |
| `core/product_modes.py` | entity_integrity, temporal_relative, ontology_hygiene, model_agreement |
| `core/ingest_multisource.py` | CSV → tables → CRC |
| `core/block_crc.py` | Fiedler partition → CRC per block |
| `core/holonomy_cheeger.py` | Fundamental-cycle holonomy + Cheeger diagnostic |
| `server/app.py` | FastAPI `/v1/consistency`, `/health` |
| `api/openapi.yaml` | OpenAPI contract |
| `demo.py` | One-command demo |
| `tests/test_crc_full.py` | Primary test suite |
| `benchmarks/public_schema_extract/*.csv` | Schema-real KYC-style fixture |
| `benchmarks/fraud_synthetic.py` | Synthetic relative-fraud bench |

---

## 4. How to run

```bash
cd artifacts/sheaf_integrity
python demo.py                  # entity integrity on sample CSVs
python demo.py --mode models
python demo.py --mode ontology
python demo.py --serve          # :8080
python tests/test_crc_full.py
```

CSV columns: `entity_id, system, <float features...>`  
SoT: designate a system name or separate file (`docs/NDA_EXTRACT_PROTOCOL.md`).

---

## 5. Product modes

| Mode | Purpose |
|------|--------|
| **entity_integrity** | Batch recon; Path A primary |
| **temporal_relative** | When relative fraud first appears |
| **ontology_hygiene** | Path B same-as glue check before GraphRAG |
| **model_agreement** | Multi-model feature agreement |
| **block_crc** | Scale-out partition then classify |

---

## 6. Decisions locked

| Decision | Choice |
|----------|--------|
| API-first vs consulting pilot | API-first |
| Claims | Mechanism + named fixtures only (no fraud-%) |
| Learned maps | Parked — YES + SoT held out required |
| Non-abelian maps | Parked — YES + buyer need |
| GNN / GATv2 in CRC | **No** |
| SHACL engine in-repo | **No** — use external tools |
| Persistent homology product | **No** |
| Chern-class API | **No** |
| Merge into Beexly/Sports | Requires explicit founder YES |
| Ledger write-back | Default refuse without policy key |

See: `DECISIONS.md`, `research/NONABELIAN_LEARNED_PARK.md`, `research/LEARNED_MAPS_DECISION.md`.

---

## 7. Commercial

**Pitch:** Detect when systems agree with each other and still disagree with the ledger — refuse to “fix” by averaging.

**Buyers:** Fintech / KYC / recon / risk eng (primary); GraphRAG identity eng (secondary).

**Price hypothesis:** pilot $5k–$15k; API $1k–$5k/mo; annual $25k–$80k.

**Motion:** `python demo.py` → NDA CSV → report. Not free consulting.

---

## 8. Docs index

| Doc | Content |
|-----|--------|
| `WHAT_THIS_IS.md` | Product narrative |
| `STATUS.md` | Technical status + closed loops |
| `IP_WEDGE.md` | IP boundary |
| `docs/CRC_ONE_PAGER.md` | External short form |
| `docs/CURL_BUYER_PATHS.md` | Buyer curl paths |
| `docs/NDA_EXTRACT_PROTOCOL.md` | Real data intake |
| `research/CRC_S_ABELIAN_NOTE.md` | Paper draft abelian CRC-S |
| `research/SURGERY_VS_FES.md` | Surgery ≠ feedback edge set |
| `AGENT_HANDOFF.md` | This file |

---

## 9. Adjacent topics (do not productize)

GNN fraud, GATv2, GraphSAGE, GPR/ChebNet, Graph Transformers, SHACL/SPARQL engines, OWL reasoners, lattice gauge theory / Wilson ⟨W⟩, Chern–Weil characteristic classes, persistent homology, full mesh DEC.

**Complement only:** SHACL (schema) → ER (merge score) → CRC Path B (maps glue?) → GraphRAG retrieve.

---

## 10. What an agent should do next

1. **Do not** expand GNN/SHACL/PH/Chern surface into this folder.  
2. **Do not** claim production fraud metrics from fixtures.  
3. If coding: only fix bugs / harden demo / buyer CSV path.  
4. If commercial: Path A demo to fintech/ops engineer → NDA protocol.  
5. If paper: expand `research/CRC_S_ABELIAN_NOTE.md`.  
6. Sports/GSE merge: **stop** until explicit YES.

---

## 11. One-line truth

CRC = classical sheaf energy + connection holonomy + relative SoT class, with gated repairs — an integrity API, not a learned fraud model and not a topology textbook product.
