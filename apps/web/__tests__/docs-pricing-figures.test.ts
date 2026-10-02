import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative, sep } from "node:path";
import { getEntitlements } from "@sports/types";
import { getPricingPhase } from "@/lib/pricing/pricing-phases";

/**
 * Documentation pricing pin — the money-path figures cannot go stale silently.
 *
 * `apps/web/lib/pricing/pricing-phases.ts` is the single source of truth for
 * what a new subscriber pays, and `packages/types/src/index.ts` is the single
 * source of truth for the free-tier daily pick allowance. Prose that restates
 * either one is a copy of a value it does not own, and copies rot.
 *
 * Two retired monthly figures and one retired free-tier allowance survived in
 * roughly a dozen documents long after the code moved on. That is not cosmetic:
 * `apps/web/lib/stripe.ts` fails CLOSED when a Stripe price does not match the
 * advertised amount (GSE-SEC-024), so an operator who follows a doc carrying a
 * retired figure creates Stripe prices that checkout then refuses — every Pro
 * and Elite purchase 503s, silently, from the first minute of launch.
 *
 * This suite pins three things:
 *
 *   A. No live-guidance markdown file restates a retired figure (tree scan,
 *      with an EXPLICIT, commented exemption list for genuine historical
 *      records — see EXEMPT_FILES / EXEMPT_TREES below).
 *   B. The docs that operators and writers actually work from name the source
 *      of truth by path, so a reader can always check the live number.
 *   C. Every dollar figure a doc places next to a tier name is a real
 *      advertised FOUNDING amount, derived from the phase module — never a
 *      literal this test hardcodes.
 *
 * Adding a doc to an exemption list requires a reason on the same line. "It
 * fails otherwise" is not a reason; "it is a dated record of what was true
 * then" is.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const SOURCE_OF_TRUTH = "apps/web/lib/pricing/pricing-phases.ts";
const FOUNDING = getPricingPhase("FOUNDING");

// ---------------------------------------------------------------------------
// A. Retired figures must not appear in live guidance.
// ---------------------------------------------------------------------------

/**
 * Each pattern targets a figure the code has NOT advertised for a long time.
 * The patterns live here as regexes precisely so the corrective prose in the
 * docs never has to restate the retired literal — a doc that says "do not use
 * <retired figure>" both defeats a grep check and hands a skimming operator the
 * wrong number to copy.
 */
const RETIRED_FIGURES: ReadonlyArray<{
  readonly id: string;
  readonly pattern: RegExp;
  readonly why: string;
}> = [
  {
    id: "retired-pro-monthly",
    // Negative lookahead so genuine larger figures ($199, $19.99 as a named
    // higher rung) are only caught when they are the bare retired amount.
    pattern: /\$19(?!\d)/,
    why: `not an advertised amount in any phase of ${SOURCE_OF_TRUTH}`,
  },
  {
    id: "retired-elite-monthly",
    // Bare "$49" is legitimate — it is the FOUNDING Fantasy ANNUAL price — so
    // this pins the per-month rendering specifically.
    pattern: /\$\s?49\s?\/\s?(?:mo\b|month)/i,
    why: `no tier is advertised at that monthly amount in ${SOURCE_OF_TRUTH}`,
  },
  {
    id: "retired-free-allowance-prose",
    pattern: /\b(?:1|one)\s+(?:free\s+)?(?:pick|signal)s?\s*(?:\/\s*day|per\s+day|a\s+day)\b/i,
    why: "packages/types/src/index.ts sets the free daily allowance above one",
  },
  {
    id: "retired-free-allowance-table",
    pattern: /(?<![\d.])1\s*\/\s*day\b/,
    why: "packages/types/src/index.ts sets the free daily allowance above one",
  },
];

/**
 * Whole trees that are archival by construction. Rewriting these would be
 * falsifying the record, not fixing a doc.
 */
const EXEMPT_TREES: ReadonlyArray<readonly [string, string]> = [
  ["docs/ops/archive/", "the archive tree — museum copies and retired audit prompts, preserved as-shipped"],
  ["handoff/", "dated session handoff reports; each is a point-in-time account of what a run observed"],
  ["reports/", "dated analysis reports; findings are anchored to the date they were produced"],
  ["_logs/", "append-only decision/journal logs; entries record what was decided when"],
  ["node_modules/", "third-party code, not our documentation"],
];

