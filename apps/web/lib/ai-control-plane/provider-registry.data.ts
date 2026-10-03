/**
 * E0 -- Canonical provider/model registry (DORMANT).
 *
 * STATUS: IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED. No production code path
 * imports this module yet. It is the canonical DATA source that later units
 * (E1 exact adapters, E3 shadow adapters, the sealed control-plane executor)
 * will consume; activation is owner-gated (directive section 13, E4).
 *
 * WHAT THIS REGISTRY IS:
 *   - The single authoritative list of provider ROUTE IDENTIFIERS the codebase
 *     may reason about, with account/region env-key shape, economic class,
 *     data/privacy capability tags, and the model capability matrix.
 *   - A pricing VERSION POINTER (a versioned label naming the vendored
 *     snapshot), never live dollar truth.
 *   - The structure (empty until owner approval) for model substitutions and
 *     the NOVA change-feed review packet that governs registry changes.
 *
 * WHAT THIS REGISTRY IS NOT (transport-boundary consistency):
 *   - It stores NO endpoint URLs, NO SDK imports, and NO credentials. Raw
 *     transport reachability stays confined to the adapter allowlist enforced
 *     by scripts/guardrails/ai-transport-import-boundary.mjs (PR #158 branch).
 *     Routes here are IDENTIFIERS; the mapping from identifier to wire call
 *     lives only in guard-allowlisted adapter files.
 *
 * NO FABRICATED DATA:
 *   - Model ids are only those the repository actually routes today
 *     (apps/web/lib/claude-api/model-router.ts, providers/cerebras.ts).
 *   - Values that cannot be verified from the repository (context windows,
 *     live pricing, credit coverage of Bedrock/Vertex accounts) are stored as
 *     null and/or tagged REVIEW_REQUIRED instead of being invented. They are
 *     populated only through an owner-reviewed change packet.
 */

/* ------------------------------------------------------------------ */
/* Route + classification vocabulary                                   */
/* ------------------------------------------------------------------ */

/** Exact provider routes. Route ids are identifiers, never URLs. */
export const PROVIDER_ROUTE_IDS = [
  "anthropic-direct",
  "bedrock",
  "vertex",
  "cerebras",
  "local-none",
] as const;

export type ProviderRouteId = (typeof PROVIDER_ROUTE_IDS)[number];

/**
 * Economic class of spend on a route.
 * "confirmed-credits" may ONLY be assigned via an owner-approved change packet
 * that records the confirmation evidence; it is never a default.
 */
export type EconomicClass =
  | "billable-cash"
  | "confirmed-credits"
  | "free-lane"
  | "local";

/** Whether a stored value is verified from the repository or needs review. */
export type ReviewStatus = "VERIFIED_IN_REPO" | "REVIEW_REQUIRED";

/**
 * Data/privacy capability tags. Structural facts about where request content
 * can travel on a route; they make no vendor-policy claims.
 */
export type DataPrivacyTag =
  | "prompt-leaves-infrastructure" // request content is sent to an external party
  | "prompt-stays-local" // request content never leaves operator infrastructure
  | "region-pinnable" // operator can pin the serving region via env
  | "operator-supplied-credentials" // credentials come only from operator env
  | "content-tier-6-only"; // repo doctrine: output restricted to content lane

export type ModelModality = "text-in/text-out";

export type ModelDeprecationState = "active" | "deprecated" | "retired";

/* ------------------------------------------------------------------ */
/* Model capability matrix                                             */
/* ------------------------------------------------------------------ */

export interface ModelCapability {
  /** Canonical model id as used by repository call sites. */
  readonly modelId: string;
  /** Routes able to serve this model (per current adapter reality). */
  readonly routeIds: readonly ProviderRouteId[];
  /**
   * Context window in tokens. null = not verified from the repository; the
   * value is populated only via an owner-reviewed change packet, never guessed.
   */
  readonly contextWindowTokens: number | null;
  readonly contextWindowStatus: ReviewStatus;
  /** The only modality the current transport layer supports. */
  readonly modality: ModelModality;
  readonly deprecationState: ModelDeprecationState;
  readonly notes: string;
}

/* ------------------------------------------------------------------ */
/* Provider routes                                                     */
/* ------------------------------------------------------------------ */

