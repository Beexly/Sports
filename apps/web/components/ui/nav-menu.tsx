"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Desktop nav dropdown. Visuals stay pure CSS (group-hover /
 * group-focus-within, identical to the previous server render); this client
 * wrapper exists ONLY so the trigger can tell assistive tech whether the
 * popup it declares is actually open (aria-expanded) — a hover-CSS dropdown
 * with aria-haspopup and no state is a silent lie to a screen reader.
 */

export type NavItem = { label: string; href: string; desc: string };
export type NavGroup = { heading?: string; items: readonly NavItem[] };

export function NavMenu({
  label,
  href,
  groups,
}: {
  label: string;
  href: string;
  groups: readonly NavGroup[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        // Close only when focus leaves the whole menu, not when it moves
        // between the trigger and the panel items.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <Link
        href={href}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1"
      >
        {label}
        <span aria-hidden className="text-[9px] opacity-70 transition-transform duration-150 group-hover:rotate-180">▼</span>
      </Link>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="surface-card flex w-[20rem] max-w-[90vw] flex-col gap-2 p-2">
          {groups.map((group, gi) => (
            <div key={group.heading ?? `g${gi}`} className="flex flex-col gap-0.5">
              {group.heading ? (
                <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-200">
                  {group.heading}
                </p>
              ) : null}
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-md px-2 py-1.5 hover:bg-white/5">
                  <span className="block text-sm font-medium text-white">{item.label}</span>
                  <span className="block text-xs text-ink-200">{item.desc}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
