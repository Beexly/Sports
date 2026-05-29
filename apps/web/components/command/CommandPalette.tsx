"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export interface CommandPaletteItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly category: string;
  readonly summary?: string;
}

export interface CommandPaletteProps {
  readonly items: ReadonlyArray<CommandPaletteItem>;
}

/**
 * Command Palette — keyboard-driven fuzzy search across every registered
 * surface. Press '/' anywhere on a page (when not inside an input field)
 * to open. Esc to close. Up/Down to navigate. Enter to navigate.
 *
 * Mouse-optional; keyboard-first.
 */
export function CommandPalette({ items }: CommandPaletteProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const router = useRouter();

  // Filter items by query
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 20);
    return items
      .filter((item) => {
        const hay = `${item.label} ${item.category} ${item.summary ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [items, query]);

  // Reset active index when query changes
  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Global key handler
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Open on '/' when not in an input
      if (event.key === "/" && !open) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const item = filtered[activeIndex];
        if (item) {
          setOpen(false);
          setQuery("");
          router.push(item.path);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIndex, router]);

  // Focus input on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  if (!open) return <></>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-mineral bg-carbon shadow-2xl">
        <div className="border-b border-mineral px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions, surfaces, methodology, ADRs..."
            className="w-full bg-transparent text-base text-white placeholder-gray-600 outline-none"
            aria-label="Search query"
          />
        </div>
        <ul ref={listRef} className="max-h-96 overflow-y-auto" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-gray-500">
              No matches. Try a different search.
            </li>
          ) : (
            filtered.map((item, i) => (
              <li
                key={item.id}
                role="option"
                aria-selected={i === activeIndex}
                className={[
                  "border-b border-mineral/40 px-4 py-3 last:border-b-0 cursor-pointer transition-colors",
                  i === activeIndex ? "bg-gray-900/80" : "hover:bg-gray-900/40",
                ].join(" ")}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(item.path);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
                    {item.category}
                  </span>
                </div>
                {item.summary && (
                  <p className="mt-1 text-xs leading-5 text-gray-400">{item.summary}</p>
                )}
                <p className="mt-1 font-mono text-[9px] text-gray-600">{item.path}</p>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-mineral px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-gray-600">
          <span>↑↓ navigate</span>
          <span className="ml-4">⏎ open</span>
          <span className="ml-4">esc close</span>
        </div>
      </div>
    </div>
  );
}
