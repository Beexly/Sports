/**
 * GSE GLASS LEDGER — STORED-ROW TAMPER AUDIT (DBA-side).
 *
 *   npx tsx scripts/edge-lab/audit-ledger-rows.ts <rows.json> [<anchor.json>]
 *
 * `scripts/edge-lab/recompute.ts` audits the PUBLIC EXPORT — the parsed
 * entries served by GET /api/proof/ledger-chain. It proves the hashed
 * content was not edited. It cannot see the table's unhashed projection
 * columns (`chainId`, `entryType`, `pickId`, `seq`, `prevHash`, `hashAlg`,
 * `canonVersion`, `modelVersion`, `occurredAt`), because the export does not
 * carry them — and those columns are what the uniqueness indexes and the
 * settlement prior-pick lookup actually resolve against. An UPDATE of one of
 * them changes what the database does without changing a hashed byte.
 *
 * This script audits the RAW ROWS. Dump them with:
 *
 *   psql "$DATABASE_URL" -At -c \
 *     "select coalesce(json_agg(t order by t.seq), '[]'::json) \
 *        from (select * from ledger_chain_entries \
 *               where \"chainId\" = 'glass-v1' order by seq) t" > rows.json
 *
 * Optional second argument is the externally published anchor,
 * `{"tipHash":"<64 hex>","count":<n>}` (see
 * packages/prediction-engine/src/edge-lab/ledger-anchor.ts). WITHOUT it,
 * removal of rows from the END of the chain is NOT ruled out — a hash chain
 * cannot detect its own truncation. The script says so explicitly rather
 * than printing an unqualified "VALID".
 *
 * Read-only. No network, no secrets, no writes.
 *
 * Exit codes: 0 = clean · 2 = findings (listed) · 3 = I/O or bad input.
 */

import { readFileSync } from "node:fs";

import {
  auditLedgerChainRows,
  summarizeLedgerRowAudit,
  type LedgerAnchorExpectation,
  type StoredLedgerChainRow,
} from "../../packages/prediction-engine/src/edge-lab/ledger-chain-row-audit.js";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main(): number {
  const rowsPath = process.argv[2];
  if (!rowsPath) {
    console.error("usage: npx tsx scripts/edge-lab/audit-ledger-rows.ts <rows.json> [<anchor.json>]");
    return 3;
  }

  let rows: StoredLedgerChainRow[];
  try {
    const parsed = readJson(rowsPath);
    const maybe = Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown }).rows;
    if (!Array.isArray(maybe)) throw new Error("row dump must be a JSON array, or {rows: [...]}");
    rows = maybe as StoredLedgerChainRow[];
  } catch (err) {
    console.error(`could not read row dump: ${err instanceof Error ? err.message : String(err)}`);
    return 3;
  }

  let anchor: LedgerAnchorExpectation | undefined;
  const anchorPath = process.argv[3];
  if (anchorPath) {
    try {
      const parsed = readJson(anchorPath) as Record<string, unknown>;
      const tipHash = parsed["tipHash"] ?? parsed["digestHex"];
      const count = parsed["count"];
      if (typeof tipHash !== "string" || typeof count !== "number") {
        throw new Error('anchor must be {"tipHash":"<64 hex>","count":<n>} (digestHex is accepted for tipHash)');
      }
      anchor = { tipHash, count };
    } catch (err) {
      console.error(`could not read anchor: ${err instanceof Error ? err.message : String(err)}`);
      return 3;
    }
  }

  const result = auditLedgerChainRows(rows, anchor ? { anchor } : undefined);

  console.log(`rows audited:     ${result.count}`);
  console.log(`tip hash:         ${result.tipHash}`);
  console.log(`anchor supplied:  ${result.anchorChecked ? "yes" : "NO — tip truncation NOT ruled out"}`);
  if (result.findings.length > 0) {
    console.log(`\nfindings (${result.findings.length}):`);
    for (const f of result.findings) {
      const where = f.column ? `index ${f.index} col ${f.column}` : `index ${f.index}`;
      console.log(`  [${f.code}] ${where}: ${f.detail}`);
    }
  }
  console.log(`\n${summarizeLedgerRowAudit(result)}`);
  return result.ok ? 0 : 2;
}

process.exit(main());
