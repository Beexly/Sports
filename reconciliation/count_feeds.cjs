#!/usr/bin/env node
/* Count the real reporter-roster feeds by evaluating the module. */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve("apps/web/lib/news/reporter-roster.ts");
const txt = fs.readFileSync(SRC, "utf8");

// Strip TS types crudely and evaluate the roster constants.
const body = txt
  .replace(/^import .*$/gm, "")
  .replace(/export type [\s\S]*?;\s*$/gm, "")
  .replace(/: readonly [A-Za-z<>\[\]| ]+(\[\])?/g, "")
  .replace(/export function/g, "function")
  .replace(/export const/g, "const")
  .replace(/as const/g, "")
  .replace(/import type[^\n]*\n/g, "");

const vm = require("vm");
const ctx = { module: { exports: {} }, exports: {}, console, URL, Date };
vm.createContext(ctx);
try {
  vm.runInContext(body + "\n;globalThis.__roster = REPORTER_ROSTER;globalThis.__curated = toCuratedRssFeeds();", ctx);
  const roster = ctx.__roster || [];
  const curated = ctx.__curated || [];
  const byKind = {};
  for (const e of roster) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  const byTier = {};
  for (const e of curated) byTier[e.tier] = (byTier[e.tier] || 0) + 1;
  console.log("REPORTER_ROSTER entries:", roster.length);
  console.log("  by kind:", JSON.stringify(byKind));
  console.log("LIVE CURATED feeds (what the cron polls):", curated.length);
  console.log("  by tier:", JSON.stringify(byTier));
  const hosts = new Set(curated.map((e) => { try { return new URL(e.url).host; } catch { return e.url; } }));
  console.log("  distinct hosts:", hosts.size);
  console.log("  sample:", curated.slice(0, 4).map((e) => e.source + " -> " + e.url).join("\n           "));
} catch (e) {
  console.log("EVAL FAILED:", e.message);
  // fall back to static counts
  const club = (txt.match(/club\("/g) || []).length;
  const beat = (txt.match(/beat\(/g) || []).length;
  const insider = (txt.match(/insider\(/g) || []).length;
  const espn = (txt.match(/espnTeam\(/g) || []).length;
  console.log("STATIC call-site counts: club=" + club, "beat=" + beat, "insider=" + insider, "espnTeam=" + espn);
}
