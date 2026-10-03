export type ApiV1LiveRoutePromotionStatus =
  | "blocked_by_repo_boundary"
  | "blocked_by_owner_gates"
  | "ready_for_owner_route_review";

export type ApiV1LiveRoutePromotionGateStatus = "pass" | "blocked";

export type ApiV1LiveRoutePromotionGateId =
  | "owner-approval-recorded"
  | "durable-persistence-reviewed"
  | "route-exposure-approved"
  | "abuse-response-reviewed"
  | "payload-envelope-consumed"
  | "openapi-security-reviewed"
  | "rate-limit-policy-reviewed"
  | "rollback-plan-reviewed"
  | "boundary-exception-reviewed"
  | "raw-key-absence-reviewed";

export interface ApiV1LiveRoutePromotionEvidence {
  readonly ownerApprovalRecorded: boolean;
  readonly durablePersistenceReviewed: boolean;
  readonly routeExposureApproved: boolean;
  readonly abuseResponseReviewed: boolean;
  readonly payloadEnvelopeReviewed: boolean;
  readonly openApiSecurityReviewed: boolean;
  readonly rateLimitPolicyReviewed: boolean;
  readonly rollbackPlanReviewed: boolean;
  readonly boundaryExceptionReviewed: boolean;
  readonly rawKeyAbsenceReviewed: boolean;
}

export interface ApiV1LiveRoutePromotionInspection {
  readonly routeTreeAbsent?: boolean;
  readonly boundaryViolations?: readonly string[];
  readonly candidateRouteSourceText?: string;
}

export interface ApiV1LiveRoutePromotionGate {
  readonly id: ApiV1LiveRoutePromotionGateId;
  readonly status: ApiV1LiveRoutePromotionGateStatus;
  readonly category: "owner_approval" | "route_contract" | "repo_boundary";
  readonly evidence: string;
  readonly blocker?: string;
}

export interface ApiV1LiveRoutePromotionIntent {
  readonly id:
    | "record-owner-decision"
    | "review-durable-persistence"
    | "review-route-exposure"
    | "verify-payload-envelope"
    | "review-abuse-response"
    | "review-openapi-security"
    | "review-rate-limit-policy"
    | "capture-rollback-plan";
  readonly executableNow: false;
  readonly purpose: string;
  readonly requiredEvidence: readonly string[];
  readonly forbiddenTargets: readonly string[];
}

export interface ApiV1LiveRoutePromotionPacket {
  readonly schemaVersion: "api-v1-live-route-promotion-packet-v1";
  readonly status: ApiV1LiveRoutePromotionStatus;
  readonly liveRouteCreationAllowed: false;
  readonly commandsExecutableNow: false;
  readonly gates: readonly ApiV1LiveRoutePromotionGate[];
  readonly blockers: readonly string[];
  readonly nextActions: readonly string[];
  readonly intents: readonly ApiV1LiveRoutePromotionIntent[];
}

const DEFAULT_EVIDENCE: ApiV1LiveRoutePromotionEvidence = {
  abuseResponseReviewed: false,
  boundaryExceptionReviewed: false,
  durablePersistenceReviewed: false,
  openApiSecurityReviewed: false,
  ownerApprovalRecorded: false,
  payloadEnvelopeReviewed: false,
  rateLimitPolicyReviewed: false,
  rawKeyAbsenceReviewed: false,
  rollbackPlanReviewed: false,
  routeExposureApproved: false,
};

const FORBIDDEN_TARGETS = [
  "production database",
  "shared staging database",
  "raw API key material",
  "provider account",
  "billing path",
  "partner onboarding path",
  "live cloud resource",
  "unreviewed route tree",
] as const;

function gate(input: {
  readonly id: ApiV1LiveRoutePromotionGateId;
  readonly category: ApiV1LiveRoutePromotionGate["category"];
  readonly passed: boolean;
  readonly evidence: string;
  readonly blocker: string;
}): ApiV1LiveRoutePromotionGate {
  return input.passed
    ? {
        category: input.category,
        evidence: input.evidence,
        id: input.id,
        status: "pass",
      }
    : {
        blocker: input.blocker,
        category: input.category,
        evidence: input.evidence,
        id: input.id,
        status: "blocked",
      };
}

