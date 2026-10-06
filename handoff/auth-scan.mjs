#!/usr/bin/env node
/**
 * auth-scan.mjs — read-only authn/authz surface scan for .claude/commands/audit-auth.md
 *
 * NO product code is read for anything but classification; nothing is written.
 * Exit 0 on success. Every count printed is derived, not asserted.
 *
 * Canaries: --selftest proves the gate-detection rule fires on a specimen that
 * DOES call auth(), so a future "0 unauthenticated routes" is a real 0 rather
 * than a regex that silently stopped matching.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync(
  'git ls-files "apps/web/app/**/route.ts"',
  { encoding: "utf8", maxBuffer: 1 << 24 }
).split("\n").filter(Boolean);

// Gate vocabulary: any of these tokens in a route file means "this route
// performs SOME server-side caller check". Detecting them is necessary but not
// sufficient -- the report grades each route by which gate, not merely whether.
const GATE_TOKENS = [
  // caller-identity gates
  "requirePremiumApi",
  "requireFantasyApi",
  "requireEntitlement",
  "requireAdmin",
  "getViewerEntitlements",
  "auth(",
  "evaluateGate",
  // machine / shared-secret gates
  "cronAuthError",
  "authorizeCronRequest",
  "verifyWebhookSignature",
  "requireApiKey",
  "authorizeApiKey",
  "verifyBotToken",
  "extractBearerSecret",
  "requireDurableWriteStore",
  "agent-authority",
];

const MUTATING = ["POST", "PUT", "PATCH", "DELETE"];

const rows = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const methods = MUTATING.filter((m) =>
    new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${m}\\b`).test(src) ||
    new RegExp(`export\\s*\\{\\s*${m}\\b`).test(src)
  );
  const gates = GATE_TOKENS.filter((t) => src.includes(t));
  rows.push({ f, methods, gates, bytes: src.length });
}

// ---- SELF-TEST: the gate rule must be capable of firing -------------------
if (process.argv.includes("--selftest")) {
  const specimen = [
    'import { auth } from "@/lib/auth";',
    'export async function POST() {',
    '  const s = await auth();',
    "  if (!s?.user) return new Response('nope', { status: 401 });",
    "  return Response.json({ ok: true });",
    "}",
  ].join("\n");
  const hits = GATE_TOKENS.filter((t) => specimen.includes(t));
  const mut = MUTATING.filter((m) =>
    new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${m}\\b`).test(specimen)
  );
  const ok = hits.includes("auth(") && mut.length === 1;
  console.log(`SELFTEST gate-rule: gates=${JSON.stringify(hits)} mutating=${JSON.stringify(mut)} -> ${ok ? "PASS" : "FAIL"}`);
  console.log(`SELFTEST negative: gates=${JSON.stringify(GATE_TOKENS.filter((t) => "export async function POST(){ return null; }".includes(t)))} -> expect []`);
  process.exit(ok ? 0 : 1);
}

// ---- Report --------------------------------------------------------------
const unauth = rows.filter((r) => r.gates.length === 0);
const mutating = rows.filter((r) => r.methods.length > 0);
const mutUnauth = mutating.filter((r) => r.gates.length === 0);
const unauthReadOnly = unauth.filter((r) => r.methods.length === 0);

console.log(`routes total:            ${rows.length}`);
console.log(`mutating routes:         ${mutating.length}`);
console.log(`routes with NO gate:     ${unauth.length}  (of which read-only: ${unauthReadOnly.length})`);
console.log(`MUTATING with NO gate:   ${mutUnauth.length}`);

const byGate = new Map();
for (const r of rows) for (const g of r.gates) byGate.set(g, (byGate.get(g) ?? 0) + 1);
console.log("\ngate token usage (a route may carry several):");
for (const [g, n] of [...byGate].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${g}`);

console.log("\n--- MUTATING routes, no gate token at all ---");
for (const r of mutUnauth) console.log(`  ${r.f}  [${r.methods.join(",")}]`);

console.log("\n--- READ routes, no gate token at all ---");
for (const r of unauthReadOnly) console.log(`  ${r.f}`);

// ---- requireAdmin variant census (drift detector) -------------------------
console.log("\n--- requireAdmin() definitions, one per file (drift surface) ---");
const defs = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const m = src.match(/async function requireAdmin\([^)]*\)[^{]*\{[\s\S]{0,700}?\n\}/);
  if (m) {
    const body = m[0].replace(/\s+/g, " ").slice(0, 200);
    defs.push({ f, body });
  }
}
const shapes = new Map();
for (const d of defs) {
  // normalize to the decisive comparison tokens
  const k = [
    d.body.includes("ADMIN_EMAILS") ? "env" : "no-env",
    d.body.includes("isAdminEmail") ? "isAdminEmail" : "no-isAdminEmail",
    d.body.includes("CODE_OWNER_ALLOWLIST") ? "allowlist" : "no-allowlist",
    d.body.includes("auth(") ? "auth" : "no-auth",
    d.body.includes("role !== \"ADMIN\"") || d.body.includes("role !== 'ADMIN'") ? "rolecmp" : "no-rolecmp",
  ].join("|");
  if (!shapes.has(k)) shapes.set(k, []);
  shapes.get(k).push(d.f);
}
console.log(`requireAdmin defined in ${defs.length} route files, ${shapes.size} distinct shape(s):`);
for (const [k, fs] of shapes) {
  console.log(`\n  shape [${k}]  n=${fs.length}`);
  for (const f of fs.slice(0, 40)) console.log(`    ${f}`);
  if (fs.length > 40) console.log(`    ... +${fs.length - 40} more`);
}
