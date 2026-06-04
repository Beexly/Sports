"use client";

/**
 * PunditLedger — the interactive Airwave board.
 *
 * Left: an accountability leaderboard of pundits, sorted by the index. Right:
 * the selected pundit's claims as a graded record — a paraphrased assertion, a
 * timestamp, the objective outcome, and a verdict chip. All data is passed in
 * pre-redacted (no clip pointers, no verbatim). Fully keyboard-operable; the
 * timestamp is formatted deterministically from the ISO string (no Date) so SSR
 * and CSR agree.
 */

import { useState } from "react";
import type { ClaimVerdict, PublicPunditClaim, PunditScorecard } from "@/lib/airwave";
import { BRAND_COLORS } from "@/lib/brand";

const VERDICT_HEX: Record<ClaimVerdict, string> = {
  HIT: BRAND_COLORS.orbitalCyan,
  MISS: BRAND_COLORS.ionMagenta,
  PUSH: BRAND_COLORS.softUltraviolet,
  UNFALSIFIABLE: "#7E8a9c",
  PENDING: "#E0A800",
};

const VERDICT_LABEL: Record<ClaimVerdict, string> = {
  HIT: "Hit",
  MISS: "Miss",
  PUSH: "Push",
  UNFALSIFIABLE: "Unfalsifiable",
  PENDING: "Pending",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-11-09T10:14:00-06:00" -> "Nov 9 · 10:14a CT", deterministically. */
function airedLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2]!;
  const day = Number(m[3]);
  let hour = Number(m[4]);
  const min = m[5]!;
  const ampm = hour >= 12 ? "p" : "a";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${month} ${day} · ${hour}:${min}${ampm} CT`;
}

function indexHex(index: number): string {
  if (index >= 70) return BRAND_COLORS.orbitalCyan;
  if (index >= 45) return BRAND_COLORS.softUltraviolet;
  return BRAND_COLORS.ionMagenta;
}

function Record({ card }: { card: PunditScorecard }) {
  const parts = [
    `${card.hits}H`,
    `${card.misses}M`,
    card.pushes ? `${card.pushes}P` : null,
    card.unfalsifiable ? `${card.unfalsifiable} hot-take${card.unfalsifiable === 1 ? "" : "s"}` : null,
    card.pending ? `${card.pending} pending` : null,
  ].filter(Boolean);
  return <span className="font-mono text-[11px] text-ink-400">{parts.join(" · ")}</span>;
}

export function PunditLedger({
  scorecards,
  claims,
}: {
  scorecards: readonly PunditScorecard[];
  claims: readonly PublicPunditClaim[];
}) {
  const [selectedId, setSelectedId] = useState(scorecards[0]?.punditId ?? "");
  const selected = scorecards.find((c) => c.punditId === selectedId) ?? scorecards[0];
  const selectedClaims = claims
    .filter((c) => c.punditId === selected?.punditId)
    .slice()
    .sort((a, b) => (a.airedAt < b.airedAt ? 1 : -1));

  if (!selected) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* Leaderboard */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-500">
          Accountability board — {scorecards.length} on the record
        </p>
        <ul className="flex flex-col gap-2" role="tablist" aria-label="Pundit accountability board">
          {scorecards.map((card) => {
            const active = card.punditId === selected.punditId;
            const hex = indexHex(card.accountabilityIndex);
            return (
              <li key={card.punditId}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedId(card.punditId)}
                  className="surface-card w-full p-3.5 text-left transition-transform focus-visible:outline-none focus-visible:ring-1 motion-safe:hover:-translate-y-0.5"
                  style={{ borderColor: active ? `${hex}66` : BRAND_COLORS.steelGray }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{card.name}</p>
                      <p className="truncate text-[11px] text-ink-500">{card.show} · {card.network}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl tabular-nums leading-none" style={{ color: hex }}>
                        {card.accountabilityIndex}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-ink-500">index</p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full" style={{ background: BRAND_COLORS.steelGray }}>
                    <div className="h-full rounded-full" style={{ width: `${card.accountabilityIndex}%`, background: hex }} />
                  </div>
                  <div className="mt-2"><Record card={card} /></div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail */}
      <div className="surface-card p-5 sm:p-6" role="tabpanel" aria-label={`${selected.name} record`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
            <p className="text-xs text-ink-500">{selected.show} · {selected.network}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl tabular-nums leading-none" style={{ color: indexHex(selected.accountabilityIndex) }}>
              {selected.accountabilityIndex}<span className="text-base text-ink-500"> / 100</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-ink-500">accountability index</p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-300">{selected.calibrationNote}</p>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-[11px] text-ink-400" style={{ borderColor: BRAND_COLORS.steelGray }}>
          <span>Checkable rate: <strong className="text-ink-200">{Math.round(selected.falsifiableRate * 100)}%</strong></span>
          <span>On decided calls: <strong className="text-ink-200">{selected.hitRate === null ? "—" : `${Math.round(selected.hitRate * 100)}% hit`}</strong></span>
          <span>Claims logged: <strong className="text-ink-200">{selected.total}</strong></span>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {selectedClaims.map((c) => {
            const hex = VERDICT_HEX[c.verdict];
            return (
              <li key={c.id} className="rounded-xl p-3.5" style={{ background: `${hex}0c`, border: `1px solid ${hex}33` }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${hex}1f`, color: hex }}>
                      {VERDICT_LABEL[c.verdict]}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">{c.sport} · {c.subject}</span>
                  </span>
                  <span className="font-mono text-[10px] text-ink-500">{airedLabel(c.airedAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-100">{c.assertion}</p>
                <p className="mt-1.5 text-xs text-ink-400">
                  <span className="text-ink-500">Outcome — </span>{c.outcomeNote}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
