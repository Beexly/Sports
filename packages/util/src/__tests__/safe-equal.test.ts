import { describe, it, expect } from "vitest";
import {
  safeEqualSecret,
  safeEqualBearer,
  safeEqualBearerDual,
  authorizeCronSecret,
  extractBearerSecret,
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

describe("safeEqualBearerDual", () => {
  it("accepts primary", () => {
    expect(safeEqualBearerDual("Bearer primary", "primary", "old")).toBe(true);
  });
  it("accepts previous during rotation", () => {
    expect(safeEqualBearerDual("Bearer old", "primary", "old")).toBe(true);
  });
  it("rejects neither", () => {
    expect(safeEqualBearerDual("Bearer other", "primary", "old")).toBe(false);
  });
  it("ignores empty previous", () => {
    expect(safeEqualBearerDual("Bearer old", "primary", "")).toBe(false);
  });
});

describe("authorizeCronSecret", () => {
  it("refuse-default when unset", () => {
    expect(
      authorizeCronSecret({ providedSecret: "x", expectedSecret: null }),
    ).toEqual({ ok: false, code: "cron_secret_unset", matched: null });
  });

  it("unauthorized on mismatch", () => {
    expect(
      authorizeCronSecret({ providedSecret: "bad", expectedSecret: "good" }),
    ).toEqual({ ok: false, code: "cron_unauthorized", matched: null });
  });

  it("ok on match primary", () => {
    expect(
      authorizeCronSecret({ providedSecret: "good", expectedSecret: "good" }),
    ).toEqual({ ok: true, code: "ok", matched: "primary" });
  });

  it("ok on previous secret during rotation", () => {
    expect(
      authorizeCronSecret({
        providedSecret: "prev",
        expectedSecret: "new",
        previousSecret: "prev",
      }),
    ).toEqual({ ok: true, code: "ok", matched: "previous" });
  });

  it("previous alone is enough when primary empty", () => {
    expect(
      authorizeCronSecret({
        providedSecret: "prev",
        expectedSecret: "",
        previousSecret: "prev",
      }),
    ).toEqual({ ok: true, code: "ok", matched: "previous" });
  });

  it("prefers primary when both would match (identical secrets)", () => {
    expect(
      authorizeCronSecret({
        providedSecret: "same",
        expectedSecret: "same",
        previousSecret: "same",
      }),
    ).toEqual({ ok: true, code: "ok", matched: "primary" });
  });
});

describe("extractBearerSecret", () => {
  it("parses Bearer token", () => {
    expect(extractBearerSecret("Bearer abc123")).toBe("abc123");
  });
  it("null on missing/malformed", () => {
    expect(extractBearerSecret(null)).toBeNull();
    expect(extractBearerSecret("Basic x")).toBeNull();
    expect(extractBearerSecret("Bearer")).toBeNull();
  });
});
