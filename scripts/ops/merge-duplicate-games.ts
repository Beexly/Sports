#!/usr/bin/env npx tsx
/**
 * Merge duplicate `games` rows (Neon, observed 2026-09-02): the same real
 * contest exists up to three times — an Odds API hash id, a TheRundown hex
 * id (city-only team names), and TWO ESPN id formats — each with its own
 * picks. Duplicate groups counted by ESPN id at the time this was written:
 * MLB 284, MLS 75, NFL 48, NCAAF 45.
 *
 * `picks` carries @@unique([gameId, pickType]), so a duplicate row's picks
 * cannot always be re-pointed onto the canonical row without a unique
 * collision, and pick history must never be lost or mutated. This script
 * never deletes a row and never touches `picks`, `settlement_observations`,
 * `settlement_anomalies`, or `pick_settlement_events` — those stay on the
 * alias row, which remains a valid `games` row forever (see the
 * `mergedIntoGameId` self-reference on Game, and
 * packages/ingestion-pipeline/src/game-identity.ts, which already follows
 * that column so new ingestion never recreates or writes onto a tombstone).
 *
 * Grouping / canonical selection / pick-conflict detection is the pure,
 * unit-tested logic in apps/web/lib/ops/game-merge-plan.ts — read that file
 * for the exact rules. This script only loads rows, calls it, prints the
 * plan, and — ONLY with --execute — applies it.
 *
 * SAFETY
 *   - DRY RUN BY DEFAULT. No writes happen unless --execute is passed.
 *   - Idempotent: an alias (mergedIntoGameId set) is excluded from further
 *     grouping, so re-running after --execute finds nothing to do.
 *   - Exits non-zero on any error — never partially reports success.
 *   - The founder runs this; it is never invoked from CI or a cron.
 *
 * Run (dry run — safe, no writes):
 *   npm run ops:merge-games
 *   npm run ops:merge-games -- --sport baseball_mlb --json
 *   npm run ops:merge-games -- --limit 5
 *
 * Run (real write — owner-gated, requires a live DATABASE_URL):
 *   npm run ops:merge-games -- --execute
 *   npm run ops:merge-games -- --execute --sport baseball_mlb
 *
 * Args:
 *   --execute        Apply the plan. Omit for a dry run (default).
 *   --sport <key>    Restrict to one Odds-API-style sport key (e.g. baseball_mlb).
 *   --json           Print the plan as JSON instead of a human-readable summary.
 *   --limit <n>      Cap the number of duplicate groups processed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@sports/db";
import type { Prisma } from "@prisma/client";
import {
  buildMergePlan,
  type MergeCandidateGame,
  type MergePlan,
  type PickSummary,
} from "../../apps/web/lib/ops/game-merge-plan.js";

// ── Prisma's default compound-unique field names for the tables that need
// collision-aware re-pointing (`@@unique([...])` with no explicit `name:`
// in schema.prisma concatenates the field names with "_"). ──
const OPENING_LINE_UNIQUE = "gameId_market" as const;
const TEAM_GAME_LOG_UNIQUE = "gameId_teamName" as const;
const GAME_SIGNAL_UNIQUE = "gameId_sourceName_signalKey" as const;
const SHADOW_SIGNAL_UNIQUE = "gameId_modelVersion" as const;

// Nullable Game enrichment fields carried from an alias onto the canonical
// ONLY when the canonical itself is null there (never overwrite). The design
// doc calls these "espnEventId-style fields / scores" — the schema has no
// literal espnEventId column, so this is every nullable enrichment field
// that plausibly differs per feed.
const FILL_IF_NULL_FIELDS = [
  "homeScore",
  "awayScore",
  "restDaysHome",
  "restDaysAway",
  "scheduleDensityHome",
  "scheduleDensityAway",
  "currentEdgeIndex",
  "openingSpread",
  "openingTotal",
] as const;

interface Args {
  readonly execute: boolean;
  readonly sportKey: string | null;
  readonly json: boolean;
  readonly limit: number | null;
}

/**
 * Strict option parsing. A malformed scope must never widen silently: `--sport`
 * without a value, or `--limit` with anything but a positive integer, used to
 * fall back to "every sport, every group", which on `--execute` is the one
 * mistake this tool must not let an owner make. Both now abort before any
 * database read.
 */
