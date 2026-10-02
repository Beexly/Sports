/**
 * Glass Ledger — STORED-ROW audit (the DBA-side companion to `verifyChain`).
 *
 * WHY THIS EXISTS
 * ---------------
 * `ledger-chain.ts#verifyChain` audits an in-memory `LedgerEntry[]`: it
 * recomputes each entry's hash from the entry's *known committed fields* and
 * walks `prevHash` linkage. That is the right check for an array. It is NOT
 * a sufficient check for a chain that has been round-tripped through a
 * relational table, because a stored row carries strictly more state than
 * the entry it encodes:
 *
 *   hashed  : the `payload` string — the exact canonical-JSON preimage of
 *             `entryHash`, which itself commits to `seq` and `prevHash`.
 *   UNhashed: the `chainId`, `entryType`, `pickId`, `seq`, `prevHash`,
 *             `hashAlg`, `canonVersion`, `modelVersion` and `occurredAt`
 *             COLUMNS — projections lifted out of the payload so the table
 *             can be indexed and queried.
 *
 * Those projections are load-bearing. `(chainId, entryType, pickId)` is the
 * only thing stopping a second PICK row for one pick; `entryType` + `pickId`
 * is how a settlement's "does this pick exist" guard resolves; `chainId`
 * scopes the entire public export. An `UPDATE` of any one of them changes
 * what the database *does* without changing any hashed byte — so a
 * hash-only verifier still reports VALID. This module closes that gap: it
 * re-derives every projection from the payload and reports divergence.
 *
 * It also checks two things a field-projecting verifier structurally cannot:
 *   - `sha256Hex(payload) === entryHash` — the DIRECT preimage check. A
 *     verifier that recomputes from parsed fields silently ignores extra
 *     keys in the payload and never proves the stored bytes are the preimage.
 *   - `canonicalJson(JSON.parse(payload)) === payload` — the stored bytes
 *     are in canonical form, so a verifier that hashes the raw payload and
 *     one that re-canonicalizes parsed fields cannot disagree.
 *
 * WHAT IT CANNOT DO (stated, not hidden)
 * --------------------------------------
 * A hash chain detects mutation and mid-chain deletion. It does NOT detect
 * truncation: removing the tip — or any suffix — leaves a shorter chain that
 * verifies perfectly. The only defence is an externally published tip
 * digest. Pass `options.anchor` (see `ledger-anchor.ts#buildAnchorPayload`)
 * and truncation becomes detectable; omit it and `anchorChecked` comes back
 * `false`, which is this module telling you that suffix removal was NOT
 * ruled out. Do not read `ok: true` with `anchorChecked: false` as "nothing
 * was removed".
 *
 * PURE MODULE: no I/O, no Date.now(), no database import. Rows are accepted
 * structurally so this works against a Prisma delegate result, a `psql`
 * dump, or the JSON of the public export — and so it carries no dependency
 * on whether the durable table has shipped.
 */

import { GENESIS_HASH } from "./ledger-chain.js";
import { canonicalJson, sha256Hex, type Canonical } from "./provenance.js";

// ───────────────────────────── row shape ─────────────────────────────

/**
 * A stored `ledger_chain_entries` row, structurally typed. Every field the
 * table persists, including the unhashed projection columns this module
 * exists to police. `occurredAt` accepts a Date or an ISO string so a Prisma
 * row and a JSON dump audit identically.
 */
export interface StoredLedgerChainRow {
  readonly chainId: string;
  readonly seq: number;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly entryType: string;
  readonly pickId: string;
  readonly payload: string;
  readonly hashAlg?: string | null;
  readonly canonVersion?: number | null;
  readonly modelVersion?: string | null;
  readonly occurredAt?: Date | string | null;
}

/** The externally published digest a skeptic pins the chain against. */
export interface LedgerAnchorExpectation {
  readonly tipHash: string;
  readonly count: number;
}

