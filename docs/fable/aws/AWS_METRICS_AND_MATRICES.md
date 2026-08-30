# AWS Metrics And Matrices

Updated: 2026-07-03

These metrics are local-first. They measure whether the repo is becoming more AWS-literate without spending money.

## Learning Metrics

| Metric | Definition | Target posture |
| --- | --- | --- |
| learning_to_repo_action_rate | percent of learning items that produce a repo-safe artifact | increasing |
| public_safe_proof_rate | percent of learning evidence entries approved for public use | owner-controlled |
| no_secret_confirmation_rate | percent of entries confirming no secrets | 100 percent |
| no_paid_confirmation_rate | percent of entries confirming no paid resources | 100 percent |
| gse_relevance_coverage | percent of entries with a concrete GSE/FABLE tie | 100 percent |

## Architecture Metrics

| Metric | Definition | Target posture |
| --- | --- | --- |
| service_rows_with_rejection_criteria | AWS scorecard rows that state rejection criteria | 100 percent |
| service_rows_with_no_cost_spike | AWS scorecard rows with a no-cost path | high |
| owner_gate_coverage | future live actions with owner decision fields | 100 percent |
| local_before_cloud_ratio | local artifacts divided by live AWS proposals | high |
| unsupported_claim_count | scanner hits or ledger unsupported entries | decreasing only by evidence |

## Cost Metrics

| Metric | Definition | Target posture |
| --- | --- | --- |
| default_monthly_cap_usd | default AWS cap in local gates | 0 |
| paid_action_block_rate | paid actions blocked without approval | 100 percent |
| services_with_cost_driver_notes | service rows with likely billing dimensions | increasing |
| kill_switch_coverage | plans with a named stop path | 100 percent before live work |

## Security Metrics

| Metric | Definition | Target posture |
| --- | --- | --- |
| wildcard_policy_findings | fake or future IAM findings for broad permissions | zero before approval |
| secret_scan_pass_rate | secret guard pass rate | 100 percent |
| unknown_data_rights_blocks | storage or partner-share plans blocked by unknown rights | all blocked |
| public_surface_count | proposed public endpoints or hosted surfaces | zero until approved |
| agent_blocked_tool_coverage | sensitive agent tools blocked by default | 100 percent |

## Falsification Metrics

| Metric | Definition | Target posture |
| --- | --- | --- |
| candidate_kill_rule_coverage | edge candidates with explicit falsification rule | 100 percent |
| fixture_only_demo_count | demos that avoid live data and private data | high until legal gates |
| rejected_service_count | services rejected for clear reasons | healthy signal |
| assumption_to_evidence_lag | time from assumption to proof or downgrade | shrinking |

## Matrix Use

Use these metrics in reports, but do not claim they are currently collected unless a command or file proves collection. Until then they are operating definitions.
