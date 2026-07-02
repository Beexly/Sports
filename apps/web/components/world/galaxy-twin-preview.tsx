"use client";

/**
 * GalaxyTwinPreview — the signature market-map schematic of the public world.
 *
 * The slate rendered as a constellation: game nodes held by market-gravity
 * lines, distorted by public pressure, flagged by context gaps, opened by an
 * edge window, closed by the no-bet gate. Selecting a node explains how the
 * system reads that state — the visual TEACHES the semantic color system.
 *
 * Honesty: this is a labelled illustrative schematic of how the engine sees a
 * slate — never live market data. Doctrine: GALAXY_2026_PUBLIC_WORLD.md §2.
 * Reduced motion: ambient drift/dash animations stop via the global gw- guard;
 * the schematic stays fully readable and interactive.
 */

import { useState } from "react";
import Link from "next/link";

type NodeState = "signal" | "heat" | "caution" | "gated" | "quiet";

type TwinNode = {
  id: string;
  label: string;
  state: NodeState;
  /** Position as % of the schematic field. */
  x: number;
  y: number;
  reading: string;
  inputs: readonly string[];
  verdict: string;
};

const NODES: readonly TwinNode[] = [
  {
    id: "edge-window",
    label: "Edge window",
    state: "signal",
    x: 66,
    y: 30,
    reading:
      "Model probability and market price disagree by enough to matter, and every input is fresh. A window like this is the only thing that can become a published row.",
    inputs: ["Priced odds across books", "Fresh injury confirmation", "Model probability", "Line history"],
    verdict: "Candidate signal. It still has to clear every gate before publication.",
  },
  {
    id: "public-heat",
    label: "Public heat",
    state: "heat",
    x: 30,
    y: 22,
    reading:
      "Heavy one-sided public pressure has bent the line away from value. What looks like consensus is distortion: the price already ate the story.",
    inputs: ["Public-side concentration", "Line drift vs. open", "Media amplification"],
    verdict: "Distortion, not signal. The system reads it and stands aside.",
  },
  {
    id: "context-gap",
    label: "Context gap",
    state: "caution",
    x: 22,
    y: 64,
    reading:
      "A key availability question is unresolved. Incomplete context caps confidence no matter how good the price looks.",
    inputs: ["Unconfirmed injury report", "Rotation uncertainty", "Stale beat coverage"],
    verdict: "Held for review: caution until the inputs are real enough to defend.",
  },
  {
    id: "gated",
    label: "No-bet gate",
    state: "gated",
    x: 56,
    y: 74,
    reading:
      "An input failed a trust check: stale line, missing freshness, or model conflict. The gate closes and the pass is logged like any other decision.",
    inputs: ["Freshness check failed", "Price below threshold", "Model disagreement"],
    verdict: "Gate closed. No-Bet is a recorded output, not an absence.",
  },
  {
    id: "quiet-orbit",
    label: "Quiet orbit",
    state: "quiet",
    x: 84,
    y: 58,
    reading:
      "Market and model agree. An efficient price is a healthy reading. It just isn't an edge. Most of the slate lives here, and that's the honest shape of a market.",
    inputs: ["Price ≈ model probability", "Stable line", "No pressure imbalance"],
    verdict: "No action. Watching costs nothing; forcing a read costs plenty.",
  },
] as const;

const STATE_STYLE: Record<
  NodeState,
  { dot: string; ring: string; text: string; tag: string }
> = {
  signal: { dot: "bg-orbital-cyan", ring: "gw-ring-signal", text: "text-orbital-cyan", tag: "SIGNAL" },
  heat: { dot: "bg-plasma", ring: "gw-ring-heat", text: "text-plasma", tag: "DISTORTION" },
  caution: { dot: "bg-caution", ring: "gw-ring-caution", text: "text-caution", tag: "REVIEW" },
  gated: { dot: "bg-alert", ring: "gw-ring-gate", text: "text-alert", tag: "GATED" },
  quiet: { dot: "bg-ion-1", ring: "", text: "text-ion-1", tag: "EFFICIENT" },
};

/** Drifting noise fragments — the raw inputs the map resolves. */
const FRAGMENTS = [
  { text: "late steam?", x: 8, y: 12, drift: "gw-drift" },
  { text: "revenge narrative", x: 44, y: 8, drift: "gw-drift-2" },
  { text: "beat-writer rumor", x: 78, y: 14, drift: "gw-drift-3" },
  { text: "public 81% one side", x: 6, y: 42, drift: "gw-drift-2" },
  { text: "model split", x: 90, y: 36, drift: "gw-drift" },
  { text: "stale total?", x: 36, y: 90, drift: "gw-drift-3" },
  { text: "weather window", x: 76, y: 88, drift: "gw-drift" },
] as const;

