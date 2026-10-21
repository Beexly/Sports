/**
 * GAP-27: the draft-only guardrail's Twitter/X pattern missed the ACTUAL transport.
 *
 * WHAT THE BUG WAS. `workers/twitter-bot/x-client.js` hard-codes
 * `const DEFAULT_BASE = "https://api.x.com"`. The guardrail's pattern was
 * `/api\.twitter\.com|.../i` -- and `api.twitter.com` appears NOWHERE in the
 * tracked tree. So the guardrail was watching a host that does not exist here
 * while a file that hard-codes the live one passed clean. The guardrail was
 * green, and it was green for the wrong reason.
 *
 * WHY A TEST AND NOT JUST A PATCH. A patched regex with nothing asserting it
 * is the same shape of weakness as the bug: the next person to rename a host,
 * or to widen a whitelist, reintroduces the hole silently. This file asserts
 * the three properties that must hold simultaneously:
 *
 *   1. The pattern MATCHES the real transport (`api.x.com`).
 *   2. The pattern STILL MATCHES the legacy host, so the fix did not narrow it.
 *   3. The named exception is TIGHT -- it covers the transport files and
 *      nothing else, and it is REVOKED automatically if the transport ever
 *      becomes reachable from the engine.
 *
 * Point 3 is the one that matters most. An allow-list is a promise, and a
 * promise nobody checks is a promise that decays. The test below FAILS if
 * anything in apps/ or packages/ ever imports workers/twitter-bot/, because at
 * that moment the exception is no longer justified and the guardrail should
 * go red.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

// TWO levels up, not three: this file is at <root>/scripts/guardrails/, so
// ".." x2 reaches <root>. With ".." x3 it resolved to C:\Users\Garrett --
// the PARENT of the repo -- and the test then read a stale/other copy of the
// guardrail, which is exactly the kind of thing that makes a test pass for
// the wrong reason.
const ROOT = resolve(import.meta.dirname, "..", "..");
const GUARD = join(ROOT, "scripts", "guardrails", "draft-only.mjs");

const guardSrc = readFileSync(GUARD, "utf8");

/** Pull the twitter-api pattern out of the guardrail source. */
function twitterPattern() {
  // LINE-ANCHORED on purpose. An earlier version used a greedy /s match and
  // failed to capture the pattern at all -- which would have made the test
  // assert on `null` and pass for the wrong reason.
  const m = guardSrc.match(
    /\{ id: "twitter-api", rx: (\/[^\n]*?\/[a-z]+), desc: "Twitter\/X API"/,
  );
  assert.ok(m, "the twitter-api pattern must still be present in the guardrail");
  // eslint-disable-next-line no-eval
  return eval(m[1]);
}

test("the X pattern matches the transport the repo ACTUALLY uses", () => {
  const rx = twitterPattern();
  // The real base URL, verbatim from workers/twitter-bot/x-client.js.
  assert.ok(
    rx.test('const DEFAULT_BASE = "https://api.x.com";'),
    "the pattern must match https://api.x.com -- this is the bug GAP-27 reports",
  );
  // The endpoint is BUILT FROM the base URL, so the host is what the pattern
  // sees. Assert the constructed form too, since that is the literal text a
  // future rename would have to change.
  assert.ok(
    rx.test('const url = `${this.baseUrl}/2/tweets`;'.replace("this.baseUrl", "https://api.x.com")),
    "the pattern must match the constructed endpoint URL",
  );
});

test("the X pattern still matches the LEGACY host -- the fix did not narrow it", () => {
  const rx = twitterPattern();
  assert.ok(
    rx.test("https://api.twitter.com/1.1/statuses/update.json"),
    "api.twitter.com must still be caught; the fix adds a host, it does not replace one",
  );
  assert.ok(rx.test("twitterPost("), "the twitterPost( call form must still be caught");
});

test("the guardrail's named X exception covers the transport and NOTHING else", () => {
  // Parse the allow-list out of the source. Every entry must be a real path.
  const block = guardSrc.match(/const WHITELIST_FILES = new Set\(\[(.*?)\]\);/s);
  assert.ok(block, "WHITELIST_FILES must still exist");
  // ONLY lines that ARE set entries. A naive /"([^"]+)"/g over the whole block
  // also matches QUOTED PHRASES INSIDE THE COMMENTS -- the existing
  // email-channel entry's comment quotes a retired sentence, and that text was
  // being read as a path. So: a line counts only if its first non-space
  // character is a quote, and only the FIRST quoted string on that line is an
  // entry.
  const entries = block[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('"'))
    .map((line) => {
      const m = line.match(/^"([^"]+)"/);
      return m ? m[1] : null;
    })
    .filter((e) => e !== null);

  const expected = [
    "workers/twitter-bot/oauth1.js",
    "workers/twitter-bot/sender.js",
    "workers/twitter-bot/x-client.js",
  ];
  for (const e of expected) {
    assert.ok(entries.includes(e), `${e} must be in the named X exception`);
    assert.ok(
      statSync(join(ROOT, e)).isFile(),
      `${e} is allow-listed but does not exist -- a stale exception is a silent hole`,
    );
  }

  // Nothing ELSE under workers/ may be allow-listed. If someone adds a second
  // worker to that directory, the exception must not silently widen with it.
  const workersEntries = entries.filter((e) => e.startsWith("workers/"));
  assert.deepEqual(
    workersEntries.sort(),
    [...expected].sort(),
    "the workers/ exception must be EXACTLY the three transport files",
  );
});

