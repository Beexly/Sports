/**
 * crypto-utils.test.ts
 *
 * Comprehensive tests for the pure-crypto utility library.
 * All hash vectors verified against known-good reference values.
 */

import { describe, it, expect } from "vitest";
import {
  // Hashing
  sha256,
  sha256Buffer,
  sha1,
  md5,
  sha512,
  // HMAC
  hmacSha256,
  hmacSha512,
  verifyHmac,
  // Base64
  base64Encode,
  base64Decode,
  base64DecodeBuffer,
  base64UrlEncode,
  base64UrlDecode,
  base64UrlDecodeBuffer,
  isBase64,
  isBase64Url,
  // UUID
  uuidV4,
  uuidV4Bulk,
  isUuid,
  isUuidV4,
  parseUuid,
  nilUuid,
  uuidToBytes,
  bytesToUuid,
  // Random
  secureRandomBytes,
  randomHex,
  randomToken,
  randomInt,
  randomFloat,
  randomChoice,
  randomShuffle,
  randomSample,
  // Password-like
  generatePassword,
  generatePinCode,
  generateApiKey,
  constantTimeEqual,
  // Content integrity
  hashObject,
  hashArray,
  merkleRoot,
  verifyMerkleProof,
  // Encoding
  hexEncode,
  hexDecode,
  isHex,
} from "@/lib/utils/crypto-utils";

// ===========================================================================
// Hashing
// ===========================================================================

