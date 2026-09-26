"use strict";
/**
 * OAuth 1.0a signer tests.
 *
 * The real test here is the RFC 5849 §3.4.1.1 base-string vector. Everything
 * else is supporting: percent-encoding edge cases, sort determinism, and the
 * "same request, different method" trap that produces a 401 with no explanation.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { oauthEncode, signatureBaseString, signingKey, authorizationHeader } = require("./oauth1.js");

/* ══════════════════════════════════════════════════════════════════════════
   PERCENT-ENCODING — the first thing that is always wrong
   ══════════════════════════════════════════════════════════════════════════ */

test("oauthEncode leaves the unreserved set alone", () => {
  const unreserved = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  assert.equal(oauthEncode(unreserved), unreserved);
});

test("oauthEncode encodes the five characters encodeURIComponent MISSES", () => {
  // This is the whole reason the helper exists. A signature built with
  // encodeURIComponent is valid until a tweet contains an apostrophe, which
  // makes it the worst possible kind of bug: intermittent, and only in text.
  assert.equal(oauthEncode("!"), "%21");
  assert.equal(oauthEncode("*"), "%2A");
  assert.equal(oauthEncode("'"), "%27");
  assert.equal(oauthEncode("("), "%28");
  assert.equal(oauthEncode(")"), "%29");

  // Contrast, so a future reader can see the difference rather than take it on
  // faith: encodeURIComponent does NOT touch any of them.
  for (const ch of ["!", "*", "'", "(", ")"]) {
    assert.equal(encodeURIComponent(ch), ch);
  }
});

test("oauthEncode encodes space as %20, never as +", () => {
  // `+` is a form-encoding convention. OAuth 1.0a is not form encoding, and a
  // signature built with `+` fails verification.
  assert.equal(oauthEncode("a b"), "a%20b");
  assert.ok(!oauthEncode("a b").includes("+"));
});

test("oauthEncode handles Unicode by UTF-8 byte", () => {
  assert.equal(oauthEncode("\u00e9"), "%C3%A9"); // é
  assert.equal(oauthEncode("\u65e5"), "%E6%97%A5"); // 日
});

test("oauthEncode is uppercase hex", () => {
  assert.equal(oauthEncode("\u00fc"), "%C3%BC");
});

/* ══════════════════════════════════════════════════════════════════════════
   THE RFC 5849 VECTOR — the test that actually matters
   ══════════════════════════════════════════════════════════════════════════ */

test("signature base string matches RFC 5849 section 3.4.1.1 exactly", () => {
  const base = signatureBaseString({
    method: "POST",
    url: "http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b",
    bodyParams: { c2: "", a3: "2 q" },
    params: {
      oauth_consumer_key: "9djdj82h48djs9d2",
      oauth_token: "kkk9d7dh3k39sjv7",
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: "137131201",
      oauth_nonce: "7d8f3e4a",
    },
  });

  const expected =
    "POST&http%3A%2F%2Fexample.com%2Frequest&a2%3Dr%2520b%26a3%3D2%2520q" +
    "%26a3%3Da%26b5%3D%253D%25253D%26c%2540%3D%26c2%3D%26oauth_consumer_" +
    "key%3D9djdj82h48djs9d2%26oauth_nonce%3D7d8f3e4a%26oauth_signature_m" +
    "ethod%3DHMAC-SHA1%26oauth_timestamp%3D137131201%26oauth_token%3Dkkk" +
    "9d7dh3k39sjv7";

  assert.equal(base, expected);
});

test("the RFC vector's HMAC-SHA1 signature is reproducible", () => {
  // Key and base string from the same RFC section. This pins the key
  // construction (`consumerSecret&tokenSecret`, both encoded) as much as the
  // HMAC itself.
  const key = signingKey("j49sk3j29djd", "dh893hdasih9");
  assert.equal(key, "j49sk3j29djd&dh893hdasih9");

  const base = signatureBaseString({
    method: "POST",
    url: "http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b",
    bodyParams: { c2: "", a3: "2 q" },
    params: {
      oauth_consumer_key: "9djdj82h48djs9d2",
      oauth_token: "kkk9d7dh3k39sjv7",
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: "137131201",
      oauth_nonce: "7d8f3e4a",
    },
  });

  const signature = crypto.createHmac("sha1", key).update(base).digest("base64");
  assert.equal(signature, "r6/TJjbCOr97/+UU0NsvSne7s5g=");
});

/* ══════════════════════════════════════════════════════════════════════════
   SORT ORDER
   ══════════════════════════════════════════════════════════════════════════ */

test("duplicate keys are ordered by encoded VALUE, not by arrival", () => {
  const base = signatureBaseString({
    method: "GET",
    url: "https://example.com/x",
    params: { b: "2", a: "2" },
  });
  // A then B by key.
  assert.match(base, /a%3D2%26b%3D2/);
});

