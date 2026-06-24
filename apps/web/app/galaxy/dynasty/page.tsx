import type { Metadata } from "next";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView, getCurrentProfileId } from "@/lib/galaxy/session";
import { getGalaxyScoreFor } from "@/lib/galaxy/score";
import { getEquippedTitle } from "@/lib/galaxy/cosmetics";
import { avatarSvg, crestSvg, badgeSvg } from "@/lib/galaxy/assets";
import { DISTRICT_REPUTATION, GAME_KERNEL_SKILLS, INVENTORY_ITEMS, QUESTS } from "@sports/galaxy-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Dynasty",
  description: "Your record, badges, Sports IQ skills, cards, and status.",
  alternates: { canonical: "/galaxy/dynasty" },
};

export default async function DynastyPage() {
  const profile = await getCurrentProfileView();

  if (!profile) {
    return (
      <GalaxyShell profile={null}>
        <h1 style={{ fontSize: 32, fontFamily: "var(--f-display, sans-serif)" }}>My Dynasty</h1>
        <p style={{ color: GALAXY.textMuted, maxWidth: 560 }}>
          Your Dynasty room is where your record, badges, Sports IQ, and status
          live. Create your Galaxy Profile to start building it.
        </p>
        <Link
          href="/galaxy/onboarding"
          style={{ display: "inline-block", marginTop: 14, background: GALAXY.gold, color: GALAXY.void, padding: "11px 20px", borderRadius: 10, fontWeight: 800, textDecoration: "none" }}
        >
          Create your Galaxy Profile →
        </Link>
      </GalaxyShell>
    );
  }

  const pct = Math.round(profile.characterProgress * 100);
  const score = await getGalaxyScoreFor(profile);
  const profileId = await getCurrentProfileId();
  const equippedTitle = profileId ? await getEquippedTitle(profileId) : null;

  return (
    <GalaxyShell profile={profile}>
      {/* Identity header */}
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSvg(profile.avatarSeed)} alt="Your avatar" width={96} height={96} style={{ borderRadius: 16 }} />
        <div>
          <h1 style={{ fontSize: 30, margin: 0, fontFamily: "var(--f-display, sans-serif)" }}>
            @{profile.handle}
          </h1>
          {equippedTitle && (
            <div style={{ color: GALAXY.gold, fontSize: 13, fontWeight: 700, marginTop: 2 }}>“{equippedTitle}”</div>
          )}
          <div style={{ color: GALAXY.textMuted, marginTop: 4 }}>
            {profile.archetypeName} · {profile.factionName} ·{" "}
            <Link href="/galaxy/wardrobe" style={{ color: GALAXY.cyan }}>Wardrobe</Link> ·{" "}
            <Link href={`/galaxy/u/${encodeURIComponent(profile.handle)}`} style={{ color: GALAXY.cyan }}>Public Crib</Link>
          </div>
        </div>
        <Link href="/galaxy/score" style={{ marginLeft: "auto", textDecoration: "none", textAlign: "right" }}>
          <div style={{ fontSize: 11, color: GALAXY.textMuted, letterSpacing: 1 }}>GALAXY SCORE</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: GALAXY.gold, fontFamily: "var(--f-display, sans-serif)", lineHeight: 1 }}>
            {score.total}
          </div>
          <div style={{ fontSize: 12, color: GALAXY.cyan }}>{score.tier} →</div>
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crestSvg(profile.faction)} alt="Faction crest" width={64} height={64} />
      </div>

      {/* Status row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12, marginTop: 20 }}>
        <Stat label="Rank (Level)" value={profile.characterLevel.toString()} />
        <Stat label="Ladder Rating" value={`${profile.rating}`} accent={GALAXY.cyan} />
        <Stat label="Tier" value={profile.ratingTier} accent={GALAXY.cyan} />
        <Stat label="Credits" value={profile.creditsBalance.toLocaleString()} accent={GALAXY.gold} />
        <Stat label="Season" value={`T${profile.seasonTier} · ${profile.seasonPoints}pt`} accent={GALAXY.gold} />
        <Stat label="Prestige" value={profile.prestige.toString()} accent={GALAXY.violet} />
      </div>

      {/* Level progress */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: GALAXY.textMuted }}>
          <span>Level {profile.characterLevel} → {profile.characterLevel + 1}</span>
          <span>{profile.characterXpIntoLevel} / {profile.characterXpToNext || "MAX"} XP</span>
        </div>
        <div style={{ height: 8, background: GALAXY.border, borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GALAXY.deepBlue}, ${GALAXY.gold})` }} />
        </div>
      </div>

      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 28 }}>ROOKIE PLAZA SAFEHOUSE</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
        <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.gold}66`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, color: GALAXY.textMuted }}>QUEST WALL</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: GALAXY.gold }}>{QUESTS.length} visible</div>
          <div style={{ color: GALAXY.textMuted, fontSize: 12, marginTop: 4 }}>First six are playable from Rookie Plaza actions.</div>
        </div>
        <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.cyan}66`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, color: GALAXY.textMuted }}>ITEM WALL</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: GALAXY.cyan }}>{INVENTORY_ITEMS.length} safe items</div>
          <div style={{ color: GALAXY.textMuted, fontSize: 12, marginTop: 4 }}>Cards and tools are account identity objects with no cash value.</div>
        </div>
        <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.violet}66`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, color: GALAXY.textMuted }}>DISTRICT REP</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: GALAXY.violet }}>{DISTRICT_REPUTATION.length} tracks</div>
          <div style={{ color: GALAXY.textMuted, fontSize: 12, marginTop: 4 }}>{DISTRICT_REPUTATION.map((rep) => rep.label).join(" · ")}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {GAME_KERNEL_SKILLS.map((skill) => (
          <span key={skill.id} style={{ border: `1px solid ${GALAXY.border}`, borderRadius: 999, padding: "6px 9px", color: GALAXY.textMuted, fontSize: 12 }}>
            {skill.label}
          </span>
        ))}
      </div>

      {/* Sports IQ skills */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 28 }}>SPORTS IQ</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
        {profile.skills.map((s) => (
          <div key={s.sportKey} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ color: GALAXY.text }}>{s.label}</strong>
              <span style={{ color: GALAXY.cyan, fontWeight: 800 }}>{s.level}</span>
            </div>
            <div style={{ height: 6, background: GALAXY.border, borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${Math.round(s.progress * 100)}%`, height: "100%", background: GALAXY.cyan }} />
            </div>
            <div style={{ fontSize: 11, color: GALAXY.textMuted, marginTop: 6 }}>
              {s.gradedCount} graded · {s.avgBrier != null ? `avg Brier ${s.avgBrier}` : "no calibration yet"}
            </div>
          </div>
        ))}
      </div>

      {/* Badges / merch */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 28 }}>BADGES & UNLOCKS</h2>
      {profile.merch.length === 0 && profile.bossCleared.length === 0 ? (
        <p style={{ color: GALAXY.textMuted }}>
          No unlocks yet. <Link href="/galaxy/depths" style={{ color: GALAXY.cyan }}>Clear The Public Trap</Link> to earn your first.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {profile.bossCleared.map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: "8px 12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeSvg(b)} alt="Badge" width={32} height={32} />
              <span style={{ fontSize: 13 }}>Boss cleared: {b.replace(/_/g, " ")}</span>
            </div>
          ))}
          {profile.merch.map((m) => (
            <div key={m.sku} style={{ display: "flex", alignItems: "center", gap: 8, background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: "8px 12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeSvg(m.sku)} alt="Merch badge" width={32} height={32} />
              <span style={{ fontSize: 13 }}>{m.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
        <Link href="/galaxy/duel" style={ctaStyle(GALAXY.gold)}>Enter a Signal Duel →</Link>
        <Link href="/galaxy/season" style={ctaStyle(GALAXY.cyan)}>Season Cup</Link>
        <Link href="/galaxy/leaderboard" style={ctaStyle(GALAXY.cyan)}>Ladder</Link>
        <Link href="/galaxy/store" style={ctaStyle(GALAXY.violet)}>Merch Foundry</Link>
      </div>
    </GalaxyShell>
  );
}

function Stat({ label, value, accent = GALAXY.text }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, color: GALAXY.textMuted, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ctaStyle(accent: string): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    border: `1px solid ${accent}66`,
    background: `${accent}14`,
    color: GALAXY.text,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 14,
  };
}
