# Uncertainty And Active Learning

Existing surface:
- `apps/web/lib/metrics/uncertainty-map.ts` builds a shadow segment map from prediction intervals and settled outcomes.

New surface:
- `apps/web/lib/fable/uncertainty.ts`

Implemented ranking strategies:
- Least confidence: ranks by `1 - max(probability)`.
- Margin: ranks by the smallest gap between top two class probabilities.
- Entropy: ranks by normalized class entropy.

Use:
- Rank candidates for human review queues.
- Identify cases where labels, feature review, or model diagnostics are valuable.

Non-use:
- The ranking does not retrain a model.
- The ranking does not trigger paid jobs.
- The ranking does not route picks to customers.
