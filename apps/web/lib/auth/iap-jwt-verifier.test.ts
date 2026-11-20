import { describe, expect, it } from "vitest";
import { createSign, generateKeyPairSync } from "node:crypto";
import {
  IAP_ISSUER,
  IapVerificationError,
  verifyIapJwtAssertion,
  type IapJwk,
} from "./iap-jwt-verifier";

function b64Url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signTestIapJwt(
  payload: Record<string, unknown>,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
  kid = "test-kid-1",
): string {
  const headerB64 = b64Url(JSON.stringify({ alg: "ES256", typ: "JWT", kid }));
  const payloadB64 = b64Url(JSON.stringify(payload));
  const signer = createSign("SHA256");
  signer.update(`${headerB64}.${payloadB64}`);
  signer.end();
  const sig = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${headerB64}.${payloadB64}.${b64Url(sig)}`;
}

describe("verifyIapJwtAssertion", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pubJwk = { ...(publicKey.export({ format: "jwk" }) as IapJwk), kid: "test-kid-1", alg: "ES256" };
  const audience = "/projects/401722503155/global/backendServices/gse-internal";

  it("verifies valid ES256 IAP assertion against audience, issuer, and allowlist", async () => {
    const nowSec = 1_800_000_000;
    const token = signTestIapJwt(
      {
        iss: IAP_ISSUER,
        aud: audience,
        exp: nowSec + 300,
        iat: nowSec - 10,
        email: "hq@galaxysportsedge.com",
        sub: "accounts.google.com:123",
      },
      privateKey,
    );

    const id = await verifyIapJwtAssertion(token, {
      expectedAudience: audience,
      allowedEmails: ["hq@galaxysportsedge.com"],
      jwks: [pubJwk],
      nowSec,
    });
    expect(id.email).toBe("hq@galaxysportsedge.com");
    expect(id.audience).toBe(audience);
  });

  it("fails closed on missing header, wrong audience, expired exp, or bad signature", async () => {
    const nowSec = 1_800_000_000;
    await expect(
      verifyIapJwtAssertion(null, { expectedAudience: audience, jwks: [pubJwk], nowSec }),
    ).rejects.toBeInstanceOf(IapVerificationError);

    const wrongAud = signTestIapJwt(
      { iss: IAP_ISSUER, aud: "/wrong", exp: nowSec + 300, email: "hq@galaxysportsedge.com" },
      privateKey,
    );
    await expect(
      verifyIapJwtAssertion(wrongAud, { expectedAudience: audience, jwks: [pubJwk], nowSec }),
    ).rejects.toThrow(/audience/);

    const expired = signTestIapJwt(
      { iss: IAP_ISSUER, aud: audience, exp: nowSec - 120, email: "hq@galaxysportsedge.com" },
      privateKey,
    );
    await expect(
      verifyIapJwtAssertion(expired, { expectedAudience: audience, jwks: [pubJwk], nowSec }),
    ).rejects.toThrow(/expired/);
  });
});
