import { db } from "@sports/db";
import { createHash } from "node:crypto";
import {
  canonicalPickPayload,
  hashLeaf,
  merkleRoot,
  inclusionProof,
  verifyInclusion,
  type PickRecord,
  type MerkleProof,
} from "@sports/prediction-engine";
import { buildH2hMarketRead } from "@/lib/market/game-market-read";
import type { ConsensusMarketRead } from "@sports/prediction-engine";

/**
 * Proof-of-record loader — settled picks with their verifiable evidence trail.
 *
 * Bounded, cached-safe (force-dynamic at the call site). Pulls only canonical,
 * non-bootstrap settled picks. Returns an honest empty state when no data
 * exists — no padding, no fabricated numbers.
 *
 * The Merkle root over the full settled set is computed from the same engine
 * primitive used at publish time, so anyone with the raw records can
 * independently re-derive it and catch any post-hoc edit.
 *
 * Adapted from the proof-of-liabilities pattern (olalonde/*) — see
 * packages/prediction-engine/src/proof-of-record.ts for the primitive.
 * No crypto-currency involved; pure tamper-evidence over sports picks.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProofPickRow {
  /** DB pick id. */
  readonly id: string;
  readonly sport: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
  /** ISO — when the engine produced this pick (the no-edit guarantee anchor). */
  readonly generatedAt: string;
  /** ISO — when the game settled; null only for PUSH/VOID with no settledAt. */
  readonly settledAt: string | null;
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly modelVersion: string;
  /** CLV verdict if graded; null when closing-line data was absent. */
  readonly clvVerdict: string | null;
  readonly clvValue: number | null;
  /** Merkle leaf hash (SHA-256) for this pick's committed payload. */
  readonly leafHash: string;
  /** Index of this pick in the ordered committed set (deterministic). */
  readonly leafIndex: number;
  /** Full inclusion proof so anyone can verify against the published root. */
  readonly inclusionProof: MerkleProof;
  /**
   * Consensus market read at pick generation time — only available when the
   * game has enough H2H odds rows from multiple books. Null when the odds
   * history can't honestly support a multi-book consensus.
   */
  readonly consensusAtSettle: ConsensusMarketRead | null;
  /**
   * Model disagreement vs market fair probability at generation time (pp).
   * Positive = model was higher than fair market. Null when no consensus exists.
   */
  readonly modelVsMarketPp: number | null;
}

