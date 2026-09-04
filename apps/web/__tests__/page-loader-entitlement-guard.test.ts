import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

/**
 * REPO-WIDE PAYWALL INVARIANT (CLAUDE.md rule 3: "No frontend-only paywalls —
 * enforcement is server-side only").
 *
 * The signature this guard exists to catch, extracted from four real leaks
 * (/nflverse, /fantasy/dfs, /players, /api/sleeper/market-signal):
 *
 *     A PAGE server-side imports a loader that a GATED API ROUTE also imports,
 *     but the page itself never imports an entitlement resolver.
 *
 * When a route wraps a loader in a requirePremiumApi / requireFantasyApi gate, the
 * platform has declared that loader's output paid. A page that SSRs the same
 * loader with no gate republishes that paid output to anonymous visitors — the
 * JSON endpoint 401s while the page renders the same data as HTML.
 *
 * WHY A RUNTIME ASSERTION: apps/web/tsconfig.json excludes test files from the
 * typecheck, so a type-level assertion in a web test proves nothing. This guard
 * reads and parses source files at runtime, so it fails in CI
 * (`npm test` → apps/web vitest).
 *
 * HOW IT PARSES: real import-declaration parsing via the TypeScript compiler API
 * (ts.createSourceFile + statement walk) — not a regex over source text. Symbols
 * are matched as (module specifier, exported name) PAIRS, so a same-named symbol
 * from an unrelated module is never conflated.
 *
 * ── WHAT THIS GUARD CANNOT SEE (documented blind spots, not excuses) ─────────
 *
 *  1. DEPTH. The import walk follows page → internal module → loader, i.e. ONE
 *     hop past the page (MAX_HOPS). A loader reached through two or more
 *     wrapper modules is invisible. Depth 1 is deliberate: it catches the real
 *     /players wrapper leak (page → @/lib/players/views → loadNflversePlayerLab)
 *     while keeping the flagged set small enough to audit by hand.
 *  2. IT IS A RELATIVE GUARD. A loader is only known to be "paid" because some
 *     route gates it. A loader that is ungated EVERYWHERE — no gated route
 *     imports it — is invisible here no matter how valuable its data.
 *     /api/sleeper/market-signal was exactly this: an ungated route, so
 *     loadSleeperMarketSignal never entered the paid set.
 *  3. STATIC IMPORTS ONLY. `await import()`, `require()`, and any runtime-computed
 *     module path are not seen.
 *  4. NAMESPACE IMPORTS. `import * as x from "@/lib/…"` is not resolved to
 *     individual symbols, so a loader reached as `x.loadFoo()` is not seen.
 *  5. RE-EXPORTS. `export { loadFoo } from "@/lib/…"` barrels are not followed.
 *  6. IT PROVES WIRING, NOT CORRECTNESS. Importing a resolver is necessary, not
 *     sufficient — this guard cannot tell whether the gate's branch actually
 *     withholds the paid fields. Per-surface tests do that (see
 *     nflverse-page-entitlement.test.ts and dfs-page-entitlement.test.ts).
 */

const WEB_ROOT = resolve(__dirname, "..");
const APP_DIR = resolve(WEB_ROOT, "app");
const API_DIR = resolve(APP_DIR, "api");

/** The guard's maps key on repo-relative FORWARD-slash paths (they are data, compared across OSes). */
function toPosix(p: string): string {
  return p.split("\\").join("/");
}

/** Entitlement gates that mark a route's data as paid. */
const GATE_HELPERS = new Set([
  "requirePremiumApi",
  "requirePremiumApiRateLimited",
  "requireFantasyApi",
  "requireFantasyApiRateLimited",
]);
const GATE_MODULE = "@/lib/api-entitlement";

/** Importing any of these means the page resolves the viewer's entitlements. */
const ENTITLEMENT_RESOLVERS = new Set([
  "getViewerEntitlements",
  "getUserEntitlements",
]);

/** How many hops past the page the import walk follows. See blind spot 1. */
const MAX_HOPS = 1;

/**
 * Pages that reach a paid loader but legitimately need no entitlement gate.
 * Every entry carries a REASON. This list is NOT a way to silence the guard:
 * a stale entry (one whose page no longer trips the check) FAILS the suite, so
 * an exemption cannot outlive the condition that justified it.
 */
