# AWS Service Scorecard

| Service | Fit | Current repo status | Gate |
| --- | --- | --- | --- |
| Amplify Hosting | Possible fit for preview hosting of the Next.js app | No app configured | Owner must approve deploy target and cost cap |
| Bedrock AgentCore | Possible future agent runtime/control plane | Docs only | Requires agent threat model, spend policy, and tool allowlist |
| SageMaker Pipelines/Model Registry | Possible future MLOps ladder | Existing models are local/package code, not SageMaker artifacts | Requires ML runtime decision and model artifact policy |
| SageMaker Model Cards | Good documentation pattern | Not configured | Can be mirrored in docs before AWS use |
| AWS Clean Rooms | Possible partner collaboration pattern | No partner data or collaboration configured | Requires partner, contract, and query controls |
| S3 | Possible storage for approved artifacts | Not configured | Must inherit source storage rights |
| CloudWatch | Useful if deployed | Not configured | Only after deployment approval |

Official source notes:
- Amplify supports server-side rendered Next.js apps, including Next.js 15, according to AWS Amplify Hosting docs.
- SageMaker Model Registry catalogs model versions, metadata, approval status, lineage, and deployment stages.
- AWS Clean Rooms is for secure collaboration without revealing underlying data to one another.
