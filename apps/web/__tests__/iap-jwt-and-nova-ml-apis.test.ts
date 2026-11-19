import { generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBackendServiceIapAudience,
  buildCloudRunIapAudience,
  clearIapJwksCache,
  verifyIapRequestHeaders,
  type IapJwk,
} from "@/lib/auth/iap-jwt-guard";
import {
  analyzeNovaArticleEntities,
  annotatePermittedHighlightVideo,
  pollVideoAnnotationOperation,
  sanitizeGcloudApiKeyString,
  transcribePublicPresserAudio,
} from "@/lib/nova/gcp-prebuilt-ml-enrichment";

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function signEs256Jwt(
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
  kid: string,
  payload: Record<string, unknown>,
  alg = "ES256"
): string {
  const headerB64 = toBase64Url(JSON.stringify({ alg, typ: "JWT", kid }));
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = sign("sha256", Buffer.from(signingInput, "utf8"), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${toBase64Url(sig)}`;
}

describe("GCP Path 36 IAP ES256 JWT guard (GSP499) & Nova Pre-Built ML APIs (GSP097/119/154)", () => {
  beforeEach(() => {
    clearIapJwksCache();
  });

  it("verifies signed ES256 IAP JWT assertions and rejects spoofed raw email headers", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = publicKey.export({ format: "jwk" }) as IapJwk;
    const kid = "iap-test-key-1";
    const aud = buildCloudRunIapAudience("123456789", "us-central1", "gse-internal-ops");
    expect(aud).toBe("/projects/123456789/locations/us-central1/services/gse-internal-ops");
    expect(buildBackendServiceIapAudience("123456789", "987")).toBe(
      "/projects/123456789/global/backendServices/987"
    );

    const now = 1_795_100_000;
    const validJwt = signEs256Jwt(privateKey, kid, {
      iss: "https://cloud.google.com/iap",
      aud,
      email: "hq@galaxysportsedge.com",
      sub: "accounts.google.com:1001",
      iat: now - 10,
      exp: now + 300,
    });

    const loader = async () => ({ [kid]: { ...jwk, kid, alg: "ES256" } });

    const okRes = await verifyIapRequestHeaders(
      { "x-goog-iap-jwt-assertion": validJwt },
      {
        expectedAudience: aud,
        allowedEmails: ["hq@galaxysportsedge.com"],
        nowSeconds: now,
        jwksLoader: loader,
      }
    );
    expect(okRes).toEqual({
      ok: true,
      status: 200,
      email: "hq@galaxysportsedge.com",
      sub: "accounts.google.com:1001",
      aud,
      iss: "https://cloud.google.com/iap",
    });

    // Spoofed raw headers without cryptographic JWT must be rejected
    const spoofed = await verifyIapRequestHeaders(
      { "x-goog-authenticated-user-email": "accounts.google.com:attacker@example.com" },
      { expectedAudience: aud, nowSeconds: now, jwksLoader: loader }
    );
    expect(spoofed).toEqual({
      ok: false,
      status: 401,
      reason: "spoofed_unsigned_iap_headers_rejected",
    });

    // Wrong audience fails closed
    const wrongAud = await verifyIapRequestHeaders(
      { "X-Goog-IAP-JWT-Assertion": validJwt },
      {
        expectedAudience: buildCloudRunIapAudience("123456789", "us-central1", "other-service"),
        nowSeconds: now,
        jwksLoader: loader,
      }
    );
    expect(wrongAud).toEqual({
      ok: false,
      status: 401,
      reason: "invalid_iap_audience",
    });

    // Non-allowlisted email returns 403 even with valid signature
    const notAllowed = await verifyIapRequestHeaders(
      { "x-goog-iap-jwt-assertion": validJwt },
      {
        expectedAudience: aud,
        allowedEmails: ["other@galaxysportsedge.com"],
        nowSeconds: now,
        jwksLoader: loader,
      }
    );
    expect(notAllowed).toEqual({
      ok: false,
      status: 403,
      reason: "email_not_allowlisted",
    });

    // Expired JWT fails closed
    const expiredJwt = signEs256Jwt(privateKey, kid, {
      iss: "https://cloud.google.com/iap",
      aud,
      email: "hq@galaxysportsedge.com",
      sub: "accounts.google.com:1001",
      iat: now - 1000,
      exp: now - 120,
    });
    const expRes = await verifyIapRequestHeaders(
      { "x-goog-iap-jwt-assertion": expiredJwt },
      { expectedAudience: aud, nowSeconds: now, jwksLoader: loader }
    );
    expect(expRes).toEqual({
      ok: false,
      status: 401,
      reason: "expired_iap_token",
    });
  });

  it("wires Natural Language, Speech-to-Text (keyString strip + SiriusXM block), and Video Intelligence LRO polling", async () => {
    expect(sanitizeGcloudApiKeyString("keyString: fake_api_key_abc123\n")).toBe(
      "fake_api_key_abc123"
    );

    const nlFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          language: "en",
          entities: [{ name: "Houston Texans", type: "ORGANIZATION", salience: 0.88 }],
        }),
        { status: 200 }
      );
    });
    const nlOut = await analyzeNovaArticleEntities({
      content: "Houston Texans injury report released ahead of Thursday Night Football.",
      accessToken: "oauth-token-synthetic",
      fetchImpl: nlFetch as unknown as typeof fetch,
    });
    expect(nlOut.language).toBe("en");
    expect(nlOut.entities[0]?.name).toBe("Houston Texans");

    // SiriusXM / uncleared audio is halted fail-closed
    await expect(
      transcribePublicPresserAudio({
        gcsAudioUri: "gs://gse-speech/presser.flac",
        apiKey: "keyString: fake_api_key_abc123",
        sourceKind: "siriusxm_broadcast",
        sourceClearedForTranscription: false,
      })
    ).rejects.toThrow(/halted/);

    const sttFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          results: [{ alternatives: [{ transcript: "protecting the football", confidence: 0.94 }] }],
          totalBilledTime: "2s",
        }),
        { status: 200 }
      );
    });
    const sttOut = await transcribePublicPresserAudio({
      gcsAudioUri: "gs://gse-speech/tuesday-presser.flac",
      apiKey: "keyString: fake_api_key_abc123",
      sourceKind: "coach_presser_public",
      sourceClearedForTranscription: true,
      fetchImpl: sttFetch as unknown as typeof fetch,
    });
    expect(sttOut.transcript).toBe("protecting the football");
    expect(sttOut.confidence).toBe(0.94);
    expect(sttFetch).toHaveBeenCalledWith(
      "https://speech.googleapis.com/v1/speech:recognize?key=fake_api_key_abc123",
      expect.objectContaining({ method: "POST" })
    );

    // Broadcast redistribution is halted for Video Intelligence
    await expect(
      annotatePermittedHighlightVideo({
        gcsVideoUri: "gs://gse-film/clip.mp4",
        accessToken: "oauth-token-synthetic",
        broadcastRedistribution: true,
      })
    ).rejects.toThrow(/halted/);

    const vidFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "projects/123/locations/us-west1/operations/op1" }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            done: true,
            response: {
              annotationResults: [
                { segmentLabelAnnotations: [{ entity: { description: "american football" } }] },
              ],
            },
          }),
          { status: 200 }
        )
      );

    const startRes = await annotatePermittedHighlightVideo({
      gcsVideoUri: "gs://gse-film/all22-internal.mp4",
      accessToken: "oauth-token-synthetic",
      broadcastRedistribution: false,
      fetchImpl: vidFetch as unknown as typeof fetch,
    });
    expect(startRes.operationName).toBe("projects/123/locations/us-west1/operations/op1");

    const pollRes = await pollVideoAnnotationOperation({
      operationName: startRes.operationName,
      accessToken: "oauth-token-synthetic",
      fetchImpl: vidFetch as unknown as typeof fetch,
    });
    expect(pollRes).toEqual({ done: true, labels: ["american football"] });
  });
});