function parseArgs(argv: readonly string[]): Args {
  const known = new Set(["--execute", "--json", "--sport", "--limit"]);
  const execute = argv.includes("--execute");
  const json = argv.includes("--json");
  const optionValue = (flag: string): string | null => {
    const idx = argv.indexOf(flag);
    if (idx < 0) return null;
    const value = argv[idx + 1];
    if (value === undefined || value.startsWith("-")) {
      throw new Error(`${flag} requires a value (got ${value === undefined ? "nothing" : JSON.stringify(value)})`);
    }
    return value;
  };
  const sportKey = optionValue("--sport");
  const limitRaw = optionValue("--limit");
  let limit: number | null = null;
  if (limitRaw !== null) {
    if (!/^\d+$/.test(limitRaw) || Number(limitRaw) < 1) {
      throw new Error(`--limit must be a positive integer (got ${JSON.stringify(limitRaw)})`);
    }
    limit = Number(limitRaw);
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("-") && !known.has(arg)) throw new Error(`unknown option ${JSON.stringify(arg)}`);
    if (arg === "--sport" || arg === "--limit") i++;
  }
  return { execute, sportKey, json, limit };
}

type GameRow = Awaited<ReturnType<typeof loadGames>>[number];

async function loadGames(sportKey: string | null) {
  return db.game.findMany({
    where: sportKey ? { sport: { key: sportKey } } : undefined,
    select: {
      id: true,
      externalId: true,
      sportId: true,
      sport: { select: { key: true } },
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      createdAt: true,
      mergedIntoGameId: true,
      status: true,
      homeScore: true,
      awayScore: true,
      restDaysHome: true,
      restDaysAway: true,
      scheduleDensityHome: true,
      scheduleDensityAway: true,
      currentEdgeIndex: true,
      openingSpread: true,
      openingTotal: true,
      _count: { select: { picks: true, odds: true, oddsLineSnapshots: true } },
    },
  });
}

function toCandidate(row: GameRow): MergeCandidateGame {
  return {
    id: row.id,
    externalId: row.externalId,
    sportId: row.sportId,
    sportKey: row.sport.key,
    homeTeamName: row.homeTeamName,
    awayTeamName: row.awayTeamName,
    commenceTime: row.commenceTime,
    createdAt: row.createdAt,
    mergedIntoGameId: row.mergedIntoGameId,
    pickCount: row._count.picks,
    oddsCount: row._count.odds,
    oddsLineSnapshotCount: row._count.oddsLineSnapshots,
  };
}

async function loadPicksByGameId(
  gameIds: readonly string[],
): Promise<Map<string, readonly PickSummary[]>> {
  if (gameIds.length === 0) return new Map();
  const picks = await db.pick.findMany({
    where: { gameId: { in: [...gameIds] } },
    select: { id: true, gameId: true, pickType: true, selection: true, result: true },
  });
  const byGameId = new Map<string, PickSummary[]>();
  for (const p of picks) {
    const list = byGameId.get(p.gameId) ?? [];
    list.push({ id: p.id, gameId: p.gameId, pickType: p.pickType, selection: p.selection, result: p.result });
    byGameId.set(p.gameId, list);
  }
  return byGameId;
}

// ── Collision-aware child re-pointing ──────────────────────────────────────

interface RepointOutcome {
  readonly table: string;
  readonly moved: number;
  readonly skipped: ReadonlyArray<{ readonly id: string; readonly reason: string }>;
}

/**
 * Every table below is re-pointable per the design doc. The four with a
 * `gameId`-based unique constraint (openingLine, teamGameLog, gameSignal,
 * shadowSignal) are moved row-by-row with a collision check first; the rest
 * have no such constraint and move via one `updateMany`. `picks`,
 * `settlement_observations`, `settlement_anomalies`, and
 * `pick_settlement_events` are NEVER touched — they are settlement history
 * and stay on the alias row.
 *
 * `dryRun=true` performs only the read-side collision check (no writes) so
 * the SAME function powers both the printed preview and the real apply.
 */
