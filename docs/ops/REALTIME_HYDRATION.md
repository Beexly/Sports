# Real-time data hydration — max-quality GSE truth

**Code:** `packages/stats-api/src/hydration/*`  
**PIT:** `packages/stats-api/src/pit-validate.ts` · `packages/feature-store/src/pit-validate.ts`  
**Truth API:**  
- `GET /api/gse/v1/truth`  
- `POST /api/gse/v1/truth/edge`  
- `POST /api/gse/v1/truth/health`  

## The improvement over the sketch

The sketch had the right planes. Max quality GSE requires **three clocks**, not one:

| Clock | Meaning |
|-------|---------|
| `featureAsOf` | When cold features (box/model inputs) were frozen |
| `quoteAsOf` | When market q was observed |
| `decisionAsOf` | When we claim the edge |

**Honest edge:**
```
e = p(featureAsOf) − q(quoteAsOf)
```
with:
1. both asOf ≤ decisionAsOf  
2. `|quoteAsOf − featureAsOf| ≤ consistencyBudget` (default 15m)  
3. quote within **dynamic** market freshness (tighter near kickoff)  
4. feature within cold-plane budget  
5. p,q ∈ [0,1] finite  
6. refuse-default on any fail — **no fake edge**

## Planes (SoR vs projection)

| Plane | Real-time meaning | SoR? | Strategy |
|-------|-------------------|------|----------|
| Markets | minutes; tighter near KO | yes | cron_delta + hybrid |
| Weather | 15–30m | yes | TTL / read_repair |
| Box / advanced | post-slate / weekly | yes | batch → write_through |
| Edge / gate | on settle / gate event | yes | write_through |
| Optical | eval only | no (DARK) | on_demand |
| Cockpit UI | SoR delta stream | **no** | SSE iff LIVE_BOARD |

Optical dark = **score 100** when not pretending public. Cockpit offline when LIVE_BOARD off = correct, not a failure.

## Topology

```
[cron / webhook]
       ↓
  Prisma SoR  ──write_through──►  online memory (process → Redis later)
       ↓                                  ↓
  cold batch (stats)              GET /values?asOf=   (PIT selectLatestAsOf)
       ↓                                  ↓
  hot plane (odds + dynamic freshness)    computeDualAsOfEdge(p,q,asOfs)
       ↓                                  ↓
  optional SSE projection (LIVE_BOARD)    refuse if consistency/freshness fail
```

## Next hydrate force
1. Prisma PlayerGameStat → NflverseMemoryStore.put  
2. refresh-odds → cron_delta runner  
3. Session tier (Stripe) on value reads  
4. Redis when multi-instance  

## Measurement
`scoreTopologyHealth` → 0–100 + `readyForEdgeFire` + blockers.  
Use this in ops — not narrative “we’re live”.
