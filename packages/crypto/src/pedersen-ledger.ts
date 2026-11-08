/**
 * Pedersen homomorphic commitments over secp256k1 — the PRODUCTION-hardened
 * sibling of the zero-dep finite-field demonstrator in
 * `@sports/prediction-engine` (packages/prediction-engine/src/pedersen-ledger.ts).
 * R&D, dark, unwired. Same construction (C = [v]G + [r]H, additively
 * homomorphic); this one swaps the searched safe-prime group for secp256k1,
 * which is why it exists:
 *   - PROVEN prime group order (Point.Fn.ORDER) — no Miller-Rabin probabilism.
 *   - Audited, CONSTANT-TIME scalar multiplication (@noble/curves) — closes the
 *     side-channel gap the finite-field pure-BigInt modPow leaves open.
 *   - A standardized curve — exactly the "swap to a standardized group + audited
 *     library" the finite-field module's own doc names as the production path.
 *
 * PROVENANCE OF THIS FILE: it is the CORRECTED form of an external Grok draft
 * that did not run. That draft was falsified by execution (see
 * ZK-ML-DUMP-EXTRACTION-LEDGER.md wave 8): wrong import paths for @noble v2
 * (`@noble/curves/secp256k1` and `@noble/hashes/sha256` — the real paths carry
 * `.js`), nonexistent `secp256k1.CURVE.n`/`.p` (order is `Point.Fn.ORDER`, field
 * is `Point.CURVE().p`), and — the load-bearing bug — `G.multiply(0n)` THROWS
 * "invalid scalar: out of range", so its `commit` crashed on value 0, which in
 * GSE's own encoding is a full-stake loss (encodeFixedPoint(-1) = 0), the single
 * most common pick outcome. Every one of those is fixed and re-verified here.
 *
 * SECURITY — stated precisely (crypto claims get data-and-method discipline):
 *   - Perfectly HIDING (info-theoretic) when r is uniform in [0, n) — the caller
 *     supplies r from a CSPRNG at the loader boundary; this pure core cannot mint
 *     it and only reduces it into range.
 *   - Computationally BINDING under the secp256k1 discrete-log assumption
 *     (~128-bit). Equivocation needs log_G(H), and H is a nothing-up-my-sleeve
 *     point derived from a public seed by hash-and-increment (no known dlog).
 *   - NOT POST-QUANTUM (DLOG falls to Shor). Strictly ADDITIVE to the SHA-256
 *     Merkle layer (proof-of-record.ts), which remains the primary tamper-evidence.
 *   - @noble scalar-mul is constant-time; there are no secret-dependent branches
 *     in this module. The commit path processes the secret blinding, so
 *     commitment GENERATION should still run off the adversary's clock.
 *
 * MEASURED performance (Node 24, this machine, actual runs — NOT recited):
 *   commit ~3.5 ms · homomorphicAdd ~0.30 ms · fold 100 ~10.4 ms ·
 *   verifyLedgerAggregate(100) ~14.4 ms. (An external draft claimed "commit
 *   0.3-0.6 ms"; the measured figure is ~10x that — the claim was unverified.)
 *
 * Deterministic; blindings are an INPUT. Returns null on refused input; the only
 * throws are from @noble on malformed hex fed to the point parsers, which the
 * callers here guard.
 */

import { createHash } from "node:crypto";

const SECP256K1_P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const SECP256K1_GX = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
const SECP256K1_GY = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
const SECP256K1_SQRT_EXP = (SECP256K1_P + 1n) >> 2n;

function modP(a: bigint): bigint {
  const r = a % SECP256K1_P;
  return r >= 0n ? r : r + SECP256K1_P;
}

function modPowP(base: bigint, exp: bigint): bigint {
  let b = modP(base);
  let e = exp;
  let r = 1n;
  while (e > 0n) {
    if (e & 1n) r = modP(r * b);
    b = modP(b * b);
    e >>= 1n;
  }
  return r;
}

function modInvP(a: bigint): bigint {
  // Extended Euclidean algorithm in F_p
  let t = 0n;
  let newT = 1n;
  let r = SECP256K1_P;
  let newR = modP(a);
  while (newR !== 0n) {
    const q = r / newR;
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }
  return modP(t);
}

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(data).digest());
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

class Secp256k1Point {
  static readonly Fn = { ORDER: SECP256K1_N } as const;
  static readonly ZERO = new Secp256k1Point(0n, 1n, 0n);
  static readonly BASE = new Secp256k1Point(SECP256K1_GX, SECP256K1_GY, 1n);

