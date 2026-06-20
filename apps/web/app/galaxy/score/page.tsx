import type { Metadata } from "next";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { getGalaxyScoreFor } from "@/lib/galaxy/score";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galaxy Score — Your Identity",
  description: "One transparent number for your whole sports life. See the breakdown.",
  alternates: { canonical: "/galaxy/score" },
};

export default async function ScorePage() {
  const profile = await getCurrentProfileView();

  if (!profile) {
    return (
      <GalaxyShell profile={null}>
        <h1 style={{ fontFamily: "var(--f-display, sans-serif)" }}>Galaxy Score</h1>
        <p style={{ color: GALAXY.textMuted }}>
          Your Galaxy Score is one number for your whole sports identity. Create your
          profile to start building it.
        </p>
        <Link href="/galaxy/onboarding" style={{ color: GALAXY.cyan }}>Create your Galaxy Profile →</Link>
      </GalaxyShell>
    );
  }

  const score = await getGalaxyScoreFor(profile);

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>GALAXY SCORE</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 56, fontWeight: 900, color: GALAXY.gold, fontFamily: "var(--f-display, sans-serif)", lineHeight: 1 }}>
          {score.total}
        </span>
        <span style={{ fontSize: 18, color: GALAXY.textMuted }}>/ {score.max}</span>
        <span style={{ fontSize: 16, color: GALAXY.cyan, fontWeight: 700 }}>{score.tier}</span>
      </div>
      <p style={{ color: GALAXY.textMuted, maxWidth: 640 }}>
        One number for your whole sports life — calibration first, then skill,
        competition, contribution, and consistency. Reckless volume doesn&apos;t move
        it. Here&apos;s exactly how it&apos;s built:
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 16, maxWidth: 640 }}>
        {score.components.map((c) => {
          const pct = c.max > 0 ? Math.round((c.points / c.max) * 100) : 0;
          return (
            <div key={c.key} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <strong style={{ color: GALAXY.text }}>{c.label}</strong>
                <span style={{ color: GALAXY.gold, fontWeight: 700 }}>{c.points} / {c.max}</span>
              </div>
              <div style={{ height: 6, background: GALAXY.border, borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GALAXY.deepBlue}, ${GALAXY.gold})` }} />
              </div>
              <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 6 }}>{c.detail}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        <Link href="/galaxy/duel" style={cta(GALAXY.gold)}>Raise PvP →</Link>
        <Link href="/galaxy/depths" style={cta(GALAXY.magenta)}>Clear a boss</Link>
        <Link href="/galaxy/season" style={cta(GALAXY.cyan)}>Season Cup</Link>
      </div>
    </GalaxyShell>
  );
}

function cta(accent: string): React.CSSProperties {
  return { padding: "10px 16px", borderRadius: 10, border: `1px solid ${accent}66`, background: `${accent}14`, color: GALAXY.text, textDecoration: "none", fontWeight: 700, fontSize: 14 };
}
