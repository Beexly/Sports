# Workflow Automation Coordinator

Implemented a governed workflow registry and run planner under `apps/web/lib/workflows`.

## Registered workflows

1. Daily Intelligence Brief
2. Picks Intelligence Workflow
3. Market Intelligence Workflow
4. Settlement Workflow
5. Calibration Workflow
6. Historical Intelligence Workflow
7. Content Workflow
8. Revenue Workflow
9. Support/Trust Workflow
10. Memory Workflow
11. Claude Handoff Workflow
12. Source Intelligence Workflow
13. Airwave / Pundit Claim Workflow
14. Film Room Workflow

## Safety

Workflow gates block publish/send/spend/deploy/scrape/public-enable/model-weight changes. Protected-source and unsettled-season events block run plans.
