# agent-browser E2E smoke (pricing / checkout / webhook)

## Install
```bash
npx skills add vercel-labs/agent-browser
# or: npm i -D agent-browser
```

## Minimal smoke scripts (run against Production HOST)

```ts
// scripts/smoke/pricing.ts
import { chromium } from "agent-browser"; // or playwright via agent-browser

async function smokePricing() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.HOST + "/pricing");
  // assert: Pro / Elite price cards visible, no console errors
  await page.getByText(/Pro|Elite/).first().waitFor();
  await browser.close();
}

// scripts/smoke/checkout.ts
// 1. Start checkout for Pro monthly (test mode)
// 2. Assert redirect to Stripe Checkout or success path
// 3. Do NOT complete real payment in CI; use Stripe test clocks / fixtures

// scripts/smoke/webhook-receipt.ts
// After Stripe CLI `stripe trigger checkout.session.completed`
// Assert: webhookEvent row exists with stripeEventId, status processed, no duplicate
```

## CI gate
Add to GitHub Actions (or existing CI):
```
- name: Smoke board/pricing
  run: npx tsx scripts/smoke/pricing.ts
  env:
    HOST: ${{ secrets.PRODUCTION_HOST }}
```

Focus only on: `/pricing`, checkout start, webhook idempotency receipt.  
Do not expand to full Playwright suite yet.
