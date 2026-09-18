import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  argvLeaksSecret,
  parseReadonlyPostgresDsn,
  readonlyPsqlLaunch,
} from "../psql-readonly.js";

/**
 * A test for credential HANDLING must never contain a credential SHAPE a
 * scanner can match. Assemble the DSN at runtime from a sentinel. The
 * subject of the CWE-214 test is "the secret is not in argv", which this
 * proves more strongly than a realistic-looking URL: it fails loudly if
 * the helper ever copies the sentinel onto spawn args.
 */
const SENTINEL = "NOT-A-REAL-DSN";
const FIXTURE_USER = "fixture_user";
const FIXTURE_HOST = "not-a-real.invalid";
const FIXTURE_DB = "fixture_db";
const FIXTURE_PORT = "5432";
const FIXTURE_SSL = "require";

function fixtureDsn(): string {
  return [
    "postgresql://",
    FIXTURE_USER,
    ":",
    encodeURIComponent(SENTINEL),
    "@",
    FIXTURE_HOST,
    ":",
    FIXTURE_PORT,
    "/",
    FIXTURE_DB,
    "?sslmode=",
    FIXTURE_SSL,
  ].join("");
}

describe("parseReadonlyPostgresDsn", () => {
  it("splits a runtime-assembled DSN and never puts the sentinel in thrown messages", () => {
    const p = parseReadonlyPostgresDsn(fixtureDsn());
    expect(p.host).toBe(FIXTURE_HOST);
    expect(p.port).toBe(FIXTURE_PORT);
    expect(p.user).toBe(FIXTURE_USER);
    expect(p.password).toBe(SENTINEL);
    expect(p.database).toBe(FIXTURE_DB);
    expect(p.sslMode).toBe(FIXTURE_SSL);
    try {
      parseReadonlyPostgresDsn("not a url");
      throw new Error("expected throw");
    } catch (err) {
      expect((err as Error).message).not.toContain(SENTINEL);
      expect((err as Error).message).not.toMatch(/postgresql:\/\//);
    }
  });
});

describe("readonlyPsqlLaunch — CWE-214", () => {
  it("keeps the sentinel and the DSN off argv", () => {
    const launch = readonlyPsqlLaunch(fixtureDsn(), "SELECT 1");
    expect(launch.argv).toEqual(["-v", "ON_ERROR_STOP=1", "-At", "-c", "SELECT 1"]);
    expect(argvLeaksSecret(launch.argv, SENTINEL)).toBe(false);
    expect(argvLeaksSecret(launch.argv, "postgresql://")).toBe(false);
    expect(launch.env.PGPASSWORD).toBe(SENTINEL);
    expect(launch.env.PGHOST).toBe(FIXTURE_HOST);
    expect(launch.env.PGUSER).toBe(FIXTURE_USER);
    expect(launch.env.PGDATABASE).toBe(FIXTURE_DB);
    expect(launch.env.PGSSLMODE).toBe(FIXTURE_SSL);
    expect(launch.env.READONLY_DATABASE_URL).toBeUndefined();
    expect(launch.env.DATABASE_URL).toBeUndefined();
  });
});

describe("credential-shape trap", () => {
  it("this file contains no postgres URL a scanner can match", () => {
    const src = readFileSync(__filename, "utf8");
    expect(src).not.toMatch(/\bpostgres(?:ql)?:\/\/[^\s:/@]+:[^\s:/@]{6,}@/);
  });
});
