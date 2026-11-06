# Solutions #6–9: Non-goals — how we enforce them

| # | Non-goal | Enforcement |
|---|----------|-------------|
| 6 | GNN fraud product inside CRC | No torch/gnn in requirements; CI grep fails on import torch in core/ |
| 6b | Chern / PH / non-abelian without YES | No Chern/PH endpoints; NONABELIAN_LEARNED_PARK.md requires founder YES |
| 7 | Sports merge without founder YES | Separate repo Project-Tree; DECISIONS.md states no Sports merge |
| 8 | Autonomous company claims | repair_loop never write-back without policy_key |
| 9 | Success-fee on unverified fraud $ | Sales pack: mechanism + fixtures only; no % fraud claims |

```bash
! grep -R "import torch\|from torch" core/
! grep -R "chern\|persistent_homology" api/ server/
! grep -R "galaxysports\|Beexly/Sports" core/ api/
```
