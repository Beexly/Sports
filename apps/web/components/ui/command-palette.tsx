"use client";

/**
 * CommandPalette — ⌘K / Ctrl-K fast navigation across the whole platform.
 *
 * A feature-rich site needs a fast way through it. Press ⌘K anywhere, type, and
 * jump. Keyboard-first (arrows + enter + esc), reduced-motion friendly, mounted
 * once globally.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND_COLORS } from "@/lib/brand";

type Command = { label: string; href: string; group: string; keywords?: string };

const COMMANDS: Command[] = [
  // Intelligence
  { label: "Today's Board", href: "/board", group: "Intelligence", keywords: "picks games slate" },
  { label: "Edge Map", href: "/observatory", group: "Intelligence", keywords: "observatory market" },
  { label: "Inside the Signal", href: "/intelligence", group: "Intelligence", keywords: "engine reasoning how it works" },
  { label: "The Beat", href: "/the-beat", group: "Intelligence", keywords: "news breaking injuries reporters" },
  { label: "GSN Transmission", href: "/gsn", group: "Intelligence", keywords: "daily news network" },
  { label: "Parlay MRI", href: "/parlay-mri", group: "Intelligence", keywords: "parlay risk genome" },
  { label: "The Academy", href: "/academy", group: "Intelligence", keywords: "train scenarios lessons" },
  { label: "Trust Ledger", href: "/ledger", group: "Intelligence", keywords: "merkle proof record" },
  { label: "FABLE Evidence Lab", href: "/fable", group: "Intelligence", keywords: "proof evidence source rights claims aws gates fable" },
  { label: "CLV Tracker", href: "/track", group: "Intelligence", keywords: "bets clv closing line value calibration roi" },
  { label: "The Cipher", href: "/cipher", group: "Intelligence", keywords: "puzzle hunt easter egg" },
  { label: "Methodology", href: "/methodology", group: "Intelligence", keywords: "how method" },
  { label: "Pricing", href: "/pricing", group: "Intelligence", keywords: "plans subscribe cost" },
  // Fantasy
  { label: "Fantasy Home", href: "/fantasy", group: "Fantasy", keywords: "football roster" },
  { label: "Connect League", href: "/fantasy/connect", group: "Fantasy", keywords: "sleeper sync import roster" },
  { label: "GM Autopilot", href: "/fantasy/autopilot", group: "Fantasy", keywords: "delegate manage automation" },
  { label: "The League Twin", href: "/fantasy/league-twin", group: "Fantasy", keywords: "galaxy visual roster 3d" },
  { label: "The GM Ledger", href: "/fantasy/gm-ledger", group: "Fantasy", keywords: "process grade decisions" },
  { label: "GM Academy", href: "/fantasy/academy", group: "Fantasy", keywords: "drills lessons injury market analytics" },
  { label: "Draft Assistant", href: "/fantasy/draft", group: "Fantasy", keywords: "tiers vor pick" },
  { label: "Best Ball", href: "/fantasy/bestball", group: "Fantasy", keywords: "best ball draft ceiling stack spike bye" },
  { label: "Waiver & FAAB", href: "/fantasy/waivers", group: "Fantasy", keywords: "adds bids drop" },
  { label: "Start-Sit Helper", href: "/fantasy/lineup", group: "Fantasy", keywords: "start sit lineup optimizer" },
  { label: "DFS Optimizer", href: "/fantasy/dfs", group: "Fantasy", keywords: "draftkings salary cap leverage stack" },
  { label: "Pick'em Edge", href: "/fantasy/props", group: "Fantasy", keywords: "underdog prizepicks dk pick6 props" },
  { label: "Trade Analyzer", href: "/fantasy/trade", group: "Fantasy", keywords: "value fairness" },
  { label: "Scheme Intelligence", href: "/fantasy/scheme", group: "Fantasy", keywords: "coaching change cascade" },
  { label: "Contests", href: "/fantasy/contests", group: "Fantasy", keywords: "best ball survivor squares" },
  // Account
  { label: "Dashboard", href: "/dashboard", group: "Account", keywords: "account" },
  { label: "Sign in", href: "/auth/signin", group: "Account", keywords: "login" },
];

export function CommandPalette() {
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
    if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); }
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COMMANDS;
    return COMMANDS.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(s));
  }, [q]);

  useEffect(() => { if (active >= results.length) setActive(0); }, [results, active]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const r = results[active]; if (r) go(r.href); }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="fixed bottom-5 right-5 z-[90] hidden items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg transition-transform hover:-translate-y-0.5 sm:flex"
        style={{ background: "rgba(10,13,20,0.85)", border: `1px solid ${BRAND_COLORS.steelGray}`, color: "#c8d2dd", backdropFilter: "blur(8px)" }}
      >
        <span aria-hidden style={{ color: BRAND_COLORS.orbitalCyan }}>⌘</span>
        <span className="hidden sm:inline">Jump to…</span>
        <kbd className="rounded px-1 py-0.5 text-[10px]" style={{ background: "rgba(255,255,255,0.06)" }}>⌘K</kbd>
      </button>
    );
  }

  // group results preserving order
  const groups: { name: string; items: { c: Command; i: number }[] }[] = [];
  results.forEach((c, i) => {
    let g = groups.find((x) => x.name === c.group);
    if (!g) { g = { name: c.group, items: [] }; groups.push(g); }
    g.items.push({ c, i });
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" style={{ background: "rgba(2,4,8,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setOpen(false)} />
      <div className="surface-card relative w-full max-w-xl overflow-hidden p-0" style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
          <span aria-hidden style={{ color: BRAND_COLORS.orbitalCyan }}>⌘</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to anything: board, fantasy, tracker…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-ink-600"
            aria-label="Search commands"
          />
          <kbd className="rounded px-1.5 py-0.5 text-[10px] text-ink-600" style={{ background: "rgba(255,255,255,0.06)" }}>esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-500">No matches.</p>}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <p className="px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-600">{g.name}</p>
              {g.items.map(({ c, i }) => (
                <button
                  key={c.href}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(c.href)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
                  style={{ background: active === i ? `${BRAND_COLORS.orbitalCyan}14` : "transparent", color: active === i ? "#fff" : "#c8d2dd" }}
                >
                  <span className="flex-1 truncate">{c.label}</span>
                  {active === i && <span aria-hidden style={{ color: BRAND_COLORS.orbitalCyan }}>↵</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
