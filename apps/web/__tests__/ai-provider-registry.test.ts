/**
 * E0 provider/model registry tests (dormant unit).
 *
 * Proves: unknown route/model rejection, off-route rejection, deprecated-model
 * flagging, deep runtime immutability, identifier-only discipline (no endpoint
 * URLs in the registry, consistent with the transport-boundary guard), and
 * no-drift consistency with the live model-router / free-lane modules.
 */
import { describe, expect, it } from "vitest";
import {
  PROVIDER_REGISTRY,
  PROVIDER_ROUTE_IDS,
  ProviderRegistryValidationError,
  assertKnownRouteModel,
  getModelCapability,
  getProviderRoute,
  isDeeplyFrozen,
  validateProviderRegistry,
  type ModelCapability,
  type ProviderRegistry,
} from "@/lib/ai-control-plane/provider-registry.data";
import { MODELS } from "@/lib/claude-api/model-router";
import { DEFAULT_CEREBRAS_MODEL } from "@/lib/claude-api/providers/cerebras";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof ProviderRegistryValidationError) return error.code;
    throw error;
  }
  throw new Error("expected a ProviderRegistryValidationError");
}

describe("provider registry: rejection of unknown identifiers", () => {
  it("rejects an unknown route id with a typed error", () => {
    expect(codeOf(() => getProviderRoute("openai"))).toBe("UNKNOWN_ROUTE");
    expect(codeOf(() => assertKnownRouteModel({ routeId: "nope", modelId: "claude-sonnet-4-6" }))).toBe(
      "UNKNOWN_ROUTE",
    );
  });

  it("rejects an unknown model id with a typed error", () => {
    expect(codeOf(() => getModelCapability("claude-imaginary-9"))).toBe("UNKNOWN_MODEL");
    expect(
      codeOf(() => assertKnownRouteModel({ routeId: "anthropic-direct", modelId: "claude-imaginary-9" })),
    ).toBe("UNKNOWN_MODEL");
  });

  it("rejects a known model on a route that does not serve it", () => {
    expect(codeOf(() => assertKnownRouteModel({ routeId: "cerebras", modelId: "claude-sonnet-4-6" }))).toBe(
      "MODEL_NOT_ON_ROUTE",
    );
    expect(codeOf(() => assertKnownRouteModel({ routeId: "anthropic-direct", modelId: "gpt-oss-120b" }))).toBe(
      "MODEL_NOT_ON_ROUTE",
    );
  });

  it("accepts every registered (route, model) pair", () => {
    for (const route of PROVIDER_REGISTRY.routes) {
      for (const modelId of route.servedModelIds) {
        const assertion = assertKnownRouteModel({ routeId: route.routeId, modelId });
        expect(assertion.route.routeId).toBe(route.routeId);
        expect(assertion.model.modelId).toBe(modelId);
      }
    }
  });
});

describe("provider registry: deprecation flagging", () => {
  const deprecatedModel: ModelCapability = {
    modelId: "example-deprecated-model",
    routeIds: ["anthropic-direct"],
    contextWindowTokens: null,
    contextWindowStatus: "REVIEW_REQUIRED",
    modality: "text-in/text-out",
    deprecationState: "deprecated",
    notes: "Synthetic test entry proving the deprecation flag path.",
  };

  // A synthetic registry (test-local, never shipped) proving the flag path.
  const registryWithDeprecated: ProviderRegistry = {
    ...PROVIDER_REGISTRY,
    models: [...PROVIDER_REGISTRY.models, deprecatedModel],
    routes: PROVIDER_REGISTRY.routes.map((route) =>
      route.routeId === "anthropic-direct"
        ? { ...route, servedModelIds: [...route.servedModelIds, deprecatedModel.modelId] }
        : route,
    ),
  };

  it("surfaces deprecated models in validation output", () => {
    const result = validateProviderRegistry(registryWithDeprecated);
    expect(result.ok).toBe(true);
    expect(result.deprecatedModelIds).toContain("example-deprecated-model");
  });

  it("returns a deprecation flag from assertKnownRouteModel instead of silently accepting", () => {
    const assertion = assertKnownRouteModel(
      { routeId: "anthropic-direct", modelId: "example-deprecated-model" },
      registryWithDeprecated,
    );
    expect(assertion.deprecated).toBe(true);
    expect(assertion.deprecationState).toBe("deprecated");
  });

  it("the live registry currently carries no deprecated models", () => {
    expect(validateProviderRegistry().deprecatedModelIds).toEqual([]);
  });
});

