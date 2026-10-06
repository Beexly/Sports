// Authored design-sync preview for PickCard.
// FIXTURE: the pick below is a layout fixture for the design tool, not a product pick.
import { PickCard } from "sports-prediction-platform";
import type { PublicPick } from "@sports/types";

const kickoff = new Date(Date.now() + 26 * 3_600_000).toISOString();
const minted = new Date(Date.now() - 45 * 60_000).toISOString();

const base: PublicPick = {
  id: "fixture-pick-0001",
  game: { homeTeam: "Buffalo Bills", awayTeam: "Kansas City Chiefs", commenceTime: kickoff, sport: "NFL" },
  pickType: "SPREAD",
  selection: "Buffalo Bills -2.5",
  line: -2.5,
  lineMovement: { opening: -1.5, current: -2.5 },
  hasBookPrice: true,
  confidence: 64,
  edgeScore: 14,
  factorBreakdown: {
    consensusScore: 22,
    marketDepthScore: 15,
    edgeScore: 14,
    lineMovementScore: 6,
    volatilityPenalty: -3,
    headToHeadScore: 2,
    venueFormScore: 3,
    uncertaintyPenalty: -2,
    factors: [
      { name: "Consensus", impact: "positive", description: "Seven of seven books price the same side." },
      { name: "Line movement", impact: "positive", description: "Moved a full point toward the pick since open." },
      { name: "Volatility", impact: "negative", description: "Two books re-quoted inside the last hour." },
      { name: "Total", impact: "neutral", description: "Total held at open; no cross-market signal." },
    ],
  },
  dataQualityScore: 88,
  tier: "PREMIUM",
  pickGrade: "STRONG_PLAY",
  riskLevel: "MODERATE",
  reasoning:
    "Seven books agree on the side; the line moved a full point toward Buffalo since open while the total held. Venue form and head-to-head both lean home. Volatility is low for a divisional game.",
  reasoningShort: "Seven books agree on the side and the line moved toward Buffalo since open.",
  isFeatured: false,
  isAuditAvailable: true,
  generatedAt: minted,
  dataFreshnessAt: minted,
  result: "PENDING",
  receiptHash: "3f9a1c77e2b04d5a6c8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4",
};

const ground: React.CSSProperties = { background: "var(--carbon)", padding: 24, maxWidth: 480 };

export const ProFullBoard = () => (
  <div style={ground}>
    <PickCard pick={{ ...base, isFeatured: true }} canSeeConfidence canSeeEdgeScore canSeeFactorBreakdown />
  </div>
);

export const FreeTeaser = () => (
  <div style={ground}>
    <PickCard
      pick={{ ...base, tier: "FREE", confidence: null, edgeScore: null, factorBreakdown: null, lineMovement: null, receiptHash: null }}
      canSeeConfidence={false}
      canSeeEdgeScore={false}
      canSeeFactorBreakdown={false}
    />
  </div>
);

export const Moneyline = () => (
  <div style={ground}>
    <PickCard
      pick={{
        ...base,
        id: "fixture-pick-0002",
        pickType: "MONEYLINE",
        selection: "Kansas City Chiefs",
        line: 125,
        lineMovement: null,
        marketImplied: { prob: 0.44, bookmakerCount: 6 },
        pickGrade: "LEAN",
        riskLevel: "HIGH_VARIANCE",
      }}
      canSeeConfidence
      canSeeEdgeScore
      canSeeFactorBreakdown
    />
  </div>
);

export const NoBookPrice = () => (
  <div style={ground}>
    <PickCard
      pick={{ ...base, id: "fixture-pick-0003", hasBookPrice: false, lineMovement: null, receiptHash: null, isAuditAvailable: false, pickGrade: "SOLID_PLAY" }}
      canSeeConfidence
      canSeeEdgeScore
      canSeeFactorBreakdown
    />
  </div>
);

export const Settled = () => (
  <div style={{ ...ground, display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", maxWidth: 960 }}>
    <PickCard pick={{ ...base, id: "fixture-pick-0004", result: "WIN", pickGrade: "ELITE_PLAY", riskLevel: "LOW_RISK" }} canSeeConfidence canSeeEdgeScore canSeeFactorBreakdown={false} />
    <PickCard pick={{ ...base, id: "fixture-pick-0005", result: "LOSS", riskLevel: "INJURY_RISK" }} canSeeConfidence canSeeEdgeScore canSeeFactorBreakdown={false} />
  </div>
);
