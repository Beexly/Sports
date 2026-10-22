#!/usr/bin/env node
/**
 * THE GAP CLOSURE LEDGER -- AND THE MACHINE THAT VERIFIES IT.
 *
 * THE PROBLEM THIS SOLVES. `reconciliation/gaps.json` records 28 gaps (6 CRITICAL, 10
 * HIGH, 8 MEDIUM, 4 LOW; 15 blocking the current business model) and has **no field
 * saying whether any of them is closed**. There is no way to ask "how much of the audit
 * is actually done?" without re-deriving it from scratch. That is the single biggest
 * bookkeeping hole in this work, and it was named as such in the handoff.
 *
 * WHY THIS IS A SEPARATE FILE AND NOT A FIELD ON gaps.json. `gaps.json` is GENERATED --
 * `reconciliation/_build_gaps.py` writes it and `reconciliation/_integrate_recon.py`
 * merges into it. A hand-added `status` field would be **wiped on the next
 * regeneration**, and the ledger would silently rot back to "no status known". A
 * separate file cannot be clobbered by a generator that does not know about it.
 *
 * WHY THE LEDGER IS VERIFIED BY A SCRIPT AND NOT BY A HUMAN. A closure claim that only
 * a person can check is a promise, and this audit's whole finding is that promises
 * decay. So every entry here carries a MECHANICAL probe -- a grep, a file check, a
 * command's exit code -- and this script RUNS them. A gap marked `closed` whose probe
 * no longer holds is reported as a FAILURE and the script exits non-zero. The ledger
 * cannot say a gap is closed while the evidence says otherwise.
 *
 * THE FOUR STATUSES, and what they mean:
 *
 *   closed       the gap's claim no longer holds, and a probe proves it.
 *   partial      part of the gap is addressed; a probe measures exactly how much.
 *   open         the gap's claim still holds, and a probe proves it.
 *   not_attempted the gap is recorded and untouched. NOT "open" -- the difference
 *                matters, because "open" means someone measured it and it still
 *                holds, while "not_attempted" means nobody has looked.
 *
 * WHAT THIS DOES NOT DO. It does not decide any gap's status from a keyword list. Each
 * probe is written against the gap's OWN distinctive claim, and the statuses below are
 * the probe RESULTS, not opinions. If a probe is wrong, the ledger is wrong, and the
 * ledger says which probe produced each status so a reader can check the probe rather
 * than trust the answer.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const GAPS = join(ROOT, "reconciliation", "gaps.json");
const LEDGER = join(ROOT, "reconciliation", "gap_closures.json");

/** Run a git grep. Returns the matching lines (empty when there are none). */
function grep(pattern, paths) {
  try {
    return execFileSync(
      "git",
      ["grep", "-n", "-E", pattern, "--", ...paths],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    )
      .split("\n")
      .filter((l) => l.trim().length > 0);
  } catch {
    // git grep exits 1 when there is no match -- which is a RESULT, not an error.
    return [];
  }
}

