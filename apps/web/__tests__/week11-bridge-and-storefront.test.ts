import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import * as publicationGate from "@sports/governed";

vi.mock("@sports/db", () => ({
  db: {},
  isStubMode: () => true,
}));

const WEB_ROOT = path.resolve(__dirname, "..");
const EXPECTED_SOURCE_SHA256 =
  "a2aca13a763e7fce3ab38d5ef5f996b7e41b3e0034ffebfd4f587faa2632c30b";

const TOUCHED_FILES = [
  "lib/slate/sealed-slate-store.ts",
  "lib/slate/current-sealed-slate.json",
  "lib/week8/types.ts",
  "lib/engine/engine-live-bridge.ts",
  "lib/packages/catalog.ts",
  "lib/packages/two-door-offers.ts",
  "app/props/page.tsx",
];

function readWebFile(relPath: string): string {
  return fs.readFileSync(path.join(WEB_ROOT, relPath), "utf-8");
}

function isPureAscii(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 127) {
      return false;
    }
  }
  return true;
}

describe("Task 4: Week 11 sealed slate, bridge, catalog, two-door offers, and props page", () => {
  it("loads Week 11 sealed slate dynamically with season=2026, week=11, and Cage admission", async () => {
    const spy = vi.spyOn(publicationGate, "evaluateCagePublicationPolicy");
    const { loadActiveSealedSlate } = await import("@/lib/slate/sealed-slate-store");
    const result = await loadActiveSealedSlate();

    expect(result.policyAdmitted).toBe(true);
    expect(result.board.season).toBe(2026);
    expect(result.board.week).toBe(11);
    expect(result.board.projection_source_sha256).toBe(EXPECTED_SOURCE_SHA256);
    expect(result.board.props).toEqual([]);
    expect(result.board.counts.publish).toBe(0);
    expect(result.board.counts.evaluated).toBeGreaterThanOrEqual(13);

    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls.at(-1)?.[0];
    expect(lastCall?.season).toBe(2026);
    expect(lastCall?.week).toBe(11);
    spy.mockRestore();

    const storeSource = readWebFile("lib/slate/sealed-slate-store.ts");
    expect(storeSource).not.toMatch(/week:\s*10\b/);
  });

  it("bridges Week 11 IND @ HOU and Sunday Main Slate without free paid picks or MIA @ BUF literal", async () => {
    const bridge = await import("@/lib/engine/engine-live-bridge");

    expect(bridge.OFFICIAL_VERIFIED_LEDGER_2026.overallRecord).toBe("79-46-0");
    expect(bridge.OFFICIAL_VERIFIED_LEDGER_2026.supersededPriorSnapshot).toContain("47-19-1");
    expect(bridge.FREE_TNF_GAME_ENVIRONMENT_ANALYTICS.matchup).toContain("IND @ HOU");
    expect(bridge.FREE_TNF_GAME_ENVIRONMENT_ANALYTICS.windowSlot).toContain("Week 11");
    expect(bridge.FREE_TNF_GAME_ENVIRONMENT_ANALYTICS.environmentNote).not.toMatch(/\d+\/100/);

    const bridgeSource = readWebFile("lib/engine/engine-live-bridge.ts");
    expect(bridgeSource).toContain(EXPECTED_SOURCE_SHA256);
    expect(bridgeSource).not.toContain("MIA @ BUF");
    expect(bridgeSource).not.toContain("Marvin Harrison Jr.");
    expect(bridgeSource).not.toContain("Woody Marks");
    expect(bridgeSource).not.toContain("Lamar Jackson");
  });

  it("updates catalog.ts and two-door-offers.ts for Week 11 SKU ladder and 30-day Positive-CLV Pledge", async () => {
    const catalog = await import("@/lib/packages/catalog");
    const twoDoor = await import("@/lib/packages/two-door-offers");

    expect(catalog.WEEK8_GAME_DAY_CATALOG_METADATA.slateWindowLabel).toMatch(/Week\s+11/i);
    expect(catalog.LIVE_PACKAGE_CATALOG).toHaveLength(5);
    expect(catalog.LIVE_PACKAGE_CATALOG.map((p) => p.slug)).toContain("tnf-all-in-pack");
    expect(catalog.ACTIVE_FOR_SALE_PACKAGE_CATALOG.map((p) => p.slug)).toContain(
      "sunday-nfl-5pct-slate",
    );

    expect(twoDoor.WEEK11_VERIFIED_SLATE.week).toBe(11);
    expect(twoDoor.WEEK11_VERIFIED_SLATE.tnfMatchup).toContain("IND @ HOU");
    expect(twoDoor.TWO_DOOR_PACK_OFFERS.some((o) => o.standardPriceCents === 900)).toBe(true);
    expect(twoDoor.TWO_DOOR_PACK_OFFERS.some((o) => o.standardPriceCents === 1400)).toBe(true);
    expect(
      twoDoor.MEMBERSHIP_PLANS.some((m) => m.priceCents === 3900 && m.cadence === "monthly"),
    ).toBe(true);
    expect(
      twoDoor.MEMBERSHIP_PLANS.some((m) => m.priceCents === 7900 && m.cadence === "monthly"),
    ).toBe(true);

    const twoDoorSource = readWebFile("lib/packages/two-door-offers.ts");
    const catalogSource = readWebFile("lib/packages/catalog.ts");
    expect(twoDoorSource).toMatch(/Positive-CLV Pledge/i);
    expect(twoDoorSource).toMatch(/Thanksgiving/i);
    expect(catalogSource).toMatch(/Thanksgiving/i);
    expect(catalogSource).toMatch(/Positive-CLV Pledge/i);
    expect(catalogSource).not.toContain("MIA @ BUF");
    expect(twoDoorSource).not.toContain("%");
    expect(twoDoorSource).not.toMatch(/[+-]\d+u\b/);
    expect(twoDoorSource).not.toMatch(/\b(lock|locked|locks|guaranteed|risk[- ]free)\b/i);
  });

  it("removes banned Locked copy from props/page.tsx and uses bounded cache + revalidate", () => {
    const propsSource = readWebFile("app/props/page.tsx");
    expect(propsSource).not.toMatch(/\blocked\b/i);
    expect(propsSource).toContain("Sealed props");
    expect(propsSource).toContain("@/lib/ledger/public-record");
    expect(propsSource).toContain("PUBLIC_RECORD_LINE");
    expect(propsSource).toContain("loadActiveSealedSlate");
    expect(propsSource).not.toContain('dynamic = "force-dynamic"');
    expect(propsSource).toMatch(/export\s+const\s+revalidate\s*=\s*\d+/);
    expect(propsSource).toContain("Promise.all");
  });

  it("maintains pure 7-bit ASCII and guardrail cleanliness across all Task 4 files", () => {
    for (const relPath of TOUCHED_FILES) {
      const content = readWebFile(relPath);
      expect(isPureAscii(content), `${relPath} must be pure 7-bit ASCII`).toBe(true);
      expect(content).not.toMatch(new RegExp("Users/" + "Garrett", "i"));
      expect(content).not.toContain("62-23-1");
      expect(content).not.toMatch(/\b(JEV|Sinkhorn|Cholesky|tau_hat)\b/i);
      expect(content).not.toMatch(/10,000\s+worlds/i);
      expect(content).not.toMatch(/Romano\s+CQR/i);
    }
  });
});
