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

// 2026-11-16 (this gate red on 7305b780f, the 2026-11-15 morning analytics
// sweep digest appended to AGENTS.md): three more chart-transcription shapes.
// Each body below is a sentence from that digest, and each must pass while the
// slang shapes on the same surname keep failing.
test("chart transcriptions of the QB named Lock are data, not picks", () => {
  const bodies = [
    "filtered to no interceptions in those 3 (11 of 37) — Lock (Weeks 1, 2, 9: 5 TD, 0 INT, 2 sacks) and Purdy (Weeks 2-4: 8 TD, 0 INT, 0 sacks).\n",
    "As printed: Lock +0.400 EPA/dropback in 2026 (80 dropbacks) vs -0.055 in 2019-25 (1,075).\n",
    "nflverse / nflreadpy footers on Gridiron cards and the hawkblogger Lock chart; NFL MCP at nflmcp.com.\n",
  ];
  for (const body of bodies) {
    const r = scan(clean(body));
    assert.equal(r.code, 0, `${body}\n${r.out}`);
  }
  // The same surname in a claim shape still fails, so the exemption is a shape,
  // not a surname pass.
  for (const body of [
    "Take the Lock (Weeks 1-3) parlay at 2.5u\n",
    "Lock +0.400 means we lock this in\n",
    "check the lock chart, it's a lock\n",
  ]) {
    const r = scan(clean(body));
    assert.equal(r.code, 1, `expected refusal for: ${body}\n${r.out}`);
    assert.match(r.out, /banned\.lock/);
  }
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

test("governance jargon list in AGENTS.md is exempt; public copy still hits", () => {
  const bullet = '- **Zero AI / Robotic Math-Dump:** Never render internal math/pipeline jargon ("22,750,000 snap evaluations", "10-Layer Autonomous Engine", "31-11 banner is retracted", "TNF card 14-6") on customer-facing UI.\n';
  // AGENTS.md (root memory doc) names the banned phrases to forbid them.
  assert.equal(scan({ "AGENTS.md": bullet }).code, 0, scan({ "AGENTS.md": bullet }).out);
  // The same phrases in public copy still fail.
  const pub = scan({ "apps/web/app/pricing/page.tsx": 'export const x = "Powered by our 10-Layer Autonomous Engine with 22,750,000 snap evaluations";\n' });
  assert.equal(pub.code, 1, pub.out);
  assert.match(pub.out, /banned\.positioning\./);
});

test("the 2026-11-17 sweep's Lock digest shapes are verbatim data, not picks", () => {
  // Reproduces the 7 hits on `f32243c3a` (the Nov 16/17 morning analytics
  // sweep appended these to AGENTS.md). Six carry a numeric post ID — a
  // provenance record of one specific third-party post — and the seventh is a
  // quoted leaderboard roll-up whose only "Lock" shapes are stat-table forms.
  const digestLines = [
    "- SumerSports single-game player cards (@SumerSports, Nov 15): Burrow Pass Performance by Zone (ID 2122165077180825679); Lock vs LV card (ID 2122093375495295352).",
    "- Post-window: @hawkblogger 2122715564934377851 (~9:36 AM Nov 17, Lock vs the same defenses), 2122718756149592431 (Lock comparison chart).",
    "- Passing Efficiency grids (IDs 2122394374310965523, 2122394547338547621). Lock (vs LV): 14/17, 240 yds.",
    "- Week 10 QB EPA per Play by Air Yards (ID 2122414695084601738, 1:41 PM Nov 16). Lock +0.61/+0.67/+1.16/+3.31; Purdy +0.65/+1.71.",
    "- Leaderboards as reported: Highest passer rating Week 10 - Lock 158.0, Purdy 154.5; QB comparisons as printed: Lock (22 dropbacks, 17 att, 14 comp); Lock 8/11, 194 yds.",
    "- @RoundtableSN: highest verified ID 2122701290493116533 (8:40 AM Nov 17, Darnold/Lock starter news + image).",
    "- SumerSports percentile cards (@SumerSports, all Nov 16): Lock Down Corners by yards allowed; Drew Lock season card (ID 2122438680686284963).",
  ];
  for (const line of digestLines) {
    const r = scan({ "AGENTS.md": line + "\n" });
    assert.equal(r.code, 0, `${line}\n${r.out}`);
  }
  // The same ID-bearing line is NOT a root memory doc -> still refused.
  const inCode = scan(clean(digestLines[0]));
  assert.equal(inCode.code, 1, inCode.out);
  assert.match(inCode.out, /banned\.lock/);
});

test("a residual standalone lock on a stat-table line still hits", () => {
  // Blank-then-recheck: blanking the quoted surname shape must not let a real
  // claim on the same AGENTS.md line through.
  const r = scan({ "AGENTS.md": "Our model says Lock 2.77 and it is a lock for the day.\n" });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /banned\.lock/);
});

// 2026-11-18 (this gate red on c06a813c0, the Nov 18 09:08 CT morning analytics
// sweep appended to AGENTS.md): four digest lines. Each body is the sentence as
// appended; each must pass while the slang shapes on the same words keep failing.
test("the 2026-11-18 sweep's Lock shapes and quoted third-party copy are data, not picks", () => {
  const digestLines = [
    "- @hawkblogger standout run blocks with printed HIGH-mark definition (source: SumerSports); Lock same-defense EPA comparisons (source: nflverse).",
    "Different-angle note (attributed): the two Lock items above present the same QB's passing in two different comparison frames in the same window, as reported.",
    '- **@FTNData — still protected, 0 of 1,276 posts visible.** Profile: "Follow @FTNFantasy" with a lock, 1,276 posts, 1 Following, 2,540 Followers.',
    'Text note as printed: "Lamb looks like a lock, but Jefferson could blow up or bust".',
  ];
  for (const line of digestLines) {
    const r = scan({ "AGENTS.md": line + "\n" });
    assert.equal(r.code, 0, `${line}\n${r.out}`);
  }
  // Narrowness pins — the same words in a claim shape still fail.
  for (const body of [
    "This is a lock, play it at 2 units.\n",
    "Priced with a lock, 3 followers of the sharp play.\n",
    "we quote as printed: \"the line moved\" and this is a lock, so take it.\n",
  ]) {
    const r = scan(clean(body));
    assert.equal(r.code, 1, `expected refusal for: ${body}\n${r.out}`);
    assert.match(r.out, /banned\.lock/);
  }
  // The quoted-copy blanking only removes text INSIDE the quotes; an
  // unattributed claim next to a quoted bio still hits.
  const mixed =
    'Profile as printed: bio "NFL analyst | AI-assisted content" and this one is a lock for Sunday.';
  const r = scan({ "AGENTS.md": mixed + "\n" });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /banned\.lock/);
});

test("the 2026-11-20 sweep's parenthetical padlock annotation is a UI glyph, not a pick", () => {
  const digestLine =
    'Display name "Follow @FTNFantasy" (lock icon), @FTNData. Bio: "The most advanced NFL charted data, custom & data feeds, player projections, DFS data/tools, betting tools, & customized white-label tools."';
  const ok = scan({ "AGENTS.md": digestLine + "\n" });
  assert.equal(ok.code, 0, ok.out);
  // Narrowness pins: claim shapes still fail, even with the annotation present.
  for (const body of [
    "This is a lock, play it at 2 units.\n",
    "Display name (lock icon) and this one is a lock for Sunday.\n",
  ]) {
    const r = scan({ "AGENTS.md": body });
    assert.equal(r.code, 1, `expected refusal for: ${body}\n${r.out}`);
    assert.match(r.out, /banned\.lock/);
  }
  // Scope pin: the exemption is memory-doc-only; the same annotation in a
  // non-memory file is still a hit.
  const elsewhere = scan({ "packages/ops/src/some-copy.ts": "const s = '(lock icon)';\n" });
  assert.equal(elsewhere.code, 1, elsewhere.out);
  assert.match(elsewhere.out, /banned\.lock/);
});
