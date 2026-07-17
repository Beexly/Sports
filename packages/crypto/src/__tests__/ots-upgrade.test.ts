/**
 * OTS upgrade (W-OTS slice 3) — pending calendar markers must upgrade into
 * Bitcoin attestations via the exact reference commitment path, conservatively:
 * failures and still-pending replies keep the original marker byte-for-byte,
 * the input is never mutated, and the upgraded proof still parses in the
 * official python reference library.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDetachedOts,
  bytesToHex,
  deserializeDetached,
  emptyNode,
  HEADER_MAGIC,
  hexToBytes,
  isBitcoinAttested,
  otsStatus,
  serializeDetached,
  type TimestampNode,
} from "../ots-anchor.js";
import { applyOp, upgradeDetached } from "../ots-upgrade.js";
import { createHash } from "node:crypto";

const ROOT = "d6b1e5a03a7b0d38fc9d4bce23a3d3bd7e0e33ad9c3ec25b5f0ba8c1c243c1f1";
const ALICE = "https://alice.btc.calendar.opentimestamps.org";

const sha = (b: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(b).digest());

/** Serialize a bare timestamp node the way a calendar's /timestamp reply is framed. */
function bareNodeBytes(node: TimestampNode): Uint8Array {
  return serializeDetached({ digestHex: ROOT, root: node }).slice(HEADER_MAGIC.length + 2 + 32);
}

