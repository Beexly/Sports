/**
 * Documentation-truth pins.
 *
 * Agents and the owner act on these docs. A false doc is an instruction to do
 * the wrong thing — a runbook naming a script that does not exist stops an
 * operator dead, and a transcribed cron cadence that has drifted makes an SLA
 * calculation silently wrong.
 *
 * Everything asserted here is derived from the repo itself, so there is no
 * allowlist of "known bad claims" to maintain and no snapshot to refresh. The
 * rules are:
 *
 *  1. Every `npm run <script>` in a live-guidance doc names a real script.
 *  2. Every cron expression written into a live ops doc appears in the actual
 *     schedule files. Prose cadences are the class that rotted worst
 *     (CRON_MATRIX.md carried a hand-maintained table for months while the same
 *     file said "do not hand-edit schedules in this file").
 *  3. Every repo path named in the agent-facing skill docs and the operator
 *     runbook resolves. Those are small, high-traffic, and currently clean;
 *     pinning them keeps a renamed file from sending an agent on a dead search.
 *
 * Rule 1's scope excludes directories that are legitimately not descriptions of
 * today — each exclusion is named with its reason below rather than being a bare
 * ignore list.
 */

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

function git(...args: readonly string[]): string {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const TRACKED_FILES: readonly string[] = git("ls-files").trim().split("\n").filter(Boolean);
const TRACKED_SET: ReadonlySet<string> = new Set(TRACKED_FILES);
const TRACKED_MARKDOWN: readonly string[] = TRACKED_FILES.filter((f) => f.endsWith(".md"));

/** Every script name declared by any package.json in the workspace. */
const SCRIPT_NAMES: ReadonlySet<string> = (() => {
  const names = new Set<string>();
  for (const file of TRACKED_FILES) {
    if (!file.endsWith("package.json")) continue;
    let pkg: { scripts?: Record<string, string> };
    try {
      pkg = JSON.parse(readFileSync(join(REPO_ROOT, file), "utf8")) as { scripts?: Record<string, string> };
    } catch {
      continue;
    }
    for (const name of Object.keys(pkg.scripts ?? {})) names.add(name);
  }
  return names;
})();

/**
 * Docs that are NOT present-tense descriptions of the system. Each prefix is
 * here for a stated reason, not because a claim in it was inconvenient.
 */
const NON_DESCRIPTIVE_DOC_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ["docs/ops/archive/", "historical archive; docs/ops/CANONICAL.md marks it 'Archaeology only'"],
  ["docs/data/", "forward-looking sprint decks that name scripts still to be built (e.g. the EV bench CLI)"],
  ["docs/ops/hermes/", "hermes build-queue docs; owned by a separate correction branch"],
  ["handoff/SPRINT_QUEUE.md", "work order whose tasks instruct an agent to CREATE the script it names"],
  ["docs/ops/FREE_WINDOW_BLITZ.md", "contains an illustrative task-card JSON template, not a runnable command"],
  ["handoff/DOC_DRIFT.md", "a catalogue of documentation drift; it quotes broken commands on purpose"],
];

function isDescriptiveDoc(file: string): boolean {
  return !NON_DESCRIPTIVE_DOC_PREFIXES.some(([prefix]) => file.startsWith(prefix));
}

