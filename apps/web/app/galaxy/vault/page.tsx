import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { STARTER_CARDS } from "@/lib/galaxy/content";
import { cardSvg } from "@/lib/galaxy/assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Vault — Your Cards",
  description:
    "Your card collection with digital companion data: GSE rating, form, and value trend. Collection and display only.",
  alternates: { canonical: "/galaxy/vault" },
};

const trendGlyph = (t: string | null) => (t === "UP" ? "▲" : t === "DOWN" ? "▼" : "—");
const trendColor = (t: string | null) => (t === "UP" ? GALAXY.cyan : t === "DOWN" ? GALAXY.magenta : GALAXY.textMuted);

export default async function VaultPage() {
  const profile = await getCurrentProfileView();
  const cards =
    profile && profile.cards.length > 0
      ? profile.cards
      : STARTER_CARDS.map((c) => ({
          slug: c.slug,
          name: c.name,
          subjectType: c.subjectType,
          rarity: c.rarity,
          gseRating: c.gseRating,
          formTrend: c.formTrend,
          valueTrend: c.valueTrend,
          assetSeed: c.slug,
        }));

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>THE VAULT</div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Your collection
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 660, marginTop: 0 }}>
        Digital companion cards with GSE ratings, form, and value trend. Collection
        and display only this season — a real marketplace and physical custody are
        partner-gated (Stage 3).
      </p>
      <p style={{ marginTop: 0 }}>
        <a href="/galaxy/market" style={{ color: GALAXY.cyan, fontSize: 14 }}>
          Open the Vault Market — watch &amp; trade →
        </a>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 18,
        }}
      >
        {cards.map((c) => (
          <div
            key={c.slug}
            style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 14 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardSvg(c.assetSeed, c.name)}
              alt={`${c.name} card`}
              width={220}
              height={300}
              style={{ width: "100%", height: "auto", borderRadius: 10, display: "block" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <strong style={{ color: GALAXY.text }}>{c.name}</strong>
              <span style={{ color: GALAXY.gold, fontSize: 12 }}>{c.rarity}</span>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: GALAXY.textMuted }}>
              <span>GSE {c.gseRating ?? "—"}</span>
              <span style={{ color: trendColor(c.formTrend) }}>Form {trendGlyph(c.formTrend)}</span>
              <span style={{ color: trendColor(c.valueTrend) }}>Value {trendGlyph(c.valueTrend)}</span>
            </div>
          </div>
        ))}
      </div>

      {!profile && (
        <p style={{ marginTop: 18, color: GALAXY.textMuted }}>
          These are the starter cards you&apos;ll receive.{" "}
          <a href="/galaxy/onboarding" style={{ color: GALAXY.cyan }}>
            Create your profile
          </a>{" "}
          to add them to your Vault.
        </p>
      )}
    </GalaxyShell>
  );
}
