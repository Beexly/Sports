import { describe, expect, it } from "vitest";
import {
  classifyPublicDarkHint,
  publicDarkCopy,
} from "@/lib/public/dark-reason";

describe("publicDarkCopy", () => {
  it("never marks quiet board as outage", () => {
    expect(publicDarkCopy("quiet_board_no_slate").isOutage).toBe(false);
    expect(publicDarkCopy("stale_odds_sla").isOutage).toBe(false);
  });
});

describe("classifyPublicDarkHint", () => {
  it("maps common hints", () => {
    expect(classifyPublicDarkHint("stale_data outside Refresh SLA")).toBe("stale_odds_sla");
    expect(classifyPublicDarkHint("Signal board quiet: no recent published")).toBe(
      "quiet_board_no_slate",
    );
    expect(classifyPublicDarkHint("bootstrap")).toBe("bootstrap");
  });
});
