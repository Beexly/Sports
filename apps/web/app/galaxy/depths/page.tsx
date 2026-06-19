import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { PublicTrapBoss } from "@/components/galaxy/public-trap";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Depths — The Public Trap",
  description:
    "A PvM boss that teaches crowd bias. Read value over the crowd to clear it and unlock the Signal Keeper entitlement.",
  alternates: { canonical: "/galaxy/depths" },
};

export default async function DepthsPage() {
  const profile = await getCurrentProfileView();
  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.magenta, fontWeight: 700 }}>
        THE DEPTHS — PvM BOSS
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        The Public Trap
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        The Trap embodies crowd bias. On each step the public is piling onto one
        side — the disciplined read is usually the other. Resist the crowd on a
        majority of steps to clear it. Clearing unlocks the{" "}
        <strong style={{ color: GALAXY.gold }}>Signal Keeper</strong> entitlement.
      </p>
      <div style={{ marginTop: 18, maxWidth: 720 }}>
        <PublicTrapBoss />
      </div>
    </GalaxyShell>
  );
}
