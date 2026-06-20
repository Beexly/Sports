import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalaxyShell } from "@/components/galaxy/shell";
import { CardWatchButton } from "@/components/galaxy/card-watch-button";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView, getCurrentProfileId } from "@/lib/galaxy/session";
import { getCardDetail, sparklineSvg } from "@/lib/galaxy/card-analytics";
import { listWatchedSlugs } from "@/lib/galaxy/market";
import { cardSvg } from "@/lib/galaxy/assets";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const card = await getCardDetail(params.slug);
  return {
    title: card ? `${card.name} — Card` : "Card",
    description: "Digital companion card: GSE rating, form, and value trend.",
  };
}

const trendColor = (t: string | null) => (t === "UP" ? GALAXY.cyan : t === "DOWN" ? GALAXY.magenta : GALAXY.textMuted);

export default async function CardDetailPage({ params }: { params: { slug: string } }) {
  const card = await getCardDetail(params.slug);
  if (!card) notFound();

  const profile = await getCurrentProfileView();
  const profileId = await getCurrentProfileId();
  const watched = profileId ? await listWatchedSlugs(profileId) : [];
  const change = card.history.length > 1 ? card.history[card.history.length - 1]! - card.history[0]! : 0;

  return (
    <GalaxyShell profile={profile}>
      <p style={{ marginTop: 0 }}>
        <a href="/galaxy/vault" style={{ color: GALAXY.cyan, fontSize: 14 }}>← The Vault</a>
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cardSvg(card.assetSeed, card.name)} alt={`${card.name} card`} width={220} height={300} style={{ borderRadius: 12 }} />

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, color: GALAXY.gold, fontWeight: 700 }}>
            {card.rarity} · {card.subjectType}
          </div>
          <h1 style={{ fontSize: 32, margin: "6px 0", fontFamily: "var(--f-display, sans-serif)" }}>{card.name}</h1>

          <div style={{ display: "flex", gap: 18, marginTop: 6, fontSize: 14, flexWrap: "wrap" }}>
            <span style={{ color: GALAXY.text }}>GSE Rating <strong>{card.gseRating ?? "—"}</strong></span>
            <span style={{ color: trendColor(card.formTrend) }}>Form {card.formTrend ?? "—"}</span>
            <span style={{ color: trendColor(card.valueTrend) }}>Value {card.valueTrend ?? "—"}</span>
          </div>

          {/* Value index sparkline */}
          <div style={{ marginTop: 16, background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: GALAXY.textMuted }}>
              <span>Value index (seeded prototype)</span>
              <span style={{ color: change >= 0 ? GALAXY.cyan : GALAXY.magenta, fontWeight: 700 }}>
                {change >= 0 ? "+" : ""}{change} pts
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sparklineSvg(card.history, change >= 0 ? GALAXY.cyan : GALAXY.magenta)} alt="value trend" width={280} height={70} style={{ marginTop: 8, width: "100%", maxWidth: 320 }} />
          </div>

          <div style={{ marginTop: 16 }}>
            <CardWatchButton slug={card.slug} initialWatching={watched.includes(card.slug)} canAct={profileId != null} />
          </div>
        </div>
      </div>

      {/* Companion stat line */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 28 }}>COMPANION DATA</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10 }}>
        {Object.entries(card.statLine).map(([k, v]) => (
          <div key={k} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: GALAXY.textMuted, textTransform: "capitalize" }}>{k}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: GALAXY.text }}>{String(v)}</div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: GALAXY.textMuted }}>
        Value index is a seeded companion signal (prototype) — real market pricing
        and trading settle with the Stage-3 marketplace (partner-gated).
      </p>
    </GalaxyShell>
  );
}
