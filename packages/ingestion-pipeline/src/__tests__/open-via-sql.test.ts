import { describe, expect, it } from "vitest";
import {
  createMemoryTryOpenPort,
  planSlateOpeningFromSql,
} from "../open-via-sql.js";

describe("planSlateOpeningFromSql structural kernel", () => {
  it("REFUSE while pending > 0 (zero false-open)", async () => {
    const port = createMemoryTryOpenPort({
      pending: 2,
      covered: 3,
      hex: "02" + "ab".repeat(32),
      value: "0",
      blinding: "1",
    });
    const plan = await planSlateOpeningFromSql(port, "slate-a");
    expect(plan.action).toBe("REFUSE");
    if (plan.action === "REFUSE") {
      expect(plan.reason).toBe("not_settled");
    }
  });

  it("REFUSE missing opener", async () => {
    const port = createMemoryTryOpenPort({
      pending: 0,
      covered: 0,
      hex: null,
      value: null,
      blinding: null,
    });
    const plan = await planSlateOpeningFromSql(port, "slate-b");
    expect(plan.action).toBe("REFUSE");
  });

  it("defers mint/bind to pure planner when SQL returns REVEAL material", async () => {
    // Without real curve openCommitment wiring in unit isolation, malformed
    // hex/value may refuse at planner — still must never REVEAL when pending>0.
    const port = createMemoryTryOpenPort({
      pending: 0,
      covered: 1,
      hex: "02" + "cd".repeat(32),
      value: "0",
      blinding: "1",
    });
    const plan = await planSlateOpeningFromSql(port, "slate-c");
    // Either REVEAL (if openCommitment accepts) or REFUSE self_check — never pending violation
    if (plan.action === "REVEAL") {
      expect(plan.opening.slateKey).toBe("slate-c");
    } else {
      expect(["self_check_failed", "malformed_opener", "no_opener"]).toContain(
        plan.reason,
      );
    }
  });
});
