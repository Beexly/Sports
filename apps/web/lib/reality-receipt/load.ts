/**
 * Reality Receipt v0 — the loader (W003). Impure boundary: DB reads + the
 * OTS anchor lookup live here so build.ts/card.ts stay pure and trivially
 * testable.
 *
 * Reuses (never edits) the W001 evidence-spine primitives — `gameRoomEvidenceRecord`
 * and `buildRoomEvidenceEnvelope` — with the SAME fail-closed, FREE-tier-only
 * pick filter Game Room's public viewer already applies. This route accepts
 * no viewer/entitlement input: it is a public, `gameId`-keyed discovery
 * surface (unlike `/api/verify`, which only confirms a hash you already
 * hold), so restricting to FREE-tier picks is what stops a kicked-off/settled
 * PRO or ELITE pick's committed fields from opening to a non-paying visitor.
 *
 * The DB query below intentionally duplicates `lib/game-room/load.ts`'s query
 * shape rather than importing it — that file is a protected, tested,
 * entitlement-bearing surface and this workstream's contract forbids editing
 * it. See WORKSTREAM_003_REALITY_RECEIPT_V0.md.
 */

import { createHash } from "node:crypto";
import { db } from "@sports/db";
import { deserializeDetached, isBitcoinAttested, otsStatus } from "@sports/crypto";
import { buildRoomEvidenceEnvelope } from "@/lib/intelligence-playback";
import { gameRoomEvidenceRecord, type GameRoomDbRecord } from "@/lib/game-room/evidence-record";
import type { ReceiptForVerification } from "@/lib/proof/receipt-proof";
import { buildRealityReceipt } from "./build";
import type { RealityReceiptAnchor } from "./types";
import type { RealityReceiptLoad } from "./load-types";

export type { RealityReceiptLoad, RealityReceiptLoadFailureReason } from "./load-types";

function sha256(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function isMissingOtsColumn(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  const message = error instanceof Error ? error.message : String(error);
  return code === "P2022" || /otsProof|column .* does not exist/i.test(message);
}

/**
 * Resolve the Bitcoin-anchor leg for one slate. Fail-open by contract: any
 * lookup/parse failure degrades to an honest UNAVAILABLE/NO_PROOF state, it
 * never throws and never blocks the rest of the Reality Receipt from
 * assembling — the anchor is an upgrade layered on top, exactly like the
 * mint-path wiring in W-OTS slice 2.
 */
async function loadAnchorStatus(slateKey: string | null): Promise<RealityReceiptAnchor> {
  if (!slateKey) return { state: "NOT_REQUESTED" };

  let row: { otsProof: Uint8Array | null } | null;
  try {
    row = (await db.slateCommitment.findUnique({
      where: { slateKey },
      select: { otsProof: true },
    })) as { otsProof: Uint8Array | null } | null;
  } catch (error) {
    return { state: isMissingOtsColumn(error) ? "NOT_MIGRATED" : "UNAVAILABLE" };
  }

  if (!row?.otsProof || row.otsProof.length === 0) return { state: "NO_PROOF" };

  try {
    const parsed = deserializeDetached(new Uint8Array(row.otsProof));
    const status = otsStatus(parsed);
    return isBitcoinAttested(parsed)
      ? { state: "BITCOIN_ATTESTED", slateKey, bitcoinBlockHeights: status.bitcoin }
      : { state: "PENDING", slateKey, pendingCalendars: status.pendingCalendars };
  } catch {
    return { state: "UNAVAILABLE" };
  }
}

export async function loadRealityReceipt(gameId: string, now: Date = new Date()): Promise<RealityReceiptLoad> {
  let game: GameRoomDbRecord | null;
  try {
    game = (await db.game.findUnique({
      where: { id: gameId },
      include: {
        sport: { select: { name: true } },
        picks: {
          where: { isPublished: true, isBootstrap: false, NOT: { modelVersion: "v5.0.0-seed" }, tier: "FREE" },
          include: { signalSnapshot: true, lossAutopsy: true, proofReceipt: true },
          orderBy: [{ generatedAt: "desc" }],
          take: 1,
        },
        gameSignals: { orderBy: { fetchedAt: "desc" }, take: 25 },
        gateDecisions: { where: { isBootstrap: false }, orderBy: { evaluatedAt: "desc" }, take: 10 },
        odds: {
          select: {
            id: true,
            ingestionRunId: true,
            bookmaker: true,
            market: true,
            fetchedAt: true,
            spread: true,
            total: true,
            homePrice: true,
            awayPrice: true,
            ingestionRun: {
              select: {
                status: true,
                sourceSnapshots: {
                  select: {
                    id: true,
                    ingestionRunId: true,
                    provider: true,
                    sourceKind: true,
                    fetchedAt: true,
                    payloadHash: true,
                  },
                  orderBy: { fetchedAt: "desc" },
                  take: 10,
                },
              },
            },
          },
          orderBy: { fetchedAt: "desc" },
          take: 120,
        },
      },
    })) as GameRoomDbRecord | null;
  } catch {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  if (!game) return { ok: false, reason: "NOT_FOUND" };

  const primaryPick = game.picks[0] ?? null;
  const record = gameRoomEvidenceRecord(game, primaryPick);
  const envelope = buildRoomEvidenceEnvelope(record, sha256);
  if (!envelope) return { ok: false, reason: "NO_DECISION" };

  const receiptRow: ReceiptForVerification | null = primaryPick?.proofReceipt
    ? {
        pickId: primaryPick.proofReceipt.pickId,
        payload: primaryPick.proofReceipt.payload,
        contentHash: primaryPick.proofReceipt.contentHash,
        line: primaryPick.proofReceipt.line,
        entryOdds: primaryPick.proofReceipt.entryOdds,
        marketFairProb: primaryPick.proofReceipt.marketFairProb,
        confidence: primaryPick.proofReceipt.confidence,
        edgeScore: primaryPick.proofReceipt.edgeScore,
        modelProb: primaryPick.proofReceipt.modelProb,
        modelVersion: primaryPick.proofReceipt.modelVersion,
        asOf: primaryPick.proofReceipt.asOf,
      }
    : null;

  const anchor = await loadAnchorStatus(primaryPick?.proofReceipt?.slateKey ?? null);

  return { ok: true, receipt: buildRealityReceipt({ envelope, receiptRow, anchor, now }, sha256) };
}
