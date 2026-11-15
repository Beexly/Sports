/**
 * verify-ledger — recompute the sealed GSE ledger straight from Neon.
 *
 * THE LAW: every number on /record and /calibration must be recomputable by
 * this script from picks + games + pick_settlement_events (+ pick_proof_receipts
 * for the pre-kickoff commitment hashes). The pages render ONLY the artifact
 * this script writes (apps/web/lib/ledger/verified-ledger.json). No hardcoded
 * counts anywhere.
 *
 * Run:  npm run verify:ledger        (from repo root)
 *
 * Transports (read-only, in priority order):
 *   1. DATABASE_URL set  -> Prisma $queryRawUnsafe (deploy path).
 *   2. neon CLI          -> `neon psql main --project-id ... --role-name hermes_ro`
 *                           (local verification path; the role is read-only).
 * No connection string is ever printed.
 *
 * Scope definitions (also embedded in the artifact):
 *   - Sealed pipeline ledger: every pick with an official settlement event
 *     (pick_settlement_events). W/L/P from picks.result, cross-checked against
 *     the event's result.
 *   - Official record: published PREMIUM-tier STRONG_PLAY / ELITE_PLAY picks.
 *   - Calibration gate: official plays that are settled AND CLV-backed
 *     (closing line or price recorded). Win rate stays locked until >= 200.
 *   - Units: flat 1u stake; WIN at the recorded lock price (American),
 *     LOSS -1u, PUSH 0u. Picks without a recorded price are counted but
 *     excluded from the units total (coverage reported, never invented).
 *   - Commitments: SHA-256 of the frozen receipt payload must equal the
 *     stored contentHash AND frozenAt must precede kickoff.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  CALIBRATION_TARGET,
  americanToDecimal,
  calibrationGate,
  confidenceBuckets,
  countWlp,
  isClvBacked,
  isOfficialPlay,
  isSettledResult,
  recomputeClv,
  round2,
  round4,
  unitProfit,
  type ClvMarket,
} from "../apps/web/lib/ledger/verify-math";

const ROOT = existsSync(path.join(process.cwd(), "apps/web"))
  ? process.cwd()
  : path.resolve(__dirname, "..");
const ARTIFACT_PATH = path.join(ROOT, "apps/web/lib/ledger/verified-ledger.json");
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID ?? "summer-brook-99380762";
const NEON_BRANCH = process.env.NEON_BRANCH ?? "main";
const NEON_ROLE = process.env.NEON_ROLE ?? "hermes_ro";
const RECENT_WINDOW_HOURS = 48;

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

interface Transport {
  readonly name: string;
  query(sql: string): Promise<Row[]>;
  close(): Promise<void>;
}

/** Wrap a SELECT so Postgres itself returns one JSON document. */
function jsonSql(sql: string): string {
  return `SELECT COALESCE(json_agg(t)::text, '[]') AS payload FROM (${sql}) t`;
}

function parseJsonPayload(raw: string): Row[] {
  // The embedded psql hard-wraps long output; whitespace between JSON tokens
  // is legal, so join lines and parse. String literals in the ledger never
  // contain newlines (payloads are single-line pipe-delimited text).
  const joined = raw
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("INFO:") && line.trim().length > 0)
    .join("\n")
    .trim();
  if (joined.length === 0) return [];
  const parsed = JSON.parse(joined) as unknown;
  if (!Array.isArray(parsed)) throw new Error("verify-ledger: expected JSON array from query");
  return parsed as Row[];
}

function neonCliEntry(): string | null {
  const appData = process.env.APPDATA;
  if (!appData) return null;
  const entry = path.join(appData, "npm", "node_modules", "neonctl", "bin", "cli.js");
  return existsSync(entry) ? entry : null;
}

function createNeonTransport(): Transport {
  const entry = neonCliEntry();
  return {
    name: `neon-readonly (project ${NEON_PROJECT_ID}, role ${NEON_ROLE})`,
    async query(sql: string): Promise<Row[]> {
      const args = [
        "psql",
        NEON_BRANCH,
        "--project-id",
        NEON_PROJECT_ID,
        "--role-name",
        NEON_ROLE,
        "--",
        "-At",
        "-c",
        jsonSql(sql),
      ];
      const result =
        entry !== null
          ? spawnSync(process.execPath, [entry, ...args], {
              encoding: "utf8",
              maxBuffer: 256 * 1024 * 1024,
              timeout: 240_000,
            })
          : spawnSync("neon", args, {
              shell: true,
              encoding: "utf8",
              maxBuffer: 256 * 1024 * 1024,
              timeout: 240_000,
            });
      if (result.status !== 0) {
        throw new Error(
          `verify-ledger: neon query failed (exit ${result.status}): ${(result.stderr ?? "").slice(0, 400)}`,
        );
      }
      return parseJsonPayload(result.stdout ?? "");
    },
    async close(): Promise<void> {},
  };
}

