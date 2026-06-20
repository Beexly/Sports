import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  CASH_OUT_SUPPORTED,
  CREDIT_EARN_REASONS,
  MANDATORY_VISUAL_LINE,
  BOSSES,
  buildBossAssetBrief,
  buildAssetBrief,
  SEASON_OBJECTIVES,
} from "@sports/galaxy-engine";
import { COSMETICS, NOVA_PACKS, SEASON_DROPS } from "@/lib/galaxy/store";

/**
 * BRAND ENFORCEMENT GATES (Deepening OS §5) — automated, beyond the copy scan.
 * Encodes the non-negotiables so a future change can't silently cross a line.
 */

const webRoot = resolve(__dirname, "..");
const repoRoot = resolve(webRoot, "..", "..");
const schema = readFileSync(resolve(repoRoot, "packages", "db", "prisma", "schema.prisma"), "utf8");

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(e)) out.push(full);
  }
  return out;
}

describe("Gate: Credit Constitution — no cash-out path exists", () => {
  it("cash-out is a compile-time false constant", () => {
    expect(CASH_OUT_SUPPORTED).toBe(false);
  });

  it("no credit reason implies cash / redeem / withdraw / payout", () => {
    for (const r of CREDIT_EARN_REASONS) {
      expect(r.toLowerCase()).not.toMatch(/cash|redeem|withdraw|payout|spend|debit/);
    }
  });

  it("no Galaxy server module defines a cash-out / withdraw function", () => {
    const files = walk(resolve(webRoot, "lib/galaxy"));
    const forbidden = /function\s+\w*(cashOut|cashout|withdraw|redeemCash|payout)\w*/i;
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(forbidden.test(text), `${f} must not define a cash-out function`).toBe(false);
    }
  });
});

describe("Gate: Visual Law — every asset brief carries the mandatory line", () => {
  it("buildAssetBrief always includes the mandatory visual line", () => {
    const b = buildAssetBrief({ kind: "badge", subject: "a clean status badge" });
    expect(b.prompt).toContain(MANDATORY_VISUAL_LINE);
  });

  it("every boss asset brief is compliant and ungenerated (no API spend)", () => {
    for (const boss of BOSSES) {
      const brief = buildBossAssetBrief(boss.key);
      expect(brief.prompt).toContain(MANDATORY_VISUAL_LINE);
      expect(brief.generated).toBe(false);
    }
  });

  it("the visual line forbids casino / sportsbook / generic fantasy", () => {
    expect(MANDATORY_VISUAL_LINE).toMatch(/no casino/);
    expect(MANDATORY_VISUAL_LINE).toMatch(/no sportsbook/);
    expect(MANDATORY_VISUAL_LINE).toMatch(/no generic fantasy/);
  });
});

describe("Gate: no sportsbook / casino UI strings in Galaxy surfaces", () => {
  it("no Galaxy file mentions a sportsbook odds board or slot machine", () => {
    const files = [
      ...walk(resolve(webRoot, "app/galaxy")),
      ...walk(resolve(webRoot, "components/galaxy")),
    ];
    const forbidden = /(sportsbook|odds board|slot machine|bet slip)/i;
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(forbidden.test(text), `${f} must not reference sportsbook UI`).toBe(false);
    }
  });
});

describe("Gate: no unlicensed likeness / league-mark fields in the Galaxy schema", () => {
  it("Galaxy models declare no athlete-likeness or league-mark fields", () => {
    // Scan the Galaxy section of the schema for forbidden field names.
    const galaxyStart = schema.indexOf("GALAXY DYNASTY");
    const galaxySchema = galaxyStart >= 0 ? schema.slice(galaxyStart) : schema;
    const forbiddenFields = /\b(athleteName|athletePhoto|playerLikeness|leagueLogo|teamLogo|nflMark|nbaMark)\b/i;
    expect(forbiddenFields.test(galaxySchema)).toBe(false);
  });
});

describe("Gate: no pay-to-win — purchasable items never grant power", () => {
  it("cosmetics and Nova packs grant no XP / rating / skill / credits", () => {
    const purchasable = [...COSMETICS, ...NOVA_PACKS] as unknown as readonly Record<string, unknown>[];
    for (const item of purchasable) {
      for (const key of Object.keys(item)) {
        expect(key.toLowerCase()).not.toMatch(/\bxp\b|rating|skill|credits|win|power/);
      }
    }
  });

  it("season drops are achievement-gated, not outcome rewards", () => {
    for (const d of SEASON_DROPS) {
      expect(Object.keys(d)).not.toContain("rewardXp");
      expect(Object.keys(d)).not.toContain("rewardRating");
    }
  });

  it("every boss-gated drop references a real boss (no stale keys)", () => {
    const bossKeys = new Set(BOSSES.map((b) => b.key));
    for (const d of SEASON_DROPS) {
      if (d.requirement.kind === "boss_clear") {
        expect(bossKeys.has(d.requirement.bossKey), `drop ${d.sku} references unknown boss ${d.requirement.bossKey}`).toBe(true);
      }
    }
  });

  it("Pro season objectives add depth, not outcome rewards", () => {
    for (const o of SEASON_OBJECTIVES.filter((x) => x.track === "pro")) {
      expect(Object.keys(o)).not.toContain("rewardCredits");
      expect(Object.keys(o)).not.toContain("rewardXp");
      // Pro framing must be about vision/tools, never winning.
      expect(`${o.label} ${o.detail}`.toLowerCase()).not.toMatch(/guaranteed|win more|auto-win/);
    }
  });
});
