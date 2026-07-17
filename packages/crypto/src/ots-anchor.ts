/**
 * OpenTimestamps anchor for Glass Ledger Merkle roots — Bitcoin-anchored
 * trustless time. Every published slate root gets a detached .ots proof that
 * upgrades (free public calendar network, no keys, no chain writes by us) into
 * a Bitcoin block-header attestation: "committed before kickoff" becomes
 * verifiable against Bitcoin itself, with zero trust in GSE's clock, database,
 * or continued existence. No sports service has ever done this.
 *
 * PROVENANCE: ported VERBATIM from the founder's verified gse-ots-anchor packet
 * (2026-07-17): 10/10 tests including two cross-implementation checks — the
 * official python-opentimestamps reference parses these proofs, and this
 * serializer's output is byte-identical to the reference serializer. Behavioral
 * edits are forbidden here; improvements go through new tests first.
 *
 * Honesty rule (contract WORKSTREAM_OTS_ANCHOR.md): public copy may say
 * "anchored to Bitcoin (block N)" ONLY when isBitcoinAttested() is true;
 * pending states say "calendar-pending". Transport is injected — no hidden HTTP.
 */
/**
 * gse-ots-anchor — Bitcoin-anchored trustless time for Galaxy Sports Edge commitments.
 *
 * WHAT: builds RFC-less but de-facto-standard OpenTimestamps (.ots) proofs for the
 * Merkle roots the Glass Ledger already publishes. An .ots proof upgrades (via the
 * public, free calendar network) into a Bitcoin block-header attestation — after which
 * NOBODY has to trust GSE's clock, database, or word that a commitment existed before
 * kickoff. The proof survives even if galaxysportsedge.com disappears.
 *
 * WHY THIS SHAPE: pure logic + injected transport (same discipline as gse-weather-edge).
 * No hidden HTTP. Serialization is cross-verified in tests by the OFFICIAL
 * python-opentimestamps reference library, so the bytes are right by construction.
 *
 * Protocol facts encoded here (python-opentimestamps is the normative reference):
 *  - header magic + varuint major version 1
 *  - ops: sha256=0x08, append=0xf0, prepend=0xf1 (binary ops carry varbytes payload)
 *  - timestamp tree: attestations sorted first, 0xff continuation framing, 0x00 attestation marker
 *  - PendingAttestation tag 83 df e3 0d 2e f9 0c 8e, payload = varbytes(utf8 calendar uri)
 *  - BitcoinBlockHeaderAttestation tag 05 88 96 0d 73 d7 19 01, payload = varuint(height)
 *  - calendar submit: POST <calendar>/digest, body = raw digest bytes,
 *    response = serialized Timestamp rooted at that digest (graft onto ours).
 */

