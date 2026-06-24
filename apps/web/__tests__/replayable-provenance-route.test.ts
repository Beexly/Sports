import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/calibration/replay-provenance/route";

describe("GET /api/calibration/replay-provenance", () => {
  const originalFlag = process.env.REPLAYABLE_PROVENANCE_ENDPOINT_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.REPLAYABLE_PROVENANCE_ENDPOINT_ENABLED;
    } else {
      process.env.REPLAYABLE_PROVENANCE_ENDPOINT_ENABLED = originalFlag;
    }
  });

  it("defaults to a flagged-off draft-only response", async () => {
    delete process.env.REPLAYABLE_PROVENANCE_ENDPOINT_ENABLED;

    const response = await GET();
    const body = (await response.json()) as {
      success: boolean;
      data: {
        status: string;
        enabled: boolean;
        draftOnly: boolean;
        priced: boolean;
        flagKey: string;
        rows: readonly unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.data.status).toBe("FLAGGED_OFF");
    expect(body.data.enabled).toBe(false);
    expect(body.data.draftOnly).toBe(true);
    expect(body.data.priced).toBe(false);
    expect(body.data.flagKey).toBe("REPLAYABLE_PROVENANCE_ENDPOINT");
    expect(body.data.rows).toHaveLength(0);
  });
});
