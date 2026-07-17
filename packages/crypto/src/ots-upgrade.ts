/**
 * OTS upgrade — turn pending calendar attestations into Bitcoin block-header
 * attestations (W-OTS slice 3).
 *
 * Protocol (mirrors the reference `ots upgrade`): every pending attestation
 * sits at the end of an op path from the file digest. Applying the ops
 * (sha256 / append / prepend) down the tree yields the exact COMMITMENT bytes
 * the calendar knows the timestamp by; GET `<calendar>/timestamp/<hex>`
 * returns a serialized timestamp subtree for that commitment which — once the
 * calendar's aggregation reached the chain — contains a Bitcoin attestation.
 * We graft that subtree in place of the pending marker.
 *
 * Additions live in THIS file so the verbatim packet port (ots-anchor.ts)
 * stays byte-untouched; only its exported surface is consumed. Conservative
 * by design:
 *   - a calendar failure or a still-pending reply leaves the original pending
 *     marker exactly as it was (re-poll later; nothing lost),
 *   - the graft is applied only when the returned subtree actually carries a
 *     Bitcoin attestation,
 *   - the input detached timestamp is NEVER mutated — upgrade returns a new
 *     structure (callers persist the new bytes only on real progress).
 *
 * Transport is injected — no hidden HTTP (same rule as submitToCalendars).
 */

import { createHash } from "node:crypto";
import {
  ByteReader,
  bytesToHex,
  deserializeTimestampNode,
  hexToBytes,
  type Attestation,
  type CalendarTransport,
  type Op,
  type TimestampNode,
} from "./ots-anchor.js";

function sha256Bytes(input: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(input).digest());
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** Apply one op to the running commitment bytes (reference semantics). */
export function applyOp(bytes: Uint8Array, op: Op): Uint8Array {
  switch (op.op) {
    case "sha256":
      return sha256Bytes(bytes);
    case "append":
      return concatBytes(bytes, op.data);
    case "prepend":
      return concatBytes(op.data, bytes);
  }
}

function cloneNode(node: TimestampNode): TimestampNode {
  return {
    attestations: node.attestations.map((a) =>
      a.kind === "unknown" ? { kind: "unknown", tag: new Uint8Array(a.tag), payload: new Uint8Array(a.payload) } : { ...a },
    ),
    ops: node.ops.map((e) => ({
      op: e.op.op === "sha256" ? { op: "sha256" } : { op: e.op.op, data: new Uint8Array(e.op.data) },
      child: cloneNode(e.child),
    })),
  };
}

function subtreeHasBitcoin(node: TimestampNode): boolean {
  if (node.attestations.some((a) => a.kind === "bitcoin")) return true;
  return node.ops.some((e) => subtreeHasBitcoin(e.child));
}

function collectBitcoinHeights(node: TimestampNode, out: number[]): void {
  for (const a of node.attestations) if (a.kind === "bitcoin") out.push(a.height);
  for (const e of node.ops) collectBitcoinHeights(e.child, out);
}

export interface DetachedLike {
  readonly digestHex: string;
  readonly root: TimestampNode;
}

export interface UpgradeResult {
  /** New structure (input untouched). Identical content when nothing upgraded. */
  readonly detached: DetachedLike;
  /** True iff at least one pending attestation was replaced by a Bitcoin-bearing subtree. */
  readonly upgraded: boolean;
  readonly bitcoinHeights: readonly number[];
  /** Calendars that failed or were still pending this round (retry later). */
  readonly stillPending: readonly string[];
}

/**
 * Attempt to upgrade every pending attestation via its calendar. Never throws;
 * per-calendar failures degrade to keeping the pending marker.
 */
export async function upgradeDetached(
  detached: DetachedLike,
  transport: CalendarTransport,
): Promise<UpgradeResult> {
  const root = cloneNode(detached.root);
  const stillPending: string[] = [];
  let upgraded = false;

  async function walk(node: TimestampNode, commitment: Uint8Array): Promise<void> {
    const rebuilt: Attestation[] = [];
    for (const att of [...node.attestations]) {
      if (att.kind !== "pending") {
        rebuilt.push(att);
        continue;
      }
      try {
        const url = `${att.uri.replace(/\/$/, "")}/timestamp/${bytesToHex(commitment)}`;
        const resp = await transport.fetchBinary(url, new Uint8Array(0));
        const subtree = deserializeTimestampNode(new ByteReader(resp));
        if (subtreeHasBitcoin(subtree)) {
          // Graft the calendar's completed path in place of the pending marker:
          // its ops become children of THIS node; its non-pending attestations
          // (typically the Bitcoin one) replace the marker.
          node.ops.push(...subtree.ops);
          rebuilt.push(...subtree.attestations.filter((a) => a.kind !== "pending"));
          upgraded = true;
        } else {
          rebuilt.push(att); // calendar still aggregating — try again later
          stillPending.push(att.uri);
        }
      } catch {
        rebuilt.push(att); // network/parse failure — keep the valid pending marker
        stillPending.push(att.uri);
      }
    }
    node.attestations = rebuilt;
    // Walk every child (including freshly grafted subtrees — their deeper
    // pending markers, if any, get their own upgrade attempts).
    for (const e of node.ops) {
      await walk(e.child, applyOp(commitment, e.op));
    }
  }

  await walk(root, hexToBytes(detached.digestHex));

  const heights: number[] = [];
  collectBitcoinHeights(root, heights);
  return {
    detached: { digestHex: detached.digestHex, root },
    upgraded,
    bitcoinHeights: [...new Set(heights)].sort((a, b) => a - b),
    stillPending,
  };
}
