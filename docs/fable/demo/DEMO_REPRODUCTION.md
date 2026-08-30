# Demo Reproduction

Fixture:
- `docs/fable/demo/fixture-public-forensic.json`

Run:

```bash
npm run fable:demo
```

Expected shape:
- `fixture_id`
- `probability_delta`
- `uncertainty_flag`
- `gse_flags`
- `would_not_claim`

The same fixture is validated by:

```bash
npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts
```

No live mode should run by default:
- `GSE_FABLE_LIVE_PUBLIC_DEMO_ENABLED=false`

Extension protocol:
1. Add a new checked-in fixture.
2. Add source-rights evidence.
3. Add a falsification rule.
4. Add or update the evidence-harness test.
5. Run `npm run fable:evidence`.
