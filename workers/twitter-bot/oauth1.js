"use strict";
/**
 * OAuth 1.0a request signing for the X API v2.
 *
 * WHY OAUTH 1.0a AND NOT BEARER: the GSE bot posts as a user account. An app-only
 * bearer token cannot create a tweet. Only a user-context credential can, and for
 * a single-account broadcast bot that credential is the four-part OAuth 1.0a set
 * (consumer key/secret, access token/secret).
 *
 * WHY THIS IS HAND-WRITTEN: the signing algorithm is 60 lines of deterministic
 * HMAC and percent-encoding. A dependency here would be a supply-chain surface on
 * the credential that can speak as the brand, in exchange for code that RFC 5849
 * publishes test vectors for. Those vectors are used as tests below.
 *
 * THE THREE THINGS THAT ARE ALWAYS WRONG IN HAND-ROLLED OAUTH:
 *
 *   1. Percent-encoding. RFC 5849 §3.6 requires encoding every byte outside
 *      `A-Za-z0-9-._~` — including `!`, `*`, `'`, `(`, `)`, which
 *      `encodeURIComponent` leaves alone. A signature made with
 *      `encodeURIComponent` verifies for most requests and fails for some, which
 *      is the worst possible failure distribution.
 *   2. Parameter ordering. The signature base string sorts by encoded key, then
 *      by encoded value, as BYTE order, not locale order.
 *   3. Duplicate keys in the body. JSON keys must be excluded from the signature
 *      base; only form-encoded bodies participate.
 *
 * `oauthEncode`, the sort, and the exclusion are the three things the tests below
 * actually pin.
 */

const crypto = require("node:crypto");

/**
 * RFC 5849 §3.6 percent-encoding.
 *
 * Note the explicit unreserved set. `encodeURIComponent` does NOT encode
 * `! * ' ( )`, so using it produces a signature that is valid for most inputs and
 * invalid for any input containing one of those characters — a bug that appears
 * only when a tweet happens to contain an apostrophe.
 *
 * ENCODES BY UTF-8 BYTE, not by UTF-16 code unit. Iterating `charCodeAt` encodes
 * "é" as `%E9`; the spec requires `%C3%A9`. The RFC's own test vector is pure
 * ASCII, so it cannot catch this — which is exactly why there is a separate
 * Unicode test. Signing a tweet containing an em-dash or an accented player name
 * would 401 without it.
 */
function oauthEncode(value) {
  const bytes = Buffer.from(String(value), "utf8");
  let out = "";
  for (const byte of bytes) {
    const ch = String.fromCharCode(byte);
    out += /[A-Za-z0-9\-._~]/.test(ch)
      ? ch
      : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return out;
}

/** A nonce. 32 bytes of hex is well inside the spec's recommendation. */
function nonce() {
  return crypto.randomBytes(16).toString("hex");
}

/** Unix seconds. The spec measures the timestamp in seconds, not milliseconds. */
function timestamp(now = Date.now()) {
  return String(Math.floor(now / 1000));
}

/**
 * Build the signature base string (RFC 5849 §3.4.1.1).
 *
 * `oauth_*` params, query params, and (for form-encoded requests only) body
 * params are collected, encoded, sorted, and joined. JSON bodies contribute
 * NOTHING — X's v2 API takes JSON, so in practice the body never participates,
 * and the exclusion is explicit rather than accidental.
 */
function signatureBaseString({ method, url, params, bodyParams = {} }) {
  const parsed = new URL(url);

  // Query params from the URL, minus the query string itself.
  const collected = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    collected.push([key, value]);
  }
  // Form-encoded body params DO participate (RFC 5849 §3.4.1.1). JSON bodies do
  // not — see the note at the top of the file.
  for (const [key, value] of Object.entries(bodyParams)) {
    if (value === undefined || value === null) continue;
    collected.push([key, String(value)]);
  }
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    collected.push([key, String(value)]);
  }

  const encoded = collected
    .map(([k, v]) => [oauthEncode(k), oauthEncode(v)])
    // Byte order on the ENCODED key, then the encoded value. Locale-aware
    // comparison would order accented characters differently and break the
    // signature for any Unicode in a parameter.
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));

  const normalised = encoded.map(([k, v]) => `${k}=${v}`).join("&");

  // The base URL excludes the query string and the default port.
  const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;

  return [method.toUpperCase(), oauthEncode(baseUrl), oauthEncode(normalised)].join("&");
}

/** The signing key: both secrets, each percent-encoded, joined with `&`. */
function signingKey(consumerSecret, tokenSecret) {
  return `${oauthEncode(consumerSecret)}&${oauthEncode(tokenSecret)}`;
}

/**
 * Sign a request and return the `Authorization` header value.
 *
 * `method` must be the real HTTP method — the SAME request signed as GET and
 * sent as POST fails with `401 Unauthorized` and no further explanation, which
 * is why this function takes it rather than assuming.
 */
function authorizationHeader({
  method,
  url,
  consumerKey,
  consumerSecret,
  token,
  tokenSecret,
  extraParams = {},
  bodyParams = {},
  nonceValue = nonce(),
  timestampValue = timestamp(),
  signatureMethod = "HMAC-SHA256",
}) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonceValue,
    oauth_signature_method: signatureMethod,
    oauth_timestamp: timestampValue,
    oauth_token: token,
    oauth_version: "1.0",
  };

  const base = signatureBaseString({
    method,
    url,
    params: { ...oauthParams, ...extraParams },
    bodyParams,
  });

  const algorithm = signatureMethod === "HMAC-SHA1" ? "sha1" : "sha256";
  const signature = crypto
    .createHmac(algorithm, signingKey(consumerSecret, tokenSecret))
    .update(base)
    .digest("base64");

  const headerParams = { ...oauthParams, oauth_signature: signature };
  const rendered = Object.keys(headerParams)
    .sort()
    .map((k) => `${oauthEncode(k)}="${oauthEncode(headerParams[k])}"`)
    .join(", ");

  return { header: `OAuth ${rendered}`, signature, baseString: base };
}

module.exports = {
  oauthEncode,
  signatureBaseString,
  signingKey,
  authorizationHeader,
  nonce,
  timestamp,
};
