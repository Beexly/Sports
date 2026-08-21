import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEDULER_LIVENESS_STATUSES } from "@/lib/ops/scheduler-liveness";
import { SETTLEMENT_HEALTH_BANDS } from "@/lib/performance/settlement-health";
import { expectedMaxGapMinutes } from "@/lib/ops/cron-schedule-manifest";

/**
 * Contract tests for the SEALED control plane (`.github/workflows/**`).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Workflow YAML is shell and string literals. Nothing type-checks it, nothing
 * lints it, and — because it only ever runs on GitHub's runners — a defect in it
 * is invisible locally and produces either a permanently-red alarm nobody trusts
 * or a job that silently never fires. Both had happened here, undetected:
 *
 *  1. `external-watchdog.yml` compares `.schedulerLiveness.status != "ok"`.
 *     `"ok"` is not a member of `SchedulerLivenessStatus` and never has been, so
 *     the comparison is unconditionally true and the job fails every run. 30 of
 *     the 30 most recent runs failed. A permanently-red alarm carries zero signal
 *     and — worse — it was masking a real `settlement.health = "CRITICAL"`.
 *
 *  2. `external-cron.yml`'s `refresh-odds` job guards on
 *     `github.event.schedule == '*​/30 * * * *'`, a literal the workflow's own
 *     `on.schedule` block never declares. The job is unreachable on schedule.
 *
 * Editing `.github/**` is founder-only. So these tests do the half that is ours:
 * make each defect *executable* rather than prose, and make recurrence impossible.
 *
 * THE KNOWN-DEFECT PINS BELOW USE EXACT EQUALITY, NOT SUBSET.
 * That is deliberate. A tolerated-defect list that only checks "no NEW defects"
 * rots into permanent tolerance. With exact equality, applying the founder fix
 * makes this suite fail with an instruction to delete the pin — so the pin cannot
 * outlive the bug, and the strict contract takes over the moment it does.
 */

const WORKFLOW_DIR = path.join(process.cwd(), "..", "..", ".github", "workflows");

function workflowFiles(): { name: string; body: string }[] {
  return readdirSync(WORKFLOW_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((name) => ({
      name,
      body: readFileSync(path.join(WORKFLOW_DIR, name), "utf8"),
    }));
}

/* ------------------------------------------------------------------ *
 * 1. Status-vocabulary contract
 * ------------------------------------------------------------------ */

/**
 * JSON paths on the public truth surface whose value vocabulary is fixed by
 * TypeScript. Any shell literal compared against one of these must be a member.
 */
const VOCABULARIES: Record<string, readonly string[]> = {
  ".schedulerLiveness.status": SCHEDULER_LIVENESS_STATUSES,
  ".settlement.health": SETTLEMENT_HEALTH_BANDS,
};

interface StatusComparison {
  readonly workflow: string;
  readonly jsonPath: string;
  readonly literal: string;
  /** Where the literal came from — a comparison, or a `// "x"` jq fallback. */
  readonly kind: "comparison" | "jq-fallback";
}

/**
 * Extract every string literal a workflow compares against a vocabulary-bearing
 * JSON field.
 *
 * Two hops, because the shell does it in two hops:
 *   `status=$(jq -r '.a.b // "unknown"' file)`   → binds `status` to `.a.b`
 *   `[ "${status}" != "ok" ]`                     → compares `.a.b` to `"ok"`
 */
function statusComparisons(): StatusComparison[] {
  const out: StatusComparison[] = [];

  for (const { name, body } of workflowFiles()) {
    // shellVar -> json path it was assigned from
    const bindings = new Map<string, string>();

    const assign = /(\w+)=\$\(jq\s+-r\s+'([^']+)'/g;
    for (const m of body.matchAll(assign)) {
      const [, shellVar, expr] = m as unknown as [string, string, string];
      // `.a.b // "unknown"` — split the jq default off the path.
      const [rawPath, rawFallback] = expr.split("//").map((s) => s.trim());
      const jsonPath = rawPath ?? "";
      if (!(jsonPath in VOCABULARIES)) continue;
      bindings.set(shellVar, jsonPath);

      const fallback = rawFallback?.match(/^"([^"]*)"$/)?.[1];
      if (fallback !== undefined) {
        out.push({ workflow: name, jsonPath, literal: fallback, kind: "jq-fallback" });
      }
    }

    // `[ "${var}" != "literal" ]` / `= "literal"`
    const compare = /\[\s*"\$\{(\w+)\}"\s*(?:!=|=)\s*"([^"]*)"\s*\]/g;
    for (const m of body.matchAll(compare)) {
      const [, shellVar, literal] = m as unknown as [string, string, string];
      const jsonPath = bindings.get(shellVar);
      if (!jsonPath) continue;
      out.push({ workflow: name, jsonPath, literal, kind: "comparison" });
    }
  }

  return out;
}

