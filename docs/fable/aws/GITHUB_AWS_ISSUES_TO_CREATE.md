# GitHub AWS Issues To Create

## Issue: Add Amplify preview-hosting decision record

Body:

```markdown
Create a decision record for whether AWS Amplify Hosting should be used for preview hosting.

Acceptance:
- Cites official Amplify SSR docs.
- Checks current Next.js runtime features against Amplify limitations.
- Does not connect AWS or DNS.
- Records owner decision.
```

## Issue: Add local model-card template before SageMaker work

Body:

```markdown
Create a local model-card template that mirrors useful SageMaker Model Cards fields without using AWS.

Acceptance:
- Includes model purpose, data sources, source rights, metrics, calibration, drift checks, limitations, and owner.
- Links to existing prediction-engine tests and reports.
- Does not create SageMaker resources.
```

## Issue: Define Clean Rooms partner checklist

Body:

```markdown
Create a partner checklist for future AWS Clean Rooms evaluation.

Acceptance:
- Requires named partner, contract status, source rights, allowed query types, aggregation thresholds, export policy, and cost owner.
- Does not create a collaboration.
```
