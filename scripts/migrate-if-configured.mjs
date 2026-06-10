#!/usr/bin/env node
/**
 * migrate-if-configured — run `prisma migrate deploy` ONLY when the database is
 * actually reachable from this build context.
 *
 * Why this exists: the Vercel build command runs the migration in-build. Preview
 * and branch deployments do NOT receive DIRECT_URL (it is Production-scoped), so
 * the migrate step failed with Prisma P1012 ("Environment variable not found:
 * DIRECT_URL") and took the WHOLE build down. This guard skips the migration
 * cleanly in those contexts (exit 0) and runs it only when DIRECT_URL is present
 * (production builds), so previews build green and production migrates before it
 * goes live — and a freshly-provisioned production DB always receives its schema
 * in the build, instead of serving a permanent 503 because no migration ran.
 *
 * Run from the repo root (the build command `cd ../..` first). No args.
 */
import { execSync } from "node:child_process";

const directUrl = process.env.DIRECT_URL;

if (!directUrl || directUrl.trim() === "") {
  console.log(
    "[migrate-if-configured] DIRECT_URL not set — skipping `prisma migrate deploy` " +
      "(preview/branch build with no production database access). Build continues.",
  );
  process.exit(0);
}

console.log("[migrate-if-configured] DIRECT_URL present — running `prisma migrate deploy`…");
try {
  execSync("npm run db:migrate", { stdio: "inherit" });
} catch (error) {
  console.error("[migrate-if-configured] migrate deploy failed.");
  process.exit(typeof error?.status === "number" ? error.status : 1);
}
