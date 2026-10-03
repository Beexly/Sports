import { API_V1_ENDPOINTS } from "./scopes";
import { API_V1_SCOPES, API_V1_SHADOW_VERSION, type ApiV1EndpointContract } from "./types";

type OpenApiOperation = {
  readonly summary: string;
  readonly operationId: string;
  readonly security: readonly [{ readonly ApiKeyAuth: readonly string[] }];
  readonly responses: {
    readonly "200": { readonly description: string };
    readonly "401": { readonly description: string };
    readonly "403": { readonly description: string };
  };
  readonly "x-gse-shadow-only": true;
  readonly "x-gse-required-scopes": readonly string[];
  readonly "x-gse-data-classes": readonly string[];
};

type OpenApiPath = {
  readonly get: OpenApiOperation;
};

export type ApiV1ShadowOpenApi = {
  readonly openapi: "3.1.0";
  readonly info: {
    readonly title: "Galaxy Sports Edge API v1 Shadow Contract";
    readonly version: typeof API_V1_SHADOW_VERSION;
    readonly description: string;
  };
  readonly paths: Record<string, OpenApiPath>;
  readonly components: {
    readonly securitySchemes: {
      readonly ApiKeyAuth: {
        readonly type: "http";
        readonly scheme: "bearer";
        readonly bearerFormat: "gse_v1_shadow/test/live";
      };
    };
  };
  readonly "x-gse-live-routes-exposed": false;
  readonly "x-gse-valid-scopes": readonly string[];
};

function operation(contract: ApiV1EndpointContract): OpenApiOperation {
  return {
    "x-gse-data-classes": contract.dataClasses,
    "x-gse-required-scopes": contract.requiredScopes,
    "x-gse-shadow-only": true,
    operationId: contract.id,
    responses: {
      "200": { description: "Shadow envelope returned after auth, scope, and payload rights gates pass." },
      "401": { description: "Authentication missing or malformed." },
      "403": { description: "Scope, origin, consumer, or payload rights gate failed closed." },
    },
    security: [{ ApiKeyAuth: contract.requiredScopes }],
    summary: contract.summary,
  };
}

export function buildApiV1ShadowOpenApi(
  contracts: readonly ApiV1EndpointContract[] = API_V1_ENDPOINTS
): ApiV1ShadowOpenApi {
  const paths: Record<string, OpenApiPath> = {};
  contracts.forEach((contract) => {
    paths[contract.path] = { get: operation(contract) };
  });

  return {
    "x-gse-live-routes-exposed": false,
    "x-gse-valid-scopes": API_V1_SCOPES,
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          bearerFormat: "gse_v1_shadow/test/live",
          scheme: "bearer",
          type: "http",
        },
      },
    },
    info: {
      description:
        "Local, zero-live-route OpenAPI draft for API v1. It documents the contract only; it does not publish an endpoint.",
      title: "Galaxy Sports Edge API v1 Shadow Contract",
      version: API_V1_SHADOW_VERSION,
    },
    openapi: "3.1.0",
    paths,
  };
}