/**
 * Comparisons that are KNOWN-BROKEN and founder-gated (`.github/**` is sealed).
 * Exact-match pin — see the header. Fix, then delete the entry.
 */
const KNOWN_BAD_STATUS_LITERALS: readonly string[] = [
  // external-watchdog.yml: `if [ "${scheduler_status}" != "ok" ]`.
  // FOUNDER FIX (one line): compare against a real member instead —
  //   if [ "${scheduler_status}" != "healthy" ] && [ "${scheduler_status}" != "degraded" ]
  // ("degraded" is a heads-up, not an outage; alarming on it re-creates the noise.)
  'external-watchdog.yml .schedulerLiveness.status "ok"',
];

const describeComparison = (c: StatusComparison) =>
  `${c.workflow} ${c.jsonPath} "${c.literal}"`;

describe("workflow status literals must exist in the vocabulary they compare against", () => {
  it("finds the comparisons at all (guards against a silent parser/rename break)", () => {
    const found = statusComparisons();
    expect(found.length).toBeGreaterThan(0);
    expect(found.map((c) => c.jsonPath)).toContain(".schedulerLiveness.status");
    expect(found.map((c) => c.jsonPath)).toContain(".settlement.health");
  });

  it("compares only against real members, except the pinned founder-gated defect", () => {
    const offenders = statusComparisons()
      .filter((c) => c.kind === "comparison")
      .filter((c) => !VOCABULARIES[c.jsonPath]!.includes(c.literal))
      .map(describeComparison)
      .sort();

    // EXACT equality. If this fails because `offenders` is EMPTY, the founder has
    // applied the fix — delete the matching KNOWN_BAD_STATUS_LITERALS entry.
    // If it fails because `offenders` GREW, a new always-true comparison was just
    // introduced: a workflow alarm that can never pass and never warn.
    expect(offenders).toEqual([...KNOWN_BAD_STATUS_LITERALS].sort());
  });

  it("the settlement half of the watchdog is correct and must stay that way", () => {
    const settlement = statusComparisons().filter(
      (c) => c.jsonPath === ".settlement.health" && c.kind === "comparison",
    );
    expect(settlement.length).toBeGreaterThan(0);
    for (const c of settlement) {
      expect(SETTLEMENT_HEALTH_BANDS).toContain(c.literal);
    }
  });

  it("a jq fallback for an absent field must not collide with a real band", () => {
    // `jq -r '.settlement.health // "unknown"'` — the fallback fires when the
    // field is MISSING. It is a sentinel, not a status, so membership is not
    // required of it. What IS required is that it stay distinguishable: a
    // fallback equal to a real band would make "the endpoint did not report this"
    // silently read as "the endpoint reported this."
    const fallbacks = statusComparisons().filter(
      (c) => c.kind === "jq-fallback" && c.jsonPath === ".settlement.health",
    );
    expect(fallbacks.length).toBeGreaterThan(0);
    for (const f of fallbacks) {
      expect(SETTLEMENT_HEALTH_BANDS).not.toContain(f.literal);
    }
  });

  it("`ok` is not, and never was, a scheduler-liveness status", () => {
    // The whole first defect in one line: nothing in the type ever emitted "ok",
    // so `!= "ok"` could only ever be true.
    expect(SCHEDULER_LIVENESS_STATUSES).not.toContain("ok");
  });
});

