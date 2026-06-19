import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GalaxyOnboarding } from "@/components/galaxy/onboarding";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your Galaxy Profile",
  description: "Pick your handle, archetype, and faction. Begin Rookie Season.",
  alternates: { canonical: "/galaxy/onboarding" },
};

export default async function OnboardingPage() {
  const profile = await getCurrentProfileView();
  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        ROOKIE SEASON — ONBOARDING
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Build your identity
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 640, marginTop: 0 }}>
        Your handle, archetype, and faction are your starting identity. You&apos;ll
        receive a starter card pack and {""}
        <strong style={{ color: GALAXY.gold }}>250 Galaxy Credits</strong> when you
        enter the Campus.
      </p>
      <div style={{ marginTop: 18 }}>
        <GalaxyOnboarding />
      </div>
    </GalaxyShell>
  );
}
