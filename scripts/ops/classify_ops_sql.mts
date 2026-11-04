/**
 * Classify an arbitrary SQL file with the repo's REAL additivity classifier.
 *
 * WHY THIS EXISTS
 *
 * `apps/web/lib/ops/migration-additivity.ts` only ever reads
 * `packages/db/prisma/migrations`. Operational SQL — index drops, ANALYZE,
 * autovacuum tuning — lives outside that tree, so nobody has ever asked the
 * classifier what it thinks of it. This script does, so the answer is a
 * measurement rather than an assumption.
 *
 * It is a read-only diagnostic. It does not apply anything.
 *
 *   npx tsx scripts/ops/classify_ops_sql.mts <file.sql> [...]
 *
 * Exit 0 = no additivity violations, 1 = violations found, 2 = usage error.
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";

import {
  findAdditivityViolations,
  DESTRUCTIVE_REASON,
} from "../../apps/web/lib/ops/migration-additivity.ts";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: npx tsx scripts/ops/classify_ops_sql.mts <file.sql> [...]");
  process.exit(2);
}

let total = 0;

for (const file of files) {
  let sql: string;
  try {
    sql = readFileSync(file, "utf8");
  } catch (err) {
    console.error(`${file}: cannot read (${(err as Error).message})`);
    process.exitCode = 2;
    continue;
  }

  const name = relative(process.cwd(), file);
  const violations = findAdditivityViolations(name, sql);

  if (violations.length === 0) {
    console.log(`${name}: no additivity violations`);
    continue;
  }

  total += violations.length;
  console.log(`${name}: ${violations.length} violation(s)`);
  for (const v of violations) {
    console.log(`  [${v.kind}] ${DESTRUCTIVE_REASON[v.kind]}`);
    console.log(`      ${v.statement}`);
  }
}

if (total > 0) {
  console.log(`\n${total} total violation(s).`);
  process.exitCode = 1;
} else {
  console.log("\nclean.");
  process.exitCode ??= 0;
}
