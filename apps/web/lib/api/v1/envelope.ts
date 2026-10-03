import { API_V1_SHADOW_VERSION, type ApiV1EndpointId, type ApiV1Envelope, type ApiV1EnvelopeError } from "./types";

type EnvelopeContext = {
  readonly endpointId: ApiV1EndpointId;
  readonly generatedAt?: string;
  readonly requestId?: string;
  readonly warnings?: readonly string[];
};

function requestId(endpointId: ApiV1EndpointId, generatedAt: string): string {
  const normalized = `${endpointId}:${generatedAt}`.replace(/[^a-zA-Z0-9]+/g, "-");
  return `shadow-${normalized.slice(0, 64)}`;
}

function meta(context: EnvelopeContext) {
  const generatedAt = context.generatedAt ?? new Date(0).toISOString();
  return {
    endpointId: context.endpointId,
    generatedAt,
    requestId: context.requestId ?? requestId(context.endpointId, generatedAt),
    shadow: true,
    version: API_V1_SHADOW_VERSION,
    warnings: context.warnings ?? ["API v1 is shadow-only; no live route is exposed by this module."],
  } as const;
}

export function createApiV1SuccessEnvelope<T>(
  data: T,
  context: EnvelopeContext
): ApiV1Envelope<T> {
  return {
    data,
    errors: [],
    meta: meta(context),
    ok: true,
  };
}

export function createApiV1ErrorEnvelope(
  errors: readonly ApiV1EnvelopeError[],
  context: EnvelopeContext
): ApiV1Envelope<never> {
  return {
    data: null,
    errors,
    meta: meta(context),
    ok: false,
  };
}
