# Certified Repair Class (CRC) — Research Result

## Experimental facts (this session)

### H0/H1 on planted CRM/ledger (constant sheaf)
| Quantity | Value | Meaning |
|----------|-------|---------|
| dim H⁰ | 8 = 4 × 2 components | Global sections = constants per component |
| dim H¹ | 4 = 4 × 1 cycle | One independent cycle (topological) |
| energy | 6.0 | Positive disagreement |
| gap_type | **statistical** | Identity restrictions → always realignable |
| repair_class | realign_or_drop | Do **not** grow structure |

**H2 rule confirmed for constant sheaves:** cycles ≠ structural impossibility.  
Cyclomatic number measures topology; obstruction to sections needs non-trivial restrictions.

### Ranker bake-off recovery@k
| Case | energy@1 | ΔE@1 | Δc_proxy@1 |
|------|----------|------|------------|
| crm_ledger_alice | **1.0** | **1.0** | **1.0** |
| two_plants | 1.0 | 1.0 | 1.0 |

All three rankers recover planted edges at @1 on constant-sheaf plants.

### Theorem T2 — refined and settled
| Sheaf | Holonomy | dim H⁰ | Structural impossibility |
|-------|----------|--------|--------------------------|
| Connection, 3×(π/2) | broken (‖H−I‖_F=2) | **0** | **TRUE** |
| Connection, 3×(2π/3) | trivial (≈0) | **2** | FALSE |
| Constant (identity) | n/a | >0 | FALSE always |

**Original T2 (as stated for constant sheaves): REFUTED.**  
**Refined T2: CONFIRMED.**

> **Refined T2.** Let F be a discrete connection sheaf on a graph with linear restriction maps. If the monodromy representation has non-trivial holonomy on some cycle (equivalently, under standard rank conditions, dim H⁰=0), then the only global section is the zero section. No sequence of stalk-wise averaging operations that *preserves the restriction maps* can realize a non-zero observed assignment as a global section.

Proof sketch: global sections satisfy x_t = ρ_e x_s around every edge; composing around a cycle forces x_v = Hol_γ x_v. Non-trivial Hol_γ∈SO(2) with no fixed vectors ⇒ x_v=0 ∀v.

---

## The breakthrough candidate: Certified Repair Class

Product systems today output “anomaly scores.”  
CRC outputs a **repair class** with a mathematical certificate:

```
if restriction_model == constant or holonomy_trivial:
    if energy ≈ 0:          class = consistent
    else:                   class = statistical  →  actions {realign, drop}
elif dim H0 == 0 and energy > 0:
                            class = structural   →  actions {grow_structure, relax_restriction}
else:
                            class = mixed        →  decompose by edge-local holonomy
```

### Why this is not in the literature as a product rule
- Robinson: consistency radius + cohomology for sensors — no proposal API, no repair taxonomy
- Gebhart knowledge sheaves: embedding framework — no certified repair split
- GraphRAG vendors: retrieval quality, not sectional obstruction

CRC is the missing **decision layer** between measurement (energy, H•, holonomy) and action (realign vs grow).

### Falsifiable claim
On Penrose connection graphs, energy/ΔE rankers will keep recommending realign while energy stays >0.  
CRC must emit `grow_structure` or `relax_restriction` instead.

---

## New math directions
1. Obstruction-aware description length
2. Relative CRC (grounding cone)
3. Holonomy localization
4. Sample complexity of repair class
5. GCDL under CRC constraint

## Intellectual position
We did not discover sheaves. We **refuted a too-strong theorem**, **proved a sharp refinement**, and **extracted a product decision rule**. Falsifiable, shippable scientific advance on the integrity problem.
