import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { SignalCheckCard } from "@/components/galaxy/signal-check-card";
import { SignalSprint } from "@/components/galaxy/signal-sprint";
import { BlacktopArcade } from "@/components/galaxy/blacktop-arcade";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { BLACKTOP_QUESTIONS, SIGNAL_SPRINT_QUESTIONS } from "@/lib/galaxy/content";
import { BLACKTOP_GAMES } from "@sports/galaxy-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Blacktop — Quick Signal Checks",
  description: "Fast stat and concept reps. Pure grind, real XP.",
  alternates: { canonical: "/galaxy/blacktop" },
};

export default async function BlacktopPage() {
  const profile = await getCurrentProfileView();
  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        THE BLACKTOP
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Quick reps
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 640, marginTop: 0 }}>
        Stat and concept Signal Checks. Same engine, same calibration scoring —
        just faster. Grind your Sports IQ a few seconds at a time.
      </p>

      <div style={{ marginTop: 18, maxWidth: 760 }}>
        <BlacktopArcade prompts={BLACKTOP_GAMES[0]?.prompts ?? []} />
      </div>

      <div style={{ marginTop: 18, maxWidth: 720 }}>
        <SignalSprint
          questions={SIGNAL_SPRINT_QUESTIONS.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            optionA: q.optionA,
            optionB: q.optionB,
            tag: q.tag,
          }))}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 12, marginTop: 22 }}>
        {BLACKTOP_GAMES.map((game) => (
          <div key={game.id} style={{ background: GALAXY.panel, border: `1px solid ${game.mode === "playable" ? GALAXY.gold : GALAXY.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, color: game.mode === "playable" ? GALAXY.gold : GALAXY.textMuted, fontWeight: 800 }}>{game.mode.toUpperCase()}</div>
            <h2 style={{ margin: "4px 0", fontSize: 18 }}>{game.title}</h2>
            <p style={{ color: GALAXY.textMuted, fontSize: 13, margin: 0 }}>{game.rules.join(" · ")}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 26 }}>
        SINGLE REPS
      </h2>
      <div style={{ display: "grid", gap: 18, marginTop: 12, maxWidth: 720 }}>
        {BLACKTOP_QUESTIONS.map((q) => (
          <SignalCheckCard
            key={q.id}
            surface="BLACKTOP"
            questionId={q.id}
            title="Blacktop Signal Check"
            context={q.prompt}
            optionA={{ key: "A", label: q.optionA }}
            optionB={{ key: "B", label: q.optionB }}
            reveal={q.explanation}
          />
        ))}
      </div>
    </GalaxyShell>
  );
}
