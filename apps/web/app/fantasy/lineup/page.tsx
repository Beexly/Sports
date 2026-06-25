import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { LineupOptimizer } from "@/components/fantasy/lineup-optimizer";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { poolForViewer } from "@/lib/fantasy/free-trial";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Start-Sit Helper — Galaxy Fantasy",
  description:
    "The strongest start/sit call for the roster you already have — with the leverage of every call and a what-if toggle that re-ranks the moment a player is ruled out.",
  alternates: { canonical: "/fantasy/lineup" },
};

// Render per-request so the founder-gated live-projections status is reflected
// at runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

export default async function LineupPage() {
  // Live graded pool when projections are on; otherwise undefined → illustrative.
  const [pool, viewer] = await Promise.all([resolveToolPoolAsync(), getViewerEntitlements()]);
  // Server-side paywall enforcement (CLAUDE.md rule 3): a FREE viewer never receives the
  // paid rows of the live pool — only the trial subset crosses to the client.
  const gatedPool = poolForViewer(pool, viewer.canUseFantasyFull);
  return (
    <FantasyShell
      eyebrow="Start-Sit Helper"
      accent={BRAND_COLORS.ionMagenta}
      title={<>Start the points. Skip the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>guessing</span>.</>}
      intro="The strongest start/sit call for the roster you already have — with the leverage of every call (how much you'd lose starting the next-best bench option) and a floor-to-ceiling band. Mark a player out and watch it re-rank."
      note={pool
        ? "Live graded pool — real players with model-derived projections. The roster shown is a sample drawn from that pool (no league connection yet); optimization, leverage, and the floor/ceiling band are computed from real grades."
        : "Illustrative roster and projections. Optimization, leverage, and the floor/ceiling band are computed live from the sample pool."}
      wide
    >
      <LineupOptimizer pool={gatedPool} />
    </FantasyShell>
  );
}
