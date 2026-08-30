# AWS Final Recommendation

Recommended near-term path:
1. Keep FABLE AWS work local.
2. Use `aws-gates.ts` as the default cost/deploy guard.
3. Use Amplify only as a future preview-host candidate after a release-control decision.
4. Use SageMaker concepts first as local documentation, not endpoints.
5. Use Clean Rooms only after a real partner contract exists.

Do not:
- Connect AWS accounts in this branch.
- Add AWS SDK dependencies for speculative plans.
- Move source data to AWS without registry approval.
- Treat local skeletons as deployed services.
