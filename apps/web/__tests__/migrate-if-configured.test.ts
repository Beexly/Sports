import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
// Import the pure classification helpers from the deploy script (plain .mjs,
// run directly in the Vercel build). The script guards its main() behind an
// import.meta.url check, so importing here never runs a migration.
import {
  isTransientDbError,
  classifyMigrateStatus,
  classifyAppliedVsRepo,
  backoffMs,
  MAX_MIGRATE_ATTEMPTS,
} from "../../../scripts/deploy/migrate-if-configured.mjs";
import { loadNeonServerless } from "../../../scripts/deploy/neon-http-migration-parity.mjs";

describe("isTransientDbError", () => {
  it("treats Neon cold-start / connectivity failures as transient (retryable)", () => {
    // The exact error that ERRORed the #49 production deploy.
    expect(
      isTransientDbError("Error: P1001: Can't reach database server at `ep-x.neon.tech:5432`")
    ).toBe(true);
    expect(isTransientDbError("Please make sure your database server is running")).toBe(true);
    expect(isTransientDbError("connect ETIMEDOUT 10.0.0.1:5432")).toBe(true);
    expect(isTransientDbError("connect ECONNREFUSED")).toBe(true);
    expect(isTransientDbError("getaddrinfo EAI_AGAIN ep-x.neon.tech")).toBe(true);
    expect(isTransientDbError("Timed out fetching a new connection from the pool")).toBe(true);
  });

  it("does NOT retry real migration errors (fail fast)", () => {
    expect(
      isTransientDbError("P3009 migrate found failed migrations in the target database")
    ).toBe(false);
    expect(isTransientDbError("Drift detected: Your database schema is not in sync")).toBe(false);
    expect(
      isTransientDbError("Error: P3018 A migration failed to apply. syntax error at or near")
    ).toBe(false);
    expect(isTransientDbError("")).toBe(false);
    // @ts-expect-error — guards the null/undefined path
    expect(isTransientDbError(undefined)).toBe(false);
  });
});

describe("classifyMigrateStatus — the fail-closed pooled-endpoint verdict", () => {
  it("recognizes a clean schema (the ONLY verdict that lets a build proceed)", () => {
    expect(
      classifyMigrateStatus("4 migrations found in prisma/migrations\n\nDatabase schema is up to date!")
    ).toBe("up-to-date");
  });

  it("recognizes pending migrations — the exact condition that caused the /api/picks outage", () => {
    expect(
      classifyMigrateStatus(
        "Following migration have not yet been applied:\n20260710210000_add_book_disagreement_at_lock"
      )
    ).toBe("pending");
    expect(
      classifyMigrateStatus("P3009 migrate found failed migration in the target database")
    ).toBe("pending");
    expect(classifyMigrateStatus("Error: P3005 The database schema is not empty")).toBe("pending");
  });

  it("pending signals outrank an up-to-date phrase in the same output (never read mixed output as safe)", () => {
    expect(
      classifyMigrateStatus(
        "Database schema is up to date!\nWARN: Following migration have not yet been applied: 20990101_x"
      )
    ).toBe("pending");
  });

  it("anything unrecognizable is unknown — the caller must fail closed on it", () => {
    expect(
      classifyMigrateStatus("Error: P1001: Can't reach database server at `ep-x.neon.tech:5432`")
    ).toBe("unknown");
    expect(classifyMigrateStatus("")).toBe("unknown");
    // @ts-expect-error — guards the null/undefined path
    expect(classifyMigrateStatus(undefined)).toBe("unknown");
  });
});

describe("classifyAppliedVsRepo", () => {
  it("is up-to-date when every repo folder is in the applied set", () => {
    const r = classifyAppliedVsRepo(
      ["20260716120000_add_odds_line_snapshots", "20260813200000_add_entity_graph"],
      ["20260716120000_add_odds_line_snapshots", "20260813200000_add_entity_graph"],
    );
    expect(r.verdict).toBe("up-to-date");
    expect(r.missing).toEqual([]);
  });

  it("is pending when the repo has a migration the table does not", () => {
    const r = classifyAppliedVsRepo(
      ["20260716120000_add_odds_line_snapshots"],
      ["20260716120000_add_odds_line_snapshots", "20260813200000_add_entity_graph"],
    );
    expect(r.verdict).toBe("pending");
    expect(r.missing).toEqual(["20260813200000_add_entity_graph"]);
  });

  it("ignores extra applied rows and the lockfile", () => {
    const r = classifyAppliedVsRepo(
      ["a", "legacy_row"],
      ["a", "migration_lock.toml"],
    );
    expect(r.verdict).toBe("up-to-date");
  });

  it("is unknown on empty repo list so the caller fail-closes", () => {
    expect(classifyAppliedVsRepo(["a"], []).verdict).toBe("unknown");
  });
});

describe("backoffMs", () => {
  it("escalates then clamps so total retry time stays bounded", () => {
    expect(backoffMs(1)).toBe(5000);
    expect(backoffMs(2)).toBe(10000);
    expect(backoffMs(3)).toBe(20000);
    expect(backoffMs(4)).toBe(20000); // clamped to the last step
    expect(MAX_MIGRATE_ATTEMPTS).toBe(4);
  });
});

describe("Neon HTTP driver resolve (Vercel #526/#527 production miss)", () => {
  const repoRoot = join(__dirname, "..", "..", "..");
  const dbPkg = join(repoRoot, "packages", "db", "package.json");

  it("declares @neondatabase/serverless on @sports/db, not only as a nested import from scripts/deploy", () => {
    const pkg = JSON.parse(readFileSync(dbPkg, "utf8"));
    expect(pkg.dependencies["@neondatabase/serverless"]).toBeTruthy();
  });

  it("resolves the driver from packages/db when that workspace is installed", () => {
    const nested = join(repoRoot, "packages", "db", "node_modules", "@neondatabase", "serverless");
    const hoisted = join(repoRoot, "node_modules", "@neondatabase", "serverless");
    if (!existsSync(nested) && !existsSync(hoisted)) {
      // Worktree without install — the require-from-db-package.json path is still the contract.
      expect(existsSync(dbPkg)).toBe(true);
      return;
    }
    const loaded = loadNeonServerless(repoRoot);
    expect(typeof loaded.neon).toBe("function");
  });
});
