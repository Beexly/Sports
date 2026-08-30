import { describe, expect, it } from "vitest";
import { NFL_EPA_PATH_TAG, nflEpaPathStatus } from "../nfl-epa-path.js";

describe("nflEpaPathStatus", () => {
  it("is dead when the table is empty", () => {
    const r = nflEpaPathStatus(2025, 0);
    expect(r.live).toBe(false);
    expect(r.reason).toMatch(/empty/);
    expect(r.priced).toBe(false);
    expect(NFL_EPA_PATH_TAG).toBe("nfl_epa_path_v1");
  });

  it("is live when rows exist", () => {
    const r = nflEpaPathStatus(2025, 544);
    expect(r.live).toBe(true);
    expect(r.rows).toBe(544);
  });
});