async function repointChildTables(
  client: typeof db | Prisma.TransactionClient,
  aliasId: string,
  canonicalId: string,
  dryRun: boolean,
): Promise<RepointOutcome[]> {
  const outcomes: RepointOutcome[] = [];

  // -- openingLine: unique(gameId, market) --
  {
    const rows = await client.openingLine.findMany({
      where: { gameId: aliasId },
      select: { id: true, market: true },
    });
    const skipped: Array<{ id: string; reason: string }> = [];
    let moved = 0;
    for (const row of rows) {
      const collision = await client.openingLine.findUnique({
        where: { [OPENING_LINE_UNIQUE]: { gameId: canonicalId, market: row.market } } as never,
        select: { id: true },
      });
      if (collision) {
        skipped.push({ id: row.id, reason: `canonical already has an opening_lines row for market=${row.market}` });
        continue;
      }
      if (!dryRun) await client.openingLine.update({ where: { id: row.id }, data: { gameId: canonicalId } });
      moved += 1;
    }
    outcomes.push({ table: "opening_lines", moved, skipped });
  }

  // -- teamGameLog: unique(gameId, teamName) --
  {
    const rows = await client.teamGameLog.findMany({
      where: { gameId: aliasId },
      select: { id: true, teamName: true },
    });
    const skipped: Array<{ id: string; reason: string }> = [];
    let moved = 0;
    for (const row of rows) {
      const collision = await client.teamGameLog.findUnique({
        where: { [TEAM_GAME_LOG_UNIQUE]: { gameId: canonicalId, teamName: row.teamName } } as never,
        select: { id: true },
      });
      if (collision) {
        skipped.push({ id: row.id, reason: `canonical already has a team_game_logs row for teamName=${row.teamName}` });
        continue;
      }
      if (!dryRun) await client.teamGameLog.update({ where: { id: row.id }, data: { gameId: canonicalId } });
      moved += 1;
    }
    outcomes.push({ table: "team_game_logs", moved, skipped });
  }

  // -- gameSignal: unique(gameId, sourceName, signalKey) --
  {
    const rows = await client.gameSignal.findMany({
      where: { gameId: aliasId },
      select: { id: true, sourceName: true, signalKey: true },
    });
    const skipped: Array<{ id: string; reason: string }> = [];
    let moved = 0;
    for (const row of rows) {
      const collision = await client.gameSignal.findUnique({
        where: {
          [GAME_SIGNAL_UNIQUE]: { gameId: canonicalId, sourceName: row.sourceName, signalKey: row.signalKey },
        } as never,
        select: { id: true },
      });
      if (collision) {
        skipped.push({
          id: row.id,
          reason: `canonical already has a game_signals row for sourceName=${row.sourceName} signalKey=${row.signalKey}`,
        });
        continue;
      }
      if (!dryRun) await client.gameSignal.update({ where: { id: row.id }, data: { gameId: canonicalId } });
      moved += 1;
    }
    outcomes.push({ table: "game_signals", moved, skipped });
  }

  // -- shadowSignal: unique(gameId, modelVersion) --
  {
    const rows = await client.shadowSignal.findMany({
      where: { gameId: aliasId },
      select: { id: true, modelVersion: true },
    });
    const skipped: Array<{ id: string; reason: string }> = [];
    let moved = 0;
    for (const row of rows) {
      const collision = await client.shadowSignal.findUnique({
        where: { [SHADOW_SIGNAL_UNIQUE]: { gameId: canonicalId, modelVersion: row.modelVersion } } as never,
        select: { id: true },
      });
      if (collision) {
        skipped.push({ id: row.id, reason: `canonical already has a shadow_signals row for modelVersion=${row.modelVersion}` });
        continue;
      }
      if (!dryRun) await client.shadowSignal.update({ where: { id: row.id }, data: { gameId: canonicalId } });
      moved += 1;
    }
    outcomes.push({ table: "shadow_signals", moved, skipped });
  }

  // -- No gameId-based unique constraint: plain move, no collisions possible. --
  outcomes.push({
    table: "odds",
    moved: dryRun
      ? await client.odds.count({ where: { gameId: aliasId } })
      : (await client.odds.updateMany({ where: { gameId: aliasId }, data: { gameId: canonicalId } })).count,
    skipped: [],
  });
  outcomes.push({
    table: "odds_line_snapshots",
    moved: dryRun
      ? await client.oddsLineSnapshot.count({ where: { gameId: aliasId } })
      : (await client.oddsLineSnapshot.updateMany({ where: { gameId: aliasId }, data: { gameId: canonicalId } })).count,
    skipped: [],
  });
  outcomes.push({
    table: "pick_signal_snapshots",
    moved: dryRun
      ? await client.pickSignalSnapshot.count({ where: { gameId: aliasId } })
      : (await client.pickSignalSnapshot.updateMany({ where: { gameId: aliasId }, data: { gameId: canonicalId } })).count,
    skipped: [],
  });
  outcomes.push({
    table: "creator_assets",
    moved: dryRun
      ? await client.creatorAsset.count({ where: { gameId: aliasId } })
      : (await client.creatorAsset.updateMany({ where: { gameId: aliasId }, data: { gameId: canonicalId } })).count,
    skipped: [],
  });
  outcomes.push({
    table: "claude_api_call_records",
    moved: dryRun
      ? await client.claudeApiCallRecord.count({ where: { gameId: aliasId } })
      : (await client.claudeApiCallRecord.updateMany({ where: { gameId: aliasId }, data: { gameId: canonicalId } })).count,
    skipped: [],
  });

  return outcomes;
}

