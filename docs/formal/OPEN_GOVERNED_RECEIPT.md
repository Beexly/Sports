# OpenGovernedReceipt 0.1 — a portable profile for gated-tool-call receipts

This document names and pins the exact wire shape and verification contract
already implemented by `packages/governed` (the "A++ Governed Receipts +
Keyring" work, #188 on `main`, `61ac843f`), so it can be checked against —
by this repo's own tests, and in principle by any other implementation that
wants to produce or verify a compatible receipt. It does not introduce new
code; it documents and conformance-tests the code that already exists.

**Version**: 0.1. Nothing here is a standards-body spec — it is one
project's own receipt shape, named and version-pinned so it can be depended
on across time and (potentially) across implementations, the same reason
any internal wire format gets a version number.

---

## 1. Why this exists

`packages/governed` already produces signed, publicly verifiable receipts.
What was missing was a document that:

1. States the exact required fields and their types independently of the
   TypeScript source, so a reader can check a receipt against a spec rather
   than against an implementation file.
2. Names the specific properties a conformant receipt/verifier pair must
   have (round-trips, tamper-evidence, revocation-awareness) as
   independently-testable claims, not prose.
3. Gives this shape a name and a version, so "does receipt X conform to
   OpenGovernedReceipt 0.1" is an answerable question.

---

## 2. Required fields

A conformant `GovernedReceipt` (`packages/governed/src/receipt-types.ts`)
has:

| Field | Type | Notes |
|---|---|---|
| `receiptId` | `string` | Unique per receipt. This implementation uses `randomUUID()`. |
| `at` | `string` | ISO-8601 timestamp, receipt creation time. |
| `policyVersion` | `number \| null` | Which policy generation produced this decision, if versioned. |
| `policyHash` | `string \| null` | Content hash of the policy in effect, if hashable. |
| `action.tool` | `string` | The gated tool's identifier. |
| `action.argsDigest` | `string` | A one-way digest of the call arguments — **never the raw arguments themselves.** |
| `action.agentId` | `string` | Which agent/caller made the call. |
| `action.parentInvocationId` | `string` (optional) | Correlates a call to a parent invocation, if any. |
| `decision` | `"ADMIT" \| "REFUSE"` | The effective decision (see §4 on SHADOW). |
| `reasons` | `string[]` | Why. Sorted in the canonical payload (§3) — order carries no meaning. |
| `budget` | `{ heldCents?, remainingCents?, unit? }` (optional) | Present only when the gate is budget-aware. |
| `signature` | `{ alg: "ed25519", sig: string, kid: string }` | Present on every **signed** receipt. `sig` is base64url, no padding. |

Two fields are deliberately excluded from the signed payload even though
they may appear on the object a caller holds:

- `receiptUrl` — assigned after signing (needs the receipt's own id first).
- `controlEventId` — assigned by whatever persister stores the receipt,
  which runs after signing.

Including either in the signed bytes would make the signature depend on a
value that doesn't exist yet at sign time, or that varies by which
persister recorded the receipt. A conformant implementation must exclude
both from what gets signed and verified — see §3.

---

## 3. Canonical payload — required for signature stability

The exact byte sequence that gets signed must be a **deterministic**
JSON encoding, keyed in the same order every time, with:

- `reasons` sorted (order must not affect the signature).
- `action.parentInvocationId` normalized to `null` when absent (not simply
  omitted — omission vs. `null` must not change the signature).
- `budget`'s three sub-fields normalized to `null` when absent, listed in a
  fixed field order (an object serialized as-is, after a round-trip through
  a storage layer that doesn't preserve key order, can silently change its
  serialized byte sequence).
- `receiptUrl` and `controlEventId` excluded entirely (§2).

Reference implementation: `packages/governed/src/receipt-canonical.ts`,
`canonicalReceiptPayload()`. A conformant implementation does not have to
use this exact function, but must produce byte-identical output for the
same logical receipt regardless of caller-side key insertion order —
Conformance Test 1 (§5) pins this directly.

---

## 4. SHADOW vs ENFORCE — required decision semantics

A conformant gate wrapper must implement exactly this behavior, matching
`packages/governed/src/governed.ts`:

- **SHADOW** (the required safe default — a conformant implementation must
  not default to ENFORCE): a gate `REFUSE` is downgraded to an effective
  `ADMIT`. The wrapped work still runs. The receipt's `reasons` gets the
  literal string `"SHADOW_WOULD_REFUSE"` appended to whatever reasons the
  gate itself returned. The receipt's `decision` field reads `"ADMIT"`.
- **ENFORCE**: a gate `REFUSE` actually blocks. The wrapped work is never
  called. The receipt's `decision` field reads `"REFUSE"`, and `reasons`
  is exactly what the gate returned (no `SHADOW_WOULD_REFUSE` tag — that
  tag only ever appears on an *effective* ADMIT that masks a would-be
  refusal, never on an actual REFUSE).
- ENFORCE is opt-in per call, via an explicit `ctx.mode: "ENFORCE"` — never
  a package-level or environment-level default a caller could miss.

The `"SHADOW_WOULD_REFUSE"` string is therefore load-bearing: it is the one
place a conformant receipt distinguishes "the gate wanted to refuse but
SHADOW let it through" from "the gate had nothing to refuse." Conformance
Test 5 (§5) checks the literal string is present under SHADOW and absent
under ENFORCE.

---

## 5. Conformance tests (0.1)

All six are implemented and pass against this repo's own
`packages/governed` in
`packages/governed/tests/open-governed-receipt.conformance.test.ts`:

1. **Canonical payload stability.** The same logical receipt, constructed
   with keys in a different insertion order (and `parentInvocationId`
   omitted vs. explicitly `undefined`), produces byte-identical
   `canonicalReceiptPayload()` output.
2. **Sign/verify round-trip with kid.** Sign a receipt with a real ed25519
   key, verify it against the matching public key, confirm `signature.kid`
   equals the signing key's `kid`, and confirm `verifyReceiptEd25519`
   returns `{ ok: true }`.
3. **Tamper fails verify.** Flip one character in a signed field
   (`reasons`) after signing; verification must return `{ ok: false }`.
4. **ENFORCE refuse does not run the side effect.** Call `governed()` in
   `ENFORCE` mode against a gate that returns `REFUSE`; assert the wrapped
   `run()` function is never invoked and the result is
   `{ ok: false, decision: "REFUSE" }`.
5. **SHADOW carries `SHADOW_WOULD_REFUSE`, ENFORCE does not.** Call
   `governed()` with the same refusing gate under both modes; SHADOW's
   receipt `reasons` must contain `"SHADOW_WOULD_REFUSE"` and `decision`
   must read `"ADMIT"`; ENFORCE's must not contain that string and
   `decision` must read `"REFUSE"`.
6. **Revoked-key receipts fail keyring verification even though the raw
   signature is still cryptographically valid.** Sign with an active key,
   revoke that key, and confirm `verifyReceiptAgainstKeyring` returns
   `{ ok: false }` while the lower-level `verifyReceiptEd25519` (which has
   no revocation awareness by design — see `keyring.ts`) still returns
   `{ ok: true }` for the same signature. This is the disclaimer test:
   §7 states plainly that raw signature validity is not the same claim as
   trust, and this test is what backs that sentence.

---

## 6. What this profile does not cover

- Transport (how a receipt reaches a verifier — this repo uses
  `GET /api/receipts/[id]` and `GET /.well-known/receipt-keys.json`, but
  the receipt shape itself does not require HTTP).
- Storage (`packages/governed` is storage-agnostic via `KeyringStore` and
  `persistReceipt`; this repo's own Prisma-backed store is one
  implementation, not part of the profile).
- Any claim about what the underlying gate's admission logic actually
  checks — `OpenGovernedReceipt` describes the receipt and signing
  contract, not any particular admission policy. `admitUnderSRQC` is one
  policy this repo wires through it; a conformant receipt could equally
  wrap a completely different policy.

## 7. Explicit NON-CLAIMS

- **Not a certification or regulatory-compliance claim.** This profile
  provides engineering traceability (a signed, independently verifiable
  record of a decision), not compliance with any regulatory framework —
  see `packages/governed/README.md`'s own NON-CLAIMS and
  `docs/governance/COMPLIANCE_MATRIX.md`.
- **Not a claim that cryptographic validity implies trust.** A signature
  can be cryptographically perfect and still be untrusted if the signing
  key has since been revoked — see Conformance Test 6. Always verify
  through a keyring-aware check (`verifyReceiptAgainstKeyring`), not the
  raw signature check alone, if revocation matters to the caller.
- **Not a standards-body specification.** "0.1" names an internal
  version, not a submission to any external standards process.
- **Not a claim that SHADOW mode blocks anything.** By design it does not
  — see §4. `SHADOW_WOULD_REFUSE` is an observability tag, not an
  enforcement action.
