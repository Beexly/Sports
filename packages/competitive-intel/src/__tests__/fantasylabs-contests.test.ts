import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AdapterError, runAdapter } from "../adapter.js";
import { stableHash } from "../types.js";
import {
  engagementBand,
  entrantsAdapter,
  parseEntrants,
  rollUpEntrants,
} from "../adapters/fantasylabs-contests.js";

const CONTEST = 42264108;
const FIXTURE = readFileSync(join(__dirname, "..", "adapters", "__fixtures__", "fantasylabs-entrants.sample.json"), "utf8");

function artifact(body = FIXTURE) {
  return {
    url: `https://www.fantasylabs.com/api/contests/usernames/5/${CONTEST}`,
    retrievedAt: "2026-11-06T17:10:00.000Z",
    tier: 3 as const,
    body,
    httpStatus: 200,
    contentHash: stableHash(body),
  };
}

describe("fantasylabs entrants adapter", () => {
  it("stamps the contest id on every row, since the payload does not carry it", async () => {
    const run = await runAdapter(entrantsAdapter(CONTEST), artifact());
    expect(run.rows.length).toBeGreaterThan(0);
    for (const row of run.rows) expect(row.contestId).toBe(CONTEST);
  });

  it("reads the flag as a boolean whether the source sends 0/1 or true/false", async () => {
    const rows = JSON.parse(FIXTURE) as Record<string, unknown>[];
    rows[0]!.isFavorite = 1;
    rows[1]!.isFavorite = true;
    rows[2]!.isFavorite = 0;
    const run = await runAdapter(entrantsAdapter(CONTEST), artifact(JSON.stringify(rows)));
    expect(run.rows[0]!.favorite).toBe(true);
    expect(run.rows[1]!.favorite).toBe(true);
    expect(run.rows[2]!.favorite).toBe(false);
  });

  it("rolls the same owner across contests into one profile with summed lineups", async () => {
    const rows = JSON.parse(FIXTURE) as Record<string, unknown>[];
    const doubled = [...rows, ...rows.map((r) => ({ ...r, LineupCt: 5 }))];
    const run = await runAdapter(entrantsAdapter(CONTEST), artifact(JSON.stringify(doubled)));
    const profiles = rollUpEntrants(run.rows);
    expect(profiles.length).toBeLessThan(run.rows.length);
    for (const profile of profiles) expect(profile.contests).toBeGreaterThanOrEqual(1);
    const sorted = profiles.every((p, i) => i === 0 || profiles[i - 1]!.lineups >= p.lineups);
    expect(sorted).toBe(true);
  });

  it("keeps a single contest from inflating the contest count", async () => {
    const run = await runAdapter(entrantsAdapter(CONTEST), artifact());
    for (const profile of rollUpEntrants(run.rows)) expect(profile.contests).toBe(1);
  });

  it("bands engagement ordinally and never widens whale to a big single-contest entry", () => {
    const base = { ownerId: 1, username: "x", bestMaxPercent: 1, favorite: false };
    expect(engagementBand({ ...base, contests: 3, lineups: 150 })).toBe("whale");
    expect(engagementBand({ ...base, contests: 2, lineups: 40 })).toBe("whale");
    expect(engagementBand({ ...base, contests: 1, lineups: 20 })).toBe("grinder");
    expect(engagementBand({ ...base, contests: 1, lineups: 150 })).toBe("grinder");
    expect(engagementBand({ ...base, contests: 1, lineups: 20 })).toBe("grinder");
    expect(engagementBand({ ...base, contests: 1, lineups: 2 })).toBe("regular");
    expect(engagementBand({ ...base, contests: 1, lineups: 1 })).toBe("casual");
  });

  it("rejects an object payload so an error envelope cannot read as an empty field", () => {
    expect(() => parseEntrants('{"Message":"nope"}')).toThrow(/not a JSON array/);
    expect(() => parseEntrants("[]")).not.toThrow();
  });

  it("fails the batch when a row loses its username", async () => {
    const rows = JSON.parse(FIXTURE) as Record<string, unknown>[];
    delete rows[0]!.Username;
    await expect(runAdapter(entrantsAdapter(CONTEST), artifact(JSON.stringify(rows)))).rejects.toBeInstanceOf(
      AdapterError,
    );
  });

  it("builds the URL from sport and contest, not a constant", () => {
    expect(entrantsAdapter(CONTEST, 5).url).toBe(
      `https://www.fantasylabs.com/api/contests/usernames/5/${CONTEST}`,
    );
    expect(entrantsAdapter(CONTEST, 2).url).toContain("/contests/usernames/2/");
  });
});
