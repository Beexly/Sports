import { describe, it, expect } from "vitest";
import {
  safeEqualSecret,
  safeEqualBearer,
  authorizeCronSecret,
} from "../safe-equal";

describe("safeEqualSecret", () => {
  it("accepts exact match", () => {
    expect(safeEqualSecret("alpha", "alpha")).toBe(true);
  });

  it("rejects wrong / short / null / empty expected", () => {
    expect(safeEqualSecret("alpha", "beta")).toBe(false);
    expect(safeEqualSecret("alp", "alpha")).toBe(false);
    expect(safeEqualSecret("alpha", null)).toBe(false);
    expect(safeEqualSecret(null, "alpha")).toBe(false);
    expect(safeEqualSecret("alpha", "")).toBe(false);
  });
});

describe("safeEqualBearer", () => {
  it("matches monorepo Bearer layout", () => {
    expect(safeEqualBearer("Bearer secret", "secret")).toBe(true);
    expect(safeEqualBearer("Bearer wrong", "secret")).toBe(false);
    expect(safeEqualBearer("secret", "secret")).toBe(false);
  });
});

describe("authorizeCronSecret", () => {
  it("refuse-default when unset", () => {
    expect(
      authorizeCronSecret({ providedSecret: "x", expectedSecret: null }),
    ).toEqual({ ok: false, code: "cron_secret_unset" });
  });

  it("unauthorized on mismatch", () => {
    expect(
      authorizeCronSecret({ providedSecret: "bad", expectedSecret: "good" }),
    ).toEqual({ ok: false, code: "cron_unauthorized" });
  });

  it("ok on match", () => {
    expect(
      authorizeCronSecret({ providedSecret: "good", expectedSecret: "good" }),
    ).toEqual({ ok: true, code: "ok" });
  });
});
