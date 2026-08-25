import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BANNED_PUBLIC_CLAIMS = [
  "guaranteed wins",
  "we always win",
  "100% accurate",
];

const PUBLIC_FILES = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/performance/page.tsx",
];

describe("public copy scanner", () => {
  for (const file of PUBLIC_FILES) {
    it(`no banned claims in ${file}`, () => {
      const content = readFileSync(join(process.cwd(), file), "utf8").toLowerCase();
      for (const banned of BANNED_PUBLIC_CLAIMS) {
        expect(content).not.toContain(banned);
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Internal identifiers must never reach customer-facing copy
// ─────────────────────────────────────────────────────────────
//
// The defect this closes: /picks — the primary nav destination — shipped this
// to every free visitor at launch:
//
//   "Public picks are still gated. LIVE_BOARD stays off until founder enable."
//
// `LIVE_BOARD` is an environment-variable name and "founder enable" is internal
// role language. The sibling copy one branch up ("Quiet board - waiting on
// fresh odds (not broken)") is written for humans; that is the register the
// whole surface has to hold.
//
// The rule below is deliberately GENERAL rather than a ban on those two
// literals: it recognises the SHAPE of an internal identifier - a
// SCREAMING_SNAKE flag name, internal gate/role phrasing, an internal ticket id
// - inside anything that reads as a customer-facing sentence. A flag invented
// tomorrow is caught without anyone editing this file.

/** Strip comments: engineers describing a flag internally is not customer copy. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * Pull out the strings a reader could plausibly SEE: quoted literals and JSX
 * text nodes. Template-literal `${...}` holes are blanked - the interpolated
 * expression is code, and the surrounding sentence is the copy.
 */
function extractCandidateCopy(source: string): string[] {
  const src = stripComments(source);
  const found: string[] = [];
  let m: RegExpExecArray | null;

  const literals = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  while ((m = literals.exec(src)) !== null) {
    found.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  const jsxText = />([^<>{}]{8,})</g;
  while ((m = jsxText.exec(src)) !== null) {
    found.push(m[1]!);
  }

  return found.map((t) => t.replace(/\$\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim());
}

/**
 * Does this string read like a sentence shown to a person, as opposed to a
 * className, a route, an enum key or a fragment of code? Four or more plain
 * English words is the bar - enough that Tailwind class strings, ids and
 * identifier lists fall out, low enough that a one-line label still counts.
 */
function readsAsCustomerCopy(text: string): boolean {
  if (/[{}<>]|=>|===|&&|\|\|/.test(text)) return false; // code fragment, not copy
  const words = text.split(/\s+/).filter((w) => /^[A-Za-z][A-Za-z'’]*[.,;:!?)]?$/.test(w));
  return words.length >= 4;
}

const INTERNAL_IDENTIFIER_RULES = [
  {
    name: "environment variable or feature-flag name",
    // LIVE_BOARD, PUBLIC_PICKS, DATABASE_URL, PERFORMANCE_STATS_ENABLED...
    pattern: /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/,
  },
  {
    name: "internal gate or role language",
    // "founder enable", "founder-gated", "founder gate", "founder flips"...
    pattern: /\bfounder[\s-]*(?:gated?|enables?|enabled|flips?|only|held|toggles?)\b/i,
  },
  {
    name: "internal ticket or rule id",
    pattern: /\b(?:BS|OP|GSE|GSN)-\d{2,4}\b|\bT-[a-z]+-[a-z]+\b/,
  },
] as const;

/**
 * The customer-facing surfaces held to this rule. Extend this list as more
 * surfaces are cleaned - the same convention the em-dash brand-voice guard
 * (`scripts/guardrails/em-dash-scan.mjs`) uses. Adding a file here is the last
 * step of cleaning it, not a claim that everything else is already clean.
 */
const CUSTOMER_SURFACES = [
  "app/page.tsx",
  "app/picks/page.tsx",
  "app/board/page.tsx",
  "app/pricing/page.tsx",
  "app/dashboard/page.tsx",
  "app/performance/page.tsx",
  "app/preview/[sport]/[slug]/page.tsx",
  "app/room/[gameId]/page.tsx",
  "components/picks/pick-card.tsx",
  "components/picks/line-freshness-badge.tsx",
  "components/pricing/subscribe-button.tsx",
  "components/ui/local-time.tsx",
];

function findInternalIdentifiers(source: string): string[] {
  const hits: string[] = [];
  for (const text of extractCandidateCopy(source)) {
    if (!readsAsCustomerCopy(text)) continue;
    for (const rule of INTERNAL_IDENTIFIER_RULES) {
      const match = new RegExp(rule.pattern).exec(text);
      if (match) {
        hits.push(`${rule.name}: "${match[0]}" in ${JSON.stringify(text.slice(0, 140))}`);
      }
    }
  }
  return hits;
}

describe("internal identifiers never reach customer-facing copy", () => {
  for (const file of CUSTOMER_SURFACES) {
    it(`${file} speaks in customer language`, () => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(findInternalIdentifiers(source)).toEqual([]);
    });
  }

  // A guard nobody can prove still bites is not a guard. These pin the rule
  // against the exact copy that shipped, plus shapes it has never seen.
  it("catches the copy that shipped to /picks", () => {
    const shipped = `const h = "Public picks are still gated. LIVE_BOARD stays off until founder enable.";`;
    const hits = findInternalIdentifiers(shipped);
    expect(hits.some((h) => h.includes("LIVE_BOARD"))).toBe(true);
    expect(hits.some((h) => h.includes("founder enable"))).toBe(true);
  });

  it("catches the copy that shipped to /board", () => {
    const shipped = `const empty = "No public fires - LIVE_BOARD / gate held by law.";`;
    expect(findInternalIdentifiers(shipped)).toHaveLength(1);
  });

  it("catches flag names it has never been told about", () => {
    const invented = `const s = "The slate stays dark until SOME_FUTURE_FLAG is switched on for everyone.";`;
    expect(findInternalIdentifiers(invented)).toHaveLength(1);
  });

  it("catches internal ticket ids in prose", () => {
    const ticketed = `const s = "This empty state follows the T-picks-outage doctrine for the board.";`;
    expect(findInternalIdentifiers(ticketed)).toHaveLength(1);
  });

  it("does not fire on code, class names, or engineer comments", () => {
    const benign = [
      `const on = process.env["LIVE_BOARD"] === "true";`,
      `const c = "rounded-xl border border-orbital-cyan/25 bg-orbital-cyan/10 p-8 text-center";`,
      `// LIVE_BOARD stays off until the founder enables it - internal note`,
      `/* The founder gate is closed by default; see docs. */`,
      `const a = "Founding members keep their rate for life.";`,
      `const b = "Quiet board - waiting on fresh odds (not broken).";`,
      `const d = "Board not open yet - we're building the settled record first (not broken).";`,
    ].join("\n");
    expect(findInternalIdentifiers(benign)).toEqual([]);
  });
});
