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
  /**
   * The pick-proof RECEIPT hash (pickProofReceipt.contentHash) — the hash the
   * public /verify console looks up. Distinct from leafHash: the receipt
   * payload is FROZEN at mint time while the Merkle leaf is recomputed from
   * current fields, and picks minted before the receipt spine (or without
   * market data) have no receipt. Null when this pick carries no receipt —
   * the UI must not route hashless rows to the verifier.
   */
  readonly receiptHash: string | null;
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

  // The COMPLETE committed set for the Merkle root — lightweight (no odds joins), in a
  // stable order so the root is reproducible. NO take cap: the root and totalSettled must
  // cover ALL settled canonical picks, exactly as the /proof page claims. (Previously
  // capped at 500, which silently dropped the oldest picks once the record grew — the root
  // then committed over fewer rows than stated.) The heavy game+odds data is fetched only
  // for the MAX_PICKS rows actually displayed, below.
  const committed = await db.pick
    .findMany({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      select: {
        id: true,
        pickType: true,
        selection: true,
        line: true,
        confidence: true,
        modelVersion: true,
        generatedAt: true,
        tier: true,
        settledAt: true,
        result: true,
        clvVerdict: true,
        clvValue: true,
      },
      orderBy: [{ settledAt: "desc" }, { id: "asc" }],
    });
  // NO catch on this read (T-outage-sweep): a DB failure must THROW into the
  // /proof page's ledgerUnreachable handler — the designed outage state that
  // already exists there. The old `.catch(() => [])` swallowed the error, so
  // an outage rendered the honest-EMPTY state instead: "0 settled picks" and
  // a sha256("") root, on the platform's trust surface. An outage must never
  // read as "no record was ever committed".

  if (committed.length === 0) {
    return {
      generatedAt,
      picks: [],
      merkleRoot: sha256(""),
      totalSettled: 0,
    };
  }

  // Merkle root + leaves over the FULL committed set (committed is already in the
  // deterministic settledAt-desc, id-asc order the root requires).
  const pickRecords: PickRecord[] = committed.map((pick) => buildPickRecord(pick));
  const root = merkleRoot(pickRecords, sha256);

  // Enrich only the displayed rows (top MAX_PICKS of the committed set) with game + H2H
  // odds for the consensus read. Fetched by id, mapped back, so the displayed rows are
  // exactly the first MAX_PICKS committed leaves — no ordering drift between two queries.
  const topIds = committed.slice(0, MAX_PICKS).map((p) => p.id);
  const displayRows = topIds.length
    ? await db.pick
        .findMany({
          where: { id: { in: topIds } },
          select: {
            id: true,
            proofReceipt: { select: { contentHash: true } },
            game: {
              select: {
                homeTeamName: true,
                awayTeamName: true,
                commenceTime: true,
                sport: { select: { name: true } },
                odds: {
                  where: { market: "H2H" },
                  orderBy: { fetchedAt: "desc" },
                  take: ODDS_ROWS_PER_GAME,
                },
              },
            },
          },
        })
        // This catch STAYS (unlike the committed-set read above): it is display
        // ENRICHMENT only. On failure the rows still render the true ledger data
        // (selection, result, root, inclusion proofs) with "—" placeholders for
        // the game fields — honest degradation, not a fabricated empty record.
        .catch(() => [])
    : [];
  const displayById = new Map(displayRows.map((d) => [d.id, d]));

  // Build the page rows (capped at MAX_PICKS) with inclusion proofs.
  const pageRows: ProofPickRow[] = [];
  for (let i = 0; i < Math.min(committed.length, MAX_PICKS); i++) {
    const pick = committed[i]!;
    const record = pickRecords[i]!;
    const proof = inclusionProof(pickRecords, i, sha256);

    // Sanity-check: the proof must verify against the root. If it doesn't,
    // skip this row rather than surface a broken proof.
    if (!verifyInclusion(proof, root, sha256)) continue;

    const game = displayById.get(pick.id)?.game ?? null;

    // Consensus market read from stored H2H odds history.
    const oddsRows = (game?.odds ?? []).map((o) => ({
      bookmaker: o.bookmaker,
      market: String(o.market),
      fetchedAt: o.fetchedAt,
      homePrice: o.homePrice,
      awayPrice: o.awayPrice,
      drawPrice: o.drawPrice,
    }));
    const marketRead = buildH2hMarketRead(oddsRows);
    const consensus = marketRead?.consensus ?? null;

    // Model vs market: ONLY meaningful for MONEYLINE picks — the consensus is an H2H read,
    // so compare the model's confidence to the fair prob of the SIDE actually picked.
    // SPREAD/TOTAL picks have no like-for-like H2H probability, so leave it null rather
    // than print a number that mixes two unrelated quantities.
    let modelVsMarketPp: number | null = null;
    if (consensus !== null && pick.pickType === "MONEYLINE") {
      const fairProb =
        pick.selection === game?.homeTeamName
          ? consensus.fairHomeProb
          : pick.selection === game?.awayTeamName
            ? consensus.fairAwayProb
            : null;
      if (fairProb !== null) {
        modelVsMarketPp = Number(((pick.confidence / 100 - fairProb) * 100).toFixed(1));
      }
    }

    pageRows.push({
      id: pick.id,
      sport: game?.sport?.name ?? "—",
      homeTeamName: game?.homeTeamName ?? "—",
      awayTeamName: game?.awayTeamName ?? "—",
      commenceTime: game?.commenceTime?.toISOString() ?? "",
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
      receiptHash: displayById.get(pick.id)?.proofReceipt?.contentHash ?? null,
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
    totalSettled: committed.length,
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
