import { describe, it, expect } from "vitest";
// Import the pure classification helpers from the deploy script (plain .mjs,
// run directly in the Vercel build). The script guards its main() behind an
// import.meta.url check, so importing here never runs a migration.
import {
  isTransientDbError,
  classifyMigrateStatus,
  backoffMs,
  MAX_MIGRATE_ATTEMPTS,
} from "../../../scripts/deploy/migrate-if-configured.mjs";

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

describe("backoffMs", () => {
  it("escalates then clamps so total retry time stays bounded", () => {
    expect(backoffMs(1)).toBe(5000);
    expect(backoffMs(2)).toBe(10000);
    expect(backoffMs(3)).toBe(20000);
    expect(backoffMs(4)).toBe(20000); // clamped to the last step
    expect(MAX_MIGRATE_ATTEMPTS).toBe(4);
  });
});
