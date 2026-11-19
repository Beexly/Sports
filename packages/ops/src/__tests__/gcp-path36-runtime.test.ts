import { describe, expect, it } from "vitest";
import {
  EVENT_CONTRACT_REGISTRY,
  GCP_PATH36_MONITORING_METRICS,
  GOOGLE_LB_HEALTH_CHECK_CIDRS,
  OPS_AGENT_MIN_VERSION,
  PATH36_CEL_GUARDRAIL_EXPRESSION,
  buildCloudArmorDenyIpExpression,
  buildCloudRunGen2PubSubDeploySpec,
  buildGcsJsonApiBucketCreateRequest,
  buildGcsJsonApiMediaUploadRequest,
  createCloudRunPubSubFunctionHandler,
  createEventEnvelope,
  decodePubSubCloudEventJson,
  validateExternalManagedLbAndArmorConfig,
  validateIamLeastPrivilegeBinding,
  validateInShellOAuthBearerToken,
  validateMonitoringAlertPolicy,
  type PubSubCloudEvent,
} from "../index.js";

describe("GCP Path 36 runtime & security contracts", () => {
  it("builds scale-to-zero Cloud Run Gen 2 Pub/Sub specs and decodes base64 CloudEvents idempotently", async () => {
    const deploySpec = buildCloudRunGen2PubSubDeploySpec({
      serviceName: "gse-odds-intake-fn",
      entryPoint: "helloPubSub",
      triggerTopic: "gse-odds-ticks",
    });
    expect(deploySpec.runtime).toBe("nodejs22");
    expect(deploySpec.minInstances).toBe(0);
    expect(deploySpec.tolerateExistingTopic).toBe(true);
    expect(deploySpec.retryWithoutExplicitGen2OnEventarc403).toBe(true);

    const envelope = createEventEnvelope({
      eventName: "odds.updated.v1",
      scopeKey: "nfl:2026:w11:IND@HOU",
      transport: "gcp-pubsub",
      occurredAtIso: "2026-11-19T06:00:00Z",
      payload: {
        sport: "nfl",
        gameId: "401873099",
        bookmaker: "draftkings",
        market: "spread",
        capturedAtIso: "2026-11-19T06:00:00Z",
        spreadHome: -12.5,
      },
    });
    const b64 = Buffer.from(JSON.stringify(envelope), "utf8").toString("base64");
    const cloudEvent: PubSubCloudEvent = {
      id: "evt-1",
      data: { message: { data: b64, messageId: "msg-1" } },
    };
    expect(decodePubSubCloudEventJson(cloudEvent)).toEqual(envelope);

    const seen = new Set<string>();
    const delivered: string[] = [];
    const handler = createCloudRunPubSubFunctionHandler("odds.updated.v1", {
      seenStore: {
        has: (k) => seen.has(k),
        add: (k) => {
          seen.add(k);
        },
      },
      onEvent: async (env) => {
        delivered.push(env.idempotencyKey);
      },
    });

    const first = await handler(cloudEvent, 1);
    const second = await handler(cloudEvent, 1);
    expect(first.status).toBe("acked");
    expect(second.status).toBe("duplicate_ignored");
    expect(delivered).toHaveLength(1);

    const malformed = await handler({ data: { message: { data: "not-json" } } }, 1);
    expect(malformed.status).toBe("dead_lettered");
    expect(malformed.deadLettered).toBe(true);
    expect(EVENT_CONTRACT_REGISTRY["odds.updated.v1"].deadLetterPolicy.deadLetterTopic).toContain("dlq");
  });

  it("enforces Monitoring alert teardown guard and Ops Agent baseline metrics (GSP089)", () => {
    expect(OPS_AGENT_MIN_VERSION).toBe("2.73.0");
    expect(GCP_PATH36_MONITORING_METRICS.cpuLoad1m).toBe("agent.googleapis.com/cpu/load_1m");

    const orphaned = validateMonitoringAlertPolicy({
      policyName: "Inbound Traffic Alert",
      metric: GCP_PATH36_MONITORING_METRICS.interfaceTraffic,
      emailChannels: ["ops@galaxysportsedge.com"],
      autoCloseSeconds: 300,
    });
    expect(orphaned.valid).toBe(false);

    const validProd = validateMonitoringAlertPolicy({
      policyName: "GSE Production Latency",
      metric: GCP_PATH36_MONITORING_METRICS.cpuLoad1m,
      emailChannels: ["ops@galaxysportsedge.com"],
      autoCloseSeconds: 1800,
      productionOwned: true,
      owner: "Platform Ops Lead",
      teardownTrigger: "Auto-close after 15m healthy",
    });
    expect(validProd.valid).toBe(true);
  });

  it("rejects EXTERNAL vs EXTERNAL_MANAGED LB scheme mismatch and builds Cloud Armor deny-403 (GSP213/215)", () => {
    expect(buildCloudArmorDenyIpExpression("34.83.10.5/32")).toBe(
      "inIpRange(origin.ip, '34.83.10.5/32')"
    );

    const badLb = validateExternalManagedLbAndArmorConfig({
      backendServiceScheme: "EXTERNAL",
      ipv4ForwardingRuleScheme: "EXTERNAL_MANAGED",
      ipv6ForwardingRuleScheme: "EXTERNAL_MANAGED",
      allowHttpTargetTags: ["http-server"],
      healthCheckSourceRanges: [...GOOGLE_LB_HEALTH_CHECK_CIDRS],
      cloudArmorDenyCidrs: ["34.83.10.5/32"],
    });
    expect(badLb.valid).toBe(false);
    expect(badLb.errors.some((e) => e.includes("EXTERNAL_MANAGED"))).toBe(true);
    expect(badLb.errors.some((e) => e.includes("--action=ALLOW"))).toBe(true);

    const goodLb = validateExternalManagedLbAndArmorConfig({
      backendServiceScheme: "EXTERNAL_MANAGED",
      ipv4ForwardingRuleScheme: "EXTERNAL_MANAGED",
      ipv6ForwardingRuleScheme: "EXTERNAL_MANAGED",
      allowHttpRuleAction: "ALLOW",
      allowHttpTargetTags: ["http-server", "web-server"],
      healthCheckSourceRanges: [...GOOGLE_LB_HEALTH_CHECK_CIDRS],
      cloudArmorDenyCidrs: ["34.83.10.5/32"],
    });
    expect(goodLb.valid).toBe(true);
  });

  it("enforces IAM group/impersonation, CEL hasOnly guardrails, and networkAdmin vs securityAdmin separation", () => {
    const netAdminDelete = validateIamLeastPrivilegeBinding({
      member: "serviceAccount:sa-net@gse-prod.iam.gserviceaccount.com",
      role: "roles/compute.networkAdmin",
      intendedFirewallOp: "delete",
    });
    expect(netAdminDelete.valid).toBe(false);
    expect(netAdminDelete.errors[0]).toContain("roles/compute.securityAdmin");

    const userAndEditor = validateIamLeastPrivilegeBinding({
      member: "user:someone@example.com",
      role: "roles/editor",
      staticJsonKeyUsed: true,
    });
    expect(userAndEditor.valid).toBe(false);
    expect(userAndEditor.errors.length).toBe(3);

    const guarded = validateIamLeastPrivilegeBinding({
      member: "group:gse-operators@galaxysportsedge.com",
      role: "roles/owner",
      celConditionExpression: PATH36_CEL_GUARDRAIL_EXPRESSION,
      staticJsonKeyUsed: false,
    });
    expect(guarded.valid).toBe(true);
  });

  it("validates in-shell OAuth2 bearer tokens and builds GCS JSON API requests (GSP074/294)", () => {
    expect(() => validateInShellOAuthBearerToken("short-manual-token")).toThrow(/truncated/);
    expect(() => validateInShellOAuthBearerToken("tok1\ntok2" + "x".repeat(40))).toThrow(/whitespace/);
    const fakeToken = "ya29.a0AfB_valid_synthetic_token_" + "x".repeat(32);

    const createReq = buildGcsJsonApiBucketCreateRequest({
      projectId: "gse-prod",
      bucketName: "gse-media-lake",
      accessToken: fakeToken,
    });
    expect(createReq.url).toBe("https://storage.googleapis.com/storage/v1/b?project=gse-prod");
    expect(createReq.headers["Authorization"]).toBe(`Bearer ${fakeToken}`);

    const uploadReq = buildGcsJsonApiMediaUploadRequest({
      bucketName: "gse-media-lake",
      objectName: "week11/banner.png",
      contentType: "image/png",
      accessToken: fakeToken,
    });
    expect(uploadReq.url).toBe(
      "https://storage.googleapis.com/upload/storage/v1/b/gse-media-lake/o?uploadType=media&name=week11%2Fbanner.png"
    );
  });
});
