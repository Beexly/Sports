import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { DraftAssistant } from "@/components/fantasy/draft-assistant";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { poolForViewer } from "@/lib/fantasy/free-trial";
import { BRAND_COLORS } from "@/lib/brand";
import { getCurrentPricingPhase } from "@/lib/pricing/pricing-phases";

export const metadata: Metadata = {
  title: "Draft Assistant · Galaxy Fantasy",
  description:
    "A glass-box draft board: VOR, tiers, best-available, and live pick recommendations with the reasoning: need, tier cliffs, value, and bye stacking.",
  alternates: { canonical: "/fantasy/draft" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

export default async function DraftPage() {
  const [pool, viewer] = await Promise.all([resolveToolPoolAsync(), getViewerEntitlements()]);
  // Server-side paywall enforcement: a FREE viewer never receives the paid rows of the
  // live pool (CLAUDE.md rule 3) — only the trial subset crosses to the client.
  const gatedPool = poolForViewer(pool, viewer.canUseFantasyFull);
  return (
    <FantasyShell
      eyebrow="Draft Assistant"
      accent={BRAND_COLORS.softUltraviolet}
      title={<>Draft the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>value</span>, not the name.</>}
      intro="Mark players off the board and the engine recommends your next pick, and tells you exactly why: your biggest need, the tier about to break, the value over replacement, and the bye-week stack you're about to create."
      note={pool
        ? "Live graded pool: real players with model-derived projections. Value over replacement, tiers, and recommendations are computed from real grades."
        : "Illustrative player universe: fictional players, illustrative projections. Value over replacement, tiers, and recommendations are computed live from this sample pool."}
      wide
    >
      <DraftAssistant pool={gatedPool} canUseFantasyFull={viewer.canUseFantasyFull} fantasyAnnual={getCurrentPricingPhase().fantasy.annual} />
    </FantasyShell>
  );
}
