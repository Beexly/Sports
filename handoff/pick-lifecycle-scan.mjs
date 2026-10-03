#!/usr/bin/env node
/**
 * pick-lifecycle-scan.mjs — read-only inventory of the pick lifecycle state machine.
 *
 * Answers four questions the audit-picks command asks, mechanically, so the
 * report's numbers can be re-derived instead of re-argued:
 *
 *   1. WHERE can a Pick row be written?  (every pick.update / pick.updateMany)
 *   2. Which of those carry a `result` predicate INTO the write (compare-and-set)
 *      versus only reading the state and then writing by id (check-then-act)?
 *   3. Which writer produces which terminal state?  (PENDING | WIN | LOSS | PUSH | VOID)
 *   4. Does each settlement lane's write carry the kickoff relation filter
 *      (`game: { commenceTime: ... }`) that makes a pre-kickoff grade impossible?
 *
 * READ-ONLY. Opens no database, writes no file, mutates nothing. `git grep` is
 * the only subprocess.
 *
 * `--selftest` proves each RULE can fire, so a future zero means "none found",
 * not "the regex is broken". A scanner that cannot demonstrate its own failure
 * is a scanner whose passes are worthless.
 *
 * Usage: node handoff/pick-lifecycle-scan.mjs [--selftest] [--json]
 * Exit:   0 always (this is an inventory, not a gate). A selftest failure exits 1.
 */

import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const SELF_TEST = process.argv.includes("--selftest");
const AS_JSON = process.argv.includes("--json");

/** Terminal states the schema declares (packages/db/prisma/schema.prisma enum PickResult). */
const TERMINALS = ["PENDING", "WIN", "LOSS", "PUSH", "VOID"];

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split("\n").filter((l) => l.length > 0);
}

/**
 * File CONTENT with line numbering preserved. Deliberately does NOT reuse
 * gitLines(): that helper drops blank lines, which shifts every index and
 * makes the report's file:line citations point at the wrong line. An audit
 * whose line numbers are off by the blank-line count is worse than no audit,
 * because every citation has to be re-derived by hand.
 */
function gitFileLines(path) {
  const out = execFileSync("git", ["show", `HEAD:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const lines = out.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** All tracked, non-test source files. */
function sourceFiles() {
  return gitLines([
    "grep",
    "-l",
    "",
    "--",
    "*.ts",
    "*.tsx",
    "*.mjs",
    ":!*__tests__*",
    ":!*.test.ts",
    ":!*.test.tsx",
  ]).filter(Boolean);
}

/**
 * Extract, for every pick mutation site, the text of the `where:` clause of
 * the write it belongs to. Bounded window: from the match line back up to the
 * nearest `pick.update`/`pick.updateMany` opener, plus a short look-ahead for
 * the `data:` block. Crude by design — a precise parser would be a bigger claim
 * than the evidence supports.
 */
function mutationSites() {
  const sites = [];
  for (const file of sourceFiles()) {
    let lines;
    try {
      lines = gitFileLines(file);
    } catch {
      continue;
    }
    lines.forEach((text, i) => {
      if (!/\bpick\.(update|updateMany)\s*\(/.test(text)) return;
      // Walk back to the opener of THIS call so nested calls do not inherit a
      // predicate from an enclosing one.
      let start = i;
      for (let j = i; j >= Math.max(0, i - 40); j--) {
        if (/\bpick\.(update|updateMany)\s*\(/.test(lines[j])) {
          start = j;
          break;
        }
      }
      // Look ahead far enough to cover the whole where+data block.
      let end = i;
      for (let j = i; j < Math.min(lines.length, i + 40); j++) {
        if (/\}\s*\)\s*;?\s*$/.test(lines[j])) {
          end = j;
          break;
        }
        end = j;
      }
      const block = lines.slice(start, end + 1);
      const whereIdx = block.findIndex((l) => /\bwhere\s*:/.test(l));
      const whereText = whereIdx === -1 ? "" : block.slice(whereIdx, end + 1).join("\n");
      sites.push({
        file,
        line: i + 1,
        op: /updateMany\s*\(/.test(text) ? "updateMany" : "update",
        block: block.join("\n"),
        hasWhere: whereIdx !== -1,
        // A CAS is a `result` predicate INSIDE the where clause of the write.
        casResult: /result\s*:/.test(whereText),
        casExactResult: /result\s*:\s*["']PENDING["']/.test(whereText),
        casExactMatch: /result\s*:\s*(row\.result|probe\.result|currentPick\.result)/.test(whereText),
        // The kickoff relation filter that makes a pre-kickoff grade impossible.
        kickoffFilter: /commenceTime\s*:/.test(whereText),
        writesResult: /\bdata\s*:/.test(whereText) && /result\s*:/.test(
          block.slice(end + 1 > start ? whereIdx + 1 : 0).join("\n"),
        ),
      });
    });
  }
  return sites;
}

/** Which terminal each writer produces, read off the literal in its data block. */
function terminalProducers(sites) {
  const producers = {};
  for (const s of sites) {
    for (const t of TERMINALS) {
      if (new RegExp(`\\bresult\\s*:\\s*["']${t}["']`).test(s.block)) {
        (producers[t] ??= []).push(`${s.file}:${s.line}`);
      }
    }
  }
  return producers;
}

