# AWS Model Leverage Map

Official references checked on 2026-07-03:
- Amazon Bedrock model support: https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html
- Amazon Bedrock Guardrails: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html
- Amazon Bedrock AgentCore: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
- SageMaker Model Monitor: https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html
- SageMaker Clarify: https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-configure-processing-jobs.html

No model availability is assumed for the owner account. Region, account access, pricing, and service quotas require current AWS verification.

| Model class | Workload | Context | Latency | Cost sensitivity | Data sensitivity | Risk | Metric | Fallback | AWS candidate | Non-AWS candidate | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reasoning | audits and red-team review | high | tolerant | high | medium | hallucination | rubric pass rate | local checklist | Bedrock reasoning-capable FM if approved | local/manual review | spike later |
| long-context | repo/source analysis | high | tolerant | high | high | source leakage | citation accuracy | chunked retrieval | Bedrock long-context FM if available | local embeddings + search | spike later |
| cheap classification | claim/source triage | low | low | high | low | false allow | precision on fixtures | deterministic rules | Bedrock low-cost FM if approved | regex/Zod rules | use rules now |
| embeddings | docs/source retrieval | medium | low | medium | medium | retrieval drift | recall@k | keyword index | Bedrock embeddings if approved | local vector store later | spike later |
| rerankers | retrieval quality | medium | medium | medium | medium | hidden bias | nDCG | deterministic sort | Bedrock reranker if available | open reranker later | spike later |
| multimodal | owned/licensed media review | medium | tolerant | high | high | rights leakage | label accuracy | manual review | Bedrock multimodal FM if approved | no model | reject for now |
| tabular/time-series | calibration/drift | low | batch | medium | medium | overfit | Brier/ECE/PSI | prediction-engine | SageMaker/local ML | local first | local now |
| evaluator | output quality | medium | tolerant | high | medium | judge drift | agreement with rubric | deterministic checks | Bedrock evaluator if approved | local rubric | spike later |
| guardrail/policy | claim language risk | low | low | high | low | false negative | banned-phrase recall | current scanner | Bedrock Guardrails if approved | local scanner | local now |
| anomaly | drift/source reliability | low | batch | medium | low | false alarm | alert precision | PSI/KL/chi-square | SageMaker Model Monitor later | local drift stats | local now |
