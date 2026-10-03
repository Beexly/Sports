import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_RULES,
  LAYER_4_PAYMENTS_UNDERWRITING,
  PAYMENTS_SURFACE_RULES,
  getRulesForTemplate,
  scanPaymentsSurfaceCopy,
} from "@/lib/compliance-scanner/rules";

/**
 * B10 / MASTER-HANDOFF #12 — payments-surface underwriting scan.
 *
 * Layer 4 is warn-only and opt-in. These tests run it against fixture
 * strings that mirror live vocabulary AND against the four paid-product
 * page modules' source (honest: no Next build required). Hits never
 * fail the suite: the contract is "flag, do not block."
 */

const webRoot = resolve(__dirname, "..");

const PAYMENTS_PAGES = [
  "app/pricing/page.tsx",
  "app/clv/page.tsx",
  "app/methodology/page.tsx",
  "app/dashboard/page.tsx",
] as const;

function readPage(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

/** Quoted / template-literal copy, the way other source-level scans work. */
function extractDetectableCopy(source: string): string {
  const chunks: string[] = [];
  const quoted = /(["'`])(?:\\.|(?!\1)[\s\S])*?\1/g;
  let match: RegExpExecArray | null;
  while ((match = quoted.exec(source)) !== null) {
    chunks.push(match[0].slice(1, -1));
  }
  const jsxText = />\s*([^<>{]+?)\s*</g;
  while ((match = jsxText.exec(source)) !== null) {
    const text = match[1].replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
    if (text.length > 0) chunks.push(text);
  }
  return chunks.join("\n");
}

const LIVE_VOCAB_FIXTURES: ReadonlyArray<{ id: string; copy: string }> = [
  { id: "L4-WAGERING", copy: "Contest Bay paper skills (no fees, no prizes, no wagering)" },
  { id: "L4-BET-VOCAB", copy: "Line-value tracker: your glass-box bet tracker" },
  { id: "L4-BETTING-AS-PRODUCT", copy: "Betting depth: factor trail & line movement (Pro)" },
  { id: "L4-PARLAY", copy: "Parlay MRI: the portfolio surgeon" },
  { id: "L4-BET-VOCAB", copy: "The CLV Tracker logs your bets, settles them against the closing line" },
  { id: "L4-MONEYLINE-MARKET", copy: "observable market data: spread, total, moneyline, book count" },
  { id: "L4-BET-VOCAB", copy: "the leading indicator of a real edge that sharp bettors trust" },
  { id: "L4-STAKE-BANKROLL", copy: "Staking calculator: Kelly-aware sizing" },
  { id: "L4-GAMBLING-OPERATOR", copy: "We are not a sportsbook and we do not take a handle." },
  { id: "L4-SPORTS-BETTING", copy: "A sports betting subscription sold as picks." },
  { id: "L4-PLACE-BET-CTA", copy: "Place a bet after you read the board." },
];

describe("LAYER_4_PAYMENTS_UNDERWRITING contract", () => {
  it("is the same list as PAYMENTS_SURFACE_RULES", () => {
    expect(PAYMENTS_SURFACE_RULES).toBe(LAYER_4_PAYMENTS_UNDERWRITING);
  });

  it("is warn-only — never block — and always layer 4", () => {
    expect(LAYER_4_PAYMENTS_UNDERWRITING.length).toBeGreaterThan(0);
    for (const rule of LAYER_4_PAYMENTS_UNDERWRITING) {
      expect(rule.layer).toBe(4);
      expect(rule.severity).toBe("warn");
      expect(rule.severity).not.toBe("block");
    }
  });

  it("is excluded from ALL_RULES so existing scanners stay unchanged", () => {
    const layer4Ids = new Set(LAYER_4_PAYMENTS_UNDERWRITING.map((rule) => rule.id));
    for (const rule of ALL_RULES) {
      expect(rule.layer).not.toBe(4);
      expect(layer4Ids.has(rule.id)).toBe(false);
      expect(rule.id.startsWith("L4-")).toBe(false);
    }
  });

  it("does not leak into default template scans (Studio / Journal / waitlist)", () => {
    const layer4Ids = LAYER_4_PAYMENTS_UNDERWRITING.map((rule) => rule.id);
    for (const template of ["NEWSLETTER_BLOCK", "MODEL_JOURNAL", "GSE_WAITLIST", "BOT_OUTBOX"]) {
      const ids = getRulesForTemplate(template).map((rule) => rule.id);
      for (const id of layer4Ids) {
        expect(ids).not.toContain(id);
      }
    }
  });

  it("is opt-in on the PAYMENTS_SURFACE template without promoting severity to block", () => {
    const opted = getRulesForTemplate("PAYMENTS_SURFACE");
    for (const rule of LAYER_4_PAYMENTS_UNDERWRITING) {
      const found = opted.find((candidate) => candidate.id === rule.id);
      expect(found).toBeDefined();
      expect(found?.severity).toBe("warn");
    }
  });
});

describe("scanPaymentsSurfaceCopy — fixture vocabulary", () => {
  it("flags each live-page phrase with the expected warn rule", () => {
    for (const fixture of LIVE_VOCAB_FIXTURES) {
      const flags = scanPaymentsSurfaceCopy(fixture.copy);
      expect(flags.map((flag) => flag.id), fixture.copy).toContain(fixture.id);
      for (const flag of flags) {
        expect(flag.severity).toBe("warn");
        expect(flag.layer).toBe(4);
      }
    }
  });

  it("does not flag clean SaaS subscription copy", () => {
    const flags = scanPaymentsSurfaceCopy(
      "Subscribe monthly. Cancel any time. Read the methodology. Founding-member pricing is locked for the life of your subscription.",
    );
    expect(flags).toEqual([]);
  });

  it("still flags a soft-wrapped underwriting phrase", () => {
    const flags = scanPaymentsSurfaceCopy("This is a sports\nbetting research desk.");
    expect(flags.map((flag) => flag.id)).toContain("L4-SPORTS-BETTING");
  });
});

describe("payments surfaces — live page source", () => {
  for (const rel of PAYMENTS_PAGES) {
    it(`${rel} scans with Layer 4 and never returns block`, () => {
      const source = readPage(rel);
      expect(source.length).toBeGreaterThan(0);

      const fromSource = scanPaymentsSurfaceCopy(source);
      const fromCopy = scanPaymentsSurfaceCopy(extractDetectableCopy(source));
      const flags = [...fromSource, ...fromCopy];

      expect(flags.every((flag) => flag.severity === "warn")).toBe(true);
      expect(flags.every((flag) => flag.layer === 4)).toBe(true);
      expect(flags.some((flag) => flag.severity === "block")).toBe(false);
    });
  }

  it("pricing copy still contains underwriting tokens the layer is meant to see", () => {
    const source = readPage("app/pricing/page.tsx");
    const flags = scanPaymentsSurfaceCopy(extractDetectableCopy(source));
    const ids = flags.map((flag) => flag.id);
    expect(ids).toContain("L4-WAGERING");
    expect(ids).toContain("L4-BETTING-AS-PRODUCT");
    expect(ids).toContain("L4-PARLAY");
  });

  it("clv copy still contains bet-log vocabulary the layer is meant to see", () => {
    const source = readPage("app/clv/page.tsx");
    const flags = scanPaymentsSurfaceCopy(extractDetectableCopy(source));
    expect(flags.map((flag) => flag.id)).toContain("L4-BET-VOCAB");
  });

  it("methodology copy still contains moneyline vocabulary the layer is meant to see", () => {
    const source = readPage("app/methodology/page.tsx");
    const flags = scanPaymentsSurfaceCopy(extractDetectableCopy(source));
    expect(flags.map((flag) => flag.id)).toContain("L4-MONEYLINE-MARKET");
  });
});
