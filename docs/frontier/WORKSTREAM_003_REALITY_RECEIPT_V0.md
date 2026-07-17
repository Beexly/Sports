# W003 — Reality Receipt v0 (contract frozen 2026-07-17)

**Objective.** Compose the three proof primitives that already exist on this
branch — the W001 `PickEvidenceEnvelope` (evidence spine + reproducible
digest), the pick-proof hash-chain receipt (`verifyReceiptIntegrity`), and the
W-OTS Bitcoin-anchored slate commitment — into ONE reproducible, publicly
fetchable "Reality Receipt" object per decision (publish or pass), plus a
thin visual rendering. This is `docs/frontier/FRONTIER_KERNEL.md`'s
"proof-carrying Reality Receipts" ← `PickEvidenceEnvelope` spine + proof
receipts API + sealed-slate Merkle commitments, now extended with the
Bitcoin-anchor leg that landed since that pointer was written.

**Invariant.** `buildRealityReceipt(envelope, receiptRow, anchor, now)` is a
PURE function: given the same inputs it returns the same top-level `digest`
(sha256 over canonical JSON of `{envelopeDigest, receipt, anchor}` —
`generatedAt` is deliberately excluded so the digest never drifts with wall
clock). The receipt's SEALED→OPEN disclosure transition is derived from the
envelope's OWN `game.commenceTime` / `settlement.state` fields (never a
second, hand-rolled kickoff/settled check) — one canonical disclosure signal,
not two that could drift. Committed pick fields (selection, price,
confidence, edge) never surface before a receipt is OPEN, exactly mirroring
`/api/verify`'s existing sealed/open policy — this workstream does not
invent a new disclosure rule, it composes the existing one.

**Public-surface safety invariant.** `/api/proof/reality/[gameId]` is a fully
public, unauthenticated route. It MUST query with the same fail-closed,
FREE-tier-only pick filter Game Room's public viewer already uses — it must
never accept viewer/entitlement input. Unlike `/api/verify` (confirm a hash
you already possess), this route is keyed by `gameId` and is therefore a
*discovery* surface; restricting it to FREE-tier picks is what keeps a
kicked-off/settled PRO or ELITE pick's committed fields from opening to a
non-paying visitor who never had the hash. (`CLAUDE.md` rule #3: no
frontend-only paywalls — this is the server-side enforcement.)

**Scope (thin vertical slice).**
1. `apps/web/lib/reality-receipt/types.ts` + `build.ts` — pure builder.
   `RealityReceiptProof` = `NOT_CAPTURED | SEALED | OPEN` (reuses
   `verifyReceiptIntegrity`/`CommittedFields` from `lib/proof/receipt-proof.ts`
   verbatim, zero edits to that file). `RealityReceiptAnchor` = `NOT_REQUESTED
   | NOT_MIGRATED | NO_PROOF | UNAVAILABLE | PENDING | BITCOIN_ATTESTED`
   (same honesty states `/api/proof/ots/[slateKey]` already uses).
2. `apps/web/lib/reality-receipt/card.ts` — pure, testable visual-content
   model (`buildRealityReceiptCard`) so the eventual image render's logic
   (digest truncation, state→line copy, honest not-found/unavailable text)
   is unit tested independent of `next/og` rendering.
3. `apps/web/lib/reality-receipt/load.ts` — impure loader. Own minimal
   `db.game.findUnique` (FREE-tier picks, `take: 1` most-recent, same
   `gameSignals`/`gateDecisions`/`odds` shape `gameRoomEvidenceRecord`
   requires) feeding the EXISTING `gameRoomEvidenceRecord` +
   `buildRoomEvidenceEnvelope` (W001, untouched) — accepted duplication of
   `game-room/load.ts`'s query shape rather than refactoring a protected,
   tested file for this slice (documented tradeoff, not a blocker). Anchor
   status resolved via one `slateCommitment.findUnique` + the existing
   `@sports/crypto` `deserializeDetached`/`otsStatus`/`isBitcoinAttested`.
   Returns a discriminated `RealityReceiptLoad` (`ok:true` | `NOT_FOUND` |
   `NO_DECISION` | `UNAVAILABLE`) — DB outage is never reported as absence.
4. `apps/web/app/api/proof/reality/[gameId]/route.ts` — GET, JSON, honest
   404/503 mapping from the loader.
5. `apps/web/app/api/proof/reality/[gameId]/image/route.tsx` — GET, PNG via
   `next/og` `ImageResponse` (Node runtime; DB-backed, so not edge), thin
   JSX shell over `buildRealityReceiptCard`. No unit test precedent exists in
   this repo for `ImageResponse` rendering (the 3 existing `opengraph-image.tsx`
   files are untested too) — covered by the build's own type-check/bundle
   pass plus a manual dev-server smoke curl, documented as such, not hidden.
6. `apps/web/lib/proof/machine-proof.ts` — additive discovery link
   `rel: "reality-receipt"`, same pattern as the `ots-anchor`/`mcp` links.

**Explicitly out of scope for v0** (fast-follow candidates, not blockers):
~~Merkle inclusion proof of the receipt within its slate root~~ — LANDED
Phase 2.2 (2026-07-17, DEC-018): `slateInclusion` leg on `RealityReceipt`,
gated on the same `isOpen` signal the `receipt` leg already uses (a
genuinely-PROVEN proof is withheld as `SEALED` pre-kickoff — see DEC-018).
~~An 8th MCP tool wrapping this loader~~ — LANDED Phase 2.1 (DEC-017,
`get_reality_receipt`). Still out of scope: a public page (vs. API-only) for
a single Reality Receipt; multi-pick-per-game addressing (v0 is single
primary-pick-per-game, matching Game Room's own existing precedent).

**Base.** `507ab986`. **Forbidden.** `lib/game-room/load.ts` and
`lib/game-room/evidence-record.ts` (read-only reuse, no edits — protected,
tested, entitlement-bearing), `lib/proof/receipt-proof.ts` and
`app/api/verify/*` (read-only reuse of the sealed/open + tamper-check
policy, zero edits), `app/api/proof/ots/[slateKey]/route.ts` (read-only
pattern reuse for the anchor honesty-mapping, zero edits), pricing,
middleware, migrations (none needed — no schema change this slice).
**Protected zones.** proof, public claims. **Rollback.** Remove the new
`lib/reality-receipt/` directory, the two new route files, and the one
additive link entry in `machine-proof.ts`.
