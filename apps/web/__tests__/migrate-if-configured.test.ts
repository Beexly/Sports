import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";

interface MigrateHelpers {
  readonly isTransientDbError: (text: string | undefined) => boolean;
  readonly backoffMs: (attempt: number) => number;
  readonly MAX_MIGRATE_ATTEMPTS: number;
}

const require = createRequire(import.meta.url);
const helpers = require(resolve(__dirname, "../../../scripts/deploy/migrate-if-configured-core.cjs")) as MigrateHelpers;

function isTransientDbError(text: string | undefined): boolean {
  return helpers.isTransientDbError(text);
}

function backoffMs(attempt: number): number {
  return helpers.backoffMs(attempt);
}

function maxMigrateAttempts(): number {
  return helpers.MAX_MIGRATE_ATTEMPTS;
}

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
    expect(isTransientDbError(undefined)).toBe(false);
  });
});

describe("backoffMs", () => {
  it("escalates then clamps so total retry time stays bounded", () => {
    expect(backoffMs(1)).toBe(5000);
    expect(backoffMs(2)).toBe(10000);
    expect(backoffMs(3)).toBe(20000);
    expect(backoffMs(4)).toBe(20000); // clamped to the last step
    expect(maxMigrateAttempts()).toBe(4);
  });
});
