import { createHash } from "node:crypto";

import type { ApiV1AuthHeaders, ApiV1CredentialTransport, ApiV1ParsedCredential } from "./types";

const API_KEY_PATTERN = /^gse_v1_(shadow|test|live)_[A-Za-z0-9_-]{16,}$/;
const HASH_NAMESPACE = "gse-api-v1-key";

type Candidate = {
  readonly raw: string;
  readonly transport: ApiV1CredentialTransport;
};

type CredentialFailure = Extract<ApiV1ParsedCredential, { readonly ok: false }>;

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function extractBearer(authorization: string | null): Candidate | CredentialFailure | null {
  if (authorization === null) return null;

  const [scheme = "", ...rest] = authorization.split(/\s+/);
  if (scheme.toLowerCase() !== "bearer") {
    return {
      code: "invalid_authorization_scheme",
      message: "API v1 accepts only Authorization: Bearer credentials.",
      ok: false,
      transport: "authorization",
    };
  }

  const token = rest.join(" ").trim();
  if (token.length === 0) {
    return {
      code: "malformed_api_key",
      message: "Authorization bearer token is empty.",
      ok: false,
      transport: "authorization_bearer",
    };
  }

  return { raw: token, transport: "authorization_bearer" };
}

export function hashApiV1Key(rawKey: string): string {
  return createHash("sha256").update(`${HASH_NAMESPACE}:${rawKey}`).digest("hex");
}

function redactedKey(rawKey: string): string {
  const prefix = rawKey.slice(0, 13);
  const suffix = rawKey.slice(-4);
  return `${prefix}...${suffix}`;
}

function keyPrefix(rawKey: string): "gse_v1_shadow" | "gse_v1_test" | "gse_v1_live" {
  if (rawKey.startsWith("gse_v1_live_")) return "gse_v1_live";
  if (rawKey.startsWith("gse_v1_test_")) return "gse_v1_test";
  return "gse_v1_shadow";
}

function keyId(rawKey: string): string {
  return `${keyPrefix(rawKey)}_${hashApiV1Key(rawKey).slice(0, 12)}`;
}

export function parseApiV1Credential(headers: ApiV1AuthHeaders): ApiV1ParsedCredential {
  const authorization = normalize(headers.authorization);
  const bearer = extractBearer(authorization);

  const candidates: Candidate[] = [];
  if (bearer !== null) {
    if ("raw" in bearer) {
      candidates.push(bearer);
    } else {
      return bearer;
    }
  }

  const gseHeader = normalize(headers.xGseApiKey);
  const xApiKey = normalize(headers.xApiKey);
  if (gseHeader !== null) candidates.push({ raw: gseHeader, transport: "x-gse-api-key" });
  if (xApiKey !== null) candidates.push({ raw: xApiKey, transport: "x-api-key" });

  if (candidates.length === 0) {
    return {
      code: "missing_api_key",
      message: "API v1 shadow requests require an API key.",
      ok: false,
      transport: "none",
    };
  }

  const uniqueRawValues = new Set(candidates.map((candidate) => candidate.raw));
  if (candidates.length > 1 && uniqueRawValues.size > 1) {
    return {
      code: "conflicting_api_keys",
      message: "Multiple different API keys were supplied.",
      ok: false,
      transport: "multiple",
    };
  }

  const candidate = candidates[0];
  if (candidate === undefined) {
    return {
      code: "missing_api_key",
      message: "API v1 shadow requests require an API key.",
      ok: false,
      transport: "none",
    };
  }
  if (!API_KEY_PATTERN.test(candidate.raw)) {
    return {
      code: "malformed_api_key",
      message: "API key must match the gse_v1_shadow/test/live prefix contract.",
      ok: false,
      transport: candidate.transport,
    };
  }

  return {
    keyHash: hashApiV1Key(candidate.raw),
    keyId: keyId(candidate.raw),
    keyPrefix: keyPrefix(candidate.raw),
    ok: true,
    redacted: redactedKey(candidate.raw),
    transport: candidate.transport,
  };
}
