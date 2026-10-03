/**
 * Static, GL-free fallback for the Galaxy Slate Twin.
 *
 * Rendered for first paint / LCP and while the heavy three.js chunk loads (and
 * as the prefers-reduced-motion-safe placeholder before intersection). No
 * WebGL, no animation loop - just a legible composition: a vignetted stage with
 * the disclosure, plus the slate manifest so the content is present and
 * crawlable without waiting on the GL bundle. Demo data only.
 */

import { VERDICT_HEX, type TwinSlate } from "@/lib/slate-twin/demo-slate";
import { BRAND_COLORS } from "@/lib/brand";

export function GalaxySlateTwinStatic({ slate }: { slate: TwinSlate }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2" aria-hidden>
        <span className="mr-1 text-xs uppercase tracking-[0.16em] text-ink-500">Navigate</span>
        {["All leagues", "NFL", "NBA", "MLB", "NHL"].map((l, i) => (
          <span
            key={l}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{
              color: i === 0 ? BRAND_COLORS.obsidianBlack : "var(--ion-1)",
              background: i === 0 ? BRAND_COLORS.orbitalCyan : "rgba(255,255,255,0.05)",
              border: `1px solid ${i === 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.steelGray}`,
            }}
          >
            {l}
          </span>
        ))}
      </div>

      <div
        className="relative flex h-[58vh] min-h-[420px] w-full items-center justify-center overflow-hidden rounded-2xl"
        style={{
          border: `1px solid ${BRAND_COLORS.steelGray}`,
          background: `radial-gradient(120% 90% at 50% 42%, ${BRAND_COLORS.softUltraviolet}14, transparent 55%), radial-gradient(80% 70% at 72% 30%, ${BRAND_COLORS.orbitalCyan}0e, transparent 60%), ${BRAND_COLORS.obsidianBlack}`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(120% 90% at 50% 45%, transparent 52%, ${BRAND_COLORS.obsidianBlack}66 78%, ${BRAND_COLORS.obsidianBlack} 100%)` }}
        />
        <div className="relative text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500">Edge Map</p>
          <p className="mt-2 max-w-sm px-6 text-sm text-ink-400">
            The slate as a navigable instrument - bringing the spatial view online.
          </p>
        </div>
        <p className="pointer-events-none absolute right-4 top-3 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ion-3, #6b7785)" }}>
          {slate.generatedLabel}
        </p>
      </div>

      <div className="surface-card mt-5 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-500">
          Slate manifest - {slate.games.length} system{slate.games.length === 1 ? "" : "s"}
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {slate.games.map((g) => {
            const color = VERDICT_HEX[g.verdict];
            return (
              <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2.5">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                  <span className="text-sm text-white">{g.label}</span>
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color }}>{g.verdict}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
