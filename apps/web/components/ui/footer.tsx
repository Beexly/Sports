import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { BRAND_NAME, CLOSING_LINE, HELPLINE, SOCIAL } from "@/lib/brand";

const PRODUCT_LINKS = [
  { label: "Signal Feed", href: "/picks" },
  { label: "Edge Map", href: "/observatory" },
  { label: "Galaxy IQ", href: "/methodology" },
  { label: "The Vault", href: "/vault" },
] as const;

const COMPANY_LINKS = [
  { label: "Calibration Report", href: "/performance" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Press", href: "/press" },
  { label: "FAQ", href: "/faq" },
  { label: "Changelog", href: "/changelog" },
] as const;

const RESPONSIBLE_LINKS = [
  { label: "Set limits", href: "/responsible-play" },
  { label: "Variance guide", href: "/responsible-play#variance" },
  { label: `Help: ${HELPLINE.shortLabel}`, href: HELPLINE.href },
  { label: "Terms and Privacy", href: "/terms" },
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
      {/* Ambient wordmark — closing brand statement under the link columns */}
      <div className="footer-wordmark" aria-hidden="true">
        GALAXY SPORTS EDGE
      </div>
      <div className="container">
        <div className="footer-inner">
          <div>
            <div className="footer-lockup">
              <BrandLockup />
            </div>
            <p className="disclaim">
              I built {BRAND_NAME} to deliver calibrated market signals, not
              certainty. Treat each one as one input in a disciplined decision —
              never the decision itself.{" "}
              <strong style={{ color: "var(--ion)" }}>
                Set limits before emotion enters.
              </strong>
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Responsible" links={RESPONSIBLE_LINKS} />
        </div>

        {SOCIAL_LINKS.length > 0 && (
          <div className="social-row">
            <span>Follow</span>
            {SOCIAL_LINKS.map(({ href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            ))}
          </div>
        )}

        <div className="bottom">
          <span>{new Date().getFullYear()} {BRAND_NAME.toUpperCase()} / FIND THE SIGNAL BEFORE THE MARKET MOVES</span>
          <span>{CLOSING_LINE.toUpperCase()}</span>
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