/**
 * Fill only-null enrichment fields on the canonical from the first alias that
 * has a value. Never overwrites a non-null canonical value.
 *
 * Scores are the exception to per-field filling: a final is a PAIR from one
 * row, never a home score from one alias and an away score from another
 * (that would grade picks against a result no feed ever reported). The pair
 * is copied only from an alias that is FINAL with both sides present, and it
 * carries the terminal status with it so the canonical does not end up with
 * a full score and a SCHEDULED status.
 */
function computeCanonicalFillData(
  canonical: GameRow,
  aliases: readonly GameRow[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of FILL_IF_NULL_FIELDS) {
    if (field === "homeScore" || field === "awayScore") continue;
    const canonicalValue = (canonical as unknown as Record<string, unknown>)[field];
    if (canonicalValue != null) continue;
    for (const alias of aliases) {
      const aliasValue = (alias as unknown as Record<string, unknown>)[field];
      if (aliasValue != null) {
        data[field] = aliasValue;
        break;
      }
    }
  }
  if (canonical.homeScore == null && canonical.awayScore == null) {
    const source = aliases.find(
      (alias) => alias.status === "FINAL" && alias.homeScore != null && alias.awayScore != null,
    );
    if (source) {
      data["homeScore"] = source.homeScore;
      data["awayScore"] = source.awayScore;
      if (canonical.status !== "FINAL") data["status"] = "FINAL";
    }
  }
  return data;
}

/** So pending picks on an alias can still grade: copy the canonical's terminal score onto the alias ONLY when the alias has neither score yet. */
function computeAliasGradeFillData(canonical: GameRow, alias: GameRow): Record<string, unknown> {
  if (alias.homeScore != null || alias.awayScore != null) return {};
  if (canonical.homeScore == null || canonical.awayScore == null) return {};
  return { status: canonical.status, homeScore: canonical.homeScore, awayScore: canonical.awayScore };
}

