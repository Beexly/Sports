# Final Decision Matrix

As of: 2026-06-09

| Repo | Final category | Adoption mode | Value to GSE | Speed to deploy | Integration surface | Maintenance comfort | Legal comfort | Security comfort | Cost savings | Revenue upside | Founder leverage | Customer value | Strategic differentiation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Open WebUI | P1 - Strong, but validate first | Use directly but isolated | 8 | 7 | 8 | 4 | 5 | 5 | 8 | 7 | 9 | 6 | 9 | HIGH for public/white-label/product use; MEDIUM for internal as-is use. |
| Twenty | P1 - Strong, but validate first | Use as internal-only tool | 9 | 5 | 9 | 5 | 5 | 5 | 8 | 9 | 9 | 4 | 8 | HIGH if modified or public network service; acceptable only as isolated internal tool with review. |
| Hoppscotch | P0 - Use or prototype immediately | Use directly as self-hosted service | 8 | 7 | 9 | 3 | 7 | 7 | 7 | 6 | 8 | 5 | 8 | LOW for internal use; MEDIUM for Enterprise boundary uncertainty. |
| Cap | P1 - Strong, but validate first | Use directly but isolated | 8 | 6 | 7 | 4 | 5 | 5 | 7 | 8 | 8 | 7 | 7 | HIGH for public embedding/forking; MEDIUM for isolated internal use. |
| Chatwoot | P1 - Strong, but validate first | Use directly but isolated | 9 | 5 | 8 | 5 | 6 | 6 | 8 | 9 | 8 | 9 | 8 | LOW for MIT community use; MEDIUM for enterprise feature boundaries. |
| listmonk | P0 - Use or prototype immediately | Use directly but isolated | 9 | 8 | 8 | 3 | 6 | 6 | 9 | 9 | 8 | 8 | 8 | HIGH if modified as network service; MEDIUM for isolated internal use without code changes. |
| Penpot | P1 - Strong, but validate first | Use as internal-only tool | 8 | 5 | 7 | 5 | 7 | 7 | 7 | 6 | 8 | 4 | 8 | MEDIUM-LOW; MPL file-level obligations if modifying covered files. |
| AnythingLLM | P0 - Use or prototype immediately | Use directly but isolated | 10 | 7 | 8 | 4 | 6 | 6 | 8 | 9 | 10 | 8 | 10 | LOW for code license; MEDIUM for data-leakage/product exposure risk. |

## Ranking

P0: AnythingLLM, Hoppscotch, listmonk.

P1: Chatwoot, Twenty, Cap, Penpot, Open WebUI.

P2: none from this batch, because all eight have meaningful value.

P3: use Open WebUI public/product-facing patterns only unless branding/license questions are settled.

NO-GO: no full-stack public deployment, no code copying, no live production data connection in this phase.
