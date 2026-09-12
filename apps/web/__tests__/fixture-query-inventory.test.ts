import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * THE FIFTH TIME IS WHEN YOU BUILD THE GUARD.
 *
 * In one night this repository produced the same defect five times, on five
 * different lanes: a `take: N` applied to `games` or `gate_decisions` BEFORE the
 * per-fixture collapse, on a table that holds about 2.5 rows per real contest
 * with nothing tombstoned. C-153 (pass lane), C-161 (withdrawal watermark),
 * C-169 (signal slate), C-170 (score persistence), C-171 (both board fallback
 * lanes, visible to a subscriber as one contest listed twice).
 *
 * Each was found by review, one at a time, after it shipped. This test is the
 * cheap thing that makes the sixth one visible before it does: it takes an
 * inventory of every `db.game.findMany` and `db.gateDecision.findMany` in the
 * codebase and requires each to be REGISTERED with what it is. A new query, or
 * a change to an existing one's cap or canonicity filter, fails here until
 * somebody writes down which kind it is.
 *
 * It deliberately does NOT try to decide correctness automatically. "Is this
 * cap applied before a collapse" is not a question a regex can answer, and a
 * guard that guesses would be argued with instead of read. What it enforces is
 * that no such query is UNDECLARED - the same "no silent cap" discipline the
 * five fixes above each landed in their own file.
 *
 * scripts/guardrails/** is frozen for agents (AGENTS.md law 2), so this lives
 * in the test suite, which CI runs.
 */

type Kind =
  /** Bounds rows SCANNED; a per-fixture collapse runs before anything is shown or used. */
  | "scan-then-collapse"
  /** Returns at most one row by construction (take: 1, or a unique lookup). */
  | "single-row"
  /** No cap at all, so nothing can be truncated before a collapse. */
  | "unbounded"
  /** Capped, no collapse, and that is a DELIBERATE, recorded decision. `why` says which row it is. */
  | "capped-by-design";

type Site = {
  readonly kind: Kind;
  /** Why this shape is right for this lane. One line, and it has to say something. */
  readonly why: string;
};

/**
 * One entry per query, in the order the queries appear in the file.
 *
 * A "capped-by-design" entry is not an excuse - it is a claim that somebody
 * looked. Anything here that has NOT been looked at says so in its own `why`.
 */
const REGISTRY: Readonly<Record<string, readonly Site[]>> = {
  "apps/web/lib/board/market-coverage.ts": [
    { kind: "unbounded", why: "Coverage counts every canonical fixture; no cap to truncate." },
  ],
  "apps/web/lib/board/passes.ts": [
    {
      kind: "capped-by-design",
      why: "Gated decision lane, take 500. Collapsed by gameId only, so two rows for ONE contest still list twice - the same exposure C-171 fixed one lane over. NOT YET FIXED: recorded rather than quietly left.",
    },
    { kind: "scan-then-collapse", why: "C-171 fallback lane: scan 300, collapse per fixture, list 100." },
  ],
  "apps/web/lib/board/state.ts": [
    {
      kind: "capped-by-design",
      why: "Decision lane, take 500. Bounds decisions SCANNED (GateDecision has no unique constraint); collapsed by gameId + market, so duplicate FIXTURES survive it - same open item as the pass lane above.",
    },
    { kind: "scan-then-collapse", why: "C-171 scoring lane: scan 40, collapse per fixture, show 8." },
    { kind: "scan-then-collapse", why: "C-171 gated lane: scan 60, collapse per fixture, show 12." },
  ],
  "apps/web/lib/bot-outbox/load.ts": [
    { kind: "capped-by-design", why: "Operator console listing, caller-supplied limitPerKind; a duplicate row is a row an operator wants to SEE, not one to hide." },
  ],
  "apps/web/lib/ops/shadow-evaluation-pass.ts": [
    { kind: "unbounded", why: "Evaluates every game row, duplicates included, and writes a decision per ROW. No cap to truncate. Whether it SHOULD evaluate duplicates is C-166, not a cap question." },
  ],
  "apps/web/lib/slate-twin/get-slate-twin.ts": [
    { kind: "single-row", why: "take: 1 - one fixture looked up for the twin panel." },
  ],
  "apps/web/lib/data-sources/free-score-persist.ts": [
    { kind: "capped-by-design", why: "C-170: 2000-row scan with a warning when it fills, and NO canonicity filter on purpose - an alias row still carries picks, so refusing to score it would strand their settlement." },
  ],
  "apps/web/app/sitemap.ts": [
    { kind: "capped-by-design", why: "Sitemap preview cap. Duplicate rows cost extra URLs for one contest; a sitemap defect, not a claim about a pick. C-166 lists it." },
  ],
  "apps/web/app/api/admin/dashboard/route.ts": [
    { kind: "capped-by-design", why: "Admin-only listing, take 30. Operator surface, not a public claim. C-166 lists it." },
  ],
  "packages/ingestion-pipeline/src/freeze-slate-commitments.ts": [
    { kind: "unbounded", why: "Commits the whole slate; no cap to truncate." },
  ],
  "packages/ingestion-pipeline/src/game-identity.ts": [
    { kind: "unbounded", why: "Twin-candidate lookup, narrow by team and time; this file IS the collapse." },
  ],
  "packages/ingestion-pipeline/src/generate-signal-slate.ts": [
    { kind: "scan-then-collapse", why: "C-169: scan 1000, collapse per fixture, slate 80, warn when the scan fills." },
  ],
  "packages/ingestion-pipeline/src/process-sport.ts": [
    { kind: "unbounded", why: "Ingestion upsert path; no cap to truncate." },
  ],
  "packages/ingestion-pipeline/src/settle-sport.ts": [
    { kind: "unbounded", why: "Settlement reads the games it must settle; no cap to truncate." },
  ],
  "packages/ingestion-pipeline/src/team-game-log-repair.ts": [
    { kind: "unbounded", why: "Repair pass over its own selection; no cap to truncate." },
  ],
};

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCAN_ROOTS = ["apps/web/lib", "apps/web/app", "packages", "workers"];
const CALL = /db\.(?:game|gateDecision)\.findMany\(/g;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "dist" || entry === ".next") continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") && !entry.includes(".test.")) out.push(full);
  }
}

