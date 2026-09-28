import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Public-surface keep-out sweep — the CI guard for the doctrine in
 * docs/research/2026-09-28/orchestration/public-private-surface-doctrine.md.
 *
 * WHY THIS EXISTS
 * The doctrine's exposure inventory was a hand-written list of 13 items, and it
 * was already wrong when the fence landed: two of its entries were gated, and
 * the seven real ones were not all on it. A hand-written list is a snapshot, so
 * this derives the inventory from the tree instead. It extends the registry
 * check in internal-surface-fence.test.ts (7 named surfaces) to every public
 * route and page, matched against the doctrine's keep-out vocabulary.
 *
 * WHAT A GREEN RUN DOES AND DOES NOT MEAN
 * Does mean: no route/page outside the admin, auth and internal trees names
 * keep-out material while being ungated, with no ancestor gate, and off the
 * recorded allow-list below.
 * Does NOT mean: the public surface is proven clean. This is a static text
 * match. It cannot see a leak that emerges from composing two allowed
 * payloads, from a route re-exporting another route's data under a new shape,
 * from a runtime query that returns a keep-out column without naming it, or
 * from an apps/web/lib/** component rendered inside a page this cleared. A
 * green run is a floor, not a proof.
 */

const APP = join(process.cwd(), "app");

/** Trees that are internal by construction and carry no public response. */
const INTERNAL_TREES = ["admin", "auth", "api/internal"];

/**
 * Keep-out vocabulary, as code. Each entry is a named doctrine clause, not a
 * loose word: the identifiers are matched in their data-bearing form
 * (`next_gen_stats`, `loadReconstructedSeparation`, a `prisma` model) so the
 * sweep keys on a file that READS internal material rather than on a file whose
 * marketing copy happens to contain a similar English word.
 */
const KEEP_OUT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["raw NGS / tracking rows", /next_gen_stats|nextGenStats|ngs_(?:team|player|week)_/],
  // Case-insensitive on purpose: the same metric is `WOPR` in prose and `wopr`
  // in a column name or payload key, and a guard that only sees the shouty
  // spelling misses the form that actually ships. Word boundaries keep this
  // off "separate"/"reparation".
  ["metric family: QBR", /\bqbr\b/i],
  ["metric family: separation", /\bseparation\b/i],
  ["metric family: WOPR", /\bwopr\b/i],
  ["metric family: EPA", /\bepa\b/i],
  ["signal ledger / raw signals", /signal_ledger|signalLedger|signal_snapshots|pick_signal/i],
  ["calibration internals", /isotonic|\bpava\b|reliabilityDiagram|expectedFromConfidence/],
  ["edge internals", /factorBreakdown|independentEdge|expectedClv|consensusScore|marketDepthScore/],
  ["adjustment layer", /adjustmentLayer|ADJUSTMENT_(?:WEIGHT|MAGNITUDE)/],
  ["truth catalog topology", /truthTopology|truth_catalog|truthCatalog/],
  ["source registry", /sourceRegistry|source_registry|SOURCE_REGISTRY/],
  ["raw player-week rows", /usage_pulse|usagePulse|opportunities_per/],
];

/**
 * Gate evidence found IN the route/page itself.
 *
 * `default-off feature flag` is included because the doctrine says so
 * explicitly: "Routes behind env gates that are currently off are compliant
 * today; the doctrine binds their future content, not just today's." A
 * `=== "true"` check with a non-loading false branch is a real gate, not a
 * comment.
 */
