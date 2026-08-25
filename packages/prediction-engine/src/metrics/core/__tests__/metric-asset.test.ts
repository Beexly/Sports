import { describe, expect, it } from "vitest";
import { GSE_METRIC_ASSETS, metricAsset, requireMetricAsset } from "../metric-asset.js";
import { GSE_METRIC_BIRTH_CERTIFICATES } from "../metric-birth-certificate.js";

describe("metric assets", () => {
  it("mirrors every birth certificate as a shadow asset shell", () => {
    expect(GSE_METRIC_ASSETS.map((asset) => asset.metricId)).toEqual(
      GSE_METRIC_BIRTH_CERTIFICATES.map((certificate) => certificate.metricId),
    );

    for (const asset of GSE_METRIC_ASSETS) {
      expect(asset.apiExposure).toBe("INTERNAL");
      expect(asset.licensingStatus).toBe("NOT_READY");
      expect(asset.birthCertificate.status).toBe("SHADOW");
      expect(asset.modelCard.status).toBe("MISSING");
      expect(asset.validationReport.status).toBe("MISSING");
      expect(asset.validationReport.sampleSize).toBe(0);
      expect(asset.validationReport.minimumSampleSize).toBe(1);
      expect(asset.driftCard.status).toBe("MISSING");
    }
  });

  it("looks up known assets and returns null for unknown ids", () => {
    const known = metricAsset("market-gravity-index");

    expect(known?.metricId).toBe("market-gravity-index");
    expect(known?.name).toBe(known?.birthCertificate.publicName);
    expect(metricAsset("not-a-metric")).toBeNull();
  });

  it("requireMetricAsset returns the catalog asset or throws for unknown ids", () => {
    expect(requireMetricAsset("market-gravity-index").metricId).toBe("market-gravity-index");
    expect(() => requireMetricAsset("not-a-metric")).toThrow("Missing metric asset: not-a-metric");
  });

  it("builds source-rights shells that allow modeling but not validation or exposure", () => {
    const asset = requireMetricAsset("market-gravity-index");
    const expectedSourceIds = asset.birthCertificate.sourceRightsRequired;

    expect(asset.sourceRights.map((source) => source.sourceId)).toEqual(expectedSourceIds);
    for (const source of asset.sourceRights) {
      expect(source.mayUseForModeling).toBe(true);
      expect(source.mayValidateAgainst).toBe(false);
      expect(source.mayExposeDerived).toBe(false);
      expect(source.mayExposeRaw).toBe(false);
    }
  });
});
