import {
  createStatelessEventHandler,
  type EventEnvelope,
  type GseEventName,
  type IdempotencyStore,
  type StatelessDispatchResult,
} from "./google-cloud-event-contracts.js";

/**
 * Path 36 GCP Runtime & Security Guardrails (Items #1, #4, #8, #9, #10).
 *
 * Pure, stateless, zero-external-SDK contracts encoding every architectural
 * invariant and operational gotcha verified across Courses 1-3 (GSP064, GSP074,
 * GSP080, GSP089, GSP094, GSP211, GSP213, GSP215, GSP294).
 */

export const OPS_AGENT_MIN_VERSION = "2.73.0" as const;

export const GCP_PATH36_MONITORING_METRICS = {
  cpuLoad1m: "agent.googleapis.com/cpu/load_1m",
  receivedPacketsCount: "compute.googleapis.com/instance/network/received_packets_count",
  interfaceTraffic: "agent.googleapis.com/interface/traffic",
} as const;

export const GOOGLE_LB_HEALTH_CHECK_CIDRS: readonly string[] = [
  "130.211.0.0/22",
  "35.191.0.0/16",
] as const;

export const PATH36_CEL_GUARDRAIL_EXPRESSION =
  "api.getAttribute('iam.googleapis.com/modifiedGrantsByRole', []).hasOnly(['roles/viewer', 'roles/storage.objectViewer'])" as const;

export interface PubSubCloudEvent {
  readonly id?: string;
  readonly type?: string;
  readonly source?: string;
  readonly time?: string;
  readonly data?: {
    readonly message?: {
      readonly data?: string;
      readonly messageId?: string;
      readonly publishTime?: string;
      readonly attributes?: Readonly<Record<string, string>>;
    };
    readonly subscription?: string;
  };
}

export interface CloudRunGen2PubSubDeploySpec {
  readonly serviceName: string;
  readonly runtime: "nodejs22";
  readonly region: string;
  readonly entryPoint: string;
  readonly triggerTopic: string;
  readonly minInstances: 0;
  readonly maxInstances: number;
  readonly tolerateExistingTopic: true;
  readonly retryWithoutExplicitGen2OnEventarc403: true;
}

export function buildCloudRunGen2PubSubDeploySpec(args: {
  readonly serviceName: string;
  readonly entryPoint: string;
  readonly triggerTopic: string;
  readonly region?: string;
  readonly maxInstances?: number;
}): CloudRunGen2PubSubDeploySpec {
  const serviceName = args.serviceName.trim();
  const entryPoint = args.entryPoint.trim();
  const triggerTopic = args.triggerTopic.trim();
  if (!serviceName || !entryPoint || !triggerTopic) {
    throw new Error("buildCloudRunGen2PubSubDeploySpec: serviceName, entryPoint, and triggerTopic are required");
  }
  const region = (args.region ?? "us-west1").trim();
  const maxInstances = Math.max(1, Math.min(4, Math.floor(args.maxInstances ?? 2)));
  return {
    serviceName,
    runtime: "nodejs22",
    region,
    entryPoint,
    triggerTopic,
    minInstances: 0,
    maxInstances,
    tolerateExistingTopic: true,
    retryWithoutExplicitGen2OnEventarc403: true,
  };
}

export function decodePubSubCloudEventJson(cloudEvent: PubSubCloudEvent): unknown {
  const b64 = cloudEvent.data?.message?.data;
  if (typeof b64 !== "string" || b64.trim().length === 0) {
    throw new Error("PubSubCloudEvent missing base64 data.message.data");
  }
  const utf8 = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(utf8) as unknown;
}

export function createCloudRunPubSubFunctionHandler<K extends GseEventName>(
  expectedEventName: K,
  options: {
    readonly seenStore: IdempotencyStore;
    readonly onEvent: (envelope: EventEnvelope<K>) => Promise<void>;
  }
): (cloudEvent: PubSubCloudEvent, deliveryAttempt?: number) => Promise<StatelessDispatchResult> {
  const dispatch = createStatelessEventHandler(expectedEventName, options);
  return async (cloudEvent: PubSubCloudEvent, deliveryAttempt = 1): Promise<StatelessDispatchResult> => {
    let decoded: unknown;
    try {
      decoded = decodePubSubCloudEventJson(cloudEvent);
    } catch {
      return {
        status: "dead_lettered",
        deadLettered: true,
        idempotencyKey: null,
        reason: "invalid base64 or JSON Pub/Sub cloudEvent payload",
      };
    }
    return dispatch(decoded, deliveryAttempt);
  };
}

