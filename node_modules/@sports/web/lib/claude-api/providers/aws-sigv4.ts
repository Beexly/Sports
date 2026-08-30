/**
 * AWS Signature Version 4 signer — zero-dependency, using only Node's built-in
 * `crypto`. Exists so we can call AWS Bedrock (Claude, billable to AWS Activate
 * GenAI credits) WITHOUT pulling in the full AWS SDK, keeping the dependency
 * surface — and the audit surface — small.
 *
 * Correctness is pinned by a known-answer test against AWS's published
 * `aws-sig-v4-test-suite` "get-vanilla" vector (see aws-sigv4.test.ts). Do not
 * "simplify" the canonicalization steps without re-running that vector: SigV4 is
 * unforgiving and a single wrong byte yields an opaque `SignatureDoesNotMatch`.
 *
 * Scope: this signs a single request. It does NOT manage credentials, refresh
 * STS tokens, or read the environment — the caller supplies keys and an injected
 * clock (`now`) so the signer is pure and deterministic.
 */
import { createHash, createHmac } from "node:crypto";

export interface SigV4Input {
  readonly method: string;
  /** Full request URL, e.g. https://bedrock-runtime.us-east-1.amazonaws.com/model/.../invoke */
  readonly url: string;
  readonly region: string;
  readonly service: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** Optional STS session token (temporary credentials). Signed as x-amz-security-token. */
  readonly sessionToken?: string;
  /** Extra headers to include in the signature (e.g. content-type). Names are lowercased. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Request body used for the payload hash. Defaults to "". */
  readonly body?: string;
  /**
   * Pre-encoded canonical URI path. Supply this when the path contains characters
   * that must be percent-encoded for signing but sent verbatim on the wire (e.g. a
   * Bedrock model id's ':'). If omitted, the path from `url` is AWS-URI-encoded once.
   * Passing an already-encoded path here avoids the classic double-encoding bug.
   */
  readonly canonicalUri?: string;
  /** Injected clock — the signer never reads the ambient time itself. */
  readonly now: Date;
}

export interface SignedHeaders {
  readonly Authorization: string;
  readonly "X-Amz-Date": string;
  /** Present only when a session token was supplied. */
  readonly "X-Amz-Security-Token"?: string;
}

const ALGORITHM = "AWS4-HMAC-SHA256";

/**
 * AWS-flavoured RFC-3986 percent-encoding. Unreserved chars (A-Z a-z 0-9 - _ . ~)
 * pass through; everything else is uppercase-hex percent-encoded. '/' is preserved
 * in path context (encodeSlash=false) and encoded in query/segment context.
 * Byte-wise so multi-byte UTF-8 is encoded correctly.
 */
export function awsUriEncode(input: string, encodeSlash: boolean): string {
  let out = "";
  for (const byte of Buffer.from(input, "utf8")) {
    const isUnreserved =
      (byte >= 0x41 && byte <= 0x5a) || // A-Z
      (byte >= 0x61 && byte <= 0x7a) || // a-z
      (byte >= 0x30 && byte <= 0x39) || // 0-9
      byte === 0x2d || // -
      byte === 0x5f || // _
      byte === 0x2e || // .
      byte === 0x7e; // ~
    if (isUnreserved) {
      out += String.fromCharCode(byte);
    } else if (byte === 0x2f) {
      out += encodeSlash ? "%2F" : "/";
    } else {
      out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return out;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

/** ISO instant → SigV4 amz-date "YYYYMMDDTHHMMSSZ" (UTC, no millis). */
function amzDate(now: Date): string {
  // "2015-08-30T12:36:00.000Z" -> "20150830T123600Z"
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function canonicalQuery(url: URL): string {
  const params: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => params.push([key, value]));
  params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
  return params
    .map(([k, v]) => `${awsUriEncode(k, true)}=${awsUriEncode(v, true)}`)
    .join("&");
}

/**
 * Sign a request. Returns the headers to merge into the outgoing request. Host and
 * X-Amz-Date are always signed; any header in `headers` (plus x-amz-security-token
 * when a session token is present) is signed too, sorted lexicographically.
 */
export function signRequest(input: SigV4Input): SignedHeaders {
  const url = new URL(input.url);
  const amz = amzDate(input.now);
  const dateStamp = amz.slice(0, 8);
  const scope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;

  // Build the set of signed headers (lowercased names → trimmed values).
  const headerMap = new Map<string, string>();
  headerMap.set("host", url.host);
  headerMap.set("x-amz-date", amz);
  if (input.sessionToken) headerMap.set("x-amz-security-token", input.sessionToken);
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    headerMap.set(name.toLowerCase(), value.trim().replace(/\s+/g, " "));
  }
  const sortedNames = [...headerMap.keys()].sort();
  const canonicalHeaders = sortedNames.map((n) => `${n}:${headerMap.get(n)}\n`).join("");
  const signedHeaders = sortedNames.join(";");

  const canonicalUri = input.canonicalUri ?? awsUriEncode(decodeURIComponent(url.pathname), false);
  const payloadHash = sha256Hex(input.body ?? "");

  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalUri,
    canonicalQuery(url),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [ALGORITHM, amz, scope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${input.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, input.service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const authorization =
    `${ALGORITHM} Credential=${input.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authorization,
    "X-Amz-Date": amz,
    ...(input.sessionToken ? { "X-Amz-Security-Token": input.sessionToken } : {}),
  };
}
