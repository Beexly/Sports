#!/usr/bin/env node
/**
 * GSE waitlist — local review helper (read-only).
 *
 * Prints the leads captured by the local-file fallback store so the owner can
 * review the queue without a database. Reads the SAME path as
 * `apps/web/lib/gse/waitlist-store.ts`:
 *   GSE_WAITLIST_STORE_PATH, else <cwd>/.gse-local/waitlist-leads.json
 *
 * Local-only: reads a gitignored file and prints to the console. It sends
 * nothing anywhere, writes nothing, and creates no account.
 *
 * Usage:  node scripts/gse-waitlist-list.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

function storePath() {
  return (
    process.env.GSE_WAITLIST_STORE_PATH ??
    path.join(process.cwd(), ".gse-local", "waitlist-leads.json")
  );
}

async function main() {
  const file = storePath();
  let raw;
  try {
    raw = await readFile(file, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") {
      console.log(`No waitlist data yet at: ${file}`);
      console.log("(The local store is created on the first submission.)");
      return;
    }
    throw err;
  }

  let leads;
  try {
    leads = JSON.parse(raw);
  } catch {
    console.error(`Could not parse store file as JSON: ${file}`);
    process.exitCode = 1;
    return;
  }
  if (!Array.isArray(leads)) leads = [];

  console.log(`GSE waitlist — ${leads.length} lead(s) at ${file}\n`);
  for (const [i, l] of leads.entries()) {
    const sports = Array.isArray(l.sportInterests) ? l.sportInterests.join(", ") : "";
    console.log(
      `${String(i + 1).padStart(3, " ")}. ${l.email ?? "?"} · ${l.role ?? "?"} · [${sports}] · ${l.reviewStatus ?? "QUEUED"} · ${l.createdAt ?? ""}`,
    );
  }

  const byStatus = leads.reduce((acc, l) => {
    const s = l.reviewStatus ?? "QUEUED";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nBy status: ${JSON.stringify(byStatus)}`);
  console.log("Reminder: this data is local + gitignored. Do not export it externally without owner approval.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
