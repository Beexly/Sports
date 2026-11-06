import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Schema and migration must not drift. Both files are read as text on purpose: Prisma's client
 * is generated at install time, so a type-level assertion would only catch drift after a
 * generate, which is exactly the step a rushed change skips.
 */

const ROOT = join(__dirname, "..", "..", "..", "..");
const SCHEMA = readFileSync(join(ROOT, "packages", "db", "prisma", "schema.prisma"), "utf8");
const MIGRATION = readFileSync(
  join(ROOT, "packages", "db", "prisma", "migrations", "20261106120000_competitive_intel", "migration.sql"),
  "utf8",
);

const HARVEST_TABLES = ["rival_assets", "rival_picks", "rival_projections", "rival_promotions", "paywall_recipes"];
const PROVENANCE = ["sourceUrl", "retrievedAt", "harvestTier", "licenseClass", "commercialOk", "contentHash"];

function modelFor(table: string): string {
  const block = SCHEMA.split(/^model /m).find((b) => b.includes(`@@map("${table}")`));
  if (!block) throw new Error(`no model mapped to ${table}`);
  return block;
}

describe("competitive intel schema contract", () => {
  it.each(HARVEST_TABLES)("%s carries all six provenance columns in schema and migration", (table) => {
    const model = modelFor(table);
    for (const column of PROVENANCE) expect(model).toContain(column);
    const create = MIGRATION.split(`CREATE TABLE "${table}"`)[1]?.split(");")[0] ?? "";
    expect(create.length).toBeGreaterThan(0);
    for (const column of PROVENANCE) expect(create).toContain(`"${column}"`);
  });

  it("rival_picks has the normalized market and side pair", () => {
    const model = modelFor("rival_picks");
    expect(model).toMatch(/\bmarket\s+String/);
    expect(model).toMatch(/\bside\s+String\?/);
    expect(MIGRATION).toContain(`"side" TEXT`);
  });

  it("rival_deltas keeps a unique key covering both sides of the pair", () => {
    const model = modelFor("rival_deltas");
    const unique = model.split("\n").find((l) => l.includes("@@unique"));
    expect(unique).toBeDefined();
    for (const column of ["gameKey", "market", "ownPickId", "rivalPickId"]) expect(unique).toContain(column);
  });

  it("every table the schema maps is created by the migration", () => {
    const mapped = [...SCHEMA.matchAll(/@@map\("(rival_[a-z_]+|prospect_contacts|paywall_recipes)"\)/g)].map(
      (m) => m[1],
    );
    expect(mapped.length).toBeGreaterThanOrEqual(8);
    for (const table of mapped) expect(MIGRATION).toContain(`CREATE TABLE "${table}"`);
  });

  it("keeps provenance columns non-nullable on the harvested tables", () => {
    for (const table of HARVEST_TABLES) {
      const create = MIGRATION.split(`CREATE TABLE "${table}"`)[1]?.split(");")[0] ?? "";
      for (const column of ["sourceUrl", "retrievedAt", "harvestTier", "licenseClass", "contentHash"]) {
        expect(create).toMatch(new RegExp(`"${column}" [A-Z0-9() ]+NOT NULL`));
      }
    }
  });
});
