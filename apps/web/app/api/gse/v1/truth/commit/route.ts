import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import week10Commitment from "../../../../../../../../data/public-ledger/week10_prekickoff_commitment.json";
import glassLedger from "../../../../../../../../data/public-ledger/glass_ledger_reconciled_2026.json";

export interface TruthCommitRequest {
  eventId: string;
  matchup: string;
  kickoffUtc: string;
  effectiveAtUtc?: string;
  issuer?: string;
  predictions: Record<string, unknown>;
}

export interface TruthCommitReceipt {
  schema: "gse_truth_commit_receipt_v1";
  status: "SEALED_PRE_KICKOFF";
  eventId: string;
  matchup: string;
  issuer: string;
  effectiveAtUtc: string;
  kickoffUtc: string;
  leadTimeSeconds: number;
  canonicalPayloadSha256: string;
  week10MerkleRootSha256: string;
  verifyCommand: string;
}

function canonicalJsonSha256(value: unknown): string {
  const sortRecursive = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(sortRecursive);
    }
    if (input !== null && typeof input === "object") {
      const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b),
      );
      const out: Record<string, unknown> = {};
      for (const [k, v] of entries) {
        out[k] = sortRecursive(v);
      }
      return out;
    }
    return input;
  };
  const canonical = JSON.stringify(sortRecursive(value));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      schema: "gse_glass_ledger_truth_commit_index_v1",
      activeWeek: week10Commitment.week,
      season: week10Commitment.season,
      sealedAtUtc: week10Commitment.sealed_at_utc,
      firstKickoffUtc: week10Commitment.first_kickoff_utc,
      preKickoffTemporalOrderingVerified: week10Commitment.pre_kickoff_temporal_ordering_verified,
      week10MerkleRootSha256: week10Commitment.merkle_root_sha256,
      reconciledLedgerSha256: glassLedger.ledger_sha256,
      scopes: glassLedger.scopes,
      gamesCount: week10Commitment.games_count,
      games: week10Commitment.games,
      verifyCommand: "python scripts/audit/recompute_public_ledger.py --strict",
    },
    { status: 200 },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const requiredApiKey = process.env.GSE_TRUTH_COMMIT_API_KEY;
  if (requiredApiKey) {
    const providedKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (providedKey !== requiredApiKey) {
      return NextResponse.json(
        { error: "UNAUTHORIZED_API_KEY", message: "Valid GSE_TRUTH_COMMIT_API_KEY required." },
        { status: 401 },
      );
    }
  }

  let body: Partial<TruthCommitRequest>;
  try {
    body = (await request.json()) as Partial<TruthCommitRequest>;
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const eventId = String(body.eventId ?? "").trim();
  const matchup = String(body.matchup ?? "").trim();
  const kickoffUtc = String(body.kickoffUtc ?? "").trim();
  const effectiveAtUtc = String(body.effectiveAtUtc ?? new Date().toISOString()).trim();
  const issuer = String(body.issuer ?? "external-pilot").trim();

  if (!eventId || !matchup || !kickoffUtc || !body.predictions || typeof body.predictions !== "object") {
    return NextResponse.json(
      {
        error: "MISSING_FIELDS",
        message: "eventId, matchup, kickoffUtc, and predictions object are required.",
      },
      { status: 400 },
    );
  }

  const kickoffMs = Date.parse(kickoffUtc);
  const effectiveMs = Date.parse(effectiveAtUtc);
  if (Number.isNaN(kickoffMs) || Number.isNaN(effectiveMs)) {
    return NextResponse.json(
      {
        error: "INVALID_TIMESTAMP",
        message: "kickoffUtc and effectiveAtUtc must be valid ISO-8601 UTC timestamps.",
      },
      { status: 400 },
    );
  }

  if (effectiveMs >= kickoffMs) {
    return NextResponse.json(
      {
        error: "WINDOW_LOCKED",
        message: `Cannot seal prediction at or after kickoff (${effectiveAtUtc} >= ${kickoffUtc}). Pre-kickoff temporal ordering is strictly enforced.`,
        eventId,
        matchup,
        effectiveAtUtc,
        kickoffUtc,
      },
      { status: 409 },
    );
  }

  const canonicalDigest = canonicalJsonSha256({
    eventId,
    matchup,
    issuer,
    effectiveAtUtc,
    kickoffUtc,
    predictions: body.predictions,
  });

  const receipt: TruthCommitReceipt = {
    schema: "gse_truth_commit_receipt_v1",
    status: "SEALED_PRE_KICKOFF",
    eventId,
    matchup,
    issuer,
    effectiveAtUtc,
    kickoffUtc,
    leadTimeSeconds: Math.floor((kickoffMs - effectiveMs) / 1000),
    canonicalPayloadSha256: canonicalDigest,
    week10MerkleRootSha256: week10Commitment.merkle_root_sha256,
    verifyCommand: "python scripts/audit/recompute_public_ledger.py --strict",
  };

  return NextResponse.json(receipt, { status: 201 });
}
