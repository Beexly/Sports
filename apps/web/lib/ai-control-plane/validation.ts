/**
 * Complete request/policy validation for the AI control plane (directive §8.4,
 * §8.5). Everything here is PURE and fail-closed:
 *
 *   - `validatePolicyDefinition`   — structural validation of one registry
 *                                    policy (run at registry LOAD, so a
 *                                    malformed policy fails build/startup).
 *   - `validateDataPolicy`         — composable-tag consistency (§8.5).
 *   - `validateInvocationRequest`  — full §8.4 request validation: request-id
 *                                    format, TrustedActor structure, entity,
 *                                    input serializability + size, secret
 *                                    material heuristic, payment-card scan.
 *   - `resolveEffectiveAuthority`  — applies caller narrowing to the registry
 *                                    policy; ANY widening attempt throws
 *                                    `PolicyBlocked` (authority escalation).
 *   - `assertPolicyVersionAllowed` — production may not run "unversioned".
 *
 * Error taxonomy: malformed caller input → `InvalidInput`; an attempt to gain
 * authority the registry did not grant → `PolicyBlocked`; a malformed OWNER
 * policy (registry bug) → `ConfigurationError`.
 */

import type { TrustedActor } from "@/lib/auth/actor";
import type {
  AiAuthorityNarrowing,
  AiTaskInvocationRequest,
  AiTaskPolicyDefinition,
  DataPolicy,
  DataPolicyTag,
  EffectiveAuthority,
  Entity,
  ProviderRouteId,
  RetentionPolicy,
} from "./contracts";
import type { AiEnvClass, CostMode } from "./cost-mode";
import { ConfigurationError, InvalidInput, PolicyBlocked } from "./errors";

// ─── Closed vocabularies ──────────────────────────────────────────────────────

const ENTITIES: ReadonlySet<Entity> = new Set<Entity>([
  "GSE",
  "GSN",
  "XXX",
  "PERSONAL",
]);

const PROVIDER_ROUTE_IDS: ReadonlySet<ProviderRouteId> =
  new Set<ProviderRouteId>([
    "anthropic-direct",
    "bedrock",
    "vertex",
    "cerebras",
    "local",
  ]);

const COST_MODES: ReadonlySet<CostMode> = new Set<CostMode>([
  "NO_BILLABLE_EXTERNAL",
  "CONFIRMED_CREDITS_ONLY",
  "BUDGETED_CASH",
  "EMERGENCY_RELIABILITY",
]);

const BASE_DATA_TAGS: ReadonlySet<DataPolicyTag> = new Set<DataPolicyTag>([
  "public",
  "internal",
  "user-private",
]);

const ALL_DATA_TAGS: ReadonlySet<DataPolicyTag> = new Set<DataPolicyTag>([
  "public",
  "internal",
  "user-private",
  "pii",
  "regulated",
  "payment-adjacent",
  "secret-prohibited",
  "rights-restricted",
  "training-prohibited",
  "residency-restricted",
]);

/** Modifier tags that contradict a "public" base classification. */
const PUBLIC_CONTRADICTIONS: ReadonlySet<DataPolicyTag> =
  new Set<DataPolicyTag>(["pii", "regulated", "payment-adjacent"]);

const ACTOR_TYPES = new Set(["HUMAN", "SERVICE", "SYSTEM"]);

// ─── Limits (validated, not configurable per-call) ────────────────────────────

/** Request-id: 8–128 chars, alnum start, then alnum . _ : - */
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

/** Hard ceiling on serialized input size (bytes of UTF-16 code units). */
export const MAX_INPUT_BYTES = 512_000;

/** Global ceiling on any policy's vendor cash cap (USD). */
export const MAX_VENDOR_CASH_USD_CEILING = 1_000;

/** Max retention horizon a policy may declare. */
export const MAX_RETENTION_TTL_DAYS = 730;

/** Budget-scope template: lowercase segments, optional {placeholder} parts. */
const BUDGET_SCOPE_PATTERN =
  /^[a-z][a-z0-9-]*(?::(?:[a-z0-9-]+|\{[a-zA-Z][a-zA-Z0-9]*\}))+$/;

/** Policy versions: "unversioned" (non-production only) or date.rev format. */
const POLICY_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}\.\d+$/;

// ─── Secret-material heuristic (§8.4: cheap scan, fail closed) ────────────────

interface SecretPattern {
  readonly id: string;
  readonly rx: RegExp;
}

