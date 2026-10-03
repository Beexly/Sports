import { afterEach, describe, expect, it } from "vitest";
import {
  ESPN_POWERINDEX_LICENSE_ENV,
  isEspnPowerIndexCleared,
} from "../independent-source-rights.js";

/**
 * Pure predicate for the FPI rights gate. The registry clears ESPN facts only;
 * FPI is a proprietary prediction, so the source is CLOSED unless the founder
 * sets ESPN_POWERINDEX_LICENSED to the exact string "true".
 */
describe("isEspnPowerIndexCleared", () => {
  const original = process.env[ESPN_POWERINDEX_LICENSE_ENV];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ESPN_POWERINDEX_LICENSE_ENV];
    } else {
      process.env[ESPN_POWERINDEX_LICENSE_ENV] = original;
    }
  });

  it("names the founder-set env var", () => {
    expect(ESPN_POWERINDEX_LICENSE_ENV).toBe("ESPN_POWERINDEX_LICENSED");
  });

  it("is closed when the variable is absent", () => {
    expect(isEspnPowerIndexCleared({})).toBe(false);
  });

  it("is closed for an empty string", () => {
    expect(isEspnPowerIndexCleared({ ESPN_POWERINDEX_LICENSED: "" })).toBe(false);
  });

  it("is open only for the exact string \"true\"", () => {
    expect(isEspnPowerIndexCleared({ ESPN_POWERINDEX_LICENSED: "true" })).toBe(true);
  });

  it.each(["1", "TRUE", "True", "yes", "on", " true", "true ", "false", "0"])(
    "is closed for %j (exact match only)",
    (value) => {
      expect(isEspnPowerIndexCleared({ ESPN_POWERINDEX_LICENSED: value })).toBe(false);
    },
  );

  it("ignores unrelated variables", () => {
    expect(
      isEspnPowerIndexCleared({
        INDEPENDENT_POLYMARKET: "true",
        THE_ODDS_API_KEY: "true",
      }),
    ).toBe(false);
  });

  it("defaults to process.env and stays closed when unset there", () => {
    delete process.env[ESPN_POWERINDEX_LICENSE_ENV];
    expect(isEspnPowerIndexCleared()).toBe(false);
  });

  it("defaults to process.env and opens when set to \"true\" there", () => {
    process.env[ESPN_POWERINDEX_LICENSE_ENV] = "true";
    expect(isEspnPowerIndexCleared()).toBe(true);
  });
});