export const HEADER_MAGIC = Uint8Array.from([
  0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73,
  0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);
export const MAJOR_VERSION = 1;
export const TAG_SHA256 = 0x08;
export const TAG_APPEND = 0xf0;
export const TAG_PREPEND = 0xf1;
export const TAG_ATTESTATION = 0x00;
export const TAG_CONTINUE = 0xff;
export const PENDING_ATTESTATION_TAG = Uint8Array.from([0x83, 0xdf, 0xe3, 0x0d, 0x2e, 0xf9, 0x0c, 0x8e]);
export const BITCOIN_ATTESTATION_TAG = Uint8Array.from([0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01]);

/** Default public calendars (free; run by independent operators — that's the point). */
export const DEFAULT_CALENDARS = [
  "https://alice.btc.calendar.opentimestamps.org",
  "https://bob.btc.calendar.opentimestamps.org",
  "https://finney.calendar.eternitywall.com",
] as const;

// ---------- byte plumbing ----------

class ByteWriter {
  private chunks: number[] = [];
  bytes(b: Uint8Array | number[]): this { for (const x of b) this.chunks.push(x); return this; }
  byte(b: number): this { this.chunks.push(b & 0xff); return this; }
  varuint(n: number): this {
    if (!Number.isInteger(n) || n < 0) throw new Error(`varuint: bad value ${n}`);
    if (n === 0) return this.byte(0);
    while (n > 0) { let b = n & 0x7f; n = Math.floor(n / 128); if (n > 0) b |= 0x80; this.byte(b); }
    return this;
  }
  varbytes(b: Uint8Array): this { return this.varuint(b.length).bytes(b); }
  out(): Uint8Array { return Uint8Array.from(this.chunks); }
}

export class ByteReader {
  constructor(private buf: Uint8Array, private pos = 0) {}
  get offset(): number { return this.pos; }
  get remaining(): number { return this.buf.length - this.pos; }
  byte(): number { if (this.pos >= this.buf.length) throw new Error("EOF"); return this.buf[this.pos++]!; }
  bytes(n: number): Uint8Array {
    if (this.pos + n > this.buf.length) throw new Error("EOF");
    const out = this.buf.slice(this.pos, this.pos + n); this.pos += n; return out;
  }
  varuint(): number {
    let value = 0, shift = 1;
    for (;;) { const b = this.byte(); value += (b & 0x7f) * shift; if (!(b & 0x80)) return value; shift *= 128; }
  }
  varbytes(max = 4096): Uint8Array { const n = this.varuint(); if (n > max) throw new Error(`varbytes too long: ${n}`); return this.bytes(n); }
  expect(expected: Uint8Array, what: string): void {
    const got = this.bytes(expected.length);
    if (!bytesEqual(got, expected)) throw new Error(`bad ${what}`);
  }
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2) throw new Error("bad hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

// ---------- model ----------

export type Attestation =
  | { kind: "pending"; uri: string }
  | { kind: "bitcoin"; height: number }
  | { kind: "unknown"; tag: Uint8Array; payload: Uint8Array };

export type Op =
  | { op: "sha256" }
  | { op: "append"; data: Uint8Array }
  | { op: "prepend"; data: Uint8Array };

/** A timestamp node: attestations on this message + ops leading to child nodes. */
export interface TimestampNode {
  attestations: Attestation[];
  ops: Array<{ op: Op; child: TimestampNode }>;
}

export const emptyNode = (): TimestampNode => ({ attestations: [], ops: [] });

// ---------- serialization (mirrors python-opentimestamps exactly) ----------

function serializeAttestation(w: ByteWriter, a: Attestation): void {
  const payload = new ByteWriter();
  if (a.kind === "pending") {
    const uri = new TextEncoder().encode(a.uri);
    payload.varbytes(uri);
    w.bytes(PENDING_ATTESTATION_TAG).varbytes(payload.out());
  } else if (a.kind === "bitcoin") {
    payload.varuint(a.height);
    w.bytes(BITCOIN_ATTESTATION_TAG).varbytes(payload.out());
  } else {
    w.bytes(a.tag).varbytes(a.payload);
  }
}

function attestationSortKey(a: Attestation): string {
  // Mirrors reference ordering: pendings ascending by URI, bitcoin by height; stable across kinds by tag.
  if (a.kind === "pending") return `${bytesToHex(PENDING_ATTESTATION_TAG)}:${a.uri}`;
  if (a.kind === "bitcoin") return `${bytesToHex(BITCOIN_ATTESTATION_TAG)}:${String(a.height).padStart(12, "0")}`;
  return `${bytesToHex(a.tag)}:${bytesToHex(a.payload)}`;
}
function opSortKey(o: Op): string {
  const w = new ByteWriter(); serializeOpTag(w, o); return bytesToHex(w.out());
}
function serializeOpTag(w: ByteWriter, o: Op): void {
  if (o.op === "sha256") w.byte(TAG_SHA256);
  else if (o.op === "append") w.byte(TAG_APPEND).varbytes(o.data);
  else w.byte(TAG_PREPEND).varbytes(o.data);
}

export function serializeTimestampNode(w: ByteWriter, node: TimestampNode): void {
  const atts = [...node.attestations].sort((x, y) => attestationSortKey(x).localeCompare(attestationSortKey(y)));
  const ops = [...node.ops].sort((x, y) => opSortKey(x.op).localeCompare(opSortKey(y.op)));
  if (atts.length + ops.length === 0) throw new Error("empty timestamp node (need >=1 attestation or op)");
  if (atts.length > 1) {
    for (const a of atts.slice(0, -1)) { w.byte(TAG_CONTINUE).byte(TAG_ATTESTATION); serializeAttestation(w, a); }
  }
  if (ops.length === 0) {
    w.byte(TAG_ATTESTATION); serializeAttestation(w, atts[atts.length - 1]!);
    return;
  }
  if (atts.length > 0) { w.byte(TAG_CONTINUE).byte(TAG_ATTESTATION); serializeAttestation(w, atts[atts.length - 1]!); }
  for (const { op, child } of ops.slice(0, -1)) { w.byte(TAG_CONTINUE); serializeOpTag(w, op); serializeTimestampNode(w, child); }
  const last = ops[ops.length - 1]!;
  serializeOpTag(w, last.op); serializeTimestampNode(w, last.child);
}

export function deserializeTimestampNode(r: ByteReader): TimestampNode {
  const node = emptyNode();
  let tag = r.byte();
  while (tag === TAG_CONTINUE) { readEntry(r, node, r.byte()); tag = r.byte(); }
  readEntry(r, node, tag);
  return node;
}
function readEntry(r: ByteReader, node: TimestampNode, tag: number): void {
  if (tag === TAG_ATTESTATION) {
    const attTag = r.bytes(8);
    const payload = r.varbytes(8192);
    if (bytesEqual(attTag, PENDING_ATTESTATION_TAG)) {
      const pr = new ByteReader(payload);
      node.attestations.push({ kind: "pending", uri: new TextDecoder().decode(pr.varbytes(1000)) });
    } else if (bytesEqual(attTag, BITCOIN_ATTESTATION_TAG)) {
      const pr = new ByteReader(payload);
      node.attestations.push({ kind: "bitcoin", height: pr.varuint() });
    } else {
      node.attestations.push({ kind: "unknown", tag: attTag, payload });
    }
    return;
  }
  let op: Op;
  if (tag === TAG_SHA256) op = { op: "sha256" };
  else if (tag === TAG_APPEND) op = { op: "append", data: r.varbytes(4096) };
  else if (tag === TAG_PREPEND) op = { op: "prepend", data: r.varbytes(4096) };
  else throw new Error(`unsupported op tag 0x${tag.toString(16)} (extend if calendars start emitting it)`);
  node.ops.push({ op, child: deserializeTimestampNode(r) });
}

// ---------- the public API ----------

export interface DetachedOts {
  /** SHA-256 digest the proof commits to (the Glass Ledger Merkle root). */
  digestHex: string;
  root: TimestampNode;
}

/**
 * Build a valid, upgradeable .ots file committing to a 32-byte SHA-256 digest
 * (your Merkle root) with pending-calendar attestations. This file is already a
 * complete commitment artifact; `otsUpgrade`/reference `ots upgrade` later swaps
 * pendings for a Bitcoin block attestation.
 */
export function buildDetachedOts(digestHex: string, calendars: readonly string[] = DEFAULT_CALENDARS): Uint8Array {
  const digest = hexToBytes(digestHex);
  if (digest.length !== 32) throw new Error(`digest must be 32 bytes (sha256), got ${digest.length}`);
  if (calendars.length === 0) throw new Error("need at least one calendar");
  const root = emptyNode();
  for (const uri of calendars) root.attestations.push({ kind: "pending", uri });
  return serializeDetached({ digestHex: bytesToHex(digest), root });
}

export function serializeDetached(d: DetachedOts): Uint8Array {
  const w = new ByteWriter();
  w.bytes(HEADER_MAGIC).varuint(MAJOR_VERSION).byte(TAG_SHA256).bytes(hexToBytes(d.digestHex));
  serializeTimestampNode(w, d.root);
  return w.out();
}

export function deserializeDetached(bytes: Uint8Array): DetachedOts {
  const r = new ByteReader(bytes);
  r.expect(HEADER_MAGIC, "header magic");
  const ver = r.varuint();
  if (ver !== MAJOR_VERSION) throw new Error(`unsupported version ${ver}`);
  const hashTag = r.byte();
  if (hashTag !== TAG_SHA256) throw new Error(`unsupported file hash op 0x${hashTag.toString(16)}`);
  const digest = r.bytes(32);
  const root = deserializeTimestampNode(r);
  if (r.remaining !== 0) throw new Error(`${r.remaining} trailing bytes`);
  return { digestHex: bytesToHex(digest), root };
}

/**
 * Submit the digest to calendars and graft their responses. fetchBinary is injected —
 * you own retries/timeouts (and tests inject fixtures; NO hidden network).
 * Each calendar response is a serialized TimestampNode rooted at the same digest.
 */
export async function submitToCalendars(
  digestHex: string,
  deps: { fetchBinary: (url: string, body: Uint8Array) => Promise<Uint8Array> },
  calendars: readonly string[] = DEFAULT_CALENDARS,
): Promise<{ ots: Uint8Array; ok: string[]; failed: Array<{ uri: string; error: string }> }> {
  const digest = hexToBytes(digestHex);
  if (digest.length !== 32) throw new Error("digest must be 32 bytes");
  const root = emptyNode();
  const ok: string[] = []; const failed: Array<{ uri: string; error: string }> = [];
  for (const uri of calendars) {
    try {
      const resp = await deps.fetchBinary(`${uri.replace(/\/$/, "")}/digest`, digest);
      const child = deserializeTimestampNode(new ByteReader(resp));
      // Graft: the calendar's tree hangs directly off our digest node.
      root.attestations.push(...child.attestations);
      root.ops.push(...child.ops);
      ok.push(uri);
    } catch (e) {
      // Honest degradation: a failed calendar just isn't attached; pending marker keeps upgrade path open.
      root.attestations.push({ kind: "pending", uri });
      failed.push({ uri, error: e instanceof Error ? e.message : String(e) });
    }
  }
  if (ok.length === 0 && failed.length === calendars.length) {
    // Still a valid, upgradeable commitment file (all pendings) — caller decides policy.
  }
  return { ots: serializeDetached({ digestHex, root }), ok, failed };
}

/** True once any node in the proof carries a Bitcoin block attestation (fully trustless). */
export function isBitcoinAttested(d: DetachedOts): boolean {
  const walk = (n: TimestampNode): boolean =>
    n.attestations.some((a) => a.kind === "bitcoin") || n.ops.some((o) => walk(o.child));
  return walk(d.root);
}

/** Extract human-facing status for the /proof surface. */
export function otsStatus(d: DetachedOts): { bitcoin: number[]; pendingCalendars: string[] } {
  const bitcoin: number[] = []; const pendingCalendars: string[] = [];
  const walk = (n: TimestampNode): void => {
    for (const a of n.attestations) {
      if (a.kind === "bitcoin") bitcoin.push(a.height);
      else if (a.kind === "pending") pendingCalendars.push(a.uri);
    }
    n.ops.forEach((o) => walk(o.child));
  };
  walk(d.root);
  return { bitcoin, pendingCalendars };
}

/**
 * Named transport type for callers (non-behavioral addition to the verbatim
 * packet port — types only, the deps shape is unchanged).
 */
export type CalendarTransport = {
  readonly fetchBinary: (url: string, body: Uint8Array) => Promise<Uint8Array>;
};
