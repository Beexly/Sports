import { describe, expect, it } from "vitest";

import {
  affiliateDisclosureFence,
  apiPayloadRightsFence,
  commercialCopyFence,
  evaluateFences,
  noRawNgsFence,
  responsibleGamingFence,
  sourceRightsFence,
  summarizeFenceResults,
} from "@/lib/fences/index";
import { buildIpMetricCard, evaluateIpPayloadRights, evaluateLicensingReadiness } from "@/lib/ip/index";
import { auditSourceRights, evaluateSourceRightsUse, sourceAttributionFor } from "@/lib/source-rights/index";
import {
  apiPlan,
  evaluateQuotaWindow,
  hashApiV1Key,
  idempotencyKeyFor,
  parseApiV1Credential,
  signWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/api-auth/index";
import { filterApiV1MetricPayloadFields, filterApiV1PayloadFields } from "@/lib/api-v1/index";
import type { RevenueOffer, RevenuePartner } from "@/lib/revenue";

const partner: RevenuePartner = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  category: "sportsbook",
  disclosureRequired: true,
  displayName: "Regulated Book",
  id: "book_partner",
};

const offer: RevenueOffer = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  category: "sportsbook",
  disclosureText: "Sponsored disclosure: GSE may receive compensation.",
  eligibleStates: ["NJ"],
  id: "book_offer",
  minimumAge: 21,
  partnerId: partner.id,
  publicName: "Book review",
  responsibleGamingText: "Must be 21+. If gambling is a problem, seek help through local support resources.",
  riskClass: "high",
  termsUrl: "https://partner.example/terms",
};

describe("fence plugin foundation", () => {
  it("blocks tout copy and raw NGS language", async () => {
    const tout = await commercialCopyFence.evaluate({
      metadata: {},
      surface: "content",
      text: "This is a lock and guaranteed free money.",
    });
    const rawNgs = await noRawNgsFence.evaluate({
      metadata: {},
      surface: "api",
      text: "Expose raw Next Gen Stats rows through the partner API.",
    });

    expect(tout.ok).toBe(false);
    expect(rawNgs.ok).toBe(false);
  });

  it("passes regulated partner content only with disclosure, responsible gaming, and state metadata", async () => {
    const results = await evaluateFences([affiliateDisclosureFence, responsibleGamingFence], {
      metadata: { offer, partner, surface: "newsletter", userState: "NJ" },
      surface: "partner",
      text: "Sponsored disclosure: GSE may receive compensation. Must be 21+.",
    });
    const summary = summarizeFenceResults(results);

    expect(summary.ok).toBe(true);
  });

  it("source and API payload fences fail closed on blocked sources", async () => {
    const source = await sourceRightsFence.evaluate({
      metadata: { sourceIds: ["scores24-live"] },
      surface: "api",
    });
    const payload = await apiPayloadRightsFence.evaluate({
      metadata: { intendedUse: "commercial_display", sourceIds: ["espn-public-api"] },
      surface: "api",
    });

    expect(source.ok).toBe(false);
    expect(payload.ok).toBe(false);
  });
});

describe("source-rights and IP adapters", () => {
  it("reuses the canonical source-rights registry and attribution", () => {
    const nflverse = evaluateSourceRightsUse("nflverse", "derived_api");
    const scores24 = evaluateSourceRightsUse("scores24-live", "derived_api");
    const audit = auditSourceRights(["nflverse"], "derived_api");

    expect(nflverse.allowed).toBe(true);
    expect(scores24.allowed).toBe(false);
    expect(audit.ok).toBe(true);
    expect(sourceAttributionFor(["nflverse"]).join(" ")).toContain("nflverse");
  });

  it("blocks protected or raw payload fields before API exposure", () => {
    const decision = evaluateIpPayloadRights([
      { kind: "derived_metric", path: "metrics.xyac", sourceIds: ["nflverse"] },
      { kind: "protected_weight", path: "metrics.xyac.weights", sourceIds: ["nflverse"] },
    ]);

    expect(decision.ok).toBe(false);
    expect(decision.approvedFields).toContain("metrics.xyac");
    expect(decision.blockedFields).toContain("metrics.xyac.weights");
  });

  it("keeps metric licensing blocked until approval and derived rights exist", () => {
    const card = buildIpMetricCard({
      metricId: "expected-yac-gse",
      protectedComponents: ["space/leverage transforms"],
      publicName: "GSE Expected YAC",
      sourceIds: ["nflverse"],
    });

    expect(evaluateLicensingReadiness(card).ready).toBe(false);
  });
});

describe("API auth compatibility seams", () => {
  it("parses and hashes API keys through the existing shadow API implementation", () => {
    const raw = "gse_v1_shadow_ABCDEFGHIJKLMNOP";
    const parsed = parseApiV1Credential({ authorization: `Bearer ${raw}` });

    expect(parsed.ok).toBe(true);
    expect(hashApiV1Key(raw)).toHaveLength(64);
  });

  it("provides quota, webhook, idempotency, and payload-filter helpers without live routes", () => {
    const quota = evaluateQuotaWindow({ limit: 10, used: 9 });
    const signature = signWebhookPayload("{}", "secret");
    const idempotency = idempotencyKeyFor({ bodyHash: "abc", method: "post", path: "/v1/evidence/1" });
    const payload = filterApiV1PayloadFields(
      [
        { path: "summary", sourceIds: ["nflverse"], value: "ok" },
        { path: "raw.price", rawVendorPayload: true, sourceIds: ["espn-public-api"], value: 100 },
      ],
      "commercial_display",
    );

    expect(apiPlan("shadow_partner").liveBillingEnabled).toBe(false);
    expect(quota).toMatchObject({ allowed: true, remaining: 0 });
    expect(verifyWebhookSignature("{}", signature, "secret")).toBe(true);
    expect(idempotency).toHaveLength(32);
    expect(payload.ok).toBe(false);
    expect(payload.payload.summary).toBe("ok");
    expect(payload.blockedFields).toContain("raw.price");
  });

  it("filters proprietary metric payloads through prediction-engine rights before API exposure", () => {
    const payload = filterApiV1MetricPayloadFields([
      {
        description: "GSE-derived receiver difficulty score.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "metrics.receiverDifficulty.score",
        sourceIds: ["nflverse"],
        value: 74,
      },
      {
        description: "Protected coefficient that must stay inside the metric package.",
        exposure: "INTERNAL",
        kind: "PROTECTED_WEIGHT",
        path: "metrics.receiverDifficulty.weights.contestedCatch",
        sourceIds: ["nflverse"],
        value: 0.27,
      },
    ]);

    expect(payload.ok).toBe(false);
    expect(payload.payload["metrics.receiverDifficulty.score"]).toBe(74);
    expect(payload.payload["metrics.receiverDifficulty.weights.contestedCatch"]).toBeUndefined();
    expect(payload.blockedFields).toEqual(["metrics.receiverDifficulty.weights.contestedCatch"]);
    expect(payload.attributions.join(" ")).toContain("nflverse");
    expect(payload.blockers.join(" ")).toContain("protected weights");
  });
});
