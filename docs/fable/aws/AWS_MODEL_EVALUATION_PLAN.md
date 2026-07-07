# AWS Model Evaluation Plan

Every model class needs:
- fixture set
- expected output schema
- refusal cases
- source-rights cases
- cost estimate
- latency tolerance
- hallucination audit
- fallback path

Metrics:
- structured parse rate
- citation/evidence accuracy
- unsupported-claim false negative rate
- cost per 100 evaluations
- latency percentile
- human review agreement

No model is approved for live use until it beats deterministic baselines on the target workload and passes the source-risk rubric.
