"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Accessible tabbed nav + a filter-bar primitive for the LIGHT paper data
 * surfaces. URL-query aware so a server page can read the active view straight
 * from `searchParams` and fetch accordingly — the tabs are plain <Link>s that
 * set a query param (?view= / ?engine=), so they work without client data
 * fetching and keep the page shareable/bookmarkable.
 *
 * `<Tabs>` is a "use client" component only because it builds hrefs and renders
 * interactive controls; it does NOT own selection state — the URL does. The
 * parent passes the currently-active value (derived from searchParams server
 * side) so there is one source of truth.
 */

// ── Pure helper (exported for unit testing) ──────────────────────────────────

/**
 * Build an href for a tab that sets `param=value` while preserving the other
 * existing query params. Pass the current params as a plain record (what a
 * Next server page receives as `searchParams`).
 */
export function buildTabHref(
  pathname: string,
  param: string,
  value: string,
  currentParams: Record<string, string | string[] | undefined> = {},
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(currentParams)) {
    if (k === param) continue;
    if (Array.isArray(v)) {
      for (const item of v) sp.append(k, item);
    } else if (v != null) {
      sp.set(k, v);
    }
  }
  sp.set(param, value);
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

export interface TabItem {
  /** Value written to the query param. */
  value: string;
  label: ReactNode;
  /** Optional native title tooltip. */
  tooltip?: string;
}

export interface TabsProps {
  /** Query param these tabs drive (e.g. "view", "engine"). */
  param: string;
  /** Currently-active value (derived from searchParams on the server). */
  active: string;
  items: ReadonlyArray<TabItem>;
  /** Pathname the links point at (current route). */
  pathname: string;
  /** Other current query params to preserve when switching tabs. */
  currentParams?: Record<string, string | string[] | undefined>;
  /** Accessible label for the tablist. */
  ariaLabel?: string;
  className?: string;
  /**
   * Surface variant. "paper" (default) keeps the original light ink/paper
   * classes so every existing caller is unaffected. "dark" swaps to the cosmic
   * dark tokens used across the dark pages.
   */
  variant?: "paper" | "dark";
}

const TABS_VARIANTS = {
  paper: {
    wrap: "border-paper-border bg-paper",
    active: "bg-paper-raised text-ink shadow-sm",
    inactive: "text-ink-1 hover:bg-paper-sunken hover:text-ink",
    ring: "focus-visible:ring-ink-1/30",
  },
  dark: {
    wrap: "border-mineral bg-carbon",
    active: "bg-eclipse text-ion-white shadow-sm",
    inactive: "text-ion-1 hover:bg-eclipse hover:text-ion-white",
    ring: "focus-visible:ring-orbital-cyan/30",
  },
} as const;

export function Tabs({
  param,
  active,
  items,
  pathname,
  currentParams = {},
  ariaLabel = "Views",
  className = "",
  variant = "paper",
}: TabsProps): JSX.Element {
  const tv = TABS_VARIANTS[variant];
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex flex-wrap items-center gap-1 rounded-ds-md border p-1 ${tv.wrap} ${className}`}
    >
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <Link
            key={item.value}
            href={buildTabHref(pathname, param, item.value, currentParams)}
            role="tab"
            aria-selected={isActive}
            title={item.tooltip}
            scroll={false}
            className={`min-h-[36px] rounded-ds-sm px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 ${tv.ring} ${
              isActive ? tv.active : tv.inactive
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

// ── FilterBar primitive ──────────────────────────────────────────────────────

export interface FilterBarProps {
  /** Left side — typically a <Tabs/>. */
  children?: ReactNode;
  /** Right side — chips, counts, secondary actions. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * A quiet bar that hosts tabs/filters on the left and meta/actions on the right.
 * Paper-surface; wraps gracefully on narrow viewports.
 */
export function FilterBar({ children, trailing, className = "" }: FilterBarProps): JSX.Element {
  return (
    <div
      className={`flex flex-col gap-3 rounded-ds-md border border-paper-border bg-paper-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {trailing ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">{trailing}</div>
      ) : null}
    </div>
  );
}
