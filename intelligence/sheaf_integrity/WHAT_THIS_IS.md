# What this is — CRC Knowledge-Integrity Wedge

## The invention (plain language)

A **consistency engine** that labels multi-source data with a repair class:

| Class | Meaning |
|-------|--------|
| **consistent** | Sources agree under the maps; nothing to fix |
| **statistical** | Maps OK; values drift — realign or drop weak links |
| **structural** | Maps themselves cannot glue (non-trivial holonomy) — do not average values |
| **self_consistent_wrong_vs_ledger** | Sources agree with *each other* and disagree with a system of record |

The last one is the rare asset: **coordinated false agreement**.  
Score models and most GNN fraud stacks do not name it cleanly. Value-diff alone confuses it with noise.

**Certified operators:** realign, drop_edge, relax_restriction — gated so structural gaps and relative fraud are never "fixed" by silent averaging. Ledger write-back requires an explicit policy key.

## How it works (one stack)

```text
multi-source records + optional SoT
        │
        ▼
sheaf on graph: stalks = features, edges = same-as / should-agree maps
        │
        ├─ energy ||δx||²        → statistical?
        ├─ dim H⁰ / ker L        → can anything glue?
        ├─ cycle holonomy        → structural?
        └─ compare to SoT        → relative fraud?
        │
        ▼
repair_class + proposals (gated) + optional temporal window
```

Classical only (no path integral, no ⟨W⟩).  
Theory backbone: cellular sheaf cohomology + discrete connection holonomy (Ambrose–Singer discrete echo). Product exposes invariants, not papers.

## How it sells

**Not** "buy our cohomology."  
**Yes** "curl this — get entities that are clean internally and wrong vs your ledger."

```bash
python demo.py                  # Path A entity integrity
python demo.py --mode models    # multi-model agreement
python demo.py --serve          # POST /v1/consistency
```

Sales motion: API-first fixture → buyer drops CSV under NDA → same ingest.  
No free pilot consulting. Claims = mechanism + named fixtures only (no fraud-%).

## Who it sells to

| Buyer | Pain | Mode |
|-------|------|------|
| Fintech / payments / KYC ops | Multi-system recon, silent wrong VIP flags | **entity_integrity** + temporal |
| GraphRAG / ontology platform eng | Bad same-as links pollute retrieval | **ontology_hygiene** |
| AI platform eng | Models agree with each other, wrong vs gold label | **model_agreement** |

Not: lattice QCD, pure math, sportsbook ROI theater.

## What is done (loops closed)

- CRC classify + relative fraud  
- Holonomy / Wilson on fundamental cycles  
- Gated repair loop + ledger policy refuse  
- CSV ingest (SoT external)  
- Product modes: entity, temporal, typed relations, models, ontology  
- Cheeger / Fiedler optional diagnostic (scale-out only)  
- OpenAPI + FastAPI + `demo.py` + STATUS + IP wedge docs  
- Theory survey closed: Hodge, DEC, LGT classical shadow, Chern–Weil, etc. — **no further product surface**

## Research still pending (optional, not blocking)

| Item | Why pending | Priority |
|------|-------------|----------|
| CRC-S writeup (abelian finite graphs) | Paper credibility | Low until buyer exists |
| Real NDA multi-source extract | Proves signal outside fixtures | **Only if commercial** |
| Block-CRC (partition then classify) | Scale when n huge | When a buyer graph needs it |
| Non-abelian maps (SO(d), d>2) | Rare relation types | Phase 2 + YES |
| Learned maps with SoT held out | Dangerous without protocol | Parked |

## What we are *not* inventing

Another GNN fraud scorer. Another Hodge-spectrum SaaS. Quantum gauge simulation. Sports merge without YES.

## Drive (next actions)

1. **Technical:** IDLE on CRC features — Path A complete.  
2. **Commercial (founder):** show `python demo.py` to one fintech/ops engineer.  
3. **If interest:** NDA CSV → same ingest → report.  
4. **If paper:** draft from `research/` + Penrose + relative separation.  
5. **If GSE/sports:** separate track; this folder stays out until explicit YES.

---

**One-line pitch:**  
*We detect when your systems agree with each other and still disagree with the ledger — and we refuse to "fix" that by averaging.*
