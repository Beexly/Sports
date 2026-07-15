"use client";

import { useMemo, useState } from "react";
import {
  rankWireCorroborated,
  signalLabel,
  TIER_WEIGHT,
  type NewsItem,
  type Tier,
} from "@/lib/news/impact";
import type { WireFetchResult } from "@/lib/news/rss";
import { BRAND_COLORS } from "@/lib/brand";

const TIER_HEX: Record<Tier, string> = {
  Insider: BRAND_COLORS.orbitalCyan,
  Beat: BRAND_COLORS.ionMagenta,
  Verified: BRAND_COLORS.softUltraviolet,
  Aggregator: "#9fb3c8",
  Unconfirmed: "#5b6675",
};

const TIERS: Tier[] = ["Insider", "Beat", "Verified", "Aggregator", "Unconfirmed"];
const EMPTY_WIRE: readonly NewsItem[] = [];

const ago = (m: number) => (m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`);

export function TheBeat({
  wireResult = null,
}: {
  readonly wireResult?: WireFetchResult | null;
}) {
  const isAvailable = wireResult?.status === "AVAILABLE";
  const wire = isAvailable ? wireResult.items : EMPTY_WIRE;
  const hasPublishedItems = wire.length > 0;
  const hasPartialOutage = isAvailable && wireResult.failedFeedCount > 0;
  const ranked = useMemo(() => rankWireCorroborated(wire), [wire]);
  const [tierFilter, setTierFilter] = useState<Tier | "All">("All");
  const teams = useMemo(
    () => ["All", ...Array.from(new Set(wire.map((i) => i.team))).sort()],
    [wire],
  );
  const [team, setTeam] = useState("All");

  const shown = ranked.filter(
    (r) => (tierFilter === "All" || r.item.tier === tierFilter) && (team === "All" || r.item.team === team),
  );

  return (
    <div className="space-y-5">
      {hasPublishedItems ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: `${BRAND_COLORS.orbitalCyan}1c`, color: BRAND_COLORS.orbitalCyan }}
        >
          Source-attributed feed signals ·{" "}
          {Array.from(new Set(wire.map((i) => i.source))).join(", ")}
          {hasPartialOutage ? " · partial source outage" : ""}
        </span>
      ) : isAvailable ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: `${BRAND_COLORS.steelGray}66`, color: BRAND_COLORS.ionWhite }}
        >
          Approved feeds checked · no qualifying signals in window
          {hasPartialOutage ? " · partial source outage" : ""}
        </span>
      ) : wireResult?.status === "OUTAGE" ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: `${BRAND_COLORS.ionMagenta}1c`, color: BRAND_COLORS.ionMagenta }}
        >
          Approved feed outage · no reports shown
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: `${BRAND_COLORS.softUltraviolet}1c`, color: BRAND_COLORS.softUltraviolet }}
        >
          No approved signal feed is published right now
        </span>
      )}
      {/* tier legend / filter */}
      <div className="surface-card flex flex-wrap items-center gap-3 p-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-600">Source tier</span>
        <button type="button" onClick={() => setTierFilter("All")}
          aria-pressed={tierFilter === "All"}
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: tierFilter === "All" ? "rgba(255,255,255,0.12)" : "transparent", color: "#fff" }}>All</button>
        {TIERS.map((t) => {
          const active = tierFilter === t;
          return (
            <button key={t} type="button" onClick={() => setTierFilter(t)}
              aria-pressed={active}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors"
              style={{ background: active ? `${TIER_HEX[t]}22` : "transparent", color: TIER_HEX[t], boxShadow: active ? `inset 0 0 0 1px ${TIER_HEX[t]}` : "none" }}
              title={`reliability ${Math.round(TIER_WEIGHT[t] * 100)}%`}>
              {t}
            </button>
          );
        })}
        <select value={team} onChange={(e) => setTeam(e.target.value)}
          className="ml-auto rounded-md border bg-transparent px-2 py-1 text-xs text-ink-200"
          style={{ borderColor: BRAND_COLORS.steelGray }} aria-label="Filter by team">
          {teams.map((t) => <option key={t} value={t} style={{ color: "#000" }}>{t === "All" ? "All teams" : t}</option>)}
        </select>
      </div>

      {/* wire */}
      <div className="space-y-2.5">
        {shown.map((r) => {
          const hex = TIER_HEX[r.item.tier];
          const fav = r.fantasyDelta;
          return (
            <article key={r.item.id} className="surface-card grid grid-cols-[auto_1fr] gap-3 p-4">
              {/* urgency dial */}
              <div className="flex w-14 flex-col items-center justify-center border-r pr-3" style={{ borderColor: `${BRAND_COLORS.steelGray}90` }}>
                <span className="font-display text-2xl leading-none" style={{ color: r.urgency >= 55 ? BRAND_COLORS.orbitalCyan : r.urgency >= 25 ? BRAND_COLORS.ionWhite : "#7b8794" }}>{r.urgency}</span>
                <span className="mt-0.5 text-[8px] uppercase tracking-wider text-ink-600">urgency</span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: hex, background: `${hex}1c` }}>{r.item.tier}</span>
                  <span className="text-xs font-medium text-ink-300">{r.item.source}</span>
                  <span className="text-[11px] text-ink-600">· {r.item.team}{r.item.player ? ` · ${r.item.player}` : ""}</span>
                  {r.corroboration.confirmed && (
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${BRAND_COLORS.orbitalCyan}1f`, color: BRAND_COLORS.orbitalCyan }} title={r.corroboration.sourceNames.join(" + ")}>
                      ✓ Confirmed · {r.corroboration.sources} sources
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-ink-600">{ago(r.item.minutesAgo)}</span>
                </div>

                <p className="mt-1.5 text-sm font-medium text-white">{r.item.headline}</p>

                <div
                  className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
                  title="These are the impact engine's read of the report (source tier, signal magnitude, freshness), not measured line or projection movement."
                >
                  <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)", color: "#c8d2dd" }}>{signalLabel(r.item.signal)}</span>
                  <span className="text-ink-500">Est. fantasy <strong style={{ color: fav >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>{fav >= 0 ? "+" : ""}{fav}</strong></span>
                  <span className="text-ink-500">Est. market <strong style={{ color: r.marketDelta >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>{r.marketDelta >= 0 ? "+" : ""}{r.marketDelta}</strong></span>
                  <span className="text-ink-500">Reliability <strong className="text-white">{Math.round(r.reliability * 100)}%</strong></span>
                </div>

                <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "#aeb8c4" }}>
                  <span style={{ color: hex }}>▸ </span>{r.action}
                </p>
              </div>
            </article>
          );
        })}
        {shown.length === 0 && (
          <div className="surface-card p-6 text-sm text-ink-400">
            {isAvailable
              ? "No qualifying feed items match this filter."
              : wireResult?.status === "OUTAGE"
                ? "Approved feeds could not be reached. No reports are shown."
                : "No approved signal feed is published right now."}
          </div>
        )}
      </div>
    </div>
  );
}
