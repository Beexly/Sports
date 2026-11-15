import { describe, it, expect } from "vitest";
import { facetsForGame, FACET_LIBRARY } from "../situational-facets.js";

describe("facetsForGame", () => {
  it("TNF outdoor divisional cold game gets fatigue, weather and rivalry at full weight", () => {
    const f = facetsForGame({ isIndoor: false, windMph: 12, tempF: 44, isDivisional: true, window: "Thursday Night Football" });
    const by = (q: string) => f.find((x) => x.query === q);
    expect(by(FACET_LIBRARY.restFatigue.query)?.weight).toBe(1);
    expect(by(FACET_LIBRARY.weather.query)?.weight).toBe(1);
    expect(by(FACET_LIBRARY.rivalry.query)).toBeDefined();
    expect(by(FACET_LIBRARY.altitude.query)).toBeUndefined();
  });
  it("dome game never gets a weather facet; non-divisional never gets rivalry", () => {
    const f = facetsForGame({ isIndoor: true, windMph: 30, isDivisional: false });
    expect(f.some((x) => x.family === "weather")).toBe(false);
    expect(f.some((x) => x.query === FACET_LIBRARY.rivalry.query)).toBe(false);
  });
  it("every facet has anchors, and all six overlay families are reachable", () => {
    const f = facetsForGame({ isIndoor: false, isDivisional: true, isHighAltitudeDenver: true });
    for (const x of f) expect(x.anchors?.length).toBeGreaterThan(0);
    const fams = new Set(f.map((x) => x.family));
    for (const fam of ["pressure", "weather", "restFatigue", "coveragePersonnel", "qbSkillScript", "marketMicrostructure"]) expect(fams.has(fam as never)).toBe(true);
  });
});
