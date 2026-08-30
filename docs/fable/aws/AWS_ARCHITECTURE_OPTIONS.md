# AWS Architecture Options

Option A: Docs and local gates only.
- Current branch implements this.
- Lowest risk.
- No cloud spend.

Option B: Amplify preview hosting.
- Use only after owner approval.
- Requires build verification, environment review, and release-control decision.

Option C: SageMaker MLOps ladder.
- Useful only after model artifacts, approved data, and a runtime decision exist.
- Starts with model cards and registry concepts, not endpoints.

Option D: Clean Rooms partner collaboration.
- Useful only with a real partner and contract.
- Requires query controls and data minimization.

Option E: Bedrock AgentCore control plane.
- Future agent runtime/control plane candidate.
- Requires tool allowlist, spend gates, and audit policy.