export interface MonitoringAlertPolicySpec {
  readonly policyName: string;
  readonly metric: string;
  readonly emailChannels: readonly string[];
  readonly autoCloseSeconds?: number;
  readonly teardownAfterTest?: boolean;
  readonly productionOwned?: boolean;
  readonly owner?: string;
  readonly teardownTrigger?: string;
}

export interface ValidationOutcome {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateMonitoringAlertPolicy(spec: MonitoringAlertPolicySpec): ValidationOutcome {
  const errors: string[] = [];
  if (!spec.policyName.trim()) errors.push("policyName is required");
  if (!spec.metric.trim()) errors.push("metric is required");
  if (spec.emailChannels.length > 0) {
    if (typeof spec.autoCloseSeconds !== "number" || spec.autoCloseSeconds < 300) {
      errors.push("email-notifying alerts must specify autoCloseSeconds >= 300");
    }
    const isTestSafe = spec.teardownAfterTest === true;
    const isOwnedProd =
      spec.productionOwned === true &&
      Boolean(spec.owner?.trim()) &&
      Boolean(spec.teardownTrigger?.trim());
    if (!isTestSafe && !isOwnedProd) {
      errors.push(
        "email alert must either set teardownAfterTest=true or declare productionOwned=true with owner + teardownTrigger (GSP089 orphaned alert guard)"
      );
    }
  }
  return { valid: errors.length === 0, errors };
}

export interface ExternalManagedLbSpec {
  readonly backendServiceScheme: string;
  readonly ipv4ForwardingRuleScheme: string;
  readonly ipv6ForwardingRuleScheme?: string;
  readonly allowHttpRuleAction?: string;
  readonly allowHttpTargetTags: readonly string[];
  readonly healthCheckSourceRanges: readonly string[];
  readonly cloudArmorDenyCidrs: readonly string[];
}

export function buildCloudArmorDenyIpExpression(cidr: string): string {
  const trimmed = cidr.trim();
  if (!/^\d{1,3}(?:\.\d{1,3}){3}\/(?:[0-9]|[12][0-9]|3[0-2])$/.test(trimmed)) {
    throw new Error(`Invalid IPv4 CIDR for Cloud Armor deny rule: ${cidr}`);
  }
  return `inIpRange(origin.ip, '${trimmed}')`;
}

export function validateExternalManagedLbAndArmorConfig(
  spec: ExternalManagedLbSpec
): ValidationOutcome {
  const errors: string[] = [];
  if (spec.backendServiceScheme !== "EXTERNAL_MANAGED") {
    errors.push(`backendServiceScheme must be EXTERNAL_MANAGED, got ${spec.backendServiceScheme}`);
  }
  if (spec.ipv4ForwardingRuleScheme !== "EXTERNAL_MANAGED") {
    errors.push(
      `ipv4ForwardingRuleScheme must be EXTERNAL_MANAGED, got ${spec.ipv4ForwardingRuleScheme}`
    );
  }
  if (
    spec.ipv6ForwardingRuleScheme !== undefined &&
    spec.ipv6ForwardingRuleScheme !== "EXTERNAL_MANAGED"
  ) {
    errors.push(
      `ipv6ForwardingRuleScheme must be EXTERNAL_MANAGED, got ${spec.ipv6ForwardingRuleScheme}`
    );
  }
  if (spec.allowHttpRuleAction?.toUpperCase() !== "ALLOW") {
    errors.push("firewall rules must explicitly declare action ALLOW (--action=ALLOW)");
  }
  if (spec.allowHttpTargetTags.length === 0) {
    errors.push("HTTP firewall rule must scope to explicit target tags (e.g. web-server, http-server)");
  }
  for (const hc of GOOGLE_LB_HEALTH_CHECK_CIDRS) {
    if (!spec.healthCheckSourceRanges.includes(hc)) {
      errors.push(`missing required Google LB health-check CIDR: ${hc}`);
    }
  }
  for (const cidr of spec.cloudArmorDenyCidrs) {
    try {
      buildCloudArmorDenyIpExpression(cidr);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return { valid: errors.length === 0, errors };
}

export type FirewallMutationOperation = "list" | "create" | "update" | "delete";

export interface IamBindingSpec {
  readonly member: string;
  readonly role: string;
  readonly celConditionExpression?: string;
  readonly staticJsonKeyUsed?: boolean;
  readonly intendedFirewallOp?: FirewallMutationOperation;
}

export function validateIamLeastPrivilegeBinding(spec: IamBindingSpec): ValidationOutcome {
  const errors: string[] = [];
  const member = spec.member.trim();
  const role = spec.role.trim();

  if (member.startsWith("user:")) {
    errors.push("grant roles to group: or serviceAccount:, never individual user: principals");
  } else if (!member.startsWith("group:") && !member.startsWith("serviceAccount:")) {
    errors.push(`member must start with group: or serviceAccount:, got ${member}`);
  }

  if (role === "roles/editor") {
    errors.push("broad primitive role roles/editor is forbidden");
  }
  if (role === "roles/owner") {
    const cond = spec.celConditionExpression ?? "";
    if (!cond.includes(".hasOnly(")) {
      errors.push("roles/owner is forbidden without an explicit CEL hasOnly([...]) guardrail condition");
    }
  }
  if (spec.staticJsonKeyUsed === true) {
    errors.push(
      "static service-account JSON key files are disallowed; prefer gcloud --impersonate-service-account or Workload Identity Federation"
    );
  }
  if (
    spec.intendedFirewallOp === "delete" &&
    role === "roles/compute.networkAdmin"
  ) {
    errors.push(
      "roles/compute.networkAdmin cannot delete firewall rules (GSP213); assign roles/compute.securityAdmin"
    );
  }
  return { valid: errors.length === 0, errors };
}

export function validateInShellOAuthBearerToken(rawToken: string): string {
  const trimmed = rawToken.trim();
  if (!trimmed) {
    throw new Error("OAuth2 bearer token is empty; mint via `gcloud auth print-access-token`");
  }
  if (/^keyString:/i.test(trimmed)) {
    throw new Error("Pass raw OAuth2 token from `gcloud auth print-access-token`, not API key label");
  }
  if (/[\r\n\s]/.test(trimmed)) {
    throw new Error("OAuth2 bearer token contains whitespace or line breaks (transcription corruption)");
  }
  if (trimmed.length < 32) {
    throw new Error("OAuth2 bearer token appears truncated (<32 chars); never hand-transcribe tokens");
  }
  return trimmed;
}

export interface HttpJsonRequestSpec {
  readonly url: string;
  readonly method: "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly bodyJson?: string;
}

export function buildGcsJsonApiBucketCreateRequest(args: {
  readonly projectId: string;
  readonly bucketName: string;
  readonly accessToken: string;
  readonly location?: string;
  readonly storageClass?: "STANDARD" | "MULTI_REGIONAL" | "NEARLINE" | "COLDLINE" | "ARCHIVE";
}): HttpJsonRequestSpec {
  const projectId = args.projectId.trim();
  const bucketName = args.bucketName.trim();
  if (!projectId || !bucketName) {
    throw new Error("projectId and bucketName are required");
  }
  const token = validateInShellOAuthBearerToken(args.accessToken);
  return {
    url: `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(projectId)}`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    bodyJson: JSON.stringify({
      name: bucketName,
      location: args.location ?? "us",
      storageClass: args.storageClass ?? "STANDARD",
    }),
  };
}

export function buildGcsJsonApiMediaUploadRequest(args: {
  readonly bucketName: string;
  readonly objectName: string;
  readonly contentType: string;
  readonly accessToken: string;
}): HttpJsonRequestSpec {
  const bucketName = args.bucketName.trim();
  const objectName = args.objectName.trim();
  if (!bucketName || !objectName) {
    throw new Error("bucketName and objectName are required");
  }
  const token = validateInShellOAuthBearerToken(args.accessToken);
  return {
    url: `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(
      bucketName
    )}/o?uploadType=media&name=${encodeURIComponent(objectName)}`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": args.contentType,
    },
  };
}
