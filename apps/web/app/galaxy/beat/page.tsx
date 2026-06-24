import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { BeatBroadcastWall, type BeatPulse } from "@/components/galaxy/beat-broadcast-wall";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { getGalaxyWorldState } from "@/lib/galaxy/world-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Beat Broadcast Wall",
  description: "Spatial sports-weather broadcast layer for Galaxy Dynasty.",
  alternates: { canonical: "/galaxy/beat" },
};

export default async function BeatPage() {
  const profile = await getCurrentProfileView();
  const world = getGalaxyWorldState();
  const pulses: BeatPulse[] = [
    { id: "weather", label: world.weatherName, detail: world.gsePrompt, intensity: 0.9 },
    { id: "route", label: "Rookie Route", detail: "Route the player through the current Campus priority without inventing live numbers.", intensity: 0.65 },
    { id: "proof", label: "Proof Pulse", detail: "Source and proof checks remain the path back into GSE decisions.", intensity: 0.7 },
  ];

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.cyan, fontWeight: 800 }}>THE BEAT</div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>Broadcast Wall</h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 720, marginTop: 0 }}>
        The in-world broadcast layer turns sports weather, proof routes, and Campus urgency into a spatial instrument.
      </p>
      <BeatBroadcastWall pulses={pulses} />
    </GalaxyShell>
  );
}
