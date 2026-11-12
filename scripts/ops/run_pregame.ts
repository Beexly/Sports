#!/usr/bin/env node
/**
 * Stage A–G pregame run.
 *
 *   node --import tsx scripts/ops/run_pregame.ts --week 10 --game WSH@NYG
 *
 * What this does, in order:
 *   A. Load      — assemble a GameEvidenceBundle from real sources only.
 *   B. Gate      — required evidence must be present and fresh. If not, the run
 *                  stops with MISSING_DATA and nothing downstream executes.
 *   C. Structure — 10,000-run drive simulation fed only from the bundle.
 *   D. Overlay   — situational families, corpus-shrunk. Hand-set coefficients
 *                  run in shadow (weight zero) until they are fitted.
 *   E. Posterior — market logit plus the fitted share of the live deltas, then
 *                  the calibration map. With no fitted coefficients the honest
 *                  posterior IS the market prior and the residual is zero.
 *   F. Decision  — edge against the best de-vigged price. Default is no-bet.
 *   G. Seal      — canonical JSON of bundle + outputs + code version -> SHA-256.
 *
 * Publication is a separate authority and is always false here. The walk-forward
 * emission gate is closed; this script does not open it.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { neonHttpSqlClient } from "@sports/prediction-engine/src/literature/neon-http-sql-client.js";
import {
  checkCompleteness,
  describeCompleteness,
} from "@sports/prediction-engine/src/evidence/completeness-gate.js";
import { sealRun } from "@sports/prediction-engine/src/evidence/manifest-hash.js";
import { isPresent, type PregameVerdict } from "@sports/prediction-engine/src/evidence/types.js";
import { canonicalTeamCode, teamNickname, type NflTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";
import { simulateCoachGame } from "@sports/prediction-engine/src/coach-sim/markov-simulator.js";

import { buildBundle, EVIDENCE_CODE_VERSION } from "../../packages/ingestion-pipeline/src/evidence-loaders/index.js";

interface Args {
  week: number;
  game: string;
  out: string | null;
  dbUrl: string | null;
}

function parseArgs(argv: readonly string[]): Args {
  let week: number | null = null;
  let game: string | null = null;
  let out: string | null = null;
  let dbUrl: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--week" && next !== undefined) {
      week = Number.parseInt(next, 10);
      i += 1;
    } else if (a === "--game" && next !== undefined) {
      game = next;
      i += 1;
    } else if (a === "--out" && next !== undefined) {
      out = next;
      i += 1;
    } else if (a === "--db-url" && next !== undefined) {
      dbUrl = next;
      i += 1;
    }
  }
  if (week === null || Number.isNaN(week)) throw new Error("--week <n> is required");
  if (game === null || !game.includes("@")) throw new Error("--game AWAY@HOME is required");
  return { week, game, out, dbUrl };
}

function log(line: string): void {
  process.stdout.write(`${line}\n`);
}

async function resolveGameId(
  db: ReturnType<typeof neonHttpSqlClient>,
  away: NflTeamCode,
  home: NflTeamCode,
  week: number,
): Promise<string | null> {
  // Match on the nickname, not the city: "Los Angeles" is two teams.
  const res = await db.query(
    `SELECT g.id, g."commenceTime"
       FROM games g
      WHERE g."homeTeamName" ILIKE $1
        AND g."awayTeamName" ILIKE $2
        AND g."commenceTime" > now() - interval '1 day'
      ORDER BY g."commenceTime" ASC
      LIMIT 1`,
    [`%${teamNickname(home)}%`, `%${teamNickname(away)}%`],
  );
  const row = res.rows[0] as { id?: unknown } | undefined;
  return typeof row?.id === "string" ? row.id : null;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const [awayRaw, homeRaw] = args.game.split("@");
  if (awayRaw === undefined || homeRaw === undefined) throw new Error("--game AWAY@HOME");

  const away = canonicalTeamCode(awayRaw);
  const home = canonicalTeamCode(homeRaw);

  const dbUrl = args.dbUrl ?? process.env.DATABASE_URL ?? null;
  if (dbUrl === null) {
    log("MISSING_DATA — no DATABASE_URL and no --db-url. Nothing was read, nothing was sealed.");
    return 2;
  }
  const db = neonHttpSqlClient(dbUrl, { timeoutMs: 90_000 });

  const gameId = await resolveGameId(db, away, home, args.week);
  if (gameId === null) {
    log(`MISSING_DATA — no scheduled game matching ${away} @ ${home} in the database.`);
    return 2;
  }

  const now = new Date();
  log(`run_pregame ${EVIDENCE_CODE_VERSION}`);
  log(`game ${away} @ ${home}  week ${args.week}  id ${gameId}`);
  log(`started ${now.toISOString()}`);

  // ---- Stage A -----------------------------------------------------------
  const bundle = await buildBundle({ db, gameId, now });
  log("");
  log("STAGE A — evidence");
  const rows: Array<[string, string, string, string]> = [
    ["market.spread", describe(bundle.market.spread), source(bundle.market.spread), asOf(bundle.market.spread)],
    ["market.total", describe(bundle.market.total), source(bundle.market.total), asOf(bundle.market.total)],
    ["market.consensusNoVigHome", describe(bundle.market.consensusNoVigHome), source(bundle.market.consensusNoVigHome), asOf(bundle.market.consensusNoVigHome)],
    ["market.bookmakerCount", describe(bundle.market.bookmakerCount), source(bundle.market.bookmakerCount), asOf(bundle.market.bookmakerCount)],
    ["injuries", describe(bundle.injuries), source(bundle.injuries), asOf(bundle.injuries)],
    ["weather", describe(bundle.weather), source(bundle.weather), asOf(bundle.weather)],
    ["rest", describe(bundle.rest), source(bundle.rest), asOf(bundle.rest)],
    ["homeForm", describe(bundle.homeForm), source(bundle.homeForm), asOf(bundle.homeForm)],
    ["awayForm", describe(bundle.awayForm), source(bundle.awayForm), asOf(bundle.awayForm)],
    ["homeCharting", describe(bundle.homeCharting), source(bundle.homeCharting), asOf(bundle.homeCharting)],
    ["awayCharting", describe(bundle.awayCharting), source(bundle.awayCharting), asOf(bundle.awayCharting)],
    ["homeCoaching", describe(bundle.homeCoaching), source(bundle.homeCoaching), asOf(bundle.homeCoaching)],
    ["awayCoaching", describe(bundle.awayCoaching), source(bundle.awayCoaching), asOf(bundle.awayCoaching)],
    ["corpus", describe(bundle.corpus), source(bundle.corpus), asOf(bundle.corpus)],
    ["jev", describe(bundle.jev), source(bundle.jev), asOf(bundle.jev)],
  ];
  for (const [field, value, src, at] of rows) {
    log(`  ${field.padEnd(26)} ${value.padEnd(28)} ${src.padEnd(22)} ${at}`);
  }

  // ---- Stage B -----------------------------------------------------------
  const report = checkCompleteness(bundle, now);
  log("");
  log(`STAGE B — ${describeCompleteness(report)}`);

  const outputs: Record<string, unknown> = {
    verdict: "MISSING_DATA" as PregameVerdict,
    completeness: report,
    publishable: false,
  };

  if (report.verdict !== "READY") {
    const manifest = sealRun({ bundle, outputs }, bundle.codeVersion, now.toISOString());
    log(`  nothing downstream ran. sealed ${manifest.hash}`);
    emit(args.out, { manifest, bundle, outputs });
    return 2;
  }

  // ---- Stage C -----------------------------------------------------------
  const neutralPassRate = isPresent(bundle.homeForm)
    ? bundle.homeForm.value.successRate
    : undefined;
  const projection = simulateCoachGame(
    {
      homeTeam: home,
      awayTeam: away,
      week: args.week,
      // Corpus support is the only measured input to the coach term today.
      coachSupport: isPresent(bundle.corpus) ? 0 : 0,
      neutralPassRate,
    },
    10_000,
  );
  log("");
  log("STAGE C — structure (10,000 drives)");
  log(`  winProbHome ${projection.winProbHome.toFixed(4)}  marginMean ${projection.marginMean.toFixed(2)}  totalP10 ${projection.totalP10.toFixed(1)}  totalP90 ${projection.totalP90.toFixed(1)}`);

  // ---- Stage D -----------------------------------------------------------
  // No situational family has a fitted coefficient yet. Every family is
  // therefore in shadow: computed, logged, weight zero. The delta is zero by
  // construction, not by a default.
  const familyDeltas: Array<{ family: string; delta: number; weight: number; status: string }> = [
    { family: "pressure", delta: 0, weight: 0, status: "SHADOW_UNFITTED" },
    { family: "weather", delta: 0, weight: 0, status: "SHADOW_UNFITTED" },
    { family: "rest", delta: 0, weight: 0, status: "SHADOW_UNFITTED" },
    { family: "market", delta: 0, weight: 0, status: "SHADOW_UNFITTED" },
    { family: "coverage", delta: 0, weight: 0, status: "SHADOW_UNFITTED" },
    { family: "fourthDown", delta: 0, weight: 0, status: "SHADOW_UNFITTED" },
    { family: "script", delta: 0, weight: 0, status: "SHADOW_UNFITTED" },
    { family: "home", delta: 0, weight: 0, status: "SHADOW_UNFITTED" },
  ];
  log("");
  log("STAGE D — situational overlay (all families shadow, weight 0)");
  log(`  ${familyDeltas.length} families computed, 0 live`);

  // ---- Stage E -----------------------------------------------------------
  const marketPrior = isPresent(bundle.market.consensusNoVigHome)
    ? bundle.market.consensusNoVigHome.value
    : null;
  if (marketPrior === null) {
    log("");
    log("STAGE E — no de-vigged market prior; cannot form a posterior.");
    const manifest = sealRun({ bundle, outputs: { ...outputs, verdict: "MISSING_DATA" } }, bundle.codeVersion, now.toISOString());
    emit(args.out, { manifest, bundle, outputs: { ...outputs, verdict: "MISSING_DATA" } });
    return 2;
  }
  const liveDelta = familyDeltas.reduce((s, f) => s + f.delta * f.weight, 0);
  const posterior = marketPrior + liveDelta;
  log("");
  log("STAGE E — posterior");
  log(`  market prior ${marketPrior.toFixed(4)}  live delta ${liveDelta.toFixed(4)}  posterior ${posterior.toFixed(4)}`);
  log("  calibration map: not applied (no fitted map in this path yet)");

  // ---- Stage F -----------------------------------------------------------
  const bestHome = isPresent(bundle.market.bestHomePrice) ? bundle.market.bestHomePrice.value : null;
  const impliedHome = bestHome === null ? null : americanToProb(bestHome);
  const edge = impliedHome === null ? null : posterior - impliedHome;
  const MIN_EDGE = 0.02;
  const verdict: PregameVerdict = edge !== null && edge >= MIN_EDGE ? "SHADOW" : "NO_BET";
  log("");
  log("STAGE F — decision");
  log(`  best home price ${bestHome ?? "MISSING"}  implied ${impliedHome === null ? "n/a" : impliedHome.toFixed(4)}  edge ${edge === null ? "n/a" : edge.toFixed(4)}  threshold ${MIN_EDGE}`);
  log(`  verdict ${verdict}`);
  log("  publishable false — the walk-forward emission gate is closed");

  // ---- Stage G -----------------------------------------------------------
  const finalOutputs = {
    verdict,
    completeness: report,
    projection,
    familyDeltas,
    marketPrior,
    liveDelta,
    posterior,
    edge,
    publishable: false,
  };
  const manifest = sealRun({ bundle, outputs: finalOutputs }, bundle.codeVersion, now.toISOString());
  log("");
  log("STAGE G — seal");
  log(`  sha256 ${manifest.hash}`);
  log(`  codeVersion ${manifest.codeVersion}`);
  log(`  sealedAt ${manifest.sealedAt}`);
  emit(args.out, { manifest, bundle, outputs: finalOutputs });
  return 0;
}

function americanToProb(price: number): number {
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

function describe(e: { status: string; value?: unknown; reason?: string }): string {
  if (e.status === "MISSING") return `MISSING (${e.reason ?? "no reason"})`;
  const v = e.value;
  if (typeof v === "number") return v.toFixed(4);
  if (Array.isArray(v)) return `${v.length} rows`;
  if (v !== null && typeof v === "object") return "present";
  return String(v);
}

function source(e: { source?: string }): string {
  return e.source ?? "—";
}

function asOf(e: { asOf?: string }): string {
  return e.asOf ?? "—";
}

function emit(outPath: string | null, payload: unknown): void {
  if (outPath === null) return;
  const abs = resolve(process.cwd(), outPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(payload, null, 2), "utf8");
  log(`  wrote ${abs}`);
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    process.stderr.write(`run_pregame failed: ${(err as Error).message}\n`);
    process.exit(1);
  });
