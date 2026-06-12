import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { TradeAnalyzer } from "@/components/fantasy/trade-analyzer";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { FANTASY_COACH } from "@/lib/fantasy/coach";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Trade Analyzer — Galaxy Fantasy",
  description:
    "Value both sides of any trade on VOR, projection, trend, and injury risk — with fairness, a win-now vs. depth lean, consolidation detection, and the reasoning behind the verdict.",
  alternates: { canonical: "/fantasy/trade" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

const LIVE_NOTE =
  "Live graded pool — real players with model-derived projections. Trade values, fairness, and the lean are computed from real grades.";

export default async function TradePage() {
  const pool = await resolveToolPoolAsync();
  return (
    <FantasyShell
      eyebrow="Trade Analyzer"
      accent={BRAND_COLORS.softUltraviolet}
      title={<>Know who <span className="gse-editorial" style={{ fontSize: "1.08em" }}>wins</span> the deal.</>}
      intro="Build both sides; the analyzer prices them on value over replacement, trend, and injury risk — then calls the winner with reasons."
      coach={FANTASY_COACH.trade}
      note={pool ? LIVE_NOTE : ILLUSTRATIVE_NOTE}
      wide
    >
      <TradeAnalyzer pool={pool} />
    </FantasyShell>
  );
}
