#!/usr/bin/env node
/**
 * prove-neon.mjs — mark Neon PROVEN only when a real DATABASE_URL answers.
 * No secrets printed. Exit 0 only on live SELECT 1.
 *
 * Usage (Production shell / CI with env injected):
 *   node scripts/ops/prove-neon.mjs
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("PROVE_NEON=fail reason=missing_or_stub_DATABASE_URL");
  process.exit(2);
}
if (!url.includes("postgres")) {
  console.error("PROVE_NEON=fail reason=not_postgres_url");
  process.exit(2);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
try {
  await prisma.$queryRaw`SELECT 1 as ok`;
  console.log(
    JSON.stringify({
      ok: true,
      prove: "neon",
      hostRedacted: url.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@").slice(0, 80),
      at: new Date().toISOString(),
    }),
  );
  process.exit(0);
} catch (e) {
  console.error("PROVE_NEON=fail reason=query_error");
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => {});
}
