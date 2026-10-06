/**
 * Rebuild calibration-weights.ts from LIVE Neon picks (4,030 rows).
 * More accurate than the JSONL extract. Read-only DB pull + local TS emit.
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const bins = await client.query(`
    SELECT (confidence/10)*10 AS bin,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE result='WIN')::int AS wins,
           COUNT(*) FILTER (WHERE result='LOSS')::int AS losses
    FROM picks WHERE result IN ('WIN','LOSS') AND confidence IS NOT NULL
    GROUP BY 1 ORDER BY 1;
  `);

  const byType = await client.query(`
    SELECT "pickType"::text AS k,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE result='WIN')::int AS wins,
           COUNT(*) FILTER (WHERE result='LOSS')::int AS losses
    FROM picks WHERE result IN ('WIN','LOSS') GROUP BY 1;
  `);

  const bySport = await client.query(`
    SELECT COALESCE(s.name, g."sportId") AS k,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE p.result='WIN')::int AS wins,
           COUNT(*) FILTER (WHERE p.result='LOSS')::int AS losses
    FROM picks p
    JOIN games g ON g.id = p."gameId"
    LEFT JOIN sports s ON s.id = g."sportId"
    WHERE p.result IN ('WIN','LOSS') GROUP BY 1 ORDER BY n DESC;
  `);

  const byModel = await client.query(`
    SELECT "modelVersion" AS k,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE result='WIN')::int AS wins,
           COUNT(*) FILTER (WHERE result='LOSS')::int AS losses
    FROM picks WHERE result IN ('WIN','LOSS') GROUP BY 1 ORDER BY n DESC;
  `);

  const byGrade = await client.query(`
    SELECT "pickGrade"::text AS k,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE result='WIN')::int AS wins,
           COUNT(*) FILTER (WHERE result='LOSS')::int AS losses
    FROM picks WHERE result IN ('WIN','LOSS') AND "pickGrade" IS NOT NULL
    GROUP BY 1 ORDER BY n DESC;
  `);

  const overall = await client.query(`
    SELECT COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE result='WIN')::int AS wins,
           COUNT(*) FILTER (WHERE result='LOSS')::int AS losses
    FROM picks WHERE result IN ('WIN','LOSS');
  `);

  await client.end();

  const o = overall.rows[0];
  const baseRate = o.wins / (o.wins + o.losses);
  console.log(`LIVE overall: ${o.wins}/${o.wins + o.losses} = ${(baseRate * 100).toFixed(2)}%`);

  function pack(rows, minN) {
    const out = {};
    for (const r of rows) {
      const n = r.wins + r.losses;
      if (n < (minN ?? 20)) continue;
      const wr = r.wins / n;
      out[r.k] = {
        winRate: Number(wr.toFixed(4)),
        n,
        wins: r.wins,
        losses: r.losses,
        signalWeight: Number(Math.min(1.5, Math.max(0.4, wr / baseRate)).toFixed(4)),
      };
    }
    return out;
  }

  const recal = {};
  for (const r of bins.rows) {
    const n = r.wins + r.losses;
    if (n < 20) continue;
    const wr = r.wins / n;
    recal[String(r.bin)] = {
      statedConfidence: Number(r.bin),
      empiricalPWin: Number(wr.toFixed(4)),
      n,
      wins: r.wins,
      losses: r.losses,
      recalibratedConfidence: Number((Math.min(0.78, Math.max(0.4, wr)) * 100).toFixed(1)),
    };
  }

  const byTypeW = pack(byType.rows);
  const bySportW = pack(bySport.rows);
  const byModelW = pack(byModel.rows, 50);
  const byGradeW = pack(byGrade.rows);

  // Publish actions
  const actions = [];
  for (const [dim, obj] of [
    ["pickType", byTypeW],
    ["sport", bySportW],
    ["grade", byGradeW],
    ["modelVersion", byModelW],
  ]) {
    for (const [k, v] of Object.entries(obj)) {
      if (v.winRate < 0.48 && v.n >= 80) {
        actions.push({
          dimension: dim,
          value: k,
          winRate: v.winRate,
          n: v.n,
          action: "suppress-or-shrink",
          reason: `win_rate ${v.winRate.toFixed(3)} below 0.48 on n=${v.n} (live)`,
        });
      } else if (v.winRate > 0.58 && v.n >= 80) {
        actions.push({
          dimension: dim,
          value: k,
          winRate: v.winRate,
          n: v.n,
          action: "boost-shadow-priority",
          reason: `win_rate ${v.winRate.toFixed(3)} above 0.58 on n=${v.n} (live)`,
        });
      }
    }
  }

  const jsonOut = {
    schemaVersion: 2,
    generatedFrom: "LIVE Neon picks table (4,030 rows)",
    generatedAt: new Date().toISOString(),
    overall: {
      n_graded: o.wins + o.losses,
      wins: o.wins,
      losses: o.losses,
      base_rate: Number(baseRate.toFixed(4)),
      note: "Live DB supersedes settled-picks.jsonl. Brier from proof receipts modelProb is unavailable (0 rows).",
    },
    confidence_recalibration: recal,
    signal_weights: {
      by_pick_type: byTypeW,
      by_sport: bySportW,
      by_model_version: byModelW,
      by_grade: byGradeW,
    },
    publish_actions: actions,
    signal_coverage_gaps: {
      hadInjurySignal: 0,
      hadWeatherSignal: 0,
      hadNgsSignal: 0,
      hadRatingsSignal: 0,
      hadPlayerSignal: 0,
      hadPaceSignal: 0,
      hadOfficialsSignal: 0,
      note: "These signals exist in the DB (injuries=6501, next_gen_stats=2718) but are NEVER attached to picks. Wire them.",
    },
  };

  const jsonPath = path.join(__dirname, "..", "docs", "research", "2026-09-24", "calibration-weights-live.json");
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2));
  console.log("Wrote", jsonPath);

  // Emit TS
  const ts = `/**
 * Calibration weights derived from LIVE Neon picks (4,030 rows, ${o.wins + o.losses} graded).
 * Generated ${new Date().toISOString()}. Supersedes the JSONL extract.
 *
 * Signal-coverage gap: injuries/NGS/weather/ratings/player/pace/officials are
 * present in the DB but currently attach to 0 picks. Wire them before claiming
 * a context-aware edge.
 */

