#!/usr/bin/env npx tsx
/**
 * Read-only census of WHICH BRANCH orders each published pick.
 *
 * Why this exists. AGENTS.md carried "confidence still orders the board" as the
 * open RANKING half of the confidence defect. That is half wrong, and the wrong
 * half decides how big the task is. `rankingSortKey` prefers
 * `factorBreakdown.rankingP` when finite, falls back to `rankingScore/100`, and
 * reaches `confidence/100` only when BOTH are absent. Those are different
 * animals in the repo's own measurements: `rankingP` (n 1,390) is monotone,
 * over-confident in the upper middle but never inverted; `confidence` (n 2,385)
 * is the non-monotone one, claiming 0.8663 at 80+ and realizing 0.5191 at
 * z = -10.7. So the anti-predictive score drives the order ONLY on rows that
 * fall all the way through the cascade, and nobody has ever measured what share
 * of rows that is. This prints that number.
 *
 * It imports `readRankingKey` from the module the BOARD ACTUALLY RUNS
 * (apps/web/lib/ranking/sort-key.ts) rather than restating the cascade. That is
 * deliberate and load-bearing: a second copy of the branch logic is how a census
 * drifts from the comparator it claims to describe and then reports a reassuring
 * number about code that does something else. Same argument as
 * adverse-edge-suppression.ts importing `pricesWorseThanMarket` instead of
 * respelling it.
 *
 * SELECT-only. No create/update/delete/upsert/$executeRaw call exists in this
 * file, and it writes nothing back. Modeled on
 * scripts/ops/list-stale-pending-picks.ts: DATABASE_URL-guarded, refuses on a
 * stub URL rather than inventing a connection.
 *
 * Usage:
 *   npm run ops:ranking-census
 *   npm run ops:ranking-census -- --json
 *   DATABASE_URL=... TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx tsx scripts/ops/ranking-basis-census.ts
 */
import { PrismaClient } from "@prisma/client";
import { readRankingKey } from "../../apps/web/lib/ranking/sort-key";

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error(
    "ranking-basis-census: DATABASE_URL missing or stub - abort (no secrets invented)",
  );
  process.exit(2);
}

const JSON_OUT = process.argv.includes("--json");

interface Row {
  readonly confidence: number;
  readonly factorBreakdown: unknown;
  readonly bookmakerCount: number;
  readonly modelVersion: string;
  readonly result: string;
  readonly isBootstrap: boolean;
  readonly game: { readonly sport: string } | null;
}

interface Census {
  readonly rankingP: number;
  readonly rankingScore: number;
  readonly confidence: number;
  readonly total: number;
  readonly confidenceShare: number;
}

function census(rows: readonly Row[]): Census {
  let rankingP = 0;
  let rankingScore = 0;
  let confidence = 0;
  for (const r of rows) {
    const basis = readRankingKey(r).basis;
    if (basis === "rankingP") rankingP += 1;
    else if (basis === "rankingScore") rankingScore += 1;
    else confidence += 1;
  }
  const total = rows.length;
  return {
    rankingP,
    rankingScore,
    confidence,
    total,
    confidenceShare: total === 0 ? 0 : confidence / total,
  };
}

/**
 * Wilson score interval on the confidence share. A bare percentage on a thin
 * slice invites a conclusion the sample cannot support, which is the exact
 * failure this repo keeps correcting (NFL n 28 ECE 0.267 read as a direction).
 */
function wilson95(k: number, n: number): readonly [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.959963984540054;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centre - half) / d), Math.min(1, (centre + half) / d)];
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function line(label: string, c: Census): string {
  const [lo, hi] = wilson95(c.confidence, c.total);
  return (
    `${label.padEnd(26)} ${String(c.total).padStart(6)} ` +
    `${String(c.rankingP).padStart(9)} ${String(c.rankingScore).padStart(10)} ` +
    `${String(c.confidence).padStart(11)} ${pct(c.confidenceShare).padStart(8)}` +
    `  [${pct(lo)}, ${pct(hi)}]`
  );
}

const HEADER =
  "slice                       total  rankingP  rankScore  CONFIDENCE    share  95% CI on share";

/**
 * Declared once and consumed by BOTH the table and the --json output, so the
 * two renderings cannot disagree about what "2-4 books" means.
 */
const BOOK_BUCKETS: readonly {
  readonly label: string;
  readonly pred: (r: Row) => boolean;
}[] = [
  { label: "0 books (model signal)", pred: (r) => r.bookmakerCount <= 0 },
  { label: "1 book", pred: (r) => r.bookmakerCount === 1 },
  { label: "2-4 books", pred: (r) => r.bookmakerCount >= 2 && r.bookmakerCount <= 4 },
  { label: "5+ books", pred: (r) => r.bookmakerCount >= 5 },
];

function group<K>(rows: readonly Row[], key: (r: Row) => K): Map<K, Row[]> {
  const m = new Map<K, Row[]>();
  for (const r of rows) {
    const k = key(r);
    const bucket = m.get(k);
    if (bucket) bucket.push(r);
    else m.set(k, [r]);
  }
  return m;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = (await prisma.pick.findMany({
      where: { isPublished: true },
      select: {
        confidence: true,
        factorBreakdown: true,
        bookmakerCount: true,
        modelVersion: true,
        result: true,
        isBootstrap: true,
        game: { select: { sport: true } },
      },
    })) as unknown as Row[];

    const overall = census(rows);

    if (JSON_OUT) {
      console.log(
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            overall,
            bySport: [...group(rows, (r) => r.game?.sport ?? "(unknown)")].map(
              ([sport, rs]) => ({ sport, ...census(rs) }),
            ),
            byBookCount: BOOK_BUCKETS.map(({ label, pred }) => ({
              bucket: label,
              ...census(rows.filter(pred)),
            })),
            settledNonBootstrap: census(
              rows.filter((r) => r.result !== "PENDING" && !r.isBootstrap),
            ),
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log("=== RANKING BASIS CENSUS (published picks, read-only) ===");
    console.log(
      "The CONFIDENCE column is the branch measured anti-predictive at the top.\n",
    );
    console.log(HEADER);
    console.log(line("ALL PUBLISHED", overall));

    console.log("\n-- by sport --");
    console.log(HEADER);
    const sports = [...group(rows, (r) => r.game?.sport ?? "(unknown)")].sort(
      (a, b) => b[1].length - a[1].length,
    );
    for (const [sport, rs] of sports) console.log(line(sport, census(rs)));

    console.log("\n-- by bookmaker count --");
    console.log(HEADER);
    for (const { label, pred } of BOOK_BUCKETS) {
      console.log(line(label, census(rows.filter(pred))));
    }

    console.log("\n-- by model version --");
    console.log(HEADER);
    const versions = [...group(rows, (r) => r.modelVersion)].sort(
      (a, b) => b[1].length - a[1].length,
    );
    for (const [v, rs] of versions) console.log(line(v, census(rs)));

    console.log("\n-- the outcome-metric sample --");
    console.log(HEADER);
    console.log(line("settled, non-bootstrap", census(rows.filter((r) => r.result !== "PENDING" && !r.isBootstrap))));
    console.log(line("settled, incl bootstrap", census(rows.filter((r) => r.result !== "PENDING"))));

    console.log(
      "\nReading it: a small CONFIDENCE share means this is a narrow fallback defect.\n" +
        "A large one means the original framing holds and the ordering is the work.\n" +
        "The interval is Wilson 95%; on a thin slice do not read a direction off the point estimate.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
