# Phase 0.5b — Slate Commitment Opening Protocol

**Status:** merged to `main` (#235) · **live, dark** behind the gate — `SLATE_OPENING_REVEAL_ENABLED` (unset in git, founder-only flip)
**Companion:** `docs/ops/ZK_PROOF_EVOLUTION_ROADMAP.md` (where this phase sits in the ladder)

This document is the protocol spec for the OPEN side of the slate Pedersen
commitment. It describes what is actually built, in the order a reviewer should
read it. Nothing here is aspirational; every file named exists in the tree on
`main`.

## Why an open side exists

Phase 0.5 mints, per frozen slate, a Pedersen aggregate over the slate's
published edge scores — inside the same atomic transaction as the Merkle root —
and publishes the compressed hex on `/api/verify/slate` before the first
kickoff. That hex fixes the slate's total claimed edge in advance.

But a commitment nobody can open proves nothing to a customer: it is a number
no one has been shown how to check. The open side is what turns the layer from
plumbing into evidence — after the slate fully settles, disclose
`(value, blindingSum)` so anyone can recompute

```
C = [value]·G + [blindingSum]·H        (secp256k1)
```

and confirm C's compressed hex equals the string published before any result
was known.

**What an opening proves:** the aggregate was fixed pre-kickoff and unedited
since. A binding check on the record.
**What it does not prove:** that the picks were good, the edge real, or the
slate profitable. Product copy must never present an opening as a performance
claim, and the route's own copy states this.

**Language rule (CI-enforced by `no-zk-overclaim.mjs`):** the only words for
this layer on public surfaces are *commitment* and *opening*. The stronger
cryptographic claims are unavailable to it — see the roadmap for what each
layer does and does not buy.

## The three-layer shape

| Layer | File | Responsibility |
|---|---|---|
| Decision | `packages/crypto/src/slate-opening.ts` | `planSlateOpening()` — pure, DB-free, total, **REFUSE by default** |
| Data | `packages/ingestion-pipeline/src/slate-opening-reader.ts` | the **only** module permitted to select opener columns; fetch + count, zero policy |
| Surface | `apps/web/app/api/verify/slate/opening/route.ts` | thin caller: gate, response shape, audit line |

The decision is deliberately separated from the query because a query is a bad
place to hide a security boundary: the planner is exhaustively testable without
Postgres, and the reader can be reviewed as "does it feed the planner honest
inputs" in isolation.

## The refusal ladder (in evaluation order)

1. **`malformed_input`** — counts that are negative, fractional, non-finite, or
   with `pending > covered`. Refused, never coerced: if the caller's query is
   wrong, guessing which direction it is wrong in is how a live slate gets
   opened early.
2. **`not_settled`** — any covered pick still `PENDING`. Checked **before** the
   opener is parsed, so no code path touching the secret runs while the slate is
   live (a test feeds a live slate + corrupt opener and asserts `not_settled`
   still wins). A mostly settled slate is not partly openable: the aggregate is
   one number over the whole population, so 99-of-100 settled still refuses.
3. **`no_opener`** — null columns. Slates frozen before Phase 0.5, or a mint
   that failed open. Honest history, not an error; never throws.
4. **`malformed_opener`** — a column that is not a plain decimal integer.
   The parse is strict (`/^-?\d+$/`) because the mint path can only ever write
   plain decimals; a lenient parse would accept values the commit path could
   never have produced.
4b. **`malformed_opener` (value out of band)** — the value is negative or above
   the mint-contract ceiling `coveredPickCount × 100 × 1e6`. This is a real
   check, not a sanity assert: Pedersen binding is only *mod n*, so
   `commit(v, r)` is reproduced by every `v + k·CURVE_ORDER`. Without this
   bound, a corrupted opener column holding `v + n` (a 78-digit number claiming
   an absurd total) would pass the self-check below and be disclosed as a
   cryptographically confirmed total. The band is `< 2^60` for any real slate,
   far below `n (~2^256)`, so every alias is refused while every legitimate sum
   passes. (Found by adversarial review; verified `v + n` REVEALed before the
   bound and refused after.)

5. **`self_check_failed`** — `commit(value, blindingSum)` does not reproduce the
   stored hex. The opening is **withheld**. This is the least obvious rule and
   the most important: publishing an opener that fails in the customer's hands
   would read exactly like a product that forged its own commitment. Whatever
   the cause (migration damage, truncated write, operator edit), the honest
   response is to withhold and say the check failed. The Merkle root remains
   authoritative in the copy of every refusal.

`REVEAL` is returned only when settled ∧ opener present ∧ self-check passes.

## The covered-set contract (reader)

The pending count is keyed off `pickProofReceipt.slateKey` — the stamp the
freeze transaction wrote — and the denominator is the commitment's own frozen
`count`, never a live re-count. Both directions of error are dangerous:

- a **wider** count (e.g. all picks that day) lets an unrelated pending pick
  block a slate that is genuinely finished;
- a **narrower** count opens a live slate early — the failure this whole layer
  exists to prevent.

Receipts minted after a slate froze carry `slateKey NULL` by design (they are
honestly outside the pre-registration) and therefore do not participate in the
settlement check, exactly as they do not participate in the root.

Database errors are **not** swallowed into refusals. A `REFUSE` means "we
looked and the answer is no"; an outage returns a rejection the route maps to
503 — the same outage-is-not-a-verdict distinction `/api/verify/slate` draws.

## The surface

- Dark unless `SLATE_OPENING_REVEAL_ENABLED === "true"` (exact string; near
  misses like `"1"`, `"TRUE"`, `"yes"` stay closed — tested). The variable is
  unset in git and stays that way; disclosure of a cryptographic opener is a
  founder decision, not a deploy artifact.
- The gate short-circuits **before** any opener read is attempted.
- Refusals are HTTP 200 with `opened: false`, a machine `reason`, and
  customer-facing prose — a bare code on an honesty surface is silence. No
  refusal path can carry opener material (tested).
- A disclosed opening logs an audit line; the reveal is a recorded act.
- `whatThisProves` in the response says, in words, that this is a binding check
  and not a claim the picks won.

## Enforcement (CI)

`scripts/guardrails/pedersen-opener-boundary.mjs`, three rules:

- **A.** Every `slateCommitment` read must pass an explicit `select` — Prisma
  returns every scalar column when `select` is omitted, opener included.
- **B.** No opener column may be selected under `apps/` (the public tree).
- **C.** No opener column may be selected **anywhere** outside the single
  allowlisted reader. Rule B alone was insufficient: a server-only helper that
  quietly selects the blinding is one import away from a route. The allowlist
  is one file and must never grow to a directory.
- **D.** No `pickProofReceipt` read may traverse the `slate` relation
  wholesale — `include: { slate: true }` or `slate: { … }` without a nested
  `select` returns the full commitment row, opener included, with the word
  `slateCommitment` never appearing in the call. A traversal must name the
  public columns in a nested `select`. (Found by adversarial review — this was
  the channel the first three rules missed.)
- **E.** The same opener-field scan applies to `aggregate`/`groupBy` bodies:
  `_max: { pedersenBlindingSum: true }` extracts the blinding of a filtered row
  without the word `select` ever appearing.

Fixtures prove each rule fires (including the subtle rule-C shape: explicit
select, not under `apps/`, still refused) and that the compliant reader — even
one naming an opener column in a comment — is not flagged. Stated limit: the
guard is a textual lint and cannot follow a query object built in a separate
variable.

## Test inventory

- `packages/crypto/src/__tests__/slate-opening.test.ts` — 31 tests: happy path,
  each refusal, ordering (settlement before secrets), strict decimal parse,
  count refusal, totality (never throws).
- `apps/web/__tests__/slate-opening-route.test.ts` — 16 tests: gate default-off
  and near-miss values, 400 without DB touch, REVEAL shape, all five refusal
  reasons carry prose and no opener material, 503-not-refusal on outage.
- `apps/web/__tests__/pedersen-opener-boundary.test.ts` — 6 tests: repo clean,
  rules A/B/C fire on fixtures, no over-firing, comment-mention not flagged.

## Known limits (stated, not papered over)

- The reader's two queries were built without a `DATABASE_URL` in the
  development environment: the planner they feed is exhaustively tested, but the
  end-to-end query path (opener select + pending count against a real settled
  slate) should be confirmed against real data **before** the gate is ever
  flipped. The one thing to confirm: the pending count reaches zero exactly when
  the slate's covered picks all carry terminal results.
- The pending-count query and the disclosure are two reads, not one
  transaction. A pick un-settling in the window between them (e.g. an operator
  reverting a result to PENDING) could in principle race a reveal. The gate
  being founder-controlled and openings being post-settlement makes this a
  narrow operational window rather than an attacker-controlled one, but it is a
  window; if reveal ever becomes automatic, wrap the two reads in a
  transaction.
