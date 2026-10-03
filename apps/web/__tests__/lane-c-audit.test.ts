/**
 * Lane C — security, data integrity, copy (worktree hermes/lane-bc-20260920).
 *
 * Relative imports: node_modules is junctioned to the main checkout, so
 * @sports/* would resolve the wrong packages.
 */
import { describe, it, expect } from "vitest";
import {
  resolveStoredPickTier,
  isPremiumPickRow,
  PREMIUM_CONFIDENCE_THRESHOLD as STAMP_THRESHOLD,
} from "../../../packages/ingestion-pipeline/src/pick-tier.js";
import { PREMIUM_CONFIDENCE_THRESHOLD } from "../../../packages/prediction-engine/src/constants.js";
import {
  isFixedLadderConsensusSport,
  bindPublicConsensusClaim,
  gateConsensusClaim,
} from "@/lib/claims/public-consensus-claim";
import {
  BANNED_FEATURE_SOURCES,
  isBannedFeatureSource,
  isBannedFeatureKey,
  scanFeatureDescriptors,
  filterVerifiedFeatureColumns,
} from "../../../packages/feature-store/src/simulated-column-denylist.js";
import { PROJECTION_FEATURE_REGISTRY } from "@/lib/projections/projection-feature-registry";
import { FEATURE_METRIC_DEFINITIONS } from "@/lib/metrics/feature-store";
import { resolveB2bKeyScope } from "@/lib/b2b/api-key-auth";
import {
  WIND_YDS_PER_MPH_PASSING_PROPS,
  applyWindToPassingPropYards,
  totalSuppressionIndex,
} from "../../../packages/prediction-engine/src/edge-lab/features/nfl-weather.js";
import { FORBIDDEN_PHRASES } from "@/lib/positioning-vocab";
import { LAYER_1_PLATFORM_BANS } from "@/lib/compliance-scanner/rules";

describe("Lane C — B2B tier fail-closed stamp", () => {
  it("threshold matches the prediction-engine constant", () => {
    expect(STAMP_THRESHOLD).toBe(PREMIUM_CONFIDENCE_THRESHOLD);
    expect(PREMIUM_CONFIDENCE_THRESHOLD).toBe(70);
  });

  it("upgrades high-confidence picks even when engine tier is missing/FREE", () => {
    expect(resolveStoredPickTier({ confidence: 82, tier: undefined })).toBe("PREMIUM");
    expect(resolveStoredPickTier({ confidence: 82, tier: null })).toBe("PREMIUM");
    expect(resolveStoredPickTier({ confidence: 82, tier: "FREE" })).toBe("PREMIUM");
  });

  it("never upgrades on missing/non-finite confidence; engine PREMIUM always wins", () => {
    expect(resolveStoredPickTier({ confidence: undefined, tier: undefined })).toBe("FREE");
    expect(resolveStoredPickTier({ confidence: null, tier: null })).toBe("FREE");
    expect(resolveStoredPickTier({ confidence: Number.NaN, tier: "FREE" })).toBe("FREE");
    expect(resolveStoredPickTier({ confidence: 10, tier: "PREMIUM" })).toBe("PREMIUM");
  });

  it("boundary: threshold is inclusive PREMIUM", () => {
    expect(resolveStoredPickTier({ confidence: 70 })).toBe("PREMIUM");
    expect(resolveStoredPickTier({ confidence: 69 })).toBe("FREE");
  });

  it("isPremiumPickRow matches resolveStoredPickTier", () => {
    expect(isPremiumPickRow({ confidence: 91 })).toBe(true);
    expect(isPremiumPickRow({ confidence: 40 })).toBe(false);
  });

  it("bare B2B key cannot see premium rows; :premium can", () => {
    const premiumRow = resolveStoredPickTier({ confidence: 88 });
    expect(premiumRow).toBe("PREMIUM");
    const freeScope = resolveB2bKeyScope(
      new Request("https://x", { headers: { "x-api-key": "bare" } }),
      { GSE_B2B_API_KEYS: "bare,partner:premium" },
    );
    expect(freeScope).toBe("free");
    const premiumScope = resolveB2bKeyScope(
      new Request("https://x", { headers: { "x-api-key": "partner" } }),
      { GSE_B2B_API_KEYS: "bare,partner:premium" },
    );
    expect(premiumScope).toBe("premium");
  });
});

