"use client";

/**
 * WaiverWarRoomPanel — bye-week collisions + model-vs-market disagreements
 * for a synced Sleeper roster. Same doctrine as RosterAdvicePanel: enforcement
 * is server-side only (the route's PRO/ELITE gate); every response state is
 * distinct and honest; a failed data leg renders as UNAVAILABLE, never as an
 * empty "all clear"; zero motion; every number traces to the live response.
 * Attribution for both sources renders whenever their data renders (FFC's
 * terms request it; the registry supplies Sleeper's line).
 */

import { useEffect, useState, type ReactNode } from "react";
import type { Team } from "@/lib/integrations/sleeper";
import { BRAND_COLORS } from "@/lib/brand";

const POS_HEX: Record<string, string> = { QB: "#00E5FF", RB: "#7B61FF", WR: "#FF38C7", TE: "#F5F7FF", DEF: "#9fb3c8", K: "#E0A800" };

interface ByeCollisionWeek {
  readonly bye: number;
  readonly players: readonly { name: string; pos: string; team: string }[];
}
interface ByesLeg {
  readonly status: "ok" | "source-error";
  readonly collisions?: readonly ByeCollisionWeek[];
  readonly unknown?: readonly { name: string; pos: string; team: string }[];
  readonly season?: number;
  readonly attribution?: string;
}
interface DisagreementRow {
  readonly name: string;
  readonly pos: string;
  readonly team: string;
  readonly onRoster: boolean;
  readonly modelSignal: "buy-low" | "in-line" | "sell-high";
  readonly processGrade: number;
  readonly marketDirection: "adding" | "dropping";
  readonly marketCount: number;
  readonly description: string;
}
interface DisagreementsLeg {
  readonly status: "ok" | "source-error";
  readonly rows?: readonly DisagreementRow[];
  readonly modelSeason?: number;
  readonly modelThroughWeek?: number | null;
  readonly lookbackHours?: number;
  readonly attribution?: string | null;
}

type PanelState =
  | { readonly kind: "loading" }
  | { readonly kind: "unauthenticated" }
  | { readonly kind: "locked" }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "error" }
  | { readonly kind: "ok"; readonly byes: ByesLeg; readonly disagreements: DisagreementsLeg };

export function WaiverWarRoomPanel({ you }: { you: Team }) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });

  useEffect(() => {
    const seen = new Set<string>();
    const players = [...you.starters, ...you.bench]
      .filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)))
      .map((p) => ({ name: p.name, pos: p.pos, team: p.team }));
    if (players.length === 0) return;
    let active = true;
    setState({ kind: "loading" });
    fetch("/api/fantasy/waiver-war-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players }),
    })
      .then(async (res) => {
        if (!active) return;
        let json: { success?: boolean; error?: string; data?: { byes?: ByesLeg; disagreements?: DisagreementsLeg } } | null = null;
        try {
          json = await res.json();
        } catch {
          setState({ kind: "error" });
          return;
        }
        if (res.status === 401) {
          setState({ kind: "unauthenticated" });
          return;
        }
        if (res.status === 403 && json?.error === "insufficient_tier") {
          setState({ kind: "locked" });
          return;
        }
        if (res.status === 429) {
          setState({ kind: "rate-limited" });
          return;
        }
        if (!res.ok || !json?.success || !json.data?.byes || !json.data.disagreements) {
          setState({ kind: "error" });
          return;
        }
        setState({ kind: "ok", byes: json.data.byes, disagreements: json.data.disagreements });
      })
      .catch(() => {
        if (active) setState({ kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [you]);

  if (you.starters.length === 0 && you.bench.length === 0) return null;

  return (
    <div className="mt-5 surface-card p-4">
      <p className="text-sm font-semibold text-white">Waiver war room</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
        Two live reads on your real roster: bye-week collisions from the real draft-market feed, and the spots
        where the process-grade model and the waiver market point in opposite directions. Disagreement is
        surfaced, never averaged into advice — live today for Pro and Elite.
      </p>
      {renderBody(state)}
    </div>
  );
}

function alertBox(text: ReactNode, color: string) {
  return (
    <p role="alert" className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: `${color}55`, color }}>
      {text}
    </p>
  );
}

