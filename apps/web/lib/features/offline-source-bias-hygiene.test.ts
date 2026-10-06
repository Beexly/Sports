import { describe, expect, it } from "vitest";
import {
  OFFLINE_SOURCE_BIAS_FIXTURE,
  runOfflineSourceBiasHygiene,
} from "./offline-source-bias-hygiene";

describe("runOfflineSourceBiasHygiene", () => {
  it("flags constant and leakage-suspect columns", () => {
    const r = runOfflineSourceBiasHygiene(OFFLINE_SOURCE_BIAS_FIXTURE);
    const junk = r.columns.find((c) => c.name === "junk");
    const leak = r.columns.find((c) => c.name === "leak");
    const sparse = r.columns.find((c) => c.name === "sparse");
    expect(junk?.flags).toContain("near_constant");
    expect(leak?.flags).toContain("market_leakage_suspect");
    expect(sparse?.flags).toContain("high_missingness");
  });
});
