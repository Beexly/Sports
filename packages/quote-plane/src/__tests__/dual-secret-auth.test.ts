import { describe, expect, it } from "vitest";
import { authorizeCron } from "../cron/gamma-cron";

describe("gamma authorizeCron dual-secret", () => {
  it("accepts primary", () => {
    const r = authorizeCron({
      providedSecret: "new",
      expectedSecret: "new",
      previousSecret: "old",
    });
    expect(r).toEqual({ ok: true, code: "ok", matched: "primary" });
  });

  it("accepts previous", () => {
    const r = authorizeCron({
      providedSecret: "old",
      expectedSecret: "new",
      previousSecret: "old",
    });
    expect(r).toEqual({ ok: true, code: "ok", matched: "previous" });
  });

  it("refuses when unset", () => {
    const r = authorizeCron({
      providedSecret: "x",
      expectedSecret: null,
      previousSecret: null,
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("cron_secret_unset");
  });
});