test("the X exception is REVOKED if the transport ever becomes engine-reachable", () => {
  // THE PROMISE. The exception rests on the transport being a standalone
  // operator-run worker: zero importers outside its own directory, no cron, no
  // vercel entry, no CI invocation. The moment that stops being true, the
  // exception is wrong and this test must go red.
  //
  // This is the assertion that makes the allow-list honest rather than
  // decorative.
  const importers = [];

  // TRACKED FILES ONLY, via `git ls-files`. Two reasons, both load-bearing:
  //
  // 1. SPEED. A recursive walk of apps/ and packages/ descends into
  //    node_modules and takes minutes.
  // 2. CORRECTNESS. The question is "can the ENGINE reach the transport", and
  //    the engine is the tracked source. A build artifact in an ignored
  //    directory is not a path the engine can take, and scanning it would
  //    produce a false revocation.
  const listed = execFileSync("git", ["ls-files", "apps", "packages", "scripts", ".github"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  for (const rel of listed.split("\n")) {
    const path = rel.trim();
    if (!path) continue;
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) continue;
    if (path.startsWith("workers/twitter-bot/")) continue;
    // The guardrail's own source NAMES the transport (in its allow-list and in
    // the comment explaining it). A guardrail is not an importer of the thing it
    // guards.
    if (path === "scripts/guardrails/draft-only.mjs") continue;
    if (path === "scripts/guardrails/draft-only.test.mjs") continue;
    let text;
    try {
      text = readFileSync(join(ROOT, path), "utf8");
    } catch {
      continue;
    }
    // The question is whether the TRANSPORT (workers/twitter-bot/*) is reachable
    // from the engine -- NOT whether the word "twitter-bot" appears anywhere.
    //
    // The TEMPLATE layer (apps/web/lib/twitter-bot/templates/*) is a DIFFERENT
    // subsystem: it renders post text and never imports the transport. Matching
    // the bare substring flagged 19 files, all of them legitimate, and would
    // have made this test permanently red -- which is how a guardrail gets
    // switched off.
    //
    // So: the transport's own path, its module names, or an explicit import of
    // it. A reference to the TEMPLATE layer does not count.
    const reachesTransport =
      text.includes("workers/twitter-bot") ||
      /from\s+["'][^"']*workers\/twitter-bot\//.test(text) ||
      /require\(\s*["'][^"']*workers\/twitter-bot\//.test(text) ||
      // "x-client" must be a PATH SEGMENT, not a suffix of another module's
      // name: `espn-powerindex-client.js` and `prophetx-client.js` are
      // data-ingestion clients, not the X transport. Require a separator
      // (slash) or a path prefix before it.
      /(?:^|["'`/\s])x-client(?:\.js)?["'`]/.test(text) ||
      /require\(\s*["'][^"']*\/[x]-client(?:\.js)?["']/.test(text) ||
      /from\s+["'][^"']*twitter-bot\/sender(\.js)?["']/.test(text) ||
      /require\(\s*["'][^"']*twitter-bot\/sender(\.js)?["']/.test(text);
    if (reachesTransport) {
      importers.push(path);
    }
  }

  assert.deepEqual(
    importers,
    [],
    "something in apps/packages/scripts/.github now references the X transport. " +
      "The workers/twitter-bot exception is no longer justified -- remove it from " +
      "WHITELIST_FILES and let the guardrail block the path.",
  );
});

test("the guardrail still passes on the tree, and still scans a real number of files", () => {
  // The guardrail is the thing being fixed. If it is red, the fix broke CI; if
  // it is green because it stopped scanning, the fix removed the gate.
  const out = execFileSync(process.execPath, [GUARD], { cwd: ROOT, encoding: "utf8" });
  assert.match(out, /\[draft-only\] OK - scanned (\d+) file\(s\)/);
  const scanned = Number(out.match(/scanned (\d+) file\(s\)/)[1]);
  assert.ok(scanned > 1000, `the guardrail must still scan a real tree; it scanned ${scanned}`);
});
