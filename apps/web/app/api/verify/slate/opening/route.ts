/**
 * GET /api/verify/slate/opening?slateKey=SPORT:YYYY-MM-DD
 *
 * Phase 0.5b — the OPEN side of the slate commitment.
 *
 * `/api/verify/slate` publishes a slate's sealed Pedersen aggregate as a hex
 * string before the first kickoff. On its own that hex proves nothing to a
 * customer: it is a number nobody has been shown how to check. This route is
 * how it becomes evidence — after the slate has fully settled, it discloses the
 * opening `(value, blindingSum)` so anyone can recompute
 *
 *     C = [value]G + [blindingSum]H
 *
 * and confirm it equals the hex that was published before any result was known.
 *
 * WHAT AN OPENING PROVES, EXACTLY: that the aggregate published pre-kickoff is
 * the one being opened now — the total was fixed in advance and has not been
 * edited since. It says NOTHING about whether the picks were good, whether the
 * edge was real, or whether the slate made money. It is a binding check, not a
 * performance claim, and the copy below says so in those words.
 *
 * This handler is a THIN CALLER. It makes no disclosure decision of its own:
 * `planSlateOpeningFromDb` refuses by default and only returns an opening when
 * the slate is fully settled, an opener exists, and that opener verifiably
 * reproduces the published hex. The route's own job is the gate, the shape of
 * the response, and the audit line.
 *
 * FOUNDER GATE: dark unless `SLATE_OPENING_REVEAL_ENABLED === "true"`, which is
 * unset in git and must stay that way. Disclosure of a cryptographic opener is
 * a founder decision, not a deploy artifact.
 *
 * LANGUAGE: this is a classical Pedersen commitment over secp256k1 — perfectly
 * hiding, computationally binding under the discrete-log assumption. The only
 * words for it here are "commitment" and "opening". The stronger cryptographic
 * claims are not available to this layer, and `no-zk-overclaim.mjs` blocks them
 * on this surface in CI — including inside comments like this one, deliberately:
 * the fence is textual because a phrase written today as a denial is one
 * careless edit away from being read as a claim. See
 * docs/ops/ZK_PROOF_EVOLUTION_ROADMAP.md for what each layer does and does not
 * buy.
 */

import { NextResponse } from "next/server";
import { planSlateOpeningFromDb } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";

const SLATE_KEY_RE = /^[A-Z0-9_]+:\d{4}-\d{2}-\d{2}$/;

/** Customer-facing explanation per refusal. Never a bare code, never silence. */
const REFUSAL_COPY: Record<string, string> = {
  not_settled:
    "This slate has not fully settled yet. The aggregate commitment covers every pick on the slate, so no part of it is opened until all of them have a final result.",
  no_opener:
    "This slate has no aggregate commitment to open. Slates frozen before the aggregate layer existed carry only their Merkle root, which remains fully verifiable at /api/verify/slate.",
  self_check_failed:
    "The stored opening does not reproduce the published commitment, so it is being withheld rather than shown. The published commitment and Merkle root are unchanged and remain authoritative.",
  malformed_opener:
    "The stored opening could not be read as a valid number, so it is being withheld rather than shown. The published commitment and Merkle root are unchanged and remain authoritative.",
  malformed_input:
    "The slate's recorded population could not be reconciled, so nothing is being opened. The published commitment and Merkle root are unchanged and remain authoritative.",
};

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env["SLATE_OPENING_REVEAL_ENABLED"] !== "true") {
    return NextResponse.json(
      {
        enabled: false,
        reason:
          "Commitment opening is founder-gated and currently off. Sealed commitments and Merkle roots remain published and verifiable at /api/verify/slate.",
      },
      { status: 404 },
    );
  }

  const slateKey = new URL(request.url).searchParams.get("slateKey")?.trim() ?? "";
  if (!SLATE_KEY_RE.test(slateKey)) {
    return NextResponse.json(
      {
        error:
          "Provide a slate key of the form SPORT:YYYY-MM-DD (?slateKey=AMERICANFOOTBALL_NFL:2026-09-14).",
      },
      { status: 400 },
    );
  }

  // An outage must not read as "this slate refuses to open" on an honesty
  // surface — same 404-vs-503 distinction /api/verify/slate already draws. The
  // reader deliberately does not swallow database errors into a refusal.
  let plan;
  try {
    plan = await planSlateOpeningFromDb(slateKey);
  } catch {
    return NextResponse.json(
      {
        error:
          "The verifier is temporarily unavailable. This is not a verdict on the slate; try again shortly.",
      },
      { status: 503 },
    );
  }

  if (plan.action === "REFUSE") {
    return NextResponse.json(
      {
        slateKey,
        opened: false,
        reason: plan.reason,
        explanation: REFUSAL_COPY[plan.reason] ?? "This slate cannot be opened.",
      },
      { status: 200 },
    );
  }

  // Audit line: an opener leaving the server is a deliberate, recorded act.
  console.log(
    `[slate-opening] disclosed opening for ${plan.opening.slateKey} (gate SLATE_OPENING_REVEAL_ENABLED=true)`,
  );

  return NextResponse.json({
    slateKey: plan.opening.slateKey,
    opened: true,
    commitment: plan.opening.aggregateHex,
    opening: {
      value: plan.opening.value,
      blindingSum: plan.opening.blindingSum,
    },
    howToCheck:
      "Recompute C = [value]G + [blindingSum]H on secp256k1, where G is the standard base point and H is derived from the public seed 'GSE-pedersen-h-secp256k1-v1' by hash-and-increment. Compressed hex of C must equal the commitment above — the same string published before the slate's first kickoff.",
    whatThisProves:
      "That the aggregate published before kickoff is the one opened here: the total was fixed in advance and has not been edited since. It is a binding check on the record, not a claim about whether the picks won.",
  });
}