/** How a route learns which provider-side model id to use. */
export type RouteModelIdSource =
  | "registry-static" // ids in this registry are the wire ids
  | "env-mapped" // operator supplies an id map via env (no guessed defaults)
  | "env-configured"; // the whole model choice comes from operator env

export interface ProviderRouteAccountShape {
  /** Env keys holding credentials for this route (names only, never values). */
  readonly credentialEnvKeys: readonly string[];
  /** Env keys selecting account/region scope. */
  readonly regionEnvKeys: readonly string[];
  readonly accountScopeNote: string;
}

export interface ProviderRoute {
  readonly routeId: ProviderRouteId;
  readonly displayName: string;
  /**
   * The ONLY repository module allowed to turn this route id into a wire call
   * (must stay a subset of the transport-boundary guard allowlist).
   */
  readonly transportOwnerModule: string;
  /** How the route is selected at runtime today (env facts, not URLs). */
  readonly selectionNote: string;
  readonly account: ProviderRouteAccountShape;
  readonly economicClass: EconomicClass;
  readonly economicClassStatus: ReviewStatus;
  readonly economicClassNote: string;
  readonly dataPrivacyTags: readonly DataPrivacyTag[];
  readonly modelIdSource: RouteModelIdSource;
  /** Env key holding the operator-verified model-id map, when env-mapped. */
  readonly modelMapEnvKey: string | null;
  /** Canonical model ids this route can serve (must exist in the matrix). */
  readonly servedModelIds: readonly string[];
}

/* ------------------------------------------------------------------ */
/* Pricing version pointer                                             */
/* ------------------------------------------------------------------ */

/**
 * Pricing is referenced by VERSIONED POINTER only. Dollar amounts live in the
 * named snapshot artifact and are REVIEW_REQUIRED snapshots, never live truth.
 */
export interface PricingVersionPointer {
  /** Versioned label; bumped only through a change review packet. */
  readonly label: string;
  /** Repository path of the snapshot artifact backing the label. */
  readonly snapshotPath: string;
  readonly status: ReviewStatus;
  readonly note: string;
}

/* ------------------------------------------------------------------ */
/* Owner-approved substitutions (structure only, empty until approval) */
/* ------------------------------------------------------------------ */

export interface OwnerApprovedSubstitution {
  readonly substitutionId: string;
  readonly routeId: ProviderRouteId;
  readonly fromModelId: string;
  readonly toModelId: string;
  /** Owner identity string as recorded in the approval evidence. */
  readonly approvedBy: string;
  /** ISO-8601 timestamp of the owner decision. */
  readonly approvedAtIso: string;
  /** Reference to the decision evidence (doc path, PR, or packet id). */
  readonly evidenceRef: string;
}

/* ------------------------------------------------------------------ */
/* NOVA change-feed review packet                                      */
/* ------------------------------------------------------------------ */

export type ProviderRegistryChange =
  | {
      readonly kind: "add-route";
      readonly route: ProviderRoute;
    }
  | {
      readonly kind: "add-model";
      readonly model: ModelCapability;
    }
  | {
      readonly kind: "set-model-deprecation";
      readonly modelId: string;
      readonly deprecationState: ModelDeprecationState;
      readonly reason: string;
    }
  | {
      readonly kind: "set-context-window";
      readonly modelId: string;
      readonly contextWindowTokens: number;
      readonly sourceRef: string;
    }
  | {
      readonly kind: "set-economic-class";
      readonly routeId: ProviderRouteId;
      readonly economicClass: EconomicClass;
      readonly confirmationEvidenceRef: string;
    }
  | {
      readonly kind: "bump-pricing-pointer";
      readonly pricing: PricingVersionPointer;
    }
  | {
      readonly kind: "approve-substitution";
      readonly substitution: OwnerApprovedSubstitution;
    };

export type ChangeReviewState =
  | "PENDING_OWNER_REVIEW"
  | "OWNER_APPROVED"
  | "OWNER_REJECTED";

/**
 * The packet NOVA emits when its change feed observes provider/model movement
 * (new model, deprecation notice, pricing shift). A packet PROPOSES registry
 * changes; nothing in the registry mutates until the owner decision is
 * recorded and the change lands as a reviewed code change. A model may draft
 * a packet; it may not apply one.
 */
