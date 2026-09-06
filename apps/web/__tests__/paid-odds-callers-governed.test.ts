import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * C-109 structural invariant: every caller that drives `processSport()` with a
 * real The Odds API key spends paid credits, so every one of them must consult
 * the credit governor before the call and record the run in the durable ledger
 * after it.
 *
 * This is a guard against a defect class, not a single bug. The admin route
 * `app/api/admin/trigger-refresh/route.ts` shipped for months calling
 * processSport for every in-season sport with no governor consult and no
 * accounting at all: it spent against the monthly plan without the ledger ever
 * seeing it, which both bypassed the budget and skewed the burn rate the truth
 * surface reports. Nothing caught it because each caller was reviewed alone.
 * A new paid caller added tomorrow is caught here instead.
 *
 * Scope, stated plainly: the per-file checks below prove that a paid caller
 * REFERENCES the governor and the accounting, not that it calls them in the
 * right order or on every branch. Proving ordering needs real control-flow
 * analysis; this catches the failure that actually happened (a caller wired to
 * neither) at a fraction of the cost. The detector above is unit-tested so the
 * scan cannot silently stop matching.
 */

const repoRoot = resolve(__dirname, "../../..");

/** Workspaces that can hold a paid caller. */
const SEARCH_ROOTS = [
  "apps/web/app",
  "apps/web/lib",
  "packages/ingestion-pipeline/src",
  "workers",
];

/**
 * Blank out comments, and ONLY comments.
 *
 * A plain regex cannot do this: `//` inside a string literal (a URL, say) is
 * not a comment, and treating it as one erases the rest of that line, hiding
 * any `processSport(` call after it from the scan below (Devin and cubic both
 * caught this on PR #713). So this walks the source and tracks whether it is
 * inside a single-quoted, double-quoted or template string, honouring escapes,
 * and preserves `${...}` interpolations because those hold real code.
 *
 * Not handled, deliberately: distinguishing a regex literal from division needs
 * real lexer context, and an unescaped `//` inside a regex is not a thing this
 * codebase contains. Worst case there is a MISSED strip, which makes the scan
 * more inclusive, never less.
 */
export function stripComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  // Template-literal nesting: each entry is the brace depth of an open `${`.
  const templateStack: number[] = [];
  let braceDepth = 0;

  const skipString = (quote: string): void => {
    out += " ";
    i += 1;
    while (i < n) {
      if (src[i] === "\\") {
        i += 2;
        continue;
      }
      if (src[i] === quote) {
        i += 1;
        return;
      }
      i += 1;
    }
  };

  while (i < n) {
    const c = src[i]!;
    const next = src[i + 1];

    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i += 1;
      out += " ";
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      out += " ";
      continue;
    }
    if (c === '"' || c === "'") {
      skipString(c);
      continue;
    }
    if (c === "`") {
      // Walk the template, emitting only the code inside `${ ... }`.
      out += " ";
      i += 1;
      while (i < n) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === "`") {
          i += 1;
          break;
        }
        if (src[i] === "$" && src[i + 1] === "{") {
          out += " ";
          i += 2;
          templateStack.push(braceDepth);
          braceDepth += 1;
          break; // fall back to the main loop, which now emits the code
        }
        i += 1;
      }
      continue;
    }
    if (c === "{") braceDepth += 1;
    if (c === "}") {
      braceDepth -= 1;
      if (templateStack.length > 0 && templateStack[templateStack.length - 1] === braceDepth) {
        // Closing a `${`: resume template-literal text.
        templateStack.pop();
        out += " ";
        i += 1;
        while (i < n) {
          if (src[i] === "\\") {
            i += 2;
            continue;
          }
          if (src[i] === "`") {
            i += 1;
            break;
          }
          if (src[i] === "$" && src[i + 1] === "{") {
            i += 2;
            templateStack.push(braceDepth);
            braceDepth += 1;
            break;
          }
          i += 1;
        }
        continue;
      }
    }
    out += c;
    i += 1;
  }
  return out;
}

