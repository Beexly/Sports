"use client";

/**
 * RosterAdvicePanel — the real, personalized waiver signal for a synced roster.
 *
 * Runs the already-live process-grade model (nflverse-derived, PRO/ELITE
 * gated server-side via requirePremiumApi) against the user's ACTUAL synced
 * Sleeper roster. Every number/reason shown traces directly to the API
 * response; every non-"ok" state (locked, rate-limited, source-error,
 * network error) renders its own honest message instead of stale/fake data.
 * Enforcement is server-side only (requirePremiumApi in the route) — this
 * component only reads the response, it never decides entitlement itself.
 */

import { useEffect, useState, type ReactNode } from "react";
import type { Team } from "@/lib/integrations/sleeper";
import { BRAND_COLORS } from "@/lib/brand";

const POS_HEX: Record<string, string> = { QB: "#00E5FF", RB: "#7B61FF", WR: "#FF38C7", TE: "#F5F7FF", DEF: "#9fb3c8", K: "#E0A800" };

type AddSignal = "buy-low" | "in-line" | "sell-high";
type RosterRead = "ride" | "sell-high" | "hold" | "buy-more";

interface AddTarget {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly processGrade: number;
  readonly productionPct: number;
  readonly signal: AddSignal;
  readonly addScore: number;
  readonly reason: string;
}
interface DropCandidate {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly processGrade: number;
  readonly signal: AddSignal;
  readonly reason: string;
}
interface RosterPlayerRead {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly processGrade: number;
  readonly read: RosterRead;
  readonly reason: string;
}

type PanelState =
  | { readonly kind: "loading" }
  | { readonly kind: "unauthenticated" }
  | { readonly kind: "locked" }
  | { readonly kind: "rate-limited" }
  | { readonly kind: "error" }
  | { readonly kind: "source-error" }
  | {
      readonly kind: "ok";
      readonly season: number;
      readonly throughWeek: number | null;
      readonly adds: readonly AddTarget[];
      readonly drops: readonly DropCandidate[];
      readonly reads: readonly RosterPlayerRead[];
    };

const SIGNAL_HEX: Record<AddSignal, string> = { "buy-low": BRAND_COLORS.orbitalCyan, "in-line": "#9fb3c8", "sell-high": BRAND_COLORS.ionMagenta };
const READ_HEX: Record<RosterRead, string> = { "buy-more": BRAND_COLORS.orbitalCyan, ride: BRAND_COLORS.orbitalCyan, hold: "#E0A800", "sell-high": BRAND_COLORS.ionMagenta };
const SIGNAL_LABEL: Record<AddSignal, string> = { "buy-low": "Buy-low", "in-line": "In-line", "sell-high": "Sell-high" };
const READ_LABEL: Record<RosterRead, string> = { ride: "Ride it", "buy-more": "Buy more", hold: "Hold", "sell-high": "Sell-high" };

