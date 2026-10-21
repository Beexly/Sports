/**
 * GAP-21: EIGHT readers of PUBLIC_PICKS_ENABLED, TWO DEFAULTS.
 *
 * THE DEFECT. `PUBLIC_PICKS_ENABLED` is read in eight places across
 * `packages/` and `apps/`. Seven of them treat an UNSET variable as OFF
 * (`=== "true"`, or `truthy(...)`). ONE — `platform-config.ts:166` — treats it as
 * ON:
 *
 *     publicPicksEnabled: parseBool(process.env["PUBLIC_PICKS_ENABLED"], true)
 *
 * ...and that one is the one `/api/picks` gates on, because
 * `readiness.ts:134` maps `canExposePublicPicks` straight from
 * `config.publicPicksEnabled`. So the two subsystems that matter most —
 * the route that serves the board, and `commit-reveal.ts`, which decides
 * whether a public commitment is recorded — DISAGREE about the same variable
 * in the same process.
 *
 * EVERYTHING ELSE IN THE REPO AGREES WITH THE MINORITY... AND WITH ITSELF:
 *
 *   - `platform-config.ts`'s OWN header: "Every gate defaults to the SAFEST
 *     option — explicit opt-in required for each. Phase 0 (default): ingest +
 *     score + internal admin only, no public surface."
 *   - `.env.example`: `PUBLIC_PICKS_ENABLED="false"`, under a heading that
 *     reads "Set PUBLIC_PICKS_ENABLED=true ONLY when:".
 *   - `docs/calibration-proposals/2026-08-25-edge-index-full-scale-v5.3.0.md`:
 *     "the public board is behind `PUBLIC_PICKS_ENABLED` (default `false`,
 *     `packages/prediction-engine/src/platform-config.ts`)" — it cites the very
 *     file that says `true`.
 *   - `apps/web/__tests__/public-picks-gate-parity.test.ts`: DELETES the
 *     variable and asserts 503 — i.e. unset must be dark. That test is RED.
 *
 * WHAT THIS TEST DOES, AND WHY IT IS NOT A TAUTOLOGY.
 *
 * It does NOT assert the default is right. It asserts the SHAPE of the
 * divergence: that the set of readers is EXACTLY these eight, that each one's
 * default is EXACTLY what is recorded here, and — the point — that the
 * outlier is the outlier. A ninth reader added tomorrow, or any one of these
 * eight changing its default, FAILS HERE. The divergence stops being
 * folklore and becomes something CI can see.
 *
 * The actual reconciliation — flipping `platform-config.ts` to match the
 * other seven — is an OWNER DECISION, not an audit decision: it changes
 * whether an unconfigured deployment serves a public board. That decision
 * packet is `handoff/GAP21_PUBLIC_PICKS_ENABLED_READERS.md`. This test exists
 * so the decision is made against a pinned, measured table rather than
 * against a grep someone re-runs from memory.
 *
 * WHAT IS DELIBERATELY NOT ASSERTED HERE: anything about live production.
 * The deployed SHA is not an ancestor of this branch, so live semantics must
 * not be attributed to local code.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

/**
 * The measured table. `defaultWhenUnset` is what the reader returns when the
 * environment variable is ABSENT — the only state in which the two defaults
 * differ. Every entry was read out of the file at the line given.
 */
