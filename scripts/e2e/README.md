# E2E smoke

- `pricing-smoke.mjs` — public pricing page load + checkout route visibility (no login automation).
- Full Stripe checkout requires real auth; use Stripe test mode + operator checklist.

```bash
npm run e2e:pricing-smoke
HOST=https://www.galaxysportsedge.com npm run e2e:pricing-smoke
```
