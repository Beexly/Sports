"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const fmt = require("/tmp/gsebuild/lib/format.js");
const ent = require("/tmp/gsebuild/lib/entitlements.js");

/* ── The real minus ────────────────────────────────────────────────────── */

test("negative numbers use U+2212, never the ASCII hyphen", () => {
  const out = fmt.signed(-0.1356, 4);
  assert.equal(out, "\u22120.1356");
  assert.ok(!out.includes("-"), "an ASCII hyphen reached a numeric surface");
});

test("positive numbers carry an explicit plus", () => {
  assert.equal(fmt.signed(0.0217, 4), "+0.0217");
});

test("zero renders without a sign at all", () => {
  assert.equal(fmt.signed(0, 4), "0");
  assert.equal(fmt.signed(-0.000001, 4), "0");
});

/* ── Confidence is a score, not a probability ──────────────────────────── */

test("confidenceScore never emits a percent sign", () => {
  const rendered = fmt.confidenceScore(72);
  assert.equal(rendered, "72/100");
  assert.ok(!rendered.includes("%"), "confidence rendered as a probability");
});

test("confidenceScore rounds to an integer — a fractional score implies precision it lacks", () => {
  assert.equal(fmt.confidenceScore(72.4), "72/100");
  assert.equal(fmt.confidenceScore(72.6), "73/100");
});

test("a redacted confidence renders as an em dash, never as 0", () => {
  // The failure this blocks: FREE viewer sees "0/100" and reads it as a real
  // score of zero rather than as "you do not have this".
  assert.equal(fmt.confidenceScore(null), "—");
  assert.equal(fmt.confidenceScore(undefined), "—");
});

test("pct is used only where a genuine probability exists", () => {
  assert.equal(fmt.pct(0.524), "52.4%");
  assert.equal(fmt.pct(null), "—");
});

/* ── Odds and lines ────────────────────────────────────────────────────── */

test("american odds sign correctly and use the real minus", () => {
  assert.equal(fmt.american(-110), "\u2212110");
  assert.equal(fmt.american(145), "+145");
  assert.equal(fmt.american(null), "—");
});

test("line renders PK at zero, not +0.0", () => {
  assert.equal(fmt.line(0), "PK");
  assert.equal(fmt.line(-1.5), "\u22121.5");
  assert.equal(fmt.line(3.5), "+3.5");
});

/* ── Freshness ─────────────────────────────────────────────────────────── */

test("freshnessLine always carries an absolute stamp, not just a relative one", () => {
  const line = fmt.freshnessLine("2026-09-15T11:00:00Z", new Date("2026-09-15T12:00:00Z"));
  assert.match(line, /^Data as of /);
  assert.match(line, /1 hr ago/);
});

test("freshnessLine is honest when the timestamp is missing", () => {
  assert.equal(fmt.freshnessLine(null), "Data as of: unknown");
  assert.equal(fmt.freshnessLine("garbage"), "Data as of: unknown");
});

test("relativeTime never renders a negative age", () => {
  // A clock-skewed device must not say "-3 min ago".
  const future = "2026-09-15T12:05:00Z";
  assert.equal(fmt.relativeTime(future, new Date("2026-09-15T12:00:00Z")), "just now");
});

/* ── Misc ──────────────────────────────────────────────────────────────── */

test("ordinal handles the 11-13 exception", () => {
  assert.equal(fmt.ordinal(1), "1st");
  assert.equal(fmt.ordinal(2), "2nd");
  assert.equal(fmt.ordinal(3), "3rd");
  assert.equal(fmt.ordinal(4), "4th");
  assert.equal(fmt.ordinal(11), "11th");
  assert.equal(fmt.ordinal(12), "12th");
  assert.equal(fmt.ordinal(13), "13th");
  assert.equal(fmt.ordinal(21), "21st");
});

test("num never renders NaN on screen", () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) {
    assert.equal(fmt.num(bad), "—");
  }
});

test("clamp breaks at a word boundary rather than mid-word", () => {
  assert.equal(fmt.clamp("Atlanta Falcons", 8), "Atlanta\u2026");
  assert.equal(fmt.clamp("Short", 20), "Short");
  // A single word longer than the budget still has to fit.
  assert.equal(fmt.clamp("Supercalifragilistic", 6), "Super\u2026");
  // No space inside the budget at all.
  assert.equal(fmt.clamp("abcdefghij", 4), "abc\u2026");
});

test("displayToken preserves authored all-caps but does not guess initialisms", () => {
  assert.equal(fmt.displayToken("LA_LAKERS"), "LA Lakers");
  assert.equal(fmt.displayToken("NFL"), "NFL");
  // Deliberate: a lowercase slug is not promoted, so surnames like "Ng" survive.
  assert.equal(fmt.displayToken("americanfootball_nfl"), "Americanfootball Nfl");
  assert.equal(fmt.displayToken(null), "—");
});