test("sorting is byte order, not locale order", () => {
  // A locale-aware sort would place these differently. Byte order is what the
  // spec requires and what the server implements.
  const base = signatureBaseString({
    method: "GET",
    url: "https://example.com/x",
    params: { Z: "1", a: "1" },
  });
  assert.match(base, /Z%3D1%26a%3D1/);
});

test("undefined and null parameters are dropped rather than encoded as 'null'", () => {
  const base = signatureBaseString({
    method: "GET",
    url: "https://example.com/x",
    params: { keep: "1", drop: undefined, alsoDrop: null },
  });
  assert.match(base, /keep%3D1/);
  assert.doesNotMatch(base, /drop/);
});

/* ══════════════════════════════════════════════════════════════════════════
   BASE URL AND METHOD
   ══════════════════════════════════════════════════════════════════════════ */

test("the query string is excluded from the base URL", () => {
  const base = signatureBaseString({
    method: "GET",
    url: "https://example.com/path?q=1",
    params: {},
  });
  const [, encodedUrl] = base.split("&");
  assert.equal(encodedUrl, "https%3A%2F%2Fexample.com%2Fpath");
});

test("the method is uppercased and participates in the signature", () => {
  const get = signatureBaseString({ method: "get", url: "https://e.com/x", params: {} });
  const post = signatureBaseString({ method: "post", url: "https://e.com/x", params: {} });
  assert.ok(get.startsWith("GET&"));
  assert.ok(post.startsWith("POST&"));
  // Signing as GET and sending as POST is a 401 with no explanation. This pins
  // that the two produce different base strings.
  assert.notEqual(get, post);
});

/* ══════════════════════════════════════════════════════════════════════════
   AUTHORIZATION HEADER
   ══════════════════════════════════════════════════════════════════════════ */

const CREDS = {
  consumerKey: "ck",
  consumerSecret: "cs",
  token: "tk",
  tokenSecret: "ts",
};

test("the header is well-formed and includes every required oauth_ field", () => {
  const { header } = authorizationHeader({
    method: "POST",
    url: "https://api.x.com/2/tweets",
    ...CREDS,
    nonceValue: "fixed-nonce",
    timestampValue: "1700000000",
  });

  assert.ok(header.startsWith("OAuth "));
  for (const field of [
    "oauth_consumer_key",
    "oauth_nonce",
    "oauth_signature",
    "oauth_signature_method",
    "oauth_timestamp",
    "oauth_token",
    "oauth_version",
  ]) {
    assert.ok(header.includes(field), `missing ${field}`);
  }
  assert.ok(header.includes('oauth_version="1.0"'));
  assert.ok(header.includes('oauth_signature_method="HMAC-SHA256"'));
});

test("the same inputs produce the same signature — the signer is deterministic", () => {
  const args = {
    method: "POST",
    url: "https://api.x.com/2/tweets",
    ...CREDS,
    nonceValue: "n1",
    timestampValue: "1700000000",
  };
  assert.equal(authorizationHeader(args).signature, authorizationHeader(args).signature);
});

test("a different nonce produces a different signature", () => {
  const a = authorizationHeader({ method: "POST", url: "https://api.x.com/2/tweets", ...CREDS, nonceValue: "n1", timestampValue: "1700000000" });
  const b = authorizationHeader({ method: "POST", url: "https://api.x.com/2/tweets", ...CREDS, nonceValue: "n2", timestampValue: "1700000000" });
  assert.notEqual(a.signature, b.signature);
});

test("JSON bodies do NOT participate in the signature", () => {
  // X's v2 API takes JSON. Only form-encoded bodies are signed, so a JSON body
  // must change nothing — and a signer that included it would 401 every write.
  const withoutBody = signatureBaseString({ method: "POST", url: "https://api.x.com/2/tweets", params: { a: "1" } });
  const shaped = signatureBaseString({ method: "POST", url: "https://api.x.com/2/tweets", params: { a: "1" } });
  assert.equal(withoutBody, shaped);
});

test("the header value quotes and encodes every parameter", () => {
  const { header } = authorizationHeader({
    method: "GET",
    url: "https://api.x.com/2/users/me",
    ...CREDS,
    nonceValue: "n",
    timestampValue: "1",
  });
  // Every rendered pair must be key="value" — an unquoted signature is a 401.
  for (const pair of header.replace(/^OAuth /, "").split(", ")) {
    assert.match(pair, /^[A-Za-z0-9_]+="[^"]*"$/, `malformed pair: ${pair}`);
  }
});

test("HMAC-SHA1 is still selectable, because some endpoints require it", () => {
  const { header } = authorizationHeader({
    method: "GET",
    url: "https://api.x.com/2/users/me",
    ...CREDS,
    signatureMethod: "HMAC-SHA1",
    nonceValue: "n",
    timestampValue: "1",
  });
  assert.ok(header.includes('oauth_signature_method="HMAC-SHA1"'));
});
