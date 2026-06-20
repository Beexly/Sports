import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { CrewPanel } from "@/components/galaxy/crew-panel";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { PREVIEW_CREWS, listCrews, getCrewDetail, crewLeaderboard } from "@/lib/galaxy/crew";
import { getCrewClashState } from "@/lib/galaxy/crew-clash";
import { getRaidView } from "@/lib/galaxy/raid";
import { CrewLanePicker } from "@/components/galaxy/crew-lane-picker";
import { CREW_ROLES } from "@sports/galaxy-engine";

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

      {profile?.crew && <CrewRaidCard crewId={profile.crew.id} />}

      {profile?.crew && (
        <div style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted }}>YOUR CREW LANE</h2>
          <p style={{ fontSize: 13, color: GALAXY.textMuted, marginTop: 0 }}>
            Everyone gets a job. Pick a lane and own its weekly mission.
          </p>
          <CrewLanePicker crewId={profile.crew.id} currentLane={null} />
          <CrewDetailSection crewId={profile.crew.id} />
        </div>
      )}

      {/* Role board — what each lane does */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 26 }}>CREW ROLES</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 10 }}>
        {CREW_ROLES.map((r) => (
          <div key={r.id} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, color: GALAXY.text }}>{r.name}</div>
            <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 2 }}>{r.blurb}</div>
            <div style={{ fontSize: 12, color: GALAXY.violet, marginTop: 6 }}>{r.weeklyMission}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 26 }}>
        <CrewPanel previews={previews} />
      </div>

      <CrewLeaderboardSection />
    </GalaxyShell>
  );
}

async function CrewDetailSection({ crewId }: { crewId: string }) {
  const detail = await getCrewDetail(crewId);
  if (!detail) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{detail.name} [{detail.tag}]</h3>
        <span style={{ color: GALAXY.gold, fontWeight: 700 }}>Crew XP {detail.crewXp.toLocaleString()}</span>
        <span style={{ color: GALAXY.textMuted, fontSize: 13 }}>{detail.members.length} members</span>
      </div>
      {detail.members.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8, marginTop: 10 }}>
          {detail.members.map((m) => (
            <div key={m.handle} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 13 }}>
              <strong style={{ color: GALAXY.text }}>@{m.handle}</strong>
              <span style={{ color: GALAXY.textMuted }}> · {m.lane ?? m.role.toLowerCase()}</span>
              <div style={{ fontSize: 11, color: GALAXY.textMuted }}>Season {m.seasonPoints}pt · rating {m.rating}</div>
            </div>
          ))}
        </div>
      )}
      {detail.signalBoard.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, color: GALAXY.textMuted, marginTop: 16 }}>CREW SIGNAL BOARD</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {detail.signalBoard.map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: GALAXY.textMuted }}>
                <strong style={{ color: GALAXY.text }}>@{e.handle}</strong> ran a {e.surface.toLowerCase()} check —{" "}
                <span style={{ color: e.result === "WIN" ? GALAXY.cyan : e.result === "LOSS" ? GALAXY.magenta : GALAXY.textMuted }}>{e.result}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ marginTop: 12, fontSize: 12, color: GALAXY.textMuted }}>
        Clubhouse customization unlocks with crew XP (coming next stage).
      </div>
    </div>
  );
}

async function CrewRaidCard({ crewId }: { crewId: string }) {
  const raid = await getRaidView(crewId);
  if (!raid) return null;
  return (
    <div style={{ marginTop: 16, background: `${GALAXY.magenta}10`, border: `1px solid ${GALAXY.magenta}44`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 12, letterSpacing: 1.2, color: GALAXY.magenta, fontWeight: 700 }}>
        CREW RAID · THIS WEEK
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6, flexWrap: "wrap" }}>
        <strong style={{ color: GALAXY.text, fontSize: 18 }}>{raid.bossName}</strong>
        <span style={{ color: raid.cleared ? GALAXY.cyan : GALAXY.textMuted, fontWeight: 700 }}>
          {raid.cleared ? "CLEARED ✓" : `${raid.progress} / ${raid.goal}`}
        </span>
      </div>
      <div style={{ height: 8, background: GALAXY.border, borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
        <div style={{ width: `${raid.pct}%`, height: "100%", background: `linear-gradient(90deg, ${GALAXY.magenta}, ${GALAXY.gold})` }} />
      </div>
      <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 8 }}>
        Every crew member who resists the boss fills the bar. Clear it together to unlock the raid banner.
      </div>
      <a href="/galaxy/depths" style={{ display: "inline-block", marginTop: 8, color: GALAXY.cyan, fontSize: 13 }}>
        Fight {raid.bossName} in The Depths →
      </a>
      {raid.contributors.length > 0 && (
        <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 8 }}>
          Top contributors: {raid.contributors.slice(0, 3).map((c) => `@${c.handle} (${c.resists})`).join(", ")}
        </div>
      )}
    </div>
  );
}

async function CrewLeaderboardSection() {
  const rows = await crewLeaderboard();
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted }}>CREW LEADERBOARD</h2>
      <div style={{ display: "grid", gap: 6 }}>
        {rows.map((c, i) => (
          <div key={c.tag} style={{ display: "flex", justifyContent: "space-between", background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: "8px 14px", fontSize: 14 }}>
            <span><strong style={{ color: GALAXY.textMuted }}>{i + 1}</strong> {c.name} [{c.tag}] · {c.memberCount} members</span>
            <span style={{ color: GALAXY.gold, fontWeight: 700 }}>{c.crewXp.toLocaleString()} XP</span>
          </div>
        ))}
      </div>
    </div>
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
