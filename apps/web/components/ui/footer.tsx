import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { BRAND_NAME, CLOSING_LINE, GSN_NAME, HELPLINE, SOCIAL } from "@/lib/brand";

/** Condensed footer — five destinations, not a sitemap. */
const FOOTER_LINKS = [
  { label: "Board", href: "/board" },
  { label: "Record", href: "/performance" },
  { label: "Method", href: "/methodology" },
  { label: "Verify", href: "/verify" },
  { label: "Plans", href: "/pricing" },
] as const;

const SOCIAL_LINKS = [
  { href: SOCIAL.x, label: "X" },
  { href: SOCIAL.instagram, label: "Instagram" },
].filter((link) => link.href);

/**
 * Disclosure links. These were carried by the previous footer's COMPANY_LINKS
 * and RESPONSIBLE_LINKS and must survive any visual redesign: the affiliate
 * pledge, the how-we-make-money disclosure, the accountability record, the
 * responsible-play help, and the terms/privacy pair are the public record of
 * how this product earns and what it promises. Dropping them from the footer
 * removes them from every page at once.
 */
const DISCLOSURE_LINKS = [
  { label: "Accountability", href: "/accountability" },
  { label: "How We Make Money", href: "/how-we-make-money" },
  { label: "Affiliate Pledge", href: "/pledge" },
  { label: "Responsible play", href: "/responsible-play" },
  { label: "Variance guide", href: "/responsible-play#variance" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
] as const;

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div
          className="flex flex-wrap items-center gap-x-8 gap-y-4 py-6"
          style={{ borderBottom: "1px solid var(--mineral)" }}
        >
          <div className="footer-lockup" style={{ marginBottom: 0 }}>
            <BrandLockup />
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2 transition-colors hover:text-plasma"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
            {SOCIAL_LINKS.map(({ href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2 transition-colors hover:text-plasma"
              >
                {label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
            <a
              href={HELPLINE.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2 transition-colors hover:text-plasma"
            >
              {HELPLINE.shortLabel}
            </a>
          </div>
        </div>
        <p className="disclaim py-5" style={{ maxWidth: "52rem" }}>
          {BRAND_NAME} delivers market signals, not certainty. One input in a
          disciplined decision, never the decision itself. Set limits before
          emotion enters. Only stake what you can afford to lose without changing
          your week. Past results promise nothing about the next one.{" "}
          <a href={HELPLINE.href} target="_blank" rel="noopener noreferrer">
            {HELPLINE.shortLabel}
          </a>
        </p>
        <nav
          aria-label="Disclosures"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 py-4 font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ borderTop: "1px solid var(--mineral)" }}
        >
          {DISCLOSURE_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-ion-2 transition-colors hover:text-plasma"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="bottom flex flex-wrap items-center gap-x-4 gap-y-2 pb-6">
          <span>
            © {new Date().getFullYear()} {BRAND_NAME} · {GSN_NAME}
          </span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
            {CLOSING_LINE}
          </span>
        </div>
      </div>
    </footer>
  );
}
