import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { LineupOptimizer } from "@/components/fantasy/lineup-optimizer";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Lineup Optimizer — Galaxy Fantasy",
  description:
    "The optimal start/sit with the leverage of every call — and a what-if toggle that re-solves your lineup the moment a player is ruled out.",
  alternates: { canonical: "/fantasy/lineup" },
};

// Render per-request so the founder-gated live-projections status is reflected
// at runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

export default async function LineupPage() {
  // Live graded pool when projections are on; otherwise undefined → illustrative.
  const pool = await resolveToolPoolAsync();
  return (
    <FantasyShell
      eyebrow="Lineup Optimizer"
      accent={BRAND_COLORS.ionMagenta}
      title={<>Start the points. Skip the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>guessing</span>.</>}
      intro="The optimal lineup, solved — with the leverage of every call (how much you'd lose starting the next-best bench option) and a floor-to-ceiling band. Mark a player out and watch it re-solve."
      note={pool
        ? "Live graded pool — real players with model-derived projections. The roster shown is a sample drawn from that pool (no league connection yet); optimization, leverage, and the floor/ceiling band are computed from real grades."
        : "Illustrative roster and projections. Optimization, leverage, and the floor/ceiling band are computed live from the sample pool."}
      wide
    >
      <LineupOptimizer pool={pool} />
    </FantasyShell>
  );
}
