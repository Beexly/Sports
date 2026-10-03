import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pin: packages/db/prisma/seed.ts ships seedPicks() and main() calls it
 * with the right guards.
 *
 * Guards we require:
 *   - NODE_ENV !== "production" (no synthetic picks on a real deploy)
 *   - db.pick.count() === 0 (idempotent — re-runs do not pile up)
 *
 * Source-level test only — we don't execute the seed.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(resolve(repoRoot, "packages/db/prisma/seed.ts"), "utf8");

describe("seedPicks wiring", () => {
  it("declares an async seedPicks function with a typed return", () => {
    expect(src).toMatch(/async\s+function\s+seedPicks\s*\(/);
    expect(src).toMatch(/Promise<SeedPickResult>/);
  });

  it("main() calls seedPicks under the NODE_ENV !== production guard", () => {
    expect(src).toMatch(
      /process\.env\["NODE_ENV"\]\s*!==\s*"production"[\s\S]{0,200}seedPicks\(/
    );
  });

  it("main() only seeds when db.pick.count() === 0 (idempotent)", () => {
    expect(src).toMatch(
      /db\.pick\.count\(\)[\s\S]{0,200}===\s*0[\s\S]{0,400}seedPicks\(/
    );
  });

  it("the seedPicks fixture sets model_version to v5.0.0-seed so the operator can purge later", () => {
    expect(src).toMatch(/modelVersion:\s*"v5\.0\.0-seed"/);
  });

  it("seedPicks creates a mix of bootstrap and canonical picks", () => {
    // The seed planner passes literal `true` and `false` as the 4th
    // positional arg to pickFor(sport, matchupIdx, daysAgo, isBootstrap, ...).
    // Canonical plans pass `false`, bootstrap plans pass `true`. The
    // pick.create call then stamps `isBootstrap: p.isBootstrap`.
    expect(src).toMatch(/isBootstrap:\s*p\.isBootstrap/);
    // At least one pickFor call with `false` (canonical) — the 4th arg slot.
    expect(src).toMatch(/pickFor\s*\([^)]*?,\s*false,/);
    // At least one pickFor call with `true` (bootstrap) — the 4th arg slot.
    expect(src).toMatch(/pickFor\s*\([^)]*?,\s*true,/);
  });

  it("settled canonical picks also seed a PickSignalSnapshot row with eligibleForLearning derived from bootstrap", () => {
    expect(src).toMatch(/db\.pickSignalSnapshot\.create/);
    expect(src).toMatch(/eligibleForLearning:\s*!p\.isBootstrap/);
  });

  it("the reasoning field carries the synthetic disclaimer", () => {
    expect(src).toMatch(/Synthetic seed pick/);
    expect(src).toMatch(/not from a live model/);
  });

  it("the seed plan totals match the documented counts (8 pending + 18 canonical-settled + 12 bootstrap)", () => {
    expect(src).toMatch(/for \(let i = 0; i < 8; i\+\+\)[\s\S]{0,500}"PENDING"/);
    expect(src).toMatch(/for \(let i = 0; i < 18; i\+\+\)[\s\S]{0,500}settledOutcomes\[i\]!/);
    expect(src).toMatch(/for \(let i = 0; i < 12; i\+\+\)[\s\S]{0,500}bootstrapOutcomes\[i\]!/);
  });

  it("the seed creates Games 1:1 with picks (avoids the unique [gameId, pickType] collision)", () => {
    expect(src).toMatch(/db\.game\.create/);
    expect(src).toMatch(/externalId:\s*`seed-pick-\$\{i\}/);
  });

  it("no synthetic pick is marked isFeatured for a bootstrap row (gate honoured)", () => {
    // The seed sets `isFeatured: !p.isBootstrap && p.grade === "ELITE_PLAY"`.
    expect(src).toMatch(/isFeatured:\s*!p\.isBootstrap\s*&&\s*p\.grade\s*===\s*"ELITE_PLAY"/);
  });

  it("reasoning + reasoningShort have no banned phrases", () => {
    const start = src.indexOf("async function seedPicks");
    const end = src.lastIndexOf("\nmain()");
    const block = end > start ? src.slice(start, end) : src.slice(start);
    expect(block).not.toMatch(/guaranteed|risk-free|sure thing|easy money|verified track record/i);
  });

  it("the seed covers at least five sports (NFL, NBA, MLB, NHL, NCAAF)", () => {
    for (const sport of ["NFL", "NBA", "MLB", "NHL", "NCAAF"]) {
      expect(src, `seed should reference sport: ${sport}`).toContain(sport);
    }
  });

  it("the seed creates a PickSignalSnapshot for every settled pick (so the ledger's snapshot column reads correctly)", () => {
    expect(src).toMatch(/if \(p\.result !== "PENDING"\)[\s\S]{0,400}db\.pickSignalSnapshot\.create/);
  });
});