export interface ProviderRegistryChangeReviewPacket {
  readonly packetType: "PROVIDER_REGISTRY_CHANGE_REVIEW";
  readonly packetId: string;
  /** registryVersion the packet was drafted against. */
  readonly baseRegistryVersion: string;
  readonly proposedAtIso: string;
  /** Producing pipeline identifier (e.g. a NOVA source-cycle run id). */
  readonly proposedBy: string;
  readonly changes: readonly ProviderRegistryChange[];
  /** Evidence rows: human-checkable references backing each change. */
  readonly evidence: readonly { readonly description: string; readonly ref: string }[];
  readonly reviewState: ChangeReviewState;
  /** Reference to the owner decision record once one exists. */
  readonly ownerDecisionRef: string | null;
}

/* ------------------------------------------------------------------ */
/* Registry data                                                       */
/* ------------------------------------------------------------------ */

export interface ProviderRegistry {
  readonly registryVersion: string;
  readonly routes: readonly ProviderRoute[];
  readonly models: readonly ModelCapability[];
  readonly pricing: PricingVersionPointer;
  readonly ownerApprovedSubstitutions: readonly OwnerApprovedSubstitution[];
}

/**
 * Canonical model ids currently routed by the repository. Sources of truth
 * cross-checked by tests against apps/web/lib/claude-api/model-router.ts and
 * apps/web/lib/claude-api/providers/cerebras.ts so this matrix cannot drift.
 */
const MODEL_MATRIX: readonly ModelCapability[] = [
  {
    modelId: "claude-haiku-4-5-20251001",
    routeIds: ["anthropic-direct", "bedrock", "vertex"],
    contextWindowTokens: null,
    contextWindowStatus: "REVIEW_REQUIRED",
    modality: "text-in/text-out",
    deprecationState: "active",
    notes:
      "Haiku tier (model-router). Bedrock/Vertex serving requires the operator-supplied id map; ids are never guessed.",
  },
  {
    modelId: "claude-sonnet-4-6",
    routeIds: ["anthropic-direct", "bedrock", "vertex"],
    contextWindowTokens: null,
    contextWindowStatus: "REVIEW_REQUIRED",
    modality: "text-in/text-out",
    deprecationState: "active",
    notes:
      "Sonnet tier and repository default (model-router DEFAULT_MODEL). Bedrock/Vertex serving requires the operator-supplied id map.",
  },
  {
    modelId: "claude-opus-4-8",
    routeIds: ["anthropic-direct", "bedrock", "vertex"],
    contextWindowTokens: null,
    contextWindowStatus: "REVIEW_REQUIRED",
    modality: "text-in/text-out",
    deprecationState: "active",
    notes:
      "Opus tier (model-router). Recommended target for model-court once validated; routing flips stay deliberate and per-surface.",
  },
  {
    modelId: "gpt-oss-120b",
    routeIds: ["cerebras"],
    contextWindowTokens: null,
    contextWindowStatus: "REVIEW_REQUIRED",
    modality: "text-in/text-out",
    deprecationState: "active",
    notes:
      "Free-lane default (providers/cerebras.ts DEFAULT_CEREBRAS_MODEL). Content-tier-6 output only, per repo doctrine.",
  },
];