const ALLOWLIST: ReadonlyMap<string, string> = new Map([
  [
    "app/page.tsx",
    "Homepage door stat. Reaches loadNflverseUsagePulse via " +
      "@/components/landing/nflverse-lab-door, which renders ONLY pulse.sourceRows " +
      "(a row COUNT) and pulse.status — never playerRows/qbAgeRows. Cardinality is a " +
      "deliberate public trust signal, not the paid per-player table.",
  ],
  [
    "app/integrations/page.tsx",
    "Data-readiness page. Reaches the nflverse loaders via " +
      "@/lib/data-sources/live-evidence, which projects them down to scalar counts " +
      "(summary.usagePlayerStatsRows, cohortObservations, latestUsageWeek). The page " +
      "states the intent inline: 'Row counts are evidence, not permission to score.' " +
      "No per-player row crosses to the client.",
  ],
  [
    "app/fantasy/page.tsx",
    "Fantasy hub. Same @/lib/data-sources/live-evidence aggregate summary as " +
      "/integrations (evidence.summary.* scalars + qbAge34Lift), rendered as " +
      "EvidenceMetric counts. No paid rows are rendered.",
  ],
  [
    "app/cockpit/sources/page.tsx",
    "Internal cockpit. Consumes the same live-evidence scalar summary, AND the whole " +
      "/cockpit subtree is admin-gated by app/cockpit/layout.tsx " +
      "(session.user.role !== 'ADMIN' → redirect), so it is unreachable by a " +
      "subscriber, let alone an anonymous visitor.",
  ],
]);

// ─────────────────────────── parsing helpers ───────────────────────────

interface ImportedSymbol {
  readonly mod: string;
  readonly name: string;
  readonly typeOnly: boolean;
}

function listFiles(dir: string, wanted: string): string[] {
  const acc: string[] = [];
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) acc.push(...listFiles(p, wanted));
    else if (name === wanted) acc.push(p);
  }
  return acc;
}

/** Real import-declaration parse (TS compiler API), not a text regex. */
function parseImports(file: string): ImportedSymbol[] {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: ImportedSymbol[] = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st)) continue;
    if (!ts.isStringLiteral(st.moduleSpecifier)) continue;
    const mod = st.moduleSpecifier.text;
    const clause = st.importClause;
    if (!clause) continue;
    const declTypeOnly = clause.isTypeOnly;
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) {
        out.push({
          mod,
          // propertyName is the EXPORTED name when aliased (`a as b`).
          name: (el.propertyName ?? el.name).text,
          typeOnly: declTypeOnly || el.isTypeOnly,
        });
      }
    }
  }
  return out;
}

/** Resolve a "@/…" alias to a real file (tsconfig paths: "@/*" → apps/web/*). */
function resolveAlias(mod: string): string | null {
  if (!mod.startsWith("@/")) return null;
  const base = join(WEB_ROOT, mod.slice(2));
  for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// ───────────────────── step 1: the paid-loader set ─────────────────────

const ROUTE_FILES = listFiles(API_DIR, "route.ts");
const PAGE_FILES = listFiles(APP_DIR, "page.tsx");

/** "module::symbol" → relative path of a gated route that imports it. */
const PAID_LOADERS = new Map<string, string>();
for (const routeFile of ROUTE_FILES) {
  const imports = parseImports(routeFile);
  const gated = imports.some((i) => i.mod === GATE_MODULE && GATE_HELPERS.has(i.name));
  if (!gated) continue;
  for (const i of imports) {
    // Only internal library values: type-only imports carry no data, and the
    // gate helpers themselves are not loaders.
    if (i.typeOnly || !i.mod.startsWith("@/lib/") || i.mod === GATE_MODULE) continue;
    PAID_LOADERS.set(`${i.mod}::${i.name}`, relative(WEB_ROOT, routeFile));
  }
}

// ────────── step 2: which pages reach a paid loader (≤ MAX_HOPS) ──────────

interface Reach {
  readonly key: string;
  readonly viaChain: readonly string[];
  readonly gatedBy: string;
}

function paidLoadersReachableFrom(entry: string): Reach[] {
  const seen = new Set<string>();
  const found: Reach[] = [];
  const queue: Array<{ file: string; hops: number; chain: readonly string[] }> = [
    { file: entry, hops: 0, chain: [] },
  ];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (seen.has(current.file)) continue;
    seen.add(current.file);
    let imports: ImportedSymbol[];
    try {
      imports = parseImports(current.file);
    } catch {
      continue; // unparseable file: report nothing rather than a false alarm
    }
    for (const i of imports) {
      if (i.typeOnly) continue;
      const key = `${i.mod}::${i.name}`;
      const gatedBy = PAID_LOADERS.get(key);
      if (gatedBy !== undefined) {
        found.push({ key, viaChain: current.chain, gatedBy });
      }
      if (current.hops >= MAX_HOPS) continue;
      const next = resolveAlias(i.mod);
      if (next !== null && !seen.has(next)) {
        queue.push({ file: next, hops: current.hops + 1, chain: [...current.chain, i.mod] });
      }
    }
  }
  return found;
}

