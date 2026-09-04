import { describe, it, expect } from "vitest";

import {
  appendPick,
  appendSettlement,
  chainDigest,
  verifyChain,
  GENESIS_HASH,
  type LedgerChain,
  type LedgerEntry,
  type LedgerPickEntry,
  type LedgerSettlement,
} from "../ledger-chain.js";
import { canonicalJson, sha256Hex, type Canonical } from "../provenance.js";
import {
  auditLedgerChainRows,
  summarizeLedgerRowAudit,
  type StoredLedgerChainRow,
} from "../ledger-chain-row-audit.js";

/**
 * TAMPER MATRIX for the durable Glass Ledger (PR #601's
 * `ledger_chain_entries`). Every case here is a concrete edit an actor with
 * write access to the table could make. For each one we record BOTH what the
 * shipped hash verifier (`verifyChain`, which is what
 * `scripts/edge-lab/recompute.ts` runs) reports AND what the stored-row audit
 * reports — including the cases where the two disagree, which is the whole
 * reason the row audit exists.
 *
 * Fixtures are not hand-written hashes: the chain is built with the real
 * `appendPick`/`appendSettlement` and then PROJECTED into rows exactly the
 * way `ledger-chain-store.ts` writes them, and the projection is asserted to
 * reproduce the real `entryHash`. If the chain math changes, these fixtures
 * fail rather than drift.
 */

const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);

function pickCommitted(p: LedgerPickEntry): Canonical {
  return {
    seq: p.seq,
    prevHash: p.prevHash,
    pickId: p.pickId,
    sport: p.sport,
    market: p.market,
    selection: p.selection,
    priceDecimal: p.priceDecimal,
    book: p.book,
    decisionAt: p.decisionAt,
    kickoffAt: p.kickoffAt,
    modelVersion: p.modelVersion,
    featureSnapshotHash: p.featureSnapshotHash,
  };
}

function settlementCommitted(s: LedgerSettlement): Canonical {
  return {
    seq: s.seq,
    pickId: s.pickId,
    settledAt: s.settledAt,
    outcome: s.outcome,
    closingPriceDecimal: s.closingPriceDecimal,
    clvBps: s.clvBps,
    prevHash: s.prevHash,
  };
}

function isSettlementEntry(e: LedgerEntry): e is LedgerSettlement {
  return "outcome" in e;
}

/** Project an in-memory entry into the row `ledger-chain-store.ts` would write. */
function toRow(entry: LedgerEntry): StoredLedgerChainRow {
  if (isSettlementEntry(entry)) {
    return {
      chainId: "glass-v1",
      seq: entry.seq,
      prevHash: entry.prevHash,
      entryHash: entry.entryHash,
      entryType: "SETTLEMENT",
      pickId: entry.pickId,
      payload: canonicalJson(settlementCommitted(entry)),
      hashAlg: "sha256",
      canonVersion: 1,
      modelVersion: null,
      occurredAt: new Date(entry.settledAt),
    };
  }
  return {
    chainId: "glass-v1",
    seq: entry.seq,
    prevHash: entry.prevHash,
    entryHash: entry.entryHash,
    entryType: "PICK",
    pickId: entry.pickId,
    payload: canonicalJson(pickCommitted(entry)),
    hashAlg: "sha256",
    canonVersion: 1,
    modelVersion: entry.modelVersion,
    occurredAt: new Date(entry.decisionAt),
  };
}

/** Exactly `ledger-chain-store.ts#rowToEntry`: the export/verify path. */
function rowsToEntries(rows: readonly StoredLedgerChainRow[]): LedgerEntry[] {
  return rows.map((row) => {
    const body = JSON.parse(row.payload) as Record<string, unknown>;
    return { ...body, entryHash: row.entryHash } as unknown as LedgerEntry;
  });
}

function buildChain(): LedgerChain {
  let chain: LedgerChain = [];
  chain = appendPick(chain, {
    seq: 0,
    prevHash: GENESIS_HASH,
    pickId: "pick-alpha",
    sport: "NFL",
    market: "SPREAD",
    selection: "KC -2.5",
    priceDecimal: 1.91,
    book: "pinnacle",
    decisionAt: "2026-09-13T15:00:00.000Z",
    kickoffAt: "2026-09-13T17:00:00.000Z",
    modelVersion: "edge-v3.2.0",
    featureSnapshotHash: HEX_A,
  });
  chain = appendPick(chain, {
    seq: 1,
    prevHash: chain[0]!.entryHash,
    pickId: "pick-beta",
    sport: "NFL",
    market: "TOTAL",
    selection: "OVER 44.5",
    priceDecimal: 1.95,
    book: "circa",
    decisionAt: "2026-09-13T15:05:00.000Z",
    kickoffAt: "2026-09-13T20:05:00.000Z",
    modelVersion: "edge-v3.2.0",
    featureSnapshotHash: HEX_B,
  });
  chain = appendSettlement(chain, {
    seq: 2,
    prevHash: chain[1]!.entryHash,
    pickId: "pick-alpha",
    settledAt: "2026-09-13T20:30:00.000Z",
    outcome: "WIN",
    closingPriceDecimal: 1.83,
    clvBps: 231.05,
  });
  return chain;
}