const ROUTES: readonly ProviderRoute[] = [
  {
    routeId: "anthropic-direct",
    displayName: "Anthropic API (direct)",
    transportOwnerModule: "apps/web/lib/claude-api/messages.ts",
    selectionNote:
      "Default route: used whenever CLAUDE_PROVIDER selects no other configured provider, and as the fallback on any provider error.",
    account: {
      credentialEnvKeys: ["ANTHROPIC_API_KEY"],
      regionEnvKeys: [],
      accountScopeNote: "Single Anthropic account; no region selection surface in the current transport.",
    },
    economicClass: "billable-cash",
    economicClassStatus: "VERIFIED_IN_REPO",
    economicClassNote: "Direct API spend bills the Anthropic account in cash.",
    dataPrivacyTags: ["prompt-leaves-infrastructure", "operator-supplied-credentials"],
    modelIdSource: "registry-static",
    modelMapEnvKey: null,
    servedModelIds: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"],
  },
  {
    routeId: "bedrock",
    displayName: "AWS Bedrock (Claude family)",
    transportOwnerModule: "apps/web/lib/claude-api/providers/bedrock.ts",
    selectionNote:
      "Selected only when CLAUDE_PROVIDER=bedrock AND AWS credentials are configured; any Bedrock error falls back to anthropic-direct.",
    account: {
      credentialEnvKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"],
      regionEnvKeys: ["AWS_BEDROCK_REGION", "AWS_REGION"],
      accountScopeNote: "Bedrock model access is account- and region-specific; the operator verifies availability per account.",
    },
    economicClass: "billable-cash",
    economicClassStatus: "REVIEW_REQUIRED",
    economicClassNote:
      "Spend lands on the AWS account. Reclassifying to confirmed-credits requires owner confirmation of the AWS Activate GenAI tier via a change review packet (docs/ops/CLAUDE_CREDITS_ACTIVATION_RUNBOOK.md); credits are not assumed.",
    dataPrivacyTags: ["prompt-leaves-infrastructure", "region-pinnable", "operator-supplied-credentials"],
    modelIdSource: "env-mapped",
    modelMapEnvKey: "BEDROCK_MODEL_MAP",
    servedModelIds: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"],
  },
  {
    routeId: "vertex",
    displayName: "Google Vertex AI (Claude family)",
    transportOwnerModule: "apps/web/lib/claude-api/providers/vertex.ts",
    selectionNote:
      "Selected only when CLAUDE_PROVIDER=vertex AND Vertex credentials are configured; any Vertex error falls back to anthropic-direct.",
    account: {
      credentialEnvKeys: ["GOOGLE_APPLICATION_CREDENTIALS_JSON"],
      regionEnvKeys: ["GOOGLE_VERTEX_PROJECT", "GOOGLE_VERTEX_REGION"],
      accountScopeNote: "Vertex model ids are Model-Garden-specific; the operator confirms ids per project/region.",
    },
    economicClass: "billable-cash",
    economicClassStatus: "REVIEW_REQUIRED",
    economicClassNote:
      "Spend lands on the Google Cloud project. Reclassifying to confirmed-credits requires owner confirmation of credit coverage via a change review packet; credits are not assumed.",
    dataPrivacyTags: ["prompt-leaves-infrastructure", "region-pinnable", "operator-supplied-credentials"],
    modelIdSource: "env-mapped",
    modelMapEnvKey: "VERTEX_MODEL_MAP",
    servedModelIds: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"],
  },
  {
    routeId: "cerebras",
    displayName: "Cerebras free lane (content tier 6 only)",
    transportOwnerModule: "apps/web/lib/claude-api/providers/cerebras.ts",
    selectionNote:
      "Used only by the free-lane dispatcher when CONTENT_FREE_LANE_ENABLED=true, CEREBRAS_API_KEY is present, and the surface is on the free-lane allow-list; any error falls back to anthropic-direct.",
    account: {
      credentialEnvKeys: ["CEREBRAS_API_KEY"],
      regionEnvKeys: [],
      accountScopeNote: "Single Cerebras account; free-tier limits are an account fact, not a registry claim.",
    },
    economicClass: "free-lane",
    economicClassStatus: "VERIFIED_IN_REPO",
    economicClassNote:
      "Repo doctrine treats this as the free content lane; spend beyond free-tier limits would bill the Cerebras account.",
    dataPrivacyTags: ["prompt-leaves-infrastructure", "operator-supplied-credentials", "content-tier-6-only"],
    modelIdSource: "registry-static",
    modelMapEnvKey: null,
    servedModelIds: ["gpt-oss-120b"],
  },
  {
    routeId: "local-none",
    displayName: "Local / internal LLM tier (operator-configured)",
    transportOwnerModule: "apps/web/lib/claude-api/internal-llm.ts",
    selectionNote:
      "Opt-in via INTERNAL_LLM_BASE_URL + INTERNAL_LLM_MODEL; unconfigured means callers fall back to Claude. Never used for user-shipped content.",
    account: {
      credentialEnvKeys: ["INTERNAL_LLM_API_KEY"],
      regionEnvKeys: [],
      accountScopeNote:
        "Endpoint and model are operator env facts. A self-hosted endpoint keeps prompts local; a hosted endpoint does not. The registry does not assume which.",
    },
    economicClass: "local",
    economicClassStatus: "REVIEW_REQUIRED",
    economicClassNote:
      "Classified local for the self-hosted case; if the operator points it at a hosted endpoint the economic class must be re-reviewed via a change packet.",
    dataPrivacyTags: ["operator-supplied-credentials", "content-tier-6-only"],
    modelIdSource: "env-configured",
    modelMapEnvKey: null,
    servedModelIds: [],
  },
];

