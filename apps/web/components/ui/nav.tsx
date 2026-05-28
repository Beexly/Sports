import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/ui/mobile-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { DESKTOP_NAV_ROUTES } from "@/lib/routes-catalog";

const NAV_LINKS = DESKTOP_NAV_ROUTES.map((r) => ({ label: r.label, href: r.path }));

export async function Nav() {
  const session = await auth().catch(() => null);
  const user = session?.user ?? null;

  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <BrandLockup />

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
            Live Board
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
                  See plans
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
