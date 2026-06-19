/**
 * crypto-utils.ts
 *
 * Pure TypeScript cryptography utilities built exclusively on Node.js built-ins.
 * Zero npm dependencies. All functions are pure (no side effects beyond the
 * crypto operations themselves). No `any` types.
 */

import {
  createHash,
  createHmac,
  randomBytes as nodeRandomBytes,
  randomUUID as nodeRandomUUID,
  timingSafeEqual,
} from "crypto";

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/** Returns the hex-encoded SHA-256 digest of `data`. */
export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Returns the raw Buffer digest of SHA-256 of `data`. */
export function sha256Buffer(data: string | Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}

/** Returns the hex-encoded SHA-1 digest of `data`. */
export function sha1(data: string | Buffer): string {
  return createHash("sha1").update(data).digest("hex");
}

/** Returns the hex-encoded MD5 digest of `data`. */
export function md5(data: string | Buffer): string {
  return createHash("md5").update(data).digest("hex");
}

/** Returns the hex-encoded SHA-512 digest of `data`. */
export function sha512(data: string | Buffer): string {
  return createHash("sha512").update(data).digest("hex");
}

// ---------------------------------------------------------------------------
// HMAC
// ---------------------------------------------------------------------------

/** Returns the hex-encoded HMAC-SHA256 of `data` using `key`. */
export function hmacSha256(key: string | Buffer, data: string | Buffer): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

/** Returns the hex-encoded HMAC-SHA512 of `data` using `key`. */
export function hmacSha512(key: string | Buffer, data: string | Buffer): string {
  return createHmac("sha512", key).update(data).digest("hex");
}

/**
 * Verifies an HMAC-SHA256 tag in constant time to prevent timing attacks.
 * Returns `true` only when the computed HMAC matches `expectedHex`.
 */
export function verifyHmac(
  key: string | Buffer,
  data: string | Buffer,
  expectedHex: string,
): boolean {
  const computed = hmacSha256(key, data);
  const computedBuf = Buffer.from(computed, "hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");
  if (computedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(computedBuf, expectedBuf);
}

// ---------------------------------------------------------------------------
// Base64
// ---------------------------------------------------------------------------

/** Encodes `data` to standard (padded) base64. */
export function base64Encode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64");
}

/** Decodes a standard base64 string to a UTF-8 string. */
export function base64Decode(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf8");
}

/** Decodes a standard base64 string to a raw Buffer. */
export function base64DecodeBuffer(encoded: string): Buffer {
  return Buffer.from(encoded, "base64");
}

/** Encodes `data` to URL-safe base64 (no padding, `+`→`-`, `/`→`_`). */
export function base64UrlEncode(data: string | Buffer): string {
  return base64Encode(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Decodes a URL-safe base64 string to a UTF-8 string. */
export function base64UrlDecode(encoded: string): string {
  return base64UrlDecodeBuffer(encoded).toString("utf8");
}

/** Decodes a URL-safe base64 string to a raw Buffer. */
export function base64UrlDecodeBuffer(encoded: string): Buffer {
  // Restore standard base64 alphabet and padding
  const standard =
    encoded.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (encoded.length % 4)) % 4);
  return Buffer.from(standard, "base64");
}

/** Returns `true` if `str` is valid standard base64. */
export function isBase64(str: string): boolean {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str);
}

/** Returns `true` if `str` is valid URL-safe base64 (no padding). */
export function isBase64Url(str: string): boolean {
  return /^[A-Za-z0-9\-_]*$/.test(str);
}

// ---------------------------------------------------------------------------
// UUID
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Generates a version 4 UUID using `crypto.randomUUID()`. */
export function uuidV4(): string {
  if (typeof nodeRandomUUID === "function") {
    return nodeRandomUUID();
  }
  // Fallback using randomBytes
  const bytes = nodeRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
  const hex = bytes.toString("hex");
  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20)
  );
}

/** Generates `count` version 4 UUIDs. */
export function uuidV4Bulk(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(uuidV4());
  }
  return result;
}

/** Returns `true` if `str` is a valid UUID in any version. */
export function isUuid(str: string): boolean {
  return UUID_REGEX.test(str);
}

/** Returns `true` if `str` is a valid version 4 UUID. */
export function isUuidV4(str: string): boolean {
  return UUID_V4_REGEX.test(str);
}

/**
 * Parses a UUID into its version, variant, and raw bytes.
 * Returns `null` if the string is not a valid UUID.
 */
