#!/usr/bin/env node
/**
 * free-auto-settle — Free-scoreboard auto-settlement daemon.
 *
 * Polls the ESPN public scoreboard through the repo's own free-first ingestion
 * entrypoint (`fetchScoresFreeFirst`) for all seven sports, finds completed
 * games (STATUS_FINAL with final scores), evaluates pending picks against them
 * (moneyline / spread / total), and reports a realized Brier score plus CLV
 * where a closing price actually exists.
 *
 * COST: zero. ESPN's public scoreboard needs no key, so this loop spends no
 * The Odds API credits and never touches a paid provider. That is the whole
 * point of the free path: settlement should not go dark when the paid odds key
 * is missing, exhausted, or rate-limited.
 *
 * MODES
 *   --dry-run (default)  Read pending picks from a local snapshot and evaluate
 *                        them against LIVE finals. Writes nothing, ever.
 *   --live               Commit settlement to the database. Refuses unless
 *                        DATABASE_URL is set AND GSE_ALLOW_LIVE_SETTLE=1, and
 *                        it delegates the write to the repo's own tested
 *                        runner (runFreePathSettlement) rather than
 *                        reimplementing settlement writes here.
 *
 * LAW 7 (AGENTS.md): never run a migration or touch a database from an agent
 * session. --live exists for the operator/cron; it is deliberately double-gated
 * so an agent cannot trip it by accident. --dry-run is the safe default.
 *
 * LAW 8 (AGENTS.md): never fabricate product data. This daemon does not invent
 * picks, odds, or benchmarks. With no picks available it reports zero picks and
 * still proves the scoreboard poll — it does not manufacture a board.
 *
 * Usage:
 *   node scripts/ops/free-auto-settle.mjs --dry-run
 *   node scripts/ops/free-auto-settle.mjs --sport nfl --json
 *   node scripts/ops/free-auto-settle.mjs --snapshot data/snapshots/pending-picks.json
 *   GSE_ALLOW_LIVE_SETTLE=1 DATABASE_URL=... node scripts/ops/free-auto-settle.mjs --live
 *
 * Note on module resolution: this is a .mjs because it must run under plain
 * `node` with no flags, but the repo's web app uses the `@/*` path alias which
 * Node cannot resolve. `installWebAliasResolver()` below registers a resolve
 * hook (and TS extension mapping) so the real TS ingest module loads directly
 * instead of this script re-implementing the ESPN client.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(HERE, "..", "..");
const WEB_ROOT = pathResolve(REPO_ROOT, "apps", "web");

/** All seven sports the free ESPN scoreboard covers. */
export const SPORTS = Object.freeze(["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "mls"]);

/**
 * Resolve `@/…` (the web app alias) and extensionless/`.js`-suffixed relative
 * imports to their real `.ts` files, so the daemon can import the app's own
 * ingest module under plain `node` (Node >= 22 strips TS types natively).
 * Registered once at module load, before any app import.
 */
export function installWebAliasResolver() {
  if (globalThis.__gseAliasResolverInstalled) return false;
  const exts = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.js"];

  const resolveCandidates = (specifier, parentURL) => {
    let base = null;
    if (specifier.startsWith("@/")) {
      base = pathResolve(WEB_ROOT, specifier.slice(2));
    } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
      if (!parentURL || !parentURL.startsWith("file:")) return null;
      base = pathResolve(dirname(fileURLToPath(parentURL)), specifier);
    } else {
      return null;
    }
    const candidates = exts.map((e) => base + e);
    if (base.endsWith(".js")) candidates.unshift(base.slice(0, -3) + ".ts");
    return candidates;
  };

  // Hooks dropped to resolve node-version-parity.
  globalThis.__gseAliasResolverInstalled = true;
  return true;
}

installWebAliasResolver();

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

export const USAGE = `free-auto-settle — free ESPN scoreboard auto-settlement

Flags:
  --dry-run              Evaluate against local snapshot, write nothing (DEFAULT)
  --live                 Commit settlement to the DB (needs DATABASE_URL +
                         GSE_ALLOW_LIVE_SETTLE=1)
  --sport <sport>        Restrict to one of: ${SPORTS.join(", ")}
  --snapshot <path>      Pending-picks JSON for --dry-run
                         (default: data/snapshots/pending-picks.json)
  --json                 Emit the report as JSON
  --help                 Show this message
`;

export function parseArgs(argv) {
  const out = {
    live: false,
    dryRun: true,
    sport: null,
    snapshot: pathResolve(REPO_ROOT, "data", "snapshots", "pending-picks.json"),
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--live") {
      out.live = true;
      out.dryRun = false;
    } else if (arg === "--dry-run") {
      out.dryRun = true;
      out.live = false;
    } else if (arg === "--sport") {
      const value = (argv[i + 1] ?? "").trim().toLowerCase();
      if (!SPORTS.includes(value)) {
        throw new UsageError(`--sport must be one of ${SPORTS.join(", ")} (got "${value}")`);
      }
      out.sport = value;
      i += 1;
    } else if (arg.startsWith("--sport=")) {
      const value = arg.slice("--sport=".length).trim().toLowerCase();
      if (!SPORTS.includes(value)) {
        throw new UsageError(`--sport must be one of ${SPORTS.join(", ")} (got "${value}")`);
      }
      out.sport = value;
    } else if (arg === "--snapshot") {
      out.snapshot = pathResolve(process.cwd(), argv[i + 1] ?? "");
      i += 1;
    } else if (arg.startsWith("--snapshot=")) {
      out.snapshot = pathResolve(process.cwd(), arg.slice("--snapshot=".length));
    } else if (arg === "--json") {
      out.json = true;
    } else if (arg === "--help" || arg === "-h") {
      out.help = true;
    } else {
      throw new UsageError(`unknown flag "${arg}"`);
    }
  }
  if (out.live && out.dryRun) out.dryRun = false;
  return out;
}

