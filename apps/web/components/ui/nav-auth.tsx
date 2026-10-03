import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/ui/mobile-nav";
import { getReadinessGates } from "@sports/prediction-engine";

function isEnvTrue(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

/**
 * "Live Board" is a public trust claim. Only render when both:
 *   - LIVE_BOARD founder gate is on
 *   - canExposePublicPicks readiness gate is open
 * Otherwise hide — empty/off is honest; a green live chip while gated off is not.
 */
export function shouldShowLiveBoardChip(): boolean {
  if (!isEnvTrue("LIVE_BOARD")) return false;
  return getReadinessGates().canExposePublicPicks;
}

/**
 * NavAuth — the session-aware right rail of the Nav bar.
 *
 * This component is the ONLY part of the Nav that depends on `auth()`, which
 * reads cookies and would otherwise force the entire page (and all 86+ pages
 * that render <Nav />) out of static generation. By isolating it behind its
 * own Suspense boundary in nav.tsx, the static nav-left (brand, menu, mobile
 * nav) can prerender independently while the auth-dependent user avatar /
 * sign-in links stream in lazily.
 *
 * P16-03: extract auth-dependent markup so marketing pages like /pricing can
 * stay static.
 */
export async function NavAuth() {
  const session = await auth().catch(() => null);
  const user = session?.user ?? null;
  const showLiveBoard = shouldShowLiveBoardChip();

  return (
    <div className="nav-right">
      {showLiveBoard ? (
        <span className="live-chip" data-testid="nav-live-chip">
          <span className="dot" />
          Live Board
        </span>
      ) : null}

      <div className="desktop-auth">
        {user ? (
          <Link
            href="/dashboard"
            className="btn btn-ghost btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                display: "inline-flex",
                width: 22,
                height: 22,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--titanium)",
              }}
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User avatar"}
                  width={22}
                  height={22}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--ion-white)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
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
  );
}

/**
 * NavAuthFallback — shown by Suspense while NavAuth resolves auth().
 *
 * Mirrors the anonymous state (sign-in / pricing links) so a static page
 * never renders an empty nav-right while auth() is in flight. The
 * mobile-nav trigger is always present regardless of auth state.
 */
export function NavAuthFallback() {
  const showLiveBoard = shouldShowLiveBoardChip();

  return (
    <div className="nav-right">
      {showLiveBoard ? (
        <span className="live-chip" data-testid="nav-live-chip">
          <span className="dot" />
          Live Board
        </span>
      ) : null}

      <div className="desktop-auth">
        <>
          <Link href="/auth/signin" className="btn btn-ghost btn-sm">
            Sign in
          </Link>
          <Link href="/pricing" className="btn btn-primary btn-sm">
            See plans
          </Link>
        </>
      </div>

      <MobileNav />
    </div>
  );
}
