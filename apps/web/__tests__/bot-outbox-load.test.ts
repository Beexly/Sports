import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const loader = fs.readFileSync(
  path.join(repoRoot, "apps/web/lib/bot-outbox/load.ts"),
  "utf8",
);

describe("bot outbox loader", () => {
  it("discovers only free public canonical events inside the lookback window", () => {
    expect(loader).toContain("db.pick.findMany");
    expect(loader).toContain("db.gateDecision.findMany");
    expect(loader).toContain('isPublished: true');
    expect(loader).toContain('isBootstrap: false');
    expect(loader).toContain('tier: "FREE"');
    expect(loader).toContain('result: "PENDING"');
    expect(loader).toContain('result: { in: ["WIN", "LOSS", "PUSH"] }');
    expect(loader).toContain('status: "GATED"');
  });

  it("routes discovered rows through the mapper and draft planner layers", () => {
    expect(loader).toContain("pickRecordToPublicationInput");
    expect(loader).toContain("pickRecordToSettlementInput");
    expect(loader).toContain("gateDecisionRecordToGatedInput");
    expect(loader).toContain("planPickPublicationOutbox");
    expect(loader).toContain("planSettlementOutbox");
    expect(loader).toContain("planGatedSlateOutbox");
  });

  it("returns an explicit draft-only policy and item counts", () => {
    expect(loader).toContain("draftOnly: true");
    expect(loader).toContain("externalDelivery: false");
    expect(loader).toContain("persistence: false");
    expect(loader).toContain("blockedItems");
    expect(loader).toContain("lookbackMinutes");
  });
});
