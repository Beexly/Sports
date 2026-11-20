---
name: claims-check
description: Verify every performance, pricing, and receipt claim in public copy before shipping.
allowed-tools: Read, Grep, Glob, Bash(npm run guard:*), Bash(npx vitest*)
---

# Claims check

Every accuracy, ROI, pricing, or ledger claim in customer-facing copy must resolve cleanly to a canonical repo source of truth or be removed.

## Receipt Claim Rule (`process-sport.ts`)
Never write "every pick is sealed with a receipt before kickoff." Receipt creation in `packages/ingestion-pipeline/src/process-sport.ts` is conditional on `marketFairProb` in `(0, 1)` AND `isPlausibleEntryOdds(entryOdds)` (`|odds| >= 100`), and receipt persistence failures are non-fatal.

## Verification Checklist
1. List every factual claim, count, unit figure, and product guarantee in the draft.
2. **Official Ledger of Record:** Source only from `apps/web/lib/ledger/public-record.ts` / `/record` (`verifiedLedger` — currently `79-46-0`, `+81.47u` weighted / `+25.82u` 1u-normalized flat `-110`, `53/200` CLV gate). Never publish a win-rate `%` until `200` CLV-backed plays clear the gate (`PUBLIC_RECORD_POLICY`), and never cite voided Nov 5 or pre-Week-8 batches as standing records.
3. **Pricing Truth:** Resolve tier/pack amounts strictly from `apps/web/lib/pricing/pricing-phases.ts` and `apps/web/lib/packages/catalog.ts`.
4. **Canonical URLs:** Resolve strictly from `apps/web/lib/seo/site-url.ts` (`https://www.galaxysportsedge.com`).
5. Run guards sequentially (PowerShell-safe) and inspect exit codes:
```powershell
npm run guard:commercial-copy; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run guard:performance-claims; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/guardrails/trust-gate.mjs
```

## Completion Criteria
Done when all three guards exit `0` and every claim in the copy cites its canonical module or is removed.
