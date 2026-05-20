import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Primary site navigation — uses the PickPilot Design System nav surface
 * (see `apps/web/styles/pickpilot-kit.css` → .nav, .nav-logo, .nav-links).
 *
 * The reticle inside the wordmark is the brand mark from `design-system/assets/logo-mark.svg`,
 * inlined so the wordmark renders as a single typographic lockup ("PICKPIL[reticle]T").
 */

const NAV_LINKS = [
  { label: "Picks", href: "/picks", active: false },
  { label: "Observatory", href: "/observatory", active: false },
  { label: "The Vault", href: "/vault", active: false },
  { label: "Performance", href: "/performance", active: false },
  { label: "Methodology", href: "/methodology", active: false },
] as const;

function ReticleMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="butt" aria-hidden="true">
      <circle cx="24" cy="24" r="22" />
      <circle cx="24" cy="24" r="12" opacity="0.5" />
      <line x1="24" y1="-2" x2="24" y2="8" />
      <line x1="24" y1="40" x2="24" y2="50" />
      <line x1="-2" y1="24" x2="8" y2="24" />
      <line x1="40" y1="24" x2="50" y2="24" />
      <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" />
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
          <Link href="/" className="nav-logo" aria-label={`${BRAND_NAME} — home`}>
            PICKPIL
            <span className="ret">
              <ReticleMark />
            </span>
            T
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
            Live · Odds 30 min
          </span>
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
                Get free picks <span className="arrow">→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