const PRICING_POINTER: PricingVersionPointer = {
  label: "models-dev-vendored-snapshot-v1",
  snapshotPath: "apps/web/__tests__/fixtures/models-dev-snapshot.json",
  status: "REVIEW_REQUIRED",
  note:
    "Versioned pointer only. Dollar amounts live in the snapshot artifact and are REVIEW_REQUIRED snapshots for planning, never live billing truth. Bumps go through a change review packet.",
};

/* ------------------------------------------------------------------ */
/* Deep freeze                                                         */
/* ------------------------------------------------------------------ */

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.getOwnPropertyNames(value)) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== null && typeof child === "object" && !Object.isFrozen(child)) {
        deepFreeze(child);
      }
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * The canonical registry. Frozen (deeply) at module initialization so no
 * runtime code path can mutate routes, models, pricing, or substitutions.
 */
export const PROVIDER_REGISTRY: ProviderRegistry = deepFreeze({
  registryVersion: "e0-draft-1",
  routes: ROUTES,
  models: MODEL_MATRIX,
  pricing: PRICING_POINTER,
  // Empty until the owner approves a substitution; approvals arrive only via
  // a ProviderRegistryChangeReviewPacket with reviewState OWNER_APPROVED.
  ownerApprovedSubstitutions: [] as readonly OwnerApprovedSubstitution[],
});

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type ProviderRegistryValidationCode =
  | "UNKNOWN_ROUTE"
  | "UNKNOWN_MODEL"
  | "MODEL_NOT_ON_ROUTE"
  | "REGISTRY_INVARIANT_VIOLATION";

export class ProviderRegistryValidationError extends Error {
  readonly code: ProviderRegistryValidationCode;

  constructor(code: ProviderRegistryValidationCode, message: string) {
    super(message);
    this.name = "ProviderRegistryValidationError";
    this.code = code;
  }
}

/** Look up a route; unknown route ids are rejected, never defaulted. */
export function getProviderRoute(
  routeId: string,
  registry: ProviderRegistry = PROVIDER_REGISTRY,
): ProviderRoute {
  const route = registry.routes.find((r) => r.routeId === routeId);
  if (!route) {
    throw new ProviderRegistryValidationError(
      "UNKNOWN_ROUTE",
      `Unknown provider route "${routeId}". Known routes: ${registry.routes.map((r) => r.routeId).join(", ")}.`,
    );
  }
  return route;
}

/** Look up a model; unknown model ids are rejected, never defaulted. */
export function getModelCapability(
  modelId: string,
  registry: ProviderRegistry = PROVIDER_REGISTRY,
): ModelCapability {
  const model = registry.models.find((m) => m.modelId === modelId);
  if (!model) {
    throw new ProviderRegistryValidationError(
      "UNKNOWN_MODEL",
      `Unknown model id "${modelId}". Known models: ${registry.models.map((m) => m.modelId).join(", ")}.`,
    );
  }
  return model;
}

export interface RouteModelAssertion {
  readonly route: ProviderRoute;
  readonly model: ModelCapability;
  /** Deprecated models are FLAGGED here; callers decide whether to refuse. */
  readonly deprecationState: ModelDeprecationState;
  readonly deprecated: boolean;
}

/**
 * Assert that (routeId, modelId) is a known, registry-sanctioned pair.
 * Unknown routes/models and off-route models are rejected with typed errors.
 * Deprecated models are returned flagged rather than silently accepted.
 */
