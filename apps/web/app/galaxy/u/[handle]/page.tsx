import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView, getCurrentProfileId } from "@/lib/galaxy/session";
import { getProfileViewByHandle, getProfileRowByHandle } from "@/lib/galaxy/profile";
import { getGalaxyScoreFor } from "@/lib/galaxy/score";
import { getEquipped } from "@/lib/galaxy/cosmetics";
import { isFollowing } from "@/lib/galaxy/social";
import { FollowButton } from "@/components/galaxy/follow-button";
import { getCosmetic } from "@sports/galaxy-engine";
import { avatarSvg, crestSvg, badgeSvg } from "@/lib/galaxy/assets";
import { placeholderPalette } from "@sports/galaxy-engine";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const p = await getProfileViewByHandle(params.handle);
  return {
    title: p ? `@${p.handle} — Galaxy Crib` : "Crib",
    description: p ? `${p.archetypeName} · ${p.factionName} · Galaxy Dynasty` : "A Galaxy Dynasty player profile.",
  };
}

export default async function CribPage({ params }: { params: { handle: string } }) {
  const profile = await getProfileViewByHandle(params.handle);
  if (!profile) notFound();

  const viewer = await getCurrentProfileView();
  const viewerId = await getCurrentProfileId();
  const row = await getProfileRowByHandle(params.handle);
  const score = await getGalaxyScoreFor(profile);
  const equipped = row ? await getEquipped(row.id) : {};
  const isOwnEarly = viewer?.handle === profile.handle;
  const following = viewerId && !isOwnEarly ? await isFollowing(viewerId, profile.handle) : false;

  const sceneId = equipped["profile_scene"];
  const titleId = equipped["title"];
  const bannerId = equipped["banner"];
  const title = titleId ? getCosmetic(titleId)?.name ?? null : null;
  const bannerName = bannerId ? getCosmetic(bannerId)?.name ?? null : null;
  const pal = placeholderPalette(sceneId ?? profile.avatarSeed);

  const isOwn = viewer?.handle === profile.handle;

  return (
    <GalaxyShell profile={viewer}>
      {/* Crib scene backdrop (from equipped profile scene) */}
      <div
        style={{
          borderRadius: 18,
          padding: 24,
          border: `1px solid ${GALAXY.border}`,
          background: `radial-gradient(80% 120% at 20% -10%, ${pal.glow}55, transparent 60%), radial-gradient(60% 100% at 90% 0%, ${pal.accent}33, transparent 60%), ${pal.base}`,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
          {isOwn ? "YOUR CRIB" : "VISITING"}
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSvg(profile.avatarSeed)} alt={`@${profile.handle} avatar`} width={96} height={96} style={{ borderRadius: 16 }} />
          <div>
            <h1 style={{ fontSize: 30, margin: 0, fontFamily: "var(--f-display, sans-serif)" }}>@{profile.handle}</h1>
            {title && <div style={{ color: GALAXY.gold, fontSize: 13, fontWeight: 700 }}>“{title}”</div>}
            <div style={{ color: GALAXY.textMuted, marginTop: 4 }}>
              {profile.archetypeName} · {profile.factionName}
              {bannerName && <span> · 🚩 {bannerName}</span>}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            {!isOwn && <FollowButton handle={profile.handle} initialFollowing={following} canAct={viewerId != null} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={crestSvg(profile.faction)} alt="Faction crest" width={64} height={64} />
          </div>
        </div>
      </div>

      {/* Identity stats — everything matters, in one place */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginTop: 18 }}>
        <Stat label="Galaxy Score" value={`${score.total}`} sub={score.tier} accent={GALAXY.gold} />
        <Stat label="Ladder" value={`${profile.rating}`} sub={profile.ratingTier} accent={GALAXY.cyan} />
        <Stat label="Rank (Level)" value={`${profile.characterLevel}`} />
        <Stat label="Season" value={`T${profile.seasonTier}`} sub={`${profile.seasonPoints} pts`} />
        <Stat label="Prestige" value={`${profile.prestige}`} accent={GALAXY.violet} />
        <Stat label="Bosses" value={`${profile.bossCleared.length}/5`} accent={GALAXY.magenta} />
      </div>

      {/* Trophies */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 26 }}>TROPHY CASE</h2>
      {profile.bossCleared.length === 0 && profile.merch.length === 0 ? (
        <p style={{ color: GALAXY.textMuted }}>No trophies yet.</p>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {profile.bossCleared.map((b) => (
            <div key={b} style={chip()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeSvg(b)} alt="" width={28} height={28} /> {b.replace(/_/g, " ")}
            </div>
          ))}
          {profile.merch.map((m) => (
            <div key={m.sku} style={chip()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeSvg(m.sku)} alt="" width={28} height={28} /> {m.name}
            </div>
          ))}
        </div>
      )}

      {/* Collection peek */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 26 }}>
        VAULT · {profile.cards.length} CARDS
      </h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {profile.cards.slice(0, 6).map((c) => (
          <span key={c.slug} style={chip()}>{c.name} · {c.rarity}</span>
        ))}
        {profile.cards.length === 0 && <span style={{ color: GALAXY.textMuted }}>Empty Vault.</span>}
      </div>

      {profile.crew && (
        <p style={{ marginTop: 20, color: GALAXY.textMuted }}>
          Crew: <strong style={{ color: GALAXY.text }}>{profile.crew.name}</strong> [{profile.crew.tag}]
        </p>
      )}

      {isOwn && (
        <p style={{ marginTop: 18 }}>
          <Link href="/galaxy/wardrobe" style={{ color: GALAXY.cyan }}>Decorate your Crib in the Wardrobe →</Link>
        </p>
      )}
    </GalaxyShell>
  );
}

function Stat({ label, value, sub, accent = GALAXY.text }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 11, color: GALAXY.textMuted }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: GALAXY.textMuted }}>{sub}</div>}
    </div>
  );
}

function chip(): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 8, background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 999, padding: "6px 12px", fontSize: 13, color: GALAXY.text };
}
