import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { CrewPanel } from "@/components/galaxy/crew-panel";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { PREVIEW_CREWS, listCrews } from "@/lib/galaxy/crew";

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
        <div
          style={{
            background: `${GALAXY.violet}14`,
            border: `1px solid ${GALAXY.violet}55`,
            borderRadius: 12,
            padding: 14,
            marginTop: 14,
            marginBottom: 18,
          }}
        >
          You&apos;re in <strong>{profile.crew.name}</strong> [{profile.crew.tag}] as{" "}
          {profile.crew.role?.toLowerCase()} · {profile.crew.memberCount} members.
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <CrewPanel previews={previews} />
      </div>
    </GalaxyShell>
  );
}
