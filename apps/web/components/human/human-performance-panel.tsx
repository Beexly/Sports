"use client";

/**
 * HumanPerformancePanel — the public surface for the Human Performance layer.
 *
 * Three honest sections: Performance Environment Score (public venue facts),
 * the Human Availability Modifier (official designation + public weather, band-
 * widening only), and the Biomechanics Readiness scaffold (capability state, no
 * live player claims). Every output renders its provenance tier; missing data
 * shows the empty/uncertain state, never a fabricated number.
 */

import { useEffect, useState } from "react";
import { NFL_VENUE_ENV } from "@/lib/human-performance/environment";
import type { PerformanceEnvironmentScore, ProvenanceTier, Verdict, BiomechCapability } from "@/lib/human-performance/types";
import type { AvailabilityResult } from "@/lib/human-performance/availability";
import { BRAND_COLORS } from "@/lib/brand";

const TEAMS = Object.keys(NFL_VENUE_ENV).sort();

const TIER_HEX: Record<ProvenanceTier, string> = {
  official: BRAND_COLORS.orbitalCyan,
  licensed: "#E0A800",
  modeled: BRAND_COLORS.softUltraviolet,
  inferred: "#9fb3c8",
  illustrative: "#6b7785",
};

const VERDICT_HEX: Record<Verdict, string> = {
  play: BRAND_COLORS.orbitalCyan,
  watchlist: "#E0A800",
  "no-bet": BRAND_COLORS.ionMagenta,
};

function TierChip({ tier }: { tier: ProvenanceTier }) {
  return (
    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: TIER_HEX[tier], background: `${TIER_HEX[tier]}1c` }}>
      {tier}
    </span>
  );
}

export function HumanPerformancePanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <EnvironmentCard />
      <AvailabilityCard />
      <ReadinessCard />
    </div>
  );
}

