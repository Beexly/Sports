#!/usr/bin/env node
/**
 * Behavioural tests for the trust-gate banned-phrase scanner.
 *
 * These exist because the guard's exemptions have been source-asserted only:
 * a regression that quietly re-blanked a legitimate phrase, or quietly dropped
 * the slang ban, would still pass the source-level test in
 * apps/web/__tests__/brand-safety-v2.test.ts. Each case here runs the REAL
 * script against a throwaway repo and asserts on its exit code.
 *
 * Run: node --test scripts/guardrails/trust-gate.test.mjs
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "trust-gate.mjs");

/** Build a throwaway repo containing `files`, run trust-gate with cwd there. */
function scan(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "trust-gate-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const abs = path.join(dir, rel);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, body, "utf8");
    }
    try {
      const stdout = execFileSync("node", [SCRIPT], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      return { code: 0, out: stdout };
    } catch (e) {
      return { code: typeof e.status === "number" ? e.status : 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const clean = (body) => ({ "packages/thing.ts": body });

test("banned.lock still refuses the slang it exists to refuse", () => {
  for (const phrase of ["That's a lock for week 3.", "Lock of the day: PHI -3.", "a true lock here"]) {
    const r = scan(clean(phrase));
    assert.equal(r.code, 1, `expected refusal for: ${phrase}`);
    assert.match(r.out, /banned\.lock/);
  }
});

test("Drew Lock (the NFL passer) is a proper noun, not betting slang", () => {
  // Root memory docs carry verbatim social-post digests, where a quarterback's
  // surname is a data value. These tripped the ban and turned every PR red.
  const r = scan({ "AGENTS.md": "Leaderboard: 1 Josh Allen 7.4, 2 Drake Maye 6.9, 3 Drew Lock 4.1.\n" });
  assert.equal(r.code, 0, r.out);
  // ...but the surrounding slang is still refused in the same file.
  const mixed = scan({ "AGENTS.md": "Drew Lock SEA (51, +3.2). Also: the Bills are a lock this week.\n" });
  assert.equal(mixed.code, 1, mixed.out);
  assert.match(mixed.out, /banned\.lock/);
});

test("server-side lock (a mutex) is engineering prose, not a pick", () => {
  const r = scan(clean("Odds sync uses one server-side lock, 90s client backstop.\n"));
  assert.equal(r.code, 0, r.out);
});

test("the surname abbreviation (D.Lock) is exempt in both spellings", () => {
  for (const body of ["D.Lock 22.92%, T.Shough 23.33%.\n", "D. Lock 30.8/26.9.\n"]) {
    assert.equal(scan(clean(body)).code, 0, body);
  }
});

test("a dated @handle digest line in a ROOT memory doc is verbatim third-party data", () => {
  // Root memory docs quote social posts verbatim; a surname in someone else's
  // leaderboard is quoted data, not a claim. Scoped to those docs on purpose.
  const digest = "- @sfdata9ers, 2026-09-24 2:31 PM CDT — leaderboard: Allen 2.9, Purdy 2.8, Lock 2.77.\n";
  assert.equal(scan({ "AGENTS.md": digest }).code, 0);
  // The same line in scanned source is NOT a digest and still hits.
  const inCode = scan(clean(digest));
  assert.equal(inCode.code, 1, inCode.out);
  assert.match(inCode.out, /banned\.lock/);
});

test("lockfile names stay exempt alongside the new contexts", () => {
  const r = scan(clean("This branch does not touch package-lock.json.\n"));
  assert.equal(r.code, 0, r.out);
});

test("other banned phrases are unaffected by the lock exemptions", () => {
  // The lock context-blanking must not leak into a different claim.
  for (const phrase of ["Guaranteed winner here.", "Risk-free money.", "Easy money on this play."]) {
    const r = scan(clean(phrase));
    assert.equal(r.code, 1, `expected refusal for: ${phrase}`);
  }
  // "guaranteed" as an NFL contracts COLUMN name is still the caller's job to
  // avoid in scanned source; only comment lines and tests are exempt.
  const inCode = scan(clean('const cols = ["guaranteed"];\n'));
  assert.equal(inCode.code, 1, inCode.out);
});

test("guaranteedMultiplier (the upstream DK Pick6 field) is third-party data, not a claim", () => {
  // The Trust gate's own log surfaced these 4 hits, all in
  // packages/data-ingestion/src/dk-pick6-intake.ts. It is a property key on
  // DraftKings' Pick6 payout-tier payload — a third book's contest payout
  // table — never a claim this platform makes.
  const file = "packages/data-ingestion/src/dk-pick6-intake.ts";
  const r = scan({
    [file]: [
      "export interface DkPick6PayoutTier {",
      "  readonly numberOfPicksCorrect: number;",
      "  readonly guaranteedMultiplier: number;",
      "}",
      "",
    ].join("\n"),
  });
  assert.equal(r.code, 0, r.out);

  // The access sites must be clean too, not just the interface.
  const uses = scan({
    [file]: [
      "const mult = asFiniteNumber(tier?.guaranteedMultiplier);",
      "accepted.push({ guaranteedMultiplier: mult });",
      "",
    ].join("\n"),
  });
  assert.equal(uses.code, 0, uses.out);
});

test("the guaranteedMultiplier exemption cannot smuggle a real guarantee claim", () => {
  // Negative control: blanking the identifier must leave a residual
  // "guaranteed" on the SAME line still hitting.
  const file = "packages/data-ingestion/src/dk-pick6-intake.ts";
  for (const line of [
    "const guaranteedMultiplier = 10; // guaranteed winner",
    "export const pitch = `guaranteedMultiplier ${x} — guaranteed profit`;",
  ]) {
    const r = scan({ [file]: line + "\n" });
    assert.equal(r.code, 1, `expected refusal for: ${line}`);
    assert.match(r.out, /banned\.guaranteed/);
  }
  // And the guarantee ban is untouched in every other file and context.
  for (const [rel, body] of [
    ["packages/thing.ts", "const x = 1; // guaranteed multiplier of 5x\n"],
    ["apps/web/lib/page.tsx", "Your guaranteedMultiplier is 10x!\n"],
  ]) {
    const r = scan({ [rel]: body });
    assert.equal(r.code, 1, `expected refusal for: ${rel}`);
  }
});
