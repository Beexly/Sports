import type { Metadata } from "next";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/shell";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView, getCurrentProfileId } from "@/lib/galaxy/session";
import { listFollowing, followCounts } from "@/lib/galaxy/social";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Friends — Your Crew Circle",
  description: "Follow players, visit their cribs, and run duels together.",
  alternates: { canonical: "/galaxy/friends" },
};

export default async function FriendsPage() {
  const profile = await getCurrentProfileView();
  const profileId = await getCurrentProfileId();

  if (!profile || !profileId) {
    return (
      <GalaxyShell profile={null}>
        <h1 style={{ fontFamily: "var(--f-display, sans-serif)" }}>Friends</h1>
        <p style={{ color: GALAXY.textMuted }}>
          Follow players, visit their cribs, and play together. Create your Galaxy
          Profile to start your circle.
        </p>
        <Link href="/galaxy/onboarding" style={{ color: GALAXY.cyan }}>Create your Galaxy Profile →</Link>
      </GalaxyShell>
    );
  }

  const [following, counts] = await Promise.all([listFollowing(profileId), followCounts(profileId)]);

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.violet, fontWeight: 700 }}>YOUR CIRCLE</div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>Friends</h1>
      <p style={{ color: GALAXY.textMuted, marginTop: 0 }}>
        Following <strong style={{ color: GALAXY.text }}>{counts.following}</strong> ·{" "}
        Followers <strong style={{ color: GALAXY.text }}>{counts.followers}</strong>. Visit a crib,
        then run a Signal Duel together.
      </p>

      {following.length === 0 ? (
        <p style={{ color: GALAXY.textMuted, marginTop: 16 }}>
          You&apos;re not following anyone yet. Open the{" "}
          <Link href="/galaxy/leaderboard" style={{ color: GALAXY.cyan }}>ranked ladder</Link> and follow a
          few players, then come back here.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {following.map((f) => (
            <div key={f.handle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: "10px 14px" }}>
              <div>
                <Link href={`/galaxy/u/${encodeURIComponent(f.handle)}`} style={{ color: GALAXY.text, fontWeight: 700 }}>@{f.handle}</Link>
                <span style={{ fontSize: 12, color: GALAXY.textMuted }}> · {f.archetype} · {f.tier} ({f.rating})</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Link href={`/galaxy/u/${encodeURIComponent(f.handle)}`} style={{ color: GALAXY.cyan, fontSize: 13 }}>Crib</Link>
                <Link href="/galaxy/duel" style={{ color: GALAXY.gold, fontSize: 13 }}>Duel</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </GalaxyShell>
  );
}
