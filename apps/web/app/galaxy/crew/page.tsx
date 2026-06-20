import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { CrewPanel } from "@/components/galaxy/crew-panel";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { PREVIEW_CREWS, listCrews } from "@/lib/galaxy/crew";
import { getCrewClashState } from "@/lib/galaxy/crew-clash";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crews — Build a Legacy together",
  description: "Form or join a Crew. Shared boards and clubhouses (preview).",
  alternates: { canonical: "/galaxy/crew" },
};

export default async function CrewPage() {
  const profile = await getCurrentProfileView();
  const live = await listCrews();
  const previews =
    live.length > 0
      ? live.map((c) => ({
          name: c.name,
          tag: c.tag,
          motto: c.motto ?? "",
          faction: c.faction ?? "—",
          memberCount: c.memberCount,
        }))
      : PREVIEW_CREWS.map((c) => ({ ...c }));

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.violet, fontWeight: 700 }}>CREWS</div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Build a Legacy together
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        A Crew is your home base — a shared board and a clubhouse (preview this
        season). Form one as Captain or preview the Crews already taking shape.
      </p>

      {profile?.crew && (
        <CrewClashCard crewId={profile.crew.id} crewName={profile.crew.name} tag={profile.crew.tag} role={profile.crew.role} members={profile.crew.memberCount} />
      )}

      <div style={{ marginTop: 18 }}>
        <CrewPanel previews={previews} />
      </div>
    </GalaxyShell>
  );
}

async function CrewClashCard({
  crewId,
  crewName,
  tag,
  role,
  members,
}: {
  crewId: string;
  crewName: string;
  tag: string;
  role: "CAPTAIN" | "MEMBER" | null;
  members: number;
}) {
  const clash = await getCrewClashState(crewId);
  const verdictColor =
    clash.verdict === "ahead" ? GALAXY.cyan : clash.verdict === "behind" ? GALAXY.magenta : GALAXY.textMuted;
  return (
    <div
      style={{
        background: `${GALAXY.violet}14`,
        border: `1px solid ${GALAXY.violet}55`,
        borderRadius: 12,
        padding: 16,
        marginTop: 14,
        marginBottom: 18,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        You&apos;re in <strong>{crewName}</strong> [{tag}] as {role?.toLowerCase()} · {members} members.
      </div>
      <div style={{ fontSize: 12, letterSpacing: 1.2, color: GALAXY.textMuted }}>CREW CLASH</div>
      <div style={{ display: "flex", gap: 18, alignItems: "baseline", marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: GALAXY.text }}>
          {clash.clashPower} <span style={{ fontSize: 13, color: GALAXY.textMuted }}>clash power</span>
        </span>
        <span style={{ color: GALAXY.textMuted }}>vs {clash.rivalName} {clash.rivalPower}</span>
        <span style={{ color: verdictColor, fontWeight: 700, textTransform: "uppercase", fontSize: 13 }}>
          {clash.verdict}
        </span>
      </div>
      <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 6 }}>
        Built from {clash.reps} graded reps across the Crew{clash.avgCalibration != null ? ` · avg calibration ${clash.avgCalibration}/100` : ""}. Run more Signal Checks to raise it.
      </div>
    </div>
  );
}
