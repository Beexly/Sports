import type { Metadata } from "next";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/shell";
import { NovaPackButton } from "@/components/galaxy/store-buttons";
import { GALAXY } from "@/lib/galaxy/theme";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { COSMETICS, NOVA_PACKS } from "@/lib/galaxy/store";
import { badgeSvg } from "@/lib/galaxy/assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Merch Foundry — Cosmetics & Unlocks",
  description:
    "Achievement-gated merch, Nova cosmetics (Stripe test mode), and the GSE Pro upgrade path. Closed-loop, no cash value.",
  alternates: { canonical: "/galaxy/store" },
};

export default async function StorePage() {
  const profile = await getCurrentProfileView();

  return (
    <GalaxyShell profile={profile}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: GALAXY.gold, fontWeight: 700 }}>
        THE MERCH FOUNDRY
      </div>
      <h1 style={{ fontSize: 34, margin: "8px 0 6px", fontFamily: "var(--f-display, sans-serif)" }}>
        Cosmetics & unlocks
      </h1>
      <p style={{ color: GALAXY.textMuted, maxWidth: 680, marginTop: 0 }}>
        Monetization here is cosmetics, achievement-gated merch, and the GSE
        subscription — never cash-out. Galaxy Credits have no cash value. All
        commerce is in <strong style={{ color: GALAXY.gold }}>Stripe test mode</strong>{" "}
        this build; no live charges.
      </p>

      {/* Achievement-gated entitlements */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 24 }}>
        YOUR UNLOCKS
      </h2>
      {profile && profile.merch.length > 0 ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {profile.merch.map((m) => (
            <div key={m.sku} style={{ display: "flex", gap: 10, alignItems: "center", background: GALAXY.panel, border: `1px solid ${GALAXY.gold}55`, borderRadius: 12, padding: "10px 14px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeSvg(m.sku)} alt="" width={36} height={36} />
              <div>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: GALAXY.textMuted }}>Unlocked: {m.unlockedVia}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: GALAXY.textMuted }}>
          No unlocks yet.{" "}
          <Link href="/galaxy/depths" style={{ color: GALAXY.cyan }}>
            Clear The Public Trap
          </Link>{" "}
          to unlock the Signal Keeper entitlement.
        </p>
      )}

      {/* Cosmetics (Nova) */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 28 }}>
        COSMETICS · NOVA
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
        {COSMETICS.map((c) => (
          <div key={c.sku} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ color: GALAXY.text }}>{c.name}</strong>
              <span style={{ color: GALAXY.gold, fontWeight: 700 }}>{c.novaPrice} ◆</span>
            </div>
            <p style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 6 }}>{c.description}</p>
          </div>
        ))}
      </div>

      {/* Nova packs (Stripe test mode) */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 28 }}>
        GET NOVA · STRIPE TEST MODE
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
        {NOVA_PACKS.map((p) => (
          <NovaPackButton key={p.sku} sku={p.sku} nova={p.nova} usd={p.usd} />
        ))}
      </div>

      {/* GSE Pro upgrade hook */}
      <div
        style={{
          marginTop: 30,
          background: `linear-gradient(135deg, ${GALAXY.deepBlue}22, ${GALAXY.violet}18)`,
          border: `1px solid ${GALAXY.deepBlue}55`,
          borderRadius: 16,
          padding: 22,
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 1.5, color: GALAXY.cyan, fontWeight: 700 }}>
          GSE PRO
        </div>
        <h2 style={{ margin: "8px 0", fontSize: 22 }}>Pro unlocks a deeper War Room</h2>
        <p style={{ color: GALAXY.textMuted, maxWidth: 560 }}>
          Galaxy Sports Edge Pro adds the full factor trail, line-movement lens,
          and multi-game Season Program view to your War Room — the same
          intelligence the engine runs on.
        </p>
        <Link
          href="/pricing"
          style={{ display: "inline-block", marginTop: 10, background: GALAXY.cyan, color: GALAXY.void, padding: "10px 20px", borderRadius: 10, fontWeight: 800, textDecoration: "none" }}
        >
          See GSE Pro →
        </Link>
      </div>
    </GalaxyShell>
  );
}