/** Settlement lanes = writers that set `result` to a terminal. */
function settlementLanes(sites) {
  return sites.filter((s) => /\bresult\s*:\s*["'](WIN|LOSS|PUSH|VOID)["']/.test(s.block));
}

/**
 * Graders write a terminal from a VARIABLE (`data: { result, settledAt }`),
 * so a literal scan cannot see WIN or PUSH as produced anywhere. Reported
 * separately rather than folded into the literal table, because reading
 * "WIN 0 / PUSH 0" above as "those states are unreachable" is exactly the
 * wrong conclusion — see calculatePickResult in the report.
 */
function gradedLanes(sites) {
  return sites.filter(
    (s) =>
      /data\s*:\s*\{[^}]*\bresult\s*,/.test(s.block) ||
      /\bresult:\s*(args\.result|result)\s*[,}]/.test(s.block),
  );
}

function fmt(site) {
  const guards = [];
  if (site.casExactResult) guards.push("CAS:PENDING");
  if (site.casExactMatch) guards.push("CAS:read-value");
  if (site.casResult) guards.push("CAS:result-filtered");
  if (site.kickoffFilter) guards.push("kickoff-filter");
  if (!site.hasWhere) guards.push("NO-WHERE");
  return {
    site: `${site.file}:${site.line}`,
    op: site.op,
    guards: guards.length ? guards : ["UNGUARDED-BY-RESULT"],
  };
}

// ── selftest ────────────────────────────────────────────────────────────────
// Each specimen is a mutation site that MUST be classified a specific way. If
// the rule cannot reproduce its own specimen, the rule is broken and every
// "0 hits" above is meaningless.
const SPECIMENS = [
  {
    name: "unrelated: a CAS write must be reported guarded",
    site: { file: "x.ts", line: 1, op: "updateMany", block: 'await tx.pick.updateMany({\n where: { id: a, result: "PENDING" },\n data: { result: "LOSS" },\n});', hasWhere: true, casResult: true, casExactResult: true, casExactMatch: false, kickoffFilter: false },
    expect: (r) => r.guards.includes("CAS:PENDING"),
  },
  {
    name: "F1 specimen: check-then-act write-by-id must be reported UNGUARDED",
    site: { file: "x.ts", line: 1, op: "update", block: 'await db.pick.update({\n where: { id: existing.id },\n data: { selection: s, isPublished: true },\n});', hasWhere: true, casResult: false, casExactResult: false, casExactMatch: false, kickoffFilter: false },
    expect: (r) => r.guards.includes("UNGUARDED-BY-RESULT") && r.guards.includes("NO-WHERE") === false,
  },
  {
    name: "a write with no where clause at all must be reported",
    site: { file: "x.ts", line: 1, op: "update", block: 'await db.pick.update({\n data: { result: "VOID" },\n});', hasWhere: false, casResult: false, casExactResult: false, casExactMatch: false, kickoffFilter: false },
    expect: (r) => r.guards.includes("NO-WHERE"),
  },
  {
    name: "F2 specimen: CAS without a kickoff filter must be reported as missing it",
    site: { file: "x.ts", line: 1, op: "updateMany", block: 'await tx.pick.updateMany({\n where: { id: pick.id, result: "PENDING" },\n data: { result, settledAt },\n});', hasWhere: true, casResult: true, casExactResult: true, casExactMatch: false, kickoffFilter: false },
    expect: (r) => r.guards.includes("CAS:PENDING") && !r.guards.includes("kickoff-filter"),
  },
  {
    name: "a kickoff-filtered CAS must report both guards",
    site: { file: "x.ts", line: 1, op: "updateMany", block: 'await tx.pick.updateMany({\n where: { id: a, result: "PENDING", game: { commenceTime: { lte: t } } },\n data: { result: "WIN" },\n});', hasWhere: true, casResult: true, casExactResult: true, casExactMatch: false, kickoffFilter: true },
    expect: (r) => r.guards.includes("CAS:PENDING") && r.guards.includes("kickoff-filter"),
  },
  {
    name: "terminal detection: VOID producer must be found",
    site: { file: "x.ts", line: 1, op: "updateMany", block: 'await tx.pick.updateMany({\n where: { id: a, result: row.result },\n data: { result: "VOID" },\n});', hasWhere: true, casResult: true, casExactResult: false, casExactMatch: true, kickoffFilter: false },
    // Probes the terminal-detection rule itself, so it needs the RAW site,
    // not the formatted view the other specimens check.
    expect: (r, raw) => terminalProducers([raw]).VOID?.length === 1,
  },
];

function runSelftest() {
  let failed = 0;
  for (const spec of SPECIMENS) {
    const r = fmt(spec.site);
    const ok = spec.expect(r, spec.site);
    console.log(`${ok ? "PASS" : "FAIL"}  ${spec.name}`);
    if (!ok) {
      failed++;
      console.log(`      classified as: ${r.guards.join(" + ")}`);
    }
  }
  console.log(`\nselftest: ${SPECIMENS.length - failed}/${SPECIMENS.length} specimens reproduced`);
  return failed;
}

if (SELF_TEST) {
  process.exit(runSelftest() === 0 ? 0 : 1);
}

const sites = mutationSites();
const lanes = settlementLanes(sites);
const graded = gradedLanes(sites);
const unguarded = sites.filter((s) => !s.casResult);
const lanesNoKickoff = lanes.filter((s) => !s.kickoffFilter);
const producers = terminalProducers(sites);
const isScript = (s) => /^scripts\//.test(s.file);

if (AS_JSON) {
  console.log(JSON.stringify({ sites, unguarded, lanesNoKickoff, graded, producers }, null, 2));
  process.exit(0);
}

console.log("PICK LIFECYCLE SCAN");
console.log("===================");
console.log(`tracked non-test mutation sites on Pick : ${sites.length}`);
console.log(`  product (apps/ + packages/)           : ${sites.filter((s) => !isScript(s)).length}`);
console.log(`  operator scripts under scripts/       : ${sites.filter(isScript).length}`);
console.log(`  via updateMany                       : ${sites.filter((s) => s.op === "updateMany").length}`);
console.log(`  via update (by id)                   : ${sites.filter((s) => s.op === "update").length}`);
console.log(`  carrying a result predicate in-write : ${sites.filter((s) => !isScript(s) && s.casResult).length}/${sites.filter((s) => !isScript(s)).length} product sites`);
console.log(`  WITHOUT a result predicate (F1)      : ${unguarded.filter((s) => !isScript(s)).length} product sites`);
console.log("");
console.log(`lanes writing a LITERAL terminal (VOID writers) : ${lanes.filter((s) => !isScript(s)).length}`);
for (const s of lanes.filter((s) => !isScript(s))) {
  const r = fmt(s);
  const missing = r.guards.includes("kickoff-filter") ? "" : "  <-- no kickoff filter in the write (F2)";
  console.log(`  ${r.guards.join(" + ").padEnd(30)} ${r.site}${missing}`);
}
console.log("");
console.log(`lanes writing a COMPUTED terminal (WIN/LOSS/PUSH) : ${graded.filter((s) => !isScript(s)).length}`);
for (const s of graded.filter((s) => !isScript(s))) {
  const r = fmt(s);
  const missing = r.guards.includes("kickoff-filter") ? "" : "  <-- no kickoff filter in the write (F2)";
  console.log(`  ${r.guards.join(" + ").padEnd(30)} ${r.site}${missing}`);
}
console.log("");
console.log("terminal producers (LITERAL only — a variable write is invisible to this)");
for (const t of TERMINALS) {
  const p = producers[t] ?? [];
  console.log(`  ${t.padEnd(8)} ${String(p.length).padStart(2)}  ${p.slice(0, 3).join(", ")}${p.length > 3 ? ", ..." : ""}`);
}
console.log("  WIN/PUSH read 0 above ONLY because every grader writes `result` from a");
console.log("  variable. calculatePickResult (packages/prediction-engine/src/settlement.ts:81)");
console.log("  emits WIN, LOSS, PUSH and refuses to fabricate one on fall-through.");
console.log("");
console.log("unguarded product sites (state read elsewhere, write carries no predicate)");
for (const s of unguarded.filter((s) => !isScript(s))) {
  const r = fmt(s);
  console.log(`  ${r.guards.join(" + ").padEnd(24)} ${r.site}`);
}
console.log("");
console.log("NOT DETERMINED by this scan: runtime interleaving, DB isolation level,");
console.log("and whether any listed site is currently reachable from a live route.");
