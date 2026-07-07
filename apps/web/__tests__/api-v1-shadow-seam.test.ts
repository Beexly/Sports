import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildApiV1ShadowOpenApi,
  createApiV1ErrorEnvelope,
  createApiV1SuccessEnvelope,
  evaluateApiV1PayloadRights,
  evaluateApiV1Scopes,
  evaluateApiV1ShadowGateway,
  hashApiV1Key,
  normalizeApiV1Scopes,
  parseApiV1Credential,
  type ApiV1RegisteredConsumer,
} from "@/lib/api/v1";

const RAW_KEY = "gse_v1_shadow_ABCDEFGHIJKLMNOP";
const OTHER_KEY = "gse_v1_shadow_QRSTUVWXYZabcdef";
const GENERATED_AT = "2026-07-04T00:00:00.000Z";

function consumer(overrides: Partial<ApiV1RegisteredConsumer> = {}): ApiV1RegisteredConsumer {
  return {
    active: true,
    allowedOrigins: ["partner.gse.test"],
    keyHash: hashApiV1Key(RAW_KEY),
    keyId: "consumer_shadow_1",
    scopes: ["evidence:read"],
    ...overrides,
  };
}

describe("API v1 shadow key parsing", () => {
  it("normalizes bearer credentials into a stable hash without storing raw keys", () => {
    const parsed = parseApiV1Credential({ authorization: `Bearer ${RAW_KEY}` });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.keyHash).toBe(hashApiV1Key(RAW_KEY));
    expect(parsed.keyHash).not.toContain(RAW_KEY);
    expect(parsed.keyId).toMatch(/^gse_v1_shadow_[a-f0-9]{12}$/);
    expect(parsed.transport).toBe("authorization_bearer");
    expect(parsed.redacted).not.toBe(RAW_KEY);
  });

  it("fails closed on missing, malformed, invalid-scheme, and conflicting credentials", () => {
    expect(parseApiV1Credential({}).ok).toBe(false);
    expect(parseApiV1Credential({ authorization: "Basic abc" })).toMatchObject({
      code: "invalid_authorization_scheme",
      ok: false,
    });
    expect(parseApiV1Credential({ xGseApiKey: "not-a-gse-key" })).toMatchObject({
      code: "malformed_api_key",
      ok: false,
    });
    expect(parseApiV1Credential({ authorization: `Bearer ${RAW_KEY}`, xGseApiKey: OTHER_KEY })).toMatchObject({
      code: "conflicting_api_keys",
      ok: false,
    });
  });
});

describe("API v1 shadow scopes", () => {
  it("parses only known scopes and de-duplicates them", () => {
    expect(normalizeApiV1Scopes("evidence:read signals:read evidence:read garbage")).toEqual([
      "evidence:read",
      "signals:read",
    ]);
  });

  it("requires every endpoint scope unless admin shadow scope is present", () => {
    const denied = evaluateApiV1Scopes(["signals:read"], ["signals:read", "evidence:read"]);
    expect(denied.allowed).toBe(false);
    expect(denied.missingScopes).toEqual(["evidence:read"]);

    const admin = evaluateApiV1Scopes(["admin:shadow"], ["signals:read", "evidence:read"]);
    expect(admin.allowed).toBe(true);
    expect(admin.missingScopes).toEqual([]);
  });
});

describe("API v1 payload rights", () => {
  it("allows nflverse commercial display with attribution", () => {
    const report = evaluateApiV1PayloadRights({
      intendedUse: "commercial_display",
      sourceIds: ["nflverse"],
    });

    expect(report.allowed).toBe(true);
    expect(report.attributions.join(" ")).toContain("nflverse");
  });

  it("blocks commercial display and raw payload exposure when source rights are limited", () => {
    const display = evaluateApiV1PayloadRights({
      intendedUse: "commercial_display",
      sourceIds: ["espn-public-api"],
    });
    expect(display.allowed).toBe(false);
    expect(display.blockers.join(" ")).toMatch(/blocked for commercial_display/);

    const raw = evaluateApiV1PayloadRights({
      includesRawVendorPayload: true,
      intendedUse: "derived_feature",
      sourceIds: ["espn-public-api"],
    });
    expect(raw.allowed).toBe(false);
    expect(raw.blockers.join(" ")).toMatch(/raw vendor payload/);
  });

  it("fails closed for unknown sources, blocked sources, empty source lists, and personal data", () => {
    expect(
      evaluateApiV1PayloadRights({ intendedUse: "public_display", sourceIds: ["missing-source"] }).allowed
    ).toBe(false);
    expect(evaluateApiV1PayloadRights({ intendedUse: "public_display", sourceIds: ["scores24-live"] }).allowed).toBe(
      false
    );
    expect(evaluateApiV1PayloadRights({ intendedUse: "public_display", sourceIds: [] }).allowed).toBe(false);
    expect(
      evaluateApiV1PayloadRights({
        includesPersonalData: true,
        intendedUse: "public_display",
        sourceIds: ["nflverse"],
      }).allowed
    ).toBe(false);
  });
});

