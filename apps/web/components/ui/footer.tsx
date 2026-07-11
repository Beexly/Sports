import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { LogoMarkInline } from "@/components/brand/logo-mark-inline";
import { BRAND_NAME, CLOSING_LINE, GSN_NAME, HELPLINE, SOCIAL } from "@/lib/brand";

const PRODUCT_LINKS = [
  { label: "Today's Picks", href: "/picks" },
  { label: "The NFL House", href: "/house" },
  { label: "Today's Board", href: "/board" },
  { label: "Galaxy Twin", href: "/observatory" },
  { label: "CLV Tracker", href: "/track" },
  { label: "Trend Lab", href: "/trends" },
  { label: "Decision Autopsy", href: "/performance/losses" },
  { label: "Parlay MRI", href: "/parlay-mri" },
  { label: "Start-Sit Helper", href: "/fantasy/lineup" },
  { label: "Contests", href: "/fantasy/contests" },
  { label: "The Beat", href: "/the-beat" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Podcast", href: "/podcast" },
  { label: "The Studio", href: "/fantasy/studio" },
  { label: "The Academy", href: "/academy" },
] as const;

const COMPANY_LINKS = [
  { label: "The Sealed Engine", href: "/engine" },
  { label: "Proof of Record", href: "/proof" },
  { label: "Verify a Receipt", href: "/verify" },
  { label: "Accountability", href: "/accountability" },
  { label: "FABLE Evidence Lab", href: "/fable" },
  { label: "Receipts · Calibration", href: "/performance" },
  { label: "Closing Line Value", href: "/clv" },
  { label: "Methodology", href: "/methodology" },
  { label: "The Vault", href: "/vault" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Press", href: "/press" },
  { label: "FAQ", href: "/faq" },
] as const;

const RESPONSIBLE_LINKS = [
  { label: "Set limits", href: "/responsible-play" },
  { label: "Variance guide", href: "/responsible-play#variance" },
  { label: `Help: ${HELPLINE.shortLabel}`, href: HELPLINE.href },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
] as const;

// Beyond the NFL: the other sports data hubs plus the data-sourcing record.
const DATA_LINKS = [
  { label: "MLB stats", href: "/mlb" },
  { label: "NHL stats", href: "/nhl" },
  { label: "NFL weather", href: "/weather" },
  { label: "NFL stat intelligence", href: "/stats" },
  { label: "How we source data", href: "/data" },
] as const;

const SOCIAL_LINKS = [
  { href: SOCIAL.x, label: "X" },
  { href: SOCIAL.instagram, label: "Instagram" },
  { href: SOCIAL.threads, label: "Threads" },
  { href: SOCIAL.facebook, label: "Facebook" },
  { href: SOCIAL.telegram, label: "Telegram" },
  { href: SOCIAL.whatsapp, label: "WhatsApp" },
  { href: SOCIAL.discord, label: "Discord" },
].filter((link) => link.href);

export function Footer() {
  return (
    <footer className="footer">
      {/* Ambient wordmark — closing brand statement under the link columns */}
      <div className="footer-wordmark group relative" aria-hidden="true">
        <span className="transition-opacity duration-500 group-hover:opacity-0">GALAXY SPORTS EDGE</span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <LogoMarkInline size={28} pulse glow />
        </span>
      </div>
      <div className="container">
        <div className="footer-inner">
          <div>
            <div className="footer-lockup">
              <BrandLockup />
            </div>
            <p className="disclaim">
              {BRAND_NAME} delivers calibrated market signals, not certainty.
              Treat each one as one input in a disciplined decision, never
              the decision itself.{" "}
              <strong style={{ color: "var(--ion)" }}>
                Set limits before emotion enters.
              </strong>
            </p>
            <p className="mt-4 text-xs text-ion-3">
              {BRAND_NAME} is a {GSN_NAME} production.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Data" links={DATA_LINKS} />
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
          <span>{new Date().getFullYear()} {BRAND_NAME.toUpperCase()} / MATH YOU CAN READ</span>
          <span className="flex items-center gap-3">
            <a href="/?intro=play" className="opacity-70 transition-opacity hover:opacity-100">
              ▶ Replay intro
            </a>
            <span aria-hidden>·</span>
            {CLOSING_LINE.toUpperCase()}
          </span>
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
      <h2 className="footer-col-title">{title}</h2>
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