function pythonReferenceAvailable(): boolean {
  try {
    execFileSync("python3", ["-c", "import opentimestamps"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const PY = pythonReferenceAvailable();

describe("applyOp — reference commitment semantics", () => {
  it("append/prepend/sha256 compose exactly as hand-computed", () => {
    const digest = hexToBytes(ROOT);
    const nonce = hexToBytes("00ff10ab");
    const appended = applyOp(digest, { op: "append", data: nonce });
    expect(bytesToHex(appended)).toBe(ROOT + "00ff10ab");
    const prepended = applyOp(digest, { op: "prepend", data: nonce });
    expect(bytesToHex(prepended)).toBe("00ff10ab" + ROOT);
    expect(bytesToHex(applyOp(appended, { op: "sha256" }))).toBe(bytesToHex(sha(appended)));
  });
});

describe("upgradeDetached", () => {
  /** Detached with the calendar-realistic shape: append(nonce) -> sha256 -> pending(alice). */
  function pendingDetached(): { detached: ReturnType<typeof deserializeDetached>; leafCommitmentHex: string } {
    const leaf = emptyNode();
    leaf.attestations.push({ kind: "pending", uri: ALICE });
    const shaNode = emptyNode();
    shaNode.ops.push({ op: { op: "sha256" }, child: leaf });
    const top = emptyNode();
    top.ops.push({ op: { op: "append", data: hexToBytes("00ff10ab") }, child: shaNode });
    const detached = deserializeDetached(serializeDetached({ digestHex: ROOT, root: top }));
    const leafCommitment = sha(applyOp(hexToBytes(ROOT), { op: "append", data: hexToBytes("00ff10ab") }));
    return { detached, leafCommitmentHex: bytesToHex(leafCommitment) };
  }

  it("requests the calendar at the EXACT op-path commitment and grafts the Bitcoin subtree", async () => {
    const { detached, leafCommitmentHex } = pendingDetached();
    const btc = emptyNode();
    btc.attestations.push({ kind: "bitcoin", height: 905432 });
    const urls: string[] = [];
    const result = await upgradeDetached(detached, {
      fetchBinary: async (url) => {
        urls.push(url);
        return bareNodeBytes(btc);
      },
    });
    expect(urls).toEqual([`${ALICE}/timestamp/${leafCommitmentHex}`]);
    expect(result.upgraded).toBe(true);
    expect(result.bitcoinHeights).toEqual([905432]);
    expect(result.stillPending).toEqual([]);
    // The upgraded structure round-trips and reads as Bitcoin-attested.
    const back = deserializeDetached(serializeDetached(result.detached));
    expect(isBitcoinAttested(back)).toBe(true);
    expect(otsStatus(back).pendingCalendars).toEqual([]);
    // Original input untouched — still pending.
    expect(otsStatus(detached).pendingCalendars).toEqual([ALICE]);
    expect(isBitcoinAttested(detached)).toBe(false);
  });

  it("a calendar failure keeps the pending marker byte-for-byte (conservative)", async () => {
    const { detached } = pendingDetached();
    const before = serializeDetached(detached);
    const result = await upgradeDetached(detached, {
      fetchBinary: async () => Promise.reject(new Error("ECONNRESET")),
    });
    expect(result.upgraded).toBe(false);
    expect(result.stillPending).toEqual([ALICE]);
    expect(serializeDetached(result.detached)).toEqual(before);
  });

  it("a still-pending calendar reply keeps the marker (no graft, retry later)", async () => {
    const { detached } = pendingDetached();
    const stillPendingReply = emptyNode();
    stillPendingReply.attestations.push({ kind: "pending", uri: ALICE });
    const result = await upgradeDetached(detached, {
      fetchBinary: async () => bareNodeBytes(stillPendingReply),
    });
    expect(result.upgraded).toBe(false);
    expect(result.stillPending).toEqual([ALICE]);
    expect(otsStatus(deserializeDetached(serializeDetached(result.detached))).pendingCalendars).toEqual([ALICE]);
  });

  it("a garbage calendar reply degrades to keeping the marker (parse failure)", async () => {
    const { detached } = pendingDetached();
    const result = await upgradeDetached(detached, {
      fetchBinary: async () => Uint8Array.from([0xde, 0xad, 0xbe, 0xef]),
    });
    expect(result.upgraded).toBe(false);
    expect(result.stillPending).toEqual([ALICE]);
  });

  it("multiple calendars: one upgrades, one stays pending — both reported honestly", async () => {
    const detached = deserializeDetached(buildDetachedOts(ROOT)); // 3 pending at root
    const btc = emptyNode();
    btc.attestations.push({ kind: "bitcoin", height: 905500 });
    const result = await upgradeDetached(detached, {
      fetchBinary: async (url) =>
        url.startsWith(ALICE) ? bareNodeBytes(btc) : Promise.reject(new Error("down")),
    });
    expect(result.upgraded).toBe(true);
    expect(result.bitcoinHeights).toEqual([905500]);
    expect(result.stillPending).toHaveLength(2);
    const status = otsStatus(deserializeDetached(serializeDetached(result.detached)));
    expect(status.bitcoin).toEqual([905500]);
    expect(status.pendingCalendars).toHaveLength(2);
  });
});

describe.skipIf(!PY)("CROSS-IMPLEMENTATION: python parses an UPGRADED proof", () => {
  it("upgraded ops-path + bitcoin attestation deserializes in the reference library", async () => {
    const leaf = emptyNode();
    leaf.attestations.push({ kind: "pending", uri: ALICE });
    const top = emptyNode();
    top.ops.push({ op: { op: "sha256" }, child: leaf });
    const detached = deserializeDetached(serializeDetached({ digestHex: ROOT, root: top }));
    const btc = emptyNode();
    btc.attestations.push({ kind: "bitcoin", height: 905432 });
    const result = await upgradeDetached(detached, { fetchBinary: async () => bareNodeBytes(btc) });
    const dir = mkdtempSync(join(tmpdir(), "gse-ots-up-"));
    const file = join(dir, "upgraded.ots");
    writeFileSync(file, serializeDetached(result.detached));
    const py = `
from opentimestamps.core.timestamp import DetachedTimestampFile
from opentimestamps.core.serialize import StreamDeserializationContext
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation
with open(${JSON.stringify(file)},"rb") as f:
    d = DetachedTimestampFile.deserialize(StreamDeserializationContext(f))
found = []
def visit(ts):
    for a in ts.attestations:
        if isinstance(a, BitcoinBlockHeaderAttestation):
            found.append(a.height)
    for op, child in ts.ops.items():
        visit(child)
visit(d.timestamp)
print(",".join(str(h) for h in sorted(found)))
`;
    const out = execFileSync("python3", ["-c", py], { encoding: "utf8" }).trim();
    expect(out).toBe("905432");
  });
});
