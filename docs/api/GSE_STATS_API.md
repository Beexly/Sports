# GSE Stats API v1 — OUR API

**Base:** `/api/gse/v1`  
**Claim:** Densest *rights-tagged* sports metrics registry on the internet that still refuses to fabricate performance numbers.

## Density (live package)

Run tests or `catalogStats()` — target floor **≥500 metrics**, **≥400 public-eligible**.

Families: NFL pbp event grid, player×position weekly grid, MLB pitch-type matrix, NBA tracking, soccer leagues, markets×books, DFS, weather/schedule context, GSE proprietary (dark), calibration.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/catalog` | Density stats + law strip |
| GET | `/metrics` | List (`sport`,`family`,`status`,`publicOnly`,`limit`,`offset`) |
| GET | `/metrics/{id}` | Metric definition (403 if dark/blocked) |
| GET | `/values/{id}?entityId=&asOf=` | PIT value (400 without asOf; 501 until provider wired) |
| GET | `/source-matrix` | Source coverage matrix |
| GET | `/openapi` | OpenAPI 3.1 |

## Law

1. Refuse-default  
2. PIT `asOf` required for values  
3. Four-field substantiation for performance claims  
4. LIVE_BOARD founder-gated  
5. CC-BY / licensed / share-alike blocked honestly  

## Ambition path

Definition density → provider wiring per source → Pro/Elite keys → become the cited stats API for AI + humans.