interface Occurrence {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

function scanLines(files: readonly string[], re: RegExp, capture = 1): Occurrence[] {
  const out: Occurrence[] = [];
  for (const file of files) {
    const lines = readFileSync(join(REPO_ROOT, file), "utf8").split("\n");
    lines.forEach((line, i) => {
      const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      let m: RegExpExecArray | null;
      while ((m = rx.exec(line)) !== null) {
        out.push({ file, line: i + 1, text: m[capture] as string });
      }
    });
  }
  return out;
}

describe("docs: every documented npm script exists", () => {
  it("names no npm script that package.json does not declare", () => {
    const docs = TRACKED_MARKDOWN.filter(isDescriptiveDoc);
    expect(docs.length).toBeGreaterThan(500); // guard against the scan silently collapsing

    const broken: string[] = [];
    for (const occ of scanLines(docs, /\bnpm run ([A-Za-z0-9:_.\-*]+)/)) {
      const raw = occ.text.replace(/[.,)`'"\]]+$/, "");
      // `npm run lint:` / `npm run workers:*` are prefix references in prose, not
      // script names. Accept them when at least one real script has that prefix.
      if (raw.endsWith(":") || raw.includes("*")) {
        // Either a real script followed by prose punctuation ("npm run typecheck: PASS")
        // or a family reference ("npm run workers:*"). Both are legitimate.
        const bare = raw.replace(/[:*]+$/, "");
        const matched = SCRIPT_NAMES.has(bare) || [...SCRIPT_NAMES].some((s) => s.startsWith(`${bare}:`));
        if (!matched) broken.push(`${occ.file}:${occ.line} — npm run ${raw} (no script named or prefixed ${bare})`);
        continue;
      }
      if (!SCRIPT_NAMES.has(raw)) broken.push(`${occ.file}:${occ.line} — npm run ${raw}`);
    }

    expect(broken, `Docs name npm scripts that do not exist:\n${broken.join("\n")}`).toEqual([]);
  });
});

describe("docs: transcribed cron schedules match the schedule files", () => {
  /** Live schedules, from the two files that actually drive execution. */
  const LIVE_CRON_EXPRESSIONS: ReadonlySet<string> = (() => {
    const set = new Set<string>();
    const vercel = JSON.parse(readFileSync(join(REPO_ROOT, "apps/web/vercel.json"), "utf8")) as {
      crons?: ReadonlyArray<{ schedule: string }>;
    };
    for (const c of vercel.crons ?? []) set.add(c.schedule.trim());
    const workflow = readFileSync(join(REPO_ROOT, ".github/workflows/external-cron.yml"), "utf8");
    for (const m of workflow.matchAll(/cron:\s*"([^"]+)"/g)) set.add((m[1] as string).trim());
    return set;
  })();

  it("has live schedules to compare against", () => {
    expect(LIVE_CRON_EXPRESSIONS.size).toBeGreaterThan(10);
  });

  it("quotes no cron expression that is not actually scheduled", () => {
    // Top-level live ops docs plus the two architecture entry points. Dated
    // records under docs/ops/edge/ and docs/ops/archive/ are deliberately out of
    // scope: they report what was scheduled (or what was broken) on their date,
    // and one of them correctly quotes a cron expression precisely because it is
    // NOT in on.schedule.
    const docs = TRACKED_MARKDOWN.filter(
      (f) =>
        (/^docs\/ops\/[^/]+\.md$/.test(f) || f === "README.md" || f === "docs/architecture.md") &&
        isDescriptiveDoc(f),
    );
    expect(docs.length).toBeGreaterThan(20);

    // A backticked 5-field cron expression: three of the fields must be a
    // digit/star/step token, so ordinary prose in backticks cannot match.
    const CRON_RE = /`((?:[0-9*][0-9,\-/*]*\s+){4}[0-9,\-/*A-Za-z]+)`/;

    const stale: string[] = [];
    for (const occ of scanLines(docs, CRON_RE)) {
      const expr = occ.text.trim().replace(/\s+/g, " ");
      if (expr.split(" ").length !== 5) continue;
      if (!LIVE_CRON_EXPRESSIONS.has(expr)) stale.push(`${occ.file}:${occ.line} — \`${expr}\``);
    }

    expect(
      stale,
      "Live ops docs quote cron expressions that appear in neither apps/web/vercel.json nor " +
        `.github/workflows/external-cron.yml:\n${stale.join("\n")}\n` +
        "Point at docs/ops/CRON_MATRIX.generated.md instead of transcribing a schedule.",
    ).toEqual([]);
  });

  it("keeps OPERATOR.md's settle-picks cadence off a hardcoded multi-hour claim", () => {
    // Pin for the corrected claim: settle-picks is hourly (20 * * * *). The doc
    // previously told the operator it ran every 3h, which is the cadence of the
    // separate deliver-settlement-alerts sweep.
    const operator = readFileSync(join(REPO_ROOT, "docs/ops/OPERATOR.md"), "utf8");
    const settleSchedule = (
      JSON.parse(readFileSync(join(REPO_ROOT, "apps/web/vercel.json"), "utf8")) as {
        crons: ReadonlyArray<{ path: string; schedule: string }>;
      }
    ).crons.find((c) => c.path === "/api/cron/settle-picks");
    expect(settleSchedule?.schedule, "settle-picks is expected to be hourly").toBe("20 * * * *");
    expect(
      /cron cadence:\s*every\s*3h/i.test(operator),
      "OPERATOR.md must not claim settle-picks runs every 3h — it runs hourly",
    ).toBe(false);
  });
});

describe("docs: agent-facing docs name only paths that exist", () => {
  it("resolves every repo path in the skill packs and the operator runbook", () => {
    const docs = TRACKED_MARKDOWN.filter(
      (f) => f.startsWith("docs/agent-skills/") || f === "docs/ops/OPERATOR.md",
    );
    expect(docs.length).toBeGreaterThan(10);

    const PATH_RE =
      /`([A-Za-z0-9_@.\-][A-Za-z0-9_@./\-]*\/[A-Za-z0-9_@./\-]*\.(?:ts|tsx|mjs|js|json|prisma|sql|yml|yaml|md|sh))`/;

    const missing: string[] = [];
    for (const occ of scanLines(docs, PATH_RE)) {
      const p = occ.text;
      if (p.startsWith("node_modules")) continue;
      const relativeToDoc = join(dirname(occ.file), p);
      const resolves =
        TRACKED_SET.has(p) ||
        TRACKED_SET.has(relativeToDoc) ||
        existsSync(join(REPO_ROOT, p)) ||
        existsSync(join(REPO_ROOT, relativeToDoc)) ||
        TRACKED_FILES.some((f) => f.endsWith(`/${p}`));
      if (!resolves) missing.push(`${occ.file}:${occ.line} — \`${p}\``);
    }

    expect(missing, `Agent-facing docs name paths that do not exist:\n${missing.join("\n")}`).toEqual([]);
  });
});

describe("docs: no live doc reintroduces a job-queue dependency claim", () => {
  it("keeps the queue package out of every package.json", () => {
    // The stack docs described a broker-backed queue for a long time. The pin is
    // on the fact, not the prose: if the package is ever genuinely installed,
    // this test goes red and the docs may describe it again.
    const declared: string[] = [];
    for (const file of TRACKED_FILES.filter((f) => f.endsWith("package.json"))) {
      const pkg = JSON.parse(readFileSync(join(REPO_ROOT, file), "utf8")) as Record<string, unknown>;
      for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
        const block = pkg[field];
        if (block && typeof block === "object" && "bullmq" in (block as Record<string, string>)) {
          declared.push(`${file} → ${field}`);
        }
      }
    }
    expect(declared).toEqual([]);
  });

  it("does not describe the architecture or the local bring-up as queue-backed", () => {
    for (const file of ["docs/architecture.md", "handoff/LOCAL_BRINGUP.md"] as const) {
      const text = readFileSync(join(REPO_ROOT, file), "utf8");
      // The word may appear only inside an explicit correction (a line that says
      // it is not installed / not required). Any other mention is a live claim.
      const offending = text
        .split("\n")
        .map((line, i) => [i + 1, line] as const)
        .filter(([, line]) => /bullmq/i.test(line))
        .filter(([, line]) => !/never|not\s+(required|installed|a\s+dependency)|used to be/i.test(line));
      expect(
        offending.map(([n, l]) => `${file}:${n} — ${l.trim()}`),
        `${file} still describes a queue that is not installed`,
      ).toEqual([]);
    }
  });
});
