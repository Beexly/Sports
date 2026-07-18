import { describe, expect, it } from "vitest";
import { projectPublicMarket } from "./project-public-market";

const base = {
  sport: "NFL",
  homeTeam: "Chiefs",
  awayTeam: "Bills",
  openingSpread: -3,
  openingTotal: 48,
};

describe("projectPublicMarket", () => {
  it("rebuilds public selections from canonical tagged values", () => {
    expect(projectPublicMarket({
      ...base,
      pickType: "SPREAD",
      selection: "Bills +3.5",
      line: -3.5,
    })).toMatchObject({ selection: "Bills +3.5", line: -3.5 });
    expect(projectPublicMarket({
      ...base,
      pickType: "TOTAL",
      selection: "OVER 48.5",
      line: 48.5,
    })).toMatchObject({ selection: "OVER 48.5", line: 48.5 });
    expect(projectPublicMarket({
      ...base,
      pickType: "MONEYLINE",
      selection: "Chiefs ML (+105)",
      line: 105,
    })).toMatchObject({ selection: "Chiefs ML (+105)", line: 105, lineMovement: null });
  });

  it.each([
    ["SPREAD", -3.2, "Chiefs -3.2"],
    ["TOTAL", 8.954545454545455, "OVER 8.95"],
    ["MONEYLINE", -39, "Chiefs ML"],
    ["MONEYLINE", 1.91, "Chiefs ML"],
    ["MONEYLINE", -7750, "Chiefs ML"],
  ])("withholds a %s row with unsupported value %s", (pickType, line, selection) => {
    expect(projectPublicMarket({ ...base, pickType, selection, line })).toBeNull();
  });

  it("withholds an ambiguous selection and a noncanonical opening move", () => {
    expect(projectPublicMarket({
      ...base,
      pickType: "SPREAD",
      selection: "Unknown -3.5",
      line: -3.5,
    })).toBeNull();
    expect(projectPublicMarket({
      ...base,
      pickType: "SPREAD",
      selection: "Chiefs -3.5",
      line: -3.5,
      openingSpread: -3.2,
    })?.lineMovement).toBeNull();
  });

  it("withholds a selection that disagrees with its stored tagged value", () => {
    expect(projectPublicMarket({
      ...base,
      pickType: "SPREAD",
      selection: "Bills -7",
      line: -3.5,
    })).toBeNull();
    expect(projectPublicMarket({
      ...base,
      pickType: "MONEYLINE",
      selection: "Chiefs ML (-110)",
      line: 105,
    })).toBeNull();
  });

  it("supports a canonical soccer quarter-line selection", () => {
    expect(projectPublicMarket({
      ...base,
      sport: "MLS",
      pickType: "SPREAD",
      selection: "Chiefs -0.25",
      line: -0.25,
    })?.selection).toBe("Chiefs -0.25");
  });
});