/** How many such queries each file holds, keyed by repo-relative path. */
function inventory(): Record<string, number> {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(resolve(REPO_ROOT, root), files);
  const found: Record<string, number> = {};
  for (const file of files) {
    const matches = readFileSync(file, "utf8").match(CALL);
    if (!matches) continue;
    // Normalize separators: slice() keeps Windows backslashes, and the registry
    // below is keyed with forward slashes, so a Windows run would otherwise
    // compare two identical inventories and call them different.
    found[file.slice(REPO_ROOT.length + 1).replace(/\\/g, "/")] = matches.length;
  }
  return found;
}

describe("every games/gate_decisions query is declared", () => {
  it("matches the registry exactly, so a new one cannot arrive unnoticed", () => {
    const found = inventory();
    // The scan itself has to have worked. A wrong REPO_ROOT returns {} and, if
    // the registry were ever emptied to match, the whole guard would pass
    // vacuously - which is exactly what this file exists to prevent elsewhere.
    // (It happened on the first run of this test: __dirname is two levels below
    // the repo root, not one.)
    expect(Object.keys(found).length).toBeGreaterThan(10);
    const declared = Object.fromEntries(
      Object.entries(REGISTRY).map(([file, sites]) => [file, sites.length]),
    );
    // Compared as whole objects rather than per key: an entry REMOVED from the
    // code but left in the registry is also a drift worth failing on, and a
    // one-directional check would miss it.
    expect(found).toEqual(declared);
  });

  it("gives every declared query a reason that says something", () => {
    for (const [file, sites] of Object.entries(REGISTRY)) {
      for (const [i, site] of sites.entries()) {
        expect(site.why.length, `${file}[${i}]`).toBeGreaterThan(30);
      }
    }
  });

  it("keeps the two known gaps visible instead of letting them go quiet", () => {
    // The board's two DECISION lanes are capped and collapse by gameId, which
    // two rows for one contest do not share. C-171 fixed the fallback lanes and
    // left these; naming them here means the next reader finds them without
    // re-deriving the whole thing.
    const openGaps = Object.entries(REGISTRY)
      .flatMap(([file, sites]) => sites.map((s) => ({ file, ...s })))
      .filter((s) => s.why.includes("NOT YET FIXED") || s.why.includes("same open item"));
    expect(openGaps.map((g) => g.file).sort()).toEqual([
      "apps/web/lib/board/passes.ts",
      "apps/web/lib/board/state.ts",
    ]);
  });
});
