import { describe, expect, it } from "vitest";
import {
  HYDRATE_FORCE_STEPS,
  nextHydrateAction,
  hydrateReadiness,
} from "../hydrate-force.js";

describe("hydrate force order", () => {
  it("starts at write_through", () => {
    const n = nextHydrateAction([]);
    expect(n?.id).toBe("pgs_write_through");
  });

  it("no step requires odds api", () => {
    expect(HYDRATE_FORCE_STEPS.every((s) => !s.oddsApiRequired)).toBe(true);
  });

  it("readiness pct", () => {
    const r = hydrateReadiness(["pgs_write_through", "gamma_cron_delta"]);
    expect(r.done).toBe(2);
    expect(r.next?.id).toBe("stripe_tier_values");
    expect(r.oddsStillOptional).toBe(true);
  });
});
