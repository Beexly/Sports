import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { SeasonClaimButton } from "@/components/galaxy/season-claim";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { SEASON_TIERS, CURRENT_SEASON_NAME } from "@sports/galaxy-engine";

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
    </GalaxyShell>
  );
}