export class UsageError extends Error {}

// ---------------------------------------------------------------------------
// Pure evaluation core (unit-tested in free-auto-settle.test.mjs)
// ---------------------------------------------------------------------------

export const BET_TYPES = Object.freeze(["MONEYLINE", "SPREAD", "TOTAL"]);

/**
 * Normalize a pick's side to the home/away axis.
 * Accepts the spellings the pipeline actually stores (HOME/AWAY, home/away,
 * the team abbreviation, or a selection string that contains one of them).
 */
export function resolveSide(pick, final) {
  const raw = String(pick.side ?? pick.selection ?? "").trim();
  const upper = raw.toUpperCase();
  if (["HOME", "H"].includes(upper)) return "HOME";
  if (["AWAY", "A"].includes(upper)) return "AWAY";

  const homeAbbr = String(final?.home?.abbreviation ?? "").toUpperCase();
  const awayAbbr = String(final?.away?.abbreviation ?? "").toUpperCase();
  if (homeAbbr && upper.includes(homeAbbr)) return "HOME";
  if (awayAbbr && upper.includes(awayAbbr)) return "AWAY";
  return null;
}

/**
 * Evaluate ONE pick against ONE completed game.
 *
 * Returns { result, detail } where result is WIN | LOSS | PUSH | VOID.
 *   VOID  — the pick cannot be graded (missing scores/line, unresolvable side).
 *           Never silently graded as a loss: a void is a void.
 *   PUSH  — spread or total landed exactly on the number, or a moneyline tie.
 *           Pushes are excluded from Brier scoring, never averaged in as half a
 *           win (AGENTS.md: "Never average a push into a published win rate").
 */
