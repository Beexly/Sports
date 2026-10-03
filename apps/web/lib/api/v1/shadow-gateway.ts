import { parseApiV1Credential } from "./api-key";
import { createApiV1ErrorEnvelope, createApiV1SuccessEnvelope } from "./envelope";
import { evaluateApiV1PayloadRights } from "./payload-rights";
import { evaluateApiV1Scopes, findApiV1Endpoint } from "./scopes";
import type {
  ApiV1AuthHeaders,
  ApiV1EndpointId,
  ApiV1Envelope,
  ApiV1EnvelopeError,
  ApiV1PayloadUse,
  ApiV1RegisteredConsumer,
} from "./types";

export type ApiV1ShadowGatewayInput = {
  readonly endpointId: ApiV1EndpointId;
  readonly headers: ApiV1AuthHeaders;
  readonly consumer: ApiV1RegisteredConsumer | null;
  readonly origin?: string | null;
  readonly payload: {
    readonly sourceIds: readonly string[];
    readonly intendedUse: ApiV1PayloadUse;
    readonly includesRawVendorPayload?: boolean;
    readonly includesPersonalData?: boolean;
  };
  readonly generatedAt?: string;
};

export type ApiV1ShadowGatewayData = {
  readonly endpointId: ApiV1EndpointId;
  readonly method: "GET";
  readonly path: string;
  readonly consumerKeyId: string;
  readonly grantedScopes: readonly string[];
  readonly requiredScopes: readonly string[];
  readonly attributions: readonly string[];
  readonly shadowOnly: true;
};

function originAllowed(origin: string | null | undefined, allowedOrigins: readonly string[] | undefined): boolean {
  if (allowedOrigins === undefined || allowedOrigins.length === 0) return true;
  if (origin === null || origin === undefined || origin.trim().length === 0) return false;

  const normalizedOrigin = origin.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return allowedOrigins.some((allowed) => {
    const normalizedAllowed = allowed.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return normalizedOrigin === normalizedAllowed || normalizedOrigin.endsWith(`.${normalizedAllowed}`);
  });
}

function error(code: string, message: string, field?: string): ApiV1EnvelopeError {
  return field === undefined ? { code, message } : { code, field, message };
}

export function evaluateApiV1ShadowGateway(
  input: ApiV1ShadowGatewayInput
): ApiV1Envelope<ApiV1ShadowGatewayData> {
  const endpoint = findApiV1Endpoint(input.endpointId);
  const errors: ApiV1EnvelopeError[] = [];
  const credential = parseApiV1Credential(input.headers);

  if (!credential.ok) {
    errors.push(error(credential.code, credential.message, "headers"));
  }

  if (credential.ok && input.consumer === null) {
    errors.push(error("api_key_not_registered", "API key is not registered for the shadow contract.", "consumer"));
  }

  if (credential.ok && input.consumer !== null && input.consumer.keyHash !== credential.keyHash) {
    errors.push(error("api_key_hash_mismatch", "Presented API key does not match the registered consumer.", "consumer"));
  }

  if (input.consumer !== null && !input.consumer.active) {
    errors.push(error("api_key_inactive", "Registered API key is inactive.", "consumer"));
  }

  if (input.consumer !== null && !originAllowed(input.origin, input.consumer.allowedOrigins)) {
    errors.push(error("origin_not_allowed", "Request origin is not allowed for this consumer.", "origin"));
  }

  const scopeDecision = evaluateApiV1Scopes(input.consumer?.scopes ?? [], endpoint.requiredScopes);
  scopeDecision.blockers.forEach((blocker) => errors.push(error("insufficient_scope", blocker, "scopes")));

  const rightsReport = evaluateApiV1PayloadRights(input.payload);
  rightsReport.blockers.forEach((blocker) => errors.push(error("payload_rights_blocked", blocker, "payload.sourceIds")));

  if (errors.length > 0) {
    return createApiV1ErrorEnvelope(errors, {
      endpointId: input.endpointId,
      generatedAt: input.generatedAt,
    });
  }

  return createApiV1SuccessEnvelope(
    {
      attributions: rightsReport.attributions,
      consumerKeyId: input.consumer?.keyId ?? "",
      endpointId: endpoint.id,
      grantedScopes: scopeDecision.grantedScopes,
      method: endpoint.method,
      path: endpoint.path,
      requiredScopes: endpoint.requiredScopes,
      shadowOnly: true,
    },
    {
      endpointId: input.endpointId,
      generatedAt: input.generatedAt,
    }
  );
}
