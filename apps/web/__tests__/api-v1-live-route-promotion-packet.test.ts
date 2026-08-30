import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildApiV1LiveRoutePromotionPacket,
  type ApiV1LiveRoutePromotionEvidence,
} from "@/lib/api/v1";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const sourcePath = path.join(repoRoot, "apps/web/lib/api/v1/live-route-promotion-packet.ts");

const REVIEWED_EVIDENCE: ApiV1LiveRoutePromotionEvidence = {
  abuseResponseReviewed: true,
  boundaryExceptionReviewed: true,
  durablePersistenceReviewed: true,
  openApiSecurityReviewed: true,
  ownerApprovalRecorded: true,
  payloadEnvelopeReviewed: true,
  rateLimitPolicyReviewed: true,
  rawKeyAbsenceReviewed: true,
  rollbackPlanReviewed: true,
  routeExposureApproved: true,
};

describe("API v1 live-route promotion packet", () => {
  it("blocks current state on missing owner route-promotion evidence", () => {
    const packet = buildApiV1LiveRoutePromotionPacket();

    expect(packet.schemaVersion).toBe("api-v1-live-route-promotion-packet-v1");
    expect(packet.status).toBe("blocked_by_owner_gates");
    expect(packet.liveRouteCreationAllowed).toBe(false);
    expect(packet.commandsExecutableNow).toBe(false);
    expect(packet.gates.filter((entry) => entry.status === "blocked").map((entry) => entry.id)).toEqual([
      "owner-approval-recorded",
      "durable-persistence-reviewed",
      "route-exposure-approved",
      "abuse-response-reviewed",
      "payload-envelope-consumed",
      "openapi-security-reviewed",
      "rate-limit-policy-reviewed",
      "rollback-plan-reviewed",
      "boundary-exception-reviewed",
      "raw-key-absence-reviewed",
    ]);
    expect(packet.nextActions).toEqual([
      "Record owner-reviewed route promotion evidence before route implementation is discussed.",
    ]);
  });

  it("can become ready for owner route review without allowing live-route creation", () => {
    const packet = buildApiV1LiveRoutePromotionPacket({
      evidence: REVIEWED_EVIDENCE,
      inspection: {
        candidateRouteSourceText: "const payload = filterApiV1MetricPayloadFields(metricPayload);",
        routeTreeAbsent: true,
      },
    });

    expect(packet.status).toBe("ready_for_owner_route_review");
    expect(packet.blockers).toEqual([]);
    expect(packet.liveRouteCreationAllowed).toBe(false);
    expect(packet.commandsExecutableNow).toBe(false);
    expect(packet.gates.every((entry) => entry.status === "pass")).toBe(true);
    expect(packet.nextActions).toEqual([
      "Attach this packet to an owner-reviewed route implementation ticket; this packet still does not create or approve a live route.",
    ]);
  });

  it("requires metric payload-envelope consumption even when all other evidence is present", () => {
    const packet = buildApiV1LiveRoutePromotionPacket({
      evidence: REVIEWED_EVIDENCE,
      inspection: {
        candidateRouteSourceText: "const payload = buildResponseEnvelope(metricPayload);",
        routeTreeAbsent: true,
      },
    });

    expect(packet.status).toBe("blocked_by_owner_gates");
    expect(packet.gates.find((entry) => entry.id === "payload-envelope-consumed")).toMatchObject({
      blocker: "Metric payload-envelope consumption is missing from the route candidate.",
      status: "blocked",
    });
    expect(packet.blockers).toContain("Metric payload-envelope consumption is missing from the route candidate.");
  });

  it("reports true repo-boundary blockers when a route tree or boundary violation exists", () => {
    const packet = buildApiV1LiveRoutePromotionPacket({
      evidence: REVIEWED_EVIDENCE,
      inspection: {
        boundaryViolations: ["api-v1-route-tree"],
        candidateRouteSourceText: "const payload = filterProprietaryMetricPayloadEnvelope(metricPayload);",
        routeTreeAbsent: false,
      },
    });

    expect(packet.status).toBe("blocked_by_repo_boundary");
    expect(packet.gates.find((entry) => entry.id === "boundary-exception-reviewed")).toMatchObject({
      status: "blocked",
    });
    expect(packet.nextActions).toEqual([
      "Remove or isolate live API v1 route surfaces before any owner route review continues.",
    ]);
  });

  it("keeps every command intent non-executable and away from forbidden live targets", () => {
    const packet = buildApiV1LiveRoutePromotionPacket({
      evidence: REVIEWED_EVIDENCE,
      inspection: {
        candidateRouteSourceText: "const payload = filterApiV1MetricPayloadFields(metricPayload);",
        routeTreeAbsent: true,
      },
    });

    expect(packet.intents.every((intent) => intent.executableNow === false)).toBe(true);
    expect(packet.intents.map((intent) => intent.id)).toEqual([
      "record-owner-decision",
      "review-durable-persistence",
      "review-route-exposure",
      "verify-payload-envelope",
      "review-abuse-response",
      "review-openapi-security",
      "review-rate-limit-policy",
      "capture-rollback-plan",
    ]);
    expect(packet.intents.flatMap((intent) => intent.forbiddenTargets)).toEqual(
      expect.arrayContaining(["production database", "raw API key material", "live cloud resource", "unreviewed route tree"])
    );
  });

  it("keeps the live-route promotion packet source free of live-storage and network hooks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("@prisma/client");
    expect(source).not.toContain("packages/db");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("app/api/v1");
  });
});