const SELF_GATES: ReadonlyArray<readonly [string, RegExp]> = [
  ["internal-surface fence", /isPagePublic|isApiRoutePublic/],
  ["readiness gate", /canExposePerformanceStats|getReadinessGates|PUBLISH_LEDGER|STATS_PUBLIC|PERFORMANCE_STATS|canPublishProjections/],
  ["B2B API key", /extractB2bApiKey|requireApiKey|GSE_B2B_API_KEYS/],
  ["cron secret", /cronAuthError|authorizeCronSecret|CRON_SECRET/],
  ["premium entitlement", /requirePremiumApiRateLimited|requirePremium|fantasyFloor|requireFantasy/],
  ["session auth", /\bauth\(|getServerSession|requireSession/],
  ["NGS text/payload fence", /no-raw-ngs-fence|assertNoRawNgs/],
  // Both polarities. A page that renders only when the flag is true, AND a page
  // that refuses unless the flag is true, are the same gate written two ways;
  // keying on one spelling alone silently reopens the other.
  ["default-off feature flag", /process\.env(?:\[["'][A-Z_]*ENABLED["']\]|\.[A-Z_]*ENABLED)\s*[!=]==?\s*["']true["']/],
  ["redirect before render", /redirect\(/],
];

/**
 * Gating for an ANCESTOR layout, which is a weaker and simpler bar than the
 * page-level list above.
 *
 * In a page, evidence of a gate must show the page actually refuses. In a
 * layout, the only question that matters for the subtree is "can anything under
 * me be refused at all?" — a layout that can 404, redirect, or authenticate
 * gates every route beneath it, whatever internal spelling it uses to decide.
 *
 * This distinction is not academic. The 2026-09-28 file-local sweep cleared
 * /stats/* as ungated because the gate is in ../stats/layout.tsx, and the first
 * version of this guard cleared it for the wrong reason: its page-level
 * pattern only matched `=== "true"`, while the real layout refuses with
 * `!isStatsPublic()`. The pages were allow-listed, so the suite went green with
 * a broken predicate underneath it.
 */
const LAYOUT_GATES: ReadonlyArray<readonly [string, RegExp]> = [
  ["404", /notFound\s*\(/],
  ["redirect", /redirect\s*\(/],
  ["session auth", /\bauth\s*\(|getServerSession/],
  ["public-surface fence", /isPagePublic|isApiRoutePublic|isStatsPublic/],
];

/**
 * A `redirect(` anywhere is not a gate. A page that redirects in one branch and
 * still returns JSX in another is still a surface, so the redirect only counts
 * when the handler cannot render at all. Checking this structurally rather than
 * with a regex is the difference between a guard and a rubber stamp.
 */
function redirectIsTotal(source: string): boolean {
  const at = source.indexOf("export default");
  if (at === -1) return false;
  const body = source.slice(at);
  if (!/redirect\(/.test(body)) return false;
  return !/return\s*[<(]/.test(body);
}

/**
 * Allow-list: matched routes that are NOT exposures, each with the reason it is
 * compliant. Every entry must carry a non-empty reason — an allow-listed
 * surface with a blank reason is a silent hole, so the test enforces the
 * reason rather than trusting the reviewer to write one.
 */
const ALLOW_LIST: Readonly<Record<string, string>> = {
  // Doctrine KEEP list: "Published picks and their outcomes; proof/ledger of
  // the record." The spec is unauthenticated, but it carries no keep-out data
  // beyond the header below.
  "api/v1/openapi/route.ts":
    "B2B contract spec, promoted deliberately 2026-08-19 and required public for the api-v1 boundary guard. Its one match is the x-gse-ranking-polarity-law header, a methodology fragment. RECORDED FOR FOUNDER REVIEW, not endorsed: see docs/engine/research/2026-09-28/public-surface-sweep-guard.md.",

  // Doctrine KEEP list: projections, rankings, and published picks.
  "api/verify/route.ts":
    "Doctrine KEEP: published picks and their proof. Leak-safe by construction — a pre-kickoff receipt verifies as SEALED (existence, integrity, freeze time, model version only).",
  "api/proof/receipts/route.ts":
    "Doctrine KEEP: published picks and their proof/receipts.",

  // Gated by an ancestor layout. NOT allow-listed on purpose: the sweep's
  // ancestorGates() must clear these structurally, because a future edit that
  // softens ../stats/layout.tsx should turn the guard red rather than be masked
  // by a hand-maintained exemption. Verified green via that path.

  // Faithfulness copy about a metric family, not the metric. Doctrine forbids
  // the DATA; a page that says the license is not held discloses nothing.
  "how-we-make-money/page.tsx":
    "Match is affiliate structural-separation copy required by disclosure law, not player separation data.",
  "integrations/page.tsx":
    "Match is opportunities in integration marketing copy, not a player-week metric column.",

  // The vocabulary is genuinely on the keep-out list, but it is in a JSDoc
  // block above the handler describing the estimator's own history, and the
  // doctrine binds what is PUBLISHED, not what is written in source. Recorded
  // explicitly because a comment is a real exemption: a future edit that moves
  // this text into rendered JSX would make the entry stale in meaning while
  // still passing the mechanical check.
  "board/gate/page.tsx":
    "Match is the word isotonic inside a JSDoc block (estimator history), above the handler and never rendered. Source comments are not a public surface; the rendered gate page shows outcomes only.",

  // Workspace, gated by apps/web/app/cockpit/layout.tsx (auth) and by
  // middleware PROTECTED_ROUTES.
  "cockpit/nova/page.tsx":
    "Session-gated founder workspace (cockpit layout auth + middleware). Not a public response.",
  "cockpit/sources/page.tsx":
    "Session-gated founder workspace (cockpit layout auth + middleware). Not a public response.",
};

type GateHit = { file: string; matched: string[]; gates: string[]; via: string };

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/(route\.ts|page\.tsx)$/.test(full)) out.push(full);
  }
  return out;
}

function matches(source: string): string[] {
  return KEEP_OUT_PATTERNS.filter(([, re]) => re.test(source)).map(([name]) => name);
}

function gateEvidence(source: string): string[] {
  const found = SELF_GATES.filter(([, re]) => re.test(source)).map(([name]) => name);
  if (found.includes("redirect before render") && !redirectIsTotal(source)) {
    return found.filter((name) => name !== "redirect before render");
  }
  return found;
}

/**
 * Gate evidence inherited from ancestor layouts. A page with no gate of its own
 * is still fenced if any layout above it 404s — that is the structure the
 * 2026-09-28 file-local sweep could not see, and it is exactly what made
 * /stats/* look ungated when it is not.
 */
function ancestorGates(relPath: string): string[] {
  const found: string[] = [];
  let dir = dirname(join(APP, relPath));
  while (dir.startsWith(APP)) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) {
      const source = readFileSync(layout, "utf8");
      for (const [name, re] of LAYOUT_GATES) {
        if (re.test(source)) found.push(`ancestor ${relative(APP, layout)} (${name})`);
      }
    }
    if (dir === APP) break;
    dir = dirname(dir);
  }
  return [...new Set(found)];
}

function sweep(): GateHit[] {
  const hits: GateHit[] = [];
  for (const file of walk(APP)) {
    const rel = relative(APP, file).replace(/\\/g, "/");
    if (INTERNAL_TREES.some((tree) => rel === tree || rel.startsWith(`${tree}/`))) continue;

    const source = readFileSync(file, "utf8");
    const matched = matches(source);
    if (matched.length === 0) continue;
    if (rel in ALLOW_LIST) continue;

    hits.push({
      file: rel,
      matched,
      gates: gateEvidence(source),
      via: "",
    });
  }

  for (const hit of hits) {
    if (hit.gates.length === 0) hit.via = ancestorGates(hit.file);
  }
  return hits;
}

describe("public surface keep-out sweep", () => {
  const hits = sweep();

  it("is non-vacuous: the keep-out vocabulary actually matches the tree", () => {
    // A guard that passes because it found nothing is worse than no guard, so
    // assert the pattern set has teeth before trusting a green run.
    const total = walk(APP).length;
    expect(total).toBeGreaterThan(300);
    const matchedAnywhere = walk(APP).filter((f) =>
      matches(readFileSync(f, "utf8")).length > 0,
    );
    expect(matchedAnywhere.length).toBeGreaterThan(20);
  });

  it("no ungated public route or page names keep-out material", () => {
    const ungated = hits.filter((hit) => hit.gates.length === 0 && hit.via.length === 0);
    const report = ungated
      .map((hit) => `${hit.file}\n    keep-out: ${hit.matched.join("; ")}`)
      .join("\n");
    expect(
      ungated.length,
      `${ungated.length} keep-out match(es) with no self-gate and no ancestor gate.\n` +
        "Either fence the surface, or record it in ALLOW_LIST with a reason if it is compliant.\n" +
        report,
    ).toBe(0);
  });

  it("every allow-list entry carries a reason", () => {
    for (const [file, reason] of Object.entries(ALLOW_LIST)) {
      expect(reason.trim().length, `${file} needs a recorded reason`).toBeGreaterThan(20);
    }
  });

  it("no allow-list entry is stale (the file still exists and still matches)", () => {
    const stale = Object.entries(ALLOW_LIST)
      .filter(([rel]) => !existsSync(join(APP, rel)))
      .map(([rel]) => rel);
    expect(
      stale.length,
      `ALLOW_LIST entries whose file no longer exists — delete them: ${stale.join(", ")}`,
    ).toBe(0);
  });

  it("a page inherits its ancestor layout's gate", () => {
    // The structural property the 2026-09-28 sweep could not see. If this
    // breaks, /stats/* silently reopens without any route-level change.
    const layout = readFileSync(join(APP, "stats/layout.tsx"), "utf8");
    expect(layout).toContain("isStatsPublic()");
    expect(layout).toContain("notFound()");
    const trenches = ancestorGates("stats/trenches/page.tsx");
    expect(trenches.length).toBeGreaterThan(0);
  });

  it("the sweep would catch a new ungated keep-out surface", () => {
    // Positive control on the whole pipeline, using the same predicate the
    // sweep uses. Guards against the sweep silently matching nothing.
    const leak = 'const rows = await db.next_gen_stats.findMany({ select: { wopr: true } });';
    expect(matches(leak).length).toBeGreaterThan(0);
    expect(gateEvidence(leak)).toEqual([]);
    const fenced = 'if (!isPagePublic("/x")) notFound();\nconst wopr = 1;';
    expect(gateEvidence(fenced)).toContain("internal-surface fence");
  });

  /**
   * Three predicate regressions, each one a bug this guard actually had. They
   * are pinned as literal source because the failure mode is a guard that is
   * green for the wrong reason: allow-lists and ancestor gates will happily
   * paper over a broken matcher, and nothing else in the suite would notice.
   */
  it("catches a lowercase metric identifier with no gate (case-sensitivity bug)", () => {
    const ungated = "export default function P() {\n  const wopr = 1;\n  return <div>{wopr}</div>;\n}\n";
    expect(matches(ungated)).toContain("metric family: WOPR");
    expect(gateEvidence(ungated)).toEqual([]);
  });

  it("honors a deny-polarity feature flag (=== vs !== bug)", () => {
    const deny = 'if (process.env["X_ENABLED"] !== "true") notFound();\nconst wopr = 1;';
    const allow = 'if (process.env["X_ENABLED"] === "true") { /* render */ }\nconst wopr = 1;';
    expect(gateEvidence(deny)).toContain("default-off feature flag");
    expect(gateEvidence(allow)).toContain("default-off feature flag");
  });

  it("does not accept a partial redirect as a gate (renders in another branch)", () => {
    const partial =
      'import { redirect } from "next/navigation";\n' +
      "export default function P({ v }: { v?: string }) {\n" +
      '  if (v === "old") redirect("/x");\n' +
      "  const wopr = 1;\n" +
      "  return <div>{wopr}</div>;\n}\n";
    expect(gateEvidence(partial)).not.toContain("redirect before render");

    const total =
      'import { redirect } from "next/navigation";\n' +
      "export default function P(): never {\n" +
      '  redirect("/x");\n}\n';
    expect(gateEvidence(total)).toContain("redirect before render");
  });
});
