import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

/**
 * Cryptographic Identity-Aware Proxy (IAP) ES256 JWT assertion verifier (GSP499).
 *
 * Defense-in-depth rule:
 * Never trust `X-Goog-Authenticated-User-Email` or `X-Goog-Authenticated-User-ID`
 * without first verifying the signed `X-Goog-IAP-JWT-Assertion` ES256 JWT against
 * Google's IAP JWK keys (`https://www.gstatic.com/iap/verify/public_key-jwk`).
 */

export const IAP_ISSUER = "https://cloud.google.com/iap" as const;
export const IAP_JWKS_URL = "https://www.gstatic.com/iap/verify/public_key-jwk" as const;

export interface IapJwk extends JsonWebKey {
  readonly kid?: string;
  readonly alg?: string;
  readonly kty?: string;
  readonly crv?: string;
}

export type IapJwksLoader = (forceRefresh: boolean) => Promise<Readonly<Record<string, IapJwk>>>;

export type HeaderBag =
  | Headers
  | Readonly<Record<string, string | readonly string[] | undefined>>;

export interface VerifyIapRequestOptions {
  readonly expectedAudience: string;
  readonly allowedEmails?: readonly string[];
  readonly nowSeconds?: number;
  readonly clockSkewSeconds?: number;
  readonly jwksLoader?: IapJwksLoader;
  readonly fetchImpl?: typeof fetch;
}

export interface IapVerificationSuccess {
  readonly ok: true;
  readonly status: 200;
  readonly email: string;
  readonly sub: string;
  readonly aud: string;
  readonly iss: string;
}

export interface IapVerificationFailure {
  readonly ok: false;
  readonly status: 401 | 403;
  readonly reason:
    | "missing_iap_jwt_assertion"
    | "spoofed_unsigned_iap_headers_rejected"
    | "malformed_iap_jwt"
    | "unsupported_iap_alg"
    | "unknown_iap_kid"
    | "invalid_iap_signature"
    | "invalid_iap_issuer"
    | "invalid_iap_audience"
    | "expired_iap_token"
    | "future_iap_token"
    | "missing_verified_email"
    | "email_not_allowlisted";
}

export type IapVerificationResult = IapVerificationSuccess | IapVerificationFailure;

export function buildCloudRunIapAudience(
  projectNumber: string,
  region: string,
  serviceName: string
): string {
  const num = projectNumber.trim();
  const reg = region.trim();
  const svc = serviceName.trim();
  if (!num || !reg || !svc) {
    throw new Error("buildCloudRunIapAudience: projectNumber, region, and serviceName are required");
  }
  return `/projects/${num}/locations/${reg}/services/${svc}`;
}

export function buildBackendServiceIapAudience(
  projectNumber: string,
  backendServiceId: string
): string {
  const num = projectNumber.trim();
  const id = backendServiceId.trim();
  if (!num || !id) {
    throw new Error("buildBackendServiceIapAudience: projectNumber and backendServiceId are required");
  }
  return `/projects/${num}/global/backendServices/${id}`;
}

function readHeaderCaseInsensitive(headers: HeaderBag, name: string): string | undefined {
  if (typeof (headers as Headers).get === "function") {
    const val = (headers as Headers).get(name);
    return val === null ? undefined : val;
  }
  const target = name.toLowerCase();
  const record = headers as Readonly<Record<string, string | readonly string[] | undefined>>;
  for (const [k, v] of Object.entries(record)) {
    if (k.toLowerCase() === target) {
      if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : undefined;
      return typeof v === "string" ? v : undefined;
    }
  }
  return undefined;
}

function decodeBase64UrlToBuffer(segment: string): Buffer {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
  return Buffer.from(padded, "base64");
}

