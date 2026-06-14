"use client";

/**
 * The Beat — a reliability-tiered, impact-scored newsroom.
 *
 * Every breaking item, ranked by what deserves attention RIGHT NOW: source tier,
 * the fantasy + market delta, freshness decay, and the move to make. Filter by
 * tier or team, sort by urgency or freshness. The reasoning the timeline never
 * gives you — built for scanning: a clear tier badge, the headline, what it
 * moves as compact chips, and the move called out on its own line.
 */

import { useMemo, useState } from "react";
import {
  rankWireCorroborated,
  signalLabel,
  TIER_WEIGHT,
  type CorroboratedRead,
  type Tier,
} from "@/lib/news/impact";
import { DEMO_WIRE } from "@/lib/news/wire";
import { BRAND_COLORS } from "@/lib/brand";
import { Reveal } from "@/components/motion/reveal";

/** One accent hex per tier — the consistent color code that runs through the feed. */
const TIER_HEX: Record<Tier, string> = {
  Insider: BRAND_COLORS.orbitalCyan,
  Beat: BRAND_COLORS.ionMagenta,
  Verified: BRAND_COLORS.softUltraviolet,
  Aggregator: "#9fb3c8",
  Unconfirmed: "#5b6675",
};

/** One-line plain-English description of what each tier means, for the badge tooltip. */
const TIER_DESC: Record<Tier, string> = {
  Insider: "National insider — breaks it first, rarely wrong",
  Beat: "Local beat — first on practice and snaps",
  Verified: "Official team or league feed — true, often late",
  Aggregator: "Re-poster, no primary sourcing",
  Unconfirmed: "Rumor — single, anonymous, unvetted",
};

const TIERS: readonly Tier[] = ["Insider", "Beat", "Verified", "Aggregator", "Unconfirmed"];

type Sort = "urgency" | "fresh";

const ago = (m: number): string => (m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`);

const signed = (n: number): string => `${n >= 0 ? "+" : ""}${n}`;

/** Color a delta by direction: cyan for upside, magenta for downside, muted at zero. */
const deltaHex = (n: number): string =>
  n > 0 ? BRAND_COLORS.orbitalCyan : n < 0 ? BRAND_COLORS.ionMagenta : "#8b93a8";

/** A small, consistent chip used for every "what it moves" data point. */
function Chip({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-mineral bg-void/40 px-2 py-1">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</span>
      <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: valueColor ?? "#e7ecf3" }}>
        {value}
      </span>
    </span>
  );
}

/** The prominent, color-coded reliability badge — the anchor of every card. */
function TierBadge({ tier, lead = false }: { tier: Tier; lead?: boolean }) {
  const hex = TIER_HEX[tier];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md font-mono font-bold uppercase tracking-[0.16em] ${
        lead ? "px-3 py-1.5 text-[12px]" : "px-2.5 py-1 text-[10px]"
      }`}
      style={{ color: hex, background: `${hex}1f`, boxShadow: `inset 0 0 0 1px ${hex}55` }}
      title={`${TIER_DESC[tier]} · reliability ${Math.round(TIER_WEIGHT[tier] * 100)}%`}
    >
      <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: hex }} />
      {tier}
    </span>
  );
}

/** Thin freshness meter — visualizes the half-life decay the engine already computes. */
function FreshnessBar({ freshness }: { freshness: number }) {
  const pct = Math.round(freshness * 100);
  const hex = freshness >= 0.6 ? BRAND_COLORS.orbitalCyan : freshness >= 0.3 ? "#c8a85a" : "#7b8794";
  return (
    <span
      className="relative inline-block h-1 w-12 overflow-hidden rounded-full bg-void/70"
      title={`Freshness ${pct}% — decays by the signal's half-life`}
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: hex }} />
    </span>
  );
}

