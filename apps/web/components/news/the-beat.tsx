"use client";

/**
 * The Beat. A reliability-tiered, impact-scored newsroom.
 *
 * Governing idea (ASTRA A-9): sports media is a market. Every report is a
 * quote. Some are worth acting on, most are noise. This surface ranks every
 * item by what deserves attention RIGHT NOW (source tier, fantasy + market
 * delta, freshness decay) and hands you the move, not just the headline.
 *
 * Interactive: tier + team filters, strongest/newest sort, a live pulse
 * strip, and expandable cards. Sample vs live is always unmistakable.
 */

import { useMemo, useState } from "react";
import {
  rankWireCorroborated,
  signalLabel,
  TIER_WEIGHT,
  type NewsItem,
  type Tier,
} from "@/lib/news/impact";
import { BRAND_COLORS } from "@/lib/brand";

const TIER_HEX: Record<Tier, string> = {
  Insider: BRAND_COLORS.orbitalCyan,
  Beat: BRAND_COLORS.ionMagenta,
  Verified: BRAND_COLORS.softUltraviolet,
  Aggregator: "#9fb3c8",
  Unconfirmed: "#5b6675",
};

const TIERS: Tier[] = ["Insider", "Beat", "Verified", "Aggregator", "Unconfirmed"];

const ago = (m: number) => (m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`);

type SortMode = "strongest" | "newest";

const EMPTY_WIRE: NewsItem[] = [];

export function TheBeat({
  liveWire = null,
  unavailable = false,
}: {
  liveWire?: NewsItem[] | null;
  /**
   * The stored wire read FAILED. Distinct from an empty store: an empty array
   * is the honest empty state (nothing classified / nothing landed); a failure
   * means we could not read the store and must not invent a wire.
   */
  unavailable?: boolean;
}) {
  // Stored wire (C-416). Empty store is honest empty — never a sample.
  // EMPTY_WIRE is a stable module constant so useMemo deps stay stable when
  // nothing is loaded (liveWire === null).
  const isLive = liveWire !== null;
  const wire = liveWire ?? EMPTY_WIRE;
  const ranked = useMemo(() => rankWireCorroborated(wire), [wire]);
  const [tierFilter, setTierFilter] = useState<Tier | "All">("All");
  const [sort, setSort] = useState<SortMode>("strongest");
  const [onlyActionable, setOnlyActionable] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const teams = useMemo(
    () => ["All", ...Array.from(new Set(wire.map((i) => i.team))).sort()],
    [wire],
  );
  const [team, setTeam] = useState("All");

  const shown = useMemo(() => {
    const filtered = ranked.filter(
      (r) =>
        (tierFilter === "All" || r.item.tier === tierFilter) &&
        (team === "All" || r.item.team === team) &&
        (!onlyActionable || r.urgency >= 55),
    );
    if (sort === "newest") {
      return [...filtered].sort((a, b) => a.item.minutesAgo - b.item.minutesAgo);
    }
    return filtered; // already ranked by urgency
  }, [ranked, tierFilter, team, onlyActionable, sort]);

  const pulse = useMemo(() => {
    const confirmed = ranked.filter((r) => r.corroboration.confirmed).length;
    const hot = ranked.filter((r) => r.urgency >= 55).length;
    const top = ranked[0];
    return { total: ranked.length, confirmed, hot, top };
  }, [ranked]);

  // A FAILED store read renders nothing but the failure. This returns BEFORE
  // the empty-wire path below: a read error is not the same as a quiet wire.
  if (unavailable) {
    return (
      <div className="space-y-5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: `${BRAND_COLORS.softUltraviolet}1c`, color: BRAND_COLORS.softUltraviolet }}
        >
          Wire offline · store unreadable
        </span>
        <div className="surface-card p-8 text-center">
          <p className="font-display text-xl text-ion-white">Feed unavailable.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ion-2">
            We could not read the stored wire just now, so there is nothing to
            show. We will not fill the gap with a sample.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Provenance marker, unmistakable at the point of display: live cards
          name their feed sources. There is no sample wire (C-416). */}
      {isLive ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: `${BRAND_COLORS.orbitalCyan}1c`, color: BRAND_COLORS.orbitalCyan }}
        >
          Live wire · headlines via public feeds ·{" "}
          {Array.from(new Set(wire.map((i) => i.source))).join(", ") || "no items in window"}
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: `${BRAND_COLORS.softUltraviolet}1c`, color: BRAND_COLORS.softUltraviolet }}
        >
          Wire · store not loaded
        </span>
      )}

      {/* Pulse strip: the one-screen answer to "is anything worth my time?" */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="beat-pulse">
        <div className="surface-card p-3">
          <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">On the wire</p>
          <p className="mt-1 font-display text-2xl text-ion-white">{pulse.total}</p>
        </div>
        <div className="surface-card p-3">
          <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">Confirmed</p>
          <p className="mt-1 font-display text-2xl" style={{ color: BRAND_COLORS.orbitalCyan }}>{pulse.confirmed}</p>
        </div>
        <div className="surface-card p-3">
          <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">Hot now</p>
          <p className="mt-1 font-display text-2xl" style={{ color: BRAND_COLORS.ionMagenta }}>{pulse.hot}</p>
        </div>
        <div className="surface-card min-w-0 p-3">
          <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">Top signal</p>
          <p className="mt-1 truncate text-sm font-semibold text-ion-white" title={pulse.top?.item.headline}>
            {pulse.top ? `${pulse.top.item.team} · ${pulse.top.urgency}` : "n/a"}
          </p>
        </div>
      </div>

      {/* Controls: tier legend / filter, team, sort, actionable-only */}
      <div className="surface-card flex flex-wrap items-center gap-3 p-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ion-3">Source tier</span>
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
              title={`source tier ${t}: editorial weight ${TIER_WEIGHT[t].toFixed(2)}, not a measured hit rate`}>
              {t}
            </button>
          );
        })}
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by team">
          {teams.map((t) => {
            const active = team === t;
            return (
              <button key={t} type="button" onClick={() => setTeam(t)} aria-pressed={active}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${active ? "bg-ion-white text-black" : "text-ion-2 hover:text-ion-white"}`}
                style={active ? undefined : { background: "rgba(255,255,255,0.05)" }}>
                {t === "All" ? "All teams" : t}
              </button>
            );
          })}
        </div>
        <div className="flex rounded-full border border-mineral p-0.5" role="group" aria-label="Sort order">
          <button
            type="button"
            onClick={() => setSort("strongest")}
            aria-pressed={sort === "strongest"}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${sort === "strongest" ? "bg-orbital-cyan/20 text-orbital-cyan" : "text-ion-2"}`}
          >
            Strongest
          </button>
          <button
            type="button"
            onClick={() => setSort("newest")}
            aria-pressed={sort === "newest"}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${sort === "newest" ? "bg-orbital-cyan/20 text-orbital-cyan" : "text-ion-2"}`}
          >
            Newest
          </button>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ion-2">
          <input
            type="checkbox"
            checked={onlyActionable}
            onChange={(e) => setOnlyActionable(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#FF4D2E]"
          />
          Quiet the noise (hot only)
        </label>
      </div>

      {/* wire: the lead story gets the front page, the rest get the wire */}
      <div className="space-y-2.5">
        {shown.map((r, idx) => {
          const hex = TIER_HEX[r.item.tier];
          const fav = r.fantasyDelta;
          const open = expandedId === r.item.id;
          const lead = idx === 0;
          return (
            <article key={r.item.id}
              className={lead
                ? "relative overflow-hidden rounded-2xl border p-5 sm:p-6"
                : "surface-card grid grid-cols-[auto_1fr] gap-3 p-4"}
              style={lead ? { borderColor: `${hex}55`, background: `linear-gradient(180deg, ${hex}14, transparent 70%)` } : undefined}>
              {lead && (
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: hex }}>
                  Lead story · {r.item.tier}
                </p>
              )}
              {/* urgency: lead gets a meter, the wire gets the dial */}
              {lead ? (
                <div className="mb-3" aria-label={`Urgency ${r.urgency} of 100`}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-4xl leading-none text-ion-white">{r.urgency}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-3">urgency / 100</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, r.urgency))}%`, background: hex }} />
                  </div>
                </div>
              ) : (
              <div className="flex w-14 flex-col items-center justify-center border-r pr-3" style={{ borderColor: `${BRAND_COLORS.steelGray}90` }}>
                <span className="font-display text-2xl leading-none" style={{ color: r.urgency >= 55 ? BRAND_COLORS.orbitalCyan : r.urgency >= 25 ? BRAND_COLORS.ionWhite : "var(--ion-3)" }}>{r.urgency}</span>
                <span className="mt-0.5 text-[8px] uppercase tracking-wider text-ion-3">urgency</span>
              </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: hex, background: `${hex}1c` }}>{r.item.tier}</span>
                  <span className="text-xs font-medium text-ion-1">{r.item.source}</span>
                  <span className="text-[11px] text-ion-3">· {r.item.team}{r.item.player ? ` · ${r.item.player}` : ""}</span>
                  {r.corroboration.confirmed && (
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${BRAND_COLORS.orbitalCyan}1f`, color: BRAND_COLORS.orbitalCyan }} title={r.corroboration.sourceNames.join(" + ")}>
                      ✓ Confirmed · {r.corroboration.sources} sources
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-ion-3">{ago(r.item.minutesAgo)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : r.item.id)}
                  aria-expanded={open}
                  className="mt-1.5 block w-full text-left"
                >
                  <p className={lead ? "font-display text-xl font-semibold leading-snug text-ion-white sm:text-2xl" : "text-sm font-medium text-ion-white"}>{r.item.headline}</p>
                </button>

                <div
                  className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
                  title="These are the impact engine's read of the report (source tier, signal magnitude, freshness), not measured line or projection movement."
                >
                  <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)", color: "#c8d2dd" }}>{signalLabel(r.item.signal)}</span>
                  <span className="text-ion-2">{isLive ? "Est. fantasy" : "Fantasy"} <strong style={{ color: fav >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>{fav >= 0 ? "+" : ""}{fav}</strong></span>
                  <span className="text-ion-2">{isLive ? "Est. market" : "Market"} <strong style={{ color: r.marketDelta >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>{r.marketDelta >= 0 ? "+" : ""}{r.marketDelta}</strong></span>
                  <span className="text-ion-2">Source <strong className="text-ion-white">{r.item.tier}</strong></span>
                </div>

                {open ? (
                  <div className="mt-3 rounded-lg border border-mineral/70 bg-carbon/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ion-3">The move</p>
                    <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "#aeb8c4" }}>
                      {r.action}
                    </p>
                    <p className="mt-2 text-[11px] text-ion-3">
                      Weighted by source tier {r.item.tier}
                      {r.corroboration.confirmed ? `, confirmed across ${r.corroboration.sources} sources` : ", single source"}.
                      Urgency {r.urgency} of 100 after freshness decay.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "#aeb8c4" }}>
                    <span style={{ color: hex }}>▸ </span>{r.action}
                  </p>
                )}
              </div>
            </article>
          );
        })}
        {shown.length === 0 && wire.length === 0 && (
          // The wire itself is empty. Blaming the UI filter here would be a
          // claim we have not checked, and "loosen it and the wire comes back"
          // would be false, because there is nothing behind the filter.
          //
          // But "nothing is being withheld" was false too: fetchLiveWire drops
          // headlines upstream (lib/news/rss.ts), so an empty wire can mean
          // reports arrived and every one was dropped before this component
          // saw them.
          //
          // The replacement then ENUMERATED the drop conditions, which was the
          // same over-claim one layer down: the feed was truncated to 40
          // entries BEFORE classification, so a qualifying report could be
          // dropped by position while the copy blamed the publication bar.
          // That truncation is fixed in rss.ts. This copy no longer asserts a
          // complete cause set either way - it states the outcome (nothing
          // made the wire) and what generally qualifies, which stays true
          // whatever the drop path.
          <div className="surface-card p-8 text-center">
            <p className="font-display text-xl text-ion-white">No fresh reports.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ion-2">
              The wire is live, and this is not an error. Either nothing
              arrived, or no recent report with a real publish time and a
              signal we classify made the wire.
            </p>
          </div>
        )}
        {shown.length === 0 && wire.length > 0 && (
          // Genuinely the filter: there ARE items, they are just all excluded.
          <div className="surface-card p-8 text-center">
            <p className="font-display text-xl text-ion-white">The wire is quiet on this frequency.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ion-2">Nothing at this tier, team, or heat level right now. That is the filter talking, not the newsroom. Loosen it and the wire comes back.</p>
            <button type="button" onClick={() => { setTierFilter("All"); setTeam("All"); setOnlyActionable(false); }}
              className="mt-4 rounded-full bg-ion-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-black">
              Reset the wire
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