function EnvironmentCard() {
  const [team, setTeam] = useState("GB");
  const [data, setData] = useState<PerformanceEnvironmentScore | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setBusy(true);
    fetch(`/api/human/environment?team=${team}`)
      .then((r) => r.json())
      .then((j) => { if (active) setData(j?.data ?? null); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [team]);

  const factorKeys = data ? Object.keys(data.factors) : [];

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Performance Environment Score</p>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="rounded-md border bg-transparent px-2 py-1 text-xs text-white" style={{ borderColor: BRAND_COLORS.steelGray }}>
          {TEAMS.map((t) => <option key={t} value={t} className="bg-carbon">{t}</option>)}
        </select>
      </div>

      {busy && !data && <p className="mt-4 text-sm text-ink-400">Loading…</p>}

      {data && (
        <>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-numerals text-5xl font-semibold text-white">{data.overall || "—"}</span>
            <span className="mb-1 text-xs text-ink-500">/ 100 · {data.presentFactorCount} public factor{data.presentFactorCount === 1 ? "" : "s"}</span>
          </div>

          <div className="mt-4 space-y-3">
            {factorKeys.map((k) => {
              const fct = data.factors[k]!;
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-200">{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</span>
                    <span className="flex items-center gap-2"><TierChip tier={fct.tier} /><span className="font-mono text-ink-300">{fct.value}</span></span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${fct.value}%`, background: TIER_HEX[fct.tier] }} />
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-600">{fct.source}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-ink-500">{data.note}</p>
        </>
      )}
    </div>
  );
}

function AvailabilityCard() {
  const [player, setPlayer] = useState("");
  const [team, setTeam] = useState("");
  const [daysRest, setDaysRest] = useState("");
  const [conflict, setConflict] = useState(false);
  const [market, setMarket] = useState(false);
  const [res, setRes] = useState<AvailabilityResult | null>(null);
  const [busy, setBusy] = useState(false);

  const assess = async () => {
    if (!player.trim()) return;
    setBusy(true); setRes(null);
    try {
      const qs = new URLSearchParams({ player: player.trim() });
      if (team) qs.set("team", team);
      if (daysRest) qs.set("daysRest", daysRest);
      if (conflict) qs.set("conflictingSources", "true");
      if (market) qs.set("marketMovedOnNews", "true");
      const r = await fetch(`/api/human/availability?${qs.toString()}`);
      const j = await r.json();
      setRes(j?.data ?? null);
    } catch {
      setRes(null);
    } finally {
      setBusy(false);
    }
  };

  const m = res?.modifier ?? null;
  const b = res?.behavior ?? null;

  return (
    <div className="surface-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Human Availability Modifier</p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-ink-400">Player
          <input value={player} onChange={(e) => setPlayer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && assess()} placeholder="Full name" className="mt-1 block w-44 rounded-md border bg-transparent px-2 py-1.5 text-sm text-white" style={{ borderColor: BRAND_COLORS.steelGray }} />
        </label>
        <label className="text-[11px] text-ink-400">Team
          <select value={team} onChange={(e) => setTeam(e.target.value)} className="mt-1 block w-24 rounded-md border bg-transparent px-2 py-1.5 text-sm text-white" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <option value="" className="bg-carbon">any</option>
            {TEAMS.map((t) => <option key={t} value={t} className="bg-carbon">{t}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-ink-400">Days rest
          <input value={daysRest} onChange={(e) => setDaysRest(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="—" className="mt-1 block w-16 rounded-md border bg-transparent px-2 py-1.5 text-sm text-white" style={{ borderColor: BRAND_COLORS.steelGray }} />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-[11px] text-ink-400"><input type="checkbox" checked={conflict} onChange={(e) => setConflict(e.target.checked)} /> Sources conflict</label>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-400"><input type="checkbox" checked={market} onChange={(e) => setMarket(e.target.checked)} /> Line moved on news</label>
        <button type="button" onClick={assess} disabled={busy || !player.trim()} className="btn btn-primary ml-auto text-xs disabled:opacity-50">{busy ? "Assessing…" : "Assess availability"}</button>
      </div>

      {res?.status === "source-error" && <p className="mt-4 text-sm" style={{ color: BRAND_COLORS.ionMagenta }}>The public injury feed is unavailable right now — no fabricated read.</p>}

      {m && b && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ color: BRAND_COLORS.obsidianBlack, background: VERDICT_HEX[m.recommendation] }}>{m.recommendation}</span>
            <span className="text-sm text-ink-300">band +{Math.round(m.bandWidenPct * 100)}%</span>
            <span className="ml-auto text-[11px] text-ink-500">confidence: {b.confidenceLabel}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.round((m.bandWidenPct / 0.6) * 100)}%`, background: VERDICT_HEX[m.recommendation] }} />
          </div>

          {m.drivers.length > 0 && (
            <div className="space-y-1.5">
              {m.drivers.map((d) => (
                <div key={d.key} className="flex items-start gap-2 text-[11px]">
                  <TierChip tier={d.tier} />
                  <span className="flex-1 text-ink-300">{d.note}</span>
                  <span className="font-mono text-ink-600">+{Math.round(d.weight * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border p-3" style={{ borderColor: `${BRAND_COLORS.softUltraviolet}33`, background: `${BRAND_COLORS.softUltraviolet}08` }}>
            <Contract label="What changed" value={b.whatChanged} />
            <Contract label="Why it matters" value={b.whyItMatters} />
            <Contract label="What could break the read" value={b.whatCouldBreakTheRead} />
            <div className="mt-2 flex items-center gap-2"><span className="text-[10px] uppercase tracking-wider text-ink-600">Provenance</span><TierChip tier={b.provenanceTier} /></div>
          </div>
        </div>
      )}

      {res && res.status === "ok" && !m && <p className="mt-4 text-sm text-ink-400">{res.error ?? "No public availability flags found."}</p>}
    </div>
  );
}

function Contract({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-1 text-[11px] leading-relaxed text-ink-300">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: BRAND_COLORS.softUltraviolet }}>{label}: </span>
      {value}
    </p>
  );
}

const STATUS_HEX: Record<string, string> = {
  live: BRAND_COLORS.orbitalCyan,
  "r&d": BRAND_COLORS.softUltraviolet,
  "admin-only": "#E0A800",
  "not-built": "#6b7785",
};

function ReadinessCard() {
  const [caps, setCaps] = useState<BiomechCapability[] | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/human/readiness")
      .then((r) => r.json())
      .then((j) => { if (active) { setCaps(j?.data?.capabilities ?? []); setNote(j?.data?.note ?? ""); } })
      .catch(() => { if (active) setCaps([]); });
    return () => { active = false; };
  }, []);

  return (
    <div className="surface-card p-5 lg:col-span-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Biomechanics / Movement Readiness</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{note}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(caps ?? []).map((c) => (
          <div key={c.capability} className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">{c.capability}</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: STATUS_HEX[c.status] ?? "#9fb3c8", background: `${STATUS_HEX[c.status] ?? "#9fb3c8"}1c` }}>{c.status}</span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-500">{c.note}</p>
            <p className="mt-1 text-[9px] uppercase tracking-wider" style={{ color: c.rightsCleared ? BRAND_COLORS.orbitalCyan : "#6b7785" }}>{c.rightsCleared ? "rights cleared" : "rights not cleared"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