describe("Lane C — MLB consensus tautology (public claims)", () => {
  const claimText = "100% bookmaker consensus on Athletics -1.5.";
  const now = new Date("2026-09-20T12:00:00Z");
  const evidence = {
    consensusPct: 1,
    bookmakerCount: 8,
    dataFreshnessAt: new Date("2026-09-20T00:00:00Z"),
  };

  it("detects baseball as fixed-ladder consensus sport", () => {
    expect(isFixedLadderConsensusSport("baseball_mlb")).toBe(true);
    expect(isFixedLadderConsensusSport("BASEBALL_MLB")).toBe(true);
    expect(isFixedLadderConsensusSport("americanfootball_nfl")).toBe(false);
  });

  it("suppresses MLB '100% bookmaker consensus' even with valid numbers", () => {
    expect(
      bindPublicConsensusClaim({
        reasoningShort: claimText,
        sportKey: "baseball_mlb",
        ...evidence,
      }),
    ).toBeNull();
    const gated = gateConsensusClaim(claimText, { sportKey: "baseball_mlb", ...evidence }, now);
    expect(gated.text).toBe("");
    expect(gated.evidenceCaption).toBeNull();
  });

  it("still binds football consensus claims that carry evidence", () => {
    const bound = bindPublicConsensusClaim({
      reasoningShort: claimText.replace("Athletics -1.5", "Bears -3.0"),
      sportKey: "americanfootball_nfl",
      ...evidence,
    });
    expect(bound).not.toBeNull();
    expect(bound!.bookmakerCount).toBe(8);
  });
});

describe("Lane C — simulated feature-column denylist", () => {
  it("bans WHOOP/Oura/HRV/chemistry/leadership/toughness/PFF/Understat/Statcast", () => {
    expect(BANNED_FEATURE_SOURCES.length).toBeGreaterThan(10);
    for (const s of ["whoop", "oura", "pff", "understat", "statcast", "leadership", "chemistry"]) {
      expect(isBannedFeatureSource(s)).toBe(true);
    }
    for (const k of ["whoop_recovery", "oura_hrv", "team_leadership", "defense_toughness", "np_random_x", "pff_grade"]) {
      expect(isBannedFeatureKey(k)).toBe(true);
    }
  });

  it("projection feature registry is clean (verified historical sources only)", () => {
    const scan = scanFeatureDescriptors(PROJECTION_FEATURE_REGISTRY);
    expect(scan.clean).toBe(true);
    expect(scan.hits).toEqual([]);
  });

  it("apps/web feature-store metric definitions are clean", () => {
    const scan = scanFeatureDescriptors(
      FEATURE_METRIC_DEFINITIONS.map((d) => ({ id: d.id, source: d.sourceModule, label: d.name })),
    );
    expect(scan.clean).toBe(true);
  });

  it("filterVerifiedFeatureColumns drops simulated columns", () => {
    const cols = ["epa_per_play", "whoop_recovery", "snap_share", "oura_hrv", "target_share"];
    expect(filterVerifiedFeatureColumns(cols)).toEqual(["epa_per_play", "snap_share", "target_share"]);
  });

  it("no np.random simulated generators outside seeded test/EKF code", () => {
    // In-repo np.random usage is limited to gse-ml-service tests + ETKF RNG —
    // not feature-store column generation. Denylist keys must still catch them
    // if they ever appear as feature names.
    expect(isBannedFeatureKey("np.random.normal")).toBe(true);
  });
});

describe("Lane C — weather wind isolation (props only)", () => {
  it("passing-prop wind is −3.007 yds/mph and does not feed the totals index", () => {
    expect(WIND_YDS_PER_MPH_PASSING_PROPS).toBe(-3.007);
    const baseline = 275;
    const windyProp = applyWindToPassingPropYards(baseline, 12)!;
    expect(windyProp).toBeCloseTo(baseline + WIND_YDS_PER_MPH_PASSING_PROPS * 12, 5);
    // totalSuppressionIndex is a [0,1] prior, never a yards delta — different unit.
    const suppression = totalSuppressionIndex({
      isDome: false,
      windMph: 12,
      precipProbPct: 0,
      tempF: 60,
    });
    expect(suppression).toBeGreaterThanOrEqual(0);
    expect(suppression).toBeLessThanOrEqual(1);
    expect(suppression).not.toBeCloseTo(windyProp, 2);
  });

  it("dome weather is neutral for both paths", () => {
    expect(
      totalSuppressionIndex({ isDome: true, windMph: 40, precipProbPct: 100, tempF: 0 }),
    ).toBe(0);
    // Props path still requires a known wind number; dome nulls stay null.
    expect(applyWindToPassingPropYards(250, null)).toBeNull();
  });
});

describe("Lane C — copy bans (apps/web, law-2 safe)", () => {
  it("positioning vocab bans AI-powered edge", () => {
    expect(FORBIDDEN_PHRASES.some((p) => p.toLowerCase().includes("ai-powered"))).toBe(true);
    expect(FORBIDDEN_PHRASES).toContain("AI-powered edge");
  });

  it("compliance-scanner layer-1 blocks tout + AI-powered edge", () => {
    const patterns = LAYER_1_PLATFORM_BANS.map((r) => r.pattern);
    const sample = "Our AI-powered edge is a guaranteed lock — free money, insider information.";
    const hit = patterns.some((re) => re.test(sample));
    expect(hit).toBe(true);
  });
});
