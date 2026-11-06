import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AdapterError, runAdapter } from "../adapter.js";
import { stableHash } from "../types.js";
import { chalkBoard, ownershipAdapter, parseOwnership } from "../adapters/fantasylabs-ownership.js";

const CONTEST = 42928458;
const OWNER = 4;
const FIXTURE = readFileSync(
  join(__dirname, "..", "adapters", "__fixtures__", "fantasylabs-ownership.sample.json"),
  "utf8",
);

function artifact(body = FIXTURE) {
  return {
    url: `https://www.fantasylabs.com/api/contests/usersummary/5/${CONTEST}/${OWNER}`,
    retrievedAt: "2026-11-06T17:11:00.000Z",
    tier: 3 as const,
    body,
    httpStatus: 200,
    contentHash: stableHash(body),
  };
}

describe("fantasylabs ownership adapter", () => {
  it("normalizes the entrant's lineup into one row per player", async () => {
    const run = await runAdapter(ownershipAdapter(5, CONTEST, OWNER), artifact());
    expect(run.rows.length).toBe(20);
    for (const row of run.rows) {
      expect(row.contestId).toBe(CONTEST);
      expect(row.ownerId).toBe(OWNER);
      expect(row.playerName.length).toBeGreaterThan(0);
    }
  });

  it("carries the leverage gap the source computes", async () => {
    const run = await runAdapter(ownershipAdapter(5, CONTEST, OWNER), artifact());
    const contrarian = run.rows.filter((r) => r.variance > 0);
    const chalk = run.rows.filter((r) => r.variance < 0);
    expect(contrarian.length + chalk.length).toBeGreaterThan(0);
    for (const row of run.rows) expect(row.variance).toBeCloseTo(row.ownPercent - row.fieldPercent, 5);
  });

  it("builds a chalk board ranked by field exposure with a distinct entrant count", async () => {
    const rows = JSON.parse(FIXTURE) as Record<string, unknown>[];
    const run = await runAdapter(ownershipAdapter(5, CONTEST, OWNER), artifact());
    const board = chalkBoard(run.rows);
    expect(board.length).toBeGreaterThan(0);
    for (let i = 1; i < board.length; i += 1) {
      expect(board[i - 1]!.fieldPercent).toBeGreaterThanOrEqual(board[i]!.fieldPercent);
    }
    for (const row of board) expect(row.entrantCount).toBe(1);
    expect(rows.length).toBe(20);
  });

  it("merges exposure across two entrants of the same contest", async () => {
    const rows = JSON.parse(FIXTURE) as Record<string, unknown>[];
    const second = rows.map((r) => ({ ...r, OwnerId: 99, OwnPerc: 10, UserVariance: 3.45 }));
    const run = await runAdapter(ownershipAdapter(5, CONTEST, OWNER), artifact(JSON.stringify([...rows, ...second])));
    for (const row of chalkBoard(run.rows)) expect(row.entrantCount).toBe(2);
  });

  it("rejects a non-array payload", () => {
    expect(() => parseOwnership('{"Message":"invalid"}')).toThrow(/not a JSON array/);
  });

  it("fails the batch when a row loses its player id", async () => {
    const rows = JSON.parse(FIXTURE) as Record<string, unknown>[];
    delete rows[2]!.PlayerId;
    await expect(runAdapter(ownershipAdapter(5, CONTEST, OWNER), artifact(JSON.stringify(rows)))).rejects.toBeInstanceOf(
      AdapterError,
    );
  });

  it("puts the owner in the URL so two entrants are two adapters", () => {
    expect(ownershipAdapter(5, CONTEST, OWNER).url).toContain(`/${CONTEST}/${OWNER}`);
    expect(ownershipAdapter(5, CONTEST, 77).url).toContain(`/${CONTEST}/77`);
  });
});