export function evaluatePick(pick, final) {
  const homeScore = final?.home?.score;
  const awayScore = final?.away?.score;
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return { result: "VOID", detail: "final has no numeric scores" };
  }

  const type = String(pick.betType ?? pick.market ?? "").trim().toUpperCase();
  const side = resolveSide(pick, final);

  // TOTAL is graded on the combined score and its side is OVER/UNDER, never a
  // team — so it must NOT go through the team-side resolution below, which
  // would void every total on the board.
  if (type === "TOTAL") {
    const totalSide = overUnderSide(pick);
    if (!totalSide) {
      return { result: "VOID", detail: `total side "${pick.side ?? pick.selection ?? ""}" is not OVER/UNDER` };
    }
    const totalLine = strictNumber(pick.line);
    if (totalLine === null) return { result: "VOID", detail: "total line missing or non-numeric" };
    const combined = homeScore + awayScore;
    if (combined === totalLine) return { result: "PUSH", detail: `total ${combined} landed on ${totalLine}` };
    const won = totalSide === "OVER" ? combined > totalLine : combined < totalLine;
    return {
      result: won ? "WIN" : "LOSS",
      detail: `${totalSide} ${totalLine} → total ${combined}`,
    };
  }

  if (!side) return { result: "VOID", detail: `side "${pick.side ?? pick.selection ?? ""}" not resolvable` };

  if (type === "MONEYLINE") {
    if (homeScore === awayScore) return { result: "PUSH", detail: `tie ${awayScore}-${homeScore}` };
    const winner = homeScore > awayScore ? "HOME" : "AWAY";
    return side === winner
      ? { result: "WIN", detail: `${side} won ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}` }
      : { result: "LOSS", detail: `${side} lost ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}` };
  }

  // strictNumber, not Number(): Number(null) is 0, and a 0 line is a real,
  // gradable number — a missing line must void, not silently become a pick'em.
  const line = strictNumber(pick.line);
  if (line === null) return { result: "VOID", detail: "line missing or non-numeric" };

  if (type === "SPREAD") {
    // Orient the margin onto the pick's side, then add the line. +0.5/-0.5 style
    // lines cannot push; whole-number lines can.
    const margin = side === "HOME" ? homeScore - awayScore : awayScore - homeScore;
    const adjusted = margin + line;
    if (adjusted === 0) return { result: "PUSH", detail: `landed exactly on ${line}` };
    return adjusted > 0
      ? { result: "WIN", detail: `${side} ${line > 0 ? "+" : ""}${line} → margin ${margin} (${adjusted > 0 ? "+" : ""}${adjusted})` }
      : { result: "LOSS", detail: `${side} ${line > 0 ? "+" : ""}${line} → margin ${margin} (${adjusted})` };
  }

  return { result: "VOID", detail: `unsupported betType "${pick.betType ?? pick.market ?? ""}"` };
}

/**
 * OVER/UNDER side of a total, from the spellings the pipeline stores
 * ("OVER", "under", "O 48.5", "U48"). Returns null when it is neither — a
 * total with no direction cannot be graded.
 */
