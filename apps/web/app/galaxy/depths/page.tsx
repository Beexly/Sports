import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { BossEncounter, type BossView } from "@/components/galaxy/boss-encounter";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { BOSSES } from "@sports/galaxy-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Depths — PvM Bosses",
  description:
    "Five bad-logic bosses that teach cognitive bias. Read value over the bias to clear each and unlock its entitlement.",
  alternates: { canonical: "/galaxy/depths" },
};

export default async function DepthsPage() {
  const profile = await getCurrentProfileView();

  // Serialize the boss registry for the client (only what the UI needs).
  const bosses: BossView[] = BOSSES.map((b) => ({
    key: b.key,
    name: b.name,
    bias: b.bias,
    blurb: b.blurb,
    merchName: b.merchName,
    scenarios: b.scenarios.map((s) => ({
      id: s.id,
      matchup: s.matchup,
      trapLabel: s.trapLabel,
      valueLabel: s.valueLabel,
      biasPct: s.biasPct,
    })),
  }));

  const cleared = new Set(profile?.bossCleared ?? []);

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.magenta, fontWeight: 700 }}>
        THE DEPTHS — PvM BOSSES
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Bad-logic bosses
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 680, marginTop: 0 }}>
        Each boss embodies a cognitive bias. The trap side is what the crowd falls
        for; the value side is the disciplined read. Resist on a 2/3 majority to
        clear it and unlock its entitlement.{" "}
        {profile && (
          <span style={{ color: GALAXY.cyan }}>
            Cleared {cleared.size}/{BOSSES.length}.
          </span>
        )}
      </p>
      <div style={{ marginTop: 18, maxWidth: 760 }}>
        <BossEncounter bosses={bosses} />
      </div>
    </GalaxyShell>
  );
}