interface Flagged {
  readonly page: string;
  readonly reaches: readonly Reach[];
  readonly hasResolver: boolean;
}

const FLAGGED: Flagged[] = [];
for (const pageFile of PAGE_FILES) {
  const reaches = paidLoadersReachableFrom(pageFile);
  if (reaches.length === 0) continue;
  const hasResolver = parseImports(pageFile).some(
    (i) => !i.typeOnly && ENTITLEMENT_RESOLVERS.has(i.name),
  );
  FLAGGED.push({ page: toPosix(relative(WEB_ROOT, pageFile)), reaches, hasResolver });
}

function describeReaches(f: Flagged): string {
  return f.reaches
    .map((r) => {
      const [mod, symbol] = r.key.split("::");
      const via = r.viaChain.length > 0 ? ` (via ${r.viaChain.join(" → ")})` : "";
      return `      • ${symbol} from ${mod}${via}\n        gated in ${r.gatedBy}`;
    })
    .join("\n");
}

// ────────────────────────────── assertions ──────────────────────────────

describe("server-side paywall invariant: pages importing gated-route loaders", () => {
  it("scans a meaningful corpus (guard is wired to real files)", () => {
    expect(ROUTE_FILES.length).toBeGreaterThan(50);
    expect(PAGE_FILES.length).toBeGreaterThan(20);
  });

  it("finds gated API routes and derives a non-empty paid-loader set", () => {
    expect(PAID_LOADERS.size).toBeGreaterThan(5);
  });

  it("every page reaching a paid loader also resolves viewer entitlements", () => {
    const violations = FLAGGED.filter((f) => !f.hasResolver && !ALLOWLIST.has(f.page));
    const report = violations
      .map(
        (f) =>
          `\n  ${f.page}\n    imports paid loader(s) but never imports ` +
          `${[...ENTITLEMENT_RESOLVERS].join(" / ")}:\n${describeReaches(f)}`,
      )
      .join("\n");
    expect(
      violations.length,
      violations.length === 0
        ? ""
        : `\n\nSERVER-SIDE PAYWALL LEAK — ${violations.length} page(s) SSR a loader whose ` +
            `JSON route requires a subscription, with no entitlement gate on the page:\n${report}\n\n` +
            `Fix by resolving getViewerEntitlements() and gating BEFORE calling the loader ` +
            `(see app/trends/page.tsx), or depth-limiting what a free viewer receives ` +
            `(see app/fantasy/waivers/page.tsx). Add an ALLOWLIST entry ONLY when the page ` +
            `renders no paid data, and say why.\n`,
    ).toBe(0);
  });

  it("has no stale allowlist entries (an exemption cannot outlive its reason)", () => {
    const stillNeedsExemption = new Set(
      FLAGGED.filter((f) => !f.hasResolver).map((f) => f.page),
    );
    const stale = [...ALLOWLIST.keys()].filter((page) => !stillNeedsExemption.has(page));
    expect(
      stale.length,
      stale.length === 0
        ? ""
        : `\n\nStale paywall-guard exemption(s): ${stale.join(", ")}\nThese pages no longer ` +
            `trip the check (gated, deleted, or no longer importing a paid loader). Remove ` +
            `them from ALLOWLIST so a future leak on the same page is caught.\n`,
    ).toBe(0);
  });

  it("every allowlist entry states a reason", () => {
    for (const [page, reason] of ALLOWLIST) {
      expect(reason.trim().length, `${page} needs a real REASON`).toBeGreaterThan(40);
    }
  });
});
