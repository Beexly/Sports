/**
 * The Sealed Slate — public data contract for the commitment ritual (/sealed).
 *
 * This is the founder-gated, method-opaque front-door to the Glass Ledger: the
 * moment the machine SEALS its slate in public before kickoff. It sits beside
 * two live surfaces this build must not regress —
 *   - `/engine` (`lib/engine/load-engine-story.ts`): the ungated live-telemetry
 *     story (sweep → gate → seal → record). `/sealed` does NOT replace it; it is
 *     the gated, ceremony-focused lens on the ONE mechanism that matters most —
 *     the pre-kickoff commitment — and interlocks OUT to `/engine` for the rest.
 *   - `/api/verify/slate`: the public re-fold verifier. `/sealed` shows the
 *     commitment; `/verify/slate` proves it. Same disclosure policy, verbatim.
 *
 * FOUNDER-GATED (mirrors `PUBLISH_LEDGER` in `lib/ledger/ledger-view.ts`):
 * `loadSealedSlateView()` returns `{ published: false }` unless the
 * `SEALED_ENGINE_ENABLED` environment variable is the literal string `"true"`.
 * It defaults OFF, so nothing renders but the honest "being built" ritual until
 * a founder flips it in the deploy environment. Flipping the flag unlocks the
 * SHAPE only — never a fabricated commitment. Every commitment shown is a real,
 * persisted `SlateCommitment` row or it does not render (see
 * `renderableCommitmentOrNull`, the commitment analog of the ledger's
 * display-guard).
 *
 * METHOD-OPAQUE BY CONSTRUCTION (standing founder doctrine, CI-enforced):
 * outcomes and proofs are public; the recipe is not. This loader selects ONLY
 * cryptographic commitment facts — slateKey, root, count, committedAt. It never
 * selects a pick's payload, edge score, confidence, model version, gate reason,
 * factor breakdown, or any threshold. A competitor can read every byte of this
 * view and learn nothing about how the picks are made — and no pick's CONTENTS
 * leak, which is the whole point of sealing before kickoff. (The same three
 * public fields `/api/verify/slate` already discloses immediately: "root, count,
 * committedAt … Receipt PAYLOADS are NEVER returned here.")
 */

import { db } from "@sports/db";

/**
 * A published pre-kickoff commitment, method- AND content-opaque: the Merkle
 * `root` fingerprints the whole slate, `count` is the pre-registered population
 * size (the fixed denominator), and `committedAt` is when the root was published
 * — always BEFORE the first kickoff (`planSlateCommitment` refuses otherwise).
 * Nothing here reveals a single pick's selection, price, or confidence.
 */
export interface SealedCommitment {
  /** e.g. "AMERICANFOOTBALL_NFL:2026-09-14" — uppercase sport key + UTC day. */
  readonly slateKey: string;
  /** The published 64-hex Merkle root over every frozen receipt on the slate. */
  readonly root: string;
  /** Pre-registered population size — the fixed denominator, sealed in the root. */
  readonly count: number;
  /** ISO — when the root was published (before the first kickoff). */
  readonly committedAt: string;
}

export type SealedSlateView =
  | {
      readonly published: false;
      readonly reason: string;
    }
  | {
      readonly published: true;
      /** True when the database could not be reached — outage, not a verdict. */
      readonly unreachable: boolean;
      /** ISO — when this view was assembled (freshness stamp). */
      readonly generatedAt: string;
      /** The most recently sealed slates. Empty on a quiet day (nothing sealed yet). */
      readonly commitments: readonly SealedCommitment[];
    };

const UNPUBLISHED_REASON =
  "The Sealed Engine is founder-gated behind the SEALED_ENGINE_ENABLED environment variable, which defaults off. No commitment is published while it is unset.";

/** How many of the freshest sealed slates the ritual surfaces at once. */
const MAX_COMMITMENTS = 4;

/** SPORT:YYYY-MM-DD — the exact slate-key shape `/api/verify/slate` accepts. */
const SLATE_KEY_SHAPE = /^[A-Z][A-Z0-9_]*:\d{4}-\d{2}-\d{2}$/;
/** A published Merkle root is a bare sha256 digest — 64 hex, nothing else. */
const HEX64 = /^[0-9a-f]{64}$/i;

/**
 * The commitment analog of `renderableMetricOrNull` (ledger display-guard):
 * returns the row ONLY when it is a well-formed, real commitment — a valid
 * slate key, a 64-hex root, a positive integer population, and a parseable
 * publish timestamp. A corrupt or partial row renders NOTHING rather than a
 * fake-looking hash on an honesty surface. Zero fabricated commitments, ever.
 */
export function renderableCommitmentOrNull(row: {
  readonly slateKey: string;
  readonly root: string;
  readonly count: number;
  readonly committedAt: Date | string;
}): SealedCommitment | null {
  if (!SLATE_KEY_SHAPE.test(row.slateKey)) return null;
  if (!HEX64.test(row.root)) return null;
  if (!Number.isInteger(row.count) || row.count <= 0) return null;
  const committedAt = row.committedAt instanceof Date ? row.committedAt : new Date(row.committedAt);
  const iso = Number.isFinite(committedAt.getTime()) ? committedAt.toISOString() : null;
  if (iso === null) return null;
  return { slateKey: row.slateKey, root: row.root, count: row.count, committedAt: iso };
}

/**
 * Reads the founder gate and, when open, the current/next sealed slates. Async
 * because it reads the real `SlateCommitment` table — the moment the flag is on,
 * this is live data, never a fixture. `now` is injectable for a deterministic
 * `generatedAt` stamp (never `Date.now()` baked into the return shape).
 *
 * States doctrine (borrowed from `load-engine-story.ts`): a DB outage returns
 * `unreachable: true` — an outage is not a verdict — and an empty result returns
 * `commitments: []` (a quiet day, deliberate restraint, not brokenness). Neither
 * ever fabricates a commitment.
 */
export async function loadSealedSlateView(now: Date = new Date()): Promise<SealedSlateView> {
  if (process.env["SEALED_ENGINE_ENABLED"] !== "true") {
    return { published: false, reason: UNPUBLISHED_REASON };
  }

  const generatedAt = now.toISOString();

  try {
    const rows = await db.slateCommitment.findMany({
      // Cryptographic facts ONLY. root/count/committedAt/slateKey are the exact
      // fields `/api/verify/slate` discloses publicly; a pick's payload, edge,
      // confidence, model version, and gate reason are deliberately NOT here.
      select: { slateKey: true, root: true, count: true, committedAt: true },
      orderBy: { committedAt: "desc" },
      take: MAX_COMMITMENTS,
    });

    const commitments = rows
      .map(renderableCommitmentOrNull)
      .filter((c): c is SealedCommitment => c !== null);

    return { published: true, unreachable: false, generatedAt, commitments };
  } catch {
    return { published: true, unreachable: true, generatedAt, commitments: [] };
  }
}
