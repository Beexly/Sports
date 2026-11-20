import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { IAP_ISSUER, type IapJwk } from "./iap-jwt-verifier";
import { guardIapRoute } from "./iap-route-guard";

function b64Url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signIapToken(
  payload: Record<string, unknown>,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
  kid = "guard-kid-1",
): string {
  const headerB64 = b64Url(JSON.stringify({ alg: "ES256", typ: "JWT", kid }));
  const payloadB64 = b64Url(JSON.stringify(payload));
  const signer = createSign("SHA256");
  signer.update(`${headerB64}.${payloadB64}`);
  signer.end();
  const sig = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${headerB64}.${payloadB64}.${b64Url(sig)}`;
}

describe("guardIapRoute", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pubJwk = { ...(publicKey.export({ format: "jwk" }) as IapJwk), kid: "guard-kid-1", alg: "ES256" };
  const audience = "/projects/401722503155/global/backendServices/gse-internal";

  it("is inert when GSE_IAP_ENFORCE is unset or false", async () => {
    const res = await guardIapRoute(new Headers(), { env: {} });
    expect(res.ok).toBe(true);
    expect(res.enforced).toBe(false);
    expect(res.identity).toBeNull();
  });

  it("fails closed with 500 when enforced without GSE_IAP_AUDIENCE", async () => {
    const res = await guardIapRoute(new Headers(), {
      env: { GSE_IAP_ENFORCE: "true" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.response.status).toBe(500);
    }
  });

  it("fails closed with 401 when enforced without valid header", async () => {
    const nowSec = 1_800_000_000;
    const res = await guardIapRoute(new Headers(), {
      env: { GSE_IAP_ENFORCE: "true", GSE_IAP_AUDIENCE: audience },
      jwks: [pubJwk],
      nowSec,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.response.status).toBe(401);
    }
  });

  it("returns verified identity when valid IAP assertion header is supplied", async () => {
    const nowSec = 1_800_000_000;
    const token = signIapToken(
      {
        iss: IAP_ISSUER,
        aud: audience,
        exp: nowSec + 300,
        iat: nowSec - 5,
        email: "hq@galaxysportsedge.com",
        sub: "accounts.google.com:42",
      },
      privateKey,
    );
    const headers = new Headers({ "x-goog-iap-jwt-assertion": token });
    const res = await guardIapRoute(headers, {
      env: {
        GSE_IAP_ENFORCE: "true",
        GSE_IAP_AUDIENCE: audience,
        GSE_IAP_ALLOWED_EMAILS: "hq@galaxysportsedge.com,ops@galaxysportsedge.com",
      },
      jwks: [pubJwk],
      nowSec,
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.enforced) {
      expect(res.identity.email).toBe("hq@galaxysportsedge.com");
    }
  });
});
