import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Horizon 1 emission lock (2026-10-14): the signal slate and the board-fill
 * pipeline read dfs/walk_forward/walk_forward.json and mint nothing unless it
 * is present, parseable, fresh and passed === true.
 */

const mocks = vi.hoisted(() => ({
  pickCreate: vi.fn(),
  pickUpdateMany: vi.fn(),
  gameCount: vi.fn(),
  gameFindMany: vi.fn(),
  refreshOdds: vi.fn(),
  seedGamesFromEspn: vi.fn(),
  slateAssociationTrace: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { create: mocks.pickCreate, updateMany: mocks.pickUpdateMany },
    game: { count: mocks.gameCount, findMany: mocks.gameFindMany },
  },
}));
vi.mock("../refresh-odds.js", () => ({ refreshOdds: mocks.refreshOdds }));
vi.mock("../seed-games-from-espn.js", () => ({ seedGamesFromEspn: mocks.seedGamesFromEspn }));
vi.mock("../slate-association.js", () => ({ slateAssociationTrace: mocks.slateAssociationTrace }));
vi.mock("@sports/data-ingestion", () => ({
  oddsApiKeyPresence: () => ({ present: false, matchedEnv: null }),
  rundownApiKeyPresence: () => ({ present: false, matchedEnv: null }),
}));

import { readWalkForwardGate } from "../walk-forward-gate.js";
import { generateSignalSlate } from "../generate-signal-slate.js";
import { runBoardFillPipeline } from "../board-fill.js";

const NOW = new Date("2026-10-14T23:00:00Z");
const dir = mkdtempSync(join(tmpdir(), "wf-gate-"));
function gateFile(name: string, body: unknown): string {
  const p = join(dir, name);
  writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body));
  return p;
}
const MISSING = join(dir, "does-not-exist.json");
const STALE = gateFile("stale.json", { passed: true, generated_at: "2026-09-01T00:00:00Z" });
const FALSE = gateFile("false.json", { passed: false, generated_at: "2026-10-14T21:54:09Z" });
const TRUTHY = gateFile("truthy.json", { passed: "true", generated_at: "2026-10-14T21:54:09Z" });
const GARBAGE = gateFile("garbage.json", "{not json");
const TRUE = gateFile("true.json", { passed: true, generated_at: "2026-10-14T21:54:09Z" });
const TRACE = { conclusion: "ASSOCIATION_ONLY" } as never;
const ZERO = {
  ok: false, gamesConsidered: 0, candidatesWithIndependents: 0, picksUpserted: 0, picksSkipped: 0,
  fixtureUnconfirmed: 0, skippedInPlay: 0, seriesRepeatsSkipped: 0, mindWithheld: 0,
};

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.seedGamesFromEspn.mockResolvedValue({ upserted: 0, errors: [] });
  mocks.refreshOdds.mockResolvedValue({ ok: false, okCount: 0, totalCount: 0, elapsedMs: 0, results: [] });
  mocks.slateAssociationTrace.mockResolvedValue(TRACE);
  // Past the gate the slate's first db call is game.count; make it throw a sentinel
  // so a passed=true run proves the gate opened without touching anything else.
  mocks.gameCount.mockRejectedValue(new Error("SENTINEL_PAST_GATE"));
  mocks.gameFindMany.mockRejectedValue(new Error("SENTINEL_PAST_GATE"));
});

describe("readWalkForwardGate", () => {
  it.each([
    ["missing", MISSING, "missing"],
    ["stale", STALE, "stale"],
    ["passed=false", FALSE, "not_passed"],
    ["passed='true' (non-boolean)", TRUTHY, "not_passed"],
    ["unparseable", GARBAGE, "unparseable"],
  ])("%s -> closed", (_l, path, reason) => {
    const g = readWalkForwardGate({ path, now: NOW });
    expect(g.open).toBe(false);
    expect(g.reason).toBe(reason);
  });
  it("passed=true and fresh -> open", () => {
    expect(readWalkForwardGate({ path: TRUE, now: NOW }).open).toBe(true);
  });
  it("the committed repo gate file (passed=false) is closed", () => {
    const repo = join(__dirname, "..", "..", "..", "..", "dfs", "walk_forward", "walk_forward.json");
    expect(readWalkForwardGate({ path: repo, now: NOW }).open).toBe(false);
  });
});

describe("generateSignalSlate emission lock", () => {
  it.each([["missing", MISSING], ["stale", STALE], ["passed=false", FALSE], ["unparseable", GARBAGE]])(
    "%s -> 0-object, no pickCreate / pickUpdateMany, no db access",
    async (_l, path) => {
      const r = await generateSignalSlate({ trace: TRACE, now: NOW, walkForwardGatePath: path, skipSeed: true });
      expect(r).toMatchObject(ZERO);
      expect(mocks.pickCreate).not.toHaveBeenCalled();
      expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
      expect(mocks.gameCount).not.toHaveBeenCalled();
    },
  );
  it("passed=true -> gate opens and the slate proceeds to the db", async () => {
    await expect(
      generateSignalSlate({ trace: TRACE, now: NOW, walkForwardGatePath: TRUE }),
    ).rejects.toThrow("SENTINEL_PAST_GATE");
  });
});

describe("runBoardFillPipeline emission lock", () => {
  it.each([["missing", MISSING], ["stale", STALE], ["passed=false", FALSE]])(
    "%s -> signals is the 0-object; slate never invoked; no picks written",
    async (_l, path) => {
      const r = await runBoardFillPipeline({ walkForwardGatePath: path, now: NOW });
      expect(r.signals).toMatchObject(ZERO);
      expect(mocks.slateAssociationTrace).not.toHaveBeenCalled();
      expect(mocks.gameCount).not.toHaveBeenCalled();
      expect(mocks.gameFindMany).not.toHaveBeenCalled();
      expect(mocks.pickCreate).not.toHaveBeenCalled();
      expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    },
  );
  it("passed=true -> slate invoked", async () => {
    await expect(runBoardFillPipeline({ walkForwardGatePath: TRUE, now: NOW })).rejects.toThrow("SENTINEL_PAST_GATE");
    expect(mocks.slateAssociationTrace).toHaveBeenCalledTimes(1);
  });
});
