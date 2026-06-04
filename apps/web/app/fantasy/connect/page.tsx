import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { SleeperConnect } from "@/components/fantasy/sleeper-connect";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Connect Your League — Galaxy Fantasy",
  description:
    "Sync your Sleeper league read-only — enter your username, pick a league, and see your real roster resolved from Sleeper's public API. We never write to your league.",
  alternates: { canonical: "/fantasy/connect" },
};

export default function ConnectPage() {
  return (
    <FantasyShell
      eyebrow="Connect your league"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Bring in your <span className="gse-editorial" style={{ fontSize: "1.08em" }}>real</span> roster.</>}
      intro="Sleeper first — its API is public and read-only, so there's no login to hand over and nothing we can change in your league. Enter your username, pick a league, and your actual roster resolves right here. This is the first step from a demo to your team; ESPN and Yahoo (OAuth) follow behind the founder gate."
      note="Read-only sync via Sleeper's public API. Live recommendations on real players require a licensed projections source (founder-gated). No writes, no posting, no autonomous account actions."
      wide
    >
      <SleeperConnect />
    </FantasyShell>
  );
}
