import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { DuelArena } from "@/components/galaxy/duel-arena";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView, getCurrentProfileId } from "@/lib/galaxy/session";
import { WAR_ROOM_SCENARIOS } from "@/lib/galaxy/content";
import { listOpenDuels } from "@/lib/galaxy/duel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signal Duel — Ranked PvP",
  description:
    "Read the same game as your rival. Scored on outcome, calibration, and process. Climb the ranked ladder.",
  alternates: { canonical: "/galaxy/duel" },
};

export default async function DuelPage() {
  const profile = await getCurrentProfileView();
  const profileId = await getCurrentProfileId();
  const openDuels = (await listOpenDuels(profileId ?? undefined)).map((d) => ({
    id: d.id,
    prompt: d.prompt,
    creatorHandle: d.creatorHandle,
  }));

  const scenarios = WAR_ROOM_SCENARIOS.map((s) => ({
    id: s.id,
    matchup: `${s.awayTeam} @ ${s.homeTeam}`,
    market: s.market,
    optionA: s.options[0].label,
    optionB: s.options[1].label,
  }));

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        THE PROVING GROUNDS — SIGNAL DUEL
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Ranked PvP
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 680, marginTop: 0 }}>
        You and a rival read the same game. The engine grades both on outcome,
        calibration, and process — higher duel score wins, ties break to the
        better-calibrated read. Duel a Ghost any time, or post an open duel.
        {profile && (
          <span style={{ color: GALAXY.cyan }}> Your rating: {profile.rating} ({profile.ratingTier}).</span>
        )}
      </p>
      <p style={{ marginTop: 0 }}>
        <a href="/galaxy/leaderboard" style={{ color: GALAXY.cyan, fontSize: 14 }}>
          View the ranked ladder →
        </a>
      </p>
      <div style={{ marginTop: 14, maxWidth: 760 }}>
        <DuelArena scenarios={scenarios} openDuels={openDuels} />
      </div>
    </GalaxyShell>
  );
}