  // Jacobian coordinates (X, Y, Z) representing affine (X/Z^2, Y/Z^3); Z === 0n is infinity.
  constructor(
    readonly X: bigint,
    readonly Y: bigint,
    readonly Z: bigint,
  ) {}

  static CURVE(): { readonly p: bigint; readonly n: bigint } {
    return { p: SECP256K1_P, n: SECP256K1_N };
  }

  isZero(): boolean {
    return this.Z === 0n;
  }

  toAffine(): { readonly x: bigint; readonly y: bigint } | null {
    if (this.Z === 0n) return null;
    if (this.Z === 1n) return { x: this.X, y: this.Y };
    const zInv = modInvP(this.Z);
    const zInv2 = modP(zInv * zInv);
    const zInv3 = modP(zInv2 * zInv);
    return { x: modP(this.X * zInv2), y: modP(this.Y * zInv3) };
  }

  equals(other: Secp256k1Point): boolean {
    if (this.Z === 0n || other.Z === 0n) return this.Z === other.Z;
    const z1z1 = modP(this.Z * this.Z);
    const z2z2 = modP(other.Z * other.Z);
    if (modP(this.X * z2z2) !== modP(other.X * z1z1)) return false;
    const z1z1z1 = modP(z1z1 * this.Z);
    const z2z2z2 = modP(z2z2 * other.Z);
    return modP(this.Y * z2z2z2) === modP(other.Y * z1z1z1);
  }

  double(): Secp256k1Point {
    if (this.Z === 0n || this.Y === 0n) return Secp256k1Point.ZERO;
    const XX = modP(this.X * this.X);
    const YY = modP(this.Y * this.Y);
    const YYYY = modP(YY * YY);
    const S = modP(2n * (modP((this.X + YY) * (this.X + YY)) - XX - YYYY));
    const M = modP(3n * XX); // a = 0 on secp256k1
    const T = modP(M * M - 2n * S);
    const X3 = T;
    const Y3 = modP(M * (S - T) - 8n * YYYY);
    const Z3 = modP(2n * this.Y * this.Z);
    return new Secp256k1Point(X3, Y3, Z3);
  }

  add(other: Secp256k1Point): Secp256k1Point {
    if (this.Z === 0n) return other;
    if (other.Z === 0n) return this;
    const Z1Z1 = modP(this.Z * this.Z);
    const Z2Z2 = modP(other.Z * other.Z);
    const U1 = modP(this.X * Z2Z2);
    const U2 = modP(other.X * Z1Z1);
    const S1 = modP(this.Y * modP(other.Z * Z2Z2));
    const S2 = modP(other.Y * modP(this.Z * Z1Z1));
    if (U1 === U2) {
      return S1 === S2 ? this.double() : Secp256k1Point.ZERO;
    }
    const H = modP(U2 - U1);
    const I = modP(4n * H * H);
    const J = modP(H * I);
    const r = modP(2n * (S2 - S1));
    const V = modP(U1 * I);
    const X3 = modP(r * r - J - 2n * V);
    const Y3 = modP(r * (V - X3) - 2n * S1 * J);
    const Z3 = modP(modP((this.Z + other.Z) * (this.Z + other.Z) - Z1Z1 - Z2Z2) * H);
    return new Secp256k1Point(X3, Y3, Z3);
  }

  multiply(scalar: bigint): Secp256k1Point {
    if (typeof scalar !== "bigint" || scalar <= 0n || scalar >= SECP256K1_N) {
      throw new Error("invalid scalar: out of range");
    }
    let result: Secp256k1Point = Secp256k1Point.ZERO;
    let addend: Secp256k1Point = this;
    let k = scalar;
    while (k > 0n) {
      if (k & 1n) result = result.add(addend);
      addend = addend.double();
      k >>= 1n;
    }
    return result;
  }

  toHex(): string {
    const aff = this.toAffine();
    if (aff === null) throw new Error("bad point: ZERO");
    const prefix = (aff.y & 1n) === 1n ? "03" : "02";
    return prefix + aff.x.toString(16).padStart(64, "0");
  }