export interface ConfidenceRecalibration {
  readonly statedConfidence: number;
  readonly empiricalPWin: number;
  readonly n: number;
  readonly recalibratedConfidence: number;
}

export interface SignalWeight {
  readonly winRate: number;
  readonly n: number;
  readonly wins: number;
  readonly losses: number;
  readonly signalWeight: number;
}

export interface PublishAction {
  readonly dimension: string;
  readonly value: string;
  readonly winRate: number;
  readonly n: number;
  readonly action: 'suppress-or-shrink' | 'boost-shadow-priority';
  readonly reason: string;
}

export const CONFIDENCE_RECALIBRATION: Readonly<Record<string, ConfidenceRecalibration>> = {
${Object.entries(recal).map(([k, v]) => `  "${k}": { statedConfidence: ${v.statedConfidence}, empiricalPWin: ${v.empiricalPWin}, n: ${v.n}, recalibratedConfidence: ${v.recalibratedConfidence} },`).join("\n")}
};

export function calibratedWinProb(statedConfidence: number | null | undefined): number {
  if (statedConfidence == null || !Number.isFinite(statedConfidence)) return 0.5;
  const bin = String(Math.floor(statedConfidence / 10) * 10);
  const hit = CONFIDENCE_RECALIBRATION[bin];
  if (hit) return hit.empiricalPWin;
  return Math.min(0.72, Math.max(0.35, 0.45 + 0.001 * statedConfidence));
}

export const WEIGHT_BY_PICK_TYPE: Readonly<Record<string, SignalWeight>> = {
${Object.entries(byTypeW).map(([k, v]) => `  "${k}": { winRate: ${v.winRate}, n: ${v.n}, wins: ${v.wins}, losses: ${v.losses}, signalWeight: ${v.signalWeight} },`).join("\n")}
};

export const WEIGHT_BY_SPORT: Readonly<Record<string, SignalWeight>> = {
${Object.entries(bySportW).map(([k, v]) => `  "${k}": { winRate: ${v.winRate}, n: ${v.n}, wins: ${v.wins}, losses: ${v.losses}, signalWeight: ${v.signalWeight} },`).join("\n")}
};

export const WEIGHT_BY_GRADE: Readonly<Record<string, SignalWeight>> = {
${Object.entries(byGradeW).map(([k, v]) => `  "${k}": { winRate: ${v.winRate}, n: ${v.n}, wins: ${v.wins}, losses: ${v.losses}, signalWeight: ${v.signalWeight} },`).join("\n")}
};

export const WEIGHT_BY_MODEL_VERSION: Readonly<Record<string, SignalWeight>> = {
${Object.entries(byModelW).map(([k, v]) => `  "${k}": { winRate: ${v.winRate}, n: ${v.n}, wins: ${v.wins}, losses: ${v.losses}, signalWeight: ${v.signalWeight} },`).join("\n")}
};

export const PUBLISH_ACTIONS: readonly PublishAction[] = [
${actions.map((a) => `  { dimension: ${JSON.stringify(a.dimension)}, value: ${JSON.stringify(a.value)}, winRate: ${a.winRate}, n: ${a.n}, action: ${JSON.stringify(a.action)}, reason: ${JSON.stringify(a.reason)} },`).join("\n")}
];

export function combinedSignalWeight(
  sport: string | null | undefined,
  pickType: string | null | undefined,
  grade?: string | null | undefined,
): number {
  const typeW = pickType ? WEIGHT_BY_PICK_TYPE[pickType]?.signalWeight : undefined;
  const sportW = sport ? WEIGHT_BY_SPORT[sport]?.signalWeight : undefined;
  const gradeW = grade ? WEIGHT_BY_GRADE[grade]?.signalWeight : undefined;
  const parts = [typeW, sportW, gradeW].filter((x): x is number => x != null);
  if (parts.length === 0) return 1.0;
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  return Math.min(1.5, Math.max(0.4, avg));
}

export function shouldSuppress(sport: string, pickType: string, grade: string): boolean {
  return PUBLISH_ACTIONS.some(
    (a) =>
      a.action === 'suppress-or-shrink' &&
      (a.value === sport || a.value === pickType || a.value === grade),
  );
}

/** Live-DB signal coverage: which signals actually attached to picks. */
export const SIGNAL_COVERAGE_LIVE = {
  odds: 3999,
  lineMovement: 3122,
  rest: 2125,
  schedule: 3122,
  atsForm: 1283,
  h2h: 11,
  injury: 0,
  weather: 0,
  ngs: 0,
  ratings: 0,
  player: 0,
  pace: 0,
  officials: 0,
} as const;
`;

  const tsPath = path.join(__dirname, "..", "packages", "data-ingestion", "src", "calibration-weights.ts");
  fs.writeFileSync(tsPath, ts);
  console.log("Wrote", tsPath);
  console.log("\nRecal bins:", Object.keys(recal));
  console.log("Type weights:", JSON.stringify(byTypeW, null, 2));
  console.log("Sport weights:", JSON.stringify(bySportW, null, 2));
  console.log("Actions:", actions.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