/* ------------------------------------------------------------------ *
 * 2. Schedule-literal contract
 * ------------------------------------------------------------------ */

function declaredSchedules(body: string): string[] {
  return [...body.matchAll(/^\s*-\s*cron:\s*["']([^"']+)["']/gm)].map((m) => m[1]!);
}

function guardReferencedSchedules(body: string): string[] {
  return [...body.matchAll(/github\.event\.schedule\s*==\s*'([^']+)'/g)].map((m) => m[1]!);
}

/**
 * Job guards referencing a cron literal the workflow never declares. Such a job
 * is dead on schedule — reachable only by manual dispatch — and nothing in CI or
 * GitHub's own YAML validation says so.
 *
 * Exact-match pin, same discipline as above.
 */
const KNOWN_ORPHAN_GUARDS: readonly string[] = [
  // external-cron.yml `refresh-odds` guards on '*/30 * * * *', which `on.schedule`
  // does not declare, so the job never fires on schedule.
  // FOUNDER FIX: add `- cron: "*/30 * * * *"` to `on.schedule`, or repoint the
  // guard at a declared literal. Note this job is one of the three
  // INGESTION_OBSERVABLE_PATHS that scheduler-liveness reads.
  "external-cron.yml */30 * * * *",
];

describe("workflow schedule literals", () => {
  it("every `- cron:` literal is a well-formed 5-field expression", () => {
    for (const { name, body } of workflowFiles()) {
      for (const schedule of declaredSchedules(body)) {
        expect(
          schedule.trim().split(/\s+/),
          `${name} declares a malformed cron "${schedule}"`,
        ).toHaveLength(5);
      }
    }
  });

  it("external-cron schedules are daily-periodic, so liveness can reason about a gap", () => {
    // `expectedMaxGapMinutes` returns null by design for anything that restricts
    // day-of-month/month/day-of-week — a weekly job has no single "expected gap",
    // and guessing one would be a lie. That null is fine for `weekly-comparison`.
    // It is NOT fine here: external-cron is the ingestion backstop, and
    // `scheduler-liveness.ts` derives its thresholds from exactly this cadence.
    const externalCron = workflowFiles().find((f) => f.name === "external-cron.yml");
    expect(externalCron).toBeDefined();

    const schedules = declaredSchedules(externalCron!.body);
    expect(schedules.length).toBeGreaterThan(0);
    for (const schedule of schedules) {
      const gap = expectedMaxGapMinutes(schedule);
      expect(gap, `external-cron.yml "${schedule}" has no modellable gap`).not.toBeNull();
      expect(gap!).toBeGreaterThan(0);
    }
  });

  it("no job guards on a cron literal the workflow never declares", () => {
    const orphans: string[] = [];
    for (const { name, body } of workflowFiles()) {
      const declared = new Set(declaredSchedules(body));
      for (const referenced of new Set(guardReferencedSchedules(body))) {
        if (!declared.has(referenced)) orphans.push(`${name} ${referenced}`);
      }
    }

    // EXACT equality — see the header. Empty means the founder fixed it: delete
    // the pin. Larger means a job was just made permanently unreachable.
    expect(orphans.sort()).toEqual([...KNOWN_ORPHAN_GUARDS].sort());
  });

  it("finds schedule guards at all (parser sanity)", () => {
    const total = workflowFiles().reduce(
      (n, { body }) => n + guardReferencedSchedules(body).length,
      0,
    );
    expect(total).toBeGreaterThan(0);
  });
});
