# AWS Local App Blueprints

Updated: 2026-07-03

These are app ideas that can be built locally before any AWS account action.

## Blueprint Matrix

| App | User | AWS learning leverage | Local data | First artifact | No-spend rule |
| --- | --- | --- | --- | --- | --- |
| FABLE Evidence Cockpit | reviewer, partner, owner | Well-Architected, CloudWatch-style metrics | checked-in evidence JSON and docs | static route or report | no cloud API calls |
| AWS Cost Sentinel | owner | Budgets, Cost Explorer, Cost Anomaly concepts | service scorecard and cost notes | cost-risk dashboard spec | no billing API calls |
| Agent Firebreak Lab | agent developer | Bedrock/AgentCore governance | fake tools and transcripts | refusal transcript | no model calls |
| Micro-Edge Factory Board | analyst | SageMaker/Monitor concepts | local fixtures | candidate board | no hosted training |
| Clean Rooms Partner Demo | partner lead | Clean Rooms analysis rules | synthetic schemas | allowed/disallowed query viewer | no partner data |
| Source Freshness Monitor | analyst | CloudWatch metrics concepts | public-safe fixture timestamps | freshness report | no scraping restricted sources |

## Dashboard Panels

- evidence status.
- source rights.
- AWS service decisions.
- learning-to-repo actions.
- cost gate status.
- agent blocked tools.
- micro-edge candidates.
- rejected ideas.
- next owner decisions.

## Build Order

1. report-only static docs.
2. local JSON fixtures.
3. local validation command.
4. optional app route after current dirty app work is resolved.
5. no live AWS surface until owner approval.

## App Boundary

Do not build a public route from private learning proof. Public pages can read approved docs, public-safe examples, and fixture outputs only.