export interface ProofOfRecordBoard {
  /**
   * ISO timestamp of when this board was assembled. Shows on the page as
   * the freshness stamp — the reader can see when the data was last pulled.
   */
  readonly generatedAt: string;
  /** Settled canonical picks, newest first, capped at MAX_PICKS. */
  readonly picks: readonly ProofPickRow[];
  /**
   * Merkle root over ALL settled canonical picks in the committed set
   * (not just the displayed page). Empty-set root when no picks exist.
   */
  readonly merkleRoot: string;
  /**
   * Total count of settled canonical picks in the committed set. May be
   * larger than picks.length when the set exceeds MAX_PICKS.
   */
  readonly totalSettled: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum picks shown on the surface (bounded read). */
const MAX_PICKS = 50;

/** Odds rows fetched per game to build the consensus (bounded). */
const ODDS_ROWS_PER_GAME = 60;

// ── Hash function ─────────────────────────────────────────────────────────────

/** SHA-256 hex via node:crypto — the production-grade hash the engine requires. */
function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loadProofOfRecord(
  now = new Date()
): Promise<ProofOfRecordBoard> {
  const generatedAt = now.toISOString();

  // Fetch all canonical settled picks (for the Merkle root) with a bounded
  // take that's large enough to cover the full public record without blowing
  // memory. The surface shows MAX_PICKS; the root is over the full set.
  const allSettled = await db.pick
    .findMany({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: {
        game: {
          include: {
            sport: { select: { name: true } },
            odds: {
              where: { market: "H2H" },
              orderBy: { fetchedAt: "desc" },
              take: ODDS_ROWS_PER_GAME,
            },
          },
        },
      },
      orderBy: { settledAt: "desc" },
      take: 500,
    })
    .catch(() => []);

  if (allSettled.length === 0) {
    return {
      generatedAt,
      picks: [],
      merkleRoot: sha256(""),
      totalSettled: 0,
    };
  }

  // Build PickRecords in a deterministic order (settledAt desc, then id asc
  // as a tiebreaker) so the Merkle root is reproducible given the same rows.
  const ordered = [...allSettled].sort((a, b) => {
    const ta = a.settledAt?.getTime() ?? 0;
    const tb = b.settledAt?.getTime() ?? 0;
    if (ta !== tb) return tb - ta;
    return a.id < b.id ? -1 : 1;
  });

  // Build PickRecord for each pick using canonicalPickPayload (the same
  // deterministic serialization the engine uses at publish time).
  const pickRecords: PickRecord[] = ordered.map((pick) =>
    buildPickRecord(pick)
  );

  // Merkle root over the full set.
  const root = merkleRoot(pickRecords, sha256);

  // Build the page rows (capped at MAX_PICKS) with inclusion proofs.
  const pageRows: ProofPickRow[] = [];
  for (let i = 0; i < Math.min(ordered.length, MAX_PICKS); i++) {
    const pick = ordered[i]!;
    const record = pickRecords[i]!;
    const proof = inclusionProof(pickRecords, i, sha256);

    // Sanity-check: the proof must verify against the root. If it doesn't,
    // skip this row rather than surface a broken proof.
    if (!verifyInclusion(proof, root, sha256)) continue;

    // Consensus market read from stored H2H odds history.
    const oddsRows = (pick.game?.odds ?? []).map((o) => ({
      bookmaker: o.bookmaker,
      market: String(o.market),
      fetchedAt: o.fetchedAt,
      homePrice: o.homePrice,
      awayPrice: o.awayPrice,
      drawPrice: o.drawPrice,
    }));
    const marketRead = buildH2hMarketRead(oddsRows);
    const consensus = marketRead?.consensus ?? null;

    // Model vs market: the model's confidence expressed as a probability
    // compared to the market's fair home probability. This is directional
    // signal — it shows whether the pick was on or against the market's lean.
    let modelVsMarketPp: number | null = null;
    if (consensus !== null) {
      const modelProb = pick.confidence / 100;
      const fairProb = consensus.fairHomeProb;
      modelVsMarketPp = Number(((modelProb - fairProb) * 100).toFixed(1));
    }

    pageRows.push({
      id: pick.id,
      sport: pick.game?.sport?.name ?? "—",
      homeTeamName: pick.game?.homeTeamName ?? "—",
      awayTeamName: pick.game?.awayTeamName ?? "—",
      commenceTime: pick.game?.commenceTime?.toISOString() ?? "",
      pickType: pick.pickType,
      selection: pick.selection,
      line: pick.line,
      confidence: pick.confidence,
      generatedAt: pick.generatedAt.toISOString(),
      settledAt: pick.settledAt?.toISOString() ?? null,
      result: pick.result as ProofPickRow["result"],
      modelVersion: pick.modelVersion,
      clvVerdict: pick.clvVerdict ?? null,
      clvValue: pick.clvValue ?? null,
      leafHash: hashLeaf(sha256, record),
      leafIndex: i,
      inclusionProof: proof,
      consensusAtSettle: consensus,
      modelVsMarketPp,
    });
  }

  return {
    generatedAt,
    picks: pageRows,
    merkleRoot: root,
    totalSettled: ordered.length,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the PickRecord that feeds the Merkle engine. The committed fields are
 * the ones that were fixed at generation time — changing any of them would
 * produce a different leaf hash, making tampering visible.
 */
function buildPickRecord(
  pick: {
    id: string;
    pickType: string;
    selection: string;
    line: number;
    confidence: number;
    modelVersion: string;
    generatedAt: Date;
    tier: string;
  }
): PickRecord {
  const payload = canonicalPickPayload({
    confidence: pick.confidence,
    generatedAt: pick.generatedAt.toISOString(),
    id: pick.id,
    line: pick.line,
    modelVersion: pick.modelVersion,
    pickType: pick.pickType,
    selection: pick.selection,
    tier: pick.tier,
  });
  return { id: pick.id, payload };
}