interface GroupExecutionReport {
  readonly canonicalId: string;
  readonly canonicalExternalId: string;
  readonly aliasReports: ReadonlyArray<{
    readonly aliasId: string;
    readonly aliasExternalId: string;
    readonly childRepoints: readonly RepointOutcome[];
    readonly gradeFilled: boolean;
  }>;
  readonly canonicalFillData: Record<string, unknown>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const rows = await loadGames(args.sportKey);
  const candidates = rows.map(toCandidate);
  const byId = new Map(rows.map((r) => [r.id, r]));

  // Two passes: `buildMergePlan` (pure) needs pick data only for games that
  // land in a duplicate group, so run it once with an empty pick map just to
  // discover group membership cheaply, then re-run with real pick data.
  const discovery = buildMergePlan(candidates, new Map());
  const groupedIds = new Set<string>();
  for (const g of discovery.groups) {
    groupedIds.add(g.canonicalId);
    for (const id of g.aliasIds) groupedIds.add(id);
  }
  const picksByGameId = await loadPicksByGameId([...groupedIds]);
  let plan: MergePlan = buildMergePlan(candidates, picksByGameId);

  if (args.limit != null && plan.groups.length > args.limit) {
    // Every derived count follows the truncation, so the printed plan never
    // reports aliases or conflicts that this run will not touch.
    const groups = plan.groups.slice(0, args.limit);
    plan = {
      ...plan,
      groups,
      groupCount: groups.length,
      aliasCount: groups.reduce((n, g) => n + g.aliasIds.length, 0),
      conflictCount: groups.reduce((n, g) => n + g.pickConflicts.length, 0),
    };
  }

  console.log(
    `[merge-duplicate-games] mode=${args.execute ? "EXECUTE" : "DRY-RUN"} ` +
      `sport=${args.sportKey ?? "ALL"} groups=${plan.groupCount} aliases=${plan.aliasCount} ` +
      `pickConflicts=${plan.conflictCount} refusedGroups=${plan.refusedGroupCount}`,
  );
  for (const r of plan.refusedGroups) {
    console.log(
      `[merge-duplicate-games] REFUSED ${r.sportKey}: ${r.memberIds.length} rows span ` +
        `${Math.round(r.spanMs / 60000)}m > ${Math.round(r.windowMs / 60000)}m window (${r.reason}) — ` +
        `split by hand: ${r.memberExternalIds.join(", ")}`,
    );
  }

