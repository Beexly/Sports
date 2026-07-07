# FABLE AWS Evidence Layer

This folder records AWS research, fit decisions, cost/security gates, and zero-cost spike plans for the FABLE/NFL evidence layer.

Source posture:
- Official AWS docs and AWS pages checked on 2026-07-03.
- Repo state checked locally in `C:\Users\Garrett\Sports`.

Hard boundary:
- No deploy.
- No DNS.
- No secrets.
- No AWS account mutation.
- No paid dependency.
- No claim that AWS is already configured.

Official AWS references used:
- AWS Well-Architected pillars: https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html
- AWS Budgets: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
- AWS Cost Anomaly Detection: https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html
- IAM Access Analyzer policy validation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-validation.html
- Amplify Next.js SSR support: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- Amplify SSR deployment: https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html
- Bedrock AgentCore overview: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
- Bedrock AgentCore policy: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html
- Bedrock AgentCore pricing: https://aws.amazon.com/bedrock/agentcore/pricing/
- SageMaker Model Registry: https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html
- SageMaker Pipelines: https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines.html
- SageMaker Model Monitor: https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html
- SageMaker Clarify: https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-configure-processing-jobs.html
- AWS Clean Rooms overview: https://docs.aws.amazon.com/clean-rooms/latest/userguide/what-is.html
- AWS sports/NFL: https://aws.amazon.com/sports/nfl/

Second-level AWS docs:
- `AWS_PLUGIN_TO_REPO_CROSSWALK.md`
- `AWS_PLUGIN_GOVERNED_AUDIT.md`
- `AWS_SHOW_TEETH_STRATEGY.md`
- `AWS_OPERATING_INTELLIGENCE_MATRIX.md`
- `AWS_NO_COST_WORKFLOW_BLUEPRINTS.md`
- `AWS_AGENT_LAB_PLAYBOOK.md`
- `AWS_METRICS_AND_MATRICES.md`
- `AWS_FREE_LEARNING_OPERATING_SYSTEM.md`
- `AWS_INCUMBENT_PRESSURE_SYSTEM.md`
- `AWS_MICRO_EDGE_FACTORY.md`
- `AWS_LOCAL_DATA_FACTORY.md`
- `AWS_LOCAL_APP_BLUEPRINTS.md`
- `AWS_MACHINE_LADDER.md`
- `AWS_TECHNIQUE_LEDGER.md`
- `AWS_OPERATING_INTELLIGENCE_RUNBOOK.md`
- `fixtures/README.md`
- `fixtures/AWS_LOCAL_FIXTURE_LIBRARY.json`
- `governance-os/README.md`
- `governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json`
- `governance-os/guard-rules/fable-shadow-control.guard`
- `AWS_SERVICE_SCORECARD.md`
- `AWS_MODEL_LEVERAGE_MAP.md`
- `AWS_MODEL_ROUTER_DESIGN.md`
- `AWS_MODEL_EVALUATION_PLAN.md`
- `AGENTCORE_SECURITY_FIREBREAK.md`
- `AGENT_TOOL_PERMISSION_MATRIX.md`
- `AGENT_EVALUATION_RUBRICS.md`
- `sagemaker-adrs/`
- `amplify-adrs/`
- `clean-rooms-demo/`
