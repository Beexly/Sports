---
name: gse
description: Use when an agent needs Galaxy Sports Edge public proof, receipts, or methodology. Public surface only.
metadata:
  version: 0.1.0
---

# GSE public proof skill

Prototype. Not published. Public surface only.

Use this when an agent needs to read what Galaxy Sports Edge already serves in public: the proof ledger, settled receipts, receipt verification, methodology, and calibration status. Do not use it to fetch raw metrics, signals, methods, NGS, model internals, or anything behind a founder gate.

Publication defaults to an honest empty state when a metric is not substantiated. Do not invent a record when the ledger says none is published.

## When to use

- Verify a receipt hash the user already has.
- Read the public proof ledger or the settled-receipt list.
- Point a user at methodology, calibration, or data-rights pages.

## When not to use

- Pricing a pick, reading a signal, or asking for NGS, weather internals, or engine weights.
- Opening a pre-kickoff receipt. Those verify as SEALED. Do not try to recover the selection.

## How to fetch

Base: https://www.galaxysportsedge.com

No API key. Send a descriptive User-Agent. Read JSON. If a field is withheld, report the withheld state. Do not fill it.

| Need | Request |
|---|---|
| Ledger snapshot | GET /api/proof/ledger |
| Settled receipts | GET /api/proof/receipts |
| Verify one hash | GET /api/verify?hash=<64-hex> |
| Machine map | GET /llms.txt |
| Contract | GET /api/proof/openapi.json |

Detail and the pages that are human-readable only: references/public-surface.md

Checked live 2026-10-02: /api/proof/ledger and /api/proof/receipts?limit=1 both returned HTTP 200. The ledger said publication is on and substantiated seasons are 0. That empty state is the product, not a failed fetch.
