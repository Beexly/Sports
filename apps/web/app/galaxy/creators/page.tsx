import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { SignalCheckCard } from "@/components/galaxy/signal-check-card";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { CREATOR_CHALLENGES, getCreatorChallenge, getWarRoomScenario } from "@/lib/galaxy/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Creator Gauntlet — Challenge Boards",
  description: "Curated challenge sets from the community. Run a gauntlet of Signal Checks.",
  alternates: { canonical: "/galaxy/creators" },
};

export default async function CreatorsPage({ searchParams }: { searchParams: { run?: string } }) {
  const profile = await getCurrentProfileView();
  const active = searchParams.run ? getCreatorChallenge(searchParams.run) : null;

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.violet, fontWeight: 700 }}>
        CREATOR ROW — THE GAUNTLET
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Challenge boards
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        Curated gauntlets — a set of Signal Checks authored as a challenge. Clear
        the set to earn calibration reps and Season Points. (Open creator
        submissions arrive with the moderation pipeline in a later stage.)
      </p>

      {active ? (
        <div style={{ marginTop: 16, maxWidth: 720 }}>
          <p style={{ marginBottom: 12 }}>
            <a href="/galaxy/creators" style={{ color: GALAXY.cyan }}>← All gauntlets</a>
          </p>
          <h2 style={{ fontSize: 22, margin: "0 0 4px" }}>{active.title}</h2>
          <p style={{ color: GALAXY.textMuted, marginTop: 0 }}>by @{active.creator} — {active.blurb}</p>
          <div style={{ display: "grid", gap: 18, marginTop: 12 }}>
            {active.scenarioIds.map((sid) => {
              const s = getWarRoomScenario(sid);
              if (!s) return null;
              return (
                <SignalCheckCard
                  key={sid}
                  surface="WAR_ROOM"
                  scenarioId={s.id}
                  title={`${s.awayTeam} @ ${s.homeTeam}`}
                  context={`${s.context} ${s.market}.`}
                  optionA={{ key: "A", label: s.options[0].label }}
                  optionB={{ key: "B", label: s.options[1].label }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 14, marginTop: 18 }}>
          {CREATOR_CHALLENGES.map((c) => (
            <a
              key={c.id}
              href={`/galaxy/creators?run=${c.id}`}
              style={{ display: "block", background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 18, textDecoration: "none", color: GALAXY.text }}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 2 }}>by @{c.creator}</div>
              <div style={{ color: GALAXY.textMuted, fontSize: 13, marginTop: 8 }}>{c.blurb}</div>
              <div style={{ fontSize: 12, color: GALAXY.gold, marginTop: 10 }}>
                {c.scenarioIds.length} reps · {c.rewardLabel}
              </div>
            </a>
          ))}
        </div>
      )}
    </GalaxyShell>
  );
}
