#!/usr/bin/env node
/**
 * Promote a user to ADMIN — the door to /cockpit and /admin.
 *
 * The operator surfaces (Cockpit + Admin) are gated by
 * `session.user.role === "ADMIN"`. The seed only auto-promotes
 * DEV_ADMIN_EMAIL in non-production (a safety refusal lives in seed.ts),
 * so for the live site you grant yourself admin once, here.
 *
 * Flow:
 *   1. Sign in to the site once with Google (creates your User row).
 *   2. DATABASE_URL=postgres://… node scripts/promote-admin.mjs you@email.com
 *   3. Sign out and back in, then open /cockpit.
 *
 * Idempotent and safe to re-run. Uses the generated Prisma client so the
 * table/column mapping always matches the schema.
 */

import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] ?? "").trim().toLowerCase();

if (!email || !email.includes("@")) {
  console.error("Usage: DATABASE_URL=… node scripts/promote-admin.mjs <email>");
  process.exit(1);
}
if (!process.env["DATABASE_URL"]) {
  console.error("✗ DATABASE_URL is not set. Point it at the database you want to promote in.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  // Case-insensitive match — Google emails are normalized lowercase, but be lenient.
  const user =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    }));

  if (!user) {
    console.error(
      `✗ No user with email ${email}.\n` +
        "  Sign in to the site once with Google to create the account, then re-run."
    );
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`✓ ${user.email} is already ADMIN — open /cockpit.`);
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    console.log(
      `✓ Promoted ${user.email} to ADMIN.\n` +
        "  Sign out and back in, then open /cockpit and /admin."
    );
  }
} catch (err) {
  console.error("✗", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
