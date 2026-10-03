# AWS Model Router Design

Default:
- no live API calls
- no paid models
- no autonomous publishing
- no restricted-source retrieval

Gate design:
- `FABLE_MODEL_ROUTER_ENABLED=false`
- `FABLE_AWS_ALLOW_EXPERIMENTS=false`
- `FABLE_AWS_ALLOW_PAID_RESOURCES=false`
- `FABLE_AWS_MAX_MONTHLY_COST_USD=0`

Routing order:
1. deterministic validator
2. local fixture evaluator
3. manually approved non-AWS model
4. manually approved AWS model

Model class policy:
- deterministic validators handle claim scanning, gate evaluation, and schema checks first.
- local fixtures handle forensic and replay demos.
- non-AWS model use requires owner approval and logged cost expectations.
- AWS model use requires owner approval, cost ceiling, model-selection rationale, and eval pass.
- Bedrock/AgentCore is a governance candidate, not proof of model performance.

Logging:
- prompt id
- evidence id
- source ids
- no secrets
- output hash
- evaluator result
- cost estimate
- evidence ladder classification

Rejection rules:
- gambling guarantee language
- unsupported source retrieval
- missing evidence id for high-risk claim
- missing cost cap
- missing human approval for write, publish, deploy, paid call, or live data