function honestRows(): StoredLedgerChainRow[] {
  return buildChain().map(toRow);
}

function codesOf(rows: readonly StoredLedgerChainRow[]): string[] {
  return auditLedgerChainRows(rows).findings.map((f) => f.code);
}

describe("ledger row projection is faithful to the real chain math", () => {
  it("reproduces every entryHash as sha256 of the stored payload bytes", () => {
    const rows = honestRows();
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(sha256Hex(row.payload)).toBe(row.entryHash);
    }
  });

  it("audits clean, and says out loud that truncation was not ruled out", () => {
    const rows = honestRows();
    const result = auditLedgerChainRows(rows);
    expect(result.findings).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.anchorChecked).toBe(false);
    expect(summarizeLedgerRowAudit(result)).toContain("NO ANCHOR SUPPLIED");
    expect(result.tipHash).toBe(rows[2]!.entryHash);
  });

  it("an empty table is a valid empty chain, not an error (the table stays optional)", () => {
    const result = auditLedgerChainRows([]);
    expect(result.ok).toBe(true);
    expect(result.count).toBe(0);
    expect(result.tipHash).toBe(GENESIS_HASH);
  });
});

describe("tamper class: mutation of a hashed field — BOTH verifiers catch it", () => {
  it("rewriting a pick's selection inside the payload breaks the hash", () => {
    const rows = honestRows();
    rows[0] = { ...rows[0]!, payload: rows[0]!.payload.replace('"KC -2.5"', '"KC -7.5"') };

    expect(verifyChain(rowsToEntries(rows)).valid).toBe(false);
    expect(codesOf(rows)).toContain("ROW_ENTRY_HASH_MISMATCH");
  });

  it("rewriting a settlement outcome breaks the hash", () => {
    const rows = honestRows();
    rows[2] = { ...rows[2]!, payload: rows[2]!.payload.replace('"WIN"', '"LOSS"') };

    expect(verifyChain(rowsToEntries(rows)).valid).toBe(false);
    expect(codesOf(rows)).toContain("ROW_ENTRY_HASH_MISMATCH");
  });

  it("re-hashing a rewritten entry still breaks the NEXT entry's prevHash — linkage, not just hash", () => {
    const chain = buildChain();
    const rows = chain.map(toRow);
    // Full, internally-consistent forgery of entry 1: new payload AND a
    // matching entryHash. The row itself now hashes correctly.
    const forgedPayload = rows[1]!.payload.replace('"OVER 44.5"', '"UNDER 44.5"');
    rows[1] = { ...rows[1]!, payload: forgedPayload, entryHash: sha256Hex(forgedPayload) };

    // Entry 1 alone is self-consistent...
    expect(sha256Hex(rows[1]!.payload)).toBe(rows[1]!.entryHash);
    // ...but entry 2's HASHED prevHash still commits to the old entry 1 hash.
    const audit = auditLedgerChainRows(rows);
    expect(audit.ok).toBe(false);
    expect(audit.findings.map((f) => f.code)).toContain("CHAIN_PREV_HASH_BROKEN");
    expect(audit.findings.find((f) => f.code === "CHAIN_PREV_HASH_BROKEN")?.index).toBe(2);
    expect(verifyChain(rowsToEntries(rows)).valid).toBe(false);
  });
});

describe("tamper class: mid-chain deletion — BOTH verifiers catch it", () => {
  it("deleting the middle row leaves a seq gap", () => {
    const rows = honestRows();
    const truncated = [rows[0]!, rows[2]!];

    expect(verifyChain(rowsToEntries(truncated)).valid).toBe(false);
    expect(codesOf(truncated)).toContain("CHAIN_SEQ_NOT_CONTIGUOUS");
  });
});

