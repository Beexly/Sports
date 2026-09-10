"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * NavActiveLink — a nav link that marks itself iris when the current route
 * sits under its href. Iris is the wayfinding accent: never a CTA color,
 * never body copy. An underline bar reinforces the state without hue alone.
 */
export function NavActiveLink({ href, title, children }: { href: string; title?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "page" : undefined}
      className={active ? "text-iris" : undefined}
      style={active ? { boxShadow: "inset 0 -2px 0 var(--iris)" } : undefined}
    >
      {children}
    </Link>
  );
}