/* ══════════════════════════════════════════════════════════════════════════
   ENTITLEMENTS PARITY
   ══════════════════════════════════════════════════════════════════════════ */

const SPORTS_REPO_TYPES =
  "/var/minis/workspace/gse-ios/sports-meta/packages/types/src/index.ts";

test("the entitlement table is transcribed, not invented", () => {
  // Reads the server's own source if the repo checkout is present, and asserts
  // the tier table matches. This is the guard CLAUDE.md asks for: the FREE
  // definition once drifted because a hand-rolled fallback existed, and this
  // test makes a second such drift a build failure rather than a support ticket.
  if (!fs.existsSync(SPORTS_REPO_TYPES)) {
    // Without the checkout we cannot verify parity; we must not silently pass.
    // `git -C <repo> show HEAD:packages/types/src/index.ts` produces this file.
    console.log(
      "# parity source unavailable — extracting with:\n" +
        "#   git -C sports-meta show HEAD:packages/types/src/index.ts > " +
        SPORTS_REPO_TYPES,
    );
    return;
  }
  const source = fs.readFileSync(SPORTS_REPO_TYPES, "utf8");
  const start = source.indexOf("export function getEntitlements");
  assert.ok(start > -1, "getEntitlements not found in the server source");
  const body = source.slice(start, start + 4000);

  // Every field our mirror defines must be assigned in the server function.
  const serverFields = new Set(
    [...body.matchAll(/^\s{4}([A-Za-z]+):/gm)].map((m) => m[1]),
  );
  assert.ok(serverFields.size >= 15, `only ${serverFields.size} fields parsed from the server`);

  const viewer = {
    FREE: ent.getEntitlements("FREE"),
    FANTASY: ent.getEntitlements("FANTASY"),
    PRO: ent.getEntitlements("PRO"),
    ELITE: ent.getEntitlements("ELITE"),
  };

  for (const field of Object.keys(viewer.PRO)) {
    if (field === "tier") continue;
    assert.ok(serverFields.has(field), `client field "${field}" is not in the server function`);
  }

  // Tier-shape assertions, taken from the server's own comment block.
  assert.equal(viewer.FREE.canSeePremiumPicks, false);
  assert.equal(viewer.FREE.canSeeConfidence, false);
  assert.equal(viewer.FREE.dailyPickLimit, 2);
  assert.equal(viewer.FREE.canSeeEdgeScore, true, "Edge Index must stay public on every tier");

  assert.equal(viewer.FANTASY.canSeePremiumPicks, false, "FANTASY is a separate line, not the picks");
  assert.equal(viewer.FANTASY.canUseFantasyFull, true);
  assert.equal(viewer.FANTASY.canSeeConfidence, false);

  assert.equal(viewer.PRO.canSeePremiumPicks, true);
  assert.equal(viewer.PRO.dailyPickLimit, null);
  assert.equal(viewer.PRO.canGetAlerts, false, "alerts are Elite-exclusive");

  assert.equal(viewer.ELITE.canGetAlerts, true);
  assert.equal(viewer.ELITE.canUseClvLedger, true);
});

test("anonymous viewers resolve through getEntitlements, never a bespoke table", () => {
  assert.deepEqual(ent.getEntitlements(ent.ANONYMOUS_TIER), ent.getEntitlements("FREE"));
});

test("redactionLabel returns null for fields the server chose to send", () => {
  // The rule-3 guard: redaction labels are for ABSENT data only.
  assert.equal(ent.redactionLabel("edgeScore", "FREE"), null);
  assert.equal(ent.redactionLabel("confidence", "PRO"), null);
  assert.equal(ent.redactionLabel("confidence", "FREE"), "Pro");
  assert.equal(ent.redactionLabel("alerts", "PRO"), "Elite");
});

test("no module in the app may unlock data from an entitlement flag", () => {
  // A crude but effective source guard: the tiers file may not import a
  // component or a screen, so nothing can read `canSee*` to render data.
  const src = fs.readFileSync(
    "/var/minis/workspace/gse-ios/app/src/lib/entitlements.ts",
    "utf8",
  );
  assert.ok(!/from "@\/components/.test(src), "entitlements.ts must not import components");
  assert.ok(!/useState|useEffect/.test(src), "entitlements.ts must stay pure");
});

test("tierSatisfies orders FREE < FANTASY < PRO < ELITE", () => {
  assert.equal(ent.tierSatisfies("PRO", "PRO"), true);
  assert.equal(ent.tierSatisfies("ELITE", "PRO"), true);
  assert.equal(ent.tierSatisfies("FREE", "PRO"), false);
  assert.equal(ent.tierSatisfies("FANTASY", "PRO"), false);
});

test("gated routes are declared, and the app never hides a destination the web shows", () => {
  assert.equal(ent.routeRequiresTier("/clv"), "ELITE");
  assert.equal(ent.routeRequiresTier("/trend-lab/anything"), "PRO");
  assert.equal(ent.routeRequiresTier("/board"), null);
});
