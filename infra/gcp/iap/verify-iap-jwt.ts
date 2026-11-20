// gcp/iap/verify-iap-jwt.ts
// Server-side Google Identity-Aware Proxy (IAP) JWT verifier for internal GSE/GSI surfaces.
// Per GSP499: NEVER trust raw X-Goog-Authenticated-User-Email headers (forgeable if IAP is off).
// Always verify x-goog-iap-jwt-assertion against IAP_AUDIENCE:
//   /projects/<PROJECT_NUMBER>/locations/<REGION>/services/<SERVICE_NAME>

import { OAuth2Client } from "google-auth-library";

const oauthClient = new OAuth2Client();

export interface VerifiedIapIdentity {
  email: string;
  sub: string;
}

export async function verifyIapJwt(
  jwtAssertion: string | undefined,
  expectedAudience = process.env.IAP_AUDIENCE
): Promise<VerifiedIapIdentity> {
  if (!jwtAssertion) {
    throw new Error("Missing x-goog-iap-jwt-assertion header");
  }
  if (!expectedAudience) {
    throw new Error("IAP_AUDIENCE environment variable is not configured");
  }

  const { pubkeys } = await oauthClient.getIapPublicKeys();
  const ticket = await oauthClient.verifySignedJwtWithCertsAsync(
    jwtAssertion,
    pubkeys,
    expectedAudience,
    ["https://cloud.google.com/iap"]
  );

  const payload = ticket.getPayload();
  if (!payload?.email || !payload?.sub) {
    throw new Error("IAP JWT missing required identity claims");
  }

  return {
    email: payload.email,
    sub: payload.sub,
  };
}
