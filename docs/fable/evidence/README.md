# FABLE Evidence

This folder is the claim-to-evidence control surface.

Read order:
1. `EVIDENCE_INDEX.md`
2. `CLAIM_EVIDENCE_LEDGER.md`
3. `CLAIM_EVIDENCE_LEDGER.json`
4. `UNSUPPORTED_CLAIMS.md`
5. `COMMAND_LOG.md`
6. `BLOCKERS.md`

Executable checks:

```bash
npm run fable:evidence
npm run fable:claims
npm run fable:sources
npm run fable:aws-gates
```

The ledger is intentionally blunt. Claims without evidence are downgraded instead of rewritten into softer language.