function decodeJwtJsonPart(segment: string): Record<string, unknown> | null {
  try {
    const raw = decodeBase64UrlToBuffer(segment).toString("utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

let cachedJwks: { keys: Readonly<Record<string, IapJwk>>; expiresAtMs: number } | null = null;

export function createDefaultIapJwksLoader(fetchImpl: typeof fetch = fetch): IapJwksLoader {
  return async (forceRefresh: boolean): Promise<Readonly<Record<string, IapJwk>>> => {
    const now = Date.now();
    if (!forceRefresh && cachedJwks !== null && now < cachedJwks.expiresAtMs) {
      return cachedJwks.keys;
    }
    const res = await fetchImpl(IAP_JWKS_URL, { method: "GET" });
    if (!res.ok) {
      throw new Error(`Failed to fetch Google IAP JWKS: HTTP ${res.status}`);
    }
    const body = (await res.json()) as { readonly keys?: readonly IapJwk[] };
    const map: Record<string, IapJwk> = {};
    for (const k of body.keys ?? []) {
      if (typeof k.kid === "string" && k.kid.length > 0) {
        map[k.kid] = k;
      }
    }
    cachedJwks = { keys: map, expiresAtMs: now + 300_000 };
    return map;
  };
}

export function clearIapJwksCache(): void {
  cachedJwks = null;
}

export async function verifyIapRequestHeaders(
  headers: HeaderBag,
  options: VerifyIapRequestOptions
): Promise<IapVerificationResult> {
  const jwt = readHeaderCaseInsensitive(headers, "x-goog-iap-jwt-assertion")?.trim();
  const rawEmailHeader = readHeaderCaseInsensitive(headers, "x-goog-authenticated-user-email")?.trim();
  const rawIdHeader = readHeaderCaseInsensitive(headers, "x-goog-authenticated-user-id")?.trim();

  if (!jwt) {
    if (rawEmailHeader || rawIdHeader) {
      return { ok: false, status: 401, reason: "spoofed_unsigned_iap_headers_rejected" };
    }
    return { ok: false, status: 401, reason: "missing_iap_jwt_assertion" };
  }

  const parts = jwt.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return { ok: false, status: 401, reason: "malformed_iap_jwt" };
  }

  const header = decodeJwtJsonPart(parts[0]);
  const payload = decodeJwtJsonPart(parts[1]);
  if (!header || !payload) {
    return { ok: false, status: 401, reason: "malformed_iap_jwt" };
  }

  if (header["alg"] !== "ES256" || typeof header["kid"] !== "string" || !header["kid"]) {
    return { ok: false, status: 401, reason: "unsupported_iap_alg" };
  }

  const loader = options.jwksLoader ?? createDefaultIapJwksLoader(options.fetchImpl ?? fetch);
  let keys = await loader(false);
  let jwk = keys[header["kid"]];
  if (!jwk) {
    keys = await loader(true);
    jwk = keys[header["kid"]];
  }
  if (!jwk) {
    return { ok: false, status: 401, reason: "unknown_iap_kid" };
  }

  let signatureValid = false;
  try {
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`, "utf8");
    const sig = decodeBase64UrlToBuffer(parts[2]);
    signatureValid = verify("sha256", signingInput, { key: publicKey, dsaEncoding: "ieee-p1363" }, sig);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    return { ok: false, status: 401, reason: "invalid_iap_signature" };
  }

  if (payload["iss"] !== IAP_ISSUER) {
    return { ok: false, status: 401, reason: "invalid_iap_issuer" };
  }
  if (payload["aud"] !== options.expectedAudience) {
    return { ok: false, status: 401, reason: "invalid_iap_audience" };
  }

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const skew = options.clockSkewSeconds ?? 60;
  const exp = typeof payload["exp"] === "number" ? payload["exp"] : Number.NaN;
  const iat = typeof payload["iat"] === "number" ? payload["iat"] : Number.NaN;
  if (!Number.isFinite(exp) || now > exp + skew) {
    return { ok: false, status: 401, reason: "expired_iap_token" };
  }
  if (!Number.isFinite(iat) || iat > now + skew) {
    return { ok: false, status: 401, reason: "future_iap_token" };
  }

  const email = typeof payload["email"] === "string" ? payload["email"].trim().toLowerCase() : "";
  const sub = typeof payload["sub"] === "string" ? payload["sub"].trim() : "";
  if (!email || !sub) {
    return { ok: false, status: 401, reason: "missing_verified_email" };
  }

  if (options.allowedEmails && options.allowedEmails.length > 0) {
    const normalizedAllow = new Set(options.allowedEmails.map((e) => e.trim().toLowerCase()));
    if (!normalizedAllow.has(email)) {
      return { ok: false, status: 403, reason: "email_not_allowlisted" };
    }
  }

  return {
    ok: true,
    status: 200,
    email,
    sub,
    aud: String(payload["aud"]),
    iss: String(payload["iss"]),
  };
}
