# Demo Reproduction

Run:

```bash
npm run fable:demo
```

Expected output:
- JSON with `fixture_id`
- `probability_delta`
- `uncertainty_flag`
- `gse_flags`
- `would_not_claim`

The same fixture is validated by:

```bash
npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts
```
