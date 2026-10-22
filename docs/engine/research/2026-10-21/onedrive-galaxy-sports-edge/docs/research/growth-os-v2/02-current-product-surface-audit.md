# Current Product Surface Audit

As of: 2026-06-09

## Scope Reality

The requested workspace does not expose a complete application source tree. The available evidence is a control/docs lane with prior research and reports. The only app directories visible in the scan were `apps/web/app/api/nflverse/birthday-usage-trend`, `apps/web/lib/nflverse`, and `apps/web/__tests__`, with no files returned by the app file scan.

## Surface Ledger

| Surface | Current State | Purpose | Monetization | Engagement | Retention | Trust | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| workspace-root | control/docs lane | No complete app source tree visible; Git resolves to user profile root. | MEDIUM | MEDIUM | MEDIUM | MEDIUM | defer |
| apps/web/app/api/nflverse/birthday-usage-trend | api route directory only | Directory exists but no files in this workspace scan. | MEDIUM | MEDIUM | MEDIUM | MEDIUM | verify in real clone |
| GSE Rating | planned intelligence surface | Mentioned in mission context and prior docs, not source-verified here. | HIGH | HIGH | MEDIUM | HIGH | expand after source verification |
| Player Lab | planned intelligence surface | Mentioned in mission context and prior docs, not source-verified here. | HIGH | HIGH | MEDIUM | MEDIUM | expand after source verification |
| Track Record / receipts | trust surface | Existing build concepts include weekly track-record email and trust explainers. | HIGH | HIGH | MEDIUM | HIGH | extend |
| Promotions / partner tab | planned monetization surface | Prior build coverage includes affiliate/creator pipeline, Dub link plan, and partner opportunity board; no live promotions present. | HIGH | MEDIUM | MEDIUM | HIGH | extend with compliance |
| Support / help | support surface | Prior cards cover Chatwoot inbox, support KB, support copilot, support-to-build-card flow. | MEDIUM | MEDIUM | HIGH | HIGH | extend |
| Newsletter / Daily Brief | lifecycle surface | Prior cards cover listmonk free newsletter, GSE Daily Brief, alerts, winback. | HIGH | HIGH | HIGH | MEDIUM | extend |
| Founder cockpit | internal surface | Prior cards cover weekly founder cockpit digest and founder-only method brain. | MEDIUM | MEDIUM | HIGH | HIGH | extend |
| Analytics/events | internal/product surface | Prior packets cover PostHog baseline, event taxonomy, funnels, attribution. | HIGH | MEDIUM | HIGH | HIGH | extend |

## Recommended Product-Surface Rule

All implementation packets must start by verifying the real GSE shipping clone. In this workspace, product surfaces are treated as planned or research-derived unless app files prove otherwise.
