// gse-ots-anchor tests. The decisive one is CROSS-IMPLEMENTATION: our serialized
// .ots must parse byte-perfectly in the OFFICIAL python-opentimestamps reference
// library. No network anywhere; calendar transport is fixture-injected.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildDetachedOts, deserializeDetached, serializeDetached, submitToCalendars,
  isBitcoinAttested, otsStatus, hexToBytes, bytesToHex, HEADER_MAGIC,
  ByteReader, deserializeTimestampNode, emptyNode, serializeTimestampNode,
} from "./dist/index.js";

const TMP_DIR = join(tmpdir(), "gse-ots-anchor");
mkdirSync(TMP_DIR, { recursive: true });

function detectPythonOtsCmd() {
  for (const cmd of ["python3", "python"]) {
    try {
      execFileSync(cmd, ["-c", "import opentimestamps"], { stdio: "ignore" });
      return cmd;
    } catch {
      // candidate unavailable or missing python-opentimestamps
    }
  }
  return null;
}

const PY_OTS_CMD = detectPythonOtsCmd();

const ROOT = "d6b1e5a03a7b0d38fc9d4bce23a3d3bd7e0e33ad9c3ec25b5f0ba8c1c243c1f1"; // synthetic Merkle root

test("header magic + version + digest lead the file", () => {
  const ots = buildDetachedOts(ROOT, ["https://alice.btc.calendar.opentimestamps.org"]);
  assert.deepEqual([...ots.slice(0, HEADER_MAGIC.length)], [...HEADER_MAGIC]);
  assert.equal(ots[HEADER_MAGIC.length], 1, "major version varuint");
  assert.equal(ots[HEADER_MAGIC.length + 1], 0x08, "sha256 file-hash op tag");
  assert.equal(bytesToHex(ots.slice(HEADER_MAGIC.length + 2, HEADER_MAGIC.length + 34)), ROOT);
});

test("round-trip: one pending calendar", () => {
  const ots = buildDetachedOts(ROOT, ["https://alice.btc.calendar.opentimestamps.org"]);
  const d = deserializeDetached(ots);
  assert.equal(d.digestHex, ROOT);
  assert.deepEqual(otsStatus(d).pendingCalendars, ["https://alice.btc.calendar.opentimestamps.org"]);
  assert.equal(isBitcoinAttested(d), false);
});

test("round-trip: three pending calendars (0xff continuation framing)", () => {
  const ots = buildDetachedOts(ROOT);
  const d = deserializeDetached(ots);
  assert.equal(otsStatus(d).pendingCalendars.length, 3);
  assert.deepEqual(serializeDetached(d), ots, "re-serialization is byte-stable");
});

test("bitcoin attestation round-trips and flips isBitcoinAttested", () => {
  const node = emptyNode();
  node.attestations.push({ kind: "bitcoin", height: 905432 });
  const d = { digestHex: ROOT, root: node };
  const back = deserializeDetached(serializeDetached(d));
  assert.equal(isBitcoinAttested(back), true);
  assert.deepEqual(otsStatus(back).bitcoin, [905432]);
});

test("varuint edge values survive (0, 127, 128, 300, 2^31)", () => {
  for (const h of [0, 127, 128, 300, 2 ** 31]) {
    const node = emptyNode();
    node.attestations.push({ kind: "bitcoin", height: h });
    const back = deserializeDetached(serializeDetached({ digestHex: ROOT, root: node }));
    assert.deepEqual(otsStatus(back).bitcoin, [h]);
  }
});

test("digest validation: non-32-byte digest rejected", () => {
  assert.throws(() => buildDetachedOts("abcd"), /32 bytes/);
  assert.throws(() => buildDetachedOts(ROOT.slice(0, 62)), /bad hex|32 bytes/);
});

