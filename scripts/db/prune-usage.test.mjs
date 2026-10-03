import { test } from "node:test";
import assert from "node:assert/strict";
import { cutoffDate, planPrune } from "./prune-usage.mjs";

test("cutoffDate subtracts N days from now", () => {
  const now = new Date("2026-06-22T00:00:00.000Z");
  assert.equal(cutoffDate(7, now).toISOString(), "2026-06-15T00:00:00.000Z");
  assert.equal(cutoffDate(0, now).toISOString(), now.toISOString());
});

test("planPrune returns the snapshot cutoff for the retention window", () => {
  const now = new Date("2026-06-22T00:00:00.000Z");
  const plan = planPrune({ snapshotRetentionDays: 7 }, now);
  assert.equal(plan.snapshotCutoff.toISOString(), "2026-06-15T00:00:00.000Z");
});
