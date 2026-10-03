/**
 * Google service-account OAuth2 — zero-dependency, using only Node's `crypto`.
 * Mints a short-lived access token from a service-account key so we can call
 * Vertex AI (Claude via Model Garden) without the full Google SDK.
 *
 * Flow (RFC 7523 JWT bearer): build a JWT signed RS256 with the service account's
 * private key, POST it to the token endpoint, receive a ~1h access token. The JWT
 * construction is pure and clock-injected so it is deterministically testable; the
 * signature round-trips against the key's public half in the test.
 */
import { createSign } from "node:crypto";

const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";
const JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";

export interface ServiceAccountKey {
  readonly client_email: string;
  /** PEM-encoded RSA private key. */
  readonly private_key: string;
  readonly token_uri?: string;
}

/** Parse a service-account JSON string; null if it lacks the required fields. */
export function parseServiceAccountJson(raw: string): ServiceAccountKey | null {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const clientEmail = obj["client_email"];
  const privateKey = obj["private_key"];
  if (typeof clientEmail !== "string" || typeof privateKey !== "string") return null;
  if (!clientEmail.trim() || !privateKey.trim()) return null;
  const tokenUri = obj["token_uri"];
  return {
    client_email: clientEmail,
    private_key: privateKey,
    ...(typeof tokenUri === "string" && tokenUri.trim() ? { token_uri: tokenUri } : {}),
  };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Build a signed JWT assertion for the token exchange. Pure + clock-injected. */
export function buildSignedJwt(
  key: ServiceAccountKey,
  opts: { readonly scope: string; readonly now: Date; readonly ttlSeconds?: number },
): string {
  const iat = Math.floor(opts.now.getTime() / 1000);
  const exp = iat + (opts.ttlSeconds ?? 3600);
  const tokenUri = key.token_uri ?? DEFAULT_TOKEN_URI;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: key.client_email, scope: opts.scope, aud: tokenUri, iat, exp }),
  );
  const signingInput = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(key.private_key);
  return `${signingInput}.${base64url(signature)}`;
}

export interface AccessToken {
  readonly token: string;
  readonly expiresAtMs: number;
}

export class GoogleOAuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleOAuthError";
    this.status = status;
  }
}

interface TokenResponse {
  readonly access_token?: string;
  readonly expires_in?: number;
}

/** Exchange the signed JWT for an access token. */
export async function fetchAccessToken(
  key: ServiceAccountKey,
  opts: {
    readonly scope: string;
    readonly now: Date;
    readonly fetchImpl?: typeof fetch;
    readonly ttlSeconds?: number;
  },
): Promise<AccessToken> {
  const jwt = buildSignedJwt(key, opts);
  const tokenUri = key.token_uri ?? DEFAULT_TOKEN_URI;
  const body = new URLSearchParams({ grant_type: JWT_BEARER_GRANT, assertion: jwt }).toString();

  const res = await (opts.fetchImpl ?? fetch)(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleOAuthError(`Google token endpoint error: ${res.status} - ${text}`, res.status);
  }
  const payload = (await res.json()) as TokenResponse;
  if (!payload.access_token) {
    throw new GoogleOAuthError("Google token response had no access_token.", res.status);
  }
  return {
    token: payload.access_token,
    expiresAtMs: opts.now.getTime() + (payload.expires_in ?? 3600) * 1000,
  };
}
