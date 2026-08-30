/**
 * External anchor for the Glass Ledger (handoff §2 P2: "append-only chain
 * linkage + external anchor"). Anchoring publishes the chain's current tip
 * hash + entry count somewhere outside our own database (canonically an
 * OpenTimestamps proof or a public gist) so a skeptic doesn't have to trust
 * that our own DB wasn't quietly rewritten between visits — the anchor is a
 * timestamp nobody on our side controls after the fact.
 *
 * THIS MODULE IS INERT. `anchorExternally` is HARD-GATED: no push, no
 * deploy, no external send of any kind ships un-gated (handoff §1 Process,
 * directive HARD GUARDRAILS — the same rule BUILD_LOG.md cites for every
 * founder-gated action in this build). It throws GatedActionError unless
 * BOTH `process.env.LEDGER_ANCHOR_ENABLED === "true"` AND the caller passes
 * the literal confirm string "FOUNDER-CONFIRMED" — an env flag alone is not
 * enough, mirroring walk-forward.ts's sealed-holdout pattern (a token only a
 * human types).
 *
 * Even fully enabled + confirmed, this function performs NO network call.
 * It returns the exact payload that WOULD be posted, plus instructions —
 * the founder runs the actual OpenTimestamps/gist step by hand, outside
 * this codebase. Building a real network path here is explicitly out of
 * scope; see the module header's "do NOT implement any actual network call"
 * directive.
 */

import type { ChainDigest } from "./ledger-chain.js";

export interface AnchorPayload {
  readonly digestHex: string;
  readonly count: number;
  readonly anchoredAtUtc: string;
  readonly scheme: "sha256-chain-tip";
}

export class GatedActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatedActionError";
  }
}

const HEX64 = /^[0-9a-f]{64}$/i;

/**
 * Build the OpenTimestamps-style anchor payload from a chain digest. Pure —
 * `anchoredAtUtc` is injected by the caller (never Date.now() internally) so
 * the result is fully deterministic and testable.
 */
export function buildAnchorPayload(digest: ChainDigest, anchoredAtUtc: string): AnchorPayload {
  if (!HEX64.test(digest.tipHash)) {
    throw new TypeError(`ledger-anchor: digest.tipHash must be a 64-hex sha256 digest, got ${JSON.stringify(digest.tipHash)}`);
  }
  if (!Number.isInteger(digest.count) || digest.count < 0) {
    throw new RangeError(`ledger-anchor: digest.count must be a non-negative integer, got ${digest.count}`);
  }
  if (!Number.isFinite(Date.parse(anchoredAtUtc))) {
    throw new RangeError(`ledger-anchor: anchoredAtUtc must be a valid ISO-8601 UTC instant, got ${JSON.stringify(anchoredAtUtc)}`);
  }
  return {
    digestHex: digest.tipHash,
    count: digest.count,
    anchoredAtUtc,
    scheme: "sha256-chain-tip",
  };
}

export interface AnchorInstructions {
  /** The exact payload that would be posted externally. */
  readonly wouldPost: AnchorPayload;
  /** What the founder does by hand — this function performs no network I/O itself. */
  readonly instructions: string;
}

/**
 * HARD-GATED external anchor. Throws GatedActionError unless
 * process.env.LEDGER_ANCHOR_ENABLED === "true" AND confirm === "FOUNDER-CONFIRMED".
 *
 * Even when both conditions hold, this NEVER sends anything anywhere — it
 * only returns the payload that would be posted plus the manual steps to
 * post it. There is no fetch/axios/http call anywhere in this function, by
 * design: sending anything external is hard-gated by the build directive,
 * and a pure "would post" return value is the honest way to prepare for a
 * founder-run step without building the send path ourselves.
 */
export function anchorExternally(payload: AnchorPayload, confirm?: string): AnchorInstructions {
  if (process.env.LEDGER_ANCHOR_ENABLED !== "true" || confirm !== "FOUNDER-CONFIRMED") {
    throw new GatedActionError(
      "external anchoring is founder-gated; handoff §1 Process. Set LEDGER_ANCHOR_ENABLED=true AND " +
        'pass confirm === "FOUNDER-CONFIRMED" to acknowledge — even then this function only returns ' +
        "the payload it would post; it never performs the network call itself.",
    );
  }
  return {
    wouldPost: payload,
    instructions:
      "This payload was NOT sent anywhere. To anchor it externally, the founder runs the OpenTimestamps " +
      "(or public gist) step by hand outside this codebase: `ots stamp` a file containing digestHex, or " +
      "publish {digestHex, count, anchoredAtUtc, scheme} as a public gist and record its URL against this " +
      "chain's tip. No automated network path exists in this repo for this step.",
  };
}