function hasPayloadEnvelopeReference(sourceText: string | undefined): boolean {
  if (sourceText === undefined) return false;
  return (
    sourceText.includes("filterApiV1MetricPayloadFields") ||
    sourceText.includes("filterProprietaryMetricPayloadEnvelope")
  );
}

function statusFor(input: {
  readonly gates: readonly ApiV1LiveRoutePromotionGate[];
  readonly hasRepoBoundaryViolation: boolean;
}): ApiV1LiveRoutePromotionStatus {
  if (input.hasRepoBoundaryViolation) return "blocked_by_repo_boundary";
  const blocked = input.gates.filter((entry) => entry.status === "blocked");
  if (blocked.length > 0) return "blocked_by_owner_gates";
  return "ready_for_owner_route_review";
}

function nextActionsFor(status: ApiV1LiveRoutePromotionStatus): readonly string[] {
  if (status === "blocked_by_repo_boundary") {
    return ["Remove or isolate live API v1 route surfaces before any owner route review continues."];
  }
  if (status === "blocked_by_owner_gates") {
    return ["Record owner-reviewed route promotion evidence before route implementation is discussed."];
  }
  return [
    "Attach this packet to an owner-reviewed route implementation ticket; this packet still does not create or approve a live route.",
  ];
}

function intent(input: {
  readonly id: ApiV1LiveRoutePromotionIntent["id"];
  readonly purpose: string;
  readonly requiredEvidence: readonly string[];
}): ApiV1LiveRoutePromotionIntent {
  return {
    executableNow: false,
    forbiddenTargets: FORBIDDEN_TARGETS,
    id: input.id,
    purpose: input.purpose,
    requiredEvidence: input.requiredEvidence,
  };
}

function intents(): readonly ApiV1LiveRoutePromotionIntent[] {
  return [
    intent({
      id: "record-owner-decision",
      purpose: "Record explicit owner approval for reviewing a live route implementation ticket.",
      requiredEvidence: ["owner decision record", "route surface list", "rollback owner"],
    }),
    intent({
      id: "review-durable-persistence",
      purpose: "Review durable persistence behavior before route exposure.",
      requiredEvidence: ["durable adapter report", "quota debit proof", "audit ledger proof"],
    }),
    intent({
      id: "review-route-exposure",
      purpose: "Review exact route exposure and boundary exception before any route tree exists.",
      requiredEvidence: ["route path list", "scope map", "boundary exception note"],
    }),
    intent({
      id: "verify-payload-envelope",
      purpose: "Verify metric payloads call the proprietary payload-envelope filter before response construction.",
      requiredEvidence: ["payload-envelope source reference", "blocked protected-field fixture", "raw-provider exclusion proof"],
    }),
    intent({
      id: "review-abuse-response",
      purpose: "Review malformed auth, overscope, replay, rate-limit, and unsafe payload denial behavior.",
      requiredEvidence: ["abuse-response test output", "no payload leakage proof", "quota no-debit proof"],
    }),
    intent({
      id: "review-openapi-security",
      purpose: "Review OpenAPI auth, scopes, request ID, response envelope, and webhook security.",
      requiredEvidence: ["OpenAPI contract diff", "security scanner output", "scope coverage table"],
    }),
    intent({
      id: "review-rate-limit-policy",
      purpose: "Review rate-limit policy, quota windows, and replay behavior before external exposure.",
      requiredEvidence: ["rate-limit policy", "idempotency replay proof", "usage event proof"],
    }),
    intent({
      id: "capture-rollback-plan",
      purpose: "Capture rollback plan and disable switch before any route exposure.",
      requiredEvidence: ["rollback checklist", "disable procedure", "post-rollback verification list"],
    }),
  ];
}

