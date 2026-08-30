import { describe, it, expect } from "vitest";
import { buildTabHref } from "./tabs";

describe("buildTabHref", () => {
  it("sets the param on a clean pathname", () => {
    expect(buildTabHref("/intelligence/engines", "view", "ridge")).toBe(
      "/intelligence/engines?view=ridge",
    );
  });

  it("preserves other existing query params", () => {
    const href = buildTabHref("/players/edge", "view", "sell", {
      season: "2025",
      pos: "WR",
    });
    // order is deterministic by insertion; assert each pair is present
    expect(href.startsWith("/players/edge?")).toBe(true);
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("season")).toBe("2025");
    expect(params.get("pos")).toBe("WR");
    expect(params.get("view")).toBe("sell");
  });

  it("overrides the param when it already exists (no duplicates)", () => {
    const href = buildTabHref("/p", "view", "buy", { view: "sell" });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.getAll("view")).toEqual(["buy"]);
  });

  it("flattens array-valued params and drops undefined", () => {
    const href = buildTabHref("/p", "view", "x", {
      tag: ["a", "b"],
      missing: undefined,
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.getAll("tag")).toEqual(["a", "b"]);
    expect(params.has("missing")).toBe(false);
    expect(params.get("view")).toBe("x");
  });
});
