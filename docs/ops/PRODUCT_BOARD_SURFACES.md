# Product board surfaces — STATKING / HELM / PICKPILOT / CLUBHOUSE

**SoT code:** `apps/web/lib/product/board-surfaces.ts`  
**Ops:** `GET /api/ops/public-surface-truth` → `productBoards`

| Id | Status | rankingP | Notes |
|----|--------|----------|-------|
| STATKING | dark_by_law (default) | n/a | `/stats/*` — STATS_PUBLIC + rights before marketing live data |
| HELM | design_preview | n/a | `design-preview/helm-homepage.html` only |
| PICKPILOT | design_preview | n/a | Retired brand → GSE; pickpilot-*.html archive |
| CLUBHOUSE | scene_chrome | n/a | Fantasy Nova scene, not a product |
| GSE_BOARD | live_gated | **required** | `/board` when LIVE_BOARD opens |
| GSE_PICKS | live_gated | **required** | `/picks` + `/api/picks` |
| GSE_COCKPIT | live_public | **required** | Operator always-on |

## Law

- Do not market design-preview as live product.
- Do not flip STATS_PUBLIC without rights memo.
- rankingP sort is required on GSE board/picks/cockpit code paths (already wired).
- Dark reasons: `rights_incomplete`, `design_preview` in `lib/public/dark-reason.ts`.
