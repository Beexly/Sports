import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { SignalCheckCard } from "@/components/galaxy/signal-check-card";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { WAR_ROOM_SCENARIOS, ACADEMY_FIRST_CHECK } from "@/lib/galaxy/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The War Room — Signal Checks",
  description:
    "Make confidence-scored reads. The GSE engine grades each one and your Sports IQ levels on calibration.",
  alternates: { canonical: "/galaxy/war-room" },
};

export default async function WarRoomPage({
  searchParams,
}: {
  searchParams: { academy?: string };
}) {
  const profile = await getCurrentProfileView();
  const academyMode = searchParams.academy === "1";

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        {academyMode ? "THE ACADEMY" : "THE WAR ROOM"}
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        {academyMode ? "Your first Signal Check" : "Read the board"}
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        {academyMode
          ? "One lesson before the War Room: read the number, not the narrative. State your confidence honestly — that's what levels your Sports IQ."
          : "Each scenario is a real game the GSE engine settles. Pick a side, state your confidence, and the engine grades both your read and your calibration."}
      </p>

      <div style={{ display: "grid", gap: 18, marginTop: 18, maxWidth: 720 }}>
        {academyMode && (
          <SignalCheckCard
            surface="ACADEMY"
            title="Academy — Lesson 1"
            context={ACADEMY_FIRST_CHECK.prompt}
            optionA={{ key: "A", label: ACADEMY_FIRST_CHECK.optionA }}
            optionB={{ key: "B", label: ACADEMY_FIRST_CHECK.optionB }}
            reveal={ACADEMY_FIRST_CHECK.explanation}
          />
        )}

        {!academyMode &&
          WAR_ROOM_SCENARIOS.map((s) => (
            <SignalCheckCard
              key={s.id}
              surface="WAR_ROOM"
              scenarioId={s.id}
              title={`${s.awayTeam} @ ${s.homeTeam}`}
              context={`${s.context} ${s.market}.`}
              optionA={{ key: "A", label: s.options[0].label }}
              optionB={{ key: "B", label: s.options[1].label }}
            />
          ))}
      </div>

      {academyMode && (
        <p style={{ marginTop: 18 }}>
          <a href="/galaxy/war-room" style={{ color: GALAXY.cyan }}>
            Continue to the full War Room →
          </a>
        </p>
      )}
    </GalaxyShell>
  );
}
