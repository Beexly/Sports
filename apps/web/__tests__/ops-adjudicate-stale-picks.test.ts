import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  actionRejection,
  dryRunHeadline,
  parseAdjudicateArgs,
  planAdjudication,
  SUPPORTED_ACTION,
} from "../../../scripts/ops/lib/adjudicate-stale-picks-args";
import {
  mapStalePendingPickRow,
  STALE_PENDING_PICK_SELECT,
  stalePendingPicksJson,
  stalePendingPickWhere,
} from "../../../scripts/ops/lib/stale-pending-picks-selection";
import { STALE_PENDING_PICK_MAX_AGE_DAYS } from "../lib/board/stale-pick-policy";

const ADJUDICATE_SRC = readFileSync(resolve(__dirname, "../../../scripts/ops/adjudicate-stale-picks.ts"), "utf8");
const LIST_SRC = readFileSync(resolve(__dirname, "../../../scripts/ops/list-stale-pending-picks.ts"), "utf8");
const SELECTION_SRC = readFileSync(
  resolve(__dirname, "../../../scripts/ops/lib/stale-pending-picks-selection.ts"),
  "utf8",
);
const ROOT_PKG = JSON.parse(readFileSync(resolve(__dirname, "../../../package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

const NOW = new Date("2026-09-05T12:00:00.000Z");
const DAY_MS = 86_400_000;

/** Drops block and line comments so a prose mention of an operation is not mistaken for a call. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("parseAdjudicateArgs", () => {
  it("defaults to a dry run of the unpublish action over every selected row", () => {
    const parsed = parseAdjudicateArgs([]);
    expect(parsed).toEqual({ ok: true, args: { execute: false, json: false, action: "unpublish", pickIds: [] } });
  });

  it("only --execute turns the dry run off", () => {
    expect(parseAdjudicateArgs(["--json"])).toMatchObject({ ok: true, args: { execute: false, json: true } });
    expect(parseAdjudicateArgs(["--dry-run"])).toMatchObject({ ok: true, args: { execute: false } });
    expect(parseAdjudicateArgs(["--execute"])).toMatchObject({ ok: true, args: { execute: true } });
    expect(parseAdjudicateArgs(["--execute", "--dry-run"])).toMatchObject({ ok: true, args: { execute: false } });
  });

  it("collects repeatable --pick ids in both spellings and dedupes them", () => {
    const parsed = parseAdjudicateArgs(["--pick", "ck_a", "--pick=ck_b", "--pick", "ck_a", "--execute"]);
    expect(parsed).toEqual({
      ok: true,
      args: { execute: true, json: false, action: "unpublish", pickIds: ["ck_a", "ck_b"] },
    });
  });

  it("reads --action in both spellings", () => {
    expect(parseAdjudicateArgs(["--action", "void"])).toMatchObject({ ok: true, args: { action: "void" } });
    expect(parseAdjudicateArgs(["--action=unpublish"])).toMatchObject({ ok: true, args: { action: "unpublish" } });
  });

  it("rejects a missing value, a value on a boolean flag, and any unknown token", () => {
    expect(parseAdjudicateArgs(["--pick"])).toEqual({ ok: false, error: "--pick requires a pick id" });
    expect(parseAdjudicateArgs(["--pick", "--execute"])).toEqual({ ok: false, error: "--pick requires a pick id" });
    expect(parseAdjudicateArgs(["--action"])).toEqual({ ok: false, error: "--action requires a value" });
    expect(parseAdjudicateArgs(["--execute=yes"])).toEqual({ ok: false, error: "--execute takes no value" });
    expect(parseAdjudicateArgs(["--exec"])).toEqual({ ok: false, error: 'unknown argument "--exec"' });
    expect(parseAdjudicateArgs(["ck_a"])).toEqual({ ok: false, error: 'unknown argument "ck_a"' });
  });
});

describe("actionRejection", () => {
  it("accepts only unpublish", () => {
    expect(SUPPORTED_ACTION).toBe("unpublish");
    expect(actionRejection("unpublish")).toBeNull();
  });

  it("refuses void (and anything else) with one sentence naming the settlement outbox contract", () => {
    for (const action of ["void", "VOID", "delete", "leave"]) {
      const msg = actionRejection(action);
      expect(msg).not.toBeNull();
      expect(msg).toContain(`--action ${action} is not implemented here`);
      expect(msg).toContain("settlement outbox");
      expect(msg).toContain("PickSettlementEvent");
      // One sentence: exactly one terminal period, at the end.
      expect((msg ?? "").match(/\.\s/g)).toBeNull();
      expect((msg ?? "").endsWith(".")).toBe(true);
    }
  });
});

describe("planAdjudication (dry run vs execute)", () => {
  it("is a dry run unless execute is true, and never changes the id set", () => {
    const ids = ["ck_a", "ck_b", "ck_c"];
    const dry = planAdjudication({ execute: false }, ids);
    expect(dry.mode).toBe("dry-run");
    expect(dry.ids).toEqual(ids);
    expect(dry.headline).toBe("DRY RUN: nothing written; pass --execute to unpublish these 3 picks");
    expect(dry.headline).toBe(dryRunHeadline(3));

    const run = planAdjudication({ execute: true }, ids);
    expect(run.mode).toBe("execute");
    expect(run.ids).toEqual(ids);
    expect(run.headline).toContain("isPublished=false");
    expect(run.headline).toContain("no row removed");
  });

  it("copies the ids so a later mutation of the input cannot leak into the plan", () => {
    const ids = ["ck_a"];
    const plan = planAdjudication({ execute: true }, ids);
    ids.push("ck_zzz");
    expect(plan.ids).toEqual(["ck_a"]);
  });
});

describe("stalePendingPickWhere (shared selection)", () => {
  it("selects only published, non-bootstrap, PENDING picks on unstarted games past the freshness window", () => {
    const where = stalePendingPickWhere(NOW);
    const cutoff = new Date(NOW.getTime() - STALE_PENDING_PICK_MAX_AGE_DAYS * DAY_MS);
    expect(where).toEqual({
      isPublished: true,
      isBootstrap: false,
      result: "PENDING",
      game: { commenceTime: { gt: NOW } },
      OR: [{ dataFreshnessAt: { lt: cutoff } }, { dataFreshnessAt: null, generatedAt: { lt: cutoff } }],
    });
    expect("id" in where).toBe(false);
  });

  it("--pick ids only narrow the same where; the other criteria stay in place", () => {
    const where = stalePendingPickWhere(NOW, ["ck_a", "ck_b"]);
    expect(where.id).toEqual({ in: ["ck_a", "ck_b"] });
    expect(where.isPublished).toBe(true);
    expect(where.result).toBe("PENDING");
    expect(where.isBootstrap).toBe(false);
    expect(where.game).toEqual({ commenceTime: { gt: NOW } });
    expect(where.OR).toHaveLength(2);
  });

  it("the select shape carries every column the report reads", () => {
    expect(STALE_PENDING_PICK_SELECT).toMatchObject({
      id: true,
      pickType: true,
      selection: true,
      line: true,
      clvLockLine: true,
      clvLockPrice: true,
      modelVersion: true,
      confidence: true,
      tier: true,
      generatedAt: true,
      dataFreshnessAt: true,
      game: { select: { homeTeamName: true, awayTeamName: true, commenceTime: true, sport: { select: { key: true } } } },
    });
  });
});

describe("mapStalePendingPickRow + stalePendingPicksJson", () => {
  const row = {
    id: "ck_row",
    pickType: "SPREAD",
    selection: "Away -3.5",
    line: -3.5,
    clvLockLine: -3,
    clvLockPrice: null,
    modelVersion: "v5.0.0",
    confidence: 61,
    tier: "PREMIUM",
    generatedAt: new Date("2026-05-22T00:00:00.000Z"),
    dataFreshnessAt: new Date("2026-06-16T00:00:00.000Z"),
    game: {
      homeTeamName: "Home",
      awayTeamName: "Away",
      commenceTime: new Date("2026-09-10T00:20:00.000Z"),
      sport: { key: "americanfootball_nfl" },
    },
  };

  it("reads freshness from dataFreshnessAt and grades at the pinned line when present", () => {
    const out = mapStalePendingPickRow(row, NOW);
    expect(out).toEqual({
      pickId: "ck_row",
      sport: "americanfootball_nfl",
      matchup: "Away @ Home",
      kickoff: "2026-09-10T00:20:00.000Z",
      pickType: "SPREAD",
      selection: "Away -3.5",
      line: -3.5,
      gradingLine: -3,
      clvLockPrice: null,
      modelVersion: "v5.0.0",
      confidence: 61,
      tier: "PREMIUM",
      generatedAt: "2026-05-22T00:00:00.000Z",
      lastRefreshedAt: "2026-06-16T00:00:00.000Z",
      staleDays: 81,
    });
  });

  it("falls back to generatedAt and to line when the freshness stamp and the pinned line are null", () => {
    const out = mapStalePendingPickRow({ ...row, dataFreshnessAt: null, clvLockLine: null }, NOW);
    expect(out.lastRefreshedAt).toBe("2026-05-22T00:00:00.000Z");
    expect(out.gradingLine).toBe(-3.5);
    expect(out.staleDays).toBe(106);
  });

  it("builds the list script's JSON shape", () => {
    const picks = [mapStalePendingPickRow(row, NOW)];
    expect(stalePendingPicksJson(picks, NOW)).toEqual({
      generatedAt: NOW.toISOString(),
      maxAgeDays: STALE_PENDING_PICK_MAX_AGE_DAYS,
      count: 1,
      picks,
    });
  });
});

describe("adjudicate-stale-picks.ts source contract", () => {
  it("never removes a row and never runs raw SQL", () => {
    expect(ADJUDICATE_SRC).not.toContain("deleteMany");
    expect(ADJUDICATE_SRC).not.toContain(".delete(");
    expect(ADJUDICATE_SRC).not.toMatch(/delete/i);
    expect(ADJUDICATE_SRC).not.toMatch(/\$executeRaw|\$queryRaw|upsert|\.create\(|createMany/);
    expect(stripComments(SELECTION_SRC)).not.toMatch(/deleteMany|\.delete\(|updateMany|\.update\(|\$executeRaw|upsert/);
  });

  it("runs exactly one updateMany whose data sets only isPublished: false", () => {
    expect(ADJUDICATE_SRC.match(/updateMany\(/g)).toHaveLength(1);
    const dataMatch = ADJUDICATE_SRC.match(/data:\s*\{([^}]*)\}/);
    expect(dataMatch).not.toBeNull();
    expect((dataMatch?.[1] ?? "").replace(/\s+/g, "")).toBe("isPublished:false");
  });

  it("the updateMany where is pinned to the selected ids and still-published PENDING rows", () => {
    const whereMatch = ADJUDICATE_SRC.match(/updateMany\(\{\s*where:\s*\{([\s\S]*?)\},\s*data:/);
    expect(whereMatch).not.toBeNull();
    const where = whereMatch?.[1] ?? "";
    expect(where).toMatch(/id:\s*\{\s*in:\s*plan\.ids\s*\}/);
    expect(where).toMatch(/isPublished:\s*true/);
    expect(where).toMatch(/result:\s*"PENDING"/);
  });

  it("requires --execute for any write: the dry-run branch is taken first and writes nothing", () => {
    const dryBranch = ADJUDICATE_SRC.indexOf("if (!args.execute)");
    const write = ADJUDICATE_SRC.indexOf("updateMany(");
    expect(dryBranch).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(dryBranch);
    // The single write sits in the else-chain of the dry-run guard, never before it.
    expect(ADJUDICATE_SRC.slice(dryBranch, write)).toContain("} else");
    // The only way execute becomes true is the --execute flag reaching the parser.
    expect(ADJUDICATE_SRC).toContain("parseAdjudicateArgs(process.argv.slice(2))");
    expect(parseAdjudicateArgs([]).ok && !parseAdjudicateArgs([]).args.execute).toBe(true);
    expect(ADJUDICATE_SRC).toContain("DRY RUN: no write of any kind reaches the database on this path.");
  });

  it("keeps the DATABASE_URL guard (exit 2, same message style as the list script) and refuses other actions", () => {
    expect(ADJUDICATE_SRC).toContain('process.env["DATABASE_URL"]?.trim()');
    expect(ADJUDICATE_SRC).toContain(
      'console.error("adjudicate-stale-picks: DATABASE_URL missing or stub - abort (no secrets invented)");',
    );
    expect(LIST_SRC).toContain(
      'console.error("list-stale-pending-picks: DATABASE_URL missing or stub - abort (no secrets invented)");',
    );
    expect(ADJUDICATE_SRC.match(/process\.exit\(2\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(ADJUDICATE_SRC).toContain("actionRejection(args.action)");
  });

  it("both scripts import the shared selection instead of carrying their own where", () => {
    for (const src of [ADJUDICATE_SRC, LIST_SRC]) {
      expect(src).toContain('from "./lib/stale-pending-picks-selection"');
      expect(src).toContain("findStalePendingPicks(prisma, now");
      expect(src).not.toMatch(/result:\s*"PENDING",\s*game:/);
      expect(src).not.toContain("stalePickWhere(");
    }
  });

  it("the list script stays SELECT-only", () => {
    expect(stripComments(LIST_SRC)).not.toMatch(/updateMany|\.update\(|deleteMany|\.delete\(|upsert|\$executeRaw|\.create\(/);
  });

  it("is wired as npm run ops:stale-picks:unpublish next to ops:stale-picks", () => {
    expect(ROOT_PKG.scripts["ops:stale-picks"]).toBe(
      "TSX_TSCONFIG_PATH=apps/web/tsconfig.json tsx scripts/ops/list-stale-pending-picks.ts",
    );
    expect(ROOT_PKG.scripts["ops:stale-picks:unpublish"]).toBe(
      "TSX_TSCONFIG_PATH=apps/web/tsconfig.json tsx scripts/ops/adjudicate-stale-picks.ts",
    );
  });
});