test("calendar graft: fixture response with append+sha256 chain and pending attestation", async () => {
  // Fixture: a realistic calendar reply — append(nonce) -> sha256 -> pending(uri)
  const w = [];
  const fixture = (() => {
    // build via our own serializer: node{ ops: [append(nonce) -> node{ ops: [sha256 -> node{ pending }] }] }
    const leaf = emptyNode();
    leaf.attestations.push({ kind: "pending", uri: "https://alice.btc.calendar.opentimestamps.org" });
    const sha = emptyNode();
    sha.ops.push({ op: { op: "sha256" }, child: leaf });
    const top = emptyNode();
    top.ops.push({ op: { op: "append", data: hexToBytes("00ff10ab") }, child: sha });
    const bw = { chunks: [] };
    // serialize through public API by wrapping in a detached file, then strip header+digest
    const full = serializeDetached({ digestHex: ROOT, root: top });
    return full.slice(HEADER_MAGIC.length + 2 + 32);
  })();
  const calls = [];
  const { ots, ok, failed } = await submitToCalendars(ROOT, {
    fetchBinary: async (url, body) => { calls.push({ url, body: bytesToHex(body) }); return fixture; },
  }, ["https://alice.btc.calendar.opentimestamps.org"]);
  assert.equal(ok.length, 1); assert.equal(failed.length, 0);
  assert.equal(calls[0].url, "https://alice.btc.calendar.opentimestamps.org/digest");
  assert.equal(calls[0].body, ROOT, "raw digest bytes are POSTed");
  const d = deserializeDetached(ots);
  assert.equal(d.root.ops.length, 1);
  assert.equal(d.root.ops[0].op.op, "append");
  assert.equal(otsStatus(d).pendingCalendars.length, 1);
});

test("calendar failure degrades honestly to a pending marker", async () => {
  const { ots, ok, failed } = await submitToCalendars(ROOT, {
    fetchBinary: async () => { throw new Error("ECONNRESET"); },
  }, ["https://bob.btc.calendar.opentimestamps.org"]);
  assert.equal(ok.length, 0); assert.equal(failed.length, 1);
  const d = deserializeDetached(ots);
  assert.deepEqual(otsStatus(d).pendingCalendars, ["https://bob.btc.calendar.opentimestamps.org"]);
});

test("CROSS-IMPLEMENTATION: official python-opentimestamps parses our .ots byte-exactly", { skip: !PY_OTS_CMD && "python opentimestamps package not installed" }, () => {
  const ots = buildDetachedOts(ROOT); // 3 pending calendars
  const otsPath = join(TMP_DIR, "crosscheck.ots");
  writeFileSync(otsPath, ots);
  const py = `
import sys
from opentimestamps.core.timestamp import DetachedTimestampFile
from opentimestamps.core.serialize import StreamDeserializationContext
from opentimestamps.core.notary import PendingAttestation
with open(sys.argv[1],"rb") as f:
    ctx = StreamDeserializationContext(f)
    d = DetachedTimestampFile.deserialize(ctx)
digest = d.file_digest.hex()
def uri_str(a):
    u = a.uri
    return u.decode() if isinstance(u, (bytes, bytearray)) else str(u)
atts = sorted(uri_str(a) for a in d.timestamp.attestations if isinstance(a, PendingAttestation))
print(digest)
print("|".join(atts))
`;
  const out = execFileSync(PY_OTS_CMD, ["-c", py, otsPath], { encoding: "utf8" }).trim().split(/\r?\n/);
  assert.equal(out[0], ROOT, "python sees the same digest");
  assert.deepEqual(out[1].split("|"), [
    "https://alice.btc.calendar.opentimestamps.org",
    "https://bob.btc.calendar.opentimestamps.org",
    "https://finney.calendar.eternitywall.com",
  ], "python sees all three pending calendar attestations");
});

test("CROSS-IMPLEMENTATION: python parses a bitcoin-attested proof we serialized", { skip: !PY_OTS_CMD && "python opentimestamps package not installed" }, () => {
  const node = emptyNode();
  node.attestations.push({ kind: "bitcoin", height: 905432 });
  const otsBtcPath = join(TMP_DIR, "crosscheck-btc.ots");
  writeFileSync(otsBtcPath, serializeDetached({ digestHex: ROOT, root: node }));
  const py = `
import sys
from opentimestamps.core.timestamp import DetachedTimestampFile
from opentimestamps.core.serialize import StreamDeserializationContext
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation
with open(sys.argv[1],"rb") as f:
    d = DetachedTimestampFile.deserialize(StreamDeserializationContext(f))
a = list(d.timestamp.attestations)[0]
assert isinstance(a, BitcoinBlockHeaderAttestation), type(a)
print(a.height)
`;
  const out = execFileSync(PY_OTS_CMD, ["-c", py, otsBtcPath], { encoding: "utf8" }).trim();
  assert.equal(out, "905432");
});