describe("tamper class: TIP TRUNCATION — the honest negative", () => {
  it("dropping the tip row leaves a chain that BOTH verifiers call valid", () => {
    const rows = honestRows();
    const truncated = rows.slice(0, 2);

    // This is the limitation, asserted rather than hidden.
    expect(verifyChain(rowsToEntries(truncated)).valid).toBe(true);
    expect(auditLedgerChainRows(truncated).ok).toBe(true);
    expect(auditLedgerChainRows(truncated).anchorChecked).toBe(false);
  });

  it("an external anchor is what makes truncation detectable", () => {
    const rows = honestRows();
    const anchor = chainDigest(buildChain()); // published when the chain had 3 entries
    const truncated = rows.slice(0, 2);

    const audit = auditLedgerChainRows(truncated, { anchor });
    expect(audit.ok).toBe(false);
    const codes = audit.findings.map((f) => f.code);
    expect(codes).toContain("ANCHOR_TIP_MISMATCH");
    expect(codes).toContain("ANCHOR_COUNT_MISMATCH");

    // And the un-truncated chain passes against the same anchor.
    const clean = auditLedgerChainRows(rows, { anchor });
    expect(clean.ok).toBe(true);
    expect(clean.anchorChecked).toBe(true);
    expect(summarizeLedgerRowAudit(clean)).toContain("VERIFIED");
  });
});

describe("tamper class: UNHASHED PROJECTION COLUMNS — the hash verifier is blind", () => {
  it("flipping the entryType column defeats the uniqueness guard while verifyChain says VALID", () => {
    const rows = honestRows();
    // The settlement row relabelled as a PICK. `entryType` is not a hashed
    // field, so nothing about the payload or the linkage changes — but
    // `(chainId, entryType, pickId)` now permits a second SETTLEMENT for
    // pick-alpha, and the store's prior-pick lookup
    // (where entryType: "PICK", pickId) now resolves to this row.
    rows[2] = { ...rows[2]!, entryType: "PICK" };

    expect(verifyChain(rowsToEntries(rows)).valid).toBe(true); // blind

    const audit = auditLedgerChainRows(rows);
    expect(audit.ok).toBe(false);
    const finding = audit.findings.find((f) => f.column === "entryType");
    expect(finding?.code).toBe("ROW_COLUMN_DIVERGED");
    expect(finding?.index).toBe(2);
  });

  it("rewriting the pickId column re-parents a settlement while verifyChain says VALID", () => {
    const rows = honestRows();
    rows[2] = { ...rows[2]!, pickId: "pick-beta" };

    expect(verifyChain(rowsToEntries(rows)).valid).toBe(true); // blind

    const audit = auditLedgerChainRows(rows);
    expect(audit.ok).toBe(false);
    expect(audit.findings.find((f) => f.column === "pickId")?.code).toBe("ROW_COLUMN_DIVERGED");
  });

  it("rewriting the seq column reorders the export while verifyChain says VALID", () => {
    const rows = honestRows();
    // Column-only change: the loader orders by this column, the payload is untouched.
    rows[1] = { ...rows[1]!, seq: 7 };

    expect(verifyChain(rowsToEntries(rows)).valid).toBe(true); // blind — it reads the payload seq

    expect(codesOf(rows)).toContain("ROW_COLUMN_DIVERGED");
    expect(auditLedgerChainRows(rows).findings.find((f) => f.column === "seq")).toBeDefined();
  });

  it("rewriting the prevHash column diverges from the hashed linkage while verifyChain says VALID", () => {
    const rows = honestRows();
    rows[1] = { ...rows[1]!, prevHash: GENESIS_HASH };

    expect(verifyChain(rowsToEntries(rows)).valid).toBe(true); // blind

    expect(auditLedgerChainRows(rows).findings.find((f) => f.column === "prevHash")?.code).toBe(
      "ROW_COLUMN_DIVERGED",
    );
  });

  it("rewriting the modelVersion and occurredAt columns is caught", () => {
    const rows = honestRows();
    rows[0] = { ...rows[0]!, modelVersion: "edge-v9.9.9", occurredAt: new Date("2026-01-01T00:00:00.000Z") };

    expect(verifyChain(rowsToEntries(rows)).valid).toBe(true); // blind

    const columns = auditLedgerChainRows(rows)
      .findings.filter((f) => f.code === "ROW_COLUMN_DIVERGED")
      .map((f) => f.column);
    expect(columns).toContain("modelVersion");
    expect(columns).toContain("occurredAt");
  });

  it("moving a row to a different chainId is caught as a mixed chain", () => {
    const rows = honestRows();
    rows[1] = { ...rows[1]!, chainId: "glass-v2" };

    expect(codesOf(rows)).toContain("CHAIN_ID_MIXED");
  });

  it("an unsupported hashAlg or canonVersion is refused, not silently verified", () => {
    const rows = honestRows();
    rows[0] = { ...rows[0]!, hashAlg: "md5", canonVersion: 2 };

    const codes = codesOf(rows);
    expect(codes).toContain("ROW_HASH_ALG_UNSUPPORTED");
    expect(codes).toContain("ROW_CANON_VERSION_UNSUPPORTED");
  });
});

