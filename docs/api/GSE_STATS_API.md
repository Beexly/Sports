# GSE Stats API v1 — Our API

**Base:** `/api/gse/v1`  
**Product claim:** Densest *rights-tagged* sports metrics registry — not the densest pile of fabricated numbers.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/catalog` | Density stats + law strip |
| GET | `/metrics` | List metrics (`sport`, `family`, `status`, `publicOnly`) |
| GET | `/metrics/{id}` | Metric definition (403 if dark/blocked) |
| GET | `/coverage` | Source coverage matrix |
| GET | `/openapi` | OpenAPI 3.1 document |

## Law (compile-time)

1. Refuse-default — dark/blocked never emit values on public surface  
2. PIT `asOf` required when values ship  
3. Four-field substantiation for performance claims  
4. LIVE_BOARD founder-gated  
5. CC-BY attribution for nflverse; licensed odds never scraped  

## Density ambition

Generated families: NFL box/adv/NGS/context, MLB Statcast, NBA, NHL, market×book×market, fantasy projections, optical, calibration, college placeholders, proprietary GSE core.

Measure: `catalogStats().total` and `.publicApi` — ship more *checkable contracts*, not more lies.
