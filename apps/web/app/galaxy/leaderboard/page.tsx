import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView, getCurrentProfileId } from "@/lib/galaxy/session";
import { leaderboard } from "@/lib/galaxy/duel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranked Ladder — Signal Cup",
  description: "The skill-tiered Galaxy Dynasty ladder. Climb by winning Signal Duels.",
  alternates: { canonical: "/galaxy/leaderboard" },
};

const tierColor = (tier: string) =>
  tier === "Legend" ? GALAXY.gold : tier === "Elite" ? GALAXY.magenta : tier === "Sharp" ? GALAXY.cyan : GALAXY.textMuted;

export default async function LeaderboardPage() {
  const profile = await getCurrentProfileView();
  const profileId = await getCurrentProfileId();
  const rows = await leaderboard(profileId ?? undefined);

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        RANKED LADDER
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Signal Cup standings
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 640, marginTop: 0 }}>
        Skill-tiered: casuals climb against casuals. Ratings move on Signal Duel
        results — beat stronger reads, gain more. Ghost profiles seed the ladder.
      </p>

      <div style={{ marginTop: 16, border: `1px solid ${GALAXY.border}`, borderRadius: 12, overflow: "hidden" }}>
        {rows.map((r) => (
          <div
            key={`${r.rank}-${r.handle}`}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 90px 90px",
              alignItems: "center",
              padding: "10px 14px",
              borderTop: r.rank === 1 ? "none" : `1px solid ${GALAXY.border}`,
              background: r.isYou ? `${GALAXY.gold}12` : "transparent",
            }}
          >
            <span style={{ color: GALAXY.textMuted, fontWeight: 700 }}>{r.rank}</span>
            <span style={{ color: GALAXY.text }}>
              {r.isGhost ? (
                <>@{r.handle} <span style={{ fontSize: 11, color: GALAXY.textMuted }}>(Ghost)</span></>
              ) : (
                <a href={`/galaxy/u/${encodeURIComponent(r.handle)}`} style={{ color: GALAXY.text }}>@{r.handle}</a>
              )}
              {r.isYou && <span style={{ fontSize: 11, color: GALAXY.gold }}> · you</span>}
              <span style={{ fontSize: 11, color: GALAXY.textMuted }}> · {r.archetype}</span>
            </span>
            <span style={{ color: tierColor(r.tier), fontWeight: 700, fontSize: 13 }}>{r.tier}</span>
            <span style={{ color: GALAXY.text, fontWeight: 800, textAlign: "right" }}>{r.rating}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <a href="/galaxy/duel" style={{ color: GALAXY.cyan }}>Enter a Signal Duel →</a>
        <a href="/galaxy/season" style={{ color: GALAXY.cyan }}>Chase a seasonal title →</a>
      </div>
    </GalaxyShell>
  );
}
