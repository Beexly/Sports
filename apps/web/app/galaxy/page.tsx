import type { Metadata } from "next";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/shell";
import { DISTRICTS, GALAXY, GALAXY_CITY_GAME_URL } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { DailyClaim } from "@/components/galaxy/daily-claim";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galaxy Dynasty — The Campus",
  description:
    "The playable layer of Galaxy Sports Edge. Build a sports-intelligence career: run Signal Checks, level your Sports IQ, collect cards, lead a Crew.",
  alternates: { canonical: "/galaxy" },
};

export default async function GalaxyCampusPage() {
  const profile = await getCurrentProfileView();

  return (
    <GalaxyShell profile={profile}>
      {/* Hero */}
      <section style={{ marginBottom: 30 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
          ROOKIE SEASON
        </div>
        <h1
          style={{
            fontSize: 44,
            lineHeight: 1.05,
            margin: "8px 0 10px",
            fontFamily: "var(--f-display, sans-serif)",
          }}
        >
          Start your sports-intelligence <span style={{ color: GALAXY.gold }}>career</span>.
        </h1>
        <p style={{ color: GALAXY.textMuted, maxWidth: 640, fontSize: 17 }}>
          Galaxy Dynasty turns sports knowledge into power. Every Signal Check is a
          prediction plus a stated confidence — the GSE engine grades it, and your
          Sports IQ levels on <strong style={{ color: GALAXY.text }}>calibration</strong>,
          not luck.
        </p>
        {!profile && (
          <Link
            href="/galaxy/onboarding"
            style={{
              display: "inline-block",
              marginTop: 16,
              background: GALAXY.gold,
              color: GALAXY.void,
              padding: "12px 22px",
              borderRadius: 10,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Create your Galaxy Profile →
          </Link>
        )}
      </section>

      {/* Live playable game — the first 3D incarnation of the world */}
      <a
        href={GALAXY_CITY_GAME_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          marginBottom: 26,
          textDecoration: "none",
          borderRadius: 16,
          padding: 22,
          border: `1px solid ${GALAXY.gold}55`,
          background: `radial-gradient(70% 120% at 15% 0%, ${GALAXY.deepBlue}33, transparent 60%), radial-gradient(60% 100% at 90% 0%, ${GALAXY.gold}1f, transparent 60%), ${GALAXY.panel}`,
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 800 }}>
          ▶ PLAY NOW · LIVE 3D ARCADE
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6, fontFamily: "var(--f-display, sans-serif)" }}>
          Galaxy City
        </div>
        <div style={{ color: GALAXY.textMuted, marginTop: 4, maxWidth: 620 }}>
          Drive a glowing hover-car through the neon night sports-city and collect the
          Signals before the clock runs out. Plays in your browser — no download.
        </div>
        <span
          style={{
            display: "inline-block",
            marginTop: 12,
            background: GALAXY.gold,
            color: GALAXY.void,
            padding: "9px 18px",
            borderRadius: 9,
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          Launch Galaxy City →
        </span>
      </a>

      {profile && <FirstSessionChecklist profile={profile} />}

      {/* Campus districts */}
      <h2 style={{ fontSize: 13, letterSpacing: 1.5, color: GALAXY.textMuted, marginTop: 8 }}>
        THE GALAXY CAMPUS
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
          marginTop: 12,
        }}
      >
        {DISTRICTS.map((d) => (
          <Link
            key={d.id}
            href={d.href}
            style={{
              display: "block",
              background: GALAXY.panel,
              border: `1px solid ${GALAXY.border}`,
              borderRadius: 14,
              padding: 18,
              textDecoration: "none",
              color: GALAXY.text,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: `${d.accent}22`,
                border: `1px solid ${d.accent}66`,
                marginBottom: 12,
              }}
            />
            <div style={{ fontWeight: 800, fontSize: 17 }}>{d.name}</div>
            <div style={{ color: GALAXY.textMuted, fontSize: 13, marginTop: 4 }}>{d.tagline}</div>
          </Link>
        ))}
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
    { label: "Cleared The Public Trap", done: profile.bossCleared.includes("public_trap") },
    { label: "Merch entitlement unlocked", done: profile.merch.length > 0 },
    { label: "Joined a Crew", done: profile.crew != null },
  ];
  return (
    <section
      style={{
        background: GALAXY.panel,
        border: `1px solid ${GALAXY.border}`,
        borderRadius: 14,
        padding: 18,
        marginBottom: 26,
      }}
    >
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
