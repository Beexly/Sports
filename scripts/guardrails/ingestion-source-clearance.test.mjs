/**
 * Fixture suite for the ingestion source-clearance guard.
 *
 * Fixtures are literal strings with hand-assigned verdicts, so this cannot
 * degrade into a self-check that agrees with whatever the implementation
 * happens to do. The registry is a small hand-built fixture for the same
 * reason: a suite that read the real registry would start passing or failing
 * for reasons that have nothing to do with this guard's logic.
 *
 * Run via: node --test scripts/guardrails/ingestion-source-clearance.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRegistry,
  isRestricted,
  scanFileText,
} from "./ingestion-source-clearance.mjs";

const FIXTURE_REGISTRY_TEXT = `
  {
    source_id: "nflverse",
    status: "approved_open_license",
    automation_allowed: true,
  },
  {
    source_id: "pfr-advstats-via-nflverse",
    status: "permission_required",
    automation_allowed: false,
  },
  {
    source_id: "scores24",
    status: "permission_required",
    automation_allowed: false,
  },
`;

const REGISTRY = parseRegistry(FIXTURE_REGISTRY_TEXT);
const FILE = "packages/data-ingestion/src/fixture.ts";

test("parses every entry and both governing fields", () => {
  assert.equal(REGISTRY.size, 3);
  assert.deepEqual(REGISTRY.get("nflverse"), {
    status: "approved_open_license",
    automationAllowed: true,
  });
  assert.deepEqual(REGISTRY.get("pfr-advstats-via-nflverse"), {
    status: "permission_required",
    automationAllowed: false,
  });
});

test("an unknown source is restricted, never the reverse", () => {
  // The fail-closed direction: a source the registry has never heard of must
  // not be treated as cleared just because there is no row denying it.
  assert.equal(isRestricted(undefined), true);
  assert.equal(isRestricted(REGISTRY.get("not-in-registry")), true);
});

test("automation_allowed:false is restricted even if the status looked fine", () => {
  assert.equal(
    isRestricted({ status: "approved_open_license", automationAllowed: false }),
    true,
  );
});

test("a status outside the cleared allow-list is restricted", () => {
  // New statuses must be added to CLEARED_STATUSES deliberately, not inherit
  // permission by being unrecognised.
  assert.equal(
    isRestricted({ status: "some_future_status", automationAllowed: true }),
    true,
  );
});

test("a cleared source with automation allowed is not restricted", () => {
  assert.equal(isRestricted(REGISTRY.get("nflverse")), false);
});

test("RULE 1 fires: restricted dataset described with a permissive licence", () => {
  // The real regression, reproduced verbatim in shape — nflverse-pfr-def.ts's
  // header called the PFR advanced-stats release CC-BY-4.0 on the same line as
  // the release name, while the registry has it as permission_required.
  const text = `
    /**
     * Turns the CC-BY-4.0 advstats_week_def_<season>.csv into typed rows.
     */
    export function parsePfrDef(table) { return table; }
  `;
  const findings = scanFileText(text, FILE, REGISTRY);
  const rule1 = findings.filter((f) => f.rule === "LICENCE_CONTRADICTION");
  assert.equal(rule1.length, 1);
  assert.equal(rule1[0].sourceId, "pfr-advstats-via-nflverse");
  assert.match(rule1[0].detail, /permission_required/);
  assert.equal(rule1[0].line, 3); // reports the offending line, not the file
});

test("RULE 1 does NOT fire when the licence and the dataset are on different lines", () => {
  // The false-positive class that made the first cut of this guard useless: a
  // file may correctly discuss the permissive nflverse envelope AND separately
  // name the restricted release. apps/web/lib/ingestion/pfr-adv-stats.ts is
  // exactly this shape and is the exemplar we want copied, not failed.
  const text = [
    "/**",
    " * PFR advanced-stats ingestion (nflverse `pfr_advstats` -> PfrAdvStat).",
    " * The generic nflverse envelope is CC-BY-4.0.",
    " * This release is NOT covered by it - permission_required.",
    " */",
    "checkClearance({ source_id: 'pfr-advstats-via-nflverse' });",
  ].join("\n");
  assert.deepEqual(scanFileText(text, FILE, REGISTRY), []);
});

test("a catalogue listing many datasets and many licences is not flagged", () => {
  // nflverse-source.ts / source-registry.ts shape: dataset keys and licence
  // strings both appear, legitimately, for different sources.
  const text = [
    "const CATALOG = {",
    "  player_stats: { license: 'CC-BY-4.0' },",
    "  pfr_advstats: { key: 'pfr_advstats', grain: 'player-week' },",
    "};",
  ].join("\n");
  assert.deepEqual(scanFileText(text, FILE, REGISTRY), []);
});

test("RULE 2 fires: restricted dataset fetched without a clearance call", () => {
  const text = `
    export async function load(season) {
      const res = await fetch(url("pfr_advstats", season));
      return res.text();
    }
  `;
  const findings = scanFileText(text, FILE, REGISTRY);
  const rule2 = findings.filter((f) => f.rule === "UNGATED_FETCH");
  assert.equal(rule2.length, 1);
  assert.match(rule2[0].detail, /never calls/);
});

test("RULE 2 does NOT fire when the fetch and the dataset are on different lines", () => {
  // A fetch elsewhere in a file that merely mentions the dataset is not
  // evidence that THIS dataset is being fetched.
  const text = [
    "const KEYS = ['pfr_advstats'];",
    "export async function loadSomethingElse() {",
    "  return fetch('https://example.invalid/player_stats');",
    "}",
  ].join("\n");
  assert.deepEqual(scanFileText(text, FILE, REGISTRY), []);
});

test("RULE 2 does NOT fire when the fetch is gated", () => {
  const text = `
    export async function load(season) {
      checkClearance({ source_id: "pfr-advstats-via-nflverse" });
      const res = await fetch(url("pfr_advstats", season));
      return res.text();
    }
  `;
  const findings = scanFileText(text, FILE, REGISTRY);
  assert.equal(findings.filter((f) => f.rule === "UNGATED_FETCH").length, 0);
});

test("a pure parser over a restricted dataset is allowed to exist", () => {
  // The deliberate non-rule. parsePfrDef today has no production caller; the
  // hazard is the fetch, and a guard that failed every restricted-source parser
  // would be routed around rather than obeyed.
  const text = `
    /** Parsed table for advstats_week_def is supplied by the caller. */
    export function parsePfrDef(table) { return table.rows; }
  `;
  const findings = scanFileText(text, FILE, REGISTRY);
  assert.equal(findings.length, 0);
});

test("a cleared source may be fetched freely", () => {
  const text = `
    export async function load() {
      const res = await fetch("https://github.com/nflverse/nflverse-data/player_stats");
      return res.text();
    }
  `;
  assert.deepEqual(scanFileText(text, FILE, REGISTRY), []);
});

test("both rules can fire on one file, once per source", () => {
  const text = `
    /** advstats_week_def, CC-BY-4.0 per nflverse. */
    export async function load() {
      const res = await fetch(url("pfr_advstats"));
      return res.text();
    }
  `;
  const findings = scanFileText(text, FILE, REGISTRY);
  const rules = findings.map((f) => f.rule).sort();
  assert.deepEqual(rules, ["LICENCE_CONTRADICTION", "UNGATED_FETCH"]);
  // Two markers for the same source_id must not double-report.
  assert.equal(new Set(findings.map((f) => f.sourceId)).size, 1);
});

test("a dataset named on many lines reports once per rule, not once per line", () => {
  const text = [
    "// advstats_week_def, CC-BY-4.0",
    "// advstats_week_def again, CC-BY-4.0",
    "// advstats_week_def a third time, CC-BY-4.0",
  ].join("\n");
  const findings = scanFileText(text, FILE, REGISTRY);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "LICENCE_CONTRADICTION");
});

test("licence claims are matched case-insensitively", () => {
  const text = `/** advstats_week_def — cc-by-4.0 */ export const x = 1;`;
  const findings = scanFileText(text, FILE, REGISTRY);
  assert.equal(findings.filter((f) => f.rule === "LICENCE_CONTRADICTION").length, 1);
});

test("a file mentioning nothing restricted produces no findings", () => {
  const text = `export function add(a, b) { return a + b; }`;
  assert.deepEqual(scanFileText(text, FILE, REGISTRY), []);
});

test("assertIngestible counts as a clearance call", () => {
  const text = `
    export async function load() {
      assertIngestible("pfr-advstats-via-nflverse");
      return fetch(url("advstats_week_def"));
    }
  `;
  const findings = scanFileText(text, FILE, REGISTRY);
  assert.equal(findings.filter((f) => f.rule === "UNGATED_FETCH").length, 0);
});
