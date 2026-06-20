import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { getFactionStandings } from "@/lib/galaxy/factions";
import { crestSvg } from "@/lib/galaxy/assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Faction War — Standings",
  description: "Every read feeds your faction. Live faction standings across the Galaxy.",
  alternates: { canonical: "/galaxy/factions" },
};

export default async function FactionsPage() {
  const profile = await getCurrentProfileView();
  const standings = await getFactionStandings();
  const yours = profile?.faction;

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.violet, fontWeight: 700 }}>
        FACTION WAR
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Standings
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 640, marginTop: 0 }}>
        Every Signal Check and duel feeds your faction&apos;s power — average skill
        plus size. Climb the board for your colors.
        {yours && <span style={{ color: GALAXY.cyan }}> You ride with the {profile!.factionName}.</span>}
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 18, maxWidth: 720 }}>
        {standings.map((s) => (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: "36px 56px 1fr 100px 90px",
              alignItems: "center",
              gap: 12,
              background: s.id === yours ? `${s.accent}14` : GALAXY.panel,
              border: `1px solid ${s.id === yours ? `${s.accent}66` : GALAXY.border}`,
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <span style={{ color: GALAXY.textMuted, fontWeight: 700 }}>{s.rank}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={crestSvg(s.id)} alt="" width={44} height={44} />
            <span>
              <div style={{ color: GALAXY.text, fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: GALAXY.textMuted }}>{s.creed}</div>
            </span>
            <span style={{ fontSize: 12, color: GALAXY.textMuted }}>
              {s.members} member{s.members === 1 ? "" : "s"} · {s.tier}
            </span>
            <span style={{ color: s.accent, fontWeight: 800, textAlign: "right" }}>{s.power}</span>
          </div>
        ))}
      </div>
    </GalaxyShell>
  );
}
