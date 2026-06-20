import type { Metadata } from "next";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { getGalaxyWorldState } from "@/lib/galaxy/world-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stadium Gates — Sport Campaigns",
  description: "Sport-by-sport campaign portals. Today's sports weather drives every gate.",
  alternates: { canonical: "/galaxy/stadium" },
};

interface Gate {
  id: string;
  name: string;
  status: "live" | "preview";
  blurb: string;
  accent: string;
}

const GATES: Gate[] = [
  { id: "nfl", name: "NFL", status: "live", blurb: "The live sport for Rookie Season — full War Room reps.", accent: GALAXY.cyan },
  { id: "nba", name: "NBA", status: "preview", blurb: "Hoops IQ — pace, usage, and matchup reads.", accent: GALAXY.gold },
  { id: "mlb", name: "MLB", status: "preview", blurb: "Diamond signals — form, splits, and the long season.", accent: GALAXY.deepBlue },
  { id: "cfb", name: "College Football", status: "preview", blurb: "Saturday chaos — value in the noise.", accent: GALAXY.magenta },
  { id: "cbb", name: "College Basketball", status: "preview", blurb: "Bracket season — read the upsets early.", accent: GALAXY.violet },
  { id: "fantasy", name: "Fantasy", status: "preview", blurb: "Start/sit and waiver edges as Signal Checks.", accent: GALAXY.cyan },
  { id: "cards", name: "Cards", status: "live", blurb: "The Vault — collect, watch, and read card heat.", accent: GALAXY.gold },
];

export default async function StadiumPage() {
  const profile = await getCurrentProfileView();
  const world = getGalaxyWorldState();

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.deepBlue, fontWeight: 700 }}>STADIUM GATES</div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Sport campaigns
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        Each gate is a portal into a sport&apos;s world. Today&apos;s weather —{" "}
        <strong style={{ color: world.accent }}>{world.weatherName}</strong> — sets the
        featured boss, the card prompt, and the GSE study route across every gate.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14, marginTop: 18 }}>
        {GATES.map((g) => (
          <div key={g.id} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: g.accent }}>{g.name}</div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: g.status === "live" ? GALAXY.cyan : GALAXY.textMuted, border: `1px solid ${GALAXY.border}`, borderRadius: 999, padding: "2px 8px" }}>
                {g.status === "live" ? "LIVE" : "SEASON SOON"}
              </span>
            </div>
            <div style={{ color: GALAXY.textMuted, fontSize: 13, marginTop: 6 }}>{g.blurb}</div>
            <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 12 }}>
              <div><span style={{ color: GALAXY.textMuted }}>Featured quest:</span> {world.questPrompt}</div>
              {world.bossName && <div><span style={{ color: GALAXY.textMuted }}>Boss:</span> {world.bossName}</div>}
              <div><span style={{ color: GALAXY.textMuted }}>Card prompt:</span> {world.cardPrompt}</div>
              <div><span style={{ color: GALAXY.textMuted }}>GSE:</span> {world.gsePrompt}</div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
              {g.status === "live" ? (
                <Link href={g.id === "cards" ? "/galaxy/vault" : "/galaxy/war-room"} style={{ color: g.accent, fontSize: 13, fontWeight: 700 }}>
                  Enter {g.name} →
                </Link>
              ) : (
                <span style={{ color: GALAXY.textMuted, fontSize: 12 }}>Season portal opens with the schedule.</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </GalaxyShell>
  );
}