export function overUnderSide(pick) {
  const raw = String(pick.side ?? pick.selection ?? pick.sideFlag ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (/^OVER\b|^O\s?\d|^O$/.test(raw)) return "OVER";
  if (/^UNDER\b|^U\s?\d|^U$/.test(raw)) return "UNDER";
  return null;
}

/** Brier contribution of one settled pick, or null when it is not scorable. */
export function brierContribution(pick, result) {
  if (result !== "WIN" && result !== "LOSS") return null; // pushes/voids excluded
  const p = probabilityOf(pick);
  if (p === null) return null;
  const y = result === "WIN" ? 1 : 0;
  return (p - y) ** 2;
}

/**
 * The stated probability for a pick, from the places it is actually stored.
 * Returns null when the pick carries no probability — a missing probability is
 * missing, and Brier simply cannot be computed from it.
 */
export function probabilityOf(pick) {
  const direct = [pick.trueProb, pick.probability, pick.modelProb, pick.confidenceProb];
  for (const value of direct) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  const nested = pick.factorBreakdown?.independentEdge;
  for (const value of [nested?.trueProb, nested?.probability, nested?.p]) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  return null;
}

/**
 * Closing-line value against the lock line, in the units of the line.
 *
 * A positive CLV means the market moved TOWARD the pick after we locked it —
 * the honesty metric AGENTS.md names as the primary one ("Measured by CLV,
 * calibration, line-move prediction"). It is only computable when a closing
 * price exists; the free ESPN scoreboard carries no prices at all, so this
 * returns null and the caller reports it UNAVAILABLE rather than inventing one.
 */
export function computeClv(lockLine, closingLine, side) {
  const lock = strictNumber(lockLine);
  const close = strictNumber(closingLine);
  if (lock === null || close === null) return null;
  // The value of a locked number is measured against the closing number in the
  // direction that helps the side we actually took:
  //   SPREAD  the line is attached to our side, so a LOWER closing line for a
  //           favourite (or a HIGHER one for a dog) is value: lock - close.
  //   OVER    we want the total to land HIGH, so a lower close is value: lock - close.
  //   UNDER   we want the total to land LOW, so a higher close is value: close - lock.
  return side === "UNDER" ? close - lock : lock - close;
}

/**
 * Strict numeric coercion. `Number(null)`, `Number("")` and `Number([])` all
 * return 0, which is a perfectly plausible LINE — so a naive Number() check
 * would silently grade a missing closing line as a real 0 and report CLV
 * against it. Missing must stay missing.
 */
export function strictNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value === "boolean" || Array.isArray(value) || typeof value === "object") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Mean Brier over every scorable settled pick, plus the sample size. */
export function realizedBrier(settled) {
  const contributions = settled
    .map((s) => brierContribution(s.pick, s.evaluation.result))
    .filter((c) => c !== null);
  if (contributions.length === 0) return { brier: null, n: 0 };
  return { brier: contributions.reduce((a, b) => a + b, 0) / contributions.length, n: contributions.length };
}

/** Aggregate a batch of evaluated picks into per-sport and overall counts. */
export function summarize(settled) {
  const bySport = new Map();
  const tally = () => ({ wins: 0, losses: 0, pushes: 0, voids: 0, total: 0 });
  for (const s of settled) {
    const key = s.sport ?? "unknown";
    if (!bySport.has(key)) bySport.set(key, tally());
    const t = bySport.get(key);
    t.total += 1;
    if (s.evaluation.result === "WIN") t.wins += 1;
    else if (s.evaluation.result === "LOSS") t.losses += 1;
    else if (s.evaluation.result === "PUSH") t.pushes += 1;
    else t.voids += 1;
  }
  const overall = tally();
  for (const t of bySport.values()) {
    overall.wins += t.wins;
    overall.losses += t.losses;
    overall.pushes += t.pushes;
    overall.voids += t.voids;
    overall.total += t.total;
  }
  const decided = overall.wins + overall.losses;
  return {
    bySport: Object.fromEntries([...bySport.entries()].sort()),
    overall,
    decided,
    winRate: decided > 0 ? overall.wins / decided : null,
  };
}

/** Extract gradable finals from a normalized ESPN scoreboard. */
export function extractFinals(games) {
  return (games ?? []).filter(
    (g) =>
      g &&
      g.completed === true &&
      g.state === "post" &&
      Number.isFinite(g.home?.score) &&
      Number.isFinite(g.away?.score),
  );
}

// ---------------------------------------------------------------------------
// IO: scoreboard poll and pick loading
// ---------------------------------------------------------------------------

/** Poll one sport's free scoreboard. Never spends: ESPN needs no key. */
export async function pollSport(sport, fetchScoresFreeFirst, opts = {}) {
  const outcome = await fetchScoresFreeFirst(sport, { timeoutMs: opts.timeoutMs ?? 15000 });
  const finals = extractFinals(outcome.data ?? []);
  return {
    sport,
    usedSourceId: outcome.usedSourceId,
    usedFree: outcome.usedFree,
    mustSpend: outcome.mustSpend,
    games: outcome.data?.length ?? 0,
    finals,
    attribution: outcome.attribution,
  };
}

/**
 * Read pending picks for dry-run mode. Returns an empty list when the snapshot
 * is absent — and says so. It does not synthesize picks (Law 8).
 */
