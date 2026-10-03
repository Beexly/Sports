# Cost Gates

Any AWS experiment must pass:
- `FABLE_AWS_ALLOW_EXPERIMENTS=true`
- `FABLE_AWS_MAX_MONTHLY_COST_USD` set above the estimate

Any paid resource must also pass:
- `FABLE_AWS_ALLOW_PAID_RESOURCES=true`

The default is off.