  // Read-only preview of the child-row re-pointing (including which rows
  // WOULD collide and be skipped) for every group — shown in both dry-run
  // and execute mode, computed the same way execute performs it for real
  // (dryRun=true here means "read only", not "different logic").
  const childRepointPreviews = new Map<string, ReadonlyArray<{ readonly aliasId: string; readonly aliasExternalId: string; readonly repoints: readonly RepointOutcome[] }>>();
  for (const group of plan.groups) {
    const previews: Array<{ aliasId: string; aliasExternalId: string; repoints: RepointOutcome[] }> = [];
    for (let i = 0; i < group.aliasIds.length; i++) {
      const aliasId = group.aliasIds[i]!;
      const repoints = await repointChildTables(db, aliasId, group.canonicalId, true);
      previews.push({ aliasId, aliasExternalId: group.aliasExternalIds[i]!, repoints });
    }
    childRepointPreviews.set(group.canonicalId, previews);
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        { ...plan, groups: plan.groups.map((g) => ({ ...g, childRepoints: childRepointPreviews.get(g.canonicalId) })) },
        null,
        2,
      ),
    );
  } else {
    for (const group of plan.groups) {
      console.log(
        `  [${group.sportKey}] canonical=${group.canonicalId} (${group.canonicalExternalId}) ` +
          `"${group.resolvedHomeTeamName}" vs "${group.resolvedAwayTeamName}" ` +
          `<- aliases=[${group.aliasExternalIds.join(", ")}]`,
      );
      for (const conflict of group.pickConflicts) {
        console.log(
          `    PICK CONFLICT pickType=${conflict.pickType} alias=${conflict.aliasGameId} ` +
            `(${conflict.aliasSelection}) vs ${conflict.referenceIsCanonical ? "canonical" : `alias ${conflict.referenceGameId}`} ` +
            `(${conflict.canonicalSelection}) sidesAgree=${conflict.sidesAgree}`,
        );
      }
      for (const aliasPreview of childRepointPreviews.get(group.canonicalId) ?? []) {
        for (const outcome of aliasPreview.repoints) {
          if (outcome.moved === 0 && outcome.skipped.length === 0) continue;
          console.log(
            `    ${aliasPreview.aliasExternalId} -> ${outcome.table}: moved=${outcome.moved}` +
              (outcome.skipped.length > 0 ? ` skipped=${outcome.skipped.length} (${outcome.skipped.map((s) => s.reason).join("; ")})` : ""),
          );
        }
      }
    }
  }

  if (!args.execute) {
    // The dry-run plan is the artefact the owner reviews before --execute, so
    // it is written to disk too (not only printed), under a distinct name.
    const planPath = writeReport("merge-duplicate-games-plan", {
      plan,
      childRepointPreviews: Object.fromEntries(childRepointPreviews),
    });
    console.log(`[merge-duplicate-games] dry-run plan written to ${planPath}`);
    console.log("[merge-duplicate-games] dry run — no writes made. Re-run with --execute to apply.");
    return;
  }

  const executionReports: GroupExecutionReport[] = [];
  for (const group of plan.groups) {
    const canonicalRow = byId.get(group.canonicalId);
    if (!canonicalRow) throw new Error(`canonical row ${group.canonicalId} vanished between load and execute`);
    const aliasRows = group.aliasIds.map((id) => {
      const row = byId.get(id);
      if (!row) throw new Error(`alias row ${id} vanished between load and execute`);
      return row;
    });

    const canonicalFillData: Record<string, unknown> = {
      ...computeCanonicalFillData(canonicalRow, aliasRows),
    };
    if (group.resolvedHomeTeamName !== canonicalRow.homeTeamName) {
      canonicalFillData["homeTeamName"] = group.resolvedHomeTeamName;
    }
    if (group.resolvedAwayTeamName !== canonicalRow.awayTeamName) {
      canonicalFillData["awayTeamName"] = group.resolvedAwayTeamName;
    }

    const aliasReports: Array<GroupExecutionReport["aliasReports"][number]> = [];

    await db.$transaction(async (tx) => {
      if (Object.keys(canonicalFillData).length > 0) {
        await tx.game.update({ where: { id: canonicalRow.id }, data: canonicalFillData });
      }
      // The canonical the aliases are graded against is the one AFTER the
      // fill: when the score pair came from an alias, later aliases must see
      // it or their pending picks would never be grade-filled.
      const effectiveCanonical = { ...canonicalRow, ...canonicalFillData } as GameRow;
      for (const aliasRow of aliasRows) {
        const childRepoints = await repointChildTables(tx, aliasRow.id, canonicalRow.id, false);
        const gradeFillData = computeAliasGradeFillData(effectiveCanonical, aliasRow);
        await tx.game.update({
          where: { id: aliasRow.id },
          data: { mergedIntoGameId: canonicalRow.id, ...gradeFillData },
        });
        aliasReports.push({
          aliasId: aliasRow.id,
          aliasExternalId: aliasRow.externalId,
          childRepoints,
          gradeFilled: Object.keys(gradeFillData).length > 0,
        });
      }
    });

    executionReports.push({
      canonicalId: canonicalRow.id,
      canonicalExternalId: canonicalRow.externalId,
      aliasReports,
      canonicalFillData,
    });
    console.log(`[merge-duplicate-games] merged ${aliasRows.length} alias row(s) into ${canonicalRow.id}`);
  }

  const outPath = writeReport("merge-duplicate-games", { plan, executionReports });
  console.log(`[merge-duplicate-games] execution report written to ${outPath}`);
}

/** Writes a JSON report under scripts/ops/out/<name>-<timestamp>.json and returns its path. */
function writeReport(name: string, body: unknown): string {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), "out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outPath, JSON.stringify(body, null, 2));
  return outPath;
}

main().catch((err) => {
  console.error("[merge-duplicate-games] FAILED:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});
