# Frontier current state

Last updated: 2026-08-20 (F-9)

## Live main

`7294739c` on `origin/main` (production deployed).

## Active workstream

**F-9 LedgerChainEntry schema review** — AMENDED AND APPROVED.
Branch `hermes/f9-ledger-chain-schema`.

Durable Glass Ledger chain is Postgres `ledger_chain_entries`, not
serverless memory. Hash contract unchanged (`ledger-chain.ts`). Write
path gated `LEDGER_CHAIN_ENABLED` default OFF. Migration FILE landed,
not applied. `PUBLISH_LEDGER` untouched.

## Next

1. Founder applies `20260820090000_add_ledger_chain_entries` to Neon.
2. Founder flips `LEDGER_CHAIN_ENABLED=true` in Vercel after one observed
   successful no-op cycle with the flag off (table present).
3. B-6c season metrics remain blocked on four-leg substantiation — chain
   export is live at `/api/proof/ledger-chain` regardless.
