import { describe, expect, it } from "vitest";
import { createLabelingManifest, simulateLabelingCost } from "./labeling";

describe("FABLE local labeling manifest", () => {
  it("creates a local-only manifest without AWS job claims", () => {
    const manifest = createLabelingManifest(
      [
        {
          candidate_id: "qb-week-1",
          metadata: { week: 1, position: "QB" },
          priority: 1,
          prompt: "Review whether the settled outcome matches the source of record.",
          source_id: "nflverse",
          task_type: "outcome_review",
        },
      ],
      new Date("2026-09-08T00:00:00.000Z")
    );

    expect(manifest.schema_version).toBe("fable-labeling-v1");
    expect(manifest.provider).toBe("local");
    expect(manifest.priced).toBe(false);
    expect(manifest.generated_at).toBe("2026-09-08T00:00:00.000Z");
  });

  it("simulates manual review cost without enabling paid resources", () => {
    const cost = simulateLabelingCost({
      humanMinutesPerItem: 3,
      itemCount: 100,
      qaReviewRate: 0.1,
      reviewerHourlyRateUsd: 30,
    });

    expect(cost.itemCount).toBe(100);
    expect(cost.reviewedItemCount).toBe(10);
    expect(cost.estimatedCostUsd).toBe(165);
    expect(cost.priced).toBe(false);
  });
});
