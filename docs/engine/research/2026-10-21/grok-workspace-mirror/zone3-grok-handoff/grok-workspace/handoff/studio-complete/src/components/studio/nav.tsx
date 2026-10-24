import { Link } from "@tanstack/react-router";
import { IG_DM } from "@/lib/kit-offer";

const items = [
  { to: "/", label: "Kit" },
  { to: "/signpreview", label: "SignPreview" },
  { to: "/vow", label: "Vow & Post" },
  { to: "/seating", label: "Seating" },
  { to: "/quote", label: "Quote" },
] as const;

export function StudioNav({
  current,
  cta,
  paper,
}: {
  current: string;
  cta?: { href: string; label: string };
  paper?: boolean;
}) {
  return (
    <header
      className={`relative z-20 flex items-center justify-between gap-4 px-5 py-5 md:px-8 ${paper ? "text-ink" : "text-paper"}`}
    >
      <Link to="/" className="font-display text-xl italic no-underline">
        Beexly
      </Link>
      <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Studio">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`no-underline transition-opacity duration-150 ${
              current === item.to ? "opacity-100" : "opacity-55 hover:opacity-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <a href={cta?.href ?? IG_DM} className={paper ? "btn-on-paper text-sm" : "btn-primary text-sm"}>
        {cta?.label ?? "DM KIT"}
      </a>
    </header>
  );
}
