# Ranking Power Control Plane + conformal bridge

**Modules**
- `apps/web/lib/calibration/ranking-power-control.ts` — RPCP SoT
- `apps/web/lib/calibration/rpcp-conformal-bridge.ts` — offline bridge (flags OFF)
- Wired: `proven-path-seed` → `public-surface-truth.rankingPower` + `rpcpConformalBridge`

## RPCP residual labels

| primaryBottleneck | Meaning | Agent action |
|-------------------|---------|--------------|
| `missing_independent` | trueProb coverage < 35% | Expand Kalshi/FPI/Elo/DC maps; soft-fail null > invent |
| `dead_groups` | significance-dead sport\|market | Pause list; selective keep set |
| `selective_needed` | δ filter lifts RES | Founder review selective runtime |
| `ranking_dead` | best score + pause + δ barely moves RES | Features/models — **not maps** |
| `path_viable` | projected RES useful | Accumulate GREEN streak; still no AUTO_PUBLISH auto |

## Polarity law

Bake-off kinds: `confidence | independent_trueProb | blend_indep_conf | marketFairProb`  
**Never** edge / edgeScore as p.  
`pIndependent` = raw trueProb only (`proven-path-rows`).

## Conformal bridge

- Default **offline** (`RPCP_CONFORMAL_BRIDGE_COMPUTE` unset).
- When compute ON: residual threshold + Mondrian widths attached to residual attribution.
- **Does not** set `CONFORMAL_ABSTAIN_ENABLED`, maps, or AUTO_PUBLISH.
- Coverage **never** unlocks PROVEN or raises RES.

## Maps gate

`mapsApplyGateOpen` only when live RES ≥ 0.02. Still requires floors + GREEN×K + founder policy before apply.

## Founder

1. Redeploy main after merge.
2. Open ops truth → read `rankingPower.operatorHint` + `residualOperatorHint`.
3. Optional research: set `RPCP_CONFORMAL_BRIDGE_COMPUTE=true` on a non-prod preview only.