export function assertKnownRouteModel(
  args: { readonly routeId: string; readonly modelId: string },
  registry: ProviderRegistry = PROVIDER_REGISTRY,
): RouteModelAssertion {
  const route = getProviderRoute(args.routeId, registry);
  const model = getModelCapability(args.modelId, registry);
  const onRoute =
    route.servedModelIds.includes(model.modelId) &&
    model.routeIds.includes(route.routeId);
  if (!onRoute) {
    throw new ProviderRegistryValidationError(
      "MODEL_NOT_ON_ROUTE",
      `Model "${model.modelId}" is not registered on route "${route.routeId}".`,
    );
  }
  return {
    route,
    model,
    deprecationState: model.deprecationState,
    deprecated: model.deprecationState !== "active",
  };
}

export interface ProviderRegistryValidationResult {
  readonly ok: boolean;
  readonly problems: readonly string[];
  /** Deprecated/retired models present in the registry, surfaced for review. */
  readonly deprecatedModelIds: readonly string[];
}

/**
 * Structural validation of a registry value (the canonical one by default,
 * or a proposed replacement drafted from a change packet). Checks internal
 * cross-references and the identifier-only discipline; does not reach the
 * network and makes no vendor claims.
 */
export function validateProviderRegistry(
  registry: ProviderRegistry = PROVIDER_REGISTRY,
): ProviderRegistryValidationResult {
  const problems: string[] = [];

  const routeIds = registry.routes.map((r) => r.routeId);
  if (new Set(routeIds).size !== routeIds.length) {
    problems.push("Duplicate route ids present.");
  }
  const modelIds = registry.models.map((m) => m.modelId);
  if (new Set(modelIds).size !== modelIds.length) {
    problems.push("Duplicate model ids present.");
  }
  const knownRoutes = new Set<string>(routeIds);
  const knownModels = new Set<string>(modelIds);

  for (const route of registry.routes) {
    for (const servedId of route.servedModelIds) {
      if (!knownModels.has(servedId)) {
        problems.push(`Route "${route.routeId}" serves unknown model id "${servedId}".`);
      }
    }
    if (route.modelIdSource === "env-mapped" && !route.modelMapEnvKey) {
      problems.push(`Route "${route.routeId}" is env-mapped but names no modelMapEnvKey.`);
    }
    // Identifier-only discipline: route metadata may not smuggle in endpoints.
    const routeJson = JSON.stringify(route);
    if (/https?:\/\//.test(routeJson)) {
      problems.push(`Route "${route.routeId}" contains a URL; routes must store identifiers only.`);
    }
  }

  for (const model of registry.models) {
    if (model.routeIds.length === 0) {
      problems.push(`Model "${model.modelId}" is registered on no route.`);
    }
    for (const routeId of model.routeIds) {
      if (!knownRoutes.has(routeId)) {
        problems.push(`Model "${model.modelId}" references unknown route "${routeId}".`);
      }
    }
    if (model.contextWindowTokens === null && model.contextWindowStatus !== "REVIEW_REQUIRED") {
      problems.push(
        `Model "${model.modelId}" has no context window value but is not marked REVIEW_REQUIRED.`,
      );
    }
  }

  for (const substitution of registry.ownerApprovedSubstitutions) {
    if (!knownRoutes.has(substitution.routeId)) {
      problems.push(`Substitution "${substitution.substitutionId}" references unknown route "${substitution.routeId}".`);
    }
    if (!knownModels.has(substitution.fromModelId) || !knownModels.has(substitution.toModelId)) {
      problems.push(`Substitution "${substitution.substitutionId}" references an unknown model id.`);
    }
    if (!substitution.approvedBy || !substitution.evidenceRef) {
      problems.push(`Substitution "${substitution.substitutionId}" lacks approval identity or evidence.`);
    }
  }

  const deprecatedModelIds = registry.models
    .filter((m) => m.deprecationState !== "active")
    .map((m) => m.modelId);

  return { ok: problems.length === 0, problems, deprecatedModelIds };
}

/** Recursively verify a value (and every reachable child) is frozen. */
export function isDeeplyFrozen(value: unknown): boolean {
  if (value === null || typeof value !== "object") return true;
  if (!Object.isFrozen(value)) return false;
  for (const key of Object.getOwnPropertyNames(value)) {
    if (!isDeeplyFrozen((value as Record<string, unknown>)[key])) return false;
  }
  return true;
}
