import { describe, expect, it } from "vitest";
import {
  coverageFor,
  parentOf,
  parseStratumKey,
  refuseIfEmptyStratum,
  stratumKey,
} from "../stratum-coverage";

describe("stratum-coverage extension — side + parentOf, 3-part keys intact", () => {
  it("still parses an existing 3-part certificate key", () => {
    expect(parseStratumKey("MLB|SPREAD|v5.1.0")).toEqual({
      sport: "MLB",
      pickType: "SPREAD",
      modelVersion: "v5.1.0",
    });
  });

  it("round-trips a side-qualified key and names its parent", () => {
    const key = stratumKey({
      sport: "MLB",
      pickType: "SPREAD",
      modelVersion: "v5.1.0",
      side: "HOME",
    });
    expect(key).toBe("MLB|SPREAD|v5.1.0|HOME");
    expect(parseStratumKey(key)).toEqual({
      sport: "MLB",
      pickType: "SPREAD",
      modelVersion: "v5.1.0",
      side: "HOME",
    });
    expect(parentOf(key)).toBe("MLB|SPREAD|v5.1.0");
  });

  it("parentOf on a 3-part key is null — it is already the parent", () => {
    expect(parentOf("MLB|SPREAD|v5.1.0")).toBeNull();
  });

  it("existing floor helpers still accept 3-part keys", () => {
    expect(coverageFor("MLB|SPREAD|v5.1.0", 180, 100).meetsFloor).toBe(true);
    expect(refuseIfEmptyStratum("MLB|MONEYLINE|v5.1.0", 74, 100).refuse).toBe(true);
  });
});
