# Own Feed API — dominate without renting the product

## Surfaces

| Method | Path | Role |
|--------|------|------|
| GET | `/api/gse/v1/own` | Dominance snapshot + design space |
| GET | `/api/gse/v1/own/catalog` | First-party metric contracts |
| GET | `/api/gse/v1/own/provenance?metricId=` | Single contract |
| POST | `/api/gse/v1/own/values` | PIT value (`asOf` required) |
| GET | `/own-api` | Product UI |

## Planes

model · calibration · decision · archive · derived_stats · context · optical

## Law

- `oddsApiRequired=false`
- refuse-default without asOf / future leak
- LIVE_BOARD founder-gated
- no fabricated win-rate
- officials + contracts CONSUMED (CC-BY-4.0 attribution)

## Follow-ons

- Prisma `OwnFeatureRecord` durable SoR
- write_through from gate/cal/quote jobs
- multi-instance Redis online store when proven needed
