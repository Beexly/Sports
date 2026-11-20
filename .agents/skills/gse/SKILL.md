---
name: gse
description: Read Galaxy Sports Edge public proof, settled ledger, receipt verification, and methodology endpoints (public surface only).
---

# GSE public proof skill

Read-only guide for querying public proof endpoints served by Galaxy Sports Edge (`https://www.galaxysportsedge.com`). Never use this skill to fetch gated picks, raw model internals, NGS metrics, or unsealed selections (`SEALED` pre-kickoff commitments must never be guessed or decoded).

## Public Endpoints
| Purpose | Endpoint |
|---|---|
| Public record page | `GET /record` (`apps/web/lib/ledger/public-record.ts`) |
| Ledger JSON snapshot | `GET /api/proof/ledger` |
| Settled receipts | `GET /api/proof/receipts` |
| Verify commitment hash | `GET /api/verify?hash=<64-hex>` |
| Machine map & OpenAPI | `GET /llms.txt`, `GET /api/proof/openapi.json` |

## Rules & Completion Criteria
- Report exact live payload fields or withheld/locked states (`53/200` CLV gate locks win-rate `%` until `200` settled CLV-backed plays); never fabricate missing counts or extrapolate sealed picks.
- Done when requested public endpoint/route is read verbatim with accurate withheld/gate context.
