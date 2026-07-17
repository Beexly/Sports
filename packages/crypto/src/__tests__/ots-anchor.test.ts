/**
 * gse-ots-anchor — ported from the founder packet's test.mjs (10/10 there).
 * The decisive tests are CROSS-IMPLEMENTATION: our serialized .ots must parse
 * byte-perfectly in the OFFICIAL python-opentimestamps reference library. They
 * run whenever that library is importable (skipped LOUDLY otherwise — the
 * packet already proved them; CI without pip stays green without lying).
 *
 * The live calendar round-trip (the packet's one open job) is opt-in via
 * OTS_LIVE_SMOKE=1 — real network never runs in CI.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDetachedOts,
  bytesToHex,
  DEFAULT_CALENDARS,
  deserializeDetached,
  emptyNode,
  HEADER_MAGIC,
  hexToBytes,
  isBitcoinAttested,
  otsStatus,
  serializeDetached,
  submitToCalendars,
} from "../ots-anchor.js";

const ROOT = "d6b1e5a03a7b0d38fc9d4bce23a3d3bd7e0e33ad9c3ec25b5f0ba8c1c243c1f1";
const ALICE = "https://alice.btc.calendar.opentimestamps.org";

function pythonReferenceAvailable(): boolean {
  try {
    execFileSync("python3", ["-c", "import opentimestamps"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const PY = pythonReferenceAvailable();

describe("ots serialization (packet parity)", () => {
  it("header magic + version + digest lead the file", () => {
    const ots = buildDetachedOts(ROOT, [ALICE]);
    expect([...ots.slice(0, HEADER_MAGIC.length)]).toEqual([...HEADER_MAGIC]);
    expect(ots[HEADER_MAGIC.length]).toBe(1);
    expect(ots[HEADER_MAGIC.length + 1]).toBe(0x08);
    expect(bytesToHex(ots.slice(HEADER_MAGIC.length + 2, HEADER_MAGIC.length + 34))).toBe(ROOT);
  });

  it("round-trips one pending calendar; not bitcoin-attested", () => {
    const d = deserializeDetached(buildDetachedOts(ROOT, [ALICE]));
    expect(d.digestHex).toBe(ROOT);
    expect(otsStatus(d).pendingCalendars).toEqual([ALICE]);
    expect(isBitcoinAttested(d)).toBe(false);
  });

  it("three pending calendars round-trip byte-stably (0xff continuation framing)", () => {
    const ots = buildDetachedOts(ROOT);
    const d = deserializeDetached(ots);
    expect(otsStatus(d).pendingCalendars).toHaveLength(3);
    expect(serializeDetached(d)).toEqual(ots);
  });

  it("bitcoin attestation round-trips and flips isBitcoinAttested", () => {
    const node = emptyNode();
    node.attestations.push({ kind: "bitcoin", height: 905432 });
    const back = deserializeDetached(serializeDetached({ digestHex: ROOT, root: node }));
    expect(isBitcoinAttested(back)).toBe(true);
    expect(otsStatus(back).bitcoin).toEqual([905432]);
  });

  it("varuint edge values survive (0, 127, 128, 300, 2^31)", () => {
    for (const h of [0, 127, 128, 300, 2 ** 31]) {
      const node = emptyNode();
      node.attestations.push({ kind: "bitcoin", height: h });
      const back = deserializeDetached(serializeDetached({ digestHex: ROOT, root: node }));
      expect(otsStatus(back).bitcoin).toEqual([h]);
    }
  });

  it("rejects non-32-byte digests", () => {
    expect(() => buildDetachedOts("abcd")).toThrow(/32 bytes/);
    expect(() => buildDetachedOts(ROOT.slice(0, 62))).toThrow(/bad hex|32 bytes/);
  });
});

describe("calendar transport (fixture-injected, no hidden HTTP)", () => {
  it("grafts a calendar reply (append+sha256+pending) under the digest", async () => {
    const leaf = emptyNode();
    leaf.attestations.push({ kind: "pending", uri: ALICE });
    const sha = emptyNode();
    sha.ops.push({ op: { op: "sha256" }, child: leaf });
    const top = emptyNode();
    top.ops.push({ op: { op: "append", data: hexToBytes("00ff10ab") }, child: sha });
    const fixture = serializeDetached({ digestHex: ROOT, root: top }).slice(HEADER_MAGIC.length + 2 + 32);

    const calls: { url: string; body: string }[] = [];
    const { ots, ok, failed } = await submitToCalendars(
      ROOT,
      {
        fetchBinary: async (url, body) => {
          calls.push({ url, body: bytesToHex(body) });
          return fixture;
        },
      },
      [ALICE],
    );
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(0);
    expect(calls[0]!.url).toBe(`${ALICE}/digest`);
    expect(calls[0]!.body).toBe(ROOT);
    const d = deserializeDetached(ots);
    expect(d.root.ops[0]!.op.op).toBe("append");
    expect(otsStatus(d).pendingCalendars).toHaveLength(1);
  });

  it("a failing calendar degrades honestly to a pending marker", async () => {
    const bob = "https://bob.btc.calendar.opentimestamps.org";
    const { ots, ok, failed } = await submitToCalendars(
      ROOT,
      { fetchBinary: async () => Promise.reject(new Error("ECONNRESET")) },
      [bob],
    );
    expect(ok).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(otsStatus(deserializeDetached(ots)).pendingCalendars).toEqual([bob]);
  });
});

describe.skipIf(!PY)("CROSS-IMPLEMENTATION vs official python-opentimestamps", () => {
  const dir = PY ? mkdtempSync(join(tmpdir(), "gse-ots-")) : "";

  it("python parses our 3-calendar pending proof byte-exactly", () => {
    const file = join(dir, "crosscheck.ots");
    writeFileSync(file, buildDetachedOts(ROOT));
    const py = `
import sys
from opentimestamps.core.timestamp import DetachedTimestampFile
from opentimestamps.core.serialize import StreamDeserializationContext
from opentimestamps.core.notary import PendingAttestation
with open(${JSON.stringify(file)},"rb") as f:
    d = DetachedTimestampFile.deserialize(StreamDeserializationContext(f))
def uri_str(a):
    u = a.uri
    return u.decode() if isinstance(u, (bytes, bytearray)) else str(u)
print(d.file_digest.hex())
print("|".join(sorted(uri_str(a) for a in d.timestamp.attestations if isinstance(a, PendingAttestation))))
`;
    const out = execFileSync("python3", ["-c", py], { encoding: "utf8" }).trim().split("\n");
    expect(out[0]).toBe(ROOT);
    expect(out[1]!.split("|")).toEqual([...DEFAULT_CALENDARS].sort());
  });

  it("python parses a bitcoin-attested proof we serialized", () => {
    const node = emptyNode();
    node.attestations.push({ kind: "bitcoin", height: 905432 });
    const file = join(dir, "crosscheck-btc.ots");
    writeFileSync(file, serializeDetached({ digestHex: ROOT, root: node }));
    const py = `
from opentimestamps.core.timestamp import DetachedTimestampFile
from opentimestamps.core.serialize import StreamDeserializationContext
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation
with open(${JSON.stringify(file)},"rb") as f:
    d = DetachedTimestampFile.deserialize(StreamDeserializationContext(f))
a = list(d.timestamp.attestations)[0]
assert isinstance(a, BitcoinBlockHeaderAttestation), type(a)
print(a.height)
`;
    expect(execFileSync("python3", ["-c", py], { encoding: "utf8" }).trim()).toBe("905432");
  });
});

describe.skipIf(process.env["OTS_LIVE_SMOKE"] !== "1")("LIVE calendar round-trip (opt-in, never CI)", () => {
  it("submits a digest to the public calendars and grafts real pending attestations", async () => {
    const { ots, ok, failed } = await submitToCalendars(ROOT, {
      fetchBinary: async (url, body) => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: Buffer.from(body),
        });
        if (!res.ok) throw new Error(`${url} -> ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      },
    });
    // At least one public calendar must accept; failures are named.
    expect(ok.length, `failed: ${failed.map((f) => f.uri).join(", ")}`).toBeGreaterThan(0);
    const d = deserializeDetached(ots);
    expect(d.digestHex).toBe(ROOT);
    expect(otsStatus(d).pendingCalendars.length).toBeGreaterThan(0);
  }, 30_000);
});
