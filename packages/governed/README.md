# @sports/governed

Signed, publicly verifiable receipts for gated AI/agent tool calls.
`createGoverned()` wraps any tool call with a policy gate, then produces a
`SignedGovernedReceipt` (ed25519-signed) whether the call was admitted or
refused — so every gated call leaves a durable, tamper-evident record,
without the caller having to think about signing or key management. A
companion keyring (`packages/governed/src/keyring.ts`, `rotate-keys.ts`)
manages the signing key lifecycle (rotate → retire → revoke) so old
receipts stay verifiable across key rotation.

## Quickstart

```ts
import { createGoverned, InMemoryKeyringStore, rotateReceiptSigningKey, activeSigner } from "@sports/governed";

const keyring = new InMemoryKeyringStore();
await rotateReceiptSigningKey(keyring); // mints the first active key

const governed = createGoverned({
  gate: async ({ tool, args, ctx }) => {
    // your admission logic — e.g. wraps admitUnderSRQC over recent events
    return { decision: "ADMIT", reasons: [] };
  },
  persistReceipt: async (signedReceipt) => {
    // write to your durable store (e.g. Prisma AgentReceipt) and return
    // any correlating id you want stamped onto the receipt
    return { controlEventId: undefined };
  },
  getSigner: () => activeSigner(keyring),
  receiptBaseUrl: "https://example.com", // optional — populates receipt.receiptUrl
});

const result = await governed(
  "tool.spend",
  { amountCents: 500 },
  { policyVersion: 1, policyHash: "abc", agentId: "agent-1", mode: "SHADOW" },
  async () => doTheActualWork(),
);

if (result.ok) {
  console.log(result.value, result.receipt);
} else {
  console.log("refused:", result.receipt.reasons);
}
```

### SHADOW vs ENFORCE

`ctx.mode` controls what a gate REFUSE actually does:

- **SHADOW (the safe default)**: a gate REFUSE is downgraded to an
  effective ADMIT — the wrapped `run()` still executes — but the receipt's
  `reasons` gets a `"SHADOW_WOULD_REFUSE"` tag appended, so you can observe
  what *would have* been blocked without blocking anything.
- **ENFORCE**: a gate REFUSE actually blocks — `run()` is never called, and
  the result is `{ ok: false, decision: "REFUSE", receipt }`.

Nothing in this package silently defaults to ENFORCE. The caller must
explicitly set `ctx.mode = "ENFORCE"` to get blocking behavior.

## Verifying a receipt

Every signed receipt carries `signature: { alg: "ed25519", sig, kid }`.
To verify one independently:

1. Fetch the current public keyring from your deployment's
   `GET /.well-known/receipt-keys.json` — an array of
   `{ kid, publicKeyPem, status }` (never private keys; `status` excludes
   revoked keys by construction).
2. Find the entry whose `kid` matches `signature.kid`.
3. Call `verifyReceiptEd25519(signedReceipt, publicKeyPem)` — or, if you
   have a `KeyringStore` handy, prefer `verifyReceiptAgainstKeyring(store,
   signedReceipt)`, which checks the key is still in `listVerifiable()`
   *before* checking the signature. This matters: a revoked key's
   signatures remain cryptographically valid forever — what makes them
   untrusted is that the key is no longer listed as verifiable. Always
   verify through the keyring, not the raw crypto check alone, if you care
   about revocation.

## Key lifecycle

- `rotateReceiptSigningKey(store)` — mints a new active key; the previous
  active key becomes `"retiring"` (still verifiable) for a grace period
  (`graceDays`, default 30).
- `retireExpiredKeys(store, now)` — run on a schedule; flips any
  `"retiring"` key whose grace period has elapsed to `"retired"` (still
  verifiable, never re-selected as active).
- `revokeKey(store, kid)` — emergency path (e.g. suspected private-key
  compromise). Immediately excludes the key from `listVerifiable()`.

## NON-CLAIMS

- This package does not assert or imply compliance or certification with
  any regulatory framework (NIST AI RMF, ISO/IEC 42001, EU AI Act, or any
  other). See `docs/governance/COMPLIANCE_MATRIX.md` and
  `docs/governance/EU_AI_ACT_POSTURE.md` for the (also non-asserted)
  engineering mapping and posture notes.
- **SHADOW is the safe default.** ENFORCE requires the caller to opt in via
  `ctx.mode = "ENFORCE"` — this package never chooses ENFORCE on its own.
- No secrets (private key material, raw tool arguments) are ever placed on
  a receipt. Only `argsDigest` (a one-way digest) travels with the receipt;
  raw `args` never leave the caller's process.