async function createPrismaTransport(): Promise<Transport> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  return {
    name: "prisma (DATABASE_URL, read-only queries)",
    async query(sql: string): Promise<Row[]> {
      const rows = (await prisma.$queryRawUnsafe(jsonSql(sql))) as Array<{ payload: string }>;
      const payload = rows[0]?.payload ?? "[]";
      return JSON.parse(payload) as Row[];
    },
    async close(): Promise<void> {
      await prisma.$disconnect();
    },
  };
}

async function createTransport(): Promise<Transport> {
  if (process.env.DATABASE_URL) return createPrismaTransport();
  return createNeonTransport();
}

// ---------------------------------------------------------------------------
// Row shapes + helpers
// ---------------------------------------------------------------------------

interface LedgerRow {
  id: string;
  pickType: string;
  selection: string;
  line: number | null;
  result: string;
  settledAt: string | null;
  isPublished: boolean;
  tier: string;
  pickGrade: string;
  confidence: number | null;
  clvLockLine: number | null;
  clvLockPrice: number | null;
  clvCloseLine: number | null;
  clvClosePrice: number | null;
  clvValue: number | null;
  clvVerdict: string | null;
  gameId: string;
  commenceTime: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  gameStatus: string | null;
  homeScore: number | null;
  awayScore: number | null;
  eventResult: string;
  contentHash: string | null;
  frozenAt: string | null;
  entryOdds: number | null;
}

interface ReceiptRow {
  pickId: string;
  contentHash: string;
  payload: string;
  frozenAt: string | null;
}

