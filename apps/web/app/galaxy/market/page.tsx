import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { MarketPanel } from "@/components/galaxy/market-panel";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView, getCurrentProfileId } from "@/lib/galaxy/session";
import { STARTER_CARDS } from "@/lib/galaxy/content";
import { listTradeOffers, listWatchedSlugs } from "@/lib/galaxy/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Vault Market — Watchlist & Trades (prototype)",
  description:
    "Watch cards and post card-for-card trade offers. No currency, no cash, no custody — a Stage-2 prototype.",
  alternates: { canonical: "/galaxy/market" },
};

export default async function MarketPage() {
  const profile = await getCurrentProfileView();
  const profileId = await getCurrentProfileId();

  const cards =
    profile && profile.cards.length > 0
      ? profile.cards.map((c) => ({ slug: c.slug, name: c.name }))
      : STARTER_CARDS.map((c) => ({ slug: c.slug, name: c.name }));

  const watched = profileId ? await listWatchedSlugs(profileId) : [];
  const offers = await listTradeOffers();

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        THE VAULT MARKET — PROTOTYPE
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Watch & trade
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        Track card value and propose card-for-card trades. This is a prototype:
        no currency changes hands, no cash, no physical custody. The full
        marketplace with settlement is Stage 3 (partner-gated).
      </p>
      <div style={{ marginTop: 18, maxWidth: 760 }}>
        <MarketPanel cards={cards} watched={watched} offers={offers} canAct={profileId != null} />
      </div>
    </GalaxyShell>
  );
}