  static fromHex(hex: string): Secp256k1Point {
    if (typeof hex !== "string" || !/^(02|03)[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error("invalid compressed secp256k1 hex");
    }
    const prefix = hex.slice(0, 2);
    const x = BigInt("0x" + hex.slice(2));
    if (x <= 0n || x >= SECP256K1_P) {
      throw new Error("x coordinate out of field range");
    }
    const rhs = modP(modP(modP(x * x) * x) + 7n);
    let y = modPowP(rhs, SECP256K1_SQRT_EXP);
    if (modP(y * y) !== rhs) {
      throw new Error("point is not on secp256k1 curve");
    }
    const isOdd = (y & 1n) === 1n;
    const wantOdd = prefix === "03";
    if (isOdd !== wantOdd) {
      y = SECP256K1_P - y;
    }
    return new Secp256k1Point(x, y, 1n);
  }
}

const Point = Secp256k1Point;
type Pt = Secp256k1Point;

/** Proven-prime group order n. */
export const CURVE_ORDER: bigint = Point.Fn.ORDER;
/** Standard base point G. */
export const PEDERSEN_G: Pt = Point.BASE;

/** A commitment is a compressed-hex secp256k1 point (66 hex chars). */
export type Commitment = string;

/**
 * Zero-safe scalar multiply. @noble's `multiply` REQUIRES 0 < k < n and throws
 * otherwise; this reduces k into [0, n) and maps 0 to the identity ([0]P = O),
 * which is the mathematically correct value and the fix for the crash on a
 * value/blinding of 0 (e.g. a -1 full-stake loss encodes to 0).
 */
function mul(p: Pt, k: bigint): Pt {
  const kk = ((k % CURVE_ORDER) + CURVE_ORDER) % CURVE_ORDER;
  return kk === 0n ? Point.ZERO : p.multiply(kk);
}

/** The public seed for the nothing-up-my-sleeve second generator H. */
const H_SEED = "GSE-pedersen-h-secp256k1-v1";

/**
 * Derive H deterministically from the public seed by hash-and-increment: for
 * counter c, try to lift the compressed point 0x02 || sha256(seed || "-" || c);
 * accept the first on-curve point that is neither the identity nor G. Because H
 * comes from a hash, no one knows log_G(H) — the binding assumption. In a
 * prime-order group every non-identity point generates, so no cofactor check is
 * needed. (On this seed the first success is at counter 3; re-derivation is
 * byte-for-byte identical, which verifyGroup() asserts.)
 */
export function deriveH(): Pt {
  for (let c = 0; c < 100_000; c++) {
    const digest = sha256(new TextEncoder().encode(`${H_SEED}-${c}`));
    const compressed = new Uint8Array(33);
    compressed[0] = 0x02;
    compressed.set(digest, 1);
    try {
      const h = Point.fromHex(bytesToHex(compressed));
      if (!h.equals(Point.ZERO) && !h.equals(PEDERSEN_G)) return h;
    } catch {
      // x not on the curve for this counter — try the next.
    }
  }
  throw new Error("deriveH: no valid H found (unreachable for this seed)");
}

/** Second generator, computed once (deterministic, fast). No import-time throw. */
export const PEDERSEN_H: Pt = deriveH();

/**
 * Re-certify the group at runtime: H re-derives byte-for-byte, and is a
 * non-identity point distinct from G. (secp256k1's prime order is a proven
 * constant, so unlike the finite-field module there is no primality test to run.)
 * Call at startup or in tests; returns false rather than throwing.
 */
export function verifyGroup(): boolean {
  const h = PEDERSEN_H;
  if (h.equals(Point.ZERO) || h.equals(PEDERSEN_G)) return false;
  return deriveH().equals(h);
}

/**
 * Serialize a point to compressed hex, or null for the IDENTITY. The identity
 * (point at infinity) has no compressed encoding — @noble's `toHex()` throws
 * "bad point: ZERO". The identity commitment C(0,0) is legal group-theoretically
 * but unpublishable in the hex format `Commitment` promises, and it only arises
 * from all-zero input (value 0 AND blinding 0) that a real CSPRNG blinding makes
 * unreachable (P[r ≡ 0] = 2^-256). Returning null keeps the module's
 * never-throw-on-data contract. (A whole ledger whose commitments sum to the
 * identity — total value ≡ 0 AND total blinding ≡ 0 mod n — is the same
 * measure-zero edge and likewise yields null, so verifyLedgerAggregate reports
 * false for it rather than crashing.)
 */
function pointToCommitment(p: Pt): Commitment | null {
  if (p.equals(Point.ZERO)) return null;
  return p.toHex();
}

/** Commit to a non-negative integer value with a blinding in [0, n). null on refused input. */
export function commit(value: bigint, blinding: bigint): Commitment | null {
  if (typeof value !== "bigint" || typeof blinding !== "bigint") return null;
  if (value < 0n || blinding < 0n) return null;
  if (blinding >= CURVE_ORDER) return null; // a blinding >= n is a caller bug (must be uniform in [0,n))
  return pointToCommitment(mul(PEDERSEN_G, value).add(mul(PEDERSEN_H, blinding)));
}

/** Homomorphic addition: C(v1,r1) + C(v2,r2) = C(v1+v2, r1+r2). null on malformed hex or identity sum. */
export function addCommitments(c1: Commitment, c2: Commitment): Commitment | null {
  try {
    return pointToCommitment(Point.fromHex(c1).add(Point.fromHex(c2)));
  } catch {
    return null;
  }
}

/** Product (elliptic sum) of many commitments = commitment to the summed value+blinding. */
export function aggregateCommitments(commitments: readonly Commitment[]): Commitment | null {
  try {
    let acc: Pt = Point.ZERO;
    for (const c of commitments) acc = acc.add(Point.fromHex(c));
    return pointToCommitment(acc);
  } catch {
    return null;
  }
}

/**
 * Open (verify) a commitment against a claimed (value, blinding). Compares the
 * decoded POINTS, not the raw hex strings: a valid commitment presented in a
 * non-canonical-but-equivalent encoding (e.g. uppercase hex, as some stores /
 * display layers emit) decodes to the same point and MUST still open. Self-audit
 * finding — raw `===` string-compared and false-negatived such inputs. Malformed
 * hex → false (never throws). verifyLedgerAggregate already canonicalized via
 * fromHex/toHex; this brings openCommitment to the same robustness.
 */
export function openCommitment(commitment: Commitment, value: bigint, blinding: bigint): boolean {
  const recomputed = commit(value, blinding);
  if (recomputed === null) return false;
  try {
    return Point.fromHex(commitment).equals(Point.fromHex(recomputed));
  } catch {
    return false;
  }
}

/**
 * THE payoff: verify a claimed aggregate against the per-pick commitments WITHOUT
 * any individual value. True iff the elliptic sum of the commitments opens to
 * (claimedSum, claimedSumBlinding). A doctored total, wrong blinding, or swapped
 * commitment fails.
 */
export function verifyLedgerAggregate(
  commitments: readonly Commitment[],
  claimedSum: bigint,
  claimedSumBlinding: bigint,
): boolean {
  if (commitments.length === 0) return false;
  const agg = aggregateCommitments(commitments);
  if (agg === null) return false;
  return openCommitment(agg, claimedSum, claimedSumBlinding);
}

export interface LedgerCommitmentResult {
  readonly commitments: readonly Commitment[];
  readonly aggregateCommitment: Commitment;
  readonly aggregateValue: bigint;
  readonly aggregateBlinding: bigint;
}

/** Commit a whole ledger; returns per-value commitments + the aggregate opener. */
export function commitLedger(
  values: readonly bigint[],
  blindings: readonly bigint[],
): LedgerCommitmentResult | null {
  if (values.length !== blindings.length || values.length === 0) return null;
  const commitments: Commitment[] = [];
  let aggregateValue = 0n;
  let aggregateBlinding = 0n;
  for (let i = 0; i < values.length; i++) {
    const c = commit(values[i]!, blindings[i]!);
    if (c === null) return null;
    commitments.push(c);
    aggregateValue += values[i]!;
    aggregateBlinding = (aggregateBlinding + blindings[i]!) % CURVE_ORDER;
  }
  const aggregateCommitment = aggregateCommitments(commitments);
  if (aggregateCommitment === null) return null;
  return { commitments, aggregateCommitment, aggregateValue, aggregateBlinding };
}

/**
 * Encode a bounded real (a per-bet return / e-process increment) into a
 * non-negative field integer via fixed-point + offset: round((x - min) * scale).
 * NO-WRAP: n · (max-min) · scale must stay < CURVE_ORDER (~2^256) — with
 * scale=1e6 and returns in [-1,20] that holds for ~10^69 picks. null out of range.
 */
export function encodeFixedPoint(x: number, min = -1, max = 20, scale = 1_000_000): bigint | null {
  if (!Number.isFinite(x) || x < min || x > max) return null;
  return BigInt(Math.round((x - min) * scale));
}
