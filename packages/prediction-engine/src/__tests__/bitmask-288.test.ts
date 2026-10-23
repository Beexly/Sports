import { describe, it, expect } from "vitest";
import {
  buildContextualBitmask288,
  bitmaskXorIndices,
  NE_CHI_20261022_BITMASK_INPUT,
  NE_CHI_20261022_REQUIRED_BITS,
} from "../mcp/bitmask-schema";

describe("288-bit NE @ CHI lock", () => {
  it("sets the autopsy bit pattern and is stable", () => {
    const receipt = buildContextualBitmask288(NE_CHI_20261022_BITMASK_INPUT);
    expect([...receipt.activeBitIndices]).toEqual([...NE_CHI_20261022_REQUIRED_BITS]);
    const again = buildContextualBitmask288(NE_CHI_20261022_BITMASK_INPUT);
    expect(again.sha256Digest).toBe(receipt.sha256Digest);
    expect(receipt.secondOrderFlags.mutualDefSpineVoid).toBe(true);
    expect(receipt.secondOrderFlags.qbKneeldownHookHazard).toBe(true);
    expect(receipt.activeBitIndices).toEqual(expect.arrayContaining([280, 281]));
  });

  it("invalidates only the wind bit when the wind word changes", () => {
    const calm = buildContextualBitmask288(NE_CHI_20261022_BITMASK_INPUT);
    const gale = buildContextualBitmask288({ ...NE_CHI_20261022_BITMASK_INPUT, windSpeedMph: 18 });
    const flipped = bitmaskXorIndices(calm.activeBitIndices, gale.activeBitIndices);
    expect(flipped).toContain(4);
    expect(flipped).not.toContain(224);
    expect(calm.sha256Digest).not.toBe(gale.sha256Digest);
  });
});
