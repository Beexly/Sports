import Link from "next/link";
import type { ReactNode } from "react";
import { GALAXY } from "@/lib/galaxy/theme";
import type { ProfileView } from "@/lib/galaxy/types";

const NAV = [
  { href: "/galaxy", label: "Campus" },
  { href: "/galaxy/war-room", label: "War Room" },
  { href: "/galaxy/blacktop", label: "Blacktop" },
  { href: "/galaxy/depths", label: "Depths" },
  { href: "/galaxy/vault", label: "Vault" },
  { href: "/galaxy/crew", label: "Crews" },
  { href: "/galaxy/dynasty", label: "My Dynasty" },
] as const;

/** Shared Galaxy Dynasty page chrome — header nav, cosmic backdrop, footer. */
export function GalaxyShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile?: ProfileView | null;
}) {
  return (
    <div style={{ minHeight: "100vh", background: GALAXY.void, color: GALAXY.text }}>
      {/* Cosmic atmosphere — never a flat black (visual law). */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `radial-gradient(60% 50% at 50% -10%, ${GALAXY.deepBlue}22, transparent 70%), radial-gradient(50% 40% at 85% 0%, ${GALAXY.gold}12, transparent 65%), radial-gradient(60% 60% at 10% 100%, ${GALAXY.violet}14, transparent 70%)`,
        }}
      />
      <header
        style={{
          position: "relative",
          zIndex: 2,
          borderBottom: `1px solid ${GALAXY.border}`,
          backdropFilter: "blur(6px)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/galaxy"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: `linear-gradient(135deg, ${GALAXY.gold}, ${GALAXY.deepBlue})`,
                display: "inline-block",
                boxShadow: `0 0 16px ${GALAXY.gold}55`,
              }}
            />
            <span
              style={{
                fontWeight: 800,
                letterSpacing: 0.5,
                color: GALAXY.text,
                fontFamily: "var(--f-display, sans-serif)",
              }}
            >
              GALAXY <span style={{ color: GALAXY.gold }}>DYNASTY</span>
            </span>
          </Link>

          <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", flex: 1 }}>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  color: GALAXY.textMuted,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {profile ? (
            <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 13 }}>
              <span style={{ color: GALAXY.textMuted }}>
                Lv <strong style={{ color: GALAXY.text }}>{profile.characterLevel}</strong>
              </span>
              <span style={{ color: GALAXY.gold, fontWeight: 700 }}>
                ◇ {profile.creditsBalance.toLocaleString()} Credits
              </span>
              <span style={{ color: GALAXY.textMuted }}>@{profile.handle}</span>
            </div>
          ) : (
            <Link
              href="/galaxy/onboarding"
              style={{
                color: GALAXY.void,
                background: GALAXY.gold,
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Enter the Campus
            </Link>
          )}
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "28px 20px 64px" }}>
        {children}
      </main>

      <footer
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: `1px solid ${GALAXY.border}`,
          padding: "20px",
          textAlign: "center",
          color: GALAXY.textMuted,
          fontSize: 12,
        }}
      >
        Galaxy Dynasty — the playable layer of Galaxy Sports Edge. Closed-loop
        Credits have no cash value. Predictions are sports-intelligence reps, not
        outcome promises. Play with discipline.
      </footer>
    </div>
  );
}
