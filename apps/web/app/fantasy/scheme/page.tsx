import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { SchemeIntel } from "@/components/fantasy/scheme-intel";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { poolForViewer } from "@/lib/fantasy/free-trial";

export const metadata: Metadata = {
  title: "Scheme Intelligence · Galaxy Fantasy",
  description:
    "How one coaching or scheme change cascades through a whole offense: the gainers, the faders, the projection delta, the reasoning, and the confidence from the source's reliability tier.",
  alternates: { canonical: "/fantasy/scheme" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

const LIVE_NOTE =
  "Live graded pool: real players with model-derived projections. The cascade, deltas, and confidence are computed from real grades; the scenarios themselves are illustrative coaching changes, and reliability tiers mirror The Beat.";

export default async function SchemePage() {
  const [pool, viewer] = await Promise.all([resolveToolPoolAsync(), getViewerEntitlements()]);
  // Server-side paywall enforcement (CLAUDE.md rule 3): a FREE/anon viewer never
  // receives the paid rows of the live pool — only the trial subset crosses to the client.
  const gatedPool = poolForViewer(pool, viewer.canUseFantasyFull);
  return (
    <FantasyShell
      eyebrow="Scheme Intelligence"
      accent="cyan"
      title={<>One change. The whole <span className="gse-editorial" style={{ fontSize: "1.08em" }}>ripple</span>.</>}
      intro="A new coordinator doesn't move one player; it re-prices an entire offense. Pick a coaching or scheme change and see the full cascade: who gains, who fades, by how much, and why, weighted by how reliable the source is, on the same tiering The Beat uses for breaking news."
      // The note must describe the pool ACTUALLY served. ILLUSTRATIVE_NOTE asserts
      // "fictional players … not live data" — affirmatively FALSE when real graded
      // players are on screen, so it may only be printed on the illustrative branch.
      note={gatedPool
        ? LIVE_NOTE
        : `${ILLUSTRATIVE_NOTE} Scenarios are illustrative coaching changes; reliability tiers mirror The Beat.`}
      wide
    >
      <SchemeIntel pool={gatedPool} />
    </FantasyShell>
  );
}