const READERS = [
  {
    file: "packages/prediction-engine/src/platform-config.ts",
    line: 166,
    defaultWhenUnset: "on",
    expression: 'parseBool(process.env["PUBLIC_PICKS_ENABLED"], true)',
    gates: "the live /api/picks route, via readiness.ts canExposePublicPicks",
  },
  {
    file: "packages/prediction-engine/src/honesty/commit-reveal.ts",
    line: 35,
    defaultWhenUnset: "off",
    expression: 'env["PUBLIC_PICKS_ENABLED"] === "true"',
    gates: "whether a public commitment is recorded at all",
  },
  {
    file: "apps/web/app/api/ops/public-surface-truth/route.ts",
    line: 783,
    defaultWhenUnset: "off",
    expression: 'process.env["PUBLIC_PICKS_ENABLED"]?.trim().toLowerCase() === "true"',
    gates: "the operator-facing surface-truth report",
  },
  {
    file: "apps/web/lib/cockpit/jarvis-data.ts",
    line: 530,
    defaultWhenUnset: "off",
    expression: 'envTrue("PUBLIC_PICKS_ENABLED")',
    gates: "the Jarvis cockpit panel",
  },
  {
    file: "apps/web/lib/data-sources/free-settlement-runner.ts",
    line: 990,
    defaultWhenUnset: "off",
    expression: 'process.env["PUBLIC_PICKS_ENABLED"]?.trim().toLowerCase() === "true"',
    gates: "the free settlement runner's view of the gate",
  },
  {
    file: "apps/web/app/api/cron/autonomy-cycle/route.ts",
    line: 117,
    defaultWhenUnset: "off",
    expression: 'envFlag("PUBLIC_PICKS_ENABLED")',
    gates: "the autonomy cycle cron",
  },
  {
    file: "apps/web/app/api/cron/health-alert/route.ts",
    line: 209,
    defaultWhenUnset: "off",
    expression: 'envFlag("PUBLIC_PICKS_ENABLED")',
    gates: "the health-alert cron",
  },
  {
    file: "apps/web/lib/product/board-surfaces.ts",
    line: 58,
    defaultWhenUnset: "off",
    expression: 'truthy(env["PUBLIC_PICKS"]) || truthy(env["PUBLIC_PICKS_ENABLED"])',
    gates: "the product-board surface list",
  },
] as const;

