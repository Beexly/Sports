import { describe, expect, it } from "vitest";
import { awsUriEncode, signRequest } from "./aws-sigv4";

/**
 * Correctness of the SigV4 signer is pinned to AWS's own published
 * `aws-sig-v4-test-suite` "get-vanilla" known-answer vector. These credentials,
 * date, and expected signature are the fixed example values AWS documents; if the
 * canonicalization drifts by a single byte, this test fails with the wrong
 * signature — which is exactly the signal we want, since Bedrock would otherwise
 * reject the request with an opaque SignatureDoesNotMatch at runtime.
 */
describe("signRequest — AWS get-vanilla known-answer vector", () => {
  it("reproduces the documented Authorization header exactly", () => {
    const headers = signRequest({
      method: "GET",
      url: "https://example.amazonaws.com/",
      region: "us-east-1",
      service: "service",
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
      now: new Date("2015-08-30T12:36:00Z"),
    });

    expect(headers["X-Amz-Date"]).toBe("20150830T123600Z");
    expect(headers.Authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
        "SignedHeaders=host;x-amz-date, " +
        "Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
    expect(headers["X-Amz-Security-Token"]).toBeUndefined();
  });

  it("signs an extra header (content-type) into SignedHeaders", () => {
    const headers = signRequest({
      method: "POST",
      url: "https://bedrock-runtime.us-east-1.amazonaws.com/model/m/invoke",
      region: "us-east-1",
      service: "bedrock",
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
      now: new Date("2015-08-30T12:36:00Z"),
    });
    expect(headers.Authorization).toContain("SignedHeaders=content-type;host;x-amz-date");
  });

  it("includes X-Amz-Security-Token when a session token is supplied", () => {
    const headers = signRequest({
      method: "GET",
      url: "https://example.amazonaws.com/",
      region: "us-east-1",
      service: "service",
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
      sessionToken: "FQoGZ-session-token",
      now: new Date("2015-08-30T12:36:00Z"),
    });
    expect(headers["X-Amz-Security-Token"]).toBe("FQoGZ-session-token");
    expect(headers.Authorization).toContain("x-amz-security-token");
  });
});

describe("awsUriEncode", () => {
  it("preserves unreserved characters and slashes in path context", () => {
    expect(awsUriEncode("/model/anthropic.claude-3-5_v2~x/invoke", false)).toBe(
      "/model/anthropic.claude-3-5_v2~x/invoke",
    );
  });

  it("percent-encodes a Bedrock model id's colon and encodes slashes when asked", () => {
    expect(awsUriEncode("anthropic.claude-3-5-sonnet-20241022-v2:0", true)).toBe(
      "anthropic.claude-3-5-sonnet-20241022-v2%3A0",
    );
    expect(awsUriEncode("a/b", true)).toBe("a%2Fb");
    expect(awsUriEncode("a b", true)).toBe("a%20b");
  });
});