/**
 * Individual files exempted, each with the reason it is not live guidance —
 * or the reason its figure is correct as written.
 */
const EXEMPT_FILES: ReadonlyArray<readonly [string, string]> = [
  [
    "docs/ops/GO_LIVE_RUNBOOK.md",
    "owned by an in-flight branch that rewrites this exact step; exempt only until that lands, then delete this line",
  ],
  [
    "docs/adr/004-member-data-flow-and-dunning-ux.md",
    "dated ADR (Accepted) — its context section records the entitlement state at decision time, which is the point of an ADR",
  ],
  [
    "docs/gse/gate-decision-packet.md",
    "dated owner-decision packet that itself flags the retired figures as stale and names the canonical ones",
  ],
  [
    "docs/strategy/RESEARCH_MAP.md",
    "the reconciliation map — it names the retired figures explicitly in order to mark them retired, and quotes higher ladder rungs correctly",
  ],
  [
    "docs/strategy/COMPETITIVE_LANDSCAPE_2026-07.md",
    "competitor price research, dated; the figures are third-party prices and are correct",
  ],
  [
    "docs/data-source-options.md",
    "vendor plan pricing for third-party data APIs — not our subscription tiers",
  ],
  [
    "docs/operator-playbook.md",
    "database host plan pricing (infrastructure vendor) — not our subscription tiers",
  ],
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
]);

function listMarkdown(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue; // dangling symlink
    }
    if (st.isDirectory()) listMarkdown(full, acc);
    else if (entry.endsWith(".md")) acc.push(relative(repoRoot, full).split(sep).join("/"));
  }
  return acc;
}

function isExempt(relPath: string): boolean {
  if (EXEMPT_TREES.some(([prefix]) => relPath.startsWith(prefix))) return true;
  return EXEMPT_FILES.some(([file]) => file === relPath);
}

const ALL_MARKDOWN = listMarkdown(repoRoot);
const LIVE_GUIDANCE_DOCS = ALL_MARKDOWN.filter((p) => !isExempt(p));

function read(relPath: string): string {
  return readFileSync(resolve(repoRoot, relPath), "utf8");
}

describe("docs — retired money-path figures stay retired", () => {
  it("finds markdown to scan (the walker itself is not silently empty)", () => {
    expect(ALL_MARKDOWN.length).toBeGreaterThan(50);
    expect(LIVE_GUIDANCE_DOCS.length).toBeGreaterThan(20);
  });

  for (const figure of RETIRED_FIGURES) {
    it(`no live-guidance doc carries the ${figure.id} figure`, () => {
      const offenders: string[] = [];
      for (const doc of LIVE_GUIDANCE_DOCS) {
        const lines = read(doc).split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (figure.pattern.test(lines[i]!)) {
            offenders.push(`  ${doc}:${i + 1}  ${lines[i]!.trim().slice(0, 120)}`);
          }
        }
      }
      expect(
        offenders,
        `${offenders.length} occurrence(s) of ${figure.id} — ${figure.why}.\n` +
          `Fix the doc, or add it to EXEMPT_FILES with the reason it is a historical record:\n` +
          offenders.join("\n"),
      ).toEqual([]);
    });
  }

  it("every exemption carries a stated reason", () => {
    for (const [file, why] of [...EXEMPT_FILES, ...EXEMPT_TREES]) {
      expect(why.trim().length, `${file} is exempt with no reason given`).toBeGreaterThan(20);
    }
  });

  it("exempt file paths all exist (a stale exemption hides a real regression)", () => {
    for (const [file] of EXEMPT_FILES) {
      expect(ALL_MARKDOWN, `exempt path no longer exists: ${file}`).toContain(file);
    }
  });
});

/**
 * A doc is allowed to state the free daily allowance as a number, but only the
 * number the entitlement code actually returns. Derived, so advancing the
 * allowance in code fails this until the prose follows.
 */