describe("API v1 shadow envelopes and gateway", () => {
  it("builds deterministic shadow success and error envelopes", () => {
    const success = createApiV1SuccessEnvelope({ id: "rec_1" }, {
      endpointId: "evidence.record.read",
      generatedAt: GENERATED_AT,
    });
    expect(success).toMatchObject({
      data: { id: "rec_1" },
      errors: [],
      meta: { shadow: true, version: "gse-api-v1-shadow" },
      ok: true,
    });

    const failure = createApiV1ErrorEnvelope(
      [{ code: "blocked", message: "No route should publish this." }],
      { endpointId: "evidence.record.read", generatedAt: GENERATED_AT }
    );
    expect(failure.ok).toBe(false);
    expect(failure.data).toBeNull();
    expect(failure.errors[0]).toMatchObject({ code: "blocked" });
  });

  it("allows only when auth, registration, scope, origin, and rights gates all pass", () => {
    const decision = evaluateApiV1ShadowGateway({
      consumer: consumer(),
      endpointId: "evidence.record.read",
      generatedAt: GENERATED_AT,
      headers: { authorization: `Bearer ${RAW_KEY}` },
      origin: "https://sub.partner.gse.test/widget",
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
    });

    expect(decision.ok).toBe(true);
    expect(decision.data?.shadowOnly).toBe(true);
    expect(decision.data?.consumerKeyId).toBe("consumer_shadow_1");
    expect(decision.data?.attributions.join(" ")).toContain("nflverse");
  });

  it("fails closed when the key is not registered or hashes do not match", () => {
    const unregistered = evaluateApiV1ShadowGateway({
      consumer: null,
      endpointId: "evidence.record.read",
      headers: { authorization: `Bearer ${RAW_KEY}` },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
    });
    expect(unregistered.ok).toBe(false);
    expect(unregistered.errors.map((entry) => entry.code)).toContain("api_key_not_registered");

    const mismatch = evaluateApiV1ShadowGateway({
      consumer: consumer({ keyHash: hashApiV1Key(OTHER_KEY) }),
      endpointId: "evidence.record.read",
      headers: { authorization: `Bearer ${RAW_KEY}` },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
    });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.errors.map((entry) => entry.code)).toContain("api_key_hash_mismatch");
  });

  it("fails closed for inactive keys, missing scopes, blocked origins, and blocked payload rights", () => {
    const inactive = evaluateApiV1ShadowGateway({
      consumer: consumer({ active: false }),
      endpointId: "evidence.record.read",
      headers: { authorization: `Bearer ${RAW_KEY}` },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
    });
    expect(inactive.errors.map((entry) => entry.code)).toContain("api_key_inactive");

    const scope = evaluateApiV1ShadowGateway({
      consumer: consumer({ scopes: ["metrics:read"] }),
      endpointId: "evidence.record.read",
      headers: { authorization: `Bearer ${RAW_KEY}` },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
    });
    expect(scope.errors.map((entry) => entry.code)).toContain("insufficient_scope");

    const origin = evaluateApiV1ShadowGateway({
      consumer: consumer(),
      endpointId: "evidence.record.read",
      headers: { authorization: `Bearer ${RAW_KEY}` },
      origin: "https://not-allowed.test",
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
    });
    expect(origin.errors.map((entry) => entry.code)).toContain("origin_not_allowed");

    const rights = evaluateApiV1ShadowGateway({
      consumer: consumer(),
      endpointId: "evidence.record.read",
      headers: { authorization: `Bearer ${RAW_KEY}` },
      payload: { intendedUse: "commercial_display", sourceIds: ["espn-public-api"] },
    });
    expect(rights.errors.map((entry) => entry.code)).toContain("payload_rights_blocked");
  });
});

describe("API v1 shadow OpenAPI draft", () => {
  it("documents every endpoint as shadow-only and does not create a live route tree", () => {
    const openApi = buildApiV1ShadowOpenApi();

    expect(openApi["x-gse-live-routes-exposed"]).toBe(false);
    expect(Object.keys(openApi.paths)).toEqual([
      "/v1/evidence/{id}",
      "/v1/signals/{gameId}",
      "/v1/metrics/{metricId}/birth-certificate",
      "/v1/revenue/partners/{partnerId}/summary",
    ]);
    Object.values(openApi.paths).forEach((path) => {
      expect(path.get["x-gse-shadow-only"]).toBe(true);
      expect(path.get["x-gse-required-scopes"].length).toBeGreaterThan(0);
    });
    expect(existsSync(join(process.cwd(), "app/api/v1"))).toBe(false);
  });
});