export function parseUuid(
  uuid: string,
): { version: number; variant: string; bytes: Buffer } | null {
  if (!isUuid(uuid)) return null;
  const hex = uuid.replace(/-/g, "");
  const bytes = Buffer.from(hex, "hex");
  const version = (bytes[6] >> 4) & 0x0f;
  const variantByte = bytes[8] >> 6;
  let variant: string;
  if (variantByte === 0b10) {
    variant = "RFC 4122";
  } else if (variantByte === 0b11) {
    variant = "Microsoft";
  } else {
    variant = "NCS";
  }
  return { version, variant, bytes };
}

/** Returns the nil UUID ("00000000-0000-0000-0000-000000000000"). */
export function nilUuid(): string {
  return "00000000-0000-0000-0000-000000000000";
}

/**
 * Converts a UUID string to its raw 16-byte Buffer.
 * Returns `null` if the string is not a valid UUID.
 */
export function uuidToBytes(uuid: string): Buffer | null {
  if (!isUuid(uuid)) return null;
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

/**
 * Converts a 16-byte Buffer to a UUID string.
 * Returns `null` if `bytes` is not exactly 16 bytes long.
 */
export function bytesToUuid(bytes: Buffer): string | null {
  if (bytes.length !== 16) return null;
  const hex = bytes.toString("hex");
  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20)
  );
}

// ---------------------------------------------------------------------------
// Random generation
// ---------------------------------------------------------------------------

/**
 * Returns `length` cryptographically random bytes.
 * Exported as `secureRandomBytes` to avoid shadowing the `crypto` import.
 */
export function secureRandomBytes(length: number): Buffer {
  return nodeRandomBytes(length);
}

/**
 * Returns a random hex string of exactly `length` characters.
 * Generates `ceil(length / 2)` bytes and truncates.
 */
export function randomHex(length: number): string {
  const bytes = Math.ceil(length / 2);
  return nodeRandomBytes(bytes).toString("hex").slice(0, length);
}

/**
 * Returns a URL-safe base64 random token.
 * Defaults to 32 bytes (resulting in a 43-character string).
 */
export function randomToken(length = 32): string {
  return base64UrlEncode(nodeRandomBytes(length));
}

/**
 * Returns a cryptographically random integer in the range [min, max).
 * Uses rejection sampling to avoid modulo bias.
 */
export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError("min and max must be integers");
  }
  if (min >= max) {
    throw new RangeError("min must be less than max");
  }
  const range = max - min;
  // Find smallest power-of-2 mask that covers range
  const bytesNeeded = Math.ceil(Math.log2(range + 1) / 8) || 1;
  const mask = Math.pow(2, bytesNeeded * 8) - 1;
  let value: number;
  do {
    const buf = nodeRandomBytes(bytesNeeded);
    value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      value = value * 256 + buf[i];
    }
    value = value & mask;
  } while (value >= range);
  return min + value;
}

/**
 * Returns a random float in [0, 1) using 53-bit precision (same as
 * `Math.random` but cryptographically random).
 */
export function randomFloat(): number {
  // 53 random bits → divide by 2^53
  const buf = nodeRandomBytes(7); // 56 bits, take 53
  let hi = 0;
  let lo = 0;
  // Read 3 bytes into hi (24 bits) and 4 bytes into lo (32 bits) — total 56 bits
  for (let i = 0; i < 3; i++) hi = hi * 256 + buf[i];
  for (let i = 3; i < 7; i++) lo = lo * 256 + buf[i];
  // Keep only 53 bits: shift hi left by 29 bits (53-24) and combine with top 29 bits of lo
  const value = (hi * Math.pow(2, 29) + Math.floor(lo / 8)) / Math.pow(2, 53);
  return value;
}

/**
 * Returns a cryptographically random element from `arr`.
 * Throws if `arr` is empty.
 */
export function randomChoice<T>(arr: T[]): T {
  if (arr.length === 0) throw new RangeError("Cannot choose from an empty array");
  return arr[randomInt(0, arr.length)];
}

/**
 * Returns a new array with the elements of `arr` shuffled using a
 * cryptographically secure Fisher-Yates algorithm.
 */
export function randomShuffle<T>(arr: T[]): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Returns `n` unique elements sampled without replacement from `arr`.
 * Throws if `n > arr.length`.
 */
export function randomSample<T>(arr: T[], n: number): T[] {
  if (n > arr.length) {
    throw new RangeError("n must not exceed arr.length");
  }
  const shuffled = randomShuffle(arr);
  return shuffled.slice(0, n);
}

// ---------------------------------------------------------------------------
// Password-like utilities
// ---------------------------------------------------------------------------

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";

