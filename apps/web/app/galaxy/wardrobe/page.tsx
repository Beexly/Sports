import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { Wardrobe } from "@/components/galaxy/wardrobe";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView, getCurrentProfileId } from "@/lib/galaxy/session";
import { getWardrobe } from "@/lib/galaxy/cosmetics";
import { COSMETIC_CATEGORIES, COSMETICS_CATALOG } from "@sports/galaxy-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Locker — Wardrobe & Cosmetics",
  description: "Earn and equip kicks, outfits, emotes, anthems, frames, scenes, titles, and more. Cosmetics never affect outcomes.",
  alternates: { canonical: "/galaxy/wardrobe" },
};

export default async function WardrobePage() {
  const profile = await getCurrentProfileView();
  const profileId = await getCurrentProfileId();

  const raw =
    profile && profileId
      ? await getWardrobe(profileId, profile)
      : COSMETIC_CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.label,
          items: COSMETICS_CATALOG.filter((c) => c.category === cat.id).map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            source: c.source,
            rarity: c.rarity,
            description: c.description,
            novaPrice: c.novaPrice ?? null,
            owned: c.source === "starter",
            equipped: false,
            unlockable: false,
            requirementLabel: c.requirement && "label" in c.requirement ? c.requirement.label : null,
          })),
        })).filter((c) => c.items.length > 0);

  // Normalize into plain (mutable) objects so the client component stays
  // decoupled from the server lib's readonly types.
  const categories = raw.map((cat) => ({
    id: cat.id,
    label: cat.label,
    items: cat.items.map((it) => ({ ...it })),
  }));

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        THE LOCKER — WARDROBE
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Wear your identity
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        Kicks, outfits, emotes, anthems, frames, scenes, banners, titles, and
        ticket stubs. Earn them through achievements, claim season drops, or buy
        with Nova (Stripe test mode). Cosmetics are pure identity —{" "}
        <strong style={{ color: GALAXY.text }}>they never affect outcomes</strong>.
      </p>
      <div style={{ marginTop: 18 }}>
        <Wardrobe categories={categories} canAct={profileId != null} />
      </div>
    </GalaxyShell>
  );
}