export type LedgerRowAuditCode =
  // per-row, payload integrity
  | "ROW_PAYLOAD_UNPARSEABLE"
  | "ROW_PAYLOAD_NOT_CANONICAL"
  | "ROW_PAYLOAD_FIELD_SET"
  | "ROW_ENTRY_HASH_MALFORMED"
  | "ROW_ENTRY_HASH_MISMATCH"
  // per-row, unhashed projection columns vs the hashed payload
  | "ROW_COLUMN_DIVERGED"
  | "ROW_HASH_ALG_UNSUPPORTED"
  | "ROW_CANON_VERSION_UNSUPPORTED"
  // chain-level
  | "CHAIN_ID_MIXED"
  | "CHAIN_SEQ_NOT_CONTIGUOUS"
  | "CHAIN_PREV_HASH_BROKEN"
  | "CHAIN_DUPLICATE_ENTRY_HASH"
  | "CHAIN_DUPLICATE_TYPED_PICK"
  | "CHAIN_UNKNOWN_PICK"
  | "CHAIN_DECISION_AFTER_KICKOFF"
  // anchor
  | "ANCHOR_TIP_MISMATCH"
  | "ANCHOR_COUNT_MISMATCH";

export interface LedgerRowAuditFinding {
  readonly code: LedgerRowAuditCode;
  /** Zero-based position in the audited row array (always known). */
  readonly index: number;
  /** The row's `seq` column, when it is a usable number. */
  readonly seq?: number;
  /** For ROW_COLUMN_DIVERGED: which projection column disagreed with the payload. */
  readonly column?: string;
  readonly detail: string;
}

export interface LedgerRowAuditResult {
  readonly ok: boolean;
  readonly findings: readonly LedgerRowAuditFinding[];
  /** Tip hash + count of the rows AS AUDITED — what you would anchor. */
  readonly tipHash: string;
  readonly count: number;
  /**
   * False when no anchor was supplied. `ok: true` with `anchorChecked: false`
   * means "no row was altered", NOT "no row was removed from the end".
   */
  readonly anchorChecked: boolean;
}

// ───────────────────────────── committed field sets ─────────────────────────────

/**
 * The exact keys a PICK payload commits to. Mirrors
 * `ledger-chain.ts#pickCommittedFields`. Duplicated deliberately: this
 * module's whole job is to check the stored bytes against an independent
 * statement of the contract, so importing the same projection function
 * would defeat the point.
 */
const PICK_KEYS = [
  "book",
  "decisionAt",
  "featureSnapshotHash",
  "kickoffAt",
  "market",
  "modelVersion",
  "pickId",
  "prevHash",
  "priceDecimal",
  "selection",
  "seq",
  "sport",
] as const;

/** The exact keys a SETTLEMENT payload commits to. */
const SETTLEMENT_KEYS = [
  "clvBps",
  "closingPriceDecimal",
  "outcome",
  "pickId",
  "prevHash",
  "seq",
  "settledAt",
] as const;

const HEX64 = /^[0-9a-f]{64}$/;
const SUPPORTED_HASH_ALGS = new Set(["sha256"]);
const SUPPORTED_CANON_VERSIONS = new Set([1]);

