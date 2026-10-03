import { describe, expect, it } from "vitest";
import { resolveOddsApiKey, oddsApiKeyPresence } from "../odds-api-key.js";

describe("resolveOddsApiKey", () => {
  it("prefers canonical THE_ODDS_API_KEY", () => {
    expect(
      resolveOddsApiKey({ THE_ODDS_API_KEY: " canonical ", ODDS_API_KEY: "other" }),
    ).toBe("canonical");
  });
  it("falls back to free-tier aliases", () => {
    expect(resolveOddsApiKey({ FREE_ODDS_API_KEY: "free" })).toBe("free");
    expect(resolveOddsApiKey({ ODDS_API_KEY: "x" })).toBe("x");
    expect(resolveOddsApiKey({})).toBe("");
  });
  it("reports presence without leaking values", () => {
    expect(oddsApiKeyPresence({ ODDS_API_KEY: "secret" })).toEqual({
      present: true,
      matchedEnv: "ODDS_API_KEY",
    });
    expect(oddsApiKeyPresence({})).toEqual({ present: false, matchedEnv: null });
  });
});
