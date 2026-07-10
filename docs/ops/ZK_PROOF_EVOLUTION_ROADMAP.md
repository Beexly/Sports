# ZK Proof Evolution Roadmap — Merkle → Pedersen → Halo2 → STARK

**Date:** 2026-07-10 · **Status:** design locked, phased · **Overclaim fence:**
`scripts/guardrails/no-zk-overclaim.mjs` (CI) blocks any public "zero-knowledge" /
"post-quantum" language until the corresponding system is live and externally audited.

## Current state (verified in-repo, not aspirational)

| Layer | File(s) | Status |
|---|---|---|
| SHA-256 Merkle receipts | `packages/prediction-engine/src/pick-proof-receipt.ts`, `proof-of-record.ts` | **LIVE** — minted per pick pre-kickoff (`process-sport.ts`), publicly verifiable at `/verify` (re-hash + recompute-it-yourself panel) |
| Pedersen commitments (secp256k1, @noble, constant-time) | `packages/crypto/src/pedersen-ledger.ts` (+ tests) | **BUILT, DARK** — additive homomorphic aggregates; not wired to any public surface |
| Pedersen reference (finite-field, pure BigInt) | `packages/prediction-engine/src/pedersen-ledger.ts` | R&D only — non-constant-time by design, never production |
| Halo2 recursive aggregate proof | — | **ROADMAP** (Phase 1) |
| STARK-family post-quantum proof | — | **ROADMAP** (Phase 2, optionality) |

The Merkle layer is and remains the root of trust. Everything else is additive.

## What each layer buys (and what it does not)

- **Merkle (live):** tamper-evidence per pick — change one character of the committed
  payload and the hash breaks. Anyone can recompute. Not hiding: the payload opens
  post-kickoff by design.
- **Pedersen (dark):** additively homomorphic — prove a numeric property of a sealed
  slate (sum of edges, aggregate) without opening individual picks. Perfectly hiding,
  computationally binding (~128-bit DLOG). **Not ZK in the proof-system sense, and
  NOT post-quantum** (DLOG falls to Shor).
- **Halo2 recursive (Phase 1):** true zero-knowledge aggregate claims ("aggregate CLV
  of this frozen slate ≥ X" without revealing any pick), constant proof size (~3-5 KB),
  fast verification (<60 ms mobile). No trusted setup in the recursive configuration.
  **Correction to prior notes: Halo2/IPA recursion is still discrete-log-based — it is
  NOT post-quantum.** PQ comes only from the STARK phase.
- **STARK (Phase 2):** hash-based (FRI), transparent, post-quantum under standard hash
  assumptions. Trade-off: larger proofs (tens of KB) and slower provers. Optionality,
  not a replacement — run beside Halo2 if/when quantum timelines demand it.

## The integrated envelope (no public API break at any phase)

```ts
export interface CommitmentEnvelope {
  merkleProof: MerkleProof;              // live today — never removed
  pedersenAggregate?: Commitment;        // additive layer (wire in Phase 0.5)
  zkProof?: { type: "halo2" | "stark"; data: Uint8Array }; // null until live+audited
  publicInputs: { aggregateClv: number; N: number; merkleRoot: string };
}
```

Verifier order: Merkle first (root of trust) → Pedersen if present → zkProof if
present. Old receipts without newer layers stay verifiable forever.

## Phases (each gated on the previous being boringly stable)

- **Phase 0 (done):** Merkle receipts live; public verifier shows payload + hash so
  skeptics recompute offline; overclaim fence in CI.
- **Phase 0.5 (cheap, next):** wire the EXISTING dark Pedersen layer into the sealed
  slate commitment (`freeze-slate-commitments.ts`) — an aggregate commitment published
  pre-kickoff, opened post-slate. Uses code + tests that already exist; public copy says
  "commitment", never "ZK".
- **Phase 1 (4–6 wks eng):** `packages/zk` Rust crate — Halo2 base circuit (per-pick
  readiness + contribution) + recursive aggregator; fixed-point arithmetic (scale 1e6)
  for the 52.4% boundary; pushes excluded exactly as `settlement.ts` grades them.
  E2E test: freeze synthetic slate → prove → verify → aggregate matches without opening
  picks. External audit BEFORE any public copy changes. Only then may "zero-knowledge"
  enter `ALLOWED_PHRASES` in the guardrail, citing the audit.
- **Phase 2 (8–12 wks, optional):** STARK sibling for post-quantum optionality; dual
  `zkProof.type` support; "post-quantum" language unlocks only with that audit.

## Discipline (non-negotiable, mechanically enforced where possible)

1. Public copy never claims a property the customer cannot verify TODAY
   (`no-zk-overclaim.mjs`, CI-blocking).
2. Verification keys / circuit sources get committed (Merkle/IPFS) so claims stay
   falsifiable.
3. No layer ever weakens or replaces the Merkle root of trust.
4. Prover cost stays off the request path — proofs are minted at slate-freeze time.
5. Every phase ships with failing-then-passing tests and an explicit rollback
   (drop the optional envelope field; nothing else moves).

## Why this ordering serves revenue

Phase 0.5 strengthens the anti-cherry-picking story with code that already exists —
days, not weeks. Phase 1 makes GSE the only sports-prediction service whose aggregate
claims are provable without trust. Both compound the same moat the pricing ladder is
built on: verifiable honesty. Phase 2 is insurance, priced accordingly.