export function GalaxyTwinPreview(): JSX.Element {
  const [activeId, setActiveId] = useState<string>("edge-window");
  const active = NODES.find((n) => n.id === activeId) ?? NODES[0]!;
  const activeStyle = STATE_STYLE[active.state];

  // Arrow keys traverse the constellation like a gamepad — the focused
  // hotspot moves with the selection so screen readers stay in sync.
  const onGroupKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const idx = NODES.findIndex((n) => n.id === activeId);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = NODES[(idx + step + NODES.length) % NODES.length]!;
    setActiveId(next.id);
    const target = e.currentTarget.querySelector<HTMLButtonElement>(`[data-node="${next.id}"]`);
    target?.focus();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      {/* ── The map ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-ds-lg border border-mineral bg-void">
        <div aria-hidden className="gw-starfield" />
        {/* market-gravity field */}
        <svg
          aria-hidden
          viewBox="0 0 100 70"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {/* gravity lines bend toward the heat node (30,22 → in viewBox terms) */}
          <path d="M0 18 Q 30 26, 66 21 T 100 16" fill="none" stroke="rgba(255,56,199,0.42)" strokeWidth="0.3" strokeDasharray="2 1.6" className="gw-dash-flow" />
          <path d="M0 36 Q 28 30, 56 38 T 100 34" fill="none" stroke="rgba(0,229,255,0.38)" strokeWidth="0.3" strokeDasharray="2 1.6" className="gw-dash-flow" />
          <path d="M0 54 Q 40 60, 70 52 T 100 56" fill="none" stroke="rgba(123,97,255,0.45)" strokeWidth="0.3" strokeDasharray="2 1.6" className="gw-dash-flow" />
          {/* connection threads between nodes */}
          <path d="M30 15.4 L66 21" stroke="rgba(255,56,199,0.5)" strokeWidth="0.22" fill="none" />
          <path d="M66 21 L56 51.8" stroke="rgba(0,229,255,0.5)" strokeWidth="0.22" fill="none" />
          <path d="M22 44.8 L56 51.8" stroke="rgba(255,180,84,0.5)" strokeWidth="0.22" fill="none" />
          <path d="M66 21 L84 40.6" stroke="rgba(152,163,181,0.4)" strokeWidth="0.22" fill="none" />
        </svg>

        {/* drifting noise fragments */}
        {FRAGMENTS.map((f) => (
          <span
            key={f.text}
            aria-hidden
            className={`pointer-events-none absolute font-mono text-[9px] uppercase tracking-[0.18em] text-plasma/60 ${f.drift}`}
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            {f.text}
          </span>
        ))}

        {/* node hotspots — real buttons, keyboard accessible */}
        <div
          className="relative aspect-[10/7] w-full"
          role="group"
          aria-label="Galaxy Twin schematic. Select a market state to read it. Arrow keys move between states."
          onKeyDown={onGroupKeyDown}
        >
          {NODES.map((node) => {
            const s = STATE_STYLE[node.state];
            const selected = node.id === activeId;
            return (
              <button
                key={node.id}
                type="button"
                data-node={node.id}
                onClick={() => setActiveId(node.id)}
                aria-pressed={selected}
                className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-3 transition-transform duration-200 hover:scale-110 focus-visible:scale-110 ${selected ? "" : "opacity-80"}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <span className={`relative block h-3.5 w-3.5 rounded-full ${s.dot} ${selected ? s.ring : ""}`}>
                  {node.state === "gated" ? (
                    <span aria-hidden className="gw-gate-ring absolute -inset-2.5" />
                  ) : null}
                  {node.state === "signal" ? (
                    // The edge window: an orbiting dashed aperture — open, scanning.
                    <span
                      aria-hidden
                      className={`gw-orbit absolute rounded-full border border-dashed border-orbital-cyan/70 ${
                        selected ? "-inset-3" : "-inset-2 opacity-60"
                      }`}
                    />
                  ) : null}
                </span>
                <span
                  className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.16em] ${selected ? s.text : "text-ion-2"}`}
                >
                  {node.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* semantic legend — the color system, taught in place */}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-mineral/60 bg-void/80 px-4 py-2.5 backdrop-blur-sm">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ion-2">
            Illustrative system schematic · not live market data
          </p>
          <ul aria-hidden className="hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.14em] sm:flex">
            <li className="flex items-center gap-1.5 text-orbital-cyan"><span className="h-1.5 w-1.5 rounded-full bg-orbital-cyan" />signal</li>
            <li className="flex items-center gap-1.5 text-plasma"><span className="h-1.5 w-1.5 rounded-full bg-plasma" />distortion</li>
            <li className="flex items-center gap-1.5 text-caution"><span className="h-1.5 w-1.5 rounded-full bg-caution" />review</li>
            <li className="flex items-center gap-1.5 text-alert"><span className="h-1.5 w-1.5 rounded-full bg-alert" />gated</li>
          </ul>
        </div>
      </div>

      {/* ── The reading ───────────────────────────────────────── */}
      <div className="flex flex-col rounded-ds-lg border border-mineral bg-eclipse p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl font-semibold text-ion-white">{active.label}</h3>
          <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${activeStyle.text}`}>
            {activeStyle.tag}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-ion-1">{active.reading}</p>
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">Inputs in play</p>
          <ul className="mt-2 space-y-1.5">
            {active.inputs.map((input) => (
              <li key={input} className="flex items-center gap-2 text-sm text-ion">
                <span aria-hidden className={`h-1 w-1 rounded-full ${activeStyle.dot}`} />
                {input}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-5 border-t border-mineral pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">System verdict</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-ion-white">{active.verdict}</p>
        </div>
        <div className="mt-auto pt-6">
          <Link href="/observatory" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
            Open the full Edge Map ▸
          </Link>
        </div>
      </div>
    </div>
  );
}
