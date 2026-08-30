import { describe, expect, it } from "vitest";
import { cloudAttemptOrder } from "./jynx";
import {
  exampleCloudAttemptOrderCases,
  exampleContentFreeLanePlan,
  exampleDefaultCloudOrder,
  runCloudAttemptOrderExamples,
} from "./jynx-examples";

describe("jynx-examples (cloudAttemptOrder code samples)", () => {
  it("every documented cloudAttemptOrder case matches runtime", () => {
    for (const c of exampleCloudAttemptOrderCases()) {
      expect(cloudAttemptOrder(c.env), c.name).toEqual(c.expected);
    }
  });

  it("runCloudAttemptOrderExamples returns all case names", () => {
    const ran = runCloudAttemptOrderExamples();
    expect(Object.keys(ran).length).toBe(exampleCloudAttemptOrderCases().length);
  });

  it("default cloud order is bedrock → azure → vertex", () => {
    expect(exampleDefaultCloudOrder()).toEqual(["bedrock", "azure", "vertex"]);
  });

  it("content free-lane plan example prefers cerebras_free", () => {
    const plan = exampleContentFreeLanePlan();
    expect(plan.primaryLane).toBe("cerebras_free");
    expect(plan.cloudAttempts[0]).toBe("bedrock");
  });
});
