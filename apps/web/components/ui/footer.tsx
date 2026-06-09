import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { BRAND_NAME, BRAND_TAGLINE, HELPLINE, SOCIAL } from "@/lib/brand";

const PRODUCT_LINKS = [
  { label: "Today's Board", href: "/board" },
  { label: "Edge Map", href: "/observatory" },
  { label: "Public Ledger", href: "/ledger" },
  { label: "Methodology", href: "/methodology" },
] as const;

const COMPANY_LINKS = [
  { label: "Calibration Report", href: "/performance" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
] as const;

// Legal + responsible-play links live in the polished bottom bar.
const LEGAL_LINKS = [
  { label: "Terms & Privacy", href: "/terms" },
  { label: "Responsible play", href: "/responsible-play" },
] as const;

const SOCIAL_LINKS = [
  { href: SOCIAL.x, label: "X" },
  { href: SOCIAL.instagram, label: "Instagram" },
  { href: SOCIAL.threads, label: "Threads" },
  { href: SOCIAL.facebook, label: "Facebook" },
].filter((link) => link.href);

export function Footer() {
  return (
    <footer className="footer">
      {/* Ambient wordmark — closing brand statement behind the columns. */}
      <div className="footer-wordmark" aria-hidden="true">
        GALAXY SPORTS EDGE
      </div>

      <div className="container">
        <div className="footer-inner">
          {/* Brand zone — lockup, a confident line, and the social row. */}
          <div className="footer-brand">
            <div className="footer-lockup">
              <BrandLockup />
            </div>
            <p className="footer-line">{BRAND_TAGLINE}</p>

            {SOCIAL_LINKS.length > 0 && (
              <div className="social-row">
                {SOCIAL_LINKS.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${BRAND_NAME} on ${label}`}
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />

          {/* Responsible-play helpline — kept prominent, not buried in a list. */}
          <div className="footer-help">
            <h4>Play responsibly</h4>
            <p>Set your limits before the slate starts. If it stops being fun, step away.</p>
            <a className="footer-helpline" href={HELPLINE.href} target="_blank" rel="noopener noreferrer">
              <span className="footer-helpline-num">{HELPLINE.number}</span>
              <span className="footer-helpline-name">{HELPLINE.name}</span>
            </a>
          </div>
        </div>

        {/* Polished bottom bar — copyright, age line, legal, all on one rail. */}
        <div className="footer-bar">
          <span className="footer-copy">
            &copy; {new Date().getFullYear()} {BRAND_NAME}
          </span>
          <span className="footer-age">21+ &middot; Signals, not certainty</span>
          <nav className="footer-legal" aria-label="Legal">
            {LEGAL_LINKS.map(({ label, href }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
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
    <div className="footer-col">
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
