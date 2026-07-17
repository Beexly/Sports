import { NextResponse } from "next/server";
import { buildMachineProof } from "@/lib/proof/machine-proof";

/**
 * GET /api/proof/ledger — the read-only, no-auth JSON Proof API.
 *
 * The machine-readable twin of /llms.txt and the human /proof page: a
 * structured snapshot of the founder-gated ledger state plus a verification
 * map (how to check a receipt, where the record lives, what the method is).
 * An agent reads /llms.txt, follows the `self` link here, and gets JSON.
 *
 * Honesty is inherited, not restated: the `ledger` field is
 * `loadLedgerView()` verbatim, so it is `{ published: false, reason }` until
 * the founder flips PUBLISH_LEDGER, and can only ever carry metrics that
 * passed the four-leg display guard. This endpoint therefore cannot leak an
 * unsubstantiated number even in principle.
 *
 * Always 200 with a well-formed body — an unpublished record is a valid,
 * honest answer, not an error. No request input, no auth, no DB read (the
 * gate is an env check today), so there is nothing to fail on.
 */

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const doc = buildMachineProof();
  return NextResponse.json(doc, {
    status: 200,
    headers: {
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