export function buildApiV1LiveRoutePromotionPacket(input: {
  readonly evidence?: Partial<ApiV1LiveRoutePromotionEvidence>;
  readonly inspection?: ApiV1LiveRoutePromotionInspection;
} = {}): ApiV1LiveRoutePromotionPacket {
  const evidence = { ...DEFAULT_EVIDENCE, ...input.evidence };
  const inspection = input.inspection ?? {};
  const routeTreeAbsent = inspection.routeTreeAbsent ?? true;
  const boundaryViolations = inspection.boundaryViolations ?? [];
  const hasRepoBoundaryViolation = !routeTreeAbsent || boundaryViolations.length > 0;
  const payloadEnvelopeReferenced = hasPayloadEnvelopeReference(inspection.candidateRouteSourceText);

  const gates: readonly ApiV1LiveRoutePromotionGate[] = [
    gate({
      blocker: "Owner route promotion approval is missing.",
      category: "owner_approval",
      evidence: `ownerApprovalRecorded=${String(evidence.ownerApprovalRecorded)}.`,
      id: "owner-approval-recorded",
      passed: evidence.ownerApprovalRecorded,
    }),
    gate({
      blocker: "Durable persistence review is missing.",
      category: "route_contract",
      evidence: `durablePersistenceReviewed=${String(evidence.durablePersistenceReviewed)}.`,
      id: "durable-persistence-reviewed",
      passed: evidence.durablePersistenceReviewed,
    }),
    gate({
      blocker: "Route exposure approval is missing.",
      category: "owner_approval",
      evidence: `routeExposureApproved=${String(evidence.routeExposureApproved)}.`,
      id: "route-exposure-approved",
      passed: evidence.routeExposureApproved,
    }),
    gate({
      blocker: "Abuse-response review is missing.",
      category: "route_contract",
      evidence: `abuseResponseReviewed=${String(evidence.abuseResponseReviewed)}.`,
      id: "abuse-response-reviewed",
      passed: evidence.abuseResponseReviewed,
    }),
    gate({
      blocker: "Metric payload-envelope consumption is missing from the route candidate.",
      category: "route_contract",
      evidence: `payloadEnvelopeReviewed=${String(evidence.payloadEnvelopeReviewed)}; payloadEnvelopeReferenced=${String(
        payloadEnvelopeReferenced,
      )}.`,
      id: "payload-envelope-consumed",
      passed: evidence.payloadEnvelopeReviewed && payloadEnvelopeReferenced,
    }),
    gate({
      blocker: "OpenAPI/security review is missing.",
      category: "route_contract",
      evidence: `openApiSecurityReviewed=${String(evidence.openApiSecurityReviewed)}.`,
      id: "openapi-security-reviewed",
      passed: evidence.openApiSecurityReviewed,
    }),
    gate({
      blocker: "Rate-limit policy review is missing.",
      category: "route_contract",
      evidence: `rateLimitPolicyReviewed=${String(evidence.rateLimitPolicyReviewed)}.`,
      id: "rate-limit-policy-reviewed",
      passed: evidence.rateLimitPolicyReviewed,
    }),
    gate({
      blocker: "Rollback plan review is missing.",
      category: "route_contract",
      evidence: `rollbackPlanReviewed=${String(evidence.rollbackPlanReviewed)}.`,
      id: "rollback-plan-reviewed",
      passed: evidence.rollbackPlanReviewed,
    }),
    gate({
      blocker: "API v1 boundary exception review is missing or current boundary violations exist.",
      category: "repo_boundary",
      evidence: `boundaryExceptionReviewed=${String(evidence.boundaryExceptionReviewed)}; routeTreeAbsent=${String(
        routeTreeAbsent,
      )}; boundaryViolationCount=${boundaryViolations.length}.`,
      id: "boundary-exception-reviewed",
      passed: evidence.boundaryExceptionReviewed && routeTreeAbsent && boundaryViolations.length === 0,
    }),
    gate({
      blocker: "Raw-key absence review is missing.",
      category: "route_contract",
      evidence: `rawKeyAbsenceReviewed=${String(evidence.rawKeyAbsenceReviewed)}.`,
      id: "raw-key-absence-reviewed",
      passed: evidence.rawKeyAbsenceReviewed,
    }),
  ];
  const status = statusFor({ gates, hasRepoBoundaryViolation });
  const blockers = gates.flatMap((entry) =>
    entry.status === "blocked" && entry.blocker !== undefined ? [entry.blocker] : [],
  );

  return {
    blockers,
    commandsExecutableNow: false,
    gates,
    intents: intents(),
    liveRouteCreationAllowed: false,
    nextActions: nextActionsFor(status),
    schemaVersion: "api-v1-live-route-promotion-packet-v1",
    status,
  };
}