describe("provider registry: structural validation", () => {
  it("validates the canonical registry with zero problems", () => {
    const result = validateProviderRegistry();
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("reports a route serving an unknown model id", () => {
    const broken: ProviderRegistry = {
      ...PROVIDER_REGISTRY,
      routes: PROVIDER_REGISTRY.routes.map((route) =>
        route.routeId === "cerebras"
          ? { ...route, servedModelIds: [...route.servedModelIds, "ghost-model"] }
          : route,
      ),
    };
    const result = validateProviderRegistry(broken);
    expect(result.ok).toBe(false);
    expect(result.problems.join("\n")).toContain('unknown model id "ghost-model"');
  });

  it("reports substitutions that lack approval evidence", () => {
    const broken: ProviderRegistry = {
      ...PROVIDER_REGISTRY,
      ownerApprovedSubstitutions: [
        {
          substitutionId: "sub-1",
          routeId: "anthropic-direct",
          fromModelId: "claude-sonnet-4-6",
          toModelId: "claude-haiku-4-5-20251001",
          approvedBy: "",
          approvedAtIso: "2026-07-22T00:00:00Z",
          evidenceRef: "",
        },
      ],
    };
    const result = validateProviderRegistry(broken);
    expect(result.ok).toBe(false);
    expect(result.problems.join("\n")).toContain("lacks approval identity or evidence");
  });
});

describe("provider registry: runtime immutability", () => {
  it("is deeply frozen", () => {
    expect(isDeeplyFrozen(PROVIDER_REGISTRY)).toBe(true);
  });

  it("rejects mutation attempts at runtime", () => {
    const registry = PROVIDER_REGISTRY as unknown as {
      registryVersion: string;
      routes: { economicClass: string }[];
      ownerApprovedSubstitutions: { push: (v: unknown) => void };
    };
    expect(() => {
      registry.registryVersion = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      registry.routes[0]!.economicClass = "confirmed-credits";
    }).toThrow(TypeError);
    expect(() => {
      registry.ownerApprovedSubstitutions.push({});
    }).toThrow(TypeError);
  });
});

describe("provider registry: dormant-state and evidence discipline", () => {
  it("holds no owner-approved substitutions until the owner approves one", () => {
    expect(PROVIDER_REGISTRY.ownerApprovedSubstitutions).toEqual([]);
  });

  it("stores route identifiers only: no URLs, endpoints, or credential values", () => {
    const serialized = JSON.stringify(PROVIDER_REGISTRY);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/amazonaws\.com|googleapis\.com|anthropic\.com|cerebras\.ai/);
    // Env keys are names only; a value-looking secret pattern must not appear.
    expect(serialized).not.toMatch(/sk-[A-Za-z0-9]/);
  });

  it("keeps unverifiable values as REVIEW_REQUIRED instead of inventing them", () => {
    for (const model of PROVIDER_REGISTRY.models) {
      if (model.contextWindowTokens === null) {
        expect(model.contextWindowStatus).toBe("REVIEW_REQUIRED");
      }
    }
    expect(PROVIDER_REGISTRY.pricing.status).toBe("REVIEW_REQUIRED");
    // No route claims confirmed credits without owner confirmation evidence.
    for (const route of PROVIDER_REGISTRY.routes) {
      expect(route.economicClass).not.toBe("confirmed-credits");
    }
  });
});

describe("provider registry: no-drift consistency with live modules", () => {
  it("covers every model-router tier id on the anthropic-direct route", () => {
    const direct = getProviderRoute("anthropic-direct");
    for (const modelId of Object.values(MODELS)) {
      expect(direct.servedModelIds).toContain(modelId);
      expect(getModelCapability(modelId).routeIds).toContain("anthropic-direct");
    }
  });

  it("covers the free-lane default model on the cerebras route", () => {
    const cerebras = getProviderRoute("cerebras");
    expect(cerebras.servedModelIds).toContain(DEFAULT_CEREBRAS_MODEL);
  });

  it("registers exactly the five directive routes", () => {
    expect([...PROVIDER_ROUTE_IDS].sort()).toEqual(
      ["anthropic-direct", "bedrock", "cerebras", "local-none", "vertex"].sort(),
    );
    expect(PROVIDER_REGISTRY.routes.map((r) => r.routeId).sort()).toEqual([...PROVIDER_ROUTE_IDS].sort());
  });
});
