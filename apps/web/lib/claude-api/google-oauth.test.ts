import { describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, createVerify } from "node:crypto";
import {
  parseServiceAccountJson,
  buildSignedJwt,
  fetchAccessToken,
  GoogleOAuthError,
} from "./google-oauth";

function keypair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

function decodeSegment(seg: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
}

describe("parseServiceAccountJson", () => {
  it("parses a valid key and rejects incomplete/invalid JSON", () => {
    const raw = JSON.stringify({ client_email: "svc@proj.iam.gserviceaccount.com", private_key: "PEM" });
    expect(parseServiceAccountJson(raw)?.client_email).toBe("svc@proj.iam.gserviceaccount.com");
    expect(parseServiceAccountJson("{not json")).toBeNull();
    expect(parseServiceAccountJson(JSON.stringify({ client_email: "x" }))).toBeNull();
    expect(parseServiceAccountJson(JSON.stringify({ client_email: "", private_key: "" }))).toBeNull();
  });
});

describe("buildSignedJwt", () => {
  it("produces an RS256 JWT whose signature verifies and whose claims are correct", () => {
    const { publicKey, privateKey } = keypair();
    const key = {
      client_email: "svc@proj.iam.gserviceaccount.com",
      private_key: privateKey,
      token_uri: "https://oauth2.googleapis.com/token",
    };
    const jwt = buildSignedJwt(key, { scope: "scope-x", now: new Date("2026-07-08T00:00:00Z") });
    const [h, c, sig] = jwt.split(".");

    // signature verifies against the public half
    const ok = createVerify("RSA-SHA256")
      .update(`${h}.${c}`)
      .verify(publicKey, Buffer.from(sig!.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
    expect(ok).toBe(true);

    expect(decodeSegment(h!)).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = decodeSegment(c!);
    expect(claims["iss"]).toBe("svc@proj.iam.gserviceaccount.com");
    expect(claims["scope"]).toBe("scope-x");
    expect(claims["aud"]).toBe("https://oauth2.googleapis.com/token");
    expect(claims["exp"]).toBe((claims["iat"] as number) + 3600);
  });
});

describe("fetchAccessToken", () => {
  const { privateKey } = keypair();
  const key = { client_email: "svc@proj.iam.gserviceaccount.com", private_key: privateKey };

  it("exchanges the JWT and returns the token with a computed expiry", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "ya29.abc", expires_in: 3599 }),
      text: async () => "",
    })) as unknown as typeof fetch;

    const now = new Date("2026-07-08T00:00:00Z");
    const result = await fetchAccessToken(key, { scope: "s", now, fetchImpl });
    expect(result.token).toBe("ya29.abc");
    expect(result.expiresAtMs).toBe(now.getTime() + 3599 * 1000);

    const call = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    expect(call[0]).toBe("https://oauth2.googleapis.com/token");
    const init = call[1] as RequestInit;
    expect(String(init.body)).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");
    expect(String(init.body)).toContain("assertion=");
  });

  it("throws GoogleOAuthError on a non-OK response or a missing token", async () => {
    const bad = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => "denied" })) as unknown as typeof fetch;
    await expect(fetchAccessToken(key, { scope: "s", now: new Date("2026-07-08T00:00:00Z"), fetchImpl: bad })).rejects.toBeInstanceOf(
      GoogleOAuthError,
    );

    const noToken = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ expires_in: 10 }), text: async () => "" })) as unknown as typeof fetch;
    await expect(fetchAccessToken(key, { scope: "s", now: new Date("2026-07-08T00:00:00Z"), fetchImpl: noToken })).rejects.toBeInstanceOf(
      GoogleOAuthError,
    );
  });
});
