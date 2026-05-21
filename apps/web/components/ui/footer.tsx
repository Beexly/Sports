import Link from "next/link";
import { BRAND_NAME, HELPLINE, SOCIAL, CLOSING_LINE } from "@/lib/brand";

/**
 * Site footer — Galaxy Sports Edge.
 *
 * Wordmark is the canonical orbital lockup: the GSE mark + "GALAXY" /
 * "SPORTS EDGE" stacked. The mark is the broken orbit + signal point +
 * edge vector (NOT a Google G — see Brand Use Pack §5).
 */

const PRODUCT_LINKS = [
  { label: "Picks", href: "/picks" },
  { label: "Observatory", href: "/observatory" },
  { label: "The Vault", href: "/vault" },
  { label: "Methodology", href: "/methodology" },
] as const;

const COMPANY_LINKS = [
  { label: "Performance", href: "/performance" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Press", href: "/press" },
] as const;

const RESPONSIBLE_LINKS = [
  { label: "Set limits", href: "/responsible-play" },
  { label: "Variance guide", href: "/responsible-play#variance" },
  { label: `Help · ${HELPLINE.shortLabel}`, href: HELPLINE.href },
  { label: "Terms · Privacy", href: "/terms" },
] as const;

function OrbitalMark() {
  // Galaxy Sports Edge mark — orbit + signal point + edge vector.
  // Intentionally asymmetric to avoid any letterform memory.
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      {/* Broken arc — open at top */}
      <path d="M 8 30 A 16 16 0 1 0 40 27" />
      {/* Edge vector — diagonal */}
      <line x1="6" y1="10" x2="42" y2="38" />
      {/* Signal point — the memory hook */}
      <circle cx="25" cy="22" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div>
            <Link
              href="/"
              className="nav-logo"
              style={{ marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 12 }}
              aria-label={`${BRAND_NAME} — home`}
            >
              <span style={{ display: "inline-flex", width: 28, height: 28 }}>
                <OrbitalMark />
              </span>
              <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
                <span style={{ font: "700 18px/1 var(--f-display)", letterSpacing: "0.10em" }}>GALAXY</span>
                <span style={{ font: "500 11px/1 var(--f-display)", letterSpacing: "0.22em", color: "var(--orbital-cyan)", marginTop: 4 }}>
                  SPORTS EDGE
                </span>
              </span>
            </Link>
            <p className="disclaim">
              {BRAND_NAME} delivers calibrated market signals — not certainty.
              We do not promise outcomes. Treat every confidence-rated signal as
              one input in a disciplined portfolio.{" "}
              <strong style={{ color: "var(--ion)" }}>
                Set limits before emotion enters.
              </strong>
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Responsible" links={RESPONSIBLE_LINKS} />
        </div>

        <SocialRow />

        <div className="bottom">
          <span>© {new Date().getFullYear()} {BRAND_NAME.toUpperCase()} · FIND THE SIGNAL BEFORE THE MARKET MOVES</span>
          <span>{CLOSING_LINE.toUpperCase()}</span>
        </div>
      </div>
    </footer>
  );
}

function SocialRow() {
  const links = [
    { href: SOCIAL.x, label: "X", icon: <XIcon /> },
    { href: SOCIAL.instagram, label: "Instagram", icon: <InstagramIcon /> },
    { href: SOCIAL.threads, label: "Threads", icon: <ThreadsIcon /> },
    { href: SOCIAL.facebook, label: "Facebook", icon: <FacebookIcon /> },
    { href: SOCIAL.youtube, label: "YouTube", icon: <YouTubeIcon /> },
  ].filter((l) => l.href);

  if (links.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        padding: "20px 0 6px",
        borderTop: "1px solid color-mix(in srgb, var(--ion) 12%, transparent)",
        marginTop: 28,
      }}
    >
      <span
        style={{
          font: "600 11px/1 var(--f-mono)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-meta)",
          marginRight: 4,
        }}
      >
        Follow
      </span>
      {links.map(({ href, label, icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${BRAND_NAME} on ${label}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "1px solid color-mix(in srgb, var(--ion) 18%, transparent)",
            color: "var(--fg-muted)",
            transition: "color 120ms ease, border-color 120ms ease",
          }}
        >
          {icon}
        </a>
      ))}
    </div>
  );
}

/* — minimal monoline social icons (currentColor) — */
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.5 8.575L23 22h-6.91l-5.41-7.066L4.5 22H1.244l8.04-9.19L1 2h7.06l4.886 6.461L18.244 2zm-1.21 18h1.872L7.05 4H5.07l11.964 16z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ThreadsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 11.3c-.1 0-.1-.1-.2-.1-.1-2-1.2-3.1-3-3.2-1.1-.1-2 .4-2.5 1.3l1.1.7c.4-.7 1-.7 1.4-.7.5 0 .9.2 1.1.5.2.2.3.5.3.9-.5-.1-1-.1-1.5-.1-1.8 0-3 1-2.9 2.5.1 1.4 1.3 2.3 2.7 2.2 1.1-.1 1.9-.5 2.4-1.4.4.6.6 1.4.5 2.3-.2 1.4-1.2 2.3-2.7 2.3-1.7.1-2.8-.7-3.2-2.6L8 16.4c.6 2.5 2.4 3.7 4.4 3.7.7 0 1.4-.1 2-.4 1.4-.6 2.3-1.8 2.5-3.4.2-1.4-.1-2.7-.8-3.7.4-.4.5-.9.3-1.3zm-3.5 3.2c-.6 0-1.3-.4-1.4-.9 0-.6.5-.9 1.5-.9.4 0 .8 0 1.2.1-.1 1.1-.7 1.6-1.3 1.7zm-.3-12.5C7.2 2 3.2 5.6 3.2 12s4 10 9.4 10c5.4 0 9.4-3.6 9.4-10S18 2 12.6 2z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 10-11.56 9.88V14.9H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.9h-2.33v6.98A10 10 0 0022 12z" />
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 00-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 002.4 7.2 26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 001.76-1.77A26 26 0 0022 12a26 26 0 00-.4-4.8zM10 15V9l5.2 3-5.2 3z" />
    </svg>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {links.map(({ label, href }) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