/** Row `entryType` is derived from the payload, never trusted from the column. */
function derivedEntryType(payload: Record<string, unknown>): "PICK" | "SETTLEMENT" {
  return "outcome" in payload ? "SETTLEMENT" : "PICK";
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function sortedKeys(o: Record<string, unknown>): string[] {
  return Object.keys(o).sort();
}

// ───────────────────────────── the audit ─────────────────────────────

/**
 * Audit stored ledger rows. Rows must be supplied in ascending `seq` order
 * (that is what the loader's `orderBy: { seq: "asc" }` produces) and must
 * begin at `seq` 0 — a mid-chain page cannot be linkage-audited, because its
 * first row's `prevHash` points at a row the caller did not supply.
 *
 * Every check that can run, runs: this returns EVERY finding, not just the
 * first, so an operator sees the full blast radius in one pass.
 */
export function auditLedgerChainRows(
  rows: readonly StoredLedgerChainRow[],
  options?: { readonly anchor?: LedgerAnchorExpectation },
): LedgerRowAuditResult {
  const findings: LedgerRowAuditFinding[] = [];
  const push = (f: LedgerRowAuditFinding): void => {
    findings.push(f);
  };

  let expectedPrev = GENESIS_HASH;
  const seenEntryHash = new Set<string>();
  const seenTypedPick = new Set<string>();
  const pickIdsSoFar = new Set<string>();
  let chainId: string | null = null;
  let tipHash = GENESIS_HASH;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    const seq = typeof row.seq === "number" && Number.isInteger(row.seq) ? row.seq : undefined;

    // ── one chain per audit ────────────────────────────────────────────
    if (chainId === null) {
      chainId = row.chainId;
    } else if (row.chainId !== chainId) {
      push({
        code: "CHAIN_ID_MIXED",
        index,
        seq,
        detail: `row carries chainId "${row.chainId}" but the audited set started as "${chainId}" — a chain is defined per chainId and chainId is NOT a hashed field`,
      });
    }

    // ── payload parses ────────────────────────────────────────────────
    let payload: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(row.payload);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new TypeError(`payload must be a JSON object, got ${Array.isArray(parsed) ? "array" : String(parsed)}`);
      }
      payload = parsed as Record<string, unknown>;
    } catch (error) {
      push({
        code: "ROW_PAYLOAD_UNPARSEABLE",
        index,
        seq,
        detail: `payload is not a JSON object: ${error instanceof Error ? error.message : String(error)}`,
      });
      // Nothing further about this row can be derived; linkage still advances
      // off the stored entryHash so later rows are audited against reality.
      expectedPrev = row.entryHash;
      tipHash = row.entryHash;
      continue;
    }

    // ── payload is canonical ──────────────────────────────────────────
    let recanonicalized: string | null = null;
    try {
      recanonicalized = canonicalJson(payload as Canonical);
    } catch (error) {
      push({
        code: "ROW_PAYLOAD_NOT_CANONICAL",
        index,
        seq,
        detail: `payload cannot be re-canonicalized: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    if (recanonicalized !== null && recanonicalized !== row.payload) {
      push({
        code: "ROW_PAYLOAD_NOT_CANONICAL",
        index,
        seq,
        detail: `stored payload bytes are not the canonical encoding of their own content — a verifier that hashes the stored string and one that re-canonicalizes parsed fields would disagree`,
      });
    }

    // ── committed field set is exactly right ──────────────────────────
    const type = derivedEntryType(payload);
    const expectedKeys = type === "SETTLEMENT" ? [...SETTLEMENT_KEYS] : [...PICK_KEYS];
    const actualKeys = sortedKeys(payload);
    const missing = expectedKeys.filter((k) => !actualKeys.includes(k));
    const extra = actualKeys.filter((k) => !(expectedKeys as string[]).includes(k));
    if (missing.length > 0 || extra.length > 0) {
      push({
        code: "ROW_PAYLOAD_FIELD_SET",
        index,
        seq,
        detail: `payload key set is not the ${type} committed field set (missing: [${missing.join(", ")}], extra: [${extra.join(", ")}]) — a field-projecting verifier ignores extra keys and throws on missing ones`,
      });
    }

    // ── entryHash is the DIRECT preimage of the stored payload ────────
    if (typeof row.entryHash !== "string" || !HEX64.test(row.entryHash)) {
      push({
        code: "ROW_ENTRY_HASH_MALFORMED",
        index,
        seq,
        detail: `entryHash must be 64 lowercase hex chars, got ${JSON.stringify(row.entryHash)}`,
      });
    } else {
      const recomputed = sha256Hex(row.payload);
      if (recomputed !== row.entryHash) {
        push({
          code: "ROW_ENTRY_HASH_MISMATCH",
          index,
          seq,
          detail: `sha256(payload) = ${recomputed} but the stored entryHash is ${row.entryHash} — the stored bytes are not the preimage of the stored hash`,
        });
      }
      if (seenEntryHash.has(row.entryHash)) {
        push({
          code: "CHAIN_DUPLICATE_ENTRY_HASH",
          index,
          seq,
          detail: `entryHash ${row.entryHash} appears more than once in this chain`,
        });
      }
      seenEntryHash.add(row.entryHash);
    }

    // ── unhashed projection columns vs the hashed payload ─────────────
    const payloadSeq = payload["seq"];
    if (payloadSeq !== row.seq) {
      push({
        code: "ROW_COLUMN_DIVERGED",
        index,
        seq,
        column: "seq",
        detail: `seq column is ${JSON.stringify(row.seq)} but the hashed payload says ${JSON.stringify(payloadSeq)}`,
      });
    }
    const payloadPrev = payload["prevHash"];
    if (payloadPrev !== row.prevHash) {
      push({
        code: "ROW_COLUMN_DIVERGED",
        index,
        seq,
        column: "prevHash",
        detail: `prevHash column is ${JSON.stringify(row.prevHash)} but the hashed payload says ${JSON.stringify(payloadPrev)}`,
      });
    }
    const payloadPickId = payload["pickId"];
    if (payloadPickId !== row.pickId) {
      push({
        code: "ROW_COLUMN_DIVERGED",
        index,
        seq,
        column: "pickId",
        detail: `pickId column is ${JSON.stringify(row.pickId)} but the hashed payload says ${JSON.stringify(payloadPickId)} — the pickId COLUMN is what the uniqueness index and the settlement's prior-pick lookup resolve against, and it is not hashed`,
      });
    }
    if (row.entryType !== type) {
      push({
        code: "ROW_COLUMN_DIVERGED",
        index,
        seq,
        column: "entryType",
        detail: `entryType column is ${JSON.stringify(row.entryType)} but the hashed payload encodes a ${type} entry — entryType is a projection, not a hashed field, so flipping it defeats the (chainId, entryType, pickId) uniqueness guard without breaking any hash`,
      });
    }
    const expectedModelVersion = type === "PICK" ? (payload["modelVersion"] as string | undefined) ?? null : null;
    const actualModelVersion = row.modelVersion ?? null;
    if (actualModelVersion !== expectedModelVersion) {
      push({
        code: "ROW_COLUMN_DIVERGED",
        index,
        seq,
        column: "modelVersion",
        detail: `modelVersion column is ${JSON.stringify(actualModelVersion)} but the hashed payload implies ${JSON.stringify(expectedModelVersion)}`,
      });
    }
    if (row.occurredAt !== undefined) {
      const expectedOccurred = toIsoOrNull(
        (type === "SETTLEMENT" ? payload["settledAt"] : payload["decisionAt"]) as string | undefined,
      );
      const actualOccurred = toIsoOrNull(row.occurredAt);
      if (actualOccurred !== expectedOccurred) {
        push({
          code: "ROW_COLUMN_DIVERGED",
          index,
          seq,
          column: "occurredAt",
          detail: `occurredAt column is ${JSON.stringify(actualOccurred)} but the hashed payload's ${type === "SETTLEMENT" ? "settledAt" : "decisionAt"} is ${JSON.stringify(expectedOccurred)}`,
        });
      }
    }

    // ── protocol columns ──────────────────────────────────────────────
    if (row.hashAlg !== undefined && row.hashAlg !== null && !SUPPORTED_HASH_ALGS.has(row.hashAlg)) {
      push({
        code: "ROW_HASH_ALG_UNSUPPORTED",
        index,
        seq,
        detail: `hashAlg is ${JSON.stringify(row.hashAlg)}; this audit only verifies sha256 and refuses to claim a chain it cannot recompute`,
      });
    }
    if (
      row.canonVersion !== undefined &&
      row.canonVersion !== null &&
      !SUPPORTED_CANON_VERSIONS.has(row.canonVersion)
    ) {
      push({
        code: "ROW_CANON_VERSION_UNSUPPORTED",
        index,
        seq,
        detail: `canonVersion is ${JSON.stringify(row.canonVersion)}; this audit only knows canonicalization v1`,
      });
    }

    // ── one-per-(type, pick) ──────────────────────────────────────────
    const typedKey = `${type}:${String(payloadPickId)}`;
    if (seenTypedPick.has(typedKey)) {
      push({
        code: "CHAIN_DUPLICATE_TYPED_PICK",
        index,
        seq,
        detail: `a second ${type} entry for pickId ${JSON.stringify(payloadPickId)} is present in this chain`,
      });
    }
    seenTypedPick.add(typedKey);

    // ── linkage, audited off the HASHED seq/prevHash ──────────────────
    if (payloadSeq !== index) {
      push({
        code: "CHAIN_SEQ_NOT_CONTIGUOUS",
        index,
        seq,
        detail: `hashed seq is ${JSON.stringify(payloadSeq)} at array position ${index}; a chain audited from seq 0 must be contiguous — a gap means a row was removed from the middle`,
      });
    }
    if (typeof payloadPrev !== "string" || payloadPrev !== expectedPrev) {
      push({
        code: "CHAIN_PREV_HASH_BROKEN",
        index,
        seq,
        detail: `hashed prevHash is ${JSON.stringify(payloadPrev)} but the previous entry hashes to ${expectedPrev}`,
      });
    }

    // ── per-type invariants ───────────────────────────────────────────
    if (type === "PICK") {
      const decisionAt = payload["decisionAt"];
      const kickoffAt = payload["kickoffAt"];
      if (typeof decisionAt === "string" && typeof kickoffAt === "string") {
        const d = Date.parse(decisionAt);
        const k = Date.parse(kickoffAt);
        if (!Number.isFinite(d) || !Number.isFinite(k) || d >= k) {
          push({
            code: "CHAIN_DECISION_AFTER_KICKOFF",
            index,
            seq,
            detail: `publish-before-kickoff violated: decisionAt ${JSON.stringify(decisionAt)} must strictly precede kickoffAt ${JSON.stringify(kickoffAt)}`,
          });
        }
      }
      if (typeof payloadPickId === "string") pickIdsSoFar.add(payloadPickId);
    } else if (typeof payloadPickId !== "string" || !pickIdsSoFar.has(payloadPickId)) {
      push({
        code: "CHAIN_UNKNOWN_PICK",
        index,
        seq,
        detail: `settlement references pickId ${JSON.stringify(payloadPickId)}, which has no earlier PICK entry in this chain`,
      });
    }

    expectedPrev = row.entryHash;
    tipHash = row.entryHash;
  }

  // ── external anchor: the ONLY check that catches suffix removal ─────
  const anchor = options?.anchor;
  let anchorChecked = false;
  if (anchor) {
    anchorChecked = true;
    if (anchor.tipHash !== tipHash) {
      push({
        code: "ANCHOR_TIP_MISMATCH",
        index: Math.max(rows.length - 1, 0),
        detail: `anchored tip is ${anchor.tipHash} but the audited chain tips at ${tipHash} — rows were removed from, or rewritten at, the end of the chain`,
      });
    }
    if (anchor.count !== rows.length) {
      push({
        code: "ANCHOR_COUNT_MISMATCH",
        index: Math.max(rows.length - 1, 0),
        detail: `anchored count is ${anchor.count} but ${rows.length} rows were audited`,
      });
    }
  }

  return {
    ok: findings.length === 0,
    findings,
    tipHash: rows.length === 0 ? GENESIS_HASH : tipHash,
    count: rows.length,
    anchorChecked,
  };
}

/**
 * One-line human summary. Never says "VALID" without qualifying whether
 * truncation was ruled out — an un-anchored clean audit is "UNALTERED",
 * not "COMPLETE".
 */
export function summarizeLedgerRowAudit(result: LedgerRowAuditResult): string {
  if (!result.ok) {
    const codes = [...new Set(result.findings.map((f) => f.code))].join(", ");
    return `BROKEN — ${result.findings.length} finding(s) across ${result.count} row(s): ${codes}`;
  }
  return result.anchorChecked
    ? `VERIFIED — ${result.count} row(s) unaltered and the tip matches the published anchor (${result.tipHash})`
    : `UNALTERED — ${result.count} row(s), tip ${result.tipHash}. NO ANCHOR SUPPLIED: removal of rows from the END of the chain was NOT ruled out.`;
}