function BeatCard({ r, lead }: { r: CorroboratedRead; lead: boolean }) {
  const hex = TIER_HEX[r.item.tier];
  const urgencyHex =
    r.urgency >= 55 ? BRAND_COLORS.orbitalCyan : r.urgency >= 25 ? "#e7ecf3" : "#7b8794";

  return (
    <article
      className="surface-card relative overflow-hidden p-4 sm:p-5"
      style={{ boxShadow: `inset 3px 0 0 0 ${hex}` }}
    >
      {/* lead story gets a faint tier wash so the eye lands here first */}
      {lead && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-0"
          style={{ background: `radial-gradient(120% 90% at 0% 0%, ${hex}10, transparent 60%)` }}
        />
      )}

      <div className="relative grid grid-cols-[auto_1fr] gap-4">
        {/* urgency dial — the at-a-glance "how much should I care" number */}
        <div className="flex w-12 flex-col items-center justify-start pt-0.5 sm:w-14">
          <span
            className={`font-display leading-none tabular-nums ${lead ? "text-4xl" : "text-3xl"}`}
            style={{ color: urgencyHex }}
          >
            {r.urgency}
          </span>
          <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-500">
            urgency
          </span>
        </div>

        <div className="min-w-0">
          {/* row 1 — tier badge + source + subject, freshness pinned right */}
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={r.item.tier} lead={lead} />
            <span className="text-sm font-semibold text-ion-white">{r.item.source}</span>
            <span className="text-xs text-ink-400">
              {r.item.team}
              {r.item.player ? ` · ${r.item.player}` : ""}
            </span>
            {r.corroboration.confirmed && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
                style={{ background: `${BRAND_COLORS.orbitalCyan}1f`, color: BRAND_COLORS.orbitalCyan }}
                title={`Confirmed by ${r.corroboration.sourceNames.join(" + ")}`}
              >
                ✓ {r.corroboration.sources} sources
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-2">
              <FreshnessBar freshness={r.freshness} />
              <span className="font-mono text-[10px] tabular-nums text-ink-500">{ago(r.item.minutesAgo)}</span>
            </span>
          </div>

          {/* row 2 — the headline, the thing you actually read */}
          <h3
            className={`mt-2 font-medium text-ion-white ${
              lead ? "text-lg leading-snug sm:text-xl" : "text-[15px] leading-snug"
            }`}
          >
            {r.item.headline}
          </h3>

          {/* row 3 — what it moves, as compact scannable chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={{ background: `${hex}14`, color: hex }}
            >
              {signalLabel(r.item.signal)}
            </span>
            <Chip label="Fantasy" value={signed(r.fantasyDelta)} valueColor={deltaHex(r.fantasyDelta)} />
            <Chip label="Market" value={signed(r.marketDelta)} valueColor={deltaHex(r.marketDelta)} />
            <Chip label="Reliability" value={`${Math.round(r.reliability * 100)}%`} />
          </div>

          {/* row 4 — the move, called out clearly on its own line */}
          <div
            className="mt-3 flex items-start gap-2 rounded-lg border border-mineral bg-void/40 px-3 py-2"
          >
            <span className="mt-px shrink-0 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: hex }}>
              The move
            </span>
            <p className="text-[13px] leading-relaxed text-ink-300">{r.action}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function TheBeat() {
  const ranked = useMemo(() => rankWireCorroborated(DEMO_WIRE), []);
  const [tierFilter, setTierFilter] = useState<Tier | "All">("All");
  const teams = useMemo(
    () => ["All", ...Array.from(new Set(DEMO_WIRE.map((i) => i.team))).sort()],
    [],
  );
  const [team, setTeam] = useState("All");
  const [sort, setSort] = useState<Sort>("urgency");

  // How many live items sit in each tier — drives the count on each filter pill.
  const tierCounts = useMemo(() => {
    const base = { Insider: 0, Beat: 0, Verified: 0, Aggregator: 0, Unconfirmed: 0 } as Record<Tier, number>;
    for (const r of ranked) base[r.item.tier] += 1;
    return base;
  }, [ranked]);

  const shown = useMemo(() => {
    const filtered = ranked.filter(
      (r) =>
        (tierFilter === "All" || r.item.tier === tierFilter) &&
        (team === "All" || r.item.team === team),
    );
    // `ranked` is already urgency-sorted; only re-sort when freshness is chosen.
    return sort === "fresh"
      ? [...filtered].sort((a, b) => b.freshness - a.freshness)
      : filtered;
  }, [ranked, tierFilter, team, sort]);

  return (
    <div className="space-y-5">
      {/* control bar — tier legend doubles as the filter; sort + team on the right */}
      <div className="surface-card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
            <span className="live-dot" /> Live wire
          </span>
          <span aria-hidden="true" className="hidden h-3 w-px bg-mineral sm:inline-block" />
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTierFilter("All")}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors"
              style={{
                background: tierFilter === "All" ? "rgba(255,255,255,0.1)" : "transparent",
                color: tierFilter === "All" ? "#fff" : "#9aa3c0",
                boxShadow: tierFilter === "All" ? "inset 0 0 0 1px rgba(255,255,255,0.25)" : "none",
              }}
            >
              All <span className="opacity-60">{ranked.length}</span>
            </button>
            {TIERS.map((t) => {
              const active = tierFilter === t;
              const hex = TIER_HEX[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierFilter(t)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors"
                  style={{
                    background: active ? `${hex}22` : "transparent",
                    color: hex,
                    boxShadow: active ? `inset 0 0 0 1px ${hex}` : `inset 0 0 0 1px ${hex}33`,
                  }}
                  title={`${TIER_DESC[t]} · reliability ${Math.round(TIER_WEIGHT[t] * 100)}%`}
                >
                  <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: hex }} />
                  {t} <span className="opacity-60">{tierCounts[t]}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* sort toggle — both keys exist on every read (urgency, freshness) */}
            <div className="inline-flex overflow-hidden rounded-md border border-mineral">
              {(["urgency", "fresh"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors"
                  style={{
                    background: sort === s ? "rgba(255,255,255,0.1)" : "transparent",
                    color: sort === s ? "#fff" : "#8b93a8",
                  }}
                >
                  {s === "urgency" ? "Urgency" : "Freshest"}
                </button>
              ))}
            </div>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="rounded-md border border-mineral bg-transparent px-2 py-1 text-xs text-ink-200"
              aria-label="Filter by team"
            >
              {teams.map((t) => (
                <option key={t} value={t} style={{ color: "#000" }}>
                  {t === "All" ? "All teams" : t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* the wire */}
      {shown.length > 0 ? (
        <div className="space-y-3">
          {shown.map((r, i) => (
            <Reveal key={r.item.id} delay={Math.min(i, 6) * 60}>
              <BeatCard r={r} lead={sort === "urgency" && i === 0} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="surface-card p-6 text-sm text-ink-400">No items match this filter.</div>
      )}
    </div>
  );
}