/** DB timestamps are naive UTC ("2026-11-13 03:00:00"). Parse as UTC. */
function parseDbTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(withZone);
  return Number.isFinite(d.getTime()) ? d : null;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function marketOf(pickType: string): ClvMarket {
  if (pickType === "SPREAD" || pickType === "TOTAL" || pickType === "MONEYLINE") return pickType;
  return "OTHER";
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const LEDGER_SQL = `
  SELECT p.id, p."pickType"::text AS "pickType", p.selection, p.line,
         p.result::text AS result, p."settledAt"::text AS "settledAt",
         p."isPublished", p.tier::text AS tier, p."pickGrade"::text AS "pickGrade",
         p.confidence, p."clvLockLine", p."clvLockPrice", p."clvCloseLine",
         p."clvClosePrice", p."clvValue", p."clvVerdict", p."gameId",
         g."commenceTime"::text AS "commenceTime", g."homeTeamName", g."awayTeamName",
         g.status::text AS "gameStatus", g."homeScore", g."awayScore",
         e.result::text AS "eventResult",
         r."contentHash", r."frozenAt"::text AS "frozenAt", r."entryOdds"
  FROM picks p
  JOIN pick_settlement_events e ON e."pickId" = p.id
  JOIN games g ON g.id = p."gameId"
  LEFT JOIN pick_proof_receipts r ON r."pickId" = p.id
`;

const RECEIPTS_SQL = `
  SELECT "pickId", "contentHash", payload::text AS payload, "frozenAt"::text AS "frozenAt"
  FROM pick_proof_receipts
`;

const SLATE_COMMITMENTS_SQL = `
  SELECT "slateKey", root, count, "committedAt"::text AS "committedAt"
  FROM slate_commitments
  ORDER BY "committedAt" DESC
  LIMIT 5
`;

async function main(): Promise<void> {
  const transport = await createTransport();
  const generatedAt = new Date();
  console.info(`verify-ledger: transport = ${transport.name}`);

  let ledgerRaw: Row[];
  let receiptsRaw: Row[];
  let slatesRaw: Row[];
  try {
    ledgerRaw = await transport.query(LEDGER_SQL);
    receiptsRaw = await transport.query(RECEIPTS_SQL);
    slatesRaw = await transport.query(SLATE_COMMITMENTS_SQL);
  } finally {
    await transport.close();
  }

  const rows: LedgerRow[] = ledgerRaw.map((r) => ({
    id: String(r.id),
    pickType: String(r.pickType ?? ""),
    selection: String(r.selection ?? ""),
    line: num(r.line),
    result: String(r.result ?? ""),
    settledAt: str(r.settledAt),
    isPublished: r.isPublished === true || r.isPublished === "true",
    tier: String(r.tier ?? ""),
    pickGrade: String(r.pickGrade ?? ""),
    confidence: num(r.confidence),
    clvLockLine: num(r.clvLockLine),
    clvLockPrice: num(r.clvLockPrice),
    clvCloseLine: num(r.clvCloseLine),
    clvClosePrice: num(r.clvClosePrice),
    clvValue: num(r.clvValue),
    clvVerdict: str(r.clvVerdict),
    gameId: String(r.gameId ?? ""),
    commenceTime: str(r.commenceTime),
    homeTeamName: str(r.homeTeamName),
    awayTeamName: str(r.awayTeamName),
    gameStatus: str(r.gameStatus),
    homeScore: num(r.homeScore),
    awayScore: num(r.awayScore),
    eventResult: String(r.eventResult ?? ""),
    contentHash: str(r.contentHash),
    frozenAt: str(r.frozenAt),
    entryOdds: num(r.entryOdds),
  }));

  // --- Pipeline ledger (every pick with an official settlement event) ------
  const settledRows = rows.filter((r) => isSettledResult(r.result));
  const pipelineWlp = countWlp(settledRows.map((r) => r.result));
  const eventMismatches = settledRows.filter((r) => r.eventResult !== r.result).length;

  let unitsTotal = 0;
  let unitsCovered = 0;
  let unitsMissingPrice = 0;
  for (const r of settledRows) {
    const price = r.clvLockPrice ?? r.entryOdds;
    const profit = unitProfit(r.result as "WIN" | "LOSS" | "PUSH", price);
    if (profit === null) {
      unitsMissingPrice += 1;
      continue;
    }
    unitsTotal += profit;
    unitsCovered += 1;
  }

  // --- CLV recomputation (never trust a precomputed aggregate) --------------
  let clvGraded = 0;
  let clvBeat = 0;
  let clvMissed = 0;
  let clvFlat = 0;
  let pointsSum = 0;
  let pointsN = 0;
  let probSum = 0;
  let probN = 0;
  let recomputeMatches = 0;
  let recomputeMismatches = 0;
  const mismatchSamples: Array<{ pickId: string; stored: number; recomputed: number }> = [];
  for (const r of settledRows) {
    const recomputed = recomputeClv({
      market: marketOf(r.pickType),
      selection: r.selection,
      lockLine: r.clvLockLine,
      closeLine: r.clvCloseLine,
      lockPrice: r.clvLockPrice,
      closePrice: r.clvClosePrice,
      homeTeamName: r.homeTeamName,
      awayTeamName: r.awayTeamName,
    });
    if (recomputed === null) continue;
    clvGraded += 1;
    if (recomputed.value > 1e-9) clvBeat += 1;
    else if (recomputed.value < -1e-9) clvMissed += 1;
    else clvFlat += 1;
    if (recomputed.kind === "POINTS") {
      pointsSum += recomputed.value;
      pointsN += 1;
    } else {
      probSum += recomputed.value;
      probN += 1;
    }
    if (r.clvValue !== null) {
      // Stored values are rounded to 4 decimals; compare at that precision.
      if (Math.abs(r.clvValue - recomputed.value) <= 1e-4) recomputeMatches += 1;
      else {
        recomputeMismatches += 1;
        if (mismatchSamples.length < 5) {
          mismatchSamples.push({
            pickId: r.id,
            stored: round4(r.clvValue),
            recomputed: round4(recomputed.value),
          });
        }
      }
    }
  }

  // --- Official record + calibration gate ----------------------------------
  const officialRows = rows.filter((r) => isOfficialPlay(r));
  const officialSettled = officialRows.filter((r) => isSettledResult(r.result));
  const officialWlp = countWlp(officialSettled.map((r) => r.result));
  let officialUnits = 0;
  let officialUnitsCovered = 0;
  for (const r of officialSettled) {
    const profit = unitProfit(r.result as "WIN" | "LOSS" | "PUSH", r.clvLockPrice ?? r.entryOdds);
    if (profit !== null) {
      officialUnits += profit;
      officialUnitsCovered += 1;
    }
  }
  const gate = calibrationGate(officialRows);
  const buckets = confidenceBuckets(
    officialSettled.map((r) => r.confidence ?? Number.NaN).filter((c) => Number.isFinite(c)),
  );

  // --- Pre-kickoff commitment hashes ----------------------------------------
  const kickoffByPick = new Map<string, Date | null>();
  for (const r of rows) kickoffByPick.set(r.id, parseDbTime(r.commenceTime));
  let hashVerified = 0;
  let preKickoffVerified = 0;
  let fullyVerified = 0;
  const samples: Array<{
    pickId: string;
    contentHash: string;
    frozenAt: string | null;
    kickoff: string | null;
  }> = [];
  for (const receipt of receiptsRaw as unknown as ReceiptRow[]) {
    // contentHash is the Merkle LEAF hash (engine proof-of-record.ts hashLeaf):
    // sha256("leaf:" + pickId + ":" + canonical payload). Re-derive it here.
    const digest = createHash("sha256")
      .update(`leaf:${receipt.pickId}:${receipt.payload}`, "utf8")
      .digest("hex");
    const hashOk = digest === receipt.contentHash;
    const frozen = parseDbTime(receipt.frozenAt);
    const kickoff = kickoffByPick.get(receipt.pickId) ?? null;
    const beforeKickoff = frozen !== null && kickoff !== null && frozen.getTime() < kickoff.getTime();
    if (hashOk) hashVerified += 1;
    if (beforeKickoff) preKickoffVerified += 1;
    if (hashOk && beforeKickoff) {
      fullyVerified += 1;
      if (samples.length < 8) {
        samples.push({
          pickId: receipt.pickId,
          contentHash: receipt.contentHash,
          frozenAt: receipt.frozenAt,
          kickoff: kickoff?.toISOString() ?? null,
        });
      }
    }
  }

  // --- Recent settlement batch (last 48h) -----------------------------------
  const windowStart = generatedAt.getTime() - RECENT_WINDOW_HOURS * 3600_000;
  const recent = settledRows.filter((r) => {
    const t = parseDbTime(r.settledAt);
    return t !== null && t.getTime() >= windowStart;
  });
  const recentList = recent
    .sort((a, b) => (parseDbTime(b.settledAt)?.getTime() ?? 0) - (parseDbTime(a.settledAt)?.getTime() ?? 0))
    .slice(0, 25)
    .map((r) => ({
      pickId: r.id,
      matchup: `${r.awayTeamName ?? "?"} @ ${r.homeTeamName ?? "?"}`,
      selection: r.selection,
      line: r.line,
      result: r.result,
      settledAt: r.settledAt,
      clvVerdict: r.clvVerdict,
      clvValue: r.clvValue === null ? null : round4(r.clvValue),
      finalScore:
        r.homeScore !== null && r.awayScore !== null ? `${r.awayScore}-${r.homeScore}` : null,
    }));

  const tnfRow = rows.find(
    (r) =>
      /UNDER 43\.5/i.test(r.selection) &&
      /Commanders/i.test(r.awayTeamName ?? "") &&
      /Giants/i.test(r.homeTeamName ?? ""),
  );

  const artifact = {
    schemaVersion: "2026-11-13-v1",
    generatedAt: generatedAt.toISOString(),
    source: {
      transport: transport.name,
      tables: ["picks", "games", "pick_settlement_events", "pick_proof_receipts", "slate_commitments"],
      readOnly: true,
    },
    scope: {
      pipelineLedger:
        "Every pick with an official settlement event (pick_settlement_events). W/L/P from picks.result, cross-checked against the event result.",
      officialRecord:
        "Published PREMIUM-tier STRONG_PLAY / ELITE_PLAY picks. PASS is never an official play.",
      staking:
        "Flat 1 unit per settled pick. WIN profit at the recorded lock price (American odds); LOSS -1u; PUSH 0u. Picks without a recorded price are excluded from the units total and reported as a coverage gap.",
      clvSign: "Positive CLV = beat the close. Points for spread/total, implied-probability for moneyline. Recomputed from lock vs close fields.",
      calibrationLaw: `No win-rate percentage is published until at least ${CALIBRATION_TARGET} official plays are settled AND CLV-backed. Until then the record shows counts, units and n/${CALIBRATION_TARGET} progress only.`,
      commitments:
        "contentHash is the Merkle leaf hash sha256('leaf:' + pickId + ':' + canonical payload). It must re-derive exactly, and frozenAt must precede kickoff.",
    },
    pipeline: {
      withSettlementEvents: rows.length,
      wlp: pipelineWlp,
      voided: rows.filter((r) => r.result === "VOID").length,
      pending: rows.filter((r) => r.result === "PENDING").length,
      eventResultMismatches: eventMismatches,
      units: {
        total: round2(unitsTotal),
        coveredPicks: unitsCovered,
        missingPricePicks: unitsMissingPrice,
      },
      clv: {
        graded: clvGraded,
        beatClose: clvBeat,
        missedClose: clvMissed,
        flat: clvFlat,
        meanPoints: pointsN > 0 ? round4(pointsSum / pointsN) : null,
        meanProbability: probN > 0 ? round4(probSum / probN) : null,
        storedValueMatches: recomputeMatches,
        storedValueMismatches: recomputeMismatches,
        mismatchSamples,
      },
    },
    official: {
      wlp: officialWlp,
      units: { total: round2(officialUnits), coveredPicks: officialUnitsCovered },
      confidenceBuckets: buckets,
      gate,
    },
    commitments: {
      receipts: receiptsRaw.length,
      hashVerified,
      preKickoffVerified,
      fullyVerified,
      samples,
      slateCommitments: (slatesRaw as Row[]).map((s) => ({
        slateKey: str(s.slateKey),
        root: str(s.root),
        count: num(s.count),
        committedAt: str(s.committedAt),
      })),
    },
    recentSettlements: {
      windowHours: RECENT_WINDOW_HOURS,
      count: recent.length,
      rows: recentList,
    },
    tnfEvidence: tnfRow
      ? {
          found: true,
          pickId: tnfRow.id,
          matchup: `${tnfRow.awayTeamName} @ ${tnfRow.homeTeamName}`,
          selection: tnfRow.selection,
          line: tnfRow.line,
          result: tnfRow.result,
          settledAt: tnfRow.settledAt,
          clvLockLine: tnfRow.clvLockLine,
          clvCloseLine: tnfRow.clvCloseLine,
          clvValue: tnfRow.clvValue,
          clvVerdict: tnfRow.clvVerdict,
          finalScore:
            tnfRow.homeScore !== null && tnfRow.awayScore !== null
              ? `${tnfRow.awayScore}-${tnfRow.homeScore}`
              : null,
        }
      : { found: false },
  };

  mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2) + "\n", "utf8");

  // --- Human summary ---------------------------------------------------------
  console.info("verify-ledger: artifact written to apps/web/lib/ledger/verified-ledger.json");
  console.info(`  pipeline ledger: ${rows.length} picks with settlement events`);
  console.info(
    `  settled W-L-P: ${pipelineWlp.wins}-${pipelineWlp.losses}-${pipelineWlp.pushes} | units ${round2(unitsTotal)}u (${unitsCovered} priced, ${unitsMissingPrice} unpriced) | event mismatches ${eventMismatches}`,
  );
  console.info(
    `  CLV recomputed: ${clvGraded} graded | beat ${clvBeat} / missed ${clvMissed} / flat ${clvFlat} | mean points ${pointsN > 0 ? round4(pointsSum / pointsN) : "n/a"} | stored-value matches ${recomputeMatches}, mismatches ${recomputeMismatches}`,
  );
  console.info(
    `  official record: ${officialWlp.wins}-${officialWlp.losses}-${officialWlp.pushes} | units ${round2(officialUnits)}u`,
  );
  console.info(
    `  calibration gate: ${gate.clvBackedSettled}/${gate.target} CLV-backed settled official plays | win rate ${gate.unlocked ? "UNLOCKED" : "LOCKED"}`,
  );
  console.info(
    `  commitments: ${receiptsRaw.length} receipts | hash-verified ${hashVerified} | pre-kickoff ${preKickoffVerified} | fully verified ${fullyVerified}`,
  );
  console.info(`  recent ${RECENT_WINDOW_HOURS}h settlements: ${recent.length}`);
  console.info(
    `  TNF evidence (WSH @ NYG UNDER 43.5): ${tnfRow ? `${tnfRow.result} (close ${tnfRow.clvCloseLine}, CLV ${tnfRow.clvValue})` : "NOT FOUND"}`,
  );
  if (recomputeMismatches > 0) {
    console.warn("  WARNING: stored clvValue disagrees with recomputation on some rows (samples in artifact).");
  }
}

main().catch((err) => {
  console.error("verify-ledger FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});