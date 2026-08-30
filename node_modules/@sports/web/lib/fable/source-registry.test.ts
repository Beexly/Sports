import { describe, expect, it } from "vitest";
import { buildFableSourceRegistry, findFableSourceRegistryEntry } from "./source-registry";

describe("FABLE source registry adapter", () => {
  it("maps open NFL data to allowed storage and derived feature use", () => {
    const nflverse = findFableSourceRegistryEntry("nflverse");
    if (nflverse === null) throw new Error("expected nflverse source entry");

    expect(nflverse.source_name).toBe("nflverse");
    expect(nflverse.storage_status).toBe("allowed");
    expect(nflverse.derived_feature_status).toBe("allowed");
    expect(nflverse.aws_storage_status).toBe("allowed");
    expect(nflverse.attribution_required).toBe(true);
    expect(nflverse.owner_decision_needed).toBe(false);
  });

  it("keeps public fallback feeds blocked for raw commercial display", () => {
    const espn = findFableSourceRegistryEntry("espn-public-api");
    if (espn === null) throw new Error("expected ESPN public API source entry");

    expect(espn.display_status).toBe("blocked");
    expect(espn.storage_status).toBe("blocked");
    expect(espn.derived_feature_status).toBe("allowed");
    expect(espn.prohibited_use).toEqual(expect.arrayContaining(["commercial display"]));
  });

  it("surfaces owner decision needs from blocked or conditional sources", () => {
    const registry = buildFableSourceRegistry();
    const conditional = registry.filter((entry) => entry.owner_decision_needed);

    expect(conditional.length).toBeGreaterThan(0);
    expect(conditional.map((entry) => entry.source_id)).toEqual(
      expect.arrayContaining(["siriusxm-streaming", "scores24-live"])
    );
  });
});