describe("tamper class: payload SHAPE — the field-projecting verifier is blind or crashes", () => {
  it("an extra key smuggled into the payload is invisible to verifyChain", () => {
    const rows = honestRows();
    const body = JSON.parse(rows[0]!.payload) as Record<string, unknown>;
    body["backdatedNote"] = "added later";
    const payload = canonicalJson(body as Canonical);
    // The attacker keeps the ORIGINAL entryHash, which verifyChain recomputes
    // from projected fields only — so the extra key never enters the hash.
    rows[0] = { ...rows[0]!, payload };

    expect(verifyChain(rowsToEntries(rows)).valid).toBe(true); // blind

    const codes = codesOf(rows);
    expect(codes).toContain("ROW_PAYLOAD_FIELD_SET");
    expect(codes).toContain("ROW_ENTRY_HASH_MISMATCH");
  });

  it("a missing committed key is reported instead of crashing the verifier", () => {
    const rows = honestRows();
    const body = JSON.parse(rows[0]!.payload) as Record<string, unknown>;
    delete body["book"];
    rows[0] = { ...rows[0]!, payload: canonicalJson(body as Canonical) };

    // The shipped field-projecting verifier THROWS on a missing key rather
    // than reporting a broken chain (canonicalJson refuses `undefined`).
    expect(() => verifyChain(rowsToEntries(rows))).toThrow();

    const audit = auditLedgerChainRows(rows);
    expect(audit.ok).toBe(false);
    expect(audit.findings.map((f) => f.code)).toContain("ROW_PAYLOAD_FIELD_SET");
  });

  it("a non-canonical payload encoding is reported", () => {
    const rows = honestRows();
    const body = JSON.parse(rows[0]!.payload) as Record<string, unknown>;
    const nonCanonical = JSON.stringify(body, Object.keys(body).reverse());
    rows[0] = { ...rows[0]!, payload: nonCanonical, entryHash: sha256Hex(nonCanonical) };

    const codes = codesOf(rows);
    expect(codes).toContain("ROW_PAYLOAD_NOT_CANONICAL");
  });

  it("an unparseable payload is a finding, not a thrown exception", () => {
    const rows = honestRows();
    rows[1] = { ...rows[1]!, payload: "{not json" };

    const audit = auditLedgerChainRows(rows);
    expect(audit.ok).toBe(false);
    expect(audit.findings.map((f) => f.code)).toContain("ROW_PAYLOAD_UNPARSEABLE");
  });
});

describe("tamper class: fabricated rows", () => {
  it("a settlement with no prior pick is rejected", () => {
    const rows = honestRows();
    const orphan = { ...rows[2]! };
    const body = JSON.parse(orphan.payload) as Record<string, unknown>;
    body["pickId"] = "pick-that-never-existed";
    const payload = canonicalJson(body as Canonical);
    const forged = {
      ...orphan,
      pickId: "pick-that-never-existed",
      payload,
      entryHash: sha256Hex(payload),
    };

    const codes = codesOf([rows[0]!, rows[1]!, forged]);
    expect(codes).toContain("CHAIN_UNKNOWN_PICK");
  });

  it("a duplicated entryHash is reported", () => {
    const rows = honestRows();
    const dup = [rows[0]!, rows[1]!, { ...rows[2]!, entryHash: rows[1]!.entryHash }];

    expect(codesOf(dup)).toContain("CHAIN_DUPLICATE_ENTRY_HASH");
  });

  it("a back-dated pick (decisionAt at/after kickoff) cannot hide behind a valid hash", () => {
    const rows = honestRows();
    const body = JSON.parse(rows[0]!.payload) as Record<string, unknown>;
    body["decisionAt"] = "2026-09-13T18:00:00.000Z"; // after the 17:00 kickoff
    const payload = canonicalJson(body as Canonical);
    const forged: StoredLedgerChainRow = {
      ...rows[0]!,
      payload,
      entryHash: sha256Hex(payload),
      occurredAt: new Date("2026-09-13T18:00:00.000Z"),
    };

    const codes = codesOf([forged]);
    expect(codes).toContain("CHAIN_DECISION_AFTER_KICKOFF");
  });
});
