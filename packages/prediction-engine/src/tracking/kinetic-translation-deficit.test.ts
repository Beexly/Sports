import { describe, expect, it } from "vitest";
import { kineticTranslationDeficit } from "./kinetic-translation-deficit.js";

describe("kinetic translation deficit", () => {
  it("matches the MIT formula and rejects a negative separation", () => {
    expect(kineticTranslationDeficit(9, 6.5, 2)).toBeCloseTo(2.5 / 2.01);
    expect(kineticTranslationDeficit(9, 6.5, -1)).toBeNull();
  });
});