/** How each default is expressed, so the table above is checkable, not decorative. */
const ON_WHEN_UNSET = /parseBool\(\s*process\.env\[["']PUBLIC_PICKS_ENABLED["']\]\s*,\s*true\s*\)/;
const OFF_WHEN_UNSET = /process\.env\[["']PUBLIC_PICKS_ENABLED["']\][^;\n]*?===\s*["']true["']|env\[["']PUBLIC_PICKS_ENABLED["']\]\s*===\s*["']true["']|envTrue\(\s*["']PUBLIC_PICKS_ENABLED["']\s*\)|envFlag\(\s*["']PUBLIC_PICKS_ENABLED["']\s*\)|truthy\(env\[["']PUBLIC_PICKS["']\]\)/;

function sourceOf(relPath: string): string {
  const abs = join(ROOT, relPath.replace(/\//g, "\\"));
  expect(existsSync(abs), `${relPath} must exist`).toBe(true);
  return readFileSync(abs, "utf8");
}

describe("GAP-21: the PUBLIC_PICKS_ENABLED reader table", () => {
  it("every recorded reader still exists, at the recorded line, with the recorded default", () => {
    for (const reader of READERS) {
      const lines = sourceOf(reader.file).split(/\r?\n/);
      const window = lines.slice(Math.max(0, reader.line - 3), reader.line + 2).join("\n");
      expect(window, `${reader.file}:${reader.line} must still contain the reader`).toContain(
        "PUBLIC_PICKS_ENABLED",
      );

      if (reader.defaultWhenUnset === "on") {
        expect(
          window,
          `${reader.file}:${reader.line} must still default to ON when the var is unset`,
        ).toMatch(ON_WHEN_UNSET);
      } else {
        expect(
          window,
          `${reader.file}:${reader.line} must still default to OFF when the var is unset`,
        ).toMatch(OFF_WHEN_UNSET);
      }
    }
  });

  it("EXACTLY ONE reader defaults to ON, and it is the one that gates /api/picks", () => {
    const on = READERS.filter((r) => r.defaultWhenUnset === "on");
    expect(
      on.length,
      `expected exactly one ON reader, found ${on.length}: ${on.map((r) => r.file).join(", ")}`,
    ).toBe(1);
    expect(on[0]!.file).toBe("packages/prediction-engine/src/platform-config.ts");
  });

  it("no reader outside the table has been added -- a NINTH reader must fail here", () => {
    // A reader added without a decision would silently pick a default. Scan the
    // tree for any file that READS the variable (as opposed to mentioning it
    // in a comment or a string) and is not in the table.
    const KNOWN = new Set(READERS.map((r) => r.file));
    const found: string[] = [];

    // Use git to list tracked files: the readers are all tracked source, and
    // this avoids descending into node_modules (which is what made an earlier
    // version of this scan take minutes).
    const listed = execFileSync("git", ["ls-files", "packages", "apps"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f && /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.(ts|tsx)$/.test(f));

    for (const rel of listed) {
      if (KNOWN.has(rel)) continue;
      let text: string;
      try {
        text = readFileSync(join(ROOT, rel.replace(/\//g, "\\")), "utf8");
      } catch {
        continue;
      }
      // Strip line comments and block comments: a MENTION in a comment is not
      // a reader. Then look for an actual read of the variable.
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
      // A READ is any expression that pulls the value out of the environment.
      // It is not enough to look for the two helper call forms: a reader can
      // read the variable directly
      //   process.env["PUBLIC_PICKS_ENABLED"] === "true"
      // and that is exactly what the first version of this scan MISSED -- a
      // ninth reader added in that form passed CI. The check is therefore
      // "does the code READ the variable", however it reads it.
      const READS = [
        /process\.env\[["']PUBLIC_PICKS_ENABLED["']\]/,
        /process\.env\.PUBLIC_PICKS_ENABLED\b/,
        /envTrue\(\s*["']PUBLIC_PICKS_ENABLED["']/,
        /envFlag\(\s*["']PUBLIC_PICKS_ENABLED["']/,
        /\btruthy\(\s*env\[["']PUBLIC_PICKS_ENABLED["']\]/,
        /\btruthy\(\s*process\.env\[["']PUBLIC_PICKS_ENABLED["']\]/,
      ];
      if (!READS.some((rx) => rx.test(code))) continue;
      // A file that only ASSIGNS the variable's NAME to a constant is not a
      // reader of the environment -- it is a definition site. Those are the
      // ones already in the table.
      found.push(rel);
    }

    expect(
      found,
      `new PUBLIC_PICKS_ENABLED reader(s) found that are not in the table: ${found.join(", ")}. ` +
        "Add it to READERS with its measured default, and decide which default it should use.",
    ).toEqual([]);
  });

  it("the FOUNDER'S recorded law is still in the ledger -- the default must not drift from it", () => {
    // The decision is RECORDED, so this is not an open product question:
    // "Explicit YES only", and PUBLIC_PICKS_ENABLED was flipped true -> false on
    // 2026-07-30 as a law-enforcement action because the flag being on was itself
    // a violation. The default for an UNSET variable is therefore OFF.
    //
    // If this assertion ever fails, the ledger was rewritten -- and whoever did it
    // needs to know that platform-config.ts:166 disagrees with it. The audit found
    // the disagreement; this test keeps it from being forgotten.
    const ledger = readFileSync(join(ROOT, "docs", "ops", "OPEN_LEDGER.md"), "utf8");
    expect(ledger).toContain("Explicit YES only");
    expect(ledger).toContain("PUBLIC_PICKS_ENABLED` true → false");
  });

  it("the docs the divergence contradicts are still in place -- so the conflict stays visible", () => {
    // If these are edited to match the code, this test fails and someone has
    // to look at whether the reconciliation happened or the docs drifted.
    const example = readFileSync(join(ROOT, ".env.example"), "utf8");
    expect(example).toContain('PUBLIC_PICKS_ENABLED="false"');

    const config = sourceOf("packages/prediction-engine/src/platform-config.ts");
    expect(config).toContain("Every gate defaults to the SAFEST option");
  });
});