/**
 * Cheap, high-precision credential heuristics. Deliberately biased toward
 * well-known unambiguous prefixes/formats so operational text ("the token
 * refreshed") never false-positives, while real leaked material is caught.
 */
const SECRET_PATTERNS: readonly SecretPattern[] = [
  { id: "pem-private-key", rx: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: "aws-access-key-id", rx: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "anthropic-api-key", rx: /\bsk-ant-[A-Za-z0-9_-]{10,}/ },
  { id: "stripe-secret-key", rx: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { id: "github-token", rx: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { id: "github-fine-grained-pat", rx: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { id: "slack-token", rx: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  {
    id: "jwt",
    rx: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  { id: "bearer-token", rx: /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}/i },
  {
    id: "credential-assignment",
    rx: /\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret|password|passwd)\s*[:=]\s*["']?[^\s"']{12,}/i,
  },
  { id: "postgres-url-with-password", rx: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/i },
];

/**
 * Returns the id of the first secret-material pattern found in `text`, or
 * null when the text looks clean. A heuristic, not a proof — its job is to
 * fail closed on the obvious catastrophic cases (§8.4 "no secret/credential
 * material"), not to certify absence.
 */
export function scanForSecretMaterial(text: string): string | null {
  for (const { id, rx } of SECRET_PATTERNS) {
    if (rx.test(text)) return id;
  }
  return null;
}

// ─── Payment-card detection (§8.5: card data NEVER transits the plane) ────────

/** Luhn checksum over a digits-only string. */
function luhnValid(digits: string): boolean {
  let sum = 0;
  let doubleIt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (doubleIt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    doubleIt = !doubleIt;
  }
  return sum % 10 === 0;
}

/** Candidate PAN runs: 13–19 digits allowing single space/dash separators. */
const CARD_CANDIDATE_RX = /(?<![\d.])(?:\d[ -]?){12,18}\d(?![\d.])/g;

/**
 * True when `text` contains a payment-card-like number: a 13–19 digit run
 * (separators allowed) that starts with a plausible major-industry digit
 * (2–6) AND passes the Luhn checksum. Both conditions are required so
 * timestamps, ids, and phone numbers do not false-positive.
 */
export function containsPaymentCardLikeNumber(text: string): boolean {
  const matches = text.match(CARD_CANDIDATE_RX);
  if (!matches) return false;
  for (const candidate of matches) {
    const digits = candidate.replace(/[ -]/g, "");
    if (digits.length < 13 || digits.length > 19) continue;
    const first = digits.charCodeAt(0) - 48;
    if (first < 2 || first > 6) continue;
    if (luhnValid(digits)) return true;
  }
  return false;
}

// ─── Data policy (§8.5) ───────────────────────────────────────────────────────

/**
 * Validates the composable data-policy tag set. `errorCtor` lets the registry
 * fail as ConfigurationError (owner bug) while request-time misuse would be
 * InvalidInput; default is ConfigurationError because DataPolicy only lives
 * on registry policies today.
 */
export function validateDataPolicy(
  dataPolicy: DataPolicy,
  fail: (msg: string) => never = failConfiguration,
): void {
  const { tags } = dataPolicy;
  if (!Array.isArray(tags) || tags.length === 0) {
    fail("dataPolicy.tags must be a non-empty array of tags");
  }
  const seen = new Set<string>();
  for (const tag of tags) {
    if (!ALL_DATA_TAGS.has(tag)) {
      fail(`dataPolicy.tags contains unknown tag "${String(tag)}"`);
    }
    if (seen.has(tag)) fail(`dataPolicy.tags contains duplicate tag "${tag}"`);
    seen.add(tag);
  }
  const baseTags = tags.filter((t) => BASE_DATA_TAGS.has(t));
  if (baseTags.length !== 1) {
    fail(
      `dataPolicy.tags must contain exactly one base sensitivity tag ` +
        `(public | internal | user-private); found [${baseTags.join(", ")}]`,
    );
  }
  if (baseTags[0] === "public") {
    const contradictions = tags.filter((t) => PUBLIC_CONTRADICTIONS.has(t));
    if (contradictions.length > 0) {
      fail(
        `dataPolicy.tags "public" contradicts [${contradictions.join(", ")}] — ` +
          `public data cannot simultaneously be pii/regulated/payment-adjacent`,
      );
    }
  }
}

// ─── Retention consistency ────────────────────────────────────────────────────

export function validateRetentionPolicy(
  retention: RetentionPolicy,
  fail: (msg: string) => never,
): void {
  const retains = retention.retainPrompt || retention.retainResponse;
  if (retains) {
    if (
      retention.ttlDays === undefined ||
      !Number.isInteger(retention.ttlDays) ||
      retention.ttlDays < 1 ||
      retention.ttlDays > MAX_RETENTION_TTL_DAYS
    ) {
      fail(
        `retention that retains prompt/response requires an integer ttlDays ` +
          `in [1, ${MAX_RETENTION_TTL_DAYS}]; got ${String(retention.ttlDays)}`,
      );
    }
  } else if (retention.ttlDays !== undefined) {
    fail(
      "retention.ttlDays is set but nothing is retained — inconsistent policy",
    );
  }
}

// ─── Policy definition (registry-load validation; §8.4 "malformed policy fails build/startup") ──

function failConfiguration(msg: string): never {
  throw new ConfigurationError(`AiTaskPolicyDefinition invalid: ${msg}`);
}

/**
 * Structural validation of one owner policy. Called by the registry at module
 * load: a malformed policy therefore fails startup (and any build/test that
 * imports the registry), never lurking until a request arrives.
 */
export function validatePolicyDefinition(policy: AiTaskPolicyDefinition): void {
  const fail = (msg: string): never =>
    failConfiguration(`[${String(policy.taskClass)}] ${msg}`);

  // Provider routes: non-empty, known, unique.
  if (
    !Array.isArray(policy.permittedProviderRoutes) ||
    policy.permittedProviderRoutes.length === 0
  ) {
    fail("permittedProviderRoutes must be a non-empty array");
  }
  assertKnownUnique(
    policy.permittedProviderRoutes,
    PROVIDER_ROUTE_IDS,
    "permittedProviderRoutes",
    fail,
  );

  // Cost modes: non-empty, known, unique.
  if (
    !Array.isArray(policy.permittedModes) ||
    policy.permittedModes.length === 0
  ) {
    fail("permittedModes must be a non-empty array");
  }
  assertKnownUnique(policy.permittedModes, COST_MODES, "permittedModes", fail);

  // Cash cap: finite, ≥ 0, ≤ ceiling, ≤ 6 decimal places.
  validateUsdAmount(policy.maxVendorCashUsd, "maxVendorCashUsd", fail);

  // Budget scope templates.
  if (!Array.isArray(policy.requiredBudgetScopes)) {
    fail("requiredBudgetScopes must be an array");
  }
  for (const scope of policy.requiredBudgetScopes) {
    if (typeof scope !== "string" || !BUDGET_SCOPE_PATTERN.test(scope)) {
      fail(
        `requiredBudgetScopes contains malformed template "${String(scope)}"`,
      );
    }
  }

  // Substitutions: unique ids, known providers, sane capability matrices.
  if (!Array.isArray(policy.approvedSubstitutions)) {
    fail("approvedSubstitutions must be an array (empty = never substitute)");
  }
  const subIds = new Set<string>();
  for (const sub of policy.approvedSubstitutions) {
    if (typeof sub.id !== "string" || sub.id.trim() === "") {
      fail("approvedSubstitutions entry has an empty id");
    }
    if (subIds.has(sub.id)) {
      fail(`approvedSubstitutions has duplicate id "${sub.id}"`);
    }
    subIds.add(sub.id);
    if (!PROVIDER_ROUTE_IDS.has(sub.provider)) {
      fail(
        `approvedSubstitutions "${sub.id}" names unknown provider route ` +
          `"${String(sub.provider)}"`,
      );
    }
    if (sub.fromModelId.trim() === "" || sub.toModelId.trim() === "") {
      fail(`approvedSubstitutions "${sub.id}" has empty model ids`);
    }
    validateCapabilityFloorShape(sub.capabilities, `substitution "${sub.id}"`, fail);
  }

  // Capability floor.
  validateCapabilityFloorShape(policy.capabilityFloor, "capabilityFloor", fail);

  // Validation policy: schema reference required (§8.4 "schema reference").
  if (
    typeof policy.validationPolicy?.schemaRef !== "string" ||
    policy.validationPolicy.schemaRef.trim() === ""
  ) {
    fail("validationPolicy.schemaRef must be a non-empty registered name");
  }
  if (typeof policy.validationPolicy.numericGuard !== "boolean") {
    fail("validationPolicy.numericGuard must be a boolean");
  }

  // Retention consistency + TTL (§8.4).
  validateRetentionPolicy(policy.retentionPolicy, fail);

  // Data policy tags (§8.5).
  validateDataPolicy(policy.dataPolicy, fail);

  // Policy version: "unversioned" or date.rev. (Production additionally
  // rejects "unversioned" at runtime — assertPolicyVersionAllowed.)
  if (
    policy.policyVersion !== "unversioned" &&
    !POLICY_VERSION_PATTERN.test(policy.policyVersion)
  ) {
    fail(
      `policyVersion "${policy.policyVersion}" must be "unversioned" ` +
        `(non-production only) or match YYYY-MM-DD.rev`,
    );
  }
}

function validateCapabilityFloorShape(
  floor: AiTaskPolicyDefinition["capabilityFloor"],
  label: string,
  fail: (msg: string) => never,
): void {
  const tiers = new Set(["fast", "standard", "deep"]);
  const latencies = new Set(["interactive", "batch", "background"]);
  if (typeof floor !== "object" || floor === null) {
    fail(`${label} must be a capability-floor object`);
  }
  if (!tiers.has(floor.reasoningTier)) {
    fail(`${label}.reasoningTier must be fast | standard | deep`);
  }
  if (
    !Number.isInteger(floor.contextTokens) ||
    floor.contextTokens < 1_000 ||
    floor.contextTokens > 2_000_000
  ) {
    fail(`${label}.contextTokens must be an integer in [1000, 2000000]`);
  }
  if (typeof floor.structuredOutput !== "boolean") {
    fail(`${label}.structuredOutput must be a boolean`);
  }
  if (typeof floor.toolUse !== "boolean") {
    fail(`${label}.toolUse must be a boolean`);
  }
  if (!latencies.has(floor.latencyClass)) {
    fail(`${label}.latencyClass must be interactive | batch | background`);
  }
}

/**
 * USD amount validation: finite, ≥ 0, ≤ the global ceiling, and at most 6
 * decimal places (micro-USD precision).
 *
 * The decimal-place check is a ROUND-TRIP comparison, not an exact float
 * compare. `value * 1e6 === Math.round(value * 1e6)` is wrong in IEEE-754:
 * e.g. `2.01 * 1e6 === 2010000.0000000002`, so thousands of ordinary cent
 * amounts would be spuriously rejected. Instead we round to integer micro-USD
 * and check the quotient reproduces `value` exactly: that holds precisely
 * when `value` is the double nearest some ≤6-decimal-place amount (the
 * division is correctly rounded, so `n / 1e6` IS that nearest double), and
 * fails for any amount needing more than 6 decimal places.
 *
 * Exported for tests (the cent-sweep regression test); NOT re-exported by the
 * public index.
 */
export function validateUsdAmount(
  value: number,
  label: string,
  fail: (msg: string) => never,
): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail(`${label} must be a finite number ≥ 0`);
  }
  if (value > MAX_VENDOR_CASH_USD_CEILING) {
    fail(`${label} exceeds the global ceiling of ${MAX_VENDOR_CASH_USD_CEILING} USD`);
  }
  // At most 6 decimal places (micro-USD precision), via exact round-trip.
  const microUsd = Math.round(value * 1e6);
  if (microUsd / 1e6 !== value) {
    fail(`${label} has more than 6 decimal places`);
  }
}

function assertKnownUnique<T extends string>(
  values: readonly T[],
  known: ReadonlySet<T>,
  label: string,
  fail: (msg: string) => never,
): void {
  const seen = new Set<string>();
  for (const v of values) {
    if (!known.has(v)) fail(`${label} contains unknown id "${String(v)}"`);
    if (seen.has(v)) fail(`${label} contains duplicate "${v}"`);
    seen.add(v);
  }
}

// ─── Policy version gate (§8.4) ───────────────────────────────────────────────

/**
 * Production may NOT execute a policy whose version is "unversioned". Every
 * other env class may (it exists so tests/dev can exercise draft policies).
 */
export function assertPolicyVersionAllowed(
  policyVersion: string,
  envClass: AiEnvClass,
): void {
  if (typeof policyVersion !== "string" || policyVersion.trim() === "") {
    throw new ConfigurationError("policyVersion must be a non-empty string.");
  }
  if (envClass === "production" && policyVersion === "unversioned") {
    throw new ConfigurationError(
      'Production may not execute a task policy with policyVersion "unversioned" ' +
        "(§8.4). Register a dated version before enabling this task class.",
    );
  }
}

// ─── Invocation request validation (§8.4) ─────────────────────────────────────

function failInput(msg: string): never {
  throw new InvalidInput(`AiTaskInvocationRequest invalid: ${msg}`);
}

/** Structural TrustedActor check at the control-plane boundary. */
function validateActor(actor: TrustedActor): void {
  if (typeof actor !== "object" || actor === null) {
    failInput("actor must be a TrustedActor produced by @/lib/auth/actor");
  }
  if (!ACTOR_TYPES.has(actor.actorType)) {
    failInput(`actor.actorType "${String(actor.actorType)}" is not a known actor type`);
  }
  if (typeof actor.subjectId !== "string" || actor.subjectId.trim() === "") {
    failInput("actor.subjectId must be a non-empty stable identifier");
  }
  if (typeof actor.policyVersion !== "string" || actor.policyVersion.trim() === "") {
    failInput("actor.policyVersion must be a non-empty string");
  }
}

/**
 * Full §8.4 validation of a caller invocation request. Registry resolution
 * (registered task class) happens in the executor BEFORE this runs; this
 * function validates everything else about the request itself.
 *
 * Throws `InvalidInput` on malformed requests, including any request whose
 * serialized input carries secret material or a payment-card-like number.
 */
export function validateInvocationRequest(
  request: AiTaskInvocationRequest,
): void {
  // Request id format/length.
  if (typeof request.requestId !== "string" || !REQUEST_ID_PATTERN.test(request.requestId)) {
    failInput(
      "requestId must be 8–128 chars of [A-Za-z0-9._:-] starting alphanumeric",
    );
  }

  // Actor authority is structural here; authorization decisions belong to the
  // executor/policy layer.
  validateActor(request.actor);

  // Entity.
  if (!ENTITIES.has(request.entity)) {
    failInput(`entity "${String(request.entity)}" is not a known entity`);
  }

  // Input: present, JSON-serializable, bounded, and free of secret/card material.
  if (request.input === undefined) {
    failInput("input is required (use null for an intentionally empty input)");
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(request.input) ?? "null";
  } catch {
    failInput("input must be JSON-serializable (no cycles/bigints)");
  }
  if (serialized.length > MAX_INPUT_BYTES) {
    failInput(
      `input serializes to ${serialized.length} chars, exceeding the ` +
        `${MAX_INPUT_BYTES} limit`,
    );
  }
  const secretHit = scanForSecretMaterial(serialized);
  if (secretHit !== null) {
    failInput(
      `input appears to contain secret/credential material (pattern: ${secretHit}); ` +
        "secrets must never transit the AI control plane",
    );
  }
  if (containsPaymentCardLikeNumber(serialized)) {
    failInput(
      "input contains a payment-card-like number; card data is prohibited " +
        "from the AI control plane (§8.5)",
    );
  }

  // Correlation hints: shallow string checks only (never authority-bearing).
  if (request.correlation !== undefined) {
    const { traceId, parentRequestId, runId, source } = request.correlation;
    for (const [label, v] of [
      ["traceId", traceId],
      ["parentRequestId", parentRequestId],
      ["runId", runId],
      ["source", source],
    ] as const) {
      if (v !== undefined && (typeof v !== "string" || v.length === 0 || v.length > 256)) {
        failInput(`correlation.${label} must be a non-empty string ≤ 256 chars`);
      }
    }
  }
}

// ─── Authority narrowing (§8.1: less authority OK, more NEVER) ────────────────

function failEscalation(msg: string): never {
  throw new PolicyBlocked(`Authority escalation rejected: ${msg}`);
}

/**
 * Applies caller narrowing to the registry policy and returns the effective
 * authority. Narrowing may only SHRINK authority; any attempt to widen it —
 * a route/mode/substitution the policy does not grant, a higher cash cap, or
 * retention the policy did not enable — throws `PolicyBlocked`.
 */
export function resolveEffectiveAuthority(
  policy: AiTaskPolicyDefinition,
  narrowing: AiAuthorityNarrowing | undefined,
): EffectiveAuthority {
  const base: EffectiveAuthority = {
    taskClass: policy.taskClass,
    surface: policy.surface,
    dataPolicy: policy.dataPolicy,
    capabilityFloor: policy.capabilityFloor,
    permittedProviderRoutes: policy.permittedProviderRoutes,
    permittedModes: policy.permittedModes,
    maxVendorCashUsd: policy.maxVendorCashUsd,
    requiredBudgetScopes: policy.requiredBudgetScopes,
    approvedSubstitutions: policy.approvedSubstitutions,
    validationPolicy: policy.validationPolicy,
    retentionPolicy: policy.retentionPolicy,
    policyVersion: policy.policyVersion,
  };
  if (narrowing === undefined) return base;

  let routes = base.permittedProviderRoutes;
  if (narrowing.permittedProviderRoutes !== undefined) {
    const requested = narrowing.permittedProviderRoutes;
    if (!Array.isArray(requested) || requested.length === 0) {
      failInput("narrowing.permittedProviderRoutes must be a non-empty array");
    }
    for (const r of requested) {
      if (!PROVIDER_ROUTE_IDS.has(r)) {
        failInput(`narrowing.permittedProviderRoutes has unknown route "${String(r)}"`);
      }
      if (!policy.permittedProviderRoutes.includes(r)) {
        failEscalation(
          `provider route "${r}" is not granted to task class ` +
            `"${policy.taskClass}" by policy ${policy.policyVersion}`,
        );
      }
    }
    routes = dedupe(requested);
  }

  let modes = base.permittedModes;
  if (narrowing.permittedModes !== undefined) {
    const requested = narrowing.permittedModes;
    if (!Array.isArray(requested) || requested.length === 0) {
      failInput("narrowing.permittedModes must be a non-empty array");
    }
    for (const m of requested) {
      if (!COST_MODES.has(m)) {
        failInput(`narrowing.permittedModes has unknown mode "${String(m)}"`);
      }
      if (!policy.permittedModes.includes(m)) {
        failEscalation(
          `cost mode "${m}" is not granted to task class ` +
            `"${policy.taskClass}" by policy ${policy.policyVersion}`,
        );
      }
    }
    modes = dedupe(requested);
  }

  let cashCap = base.maxVendorCashUsd;
  if (narrowing.maxVendorCashUsd !== undefined) {
    validateUsdAmount(narrowing.maxVendorCashUsd, "narrowing.maxVendorCashUsd", failInput);
    if (narrowing.maxVendorCashUsd > policy.maxVendorCashUsd) {
      failEscalation(
        `narrowed cash cap ${narrowing.maxVendorCashUsd} exceeds the policy ` +
          `cap ${policy.maxVendorCashUsd} for task class "${policy.taskClass}"`,
      );
    }
    cashCap = narrowing.maxVendorCashUsd;
  }

  let substitutions = base.approvedSubstitutions;
  if (narrowing.approvedSubstitutionIds !== undefined) {
    const requested = narrowing.approvedSubstitutionIds;
    if (!Array.isArray(requested)) {
      failInput("narrowing.approvedSubstitutionIds must be an array");
    }
    const grantedIds = new Set(policy.approvedSubstitutions.map((s) => s.id));
    for (const id of requested) {
      if (typeof id !== "string" || id.trim() === "") {
        failInput("narrowing.approvedSubstitutionIds contains an empty id");
      }
      if (!grantedIds.has(id)) {
        failEscalation(
          `substitution "${id}" is not approved for task class ` +
            `"${policy.taskClass}" by policy ${policy.policyVersion}`,
        );
      }
    }
    const keep = new Set(requested);
    substitutions = policy.approvedSubstitutions.filter((s) => keep.has(s.id));
  }

  let retention = base.retentionPolicy;
  if (narrowing.retention !== undefined) {
    const r = narrowing.retention;
    // May only turn retention OFF or shorten TTL — never enable or extend.
    if (r.retainPrompt && !policy.retentionPolicy.retainPrompt) {
      failEscalation(
        `retention of the prompt is not granted to task class "${policy.taskClass}"`,
      );
    }
    if (r.retainResponse && !policy.retentionPolicy.retainResponse) {
      failEscalation(
        `retention of the response is not granted to task class "${policy.taskClass}"`,
      );
    }
    if (r.ttlDays !== undefined) {
      const policyTtl = policy.retentionPolicy.ttlDays;
      if (policyTtl === undefined || r.ttlDays > policyTtl) {
        failEscalation(
          `narrowed retention ttlDays ${r.ttlDays} exceeds the policy TTL ` +
            `${String(policyTtl)} for task class "${policy.taskClass}"`,
        );
      }
    }
    validateRetentionPolicy(r, failInput);
    retention = r;
  }

  return {
    ...base,
    permittedProviderRoutes: routes,
    permittedModes: modes,
    maxVendorCashUsd: cashCap,
    approvedSubstitutions: substitutions,
    retentionPolicy: retention,
  };
}

function dedupe<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}
