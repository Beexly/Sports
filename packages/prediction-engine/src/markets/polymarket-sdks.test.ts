import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  POLYMARKET_PUBLISH_HOLD,
  VENDORED_POLYMARKET_SDKS,
  polymarketPublishAllowed,
} from "./polymarket-sdks.js";

const ROOT = resolve(__dirname, "../../../polymarket-sdks");

describe("vendored polymarket sdks", () => {
  it("has each MIT SDK tree on disk and refuses publish", () => {
    expect(polymarketPublishAllowed()).toBe(false);
    expect(POLYMARKET_PUBLISH_HOLD).toMatch(/cleared:false/);
    for (const name of VENDORED_POLYMARKET_SDKS) {
      expect(existsSync(resolve(ROOT, name)), name).toBe(true);
    }
  });
});
