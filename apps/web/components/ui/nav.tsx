import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";
import { MobileNav } from "@/components/ui/mobile-nav";

const NAV_LINKS = [
  { label: "Signal Feed", href: "/picks" },
  { label: "Edge Map", href: "/observatory" },
  { label: "Galaxy IQ", href: "/methodology" },
  { label: "Pricing", href: "/pricing" },
] as const;

function OrbitalMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M 8 30 A 16 16 0 1 0 40 27" />
      <line x1="6" y1="10" x2="42" y2="38" />
      <circle cx="25" cy="22" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export async function Nav() {
  const session = await auth().catch(() => null);
  const user = session?.user ?? null;

  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <Link
            href="/"
            className="nav-logo"
            aria-label={`${BRAND_NAME} home`}
            style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ display: "inline-flex", width: 26, height: 26, color: "var(--ion-white)" }}>
              <OrbitalMark />
            </span>
            <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ font: "700 16px/1 var(--f-display)", letterSpacing: "0.10em", color: "var(--ion-white)" }}>
                GALAXY
              </span>
              <span
                style={{
                  font: "500 10px/1 var(--f-display)",
                  letterSpacing: "0.22em",
                  color: "var(--orbital-cyan)",
                  marginTop: 3,
                }}
              >
                SPORTS EDGE
              </span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="nav-right">
          <span className="live-chip">
            <span className="dot" />
            Signal / Live
          </span>

          <div className="desktop-auth">
            {user ? (
              <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: "50%", overflow: "hidden", background: "var(--titanium)" }}>
                  {user.image ? (
                    <Image src={user.image} alt={user.name ?? "User avatar"} width={22} height={22} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--ion-white)", fontSize: 11, fontWeight: 600 }}>
                      {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  )}
                </span>
                <span>{user.name ?? user.email}</span>
              </Link>
            ) : (
              <>
                <Link href="/auth/signin" className="btn btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link href="/pricing" className="btn btn-primary btn-sm">
                  Get the signal <span className="arrow">-&gt;</span>
                </Link>
              </>
            )}
          </div>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
