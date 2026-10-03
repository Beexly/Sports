# Demo Script — Governed Receipts + Keyring (~90 seconds)

Goal: show a real REFUSE decision producing a signed, publicly verifiable
receipt, end to end.

## 0. Setup (not counted in the 90s — do this before the demo)

```bash
npm run dev --workspace=apps/web   # only needed for steps 2-3 (the HTTP routes)
```

## 1. Force a REFUSE (0:00–0:25)

Run the standalone demo script — it wraps a real tool call in
`createGoverned()` with `ctx.mode: "ENFORCE"`, against a gate wired to
`admitUnderSRQC` fed a synthetic window containing a genuine GE2 (two
concurrently-pending attempts on one invocation) violation, so the REFUSE is
real, not hand-forced:

```bash
npx tsx scripts/demo/force-governed-refuse.mjs
```

Actual output (captured from a real run):

```
[demo] signing key: e3e24a59-1154-4de9-886a-6b0b3b39e1f0
decision: REFUSE
receiptId: bdbe80e9-dda2-49bd-accd-0886f48f14be
receiptUrl: http://localhost:3000/api/receipts/bdbe80e9-dda2-49bd-accd-0886f48f14be
{
  "receiptId": "bdbe80e9-dda2-49bd-accd-0886f48f14be",
  "at": "2026-07-23T20:34:14.082Z",
  "policyVersion": 1,
  "policyHash": "demo-hash",
  "action": {
    "tool": "ai.invoke",
    "argsDigest": "5d4e96cc50b54662caaad66538398c5a",
    "agentId": "agent-demo"
  },
  "decision": "REFUSE",
  "reasons": ["srqc_violation:GE2"],
  "receiptUrl": "http://localhost:3000/api/receipts/bdbe80e9-dda2-49bd-accd-0886f48f14be",
  "signature": {
    "alg": "ed25519",
    "sig": "JdZHEjm8Lpl8fVztBJyP_WmWq2fVyk63FS1qZdv7pBb8V0Ct3MLnhxSRazJjVMMLQKhylTgofU3nAdVS0Ry6Dg",
    "kid": "e3e24a59-1154-4de9-886a-6b0b3b39e1f0"
  }
}
```

(The script's keyring and receipt store are in-process, not the running
server's — steps 2-3 below use `/api/receipts/[id]` and
`/.well-known/receipt-keys.json` against a receipt persisted by the live
app, e.g. via `governed-gate.ts`-wired traffic, not this script's output
directly.)

## 2. Open the signed receipt (0:25–0:50)

```bash
curl -s http://localhost:3000/api/receipts/7c9e6c4e-... | jq .
```

```json
{
  "receiptId": "7c9e6c4e-...",
  "at": "2026-07-23T00:00:00.000Z",
  "decision": "REFUSE",
  "tool": "ai.invoke",
  "agentId": "agent-demo",
  "argsDigest": "9c12d281c46d140f749e6ed570c8684e",
  "reasons": ["srqc_violation:GE2"],
  "signature": { "alg": "ed25519", "sig": "...", "kid": "k-2026-07" }
}
```

Point out: no raw tool arguments anywhere — only `argsDigest`. No private
key material. The `signature.kid` names which key signed it.

## 3. Verify it against the public keyring (0:50–1:20)

```bash
curl -s http://localhost:3000/.well-known/receipt-keys.json | jq .
# -> { "keys": [{ "kid": "k-2026-07", "publicKeyPem": "-----BEGIN PUBLIC KEY-----...", "status": "active" }] }

curl -s -X POST http://localhost:3000/api/receipts/verify \
  -H 'content-type: application/json' \
  -d @receipt.json
# -> { "ok": true }
```

Anyone — not just this deployment — can independently re-derive the signed
payload and check it against the published public key. No shared secret
required.

## 4. Point at the public surfaces (1:20–1:30)

"That's the whole loop: gated call → admit/refuse decision → signed
receipt → publicly verifiable, without trusting us. SHADOW is the default
everywhere else in production — this ENFORCE demo only ran because we set
`SRQC_ENFORCE=1` in this lab shell."

Two places to point at on screen to close:

- `/integrity` — the public front door: what the control plane governs,
  the SHADOW-default posture, and a link to the live
  `/.well-known/receipt-keys.json` keyring used in step 3 above.
- `docs/formal/SRQC_STATUS.md` — the full record: real TLC receipts (§3),
  whether any certificate is currently active (§10 — as of this writing,
  no), and a seven-step "attack checklist" (§11) for anyone who wants to
  verify all of this without trusting the document.

## 5. Troubleshooting

- **`ECONNREFUSED` on steps 2–3.** `npm run dev --workspace=apps/web`
  (step 0) isn't running, or hasn't finished starting yet — wait for the
  "Ready" log line and retry.
- **Step 1 prints `decision: ADMIT` instead of `REFUSE`.** The script
  hard-codes `ctx.mode: "ENFORCE"` — if it ever admits, either the
  synthetic window's two `ATTEMPT_STARTED` events stopped landing on the
  same invocation id (check `scripts/demo/force-governed-refuse.mjs`
  wasn't edited), or `admitUnderSRQC`'s violation predicate regressed.
  Either way, treat an ADMIT here as a real bug to file, not a flaky
  re-run.
- **`curl .../api/receipts/[id]` 404s in step 2.** The demo script's
  in-process receipt store is separate from the running dev server's — you
  must fetch a receipt id that a real request against the running app
  actually persisted (e.g. via `governed-gate.ts`-wired traffic), not
  step 1's own printed `receiptId` directly. See the note at the end of
  step 1.
- **Step 3's `POST /api/receipts/verify` returns `{ "ok": false }`.** Confirm
  `receipt.json` is the exact, unmodified JSON body from step 2 — even
  reformatting whitespace inside a string field or reordering keys by hand
  should not break it (the canonical payload is order-independent, see
  `docs/formal/OPEN_GOVERNED_RECEIPT.md` §3), but pasting in a
  hand-edited or truncated receipt will.