function renderBody(state: PanelState) {
  if (state.kind === "loading") {
    return <p className="mt-3 text-sm text-ink-400">Loading your waiver war room…</p>;
  }
  if (state.kind === "unauthenticated") {
    return alertBox(
      <>
        <a href="/auth/signin" className="font-semibold underline underline-offset-2">
          Sign in
        </a>{" "}
        to open your waiver war room — it&apos;s live today for Pro and Elite members.{" "}
        <a href="/pricing" className="font-semibold underline underline-offset-2">
          See pricing
        </a>
        .
      </>,
      BRAND_COLORS.softUltraviolet,
    );
  }
  if (state.kind === "locked") {
    return alertBox(
      <>
        The waiver war room on your synced roster is live today for Pro and Elite.{" "}
        <a href="/pricing" className="font-semibold underline underline-offset-2">
          Upgrade to open it
        </a>
        .
      </>,
      BRAND_COLORS.softUltraviolet,
    );
  }
  if (state.kind === "rate-limited") {
    return alertBox("Too many requests. Please wait a moment and reload.", BRAND_COLORS.ionMagenta);
  }
  if (state.kind === "error") {
    return alertBox("Couldn't load your waiver war room. Please try again shortly.", BRAND_COLORS.ionMagenta);
  }

  return (
    <div className="mt-3 space-y-4">
      <ByesSection leg={state.byes} />
      <DisagreementsSection leg={state.disagreements} />
    </div>
  );
}

function ByesSection({ leg }: { leg: ByesLeg }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider text-ink-600">Bye-week collisions</h4>
      {leg.status !== "ok" ? (
        <p role="alert" className="mt-1 text-xs" style={{ color: BRAND_COLORS.ionMagenta }}>
          Live bye data is temporarily unavailable — collisions can&apos;t be checked right now.
        </p>
      ) : (
        <>
          {(leg.collisions ?? []).length === 0 ? (
            <p className="mt-1 text-xs text-ink-500">No week has two or more of your matched players on bye at once.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {(leg.collisions ?? []).map((week) => (
                <div key={week.bye} className="rounded-lg border p-2.5" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <p className="text-xs font-semibold text-white">
                    Week {week.bye}: {week.players.length} of your players sit
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {week.players.map((p) => {
                      const hex = POS_HEX[p.pos] ?? "#9fb3c8";
                      return (
                        <span key={`${p.name}:${p.pos}`} className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px]" style={{ background: `${hex}14` }}>
                          <span className="font-bold" style={{ color: hex }}>
                            {p.pos}
                          </span>
                          <span className="text-white">{p.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {(leg.unknown ?? []).length > 0 && (
            <p className="mt-2 text-[11px] text-ink-500">
              No bye data joined for: {(leg.unknown ?? []).map((p) => p.name).join(", ")}. Reported, never guessed.
            </p>
          )}
          {leg.attribution && <p className="mt-2 font-mono text-[10px] text-ink-600">{leg.attribution}</p>}
        </>
      )}
    </div>
  );
}

function DisagreementsSection({ leg }: { leg: DisagreementsLeg }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider text-ink-600">Model vs. market</h4>
      {leg.status !== "ok" ? (
        <p role="alert" className="mt-1 text-xs" style={{ color: BRAND_COLORS.ionMagenta }}>
          Live model or market data is temporarily unavailable — disagreements can&apos;t be surfaced right now.
        </p>
      ) : (leg.rows ?? []).length === 0 ? (
        <p className="mt-1 text-xs text-ink-500">
          No conflicts to report right now — no player where the model signal and the waiver market point in
          opposite directions.
        </p>
      ) : (
        <>
          <div className="mt-2 space-y-2">
            {(leg.rows ?? []).map((row) => {
              const hex = POS_HEX[row.pos] ?? "#9fb3c8";
              const dirHex = row.marketDirection === "adding" ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta;
              return (
                <div key={`${row.name}:${row.pos}`} className="rounded-lg border p-2.5" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-9 rounded px-1 py-0.5 text-center text-[9px] font-bold" style={{ color: hex, background: `${hex}1c` }}>
                      {row.pos}
                    </span>
                    <span className="text-sm font-semibold text-white">{row.name}</span>
                    <span className="font-mono text-[10px] text-ink-600">{row.team}</span>
                    {row.onRoster && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: BRAND_COLORS.orbitalCyan, background: `${BRAND_COLORS.orbitalCyan}1c` }}>
                        Your roster
                      </span>
                    )}
                    <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: dirHex, background: `${dirHex}1c` }}>
                      Market {row.marketDirection}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">{row.description}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-[10px] text-ink-600">
            {leg.modelSeason != null ? `Model: season ${leg.modelSeason}${leg.modelThroughWeek != null ? ` through week ${leg.modelThroughWeek}` : ""}` : null}
            {leg.lookbackHours != null ? ` · Market: last ${leg.lookbackHours}h` : null}
            {leg.attribution ? ` · ${leg.attribution}` : null}
          </p>
        </>
      )}
    </div>
  );
}