describe("docs — a stated free daily allowance matches the entitlement code", () => {
  const freeLimit = getEntitlements("FREE").dailyPickLimit;

  it("FREE has a finite daily allowance to compare against", () => {
    expect(typeof freeLimit).toBe("number");
    expect(freeLimit).toBeGreaterThan(0);
  });

  for (const doc of ["docs/subscriptions-and-paywall.md"]) {
    it(`${doc} states the free allowance as the code's value`, () => {
      const stated = [...read(doc).matchAll(/(?<![\d.])(\d+)\s*\/\s*day\b/g)].map((m) =>
        Number(m[1]),
      );
      expect(stated.length, `${doc} no longer states a free daily allowance`).toBeGreaterThan(0);
      for (const value of stated) {
        expect(value, `${doc} states ${value}/day; packages/types returns ${freeLimit}`).toBe(
          freeLimit,
        );
      }
    });
  }
});

// ---------------------------------------------------------------------------
// B. Working docs name the source of truth.
// ---------------------------------------------------------------------------

/**
 * Docs an operator or a writer opens when they need the current price. Each
 * must name the phase module by path so the reader can reach the live number
 * instead of trusting the prose.
 */
const MUST_CITE_SOURCE_OF_TRUTH: readonly string[] = [
  "docs/subscriptions-and-paywall.md",
  "docs/intelligence/monetization-lanes.md",
  "docs/product/monetization-map.md",
  "docs/launch-prep/01-account-setup.md",
  "design-system/README.md",
];

describe("docs — pricing prose points at the source of truth", () => {
  for (const doc of MUST_CITE_SOURCE_OF_TRUTH) {
    it(`${doc} names ${SOURCE_OF_TRUTH}`, () => {
      expect(
        read(doc),
        `${doc} restates prices without naming the module that owns them`,
      ).toContain(SOURCE_OF_TRUTH);
    });
  }
});

// ---------------------------------------------------------------------------
// C. Tier-adjacent dollar figures are real advertised FOUNDING amounts.
// ---------------------------------------------------------------------------

/**
 * The advertised set is DERIVED, never hardcoded: advancing PRICING_PHASE
 * re-prices the site and this expectation in the same commit.
 */
function foundingFigureLiterals(): ReadonlySet<string> {
  const out = new Set<string>(["$0"]);
  for (const price of [FOUNDING.fantasy, FOUNDING.pro, FOUNDING.elite]) {
    for (const amount of [price.monthly, price.annual]) {
      out.add(Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`);
    }
  }
  return out;
}

/** A dollar amount within 40 same-line characters of a tier name. */
const TIER_ADJACENT_FIGURE = /\b(Free|Pro|Elite|Fantasy)\b[^\n$]{0,40}(\$[\d][\d,]*(?:\.\d{2})?)/g;

/** Docs that legitimately carry literal tier amounts (customer copy, operator steps). */
const TIER_FIGURE_DOCS: readonly string[] = [
  "docs/subscriptions-and-paywall.md",
  "docs/intelligence/monetization-lanes.md",
  "docs/product/monetization-map.md",
  "docs/launch-prep/01-account-setup.md",
  "docs/launch-prep/founder-outreach-onepager.md",
  "docs/email-sequences/welcome-flow.md",
  "design-system/README.md",
];

describe("docs — tier-adjacent figures match the advertised FOUNDING ladder", () => {
  const advertised = foundingFigureLiterals();

  it("the advertised set is derived from the phase module, not from literals here", () => {
    expect(advertised.has(`$${FOUNDING.pro.monthly.toFixed(2)}`)).toBe(true);
    expect(advertised.has(`$${FOUNDING.elite.monthly.toFixed(2)}`)).toBe(true);
    expect(advertised.size).toBeGreaterThanOrEqual(6);
  });

  for (const doc of TIER_FIGURE_DOCS) {
    it(`${doc} prices every named tier at an advertised amount`, () => {
      const src = read(doc);
      const lines = src.split("\n");
      const bad: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        for (const match of line.matchAll(TIER_ADJACENT_FIGURE)) {
          const figure = match[2]!;
          if (!advertised.has(figure)) {
            bad.push(`  ${doc}:${i + 1}  "${match[1]}" … ${figure}  |  ${line.trim().slice(0, 110)}`);
          }
        }
      }
      expect(
        bad,
        `Figure(s) placed next to a tier name that no phase advertises ` +
          `(advertised FOUNDING set: ${[...advertised].sort().join(" ")}):\n${bad.join("\n")}`,
      ).toEqual([]);
    });
  }
});
