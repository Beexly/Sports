# gse-ots-anchor

**Bitcoin-anchored trustless time for the Glass Ledger — no sports service has ever done this.**

The Glass Ledger already proves *what* was committed (Merkle receipts). This module makes the *when* trustless too: it wraps each published Merkle root in an [OpenTimestamps](https://opentimestamps.org) proof that upgrades (free, via independent public calendars) into a **Bitcoin block-header attestation**. After upgrade, "this commitment existed before kickoff" is verifiable by anyone against the Bitcoin blockchain — without trusting GSE's clock, database, or continued existence.

## Verification status (honest)

- `npm test` → **10/10**, including two **cross-implementation tests**: the official `python-opentimestamps` reference library parses our proofs, and our serializer's output is **byte-identical** to the reference serializer for the same structure. The bytes are right by construction.
- **Not yet done (build session's one job):** a live calendar round-trip (`submitToCalendars` with real `fetch`) — the build sandbox had no calendar network access. Transport is injected, so this is a 5-line smoke test.

## API

```ts
import { buildDetachedOts, submitToCalendars, deserializeDetached, otsStatus, isBitcoinAttested } from "gse-ots-anchor";

// 1) Instant, offline commitment artifact (pending attestations; upgradeable later):
const ots = buildDetachedOts(merkleRootHex);            // -> Uint8Array (.ots bytes)

// 2) Or submit to the public calendars now (you own fetch/retries; no hidden HTTP):
const { ots, ok, failed } = await submitToCalendars(merkleRootHex, {
  fetchBinary: async (url, body) => new Uint8Array(await (await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
  })).arrayBuffer()),
});

// 3) Status for the /proof surface:
otsStatus(deserializeDetached(ots));  // { bitcoin: [heights], pendingCalendars: [uris] }
isBitcoinAttested(deserializeDetached(ots)); // true once upgraded
```

Upgrade path: store the `.ots` bytes next to the receipt; hours later run the standard `ots upgrade` (or re-poll calendars) and the pending attestations swap for a Bitcoin attestation. Both states parse with this module.

## Integration sketch (build session)

1. On slate commitment (the existing publish-before-kickoff moment), compute the Merkle root (already done) → `submitToCalendars` → store `.ots` bytes on the commitment row (R2/DB blob).
2. Serve it: `/api/proof/ots/:slateKey` returns the raw `.ots`; add an `ots` field to `/llms.txt` + verification-spec so agents know the recipe.
3. Nightly job: for rows not yet `isBitcoinAttested`, re-poll calendars and persist the upgraded proof.
4. Public copy stays honest: "anchored to Bitcoin (block N)" only when `isBitcoinAttested` is true; otherwise "calendar-pending."

Zero cost, zero keys, no chain writes by us — the calendars aggregate and pay. Failure mode is honest: a down calendar leaves a pending marker; the commitment artifact is still valid.

## Files

- `src/index.ts` — the whole module (serializer, deserializer, calendar submit, status).
- `test.mjs` — 10 tests incl. reference-library cross-checks (`pip install opentimestamps` for those two; they skip nothing silently — they fail loudly if the lib is absent).
