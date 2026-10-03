import { describe, expect, it } from "vitest";
import { resolveOddsPapiKey, oddsPapiKeyPresence } from "../oddspapi-key.js";

describe("resolveOddsPapiKey", () => {
  it("prefers canonical ODDSPAPI_KEY", () => {
    expect(
      resolveOddsPapiKey({ ODDSPAPI_KEY: " canonical ", ODDS_PAPI_KEY: "other" }),
    ).toBe("canonical");
  });
  it("falls back to aliases", () => {
    expect(resolveOddsPapiKey({ ODDS_PAPI_KEY: "alias" })).toBe("alias");
    expect(resolveOddsPapiKey({ ODDSPAPI_API_KEY: "alias2" })).toBe("alias2");
    expect(resolveOddsPapiKey({})).toBe("");
  });
  it("reports presence without leaking values", () => {
    expect(oddsPapiKeyPresence({ ODDSPAPI_KEY: "secret" })).toEqual({
      present: true,
      matchedEnv: "ODDSPAPI_KEY",
    });
    expect(oddsPapiKeyPresence({})).toEqual({ present: false, matchedEnv: null });
  });
});
