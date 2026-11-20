/**
 * iap-jwt-verifier.ts — Server-Side Identity-Aware Proxy (IAP) JWT Verifier.
 *
 * Enforces Path 36 Course 4 Fail-Closed Surface Separation:
 * Every internal GSE endpoint behind GCP Identity-Aware Proxy MUST verify the
 * `x-goog-iap-jwt-assertion` ES256 token server-side against expected `IAP_AUDIENCE`,
 * `iss === "https://cloud.google.com/iap"`, non-expired `exp`, and Google's IAP JWKS.
 */
import { createVerify, type JsonWebKey as NodeJsonWebKey } from "node:crypto";

export const IAP_ISSUER = "https://cloud.google.com/iap";
export const IAP_JWKS_URL = "https://www.gstatic.com/iap/verify/public_key-jwk";

export interface IapJwk extends NodeJsonWebKey {
  readonly kid?: string;
  readonly kty: string;
  readonly alg?: string;
}

export interface VerifyIapJwtOptions {
  readonly expectedAudience: string;
  readonly allowedEmails?: readonly string[];
  readonly jwks?: ReadonlyArray<IapJwk>;
  readonly fetchImpl?: typeof fetch;
  readonly nowSec?: number;
  readonly clockSkewSec?: number;
}

export interface VerifiedIapIdentity {
  readonly email: string;
  readonly sub: string;
  readonly audience: string;
  readonly issuer: string;
  readonly expiresAt: number;
}

export class IapVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IapVerificationError";
  }
}

function base64UrlDecode(segment: string): Buffer {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function parseJsonSegment<T>(segment: string, label: string): T {
  try {
    return JSON.parse(base64UrlDecode(segment).toString("utf8")) as T;
  } catch {
    throw new IapVerificationError(`Malformed IAP JWT ${label} JSON.`);
  }
}

async function resolveIapJwks(options: VerifyIapJwtOptions): Promise<ReadonlyArray<IapJwk>> {
  if (options.jwks) return options.jwks;
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(IAP_JWKS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new IapVerificationError(`Failed to fetch IAP JWKS: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { keys?: IapJwk[] };
  if (!Array.isArray(body.keys)) {
    throw new IapVerificationError("Invalid IAP JWKS payload.");
  }
  return body.keys;
}

export async function verifyIapJwtAssertion(
  assertionToken: string | null | undefined,
  options: VerifyIapJwtOptions,
): Promise<VerifiedIapIdentity> {
  if (!options.expectedAudience?.trim()) {
    throw new IapVerificationError("IAP_AUDIENCE is not configured; refusing internal request.");
  }
  const token = assertionToken?.trim();
  if (!token) {
    throw new IapVerificationError("Missing x-goog-iap-jwt-assertion header.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new IapVerificationError("Malformed IAP JWT structure.");
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = parseJsonSegment<{ alg?: string; kid?: string }>(headerB64, "header");
  const payload = parseJsonSegment<{
    iss?: string;
    aud?: string;
    exp?: number;
    iat?: number;
    email?: string;
    sub?: string;
  }>(payloadB64, "payload");

  if (header.alg !== "ES256") {
    throw new IapVerificationError(`Unsupported IAP JWT alg "${String(header.alg)}"; expected ES256.`);
  }
  if (payload.iss !== IAP_ISSUER) {
    throw new IapVerificationError(`Invalid IAP issuer "${String(payload.iss)}".`);
  }
  if (payload.aud !== options.expectedAudience.trim()) {
    throw new IapVerificationError(`Invalid IAP audience "${String(payload.aud)}".`);
  }

  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);
  const skew = options.clockSkewSec ?? 30;
  if (typeof payload.exp !== "number" || nowSec > payload.exp + skew) {
    throw new IapVerificationError("IAP JWT assertion is expired.");
  }
  if (typeof payload.iat === "number" && payload.iat > nowSec + skew) {
    throw new IapVerificationError("IAP JWT iat claim is in the future.");
  }

  const jwks = await resolveIapJwks(options);
  const key = header.kid ? jwks.find((k) => k.kid === header.kid) : jwks[0];
  if (!key) {
    throw new IapVerificationError(`No matching IAP JWK found for kid "${String(header.kid)}".`);
  }

  const verifier = createVerify("SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const signatureBytes = base64UrlDecode(sigB64);
  const validSig = verifier.verify(
    {
      key: key as unknown as NodeJsonWebKey,
      format: "jwk",
      dsaEncoding: "ieee-p1363",
    },
    signatureBytes,
  );
  if (!validSig) {
    throw new IapVerificationError("Invalid IAP JWT ES256 signature.");
  }

  const email = (payload.email ?? "").trim();
  if (!email) {
    throw new IapVerificationError("IAP JWT assertion missing email claim.");
  }
  if (options.allowedEmails && options.allowedEmails.length > 0) {
    const allowed = new Set(options.allowedEmails.map((e) => e.trim().toLowerCase()));
    if (!allowed.has(email.toLowerCase())) {
      throw new IapVerificationError(`IAP user "${email}" is not on the internal operator allowlist.`);
    }
  }

  return {
    email,
    sub: String(payload.sub ?? email),
    audience: payload.aud,
    issuer: payload.iss,
    expiresAt: payload.exp,
  };
}