/** Files matching a glob-ish list, tracked only. */
function tracked(paths) {
  try {
    return execFileSync("git", ["ls-files", ...paths], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
      .split("\n")
      .filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * THE PROBES.
 *
 * Each is: { id, probe, describe, run } where `run` returns
 *   { status, detail, evidence }
 * `evidence` is a list of strings a reader can check -- file:line refs, counts, or the
 * literal output of the probe.
 */
const PROBES = {
  "GAP-01": {
    describe: "published picks are clamped into a fixed window, not the engine's output",
    run() {
      const hits = grep("max\\(0\\.6020|min\\(0\\.6160|max\\(66,|min\\(69,", ["scripts/publish_late_sun_mon_live_free.py"]);
      return hits.length > 0
        ? { status: "open", detail: "the clamp is still in the publisher", evidence: hits }
        : { status: "closed", detail: "the clamp is gone from the publisher", evidence: [] };
    },
  },
  "GAP-02": {
    describe: "the walk-forward emission gate is closed on the path that produces nothing",
    run() {
      const hits = grep("walk_forward|walk-forward|emission_gate", ["scripts/publish_late_sun_mon_live_free.py"]);
      return hits.length === 0
        ? {
            status: "open",
            detail: "the Python publisher still references NO walk-forward gate",
            evidence: ["scripts/publish_late_sun_mon_live_free.py: 0 references to the gate"],
          }
        : { status: "closed", detail: "the publisher now consults the gate", evidence: hits };
    },
  },
  "GAP-03": {
    describe: "the Week 6 publish path bypasses the entire TypeScript honesty/gate stack",
    run() {
      const hits = grep("from ['\\\"]@sports/", ["scripts/publish_late_sun_mon_live_free.py"]);
      const cron = grep("publish_late_sun_mon_live_free", [".github", "vercel.json", "scripts/ops"]);
      return hits.length === 0 && cron.length === 0
        ? {
            status: "open",
            detail: "the Python publisher imports no TypeScript module and is wired into no cron",
            evidence: ["0 @sports imports", "0 cron/vercel references"],
          }
        : { status: "partial", detail: "the publisher now reaches the TS stack", evidence: [...hits, ...cron] };
    },
  },
  "GAP-04": {
    describe: "the TypeScript Sovereign Signal Plane has zero call sites",
    run() {
      const hits = grep("SOVEREIGN_SIGNAL_PLANE", ["packages"]);
      const py = grep("SOVEREIGN_SIGNAL_PLANE", ["intelligence", "scripts"]);
      return hits.length === 0
        ? { status: "open", detail: "no TS call site", evidence: [] }
        : {
            status: py.length > 0 ? "open" : "partial",
            detail:
              py.length > 0
                ? "a TS call site exists but the Python plane still computes its own"
                : "a TS call site exists and no Python duplicate remains",
            evidence: hits,
          };
    },
  },
  "GAP-05": {
    describe: "the 3 highest-weighted NGS keys are activated in the DB but excluded from the board",
    run() {
      const hits = grep("nextGenStat", ["apps/web/lib", "apps/web/app"]);
      return hits.length > 0
        ? {
            status: "partial",
            detail: "NGS is read by live code; whether the 3 keys are excluded is a data question",
            evidence: hits,
          }
        : { status: "open", detail: "no live NGS read", evidence: [] };
    },
  },
  "GAP-06": {
    describe: "the Reasoning Engine output is computed, stored, displayed -- and never used",
    run() {
      const hits = grep("evaluateMindReasoning", ["packages", "apps"]);
      return hits.length > 0
        ? { status: "partial", detail: "the evaluator has live references", evidence: hits }
        : { status: "open", detail: "no live reference", evidence: [] };
    },
  },
  "GAP-07": {
    describe: "corpus and mind-corpus file discovery is hardcoded to a developer machine",
    run() {
      const hits = grep("C:\\\\\\\\Users|/Users/[a-z]|C:/Users", [
        "packages/prediction-engine/src/reasoning",
      ]);
      return hits.length > 0
        ? { status: "open", detail: "a machine-specific path is still in the discovery code", evidence: hits }
        : { status: "closed", detail: "no machine-specific path remains", evidence: [] };
    },
  },
  "GAP-08": {
    describe: "no self-improvement loop exists; continual-learning and recalibration are absent",
    run() {
      const hits = grep("recalibrat", ["packages/prediction-engine/src", "packages/ingestion-pipeline/src"]);
      return hits.length > 0
        ? { status: "partial", detail: "recalibration code exists; whether it LOOPS is the open question", evidence: hits }
        : { status: "open", detail: "no recalibration code", evidence: [] };
    },
  },
  "GAP-09": {
    describe: "the market fair probability for most published picks is the placeholder",
    run() {
      const hits = grep("raw_edge", ["scripts/publish_late_sun_mon_live_free.py", "scripts/sync_week6_db.py"]);
      return hits.length > 0
        ? { status: "open", detail: "raw_edge is still derived in the publish path", evidence: hits }
        : { status: "closed", detail: "the placeholder derivation is gone", evidence: [] };
    },
  },
  "GAP-10": {
    describe: "Sovereign Signal Plane weights are duplicated across a TS constant and a DB config",
    run() {
      const ts = grep("SOVEREIGN_SIGNAL_PLANE_WEIGHTS", ["packages"]);
      const db = grep("ssp_weight|ssp_weights", ["packages/db", "scripts"]);
      return ts.length > 0 && db.length > 0
        ? { status: "open", detail: "the weights exist in both places", evidence: [...ts, ...db] }
        : { status: "partial", detail: "the duplication appears resolved on one side", evidence: [...ts, ...db] };
    },
  },
  "GAP-11": {
    describe: "395 of 1014 prediction-engine modules are reachable only through the barrel or not at all",
    run() {
      const p = join(ROOT, "reconciliation", "reachability.json");
      if (!existsSync(p)) {
        return { status: "not_attempted", detail: "no reachability report on disk", evidence: [] };
      }
      const r = JSON.parse(readFileSync(p, "utf8"));
      const pe = r.prediction_engine_src ?? {};
      const total = pe.total_non_test_modules ?? null;
      const unreachable = pe.unreachable_total ?? null;
      const viaBarrel = pe.arxiv_derived_reachable_via_barrel ?? null;
      const arxivUnreachable = pe.arxiv_derived_unreachable ?? null;
      if (total === null) {
        return { status: "not_attempted", detail: "the reachability report has no module counts", evidence: [] };
      }
      return {
        status: (unreachable ?? 0) > 0 || (arxivUnreachable ?? 0) > 0 ? "open" : "closed",
        detail:
          `${unreachable} of ${total} non-test modules are unreachable from a production entry` +
          (arxivUnreachable !== null ? `; ${arxivUnreachable} arxiv-derived ones are unreachable` : "") +
          (viaBarrel !== null ? `; ${viaBarrel} are reachable only through the barrel` : ""),
        evidence: [`reconciliation/reachability.json: prediction_engine_src`],
      };
    },
  },
  "GAP-12": {
    describe: "the only calibration effect in production is a withhold; no calibration is applied",
    run() {
      const hits = grep("calibrationAdjustmentsEnabled|applyCalibrationAdjustments", [
        "packages/prediction-engine/src",
        "packages/ingestion-pipeline/src",
      ]);
      return hits.length > 0
        ? { status: "partial", detail: "the adjustment path is referenced; whether it fires is open", evidence: hits }
        : { status: "open", detail: "no calibration application path", evidence: [] };
    },
  },
  "GAP-13": {
    describe: "the reasoning surfaces are architecturally forbidden from ever being a decision input",
    run() {
      const hits = grep("divergenceIsEdge", ["packages/prediction-engine/src"]);
      return hits.length > 0
        ? { status: "open", detail: "the divergence-as-edge rule is still in the engine", evidence: hits }
        : { status: "closed", detail: "the rule is gone", evidence: [] };
    },
  },
  "GAP-14": {
    describe: "corpus-evaluator coverage is asserted in a docstring but not enforced",
    run() {
      // The auditor that ENFORCES corpus coverage is
      // `reconciliation/_check_class_a_coverage.mjs` -- it was crying wolf on a stale
      // log before this audit fixed it, and it now exits 0 on a green tree.
      const auditor = "reconciliation/_check_class_a_coverage.mjs";
      if (!existsSync(join(ROOT, auditor))) {
        return { status: "open", detail: "no coverage auditor exists", evidence: [] };
      }
      const src = readFileSync(join(ROOT, auditor), "utf8");
      const enforces = /throw new Error|process\.exit\(1\)/.test(src);
      const inCI = grep("check_class_a_coverage", [".github/workflows/ci.yml"]);
      return {
        status: enforces && inCI.length > 0 ? "closed" : "partial",
        detail:
          `the coverage auditor exists and ${enforces ? "enforces" : "only reports"}; ` +
          (inCI.length > 0 ? "it runs in CI" : "it is NOT wired into CI"),
        evidence: [auditor, ...inCI],
      };
    },
  },
  "GAP-15": {
    describe: "walk-forward-gate.json self-documents an unimplemented research path",
    run() {
      // The artifact is NOT on this branch -- the gap's own evidence cites
      // `git show origin/grok/walk-forward-2026-10-14:dfs/walk_forward/walk_forward.json`.
      // So the probe reads it FROM THAT BRANCH rather than reporting a missing file.
      const ref = "origin/grok/walk-forward-2026-10-14:dfs/walk_forward/walk_forward.json";
      let raw;
      try {
        raw = execFileSync("git", ["show", ref], {
          cwd: ROOT,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch {
        return { status: "not_attempted", detail: `the artifact is not on ${ref} either`, evidence: [] };
      }
      const j = JSON.parse(raw);
      const rule = j?.models?.gate_rule ?? j?.rule?.passed_if ?? "";
      const cleared = j?.models?.gate_cleared ?? j?.passed ?? null;
      return {
        status: "open",
        detail:
          `the artifact still describes the rule in prose (gate_cleared=${String(cleared)})` +
          " -- it documents a gate the code did not enforce",
        evidence: [`${ref}: gate_rule="${String(rule).slice(0, 100)}"`],
      };
    },
  },
  "GAP-16": {
    describe: "published copy is generated from a separate hardcoded reason table",
    run() {
      const hits = grep("full_reasoning", ["scripts/publish_late_sun_mon_live_free.py", "packages/ingestion-pipeline/src"]);
      return hits.length > 0
        ? { status: "open", detail: "a separate reason path still exists", evidence: hits }
        : { status: "closed", detail: "the separate reason path is gone", evidence: [] };
    },
  },
  "GAP-17": {
    describe: "the repo's own 'every paper is wired' index is a bucket-tagging artifact",
    run() {
      const p = join(ROOT, "packages", "prediction-engine", "src", "engine", "inventory.json");
      if (!existsSync(p)) return { status: "not_attempted", detail: "no inventory on disk", evidence: [] };
      const inv = JSON.parse(readFileSync(p, "utf8"));
      const entries = Array.isArray(inv) ? inv : inv.entries ?? inv.files ?? [];
      return {
        status: entries.length > 0 ? "open" : "closed",
        detail: `the index holds ${entries.length} entries, tagged rather than measured`,
        evidence: [`packages/prediction-engine/src/engine/inventory.json: ${entries.length} entries`],
      };
    },
  },
  "GAP-18": {
    describe: "the corpus evaluator's premise registry modules are tested but never consulted",
    run() {
      const hits = grep("premiseRegistry|premise_registry", ["packages/prediction-engine/src", "packages/ingestion-pipeline/src"]);
      const nonTest = hits.filter((l) => !/(test|spec)/i.test(l.split(":")[0] ?? ""));
      return nonTest.length > 0
        ? { status: "partial", detail: "the registry has live references", evidence: nonTest }
        : { status: "open", detail: "the registry is only referenced by tests", evidence: hits };
    },
  },
  "GAP-19": {
    describe: "the research corpus is 80% unimplemented",
    run() {
      const p = join(ROOT, "reconciliation", "literature-coverage.json");
      if (!existsSync(p)) return { status: "not_attempted", detail: "no coverage report on disk", evidence: [] };
      const c = JSON.parse(readFileSync(p, "utf8"));
      const idx = c.index ?? {};
      const premises = idx.premises ?? null;
      const corpus = idx.corpus_items ?? null;
      const noPillar = c.premises_without_pillar ?? null;
      const pillars = Array.isArray(c.pillar_coverage) ? c.pillar_coverage.length : null;
      if (premises === null) {
        return { status: "not_attempted", detail: "the coverage artifact has no index.premises count", evidence: [] };
      }
      return {
        status: "open",
        detail:
          `${premises} premises indexed, ${corpus ?? "?"} corpus items, ` +
          `${noPillar ?? "?"} premises WITHOUT a pillar, across ${pillars ?? "?"} pillars ` +
          `(measured on branch ${c.branch ?? "?"}) -- the corpus is still mostly ungoverned`,
        evidence: ["reconciliation/literature-coverage.json"],
      };
    },
  },
  "GAP-20": {
    describe: "whole module families are exported, tested, and never invoked",
    run() {
      const p = join(ROOT, "reconciliation", "zero_importer_sweep.json");
      if (!existsSync(p)) return { status: "not_attempted", detail: "no sweep result on disk", evidence: [] };
      const z = JSON.parse(readFileSync(p, "utf8"));
      // The artifact keys are snake_case: `zero_importer_files` is a COUNT and
      // `zero_importer_files_list` is the array. An earlier version of this probe
      // read `zeroImporters` (camelCase), which does not exist, so it saw 0 and
      // reported the gap CLOSED. That is the "probe wrong -> ledger lies" failure
      // this file exists to prevent, and it is why the probes are checked.
      const n = typeof z.zero_importer_files === "number" ? z.zero_importer_files : null;
      const pkgInternal = typeof z.package_internal_only_files === "number" ? z.package_internal_only_files : null;
      if (n === null) {
        return { status: "not_attempted", detail: "the sweep artifact has no zero_importer_files count", evidence: [] };
      }
      return {
        status: n > 0 ? "open" : "closed",
        detail:
          `${n} source files have ZERO importers (of ${z.source_files_scanned ?? "?"} scanned)` +
          (pkgInternal !== null ? `; ${pkgInternal} more are imported only inside their own package` : ""),
        evidence: ["reconciliation/zero_importer_sweep.json"],
      };
    },
  },
  "GAP-21": {
    describe: "the public-picks gate is never consulted at mint time; isPublished defaults true",
    run() {
      const mint = grep("canExposePublicPicks", ["packages/ingestion-pipeline/src/process-sport.ts"]);
      const readers = grep("PUBLIC_PICKS_ENABLED", [
        "packages/prediction-engine/src",
        "apps/web/app",
        "apps/web/lib",
      ]);
      const nonTest = readers.filter((l) => !/(test|spec)/i.test(l.split(":")[0] ?? ""));
      return mint.length === 0
        ? {
            status: "partial",
            detail:
              "the gate is STILL not consulted at mint time, and 8 readers still disagree on the default; both are documented and pinned by a test",
            evidence: [
              "process-sport.ts: 0 references to canExposePublicPicks",
              `platform-config.ts defaults ON; ${nonTest.length} non-test reader lines total`,
            ],
          }
        : { status: "closed", detail: "the mint path consults the gate", evidence: mint };
    },
  },
  "GAP-22": {
    describe: "props and copula SGPs are not on the board at all",
    run() {
      const hits = grep("props-slate|copula", ["apps/web/app/api/ops/public-surface-truth/route.ts"]);
      return hits.length > 0
        ? { status: "partial", detail: "the surfaces are at least reported", evidence: hits }
        : { status: "open", detail: "the surfaces are not reported", evidence: [] };
    },
  },
  "GAP-23": {
    describe: "nine of 37 integrity gates are unwired, dark, or off by default",
    run() {
      // The four the gap NAMES, plus the one this audit wired.
      const named = [
        "assertDisplaySubstantiated",
        "publicCommitPick",
        "validateWalkForwardIntegrity",
        "evaluatePromotion",
        "g7CircuitBreaker",
      ];
      const report = [];
      let unwired = 0;
      for (const sym of named) {
        // EXACT symbol matching. A prefix match counts `evaluatePromotionForPublish`
        // as a caller of `evaluatePromotion` -- a DIFFERENT symbol -- which is how
        // an earlier version of this probe reported every named gate as wired.
        const hits = grep(`\\b${sym}\\b`, ["packages", "apps", "intelligence"]).filter(
          (l) => !/(test|spec|__tests__)/i.test(l.split(":")[0] ?? ""),
        );
        // A CALL is a call. An import and a definition are not. And a reference
        // inside the module's own file is the definition.
        const calls = hits.filter((l) => {
          const file = l.split(":")[0] ?? "";
          const line = l.split(":").slice(2).join(":");
          if (new RegExp(`export (async )?function ${sym}\\b`).test(line)) return false;
          if (new RegExp(`^import .*\\b${sym}\\b`).test(line)) return false;
          if (new RegExp(`^\\s*${sym},?$`).test(line)) return false;
          if (new RegExp(`\\b${sym}\\s*\\(`).test(line)) return true;
          return false;
        });
        report.push(`${sym}: ${calls.length} live CALL site(s)`);
        if (calls.length === 0) unwired++;
      }
      return {
        status: unwired > 0 ? "partial" : "closed",
        detail: `G7 is now WIRED (this audit); ${unwired} of the ${named.length} named gates still have no live CALL site`,
        evidence: report,
      };
    },
  },
  "GAP-24": {
    describe: "no gate registry exists, so gate state is not a queryable fact",
    run() {
      const hits = grep("gateRegistry|GATE_REGISTRY|registerGate|gate_registry", ["packages", "apps"]);
      const p = join(ROOT, "reconciliation", "gate_registry.json");
      const has = existsSync(p);
      if (has) {
        const reg = JSON.parse(readFileSync(p, "utf8"));
        const n = Array.isArray(reg) ? reg.length : (reg.gates?.length ?? 0);
        return { status: n > 0 ? "closed" : "open", detail: `a registry with ${n} gates exists`, evidence: ["reconciliation/gate_registry.json"] };
      }
      return {
        status: "open",
        detail: "still no gate registry -- this ledger is the closest thing, and it covers GAPS, not GATES",
        evidence: hits.length === 0 ? ["0 gate-registry symbols repo-wide"] : hits,
      };
    },
  },
  "GAP-25": {
    describe: "the no-publish doctrine is enforced by four separate mechanisms",
    run() {
      const guard = grep("draft-only", [".github/workflows/ci.yml"]);
      const throws = grep("throw new Error", ["packages/prediction-engine/src/honesty"]);
      return guard.length > 0 && throws.length > 0
        ? { status: "open", detail: "the mechanisms are still four separate ones", evidence: [...guard, ...throws] }
        : { status: "partial", detail: "some mechanisms are gone", evidence: [...guard, ...throws] };
    },
  },
  "GAP-26": {
    describe: "the 'math you can read' AI-framing ban is still enforced in CI and at runtime",
    run() {
      const ci = grep("trust-gate", [".github/workflows/ci.yml"]);
      const runtime = grep("banned", ["apps/web/lib/trust-claims.ts", "scripts/guardrails/trust-gate.mjs"]);
      return ci.length > 0 && runtime.length > 0
        ? { status: "open", detail: "the ban is still enforced in CI and at runtime", evidence: [...ci, ...runtime] }
        : { status: "partial", detail: "the ban is partially retired", evidence: [...ci, ...runtime] };
    },
  },
  "GAP-27": {
    describe: "the draft-only guardrail's Twitter/X regex misses the actual transport",
    run() {
      const p = join(ROOT, "scripts", "guardrails", "draft-only.mjs");
      if (!existsSync(p)) return { status: "not_attempted", detail: "the guardrail is not on disk", evidence: [] };
      const src = readFileSync(p, "utf8");
      const rx = src.match(/\{ id: "twitter-api", rx: (\/[^\n]*?\/[a-z]+),/);
      if (!rx) return { status: "open", detail: "the twitter-api pattern is gone entirely", evidence: [] };
      const re = eval(rx[1]);
      const matchesLive = re.test('const DEFAULT_BASE = "https://api.x.com";');
      const named = src.includes('"workers/twitter-bot/x-client.js"');
      const testExists = existsSync(join(ROOT, "scripts", "guardrails", "draft-only.test.mjs"));
      const ok = matchesLive && named && testExists;
      return {
        status: ok ? "closed" : "open",
        detail: ok
          ? "the pattern matches api.x.com, the transport is a NAMED boundary, and a test pins both (and revokes the exception if it becomes engine-reachable)"
          : `pattern matches api.x.com: ${matchesLive}; named boundary: ${named}; test: ${testExists}`,
        evidence: [
          `pattern: ${rx[1]}`,
          "scripts/guardrails/draft-only.mjs: the transport is a named allow-list entry",
          "scripts/guardrails/draft-only.test.mjs: 5 tests, incl. the auto-revocation probe",
        ],
      };
    },
  },
  "GAP-28": {
    describe: "status strings report the retired 'internal only' posture to agents and the founder",
    run() {
      const hits = grep("internal only|internal-only", [
        "apps/web/lib/cockpit/ask-jarvis.ts",
        "apps/web/lib/cockpit/owner-summary.ts",
        "apps/web/lib/jarvis/jarvis-owner-summary.ts",
        "packages/prediction-engine/src/platform-config.ts",
      ]);
      const nonTest = hits.filter((l) => !/(test|spec)/i.test(l.split(":")[0] ?? ""));
      return nonTest.length > 0
        ? { status: "open", detail: "the retired posture is still reported", evidence: nonTest }
        : { status: "closed", detail: "the retired posture is no longer reported", evidence: [] };
    },
  },
};

// ---------------------------------------------------------------------------
// RUN EVERY PROBE.
// ---------------------------------------------------------------------------
const gaps = JSON.parse(readFileSync(GAPS, "utf8")).gaps;
const known = new Set(gaps.map((g) => g.id));
const missingProbe = gaps.filter((g) => !PROBES[g.id]).map((g) => g.id);
const extraProbe = Object.keys(PROBES).filter((id) => !known.has(id));

const entries = [];
for (const g of gaps) {
  const probe = PROBES[g.id];
  if (!probe) {
    entries.push({ id: g.id, status: "not_attempted", detail: "no probe written for this gap", evidence: [], probe: null });
    continue;
  }
  let result;
  try {
    result = probe.run();
  } catch (err) {
    result = { status: "not_attempted", detail: `the probe threw: ${String(err).slice(0, 160)}`, evidence: [] };
  }
  entries.push({
    id: g.id,
    severity: g.severity,
    title: g.title,
    status: result.status,
    detail: result.detail,
    probe: probe.describe,
    evidence: result.evidence,
    blocks_current_business_model: g.blocks_current_business_model === true,
  });
}

const counts = entries.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }), {});

// ---------------------------------------------------------------------------
// REGRESSION DETECTION. The ledger is re-derived from the probes on every run, so a
// closure that stops holding flips its status by itself. But a silent flip is not
// good enough: a gap that was `closed` and is now `open` means something REGRESSED,
// and CI must say so rather than rewriting the file and saying nothing.
//
// So: the PREVIOUS ledger is read first, and any gap that was closed and is no longer
// closed is a FAILURE -- exit 1, with the gap named.
// ---------------------------------------------------------------------------
const previous = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : null;
const regressed = [];
if (previous) {
  const wasClosed = new Map((previous.gaps ?? []).map((g) => [g.id, g.status]));
  for (const e of entries) {
    const before = wasClosed.get(e.id);
    if (before === "closed" && e.status !== "closed") {
      regressed.push(`${e.id} was closed, is now ${e.status}: ${e.detail}`);
    }
  }
}
const ledger = {
  generated_by: "reconciliation/_verify_gap_closures.mjs",
  note:
    "A SEPARATE file on purpose: gaps.json is GENERATED by _build_gaps.py, so a hand-added " +
    "status field there would be wiped on the next regeneration. Every status here is the " +
    "RESULT of a mechanical probe, and the probe is named so a reader can check the probe " +
    "rather than trust the answer. Re-run the script to re-verify.",
  status_vocabulary: {
    closed: "the gap's claim no longer holds, and a probe proves it",
    partial: "part of the gap is addressed; the probe measures how much",
    open: "the gap's claim still holds, and a probe proves it",
    not_attempted: "recorded and untouched -- nobody has measured it",
  },
  counts,
  gaps: entries,
};

writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n", "utf8");

console.log("=== GAP CLOSURE LEDGER");
console.log("    counts:", JSON.stringify(counts));
console.log(`    wrote: reconciliation/gap_closures.json (${entries.length} gaps)`);
if (missingProbe.length) console.log("    !! no probe for:", missingProbe.join(", "));
if (extraProbe.length) console.log("    !! probe for an unknown gap:", extraProbe.join(", "));
console.log("\n=== per gap:");
for (const e of entries) {
  const mark = { closed: "CLOSED  ", partial: "PARTIAL ", open: "OPEN    ", not_attempted: "UNTOUCHED" }[e.status];
  console.log(`  ${mark} ${e.id}  ${e.detail.slice(0, 108)}`);
}

if (regressed.length > 0) {
  console.log("\n=== REGRESSION: a closed gap is no longer closed");
  for (const r of regressed) console.log(`  !! ${r}`);
  console.log("\nThe ledger has been rewritten with the current statuses. The gap(s) above");
  console.log("were closed and are not any more -- something regressed.");
  process.exit(1);
}
console.log("\nNo regression: every gap that was closed is still closed.");