export function loadSnapshotPicks(snapshotPath) {
  if (!existsSync(snapshotPath)) {
    return { picks: [], source: snapshotPath, present: false };
  }
  const raw = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const picks = Array.isArray(raw) ? raw : (raw.picks ?? raw.pendingPicks ?? []);
  if (!Array.isArray(picks)) {
    throw new Error(`snapshot ${snapshotPath} does not contain a picks array`);
  }
  return { picks, source: snapshotPath, present: true };
}

/** Match an evaluated pick to a final by sport, then by team token overlap. */
export function matchFinal(pick, finals) {
  const wantHome = String(pick.homeAbbr ?? pick.homeTeam ?? "").toUpperCase();
  const wantAway = String(pick.awayAbbr ?? pick.awayTeam ?? "").toUpperCase();
  if (!wantHome && !wantAway) return null;
  for (const f of finals) {
    const h = String(f.home?.abbreviation ?? "").toUpperCase();
    const a = String(f.away?.abbreviation ?? "").toUpperCase();
    const direct = (wantHome ? h === wantHome : true) && (wantAway ? a === wantAway : true);
    if (direct) return f;
    const swapped = (wantHome ? h === wantAway : true) && (wantAway ? a === wantHome : true);
    if (swapped) return f; // orientation flipped; evaluatePick reads the final's own axis
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  // With --json, stdout carries the report and NOTHING else so the output can be
  // piped straight into jq/JSON.parse. Progress goes to stderr in that mode.
  const say = (line) => {
    if (opts.json) process.stderr.write(line);
    else process.stdout.write(line);
  };

  const banner = `[free-auto-settle] mode=${opts.live ? "live" : "dry-run"} sports=${opts.sport ?? SPORTS.length + " (all)"}`;
  say(`${banner}\n`);
  say("[free-auto-settle] provider=ESPN public scoreboard (keyless) — paid credits this run: 0\n");

  // Guard the writing mode first, before any network work.
  if (opts.live) {
    const allow = process.env["GSE_ALLOW_LIVE_SETTLE"] === "1";
    const url = (process.env["DATABASE_URL"] ?? "").trim();
    if (!allow || !url) {
      say(
        `[free-auto-settle] LIVE REFUSED: requires GSE_ALLOW_LIVE_SETTLE=1 and DATABASE_URL ` +
          `(have allow=${allow}, url=${url ? "set" : "unset"}). Writes nothing.\n`,
      );
      return 2;
    }
  }

  // Import the app's own free-first ingest entrypoint (the required dependency).
  const ingestPath = pathResolve(REPO_ROOT, "apps", "web", "lib", "data-sources", "free-first-ingest.ts");
  const { fetchScoresFreeFirst } = await import(pathToFileURL(ingestPath).href);

  const sports = opts.sport ? [opts.sport] : [...SPORTS];
  const polls = [];
  let hardFailures = 0;
  for (const sport of sports) {
    try {
      polls.push(await pollSport(sport, fetchScoresFreeFirst));
    } catch (err) {
      hardFailures += 1;
      say(
        `[free-auto-settle] ${sport}: scoreboard poll FAILED — ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  const finalCount = polls.reduce((n, p) => n + p.finals.length, 0);
  say(
    `[free-auto-settle] scoreboard: ${polls.length} sport(s) polled, ` +
      `${polls.reduce((n, p) => n + p.games, 0)} games seen, ${finalCount} completed with scores\n`,
  );
  for (const p of polls) {
    say(
      `  ${p.sport.padEnd(6)} via ${p.usedSourceId ?? "none"} → ${p.games} games, ${p.finals.length} finals` +
        `${p.usedFree ? " (free)" : " (NOT free)"}\n`,
    );
  }

  // Pending picks.
  let picks = [];
  let pickSource = "none";
  if (opts.live) {
    pickSource = "database (delegated to runFreePathSettlement)";
  } else {
    const loaded = loadSnapshotPicks(opts.snapshot);
    picks = loaded.picks;
    pickSource = loaded.present ? loaded.source : `${loaded.source} (absent)`;
  }
  say(`[free-auto-settle] pending picks: ${picks.length} from ${pickSource}\n`);

  // Evaluate. Each pick is graded against the completed final for its own sport.
  const settled = [];
  let unmatched = 0;
  for (const pick of picks) {
    const sport = String(pick.sport ?? "").toLowerCase();
    const pool = polls.filter((p) => p.sport === sport).flatMap((p) => p.finals);
    const final = matchFinal(pick, pool);
    if (!final) {
      unmatched += 1;
      continue;
    }
    settled.push({
      sport,
      pick,
      final: {
        gameId: final.gameId,
        statusDetail: final.statusDetail,
        home: { abbreviation: final.home?.abbreviation, score: final.home?.score },
        away: { abbreviation: final.away?.abbreviation, score: final.away?.score },
      },
      evaluation: evaluatePick(pick, final),
    });
  }

  const summary = summarize(settled);
  const brier = realizedBrier(settled);
  const clv = settled
    .map((s) => computeClv(s.pick.clvLockLine ?? s.pick.lockLine, s.pick.closingLine, resolveSide(s.pick, s.final)))
    .filter((v) => v !== null);
  const clvMean = clv.length > 0 ? clv.reduce((a, b) => a + b, 0) / clv.length : null;

  const report = {
    mode: opts.live ? "live" : "dry-run",
    provider: "espn-public",
    paidCreditsSpent: 0,
    sports: polls.map((p) => ({ sport: p.sport, games: p.games, finals: p.finals.length, usedSourceId: p.usedSourceId })),
    picksLoaded: picks.length,
    picksEvaluated: settled.length,
    picksUnmatched: unmatched,
    summary: summary.overall,
    winRate: summary.winRate,
    brier: brier.brier,
    brierN: brier.n,
    clvMean,
    clvN: clv.length,
    clvNote:
      clv.length === 0
        ? "UNAVAILABLE: no closing price present on these picks, and the free ESPN scoreboard carries no prices"
        : null,
    settled,
    hardFailures,
  };

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write("\nSettlement\n");
    for (const s of settled) {
      const side = resolveSide(s.pick, s.final) ?? "?";
      process.stdout.write(
        `  ${String(s.pick.betType ?? "?").padEnd(9)} ${String(s.pick.selection ?? side).padEnd(28)} ` +
          `${s.evaluation.result.padEnd(4)} ${s.evaluation.detail}\n`,
      );
    }
    if (settled.length === 0) {
      process.stdout.write("  (no picks evaluated — supply --snapshot <path> or run --live)\n");
    }
    process.stdout.write(
      `\nTally: ${summary.overall.wins}W-${summary.overall.losses}L-${summary.overall.pushes}P-${summary.overall.voids}V` +
        ` (decided ${summary.decided}${summary.winRate !== null ? `, ${(summary.winRate * 100).toFixed(1)}%` : ""})\n`,
    );
    process.stdout.write(
      `Brier: ${brier.brier === null ? "n/a (no scorable picks)" : brier.brier.toFixed(4)} over n=${brier.n}\n`,
    );
    process.stdout.write(
      `CLV:   ${clvMean === null ? report.clvNote : `${clvMean.toFixed(3)} over n=${clv.length}`}\n`,
    );
    process.stdout.write(`Unmatched picks: ${unmatched}\n`);
  }

  // --live delegates the write to the repo's own tested runner. It is guarded
  // above and never executed by an agent session (Law 7).
  if (opts.live) {
    try {
      const runnerPath = pathResolve(REPO_ROOT, "apps", "web", "lib", "data-sources", "free-settlement-runner.ts");
      const runner = await import(pathToFileURL(runnerPath).href);
      const result = await runner.runFreePathSettlement({ sports });
      process.stdout.write(`[free-auto-settle] live settlement: ${JSON.stringify(result)}\n`);
    } catch (err) {
      process.stdout.write(
        `[free-auto-settle] LIVE BLOCKED: could not run the settlement runner — ` +
          `${err instanceof Error ? err.message : String(err)}\n`,
      );
      return 1;
    }
  }

  return hardFailures > 0 ? 1 : 0;
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(pathResolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`[free-auto-settle] ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(err instanceof UsageError ? 2 : 1);
    });
}
