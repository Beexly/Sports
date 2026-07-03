"use client";

/**
 * CockpitCommandPalette — ⌘K / Ctrl-K fast navigation across the operator deck.
 *
 * The public CommandPalette (components/ui/command-palette.tsx) lists ZERO
 * /cockpit routes, so an operator deep in the flight deck has no fast jump
 * between cockpit views. This is the cockpit counterpart: same keyboard-first
 * interaction model (arrows + enter + esc), mounted once inside the
 * authenticated cockpit layout.
 *
 * Every entry mirrors a real, implemented cockpit route already present in
 * layout.tsx's NAV — the list is kept identical so nav-coverage stays
 * satisfied and no command can point at a page that doesn't exist.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type CockpitCommand = {
  label: string;
  href: string;
  group: string;
  keywords?: string;
};

/**
 * Sourced 1:1 from layout.tsx's NAV (same hrefs + labels, same order). Keep in
 * lockstep with NAV: every href below is an implemented /cockpit page.
 *
 * Exported (read-only) so tests can pin that every command targets a real
 * /cockpit route — changes nothing at runtime.
 */
export const COCKPIT_COMMANDS: readonly CockpitCommand[] = [
  // Command
  { label: "Overview", href: "/cockpit", group: "Command", keywords: "jarvis launch assessment home" },
  { label: "Command Center", href: "/cockpit/command-center", group: "Command", keywords: "ranked owner attention" },
  { label: "Daily brief", href: "/cockpit/brief", group: "Command", keywords: "today slate snapshot" },
  { label: "Tasks", href: "/cockpit/tasks", group: "Command", keywords: "queue status" },
  { label: "Review", href: "/cockpit/review", group: "Command", keywords: "needs review blocked" },
  // Picks & proof
  { label: "History", href: "/cockpit/history", group: "Picks & proof", keywords: "pick forensic ledger" },
  { label: "Market Twin", href: "/cockpit/market-twin", group: "Picks & proof", keywords: "upcoming board posture" },
  { label: "Losses", href: "/cockpit/losses", group: "Picks & proof", keywords: "autopsy authoring queue" },
  { label: "Calibration", href: "/cockpit/calibration", group: "Picks & proof", keywords: "model accountability" },
  // Agents & memory
  { label: "Agents", href: "/cockpit/agents", group: "Agents & memory", keywords: "six operator roles" },
  { label: "Memory", href: "/cockpit/memory", group: "Agents & memory", keywords: "memory review queue" },
  // Content & promo
  { label: "Media", href: "/cockpit/media", group: "Content & promo", keywords: "draft content workflow" },
  { label: "Content", href: "/cockpit/content", group: "Content & promo", keywords: "ava draft only engine" },
  { label: "Studio", href: "/cockpit/studio", group: "Content & promo", keywords: "creator asset workspace" },
  { label: "Journal", href: "/cockpit/journal", group: "Content & promo", keywords: "weekly model essay" },
  { label: "Film Room", href: "/cockpit/film-room", group: "Content & promo", keywords: "visual production spend gated" },
  { label: "Promotions", href: "/cockpit/promotions", group: "Content & promo", keywords: "bobby sportsbook offers" },
  { label: "Promo Desk", href: "/cockpit/promo-desk", group: "Content & promo", keywords: "operator registry" },
  { label: "Bot Outbox", href: "/cockpit/bot-outbox", group: "Content & promo", keywords: "draft event planner" },
  // Signals & sources
  { label: "Sources", href: "/cockpit/sources", group: "Signals & sources", keywords: "source intelligence" },
  { label: "Airwave", href: "/cockpit/airwave", group: "Signals & sources", keywords: "pundit claim review" },
  { label: "Listener Log", href: "/cockpit/listener-log", group: "Signals & sources", keywords: "manual broadcast claim entry" },
  { label: "Moderation", href: "/cockpit/moderation", group: "Signals & sources", keywords: "community room queue" },
  // Ops
  { label: "Integrity", href: "/cockpit/integrity", group: "Ops", keywords: "built wired proven public safe ledger" },
  { label: "API Costs", href: "/cockpit/api-costs", group: "Ops", keywords: "claude budget monitor spend" },
  { label: "Synthetic Monitoring", href: "/cockpit/synthetic-monitoring", group: "Ops", keywords: "production probes" },
];

export function CockpitCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COCKPIT_COMMANDS;
    return COCKPIT_COMMANDS.filter((c) =>
      `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(s)
    );
  }, [q]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) go(r.href);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open cockpit command palette"
        className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-xs font-medium shadow-lg transition-transform hover:-translate-y-0.5"
        style={{
          background: "color-mix(in srgb, var(--void) 85%, transparent)",
          border: "1px solid var(--titanium)",
          color: "var(--ion-2)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span aria-hidden style={{ color: "var(--orbital-cyan)" }}>
          ⌘
        </span>
        <span className="hidden sm:inline">Cockpit jump…</span>
        <kbd
          className="rounded px-1 py-0.5 text-label"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          ⌘K
        </kbd>
      </button>
    );
  }

  // Group results preserving order.
  const groups: { name: string; items: { c: CockpitCommand; i: number }[] }[] = [];
  results.forEach((c, i) => {
    let g = groups.find((x) => x.name === c.group);
    if (!g) {
      g = { name: c.group, items: [] };
      groups.push(g);
    }
    g.items.push({ c, i });
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Cockpit command palette"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(2,4,8,0.7)", backdropFilter: "blur(4px)" }}
        onClick={() => setOpen(false)}
      />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-titanium/40 bg-obsidian/95 p-0"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--titanium)" }}
        >
          <span aria-hidden style={{ color: "var(--orbital-cyan)" }}>
            ⌘
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to a cockpit view — tasks, calibration, airwave…"
            className="flex-1 bg-transparent font-mono text-sm text-ion-white outline-none placeholder:text-ion-3"
            aria-label="Search cockpit commands"
          />
          <kbd
            className="rounded px-1.5 py-0.5 text-label text-ion-3"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            esc
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-ion-3">No matches.</p>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <p className="px-3 py-1 font-mono text-label uppercase tracking-label text-ion-3">
                {g.name}
              </p>
              {g.items.map(({ c, i }) => (
                <button
                  key={c.href}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(c.href)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
                  style={{
                    background:
                      active === i
                        ? "color-mix(in srgb, var(--orbital-cyan) 8%, transparent)"
                        : "transparent",
                    color: active === i ? "var(--ion-white)" : "var(--ion-2)",
                  }}
                >
                  <span className="flex-1 truncate">{c.label}</span>
                  {active === i && (
                    <span aria-hidden style={{ color: "var(--orbital-cyan)" }}>
                      ↵
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
