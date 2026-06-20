import type { Metadata } from "next";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { DISTRICTS } from "@sports/galaxy-engine";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { getGalaxyWorldState, getRecommendedRoute } from "@/lib/galaxy/world-state";
import { DailyClaim } from "@/components/galaxy/daily-claim";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galaxy Dynasty — The Campus",
  description:
    "The command map for a living sports world. Real sports weather shifts the Campus daily; every room feeds one sports-intelligence identity.",
  alternates: { canonical: "/galaxy" },
};

export default async function GalaxyCampusPage() {
  const profile = await getCurrentProfileView();
  const world = getGalaxyWorldState();
  const route = getRecommendedRoute(world, profile);
  const affected = new Set(world.affectedDistricts.map((d) => d.id));

  return (
    <GalaxyShell profile={profile}>
      {/* Hero */}
      <section style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
          THE CAMPUS · LIVING SPORTS WORLD
        </div>
        <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: "8px 0 10px", fontFamily: "var(--f-display, sans-serif)" }}>
          Your <span style={{ color: GALAXY.gold }}>sports life</span>, one persistent world.
        </h1>
        <p style={{ color: GALAXY.textMuted, maxWidth: 660, fontSize: 16 }}>
          Galaxy Dynasty isn&apos;t one map — it&apos;s a connected sports world that
          shifts with the real games. Every room feeds one identity: your Sports IQ,
          Galaxy Score, cards, crew, and faction.
        </p>
        {!profile && (
          <Link href="/galaxy/onboarding" style={{ display: "inline-block", marginTop: 14, background: GALAXY.gold, color: GALAXY.void, padding: "12px 22px", borderRadius: 10, fontWeight: 800, textDecoration: "none" }}>
            Create your Galaxy Profile →
          </Link>
        )}
      </section>

      {/* Sports weather — the live world layer */}
      <section
        style={{
          borderRadius: 16,
          padding: 18,
          marginBottom: 18,
          border: `1px solid ${world.accent}55`,
          background: `radial-gradient(70% 130% at 12% 0%, ${world.accent}26, transparent 60%), ${GALAXY.panel}`,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.6, color: world.accent, fontWeight: 800 }}>
          ◆ TODAY&apos;S SPORTS WEATHER
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, fontFamily: "var(--f-display, sans-serif)" }}>
          {world.weatherName}
        </div>
        <div style={{ color: GALAXY.textMuted, marginTop: 4, maxWidth: 680 }}>{world.summary}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {world.affectedDistricts.map((d) => (
            <Link key={d.id} href={d.href} style={{ fontSize: 12, color: GALAXY.text, textDecoration: "none", border: `1px solid ${GALAXY.border}`, borderRadius: 999, padding: "4px 12px" }}>
              {d.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Where should I go next? — the decision helper */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 13, letterSpacing: 1.5, color: GALAXY.textMuted }}>WHERE TO GO NEXT</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 10, marginTop: 8 }}>
          {route.map((s, i) => (
            <Link key={i} href={s.href} style={{ display: "block", textDecoration: "none", color: GALAXY.text, background: GALAXY.panel, border: `1px solid ${s.accent}55`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: s.accent, fontWeight: 800, letterSpacing: 0.5 }}>
                STEP {i + 1}{s.done ? " · DONE" : ""}
              </div>
              <div style={{ fontWeight: 800, marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 4 }}>{s.detail}</div>
            </Link>
          ))}
        </div>
      </section>

      {profile && <FirstSessionChecklist profile={profile} />}

      {/* Campus districts (world graph) */}
      <h2 style={{ fontSize: 13, letterSpacing: 1.5, color: GALAXY.textMuted, marginTop: 8 }}>
        THE GALAXY CAMPUS · {DISTRICTS.length} DISTRICTS
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14, marginTop: 12 }}>
        {DISTRICTS.map((d) => {
          const hot = affected.has(d.id);
          return (
            <Link
              key={d.id}
              href={d.href}
              data-testid={d.testId}
              style={{
                display: "block",
                background: GALAXY.panel,
                border: `1px solid ${hot ? `${world.accent}88` : GALAXY.border}`,
                borderRadius: 14,
                padding: 18,
                textDecoration: "none",
                color: GALAXY.text,
                position: "relative",
              }}
            >
              {hot && (
                <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 800, color: world.accent, border: `1px solid ${world.accent}66`, borderRadius: 999, padding: "2px 8px" }}>
                  HOT
                </span>
              )}
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${d.accent}22`, border: `1px solid ${d.accent}66`, marginBottom: 12 }} />
              <div style={{ fontWeight: 800, fontSize: 17 }}>{d.name}</div>
              <div style={{ color: GALAXY.textMuted, fontSize: 13, marginTop: 4 }}>{d.tagline}</div>
              <div style={{ fontSize: 12, color: d.accent, marginTop: 10, fontWeight: 700 }}>{d.primaryAction} →</div>
              <div style={{ fontSize: 11, color: GALAXY.textMuted, marginTop: 4 }}>Earn: {d.reward}</div>
            </Link>
          );
        })}
      </div>
    </GalaxyShell>
  );
}

function FirstSessionChecklist({
  profile,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfileView>>>;
}) {
  const nflSkill = profile.skills.find((s) => s.sportKey === "americanfootball_nfl");
  const items: { label: string; done: boolean }[] = [
    { label: "Profile created", done: profile.onboarded },
    { label: "Starter cards in the Vault", done: profile.cards.length > 0 },
    { label: "First War Room read", done: (nflSkill?.gradedCount ?? 0) > 0 || profile.characterXp > 0 },
    { label: "Cleared a Depths boss", done: profile.bossCleared.length > 0 },
    { label: "Merch entitlement unlocked", done: profile.merch.length > 0 },
    { label: "Joined a Crew", done: profile.crew != null },
  ];
  return (
    <section style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 18, marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, letterSpacing: 1.5, color: GALAXY.gold, fontWeight: 700 }}>
          ROOKIE SEASON — FIRST SESSION
        </div>
        <DailyClaim streak={profile.dailyStreak} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 8, marginTop: 12 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <span style={{ color: it.done ? GALAXY.cyan : GALAXY.textMuted }}>{it.done ? "✓" : "○"}</span>
            <span style={{ color: it.done ? GALAXY.text : GALAXY.textMuted }}>{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
