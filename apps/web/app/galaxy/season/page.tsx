import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { SeasonClaimButton } from "@/components/galaxy/season-claim";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { SEASON_TIERS, CURRENT_SEASON_NAME, objectivesByCadence, type ObjectiveCadence } from "@sports/galaxy-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signal Cup — Season Program",
  description: "Climb the seasonal track by running Signal Checks. Claim tier rewards.",
  alternates: { canonical: "/galaxy/season" },
};

export default async function SeasonPage() {
  const profile = await getCurrentProfileView();
  const points = profile?.seasonPoints ?? 0;
  const currentTier = profile?.seasonTier ?? 1;

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        {CURRENT_SEASON_NAME.toUpperCase()}
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Season Program
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        Every graded Signal Check earns Season Points. Climb the tiers and claim
        rewards — credits and cosmetics, never cash. Points come from real reps, not
        idle time.
        {profile && (
          <span style={{ color: GALAXY.cyan }}> You have {points} Season Points (Tier {currentTier}).</span>
        )}
      </p>

      <div style={{ marginTop: 18, display: "grid", gap: 10, maxWidth: 640 }}>
        {SEASON_TIERS.map((t) => {
          const reached = points >= t.pointsRequired;
          return (
            <div
              key={t.tier}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: GALAXY.panel,
                border: `1px solid ${reached ? `${GALAXY.gold}66` : GALAXY.border}`,
                borderRadius: 12,
                padding: "12px 16px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: reached ? GALAXY.gold : GALAXY.text }}>
                  Tier {t.tier} · {t.name}
                </div>
                <div style={{ fontSize: 12, color: GALAXY.textMuted }}>{t.rewardLabel}</div>
              </div>
              <div style={{ fontSize: 12, color: reached ? GALAXY.cyan : GALAXY.textMuted }}>
                {reached ? "Reached" : `${t.pointsRequired} pts`}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <SeasonClaimButton />
      </div>

      {/* Objective cadence — what to chase today / this week / this season */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 30 }}>
        WHAT TO CHASE
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 14 }}>
        {(["daily", "weekly", "seasonal"] as ObjectiveCadence[]).map((cadence) => (
          <div key={cadence} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.2, color: GALAXY.gold, fontWeight: 700, textTransform: "uppercase" }}>
              {cadence}
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {objectivesByCadence(cadence).map((o) => (
                <a key={o.id} href={o.href} style={{ textDecoration: "none", color: GALAXY.text }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14 }}>
                    <span>{o.label}</span>
                    {o.track === "pro" && (
                      <span style={{ fontSize: 10, color: GALAXY.cyan, border: `1px solid ${GALAXY.cyan}66`, borderRadius: 5, padding: "1px 5px", height: 16 }}>
                        PRO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: GALAXY.textMuted }}>{o.detail}</div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 10 }}>
        Pro objectives add deeper vision and tools — never an outcome advantage.
        Pro buys better instruments, not wins.
      </p>
    </GalaxyShell>
  );
}