export function RosterAdvicePanel({ you }: { you: Team }) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });

  useEffect(() => {
    const names = Array.from(new Set([...you.starters, ...you.bench].map((p) => p.name)));
    if (names.length === 0) return;
    let active = true;
    setState({ kind: "loading" });
    fetch("/api/intelligence/roster-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players: names }),
    })
      .then(async (res) => {
        if (!active) return;
        let json: { success?: boolean; error?: string; data?: { status?: string; season?: number; throughWeek?: number | null; adds?: AddTarget[]; drops?: DropCandidate[]; reads?: RosterPlayerRead[] } } | null = null;
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
        // The route reports a live nflverse outage as HTTP 200 with
        // { success: false, data: { status: "source-error" } } — so this check
        // must run BEFORE the generic success/ok failure check, or a real
        // outage would collapse into the transient-error message.
        if (json?.data?.status === "source-error") {
          setState({ kind: "source-error" });
          return;
        }
        if (!res.ok || !json?.success || !json.data) {
          setState({ kind: "error" });
          return;
        }
        const data = json.data;
        setState({
          kind: "ok",
          season: data.season ?? 0,
          throughWeek: data.throughWeek ?? null,
          adds: data.adds ?? [],
          drops: data.drops ?? [],
          reads: data.reads ?? [],
        });
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
      <p className="text-sm font-semibold text-white">Real waiver signal</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
        Your real roster run through the live process-grade model (real nflverse EPA/opportunity data, not a
        placeholder pool) — live today for Pro/Elite.
      </p>
      {renderBody(state)}
    </div>
  );
}

function renderBody(state: PanelState) {
  if (state.kind === "loading") {
    return <p className="mt-3 text-sm text-ink-400">Loading your real waiver signal…</p>;
  }
  if (state.kind === "unauthenticated") {
    return (
      <p role="alert" className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: `${BRAND_COLORS.softUltraviolet}44`, color: BRAND_COLORS.softUltraviolet }}>
        <a href="/auth/signin" className="font-semibold underline underline-offset-2">
          Sign in
        </a>{" "}
        to see your real waiver signal — it&apos;s live today for Pro and Elite members.{" "}
        <a href="/pricing" className="font-semibold underline underline-offset-2">
          See pricing
        </a>
        .
      </p>
    );
  }
  if (state.kind === "locked") {
    return (
      <p role="alert" className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: `${BRAND_COLORS.softUltraviolet}44`, color: BRAND_COLORS.softUltraviolet }}>
        Real waiver signal on your synced roster is live today for Pro and Elite.{" "}
        <a href="/pricing" className="font-semibold underline underline-offset-2">
          Upgrade to see it now
        </a>
        .
      </p>
    );
  }
  if (state.kind === "rate-limited") {
    return (
      <p role="alert" className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: `${BRAND_COLORS.ionMagenta}55`, color: BRAND_COLORS.ionMagenta }}>
        Too many requests. Please wait a moment and reload.
      </p>
    );
  }
  if (state.kind === "source-error") {
    return (
      <p role="alert" className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: `${BRAND_COLORS.ionMagenta}55`, color: BRAND_COLORS.ionMagenta }}>
        Live model data is temporarily unavailable. Please try again shortly.
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <p role="alert" className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: `${BRAND_COLORS.ionMagenta}55`, color: BRAND_COLORS.ionMagenta }}>
        Couldn&apos;t load your waiver signal. Please try again shortly.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] text-ink-600">
        Season {state.season}
        {state.throughWeek != null ? ` · through week ${state.throughWeek}` : ""}
      </p>
      <AdviceSection title="Add targets" empty="No add targets surfaced this week.">
        {state.adds.map((p) => (
          <AdviceRow key={p.name} name={p.name} team={p.team} position={p.position} processGrade={p.processGrade} reason={p.reason} tagHex={SIGNAL_HEX[p.signal]} tagLabel={SIGNAL_LABEL[p.signal]} />
        ))}
      </AdviceSection>
      <AdviceSection title="Drop candidates" empty="No drop candidates surfaced this week.">
        {state.drops.map((p) => (
          <AdviceRow key={p.name} name={p.name} team={p.team} position={p.position} processGrade={p.processGrade} reason={p.reason} tagHex={SIGNAL_HEX[p.signal]} tagLabel={SIGNAL_LABEL[p.signal]} />
        ))}
      </AdviceSection>
      <AdviceSection title="Your roster, read" empty="No roster reads matched your synced players yet.">
        {state.reads.map((p) => (
          <AdviceRow key={p.name} name={p.name} team={p.team} position={p.position} processGrade={p.processGrade} reason={p.reason} tagHex={READ_HEX[p.read]} tagLabel={READ_LABEL[p.read]} />
        ))}
      </AdviceSection>
    </div>
  );
}

function AdviceSection({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <div className="mt-4">
      <h4 className="text-[10px] uppercase tracking-wider text-ink-600">{title}</h4>
      {children.length === 0 ? <p className="mt-1 text-xs text-ink-500">{empty}</p> : <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
}

function AdviceRow({
  name,
  team,
  position,
  processGrade,
  reason,
  tagHex,
  tagLabel,
}: {
  name: string;
  team: string;
  position: string;
  processGrade: number;
  reason: string;
  tagHex: string;
  tagLabel: string;
}) {
  const posHex = POS_HEX[position] ?? "#9fb3c8";
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: BRAND_COLORS.steelGray }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-9 rounded px-1 py-0.5 text-center text-[9px] font-bold" style={{ color: posHex, background: `${posHex}1c` }}>
          {position}
        </span>
        <span className="text-sm font-semibold text-white">{name}</span>
        <span className="font-mono text-[10px] text-ink-600">{team}</span>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: tagHex, background: `${tagHex}1c` }}>
          {tagLabel}
        </span>
        <span className="ml-auto font-mono text-[10px] text-ink-500">Process {processGrade}</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">{reason}</p>
    </div>
  );
}
