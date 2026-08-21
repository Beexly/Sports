/**
 * H-F5 MVE runner — ONE cycle, frozen prereg v2.
 *
 * Loads env at runtime (Prisma). Does not print secrets. Does not compute
 * any lambda, window, or e-process other than the pre-registered primary.
 *
 * Usage: npx tsx scripts/edge-lab/run-mve.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { shinDevig } from "../../packages/prediction-engine/src/shin-devig.js";
import { NbRbpf } from "../../packages/prediction-engine/src/research/nb-rbpf.js";
import {
  MVE_N_PARTICLES,
  MVE_SEED,
  bindingOutcome,
  runSideAdaptivePath,
  type MveBindingOutcome,
} from "../../packages/prediction-engine/src/research/mve-eprocess.js";

const ESPN_PUBLIC = "espn_public";
const WINDOW_LO_MS = 6 * 60 * 60 * 1000;
const WINDOW_HI_MS = 3 * 60 * 60 * 1000;
const QUOTE_AGE_MS = 15 * 60 * 1000;
const CORPUS_FROM = new Date("2026-05-22T00:00:00.000Z");
const CORPUS_TO = new Date("2026-08-21T00:00:00.000Z");

function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || Math.abs(american) < 100) return null;
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

type OddsRow = {
  gameId: string;
  bookmaker: string;
  fetchedAt: Date;
  total: number | null;
  overPrice: number | null;
  underPrice: number | null;
};

type GameRow = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  commenceTime: Date;
  homeScore: number;
  awayScore: number;
};

function entryForGame(game: GameRow, odds: readonly OddsRow[]): {
  mOver: number;
  line: number;
} | null {
  const lo = new Date(game.commenceTime.getTime() - WINDOW_LO_MS);
  const hi = new Date(game.commenceTime.getTime() - WINDOW_HI_MS);
  const inWindow = odds.filter(
    (o) =>
      o.gameId === game.id &&
      o.bookmaker !== ESPN_PUBLIC &&
      o.fetchedAt >= lo &&
      o.fetchedAt <= hi &&
      o.total != null &&
      o.overPrice != null &&
      o.underPrice != null,
  );
  if (inWindow.length === 0) return null;
  let latest = inWindow[0]!.fetchedAt.getTime();
  for (const o of inWindow) {
    const t = o.fetchedAt.getTime();
    if (t > latest) latest = t;
  }
  const fresh = inWindow.filter((o) => latest - o.fetchedAt.getTime() <= QUOTE_AGE_MS);
  const byBook = new Map<string, OddsRow>();
  for (const o of fresh) {
    const prev = byBook.get(o.bookmaker);
    if (!prev || o.fetchedAt > prev.fetchedAt) byBook.set(o.bookmaker, o);
  }
  if (byBook.size < 3) return null;
  const pOvers: number[] = [];
  const lines: number[] = [];
  for (const row of byBook.values()) {
    const dOver = americanToDecimal(row.overPrice!);
    const dUnder = americanToDecimal(row.underPrice!);
    if (dOver == null || dUnder == null) continue;
    const shin = shinDevig([1 / dOver, 1 / dUnder]);
    const pOver = shin.probabilities[0];
    if (pOver == null || !Number.isFinite(pOver)) continue;
    pOvers.push(pOver);
    lines.push(row.total!);
  }
  const mOver = median(pOvers);
  const line = median(lines);
  if (mOver == null || line == null || pOvers.length < 3) return null;
  return { mOver, line };
}

function renderResults(input: {
  readonly generatedAt: string;
  readonly candidateGames: number;
  readonly excluded: number;
  readonly pushes: number;
  readonly graded: number;
  readonly outcome: MveBindingOutcome;
  readonly finalCapital: number;
  readonly maxCapital: number;
  readonly maxDrawdown: number;
  readonly crossings: { readonly 2: boolean; readonly 5: boolean; readonly 10: boolean; readonly 20: boolean };
  readonly checkpoints: readonly { readonly n: number; readonly capital: number }[];
  readonly killedAt: number | null;
  readonly certifiedAt: number | null;
  readonly earlyAbort: boolean;
  readonly path: readonly { n: number; capital: number; side: string; hit: boolean }[];
}): string {
  const lines: string[] = [
    "# H-F5 MVE RESULTS — one cycle, prereg v2",
    "",
    `Generated: ${input.generatedAt}`,
    "Primary: 6–3h window, lambda=0.3, side-adaptive asymmetric fractional e-process.",
    "No other window, lambda, or e-process variant was computed.",
    "",
    "## Counts",
    "",
    `| Candidate FINAL MLB totals games in L-14 window | ${input.candidateGames} |`,
    `| Excluded (entry quality: <3 books / stale / missing 6–3h quote) | ${input.excluded} |`,
    `| Pushes (y = line, not graded) | ${input.pushes} |`,
    `| Graded bets (one per game) | ${input.graded} |`,
    "",
    "## Binding outcome",
    "",
    `- final capital: ${input.finalCapital.toFixed(6)}`,
    `- max capital: ${input.maxCapital.toFixed(6)}`,
    `- max drawdown (from peak): ${input.maxDrawdown.toFixed(6)}`,
    `- crossings 2/5/10/20: ${input.crossings[2]}/${input.crossings[5]}/${input.crossings[10]}/${input.crossings[20]}`,
    `- checkpoints: ${input.checkpoints.map((c) => `n=${c.n} E=${c.capital.toFixed(4)}`).join("; ") || "(none)"}`,
    `- kill checkpoint: ${input.killedAt ?? "none"}`,
    `- certify checkpoint: ${input.certifiedAt ?? "none"}`,
    `- early abort: ${input.earlyAbort}`,
    `- **outcome: ${input.outcome}**`,
    "",
    "Null: the market's de-vigged probability of the bet side is an upper bound on its true probability.",
    "This is not a claim of net-of-vig profitability. Vig is not in this test.",
    "",
    "## Chronological capital path (graded bets)",
    "",
    "n,capital,side,hit",
  ];
  for (const row of input.path) {
    lines.push(`${row.n},${row.capital.toFixed(8)},${row.side},${row.hit ? 1 : 0}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const redacted = raw.replace(/\S+:\/\/\S+/g, "[redacted-url]");
      console.error(`run-mve: Postgres unreachable: ${redacted}`);
      process.exit(2);
    }
    const gamesRaw = await prisma.game.findMany({
      where: {
        sport: { key: "baseball_mlb" },
        status: "FINAL",
        homeScore: { not: null },
        awayScore: { not: null },
        commenceTime: { gte: CORPUS_FROM, lt: CORPUS_TO },
      },
      select: {
        id: true,
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
        homeScore: true,
        awayScore: true,
      },
      orderBy: { commenceTime: "asc" },
    });

    const games: GameRow[] = gamesRaw.flatMap((g) => {
      if (g.homeScore == null || g.awayScore == null) return [];
      return [
        {
          id: g.id,
          homeTeamName: g.homeTeamName,
          awayTeamName: g.awayTeamName,
          commenceTime: g.commenceTime,
          homeScore: g.homeScore,
          awayScore: g.awayScore,
        },
      ];
    });

    const ids = games.map((g) => g.id);
    const oddsRaw: OddsRow[] =
      ids.length === 0
        ? []
        : await prisma.odds.findMany({
            where: {
              gameId: { in: ids },
              market: "TOTALS",
            },
            select: {
              gameId: true,
              bookmaker: true,
              fetchedAt: true,
              total: true,
              overPrice: true,
              underPrice: true,
            },
          });

    const teamNames = [...new Set(games.flatMap((g) => [g.homeTeamName, g.awayTeamName]))].sort();
    const teamIndex = new Map(teamNames.map((n, i) => [n, i] as const));
    const nTeams = Math.max(teamNames.length, 1);

    const filter = new NbRbpf({
      seed: MVE_SEED,
      nTeams,
      nPitchers: 1,
      nParks: nTeams,
      nUmpires: 1,
      nParticles: MVE_N_PARTICLES,
    });

    const observations: { qOver: number; mOver: number; y: number; line: number }[] = [];
    let excluded = 0;
    let pushes = 0;

    for (const game of games) {
      const entry = entryForGame(game, oddsRaw);
      if (!entry) {
        excluded += 1;
        continue;
      }
      const home = teamIndex.get(game.homeTeamName) ?? 0;
      const away = teamIndex.get(game.awayTeamName) ?? 0;
      const y = game.homeScore + game.awayScore;
      const synthetic = {
        home,
        away,
        pitcherHome: 0,
        pitcherAway: 0,
        park: home,
        umpire: 0,
        y,
        line: entry.line,
      };
      const qOver = filter.predictOver(synthetic);
      if (y === entry.line) {
        pushes += 1;
      } else {
        observations.push({ qOver, mOver: entry.mOver, y, line: entry.line });
      }
      filter.update(synthetic);
    }

    const path = runSideAdaptivePath(observations);
    const outcome = bindingOutcome(path);
    const payload = {
      generatedAt: new Date().toISOString(),
      candidateGames: games.length,
      excluded,
      pushes,
      graded: path.steps.length,
      outcome,
      finalCapital: path.finalCapital,
      maxCapital: path.maxCapital,
      maxDrawdown: path.maxDrawdown,
      crossings: path.crossings,
      checkpoints: path.checkpoints,
      killedAt: path.killedAt,
      certifiedAt: path.certifiedAt,
      earlyAbort: path.earlyAbort,
      path: path.steps.map((s) => ({ n: s.n, capital: s.capital, side: s.side, hit: s.hit })),
    };

    const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/ops/hermes/hf5-mve");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "RESULTS.md"), renderResults(payload), "utf8");
    writeFileSync(resolve(outDir, "path.json"), JSON.stringify(payload, null, 2), "utf8");
    console.log(`run-mve: graded=${payload.graded} excluded=${excluded} outcome=${outcome} final=${path.finalCapital.toFixed(6)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`run-mve: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
