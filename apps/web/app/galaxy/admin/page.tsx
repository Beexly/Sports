import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { auth } from "@/lib/auth";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { getGalaxyMetrics } from "@/lib/galaxy/admin-metrics";
import { getGalaxyWorldState } from "@/lib/galaxy/world-state";
import { DISTRICTS, ROOM_REGISTRY, SPORTS_WEATHER, BLACKTOP_GAMES, GAME_KERNEL_BOSSES, GHOST_PRESENCE, NPCS, QUESTS } from "@sports/galaxy-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galaxy Engine — Owner Console",
  description: "Live-ops health: profiles, credits, calibration, PvM, conversions.",
  robots: { index: false, follow: false },
};

export default async function GalaxyAdminPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const profile = await getCurrentProfileView();

  if (!isAdmin) {
    return (
      <GalaxyShell profile={profile}>
        <h1 style={{ fontFamily: "var(--f-display, sans-serif)" }}>Owner Console</h1>
        <p style={{ color: GALAXY.textMuted }}>
          This is the Galaxy Engine owner console. Admin access is required.
        </p>
      </GalaxyShell>
    );
  }

  const m = await getGalaxyMetrics();
  const world = getGalaxyWorldState();

  const cards: { label: string; value: string; accent?: string }[] = [
    { label: "Profiles", value: m.profilesTotal.toLocaleString() },
    { label: "Onboarded", value: m.profilesOnboarded.toLocaleString() },
    { label: "Active (24h)", value: m.activeLast24h.toLocaleString() },
    { label: "Signal Checks", value: m.signalChecks.toLocaleString() },
    { label: "Avg calibration", value: m.avgCalibration != null ? `${m.avgCalibration}/100` : "—", accent: GALAXY.cyan },
    { label: "Quest completions", value: m.questCompletions.toLocaleString() },
    { label: "Credits issued", value: m.creditsIssued.toLocaleString(), accent: GALAXY.gold },
    { label: "Credit liability", value: m.creditLiability.toLocaleString(), accent: GALAXY.gold },
    { label: "Credits redeemed", value: `${m.creditsRedeemed} (closed loop)` },
    { label: "Boss attempts", value: m.bossAttempts.toLocaleString() },
    { label: "Boss clears", value: m.bossClears.toLocaleString(), accent: GALAXY.magenta },
    { label: "Duels", value: m.duels.toLocaleString() },
    { label: "Duels resolved", value: m.duelsResolved.toLocaleString() },
    { label: "Avg ladder rating", value: m.avgRating != null ? `${m.avgRating}` : "—", accent: GALAXY.cyan },
    { label: "Card watches", value: m.cardWatches.toLocaleString() },
    { label: "Trade offers", value: m.tradeOffers.toLocaleString() },
    { label: "Merch unlocks", value: m.merchUnlocks.toLocaleString() },
    { label: "Crews", value: m.crews.toLocaleString(), accent: GALAXY.violet },
    { label: "Brand gates", value: m.brandGatesEnforced ? "Enforced (CI)" : "FAILING", accent: m.brandGatesEnforced ? GALAXY.cyan : GALAXY.magenta },
    { label: "Higgsfield assets", value: `${m.higgsfieldAssetsGenerated} (briefs only)` },
    { label: "Rookie Plaza quests", value: QUESTS.length.toLocaleString(), accent: GALAXY.gold },
    { label: "Rookie Plaza NPCs", value: NPCS.length.toLocaleString(), accent: GALAXY.cyan },
    { label: "Ghost routes", value: GHOST_PRESENCE.length.toLocaleString(), accent: GALAXY.violet },
    { label: "Blacktop games", value: BLACKTOP_GAMES.length.toLocaleString(), accent: GALAXY.gold },
    { label: "PvM bosses", value: GAME_KERNEL_BOSSES.length.toLocaleString(), accent: GALAXY.magenta },
    { label: "Scene fallbacks", value: "tracked via rookie_plaza_presence_fallback" },
  ];

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.cyan, fontWeight: 700 }}>
        GALAXY ENGINE — OWNER CONSOLE
      </div>
      <h1 style={{ fontSize: 32, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Live-ops health
      </h1>
      {m.stubMode && (
        <p style={{ color: GALAXY.textMuted, fontSize: 13 }}>
          No database connected — metrics are zeroed. Connect Postgres + run the
          Galaxy migration to see live numbers.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 12, marginTop: 16 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: GALAXY.textMuted }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.accent ?? GALAXY.text, marginTop: 4 }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>World state</h2>
        <p style={{ fontSize: 14, color: GALAXY.text, margin: "4px 0" }}>
          Active sports weather: <strong style={{ color: world.accent }}>{world.weatherName}</strong>
          {world.bossName ? <> · featured boss: <strong>{world.bossName}</strong></> : null}
        </p>
        <p style={{ fontSize: 13, color: GALAXY.textMuted, margin: 0 }}>
          World graph: {DISTRICTS.length} districts · {ROOM_REGISTRY.length} room blueprints ·{" "}
          {SPORTS_WEATHER.length} weather states. Generated content stays owner-approval gated.
        </p>
      </div>

      <div style={{ marginTop: 16, background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Subscriptions (test mode)</h2>
        {Object.keys(m.subscriptionsByTier).length === 0 ? (
          <p style={{ color: GALAXY.textMuted, fontSize: 13 }}>No subscriptions recorded.</p>
        ) : (
          <ul style={{ color: GALAXY.text, fontSize: 14 }}>
            {Object.entries(m.subscriptionsByTier).map(([tier, n]) => (
              <li key={tier}>
                {tier}: {n}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p style={{ marginTop: 20, color: GALAXY.textMuted, fontSize: 12 }}>
        Generated content (Galaxy Engine v0) is owner-approval gated — nothing
        AI-proposed publishes without a human. Stripe is test-mode only.
      </p>
    </GalaxyShell>
  );
}
