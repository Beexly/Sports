# W-OTS — Bitcoin-anchored trustless time (contract frozen 2026-07-17)

**Objective.** Wire the verified `gse-ots-anchor` packet (10/10 tests, serializer
byte-identical to python-opentimestamps) into the repo: every published slate
Merkle root gets an OpenTimestamps proof that upgrades into a Bitcoin
block-header attestation — "committed before kickoff" verifiable against Bitcoin
itself, no trust in GSE's clock or database. Founder queue item #1 (2026-07-17).

**Slice scope (thin, gate-respecting).**
1. Port the module verbatim → `packages/crypto/src/ots-anchor.ts` (+ index export),
   provenance header added, zero behavioral edits (assume-good-intent: the packet
   is the tested artifact; we do not rewrite verified crypto).
2. Vitest suite ported from the packet's test.mjs (the two python cross-checks
   recorded as packet-verified, not re-run — no python dep in CI).
3. CLOSE THE PACKET'S ONE OPEN JOB: live calendar round-trip smoke (transport
   injected; this environment has outbound HTTPS). Run once here, record the
   result; the live test stays opt-in (`OTS_LIVE_SMOKE=1`), never in CI.
4. Gated storage seam: additive founder-applied migration adding nullable
   `otsProof` (BYTEA) + `otsBitcoinHeight` (INT) to `slate_commitments`
   (IF-NOT-EXISTS, same doctrine as watchlist); `OTS_ANCHOR_ENABLED` env
   (default OFF) documented in .env.example. Wiring into the freeze-slate mint
   path + /api/proof/ots/[slateKey] + nightly upgrade poll ride the NEXT slice —
   this slice lands the verified primitive, its storage shape, and the flag.

**Invariant.** Public copy may claim "anchored to Bitcoin (block N)" ONLY when
`isBitcoinAttested` is true; calendar-pending states say so. No chain writes by
us; zero keys; a down calendar degrades to a still-valid pending artifact.

**Base.** `b41d768d`. **Forbidden.** lib/proof verification-spec behavior,
proof-of-record.ts, pricing, middleware. Schema change is additive-only,
founder-applied. **Rollback.** Remove the new files + migration dir.
