import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { SignalCheckCard } from "@/components/galaxy/signal-check-card";
import { SignalSprint } from "@/components/galaxy/signal-sprint";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { BLACKTOP_QUESTIONS, SIGNAL_SPRINT_QUESTIONS } from "@/lib/galaxy/content";

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
