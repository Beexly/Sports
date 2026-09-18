import { describe, expect, it } from "vitest";
import {
  argvLeaksSecret,
  parseReadonlyPostgresDsn,
  readonlyPsqlLaunch,
} from "../psql-readonly.js";

const DSN =
  "postgresql://hermes_ro:REDACTED-PW@ep-cool.neon.tech:5432/neondb?sslmode=require";

describe("parseReadonlyPostgresDsn", () => {
  it("splits the DSN and never puts the password in thrown messages", () => {
    const p = parseReadonlyPostgresDsn(DSN);
    expect(p.host).toBe("ep-cool.neon.tech");
    expect(p.port).toBe("5432");
    expect(p.user).toBe("hermes_ro");
    expect(p.password).toBe("REDACTED-PW");
    expect(p.database).toBe("neondb");
    expect(p.sslMode).toBe("require");
    try {
      parseReadonlyPostgresDsn("not a url");
      throw new Error("expected throw");
    } catch (err) {
      expect((err as Error).message).not.toMatch(/s3cret/);
      expect((err as Error).message).not.toMatch(/postgresql:\/\//);
    }
  });
});

describe("readonlyPsqlLaunch — CWE-214", () => {
  it("keeps the password and the DSN off argv", () => {
    const launch = readonlyPsqlLaunch(DSN, "SELECT 1");
    expect(launch.argv).toEqual(["-v", "ON_ERROR_STOP=1", "-At", "-c", "SELECT 1"]);
    expect(argvLeaksSecret(launch.argv, "REDACTED-PW")).toBe(false);
    expect(argvLeaksSecret(launch.argv, "postgresql://")).toBe(false);
    expect(launch.env.PGPASSWORD).toBe("REDACTED-PW");
    expect(launch.env.PGHOST).toBe("ep-cool.neon.tech");
    expect(launch.env.PGUSER).toBe("hermes_ro");
    expect(launch.env.PGDATABASE).toBe("neondb");
    expect(launch.env.PGSSLMODE).toBe("require");
    expect(launch.env.READONLY_DATABASE_URL).toBeUndefined();
    expect(launch.env.DATABASE_URL).toBeUndefined();
  });
});
