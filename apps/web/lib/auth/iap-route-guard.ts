/**
 * Optional, fail-closed Google Cloud IAP route assertion guard.
 *
 * Inert by default (`GSE_IAP_ENFORCE !== "true"`) so local tests and direct
 * Next.js/Vercel deployments are unaffected. When `GSE_IAP_ENFORCE === "true"`,
 * requires a valid `GSE_IAP_AUDIENCE` and a valid `x-goog-iap-jwt-assertion`
 * ES256 token verified against Google's IAP JWK set.
 */

import { NextResponse } from "next/server";
import {
  IapVerificationError,
  verifyIapJwtAssertion,
  type VerifiedIapIdentity,
  type IapJwk,
} from "./iap-jwt-verifier";

/**
 * Public alias for guard consumers. The verifier exports VerifiedIapIdentity;
 * the waves-1-4 import referenced a phantom `IapIdentity` export.
 */
export type IapIdentity = VerifiedIapIdentity;

export interface IapRouteGuardOptions {
  readonly env?: Record<string, string | undefined>;
  readonly jwks?: readonly IapJwk[];
  readonly nowSec?: number;
}

export type IapRouteGuardResult =
  | { readonly ok: true; readonly enforced: false; readonly identity: null }
  | { readonly ok: true; readonly enforced: true; readonly identity: IapIdentity }
  | { readonly ok: false; readonly enforced: true; readonly response: NextResponse };

function parseAllowedEmails(raw: string | undefined): readonly string[] | undefined {
  if (!raw) return undefined;
  const parsed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

export async function guardIapRoute(
  headers: Pick<Headers, "get">,
  options: IapRouteGuardOptions = {},
): Promise<IapRouteGuardResult> {
  const env = options.env ?? process.env;
  if (env["GSE_IAP_ENFORCE"]?.trim().toLowerCase() !== "true") {
    return { ok: true, enforced: false, identity: null };
  }

  const expectedAudience = env["GSE_IAP_AUDIENCE"]?.trim() ?? "";
  if (!expectedAudience) {
    return {
      ok: false,
      enforced: true,
      response: NextResponse.json(
        { error: "IAP enforcement enabled but GSE_IAP_AUDIENCE is not configured." },
        { status: 500 },
      ),
    };
  }

  const assertionHeader = headers.get("x-goog-iap-jwt-assertion");
  try {
    const identity = await verifyIapJwtAssertion(assertionHeader, {
      expectedAudience,
      allowedEmails: parseAllowedEmails(env["GSE_IAP_ALLOWED_EMAILS"]),
      jwks: options.jwks,
      nowSec: options.nowSec,
    });
    return { ok: true, enforced: true, identity };
  } catch (err) {
    const message = err instanceof IapVerificationError ? err.message : "Invalid IAP assertion";
    return {
      ok: false,
      enforced: true,
      response: NextResponse.json({ error: message }, { status: 401 }),
    };
  }
}
