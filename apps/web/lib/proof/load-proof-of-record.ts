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
import { projectPublicMarket } from "@/lib/market/project-public-market";
import type { PickType } from "@sports/types";
import {
  projectCanonicalClv,
  type CanonicalClvProjection,
} from "@/lib/market/format-clv";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProofClvRead extends CanonicalClvProjection {
  readonly capturedAt: string;
}

export interface ProofLatestMarketConsensus {
  readonly read: ConsensusMarketRead;
  readonly capturedAt: string;
}

export interface ProofPickRow {
  /** DB pick id. */
  readonly id: string;
  readonly sport: string | null;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: string;
  readonly pickType: PickType;
  readonly publicMarket: { readonly selection: string; readonly line: number } | null;
  readonly generatedAt: string;
  /** ISO — when the game settled; null only for PUSH/VOID with no settledAt. */
  readonly settledAt: string | null;
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly modelVersion: string;
  readonly clv: ProofClvRead | null;
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
  readonly inclusionProof: MerkleProof;
  readonly latestMarketConsensus: ProofLatestMarketConsensus | null;
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
  /**
   * True when the ledger query could not be reached (DB outage). The loader
   * stays fail-safe — it never throws to the page — but sets this flag so the
   * proof surface can tell "temporarily unreachable" apart from "genuinely
   * empty" and never stamp a freshness time for a board that never loaded.
   * False on every healthy path, INCLUDING a genuinely empty ledger.
   */
  readonly ledgerUnreachable: boolean;
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
  // A REJECTED findMany means the ledger DB is unreachable — a distinct state
  // from a RESOLVED [] (a genuinely empty ledger). Capture that difference in a
  // flag instead of swallowing both into the same empty board, so the surface
  // can render "temporarily unreachable" rather than "no pick ever settled".
  // The loader stays fail-safe: it still never throws to the page.
  let ledgerUnreachable = false;
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
        clvKind: true,
        clvValue: true,
        clvCapturedAt: true,
      },
      orderBy: [{ settledAt: "desc" }, { id: "asc" }],
    })
    .catch(() => {
      ledgerUnreachable = true;
      return [];
    });

  if (ledgerUnreachable) {
    // The board never loaded. Do NOT synthesize a generatedAt or the empty-set
    // Merkle root here — both would be fabricated claims for a set we could not
    // read. Empty strings tell the page to show the unreachable card and
    // suppress the freshness stamp, keeping outage distinct from empty.
    return {
      generatedAt: "",
      picks: [],
      merkleRoot: "",
      totalSettled: 0,
      ledgerUnreachable: true,
    };
  }

  if (committed.length === 0) {
    return {
      generatedAt,
      picks: [],
      merkleRoot: sha256(""),
      totalSettled: 0,
      ledgerUnreachable: false,
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
    const pickType: PickType | null =
      pick.pickType === "SPREAD" ||
      pick.pickType === "TOTAL" ||
      pick.pickType === "MONEYLINE"
        ? pick.pickType
        : null;
    const result: ProofPickRow["result"] | null =
      pick.result === "WIN" ||
      pick.result === "LOSS" ||
      pick.result === "PUSH" ||
      pick.result === "VOID"
        ? pick.result
        : null;
    if (!pickType || !result) continue;
    const market = game
      ? projectPublicMarket({
          pickType,
          selection: pick.selection,
          line: pick.line,
          sport: game.sport.name,
          homeTeam: game.homeTeamName,
          awayTeam: game.awayTeamName,
        })
      : null;

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
    const consensus = marketRead
      ? {
          read: marketRead.consensus,
          capturedAt: marketRead.freshestFetchedAt,
        }
      : null;
    const clvProjection = game && pick.clvCapturedAt
      ? projectCanonicalClv({
          pickType,
          kind: pick.clvKind,
          value: pick.clvValue,
          verdict: pick.clvVerdict,
          sport: game.sport.name,
        })
      : null;

    pageRows.push({
      id: pick.id,
      sport: game?.sport?.name ?? null,
      homeTeamName: game?.homeTeamName ?? "—",
      awayTeamName: game?.awayTeamName ?? "—",
      commenceTime: game?.commenceTime?.toISOString() ?? "",
      pickType,
      publicMarket: market
        ? { selection: market.selection, line: market.line }
        : null,
      generatedAt: pick.generatedAt.toISOString(),
      settledAt: pick.settledAt?.toISOString() ?? null,
      result,
      modelVersion: pick.modelVersion,
      clv: clvProjection && pick.clvCapturedAt
        ? { ...clvProjection, capturedAt: pick.clvCapturedAt.toISOString() }
        : null,
      leafHash: hashLeaf(sha256, record),
      receiptHash: displayById.get(pick.id)?.proofReceipt?.contentHash ?? null,
      leafIndex: i,
      inclusionProof: proof,
      latestMarketConsensus: consensus,
    });
  }

  return {
    generatedAt,
    picks: pageRows,
    merkleRoot: root,
    totalSettled: committed.length,
    ledgerUnreachable: false,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