/**
 * The argument text of every `recordPaidRunAccounting(...)` call in `src`,
 * comments already stripped, matched by balancing parentheses so a multi-line
 * call with a nested object literal is captured whole.
 */
export function accountingCallArgs(src: string): string[] {
  const code = stripComments(src);
  const out: string[] = [];
  const needle = "recordPaidRunAccounting";
  let from = 0;
  for (;;) {
    const at = code.indexOf(needle, from);
    if (at === -1) break;
    from = at + needle.length;
    let i = from;
    while (i < code.length && /\s/.test(code[i]!)) i += 1;
    if (code[i] !== "(") continue; // a mention, not a call
    let depth = 0;
    const start = i;
    for (; i < code.length; i += 1) {
      if (code[i] === "(") depth += 1;
      else if (code[i] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out.push(code.slice(start + 1, i));
    from = i;
  }
  return out;
}

export function callsProcessSport(src: string): boolean {
  const code = stripComments(src)
    // The declaration is the definition, not a caller: `processSport` itself
    // has nothing to consult a governor about.
    .replace(/\b(?:export\s+)?(?:async\s+)?function\s+processSport\s*\(/g, " ");
  return /(?<![.\w])processSport\s*\(/.test(code);
}

function listTsFiles(dir: string): string[] {
  const acc: string[] = [];
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "__tests__") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsFiles(p));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}

const paidCallers = SEARCH_ROOTS.flatMap((root) => listTsFiles(resolve(repoRoot, root)))
  .filter((file) => callsProcessSport(readFileSync(file, "utf8")))
  .map((file) => relative(repoRoot, file))
  .sort();

describe("C-109: the paid-caller detector itself", () => {
  // A guard is only worth its detector. These pin the shapes that must be
  // caught, so the scan below cannot quietly stop seeing a real caller.
  it("catches a call however its promise is consumed", () => {
    expect(callsProcessSport("const r = await processSport(s, k, g, p);")).toBe(true);
    expect(callsProcessSport("return processSport(s, k, g, p);")).toBe(true);
    expect(callsProcessSport("const p = processSport(s, k, g, p);")).toBe(true);
    expect(callsProcessSport("await Promise.all(list.map((s) => processSport(s, k, g, p)));")).toBe(true);
    expect(callsProcessSport("void processSport(s, k, g, p);")).toBe(true);
  });

  it("does not let a comment marker inside a string hide a real call", () => {
    // The exact hole Devin and cubic both found: a regex stripper treats the
    // "//" in a URL as a comment and erases the rest of the line, so the call
    // after it vanishes and an ungoverned caller passes the guard unseen.
    expect(callsProcessSport('const u = "https://api.example.com"; await processSport(s);')).toBe(true);
    expect(callsProcessSport("const u = 'http://x//y'; return processSport(s);")).toBe(true);
    expect(callsProcessSport('const u = `wss://h/${p}`; await processSport(s);')).toBe(true);
    // A block-comment marker inside a string must not open a comment either.
    expect(callsProcessSport('const s = "/*"; await processSport(s);')).toBe(true);
    // ...and an escaped quote must not end the string early.
    expect(callsProcessSport('const s = "a\\"// b"; await processSport(s);')).toBe(true);
  });

  it("still strips real comments, and reads code inside template interpolations", () => {
    expect(stripComments("// await processSport(s);").includes("processSport")).toBe(false);
    expect(stripComments("/* await processSport(s); */").includes("processSport")).toBe(false);
    // Interpolated code is real code and must survive the strip.
    expect(stripComments("`x ${processSport(s)} y`").includes("processSport")).toBe(true);
    // Text inside the template, however, is not code.
    expect(stripComments("`processSport(s)`").includes("processSport")).toBe(false);
  });

  it("ignores a mention in prose and the import itself", () => {
    expect(callsProcessSport("// delegated to processSport() from the pipeline")).toBe(false);
    expect(callsProcessSport("/**\n * Pick generation runs through processSport().\n */")).toBe(false);
    expect(callsProcessSport('import { processSport } from "@sports/ingestion-pipeline";')).toBe(false);
    expect(callsProcessSport("export { processSport } from './process-sport.js';")).toBe(false);
  });

  it("does not match a different function whose name merely ends in processSport", () => {
    expect(callsProcessSport("await fakeprocessSport(s);")).toBe(false);
    expect(callsProcessSport("await client.processSport(s);")).toBe(false);
  });

  it("reads the reservation flag from the call arguments, not from a comment", () => {
    // The exact shape that used to slip through: the flag named only in prose.
    const commentOnly = [
      "// reserved:false when the governor failed open",
      "await recordPaidRunAccounting(governor, sport.key, res);",
    ].join("\n");
    expect(accountingCallArgs(commentOnly)).toEqual(["governor, sport.key, res"]);
    expect(accountingCallArgs(commentOnly)[0]).not.toMatch(/reserved:\s*\w/);

    const real = "await recordPaidRunAccounting(governor, sport.key, res, { reserved: slotReserved });";
    expect(accountingCallArgs(real)[0]).toMatch(/reserved:\s*\w/);

    // Multi-line call with a nested object is captured whole.
    const multiline = [
      "await recordPaidRunAccounting(governor, sport.key, result, {",
      "  reserved: slotReserved,",
      "});",
    ].join("\n");
    expect(accountingCallArgs(multiline)[0]).toMatch(/reserved:\s*\w/);

    // A bare mention is not a call.
    expect(accountingCallArgs("recordPaidRunAccounting is the helper")).toEqual([]);
  });

  it("does not treat the definition site as a caller", () => {
    expect(callsProcessSport("export async function processSport(sport, apiKey) {")).toBe(false);
    expect(callsProcessSport("async function processSport(sport) {")).toBe(false);
    expect(callsProcessSport("function processSport(sport) {")).toBe(false);
    // ...but a file that BOTH defines and calls it is still a caller.
    expect(
      callsProcessSport("export async function processSport(s) {}\nawait processSport(s);"),
    ).toBe(true);
  });
});

describe("C-109: every paid processSport caller is governed and accounted", () => {
  it("finds the known paid callers (the scan itself must not silently match nothing)", () => {
    // If this fails because a caller MOVED, update the list. If it fails
    // because one DISAPPEARED, confirm the paid path really is gone.
    expect(paidCallers).toEqual([
      "apps/web/app/api/admin/trigger-refresh/route.ts",
      "packages/ingestion-pipeline/src/refresh-odds.ts",
      "workers/data-refresh/src/refresh-cycle.ts",
    ]);
  });

  for (const rel of paidCallers) {
    it(`${rel} consults the governor before spending`, () => {
      const src = readFileSync(resolve(repoRoot, rel), "utf8");
      expect(src).toMatch(/governedDecision\s*\(/);
    });

    it(`${rel} records the run in the credit ledger`, () => {
      const src = readFileSync(resolve(repoRoot, rel), "utf8");
      expect(src).toMatch(/recordPaidRunAccounting\s*\(/);
    });

    it(`${rel} passes the reservation flag through to the accounting`, () => {
      // reserved:false is what tells the accounting to mark the FIRST paid
      // request itself, after a governor that failed open reserved nothing.
      // Omitting it defaults to true and silently under-counts that spend.
      //
      // Asserted on the CALL ARGUMENTS, not the file: a file-wide match also
      // matched this rule's own explanatory comment in the caller, so it
      // passed even when the call itself dropped the flag (cubic, PR #713).
      const src = readFileSync(resolve(repoRoot, rel), "utf8");
      const calls = accountingCallArgs(src);
      expect(calls.length).toBeGreaterThan(0);
      for (const args of calls) {
        expect(args).toMatch(/reserved:\s*\w/);
      }
    });
  }
});