describe("sha256", () => {
  it("returns known vector for empty string", () => {
    expect(sha256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("returns known vector for 'hello'", () => {
    expect(sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("returns known vector for 'abc'", () => {
    expect(sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("returns lowercase hex only", () => {
    expect(sha256("test")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("accepts a Buffer", () => {
    expect(sha256(Buffer.from("hello"))).toBe(sha256("hello"));
  });

  it("is deterministic", () => {
    expect(sha256("same input")).toBe(sha256("same input"));
  });

  it("produces different outputs for different inputs", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });
});

describe("sha256Buffer", () => {
  it("returns a Buffer of length 32", () => {
    expect(sha256Buffer("hello")).toBeInstanceOf(Buffer);
    expect(sha256Buffer("hello").length).toBe(32);
  });

  it("matches hex output of sha256", () => {
    const buf = sha256Buffer("hello");
    expect(buf.toString("hex")).toBe(sha256("hello"));
  });
});

describe("sha1", () => {
  it("returns known vector for 'hello'", () => {
    expect(sha1("hello")).toBe("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  });

  it("returns 40 hex characters", () => {
    expect(sha1("test")).toMatch(/^[0-9a-f]{40}$/);
  });

  it("accepts a Buffer", () => {
    expect(sha1(Buffer.from("hello"))).toBe(sha1("hello"));
  });
});

describe("md5", () => {
  it("returns known vector for 'hello'", () => {
    expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  it("returns 32 hex characters", () => {
    expect(md5("test")).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns known vector for empty string", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });
});

describe("sha512", () => {
  it("returns 128 hex characters", () => {
    expect(sha512("hello")).toMatch(/^[0-9a-f]{128}$/);
  });

  it("returns known vector for 'hello'", () => {
    expect(sha512("hello")).toBe(
      "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
    );
  });

  it("accepts a Buffer", () => {
    expect(sha512(Buffer.from("hello"))).toBe(sha512("hello"));
  });
});

// ===========================================================================
// HMAC
// ===========================================================================

describe("hmacSha256", () => {
  it("returns known HMAC-SHA256 vector", () => {
    // RFC 2202 test vector: key='key', data='The quick brown fox jumps over the lazy dog'
    expect(hmacSha256("key", "The quick brown fox jumps over the lazy dog")).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("returns 64 hex characters", () => {
    expect(hmacSha256("secret", "message")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is sensitive to key changes", () => {
    expect(hmacSha256("key1", "data")).not.toBe(hmacSha256("key2", "data"));
  });

  it("is sensitive to data changes", () => {
    expect(hmacSha256("key", "data1")).not.toBe(hmacSha256("key", "data2"));
  });

  it("accepts Buffer key and data", () => {
    expect(hmacSha256(Buffer.from("key"), Buffer.from("data"))).toBe(
      hmacSha256("key", "data"),
    );
  });
});

describe("hmacSha512", () => {
  it("returns 128 hex characters", () => {
    expect(hmacSha512("key", "data")).toMatch(/^[0-9a-f]{128}$/);
  });

  it("is deterministic", () => {
    expect(hmacSha512("k", "d")).toBe(hmacSha512("k", "d"));
  });

  it("differs from hmacSha256 output", () => {
    expect(hmacSha512("key", "data")).not.toBe(hmacSha256("key", "data"));
  });
});

describe("verifyHmac", () => {
  it("returns true for a matching HMAC", () => {
    const mac = hmacSha256("secret", "payload");
    expect(verifyHmac("secret", "payload", mac)).toBe(true);
  });

  it("returns false for a wrong HMAC", () => {
    expect(verifyHmac("secret", "payload", "deadbeef".repeat(8))).toBe(false);
  });

  it("returns false when the key is wrong", () => {
    const mac = hmacSha256("correct-key", "payload");
    expect(verifyHmac("wrong-key", "payload", mac)).toBe(false);
  });

  it("returns false when the data is tampered", () => {
    const mac = hmacSha256("secret", "original");
    expect(verifyHmac("secret", "modified", mac)).toBe(false);
  });

  it("returns false for a hex string of the wrong length", () => {
    expect(verifyHmac("key", "data", "abc")).toBe(false);
  });
});

// ===========================================================================
// Base64
// ===========================================================================

describe("base64Encode / base64Decode", () => {
  it("encodes 'hello' to known base64", () => {
    expect(base64Encode("hello")).toBe("aGVsbG8=");
  });

  it("round-trips a plain string", () => {
    const original = "Hello, World! 123 #@!";
    expect(base64Decode(base64Encode(original))).toBe(original);
  });

  it("round-trips binary data", () => {
    const buf = Buffer.from([0, 1, 2, 255, 127]);
    expect(base64DecodeBuffer(base64Encode(buf))).toEqual(buf);
  });

  it("encodes a Buffer correctly", () => {
    expect(base64Encode(Buffer.from("hello"))).toBe("aGVsbG8=");
  });

  it("decodes to Buffer correctly", () => {
    expect(base64DecodeBuffer("aGVsbG8=")).toEqual(Buffer.from("hello"));
  });
});

describe("base64UrlEncode / base64UrlDecode", () => {
  it("produces no padding characters", () => {
    expect(base64UrlEncode("hello")).not.toContain("=");
  });

  it("replaces + with - and / with _", () => {
    // Use binary data that produces + or / in standard base64
    const data = Buffer.from([0xfb, 0xff, 0xfe]);
    const urlSafe = base64UrlEncode(data);
    expect(urlSafe).not.toContain("+");
    expect(urlSafe).not.toContain("/");
    expect(urlSafe).not.toContain("=");
  });

  it("round-trips a string", () => {
    const original = "url-safe test string with spaces!";
    expect(base64UrlDecode(base64UrlEncode(original))).toBe(original);
  });

  it("round-trips binary data", () => {
    const buf = Buffer.from([0xfb, 0xff, 0x00, 0xfe, 0x3d]);
    expect(base64UrlDecodeBuffer(base64UrlEncode(buf))).toEqual(buf);
  });

  it("decodes 'aGVsbG8' (no padding) to 'hello'", () => {
    expect(base64UrlDecode("aGVsbG8")).toBe("hello");
  });
});

describe("isBase64", () => {
  it("returns true for valid base64", () => {
    expect(isBase64("aGVsbG8=")).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isBase64("")).toBe(true);
  });

  it("returns false for URL-safe base64 without padding", () => {
    expect(isBase64("aGVsbG8")).toBe(false);
  });

  it("returns false for invalid characters", () => {
    expect(isBase64("!aGVsbG8=")).toBe(false);
  });
});

describe("isBase64Url", () => {
  it("returns true for a valid URL-safe base64 string", () => {
    expect(isBase64Url("aGVsbG8")).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isBase64Url("")).toBe(true);
  });

  it("returns false for strings with padding", () => {
    // '=' is not in the URL-safe alphabet per this validator
    expect(isBase64Url("aGVsbG8=")).toBe(false);
  });

  it("returns false for strings with +", () => {
    expect(isBase64Url("a+bc")).toBe(false);
  });

  it("accepts - and _ characters", () => {
    expect(isBase64Url("abc-def_ghi")).toBe(true);
  });
});

// ===========================================================================
// UUID
// ===========================================================================

describe("uuidV4", () => {
  it("generates a valid v4 UUID", () => {
    const id = uuidV4();
    expect(isUuidV4(id)).toBe(true);
  });

  it("generates unique values", () => {
    const a = uuidV4();
    const b = uuidV4();
    expect(a).not.toBe(b);
  });

  it("matches UUID format", () => {
    expect(uuidV4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("uuidV4Bulk", () => {
  it("returns the requested count", () => {
    expect(uuidV4Bulk(10)).toHaveLength(10);
  });

  it("all generated UUIDs are valid v4", () => {
    const ids = uuidV4Bulk(20);
    for (const id of ids) {
      expect(isUuidV4(id)).toBe(true);
    }
  });

  it("returns 0 UUIDs when count is 0", () => {
    expect(uuidV4Bulk(0)).toHaveLength(0);
  });

  it("returns unique values", () => {
    const ids = uuidV4Bulk(50);
    const unique = new Set(ids);
    expect(unique.size).toBe(50);
  });
});

describe("isUuid", () => {
  it("returns true for a valid UUID", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("returns true for a v4 UUID", () => {
    expect(isUuid(uuidV4())).toBe(true);
  });

  it("returns false for a string without hyphens", () => {
    expect(isUuid("550e8400e29b41d4a716446655440000")).toBe(false);
  });

  it("returns false for nil UUID string with wrong format", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("returns true for nil UUID", () => {
    expect(isUuid(nilUuid())).toBe(true);
  });
});

describe("isUuidV4", () => {
  it("returns true for a generated v4 UUID", () => {
    expect(isUuidV4(uuidV4())).toBe(true);
  });

  it("returns false for a non-v4 UUID (version byte wrong)", () => {
    expect(isUuidV4("550e8400-e29b-11d4-a716-446655440000")).toBe(false);
  });

  it("returns false for a random string", () => {
    expect(isUuidV4("not-a-uuid-at-all")).toBe(false);
  });
});

describe("parseUuid", () => {
  it("returns null for an invalid UUID", () => {
    expect(parseUuid("not-valid")).toBeNull();
  });

  it("returns version 4 for a v4 UUID", () => {
    const parsed = parseUuid(uuidV4());
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(4);
  });

  it("returns RFC 4122 variant for a standard UUID", () => {
    const parsed = parseUuid(uuidV4());
    expect(parsed!.variant).toBe("RFC 4122");
  });

  it("returns a 16-byte buffer", () => {
    const parsed = parseUuid(uuidV4());
    expect(parsed!.bytes).toBeInstanceOf(Buffer);
    expect(parsed!.bytes.length).toBe(16);
  });
});

describe("nilUuid", () => {
  it("returns the all-zeros UUID", () => {
    expect(nilUuid()).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("passes isUuid", () => {
    expect(isUuid(nilUuid())).toBe(true);
  });
});

describe("uuidToBytes / bytesToUuid", () => {
  it("round-trips a UUID through bytes", () => {
    const uuid = uuidV4();
    const bytes = uuidToBytes(uuid);
    expect(bytes).not.toBeNull();
    expect(bytesToUuid(bytes!)).toBe(uuid);
  });

  it("uuidToBytes returns null for an invalid UUID", () => {
    expect(uuidToBytes("bad-uuid")).toBeNull();
  });

  it("bytesToUuid returns null for wrong byte length", () => {
    expect(bytesToUuid(Buffer.alloc(10))).toBeNull();
  });

  it("bytesToUuid accepts exactly 16 bytes", () => {
    const bytes = Buffer.alloc(16);
    const uuid = bytesToUuid(bytes);
    expect(uuid).not.toBeNull();
    expect(isUuid(uuid!)).toBe(true);
  });
});

// ===========================================================================
// Random generation
// ===========================================================================

describe("secureRandomBytes", () => {
  it("returns a Buffer of the requested length", () => {
    const buf = secureRandomBytes(32);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(32);
  });

  it("returns different bytes each call", () => {
    const a = secureRandomBytes(16).toString("hex");
    const b = secureRandomBytes(16).toString("hex");
    expect(a).not.toBe(b);
  });

  it("returns 0 bytes for length 0", () => {
    expect(secureRandomBytes(0).length).toBe(0);
  });
});

describe("randomHex", () => {
  it("returns a string of the exact requested length", () => {
    expect(randomHex(16)).toHaveLength(16);
    expect(randomHex(32)).toHaveLength(32);
    expect(randomHex(1)).toHaveLength(1);
  });

  it("contains only hex characters", () => {
    expect(randomHex(64)).toMatch(/^[0-9a-f]+$/);
  });

  it("returns different values each call", () => {
    expect(randomHex(32)).not.toBe(randomHex(32));
  });
});

describe("randomToken", () => {
  it("returns a non-empty string", () => {
    expect(randomToken()).toBeTruthy();
  });

  it("default (32 bytes) produces a 43-character URL-safe string", () => {
    // base64url of 32 bytes: ceil(32*4/3) = 43 chars with no padding
    const token = randomToken(32);
    expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(token.length).toBe(43);
  });

  it("produces URL-safe characters only", () => {
    for (let i = 0; i < 10; i++) {
      expect(randomToken()).toMatch(/^[A-Za-z0-9\-_]+$/);
    }
  });

  it("produces different tokens each call", () => {
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe("randomInt", () => {
  it("returns a value in [min, max)", () => {
    for (let i = 0; i < 100; i++) {
      const v = randomInt(0, 10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });

  it("works for a range of 1", () => {
    for (let i = 0; i < 20; i++) {
      expect(randomInt(5, 6)).toBe(5);
    }
  });

  it("throws when min >= max", () => {
    expect(() => randomInt(5, 5)).toThrow(RangeError);
    expect(() => randomInt(6, 5)).toThrow(RangeError);
  });

  it("throws for non-integer arguments", () => {
    expect(() => randomInt(0.5, 10)).toThrow(TypeError);
    expect(() => randomInt(0, 10.5)).toThrow(TypeError);
  });

  it("covers the full range", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      seen.add(randomInt(0, 4));
    }
    expect(seen.size).toBe(4);
  });
});

describe("randomFloat", () => {
  it("returns a value in [0, 1)", () => {
    for (let i = 0; i < 50; i++) {
      const v = randomFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("returns different values across calls", () => {
    const values = new Set<number>();
    for (let i = 0; i < 10; i++) {
      values.add(randomFloat());
    }
    expect(values.size).toBeGreaterThan(1);
  });
});

describe("randomChoice", () => {
  it("returns an element from the array", () => {
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(randomChoice(arr));
    }
  });

  it("throws on empty array", () => {
    expect(() => randomChoice([])).toThrow(RangeError);
  });

  it("returns the only element when array has length 1", () => {
    expect(randomChoice(["only"])).toBe("only");
  });

  it("covers all elements over many calls", () => {
    const arr = ["a", "b", "c", "d"];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(randomChoice(arr));
    }
    expect(seen.size).toBe(arr.length);
  });
});

describe("randomShuffle", () => {
  it("returns a new array", () => {
    const arr = [1, 2, 3];
    const shuffled = randomShuffle(arr);
    expect(shuffled).not.toBe(arr);
  });

  it("preserves length", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(randomShuffle(arr)).toHaveLength(arr.length);
  });

  it("contains all original elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = randomShuffle(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it("does not mutate the original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    randomShuffle(arr);
    expect(arr).toEqual(original);
  });

  it("handles empty array", () => {
    expect(randomShuffle([])).toEqual([]);
  });
});

describe("randomSample", () => {
  it("returns n elements", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(randomSample(arr, 3)).toHaveLength(3);
  });

  it("all returned elements are from the source array", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const sample = randomSample(arr, 3);
    for (const el of sample) {
      expect(arr).toContain(el);
    }
  });

  it("returns unique elements (no duplicates)", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const sample = randomSample(arr, 5);
    expect(new Set(sample).size).toBe(5);
  });

  it("returns all elements when n === arr.length", () => {
    const arr = [1, 2, 3];
    expect(randomSample(arr, 3)).toHaveLength(3);
  });

  it("throws when n > arr.length", () => {
    expect(() => randomSample([1, 2], 3)).toThrow(RangeError);
  });
});

// ===========================================================================
// Password-like utilities
// ===========================================================================

describe("generatePassword", () => {
  it("returns a string of the requested length", () => {
    expect(generatePassword(16)).toHaveLength(16);
    expect(generatePassword(32)).toHaveLength(32);
  });

  it("includes uppercase when requested", () => {
    const pw = generatePassword(64, { uppercase: true, lowercase: false, digits: false, symbols: false });
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).not.toMatch(/[a-z0-9!@#$%^&*()]/);
  });

  it("includes lowercase when requested", () => {
    const pw = generatePassword(64, { uppercase: false, lowercase: true, digits: false, symbols: false });
    expect(pw).toMatch(/[a-z]/);
    expect(pw).not.toMatch(/[A-Z0-9!@#$%^&*()]/);
  });

  it("includes digits when requested", () => {
    const pw = generatePassword(64, { uppercase: false, lowercase: false, digits: true, symbols: false });
    expect(pw).toMatch(/[0-9]/);
  });

  it("includes symbols when requested", () => {
    const pw = generatePassword(64, { uppercase: false, lowercase: false, digits: false, symbols: true });
    expect(pw).toMatch(/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/);
  });

  it("default produces all character types", () => {
    // Run enough iterations to be statistically certain
    let hasUpper = false, hasLower = false, hasDigit = false, hasSymbol = false;
    for (let i = 0; i < 100; i++) {
      const pw = generatePassword(32);
      if (/[A-Z]/.test(pw)) hasUpper = true;
      if (/[a-z]/.test(pw)) hasLower = true;
      if (/[0-9]/.test(pw)) hasDigit = true;
      if (/[!@#$%^&*()]/.test(pw)) hasSymbol = true;
    }
    expect(hasUpper).toBe(true);
    expect(hasLower).toBe(true);
    expect(hasDigit).toBe(true);
    expect(hasSymbol).toBe(true);
  });

  it("generates unique passwords", () => {
    const a = generatePassword();
    const b = generatePassword();
    expect(a).not.toBe(b);
  });

  it("throws when no charset is enabled", () => {
    expect(() =>
      generatePassword(16, {
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: false,
      }),
    ).toThrow();
  });
});

describe("generatePinCode", () => {
  it("returns a 6-digit string by default", () => {
    const pin = generatePinCode();
    expect(pin).toHaveLength(6);
    expect(pin).toMatch(/^[0-9]+$/);
  });

  it("respects custom length", () => {
    expect(generatePinCode(4)).toHaveLength(4);
    expect(generatePinCode(8)).toHaveLength(8);
  });

  it("contains only digits", () => {
    for (let i = 0; i < 20; i++) {
      expect(generatePinCode()).toMatch(/^[0-9]+$/);
    }
  });

  it("generates unique pins (probabilistically)", () => {
    const pins = new Set(Array.from({ length: 30 }, () => generatePinCode()));
    expect(pins.size).toBeGreaterThan(1);
  });
});

describe("generateApiKey", () => {
  it("includes the prefix when provided", () => {
    expect(generateApiKey("sk")).toMatch(/^sk_/);
    expect(generateApiKey("test")).toMatch(/^test_/);
  });

  it("returns just the token when no prefix provided", () => {
    const key = generateApiKey();
    // No prefix => no "<prefix>_" segment prepended. The base64url token itself
    // may legitimately contain "_", so validate the bare-token format instead.
    expect(key).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(generateApiKey("k").startsWith("k_")).toBe(true);
  });

  it("generates unique keys", () => {
    expect(generateApiKey("k")).not.toBe(generateApiKey("k"));
  });

  it("is non-empty", () => {
    expect(generateApiKey().length).toBeGreaterThan(0);
  });
});

describe("constantTimeEqual", () => {
  it("returns true for equal strings", () => {
    expect(constantTimeEqual("hello", "hello")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(constantTimeEqual("hello", "world")).toBe(false);
  });

  it("returns false when lengths differ", () => {
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
    expect(constantTimeEqual("abcd", "abc")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(constantTimeEqual("", "")).toBe(true);
  });

  it("is case-sensitive", () => {
    expect(constantTimeEqual("Hello", "hello")).toBe(false);
  });
});

// ===========================================================================
// Content integrity
// ===========================================================================

describe("hashObject", () => {
  it("returns a 64-character hex string", () => {
    expect(hashObject({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    const obj = { z: 1, a: 2, m: 3 };
    expect(hashObject(obj)).toBe(hashObject(obj));
  });

  it("is key-order independent (sorted keys)", () => {
    const a = { z: 1, a: 2 };
    const b = { a: 2, z: 1 };
    expect(hashObject(a)).toBe(hashObject(b));
  });

  it("produces different hashes for different objects", () => {
    expect(hashObject({ a: 1 })).not.toBe(hashObject({ a: 2 }));
  });

  it("handles nested objects with sorted keys", () => {
    const a = { outer: { z: 1, a: 2 } };
    const b = { outer: { a: 2, z: 1 } };
    expect(hashObject(a)).toBe(hashObject(b));
  });

  it("handles arrays", () => {
    expect(hashObject([1, 2, 3])).toBe(hashObject([1, 2, 3]));
    expect(hashObject([1, 2])).not.toBe(hashObject([2, 1]));
  });

  it("handles null", () => {
    expect(hashObject(null)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashArray", () => {
  it("returns a 64-character hex string", () => {
    expect(hashArray(["a", "b"])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is order-independent (sorts items)", () => {
    expect(hashArray(["b", "a"])).toBe(hashArray(["a", "b"]));
  });

  it("returns different hashes for different contents", () => {
    expect(hashArray(["a"])).not.toBe(hashArray(["b"]));
  });

  it("handles empty array", () => {
    expect(hashArray([])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashArray(["x", "y", "z"])).toBe(hashArray(["x", "y", "z"]));
  });
});

describe("merkleRoot", () => {
  it("returns sha256 of the single item for a 1-item list", () => {
    const item = "hello";
    expect(merkleRoot([item])).toBe(sha256(item));
  });

  it("returns sha256(sha256(a)+sha256(b)) for a 2-item list", () => {
    const a = "a";
    const b = "b";
    const expected = sha256(sha256(a) + sha256(b));
    expect(merkleRoot([a, b])).toBe(expected);
  });

  it("handles 3 items (odd count — pads last)", () => {
    const [a, b, c] = ["a", "b", "c"];
    const l0 = sha256(a);
    const l1 = sha256(b);
    const l2 = sha256(c);
    // layer 1: sha256(l0+l1), sha256(l2+l2)  (l2 duplicated)
    const p0 = sha256(l0 + l1);
    const p1 = sha256(l2 + l2);
    const expected = sha256(p0 + p1);
    expect(merkleRoot([a, b, c])).toBe(expected);
  });

  it("handles 4 items (even count, balanced tree)", () => {
    const [a, b, c, d] = ["a", "b", "c", "d"];
    const l0 = sha256(a);
    const l1 = sha256(b);
    const l2 = sha256(c);
    const l3 = sha256(d);
    const p0 = sha256(l0 + l1);
    const p1 = sha256(l2 + l3);
    const expected = sha256(p0 + p1);
    expect(merkleRoot([a, b, c, d])).toBe(expected);
  });

  it("returns sha256 of empty string for empty list", () => {
    expect(merkleRoot([])).toBe(sha256(""));
  });

  it("is deterministic", () => {
    const items = ["x", "y", "z", "w"];
    expect(merkleRoot(items)).toBe(merkleRoot(items));
  });

  it("produces different roots for different item sets", () => {
    expect(merkleRoot(["a", "b"])).not.toBe(merkleRoot(["a", "c"]));
  });
});

describe("verifyMerkleProof", () => {
  it("verifies a valid proof for a 2-item tree (right sibling)", () => {
    const items = ["a", "b"];
    const root = merkleRoot(items);
    // Proof for leaf "a" (index 0): right sibling is sha256("b")
    const proof = [{ hash: sha256("b"), position: "right" as const }];
    expect(verifyMerkleProof("a", proof, root)).toBe(true);
  });

  it("verifies a valid proof for a 2-item tree (left sibling)", () => {
    const items = ["a", "b"];
    const root = merkleRoot(items);
    // Proof for leaf "b" (index 1): left sibling is sha256("a")
    const proof = [{ hash: sha256("a"), position: "left" as const }];
    expect(verifyMerkleProof("b", proof, root)).toBe(true);
  });

  it("rejects a proof with a wrong sibling hash", () => {
    const root = merkleRoot(["a", "b"]);
    const proof = [{ hash: sha256("WRONG"), position: "right" as const }];
    expect(verifyMerkleProof("a", proof, root)).toBe(false);
  });

  it("returns true for a single-item tree with an empty proof", () => {
    const root = merkleRoot(["only"]);
    expect(verifyMerkleProof("only", [], root)).toBe(true);
  });

  it("returns false for wrong leaf with empty proof", () => {
    const root = merkleRoot(["only"]);
    expect(verifyMerkleProof("wrong", [], root)).toBe(false);
  });
});

// ===========================================================================
// Encoding utilities
// ===========================================================================

describe("hexEncode", () => {
  it("encodes a string to hex", () => {
    expect(hexEncode("hello")).toBe("68656c6c6f");
  });

  it("encodes a Buffer to hex", () => {
    expect(hexEncode(Buffer.from([0xde, 0xad, 0xbe, 0xef]))).toBe("deadbeef");
  });

  it("round-trips with hexDecode", () => {
    const original = Buffer.from([1, 2, 3, 255, 0]);
    expect(hexDecode(hexEncode(original))).toEqual(original);
  });

  it("handles empty input", () => {
    expect(hexEncode("")).toBe("");
  });
});

describe("hexDecode", () => {
  it("decodes 'deadbeef' to correct bytes", () => {
    expect(hexDecode("deadbeef")).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
  });

  it("handles empty string", () => {
    expect(hexDecode("")).toEqual(Buffer.alloc(0));
  });

  it("handles uppercase hex", () => {
    expect(hexDecode("DEADBEEF")).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
  });
});

describe("isHex", () => {
  it("returns true for a valid lowercase hex string", () => {
    expect(isHex("deadbeef")).toBe(true);
  });

  it("returns true for a valid uppercase hex string", () => {
    expect(isHex("DEADBEEF")).toBe(true);
  });

  it("returns true for an empty string", () => {
    expect(isHex("")).toBe(true);
  });

  it("returns false for odd-length strings", () => {
    expect(isHex("abc")).toBe(false);
  });

  it("returns false for strings with non-hex characters", () => {
    expect(isHex("gg")).toBe(false);
    expect(isHex("hello")).toBe(false);
    expect(isHex("de/d")).toBe(false);
  });

  it("returns true for a sha256 hex output", () => {
    expect(isHex(sha256("test"))).toBe(true);
  });
});