export interface GeneratePasswordOptions {
  uppercase?: boolean;
  lowercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
}

/**
 * Generates a cryptographically random password.
 * Defaults: length=16, all character sets enabled.
 */
export function generatePassword(
  length = 16,
  opts: GeneratePasswordOptions = {},
): string {
  const { uppercase = true, lowercase = true, digits = true, symbols = true } = opts;

  let charset = "";
  const required: string[] = [];

  if (uppercase) {
    charset += UPPERCASE;
    required.push(randomChoice(UPPERCASE.split("")));
  }
  if (lowercase) {
    charset += LOWERCASE;
    required.push(randomChoice(LOWERCASE.split("")));
  }
  if (digits) {
    charset += DIGITS;
    required.push(randomChoice(DIGITS.split("")));
  }
  if (symbols) {
    charset += SYMBOLS;
    required.push(randomChoice(SYMBOLS.split("")));
  }

  if (charset.length === 0) {
    throw new Error("At least one character set must be enabled");
  }

  const charsetArr = charset.split("");
  const remaining = length - required.length;
  if (remaining < 0) {
    throw new RangeError("length is too short for the selected character sets");
  }

  const extra: string[] = [];
  for (let i = 0; i < remaining; i++) {
    extra.push(randomChoice(charsetArr));
  }

  return randomShuffle([...required, ...extra]).join("");
}

/**
 * Generates a cryptographically random numeric PIN code.
 * Defaults to 6 digits.
 */
export function generatePinCode(length = 6): string {
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += randomInt(0, 10).toString();
  }
  return pin;
}

/**
 * Generates a random API key.
 * Format: `${prefix}_${randomToken(32)}` or just the token if no prefix.
 */
export function generateApiKey(prefix?: string): string {
  const token = randomToken(32);
  return prefix ? `${prefix}_${token}` : token;
}

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 * Returns `true` if and only if `a === b`.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Still do a comparison of `a` against itself to maintain constant time
    // relative to the length of `a`, then return false.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

// ---------------------------------------------------------------------------
// Content integrity
// ---------------------------------------------------------------------------

/**
 * Returns the SHA-256 hex digest of a JSON-serialised object.
 * Object keys are sorted recursively for determinism.
 */
export function hashObject(obj: unknown): string {
  return sha256(JSON.stringify(sortedJson(obj)));
}

/**
 * Recursively sorts the keys of plain objects so that serialisation is
 * deterministic regardless of insertion order.
 */
function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedJson);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortedJson(record[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Returns the SHA-256 of the sorted, joined array items.
 * Useful for computing a fingerprint of a set of strings.
 */
export function hashArray(items: string[]): string {
  return sha256([...items].sort().join("\x00"));
}

/**
 * Computes the binary Merkle tree root of `items`.
 *
 * - Each item is SHA-256 hashed to form a leaf.
 * - Parent nodes are `sha256(leftHex + rightHex)`.
 * - Odd numbers of nodes are padded by repeating the last node.
 * - Single item returns `sha256(item)`.
 * - Empty array returns SHA-256 of empty string.
 */
export function merkleRoot(items: string[]): string {
  if (items.length === 0) return sha256("");
  let layer = items.map((item) => sha256(item));
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(sha256(left + right));
    }
    layer = next;
  }
  return layer[0];
}

/**
 * Verifies a Merkle inclusion proof.
 *
 * @param leaf   - The original leaf value (not pre-hashed).
 * @param proof  - Array of sibling hashes and their position relative to the
 *                 current node at each level.
 * @param root   - The expected Merkle root.
 */
export function verifyMerkleProof(
  leaf: string,
  proof: Array<{ hash: string; position: "left" | "right" }>,
  root: string,
): boolean {
  let current = sha256(leaf);
  for (const { hash, position } of proof) {
    if (position === "left") {
      current = sha256(hash + current);
    } else {
      current = sha256(current + hash);
    }
  }
  return current === root;
}

// ---------------------------------------------------------------------------
// Encoding utilities
// ---------------------------------------------------------------------------

/**
 * Returns the hex-encoded representation of `data`.
 * If `data` is a string, it is treated as UTF-8.
 */
export function hexEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("hex");
}

/**
 * Decodes a hex string to a Buffer.
 * Accepts both upper- and lower-case hex digits.
 */
export function hexDecode(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

/** Returns `true` if `str` is a valid (possibly empty) hex string. */
export function isHex(str: string): boolean {
  return /^[0-9a-fA-F]*$/.test(str) && str.length % 2 === 0;
}
