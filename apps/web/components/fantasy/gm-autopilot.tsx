"use client";

/**
 * GmAutopilot — the delegation dial and the glass-box action queue.
 *
 * Choose how much to delegate (Manual → Full remote). At every level the moves
 * are explained before they happen, marked reversible or not, and — at acting
 * levels — gated behind your approval and a clear consent/compliance notice.
 * Nothing here executes on a real account; this is the proposal-and-approval
 * layer, illustrative.
 */

import { useMemo, useState } from "react";
import { LEVELS, levelSpec, proposeActions, executionNotice, type AutonomyLevel, type ActionType } from "@/lib/fantasy/autonomy";
import { BRAND_COLORS } from "@/lib/brand";

const TYPE_HEX: Record<ActionType, string> = {
  lineup: BRAND_COLORS.ionMagenta,
  waiver: BRAND_COLORS.orbitalCyan,
  drop: "#9fb3c8",
  trade: BRAND_COLORS.softUltraviolet,
};


export function GmAutopilot() {
  const [level, setLevel] = useState<AutonomyLevel>(1);
  const [decided, setDecided] = useState<Map<string, "approved" | "skipped">>(new Map());

  const spec = levelSpec(level);
  const actions = useMemo(() => proposeActions(level), [level]);
  const decide = (id: string, d: "approved" | "skipped") => setDecided((m) => new Map(m).set(id, d));

  return (
    <div className="space-y-6">
      {/* league sync surface */}
      <div className="surface-card flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs uppercase tracking-[0.16em] text-ink-500">League sync</span>
        <a href="/fantasy/connect" className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs" style={{ borderColor: `${BRAND_COLORS.orbitalCyan}66`, color: BRAND_COLORS.orbitalCyan }}>
          Sleeper
          <span className="text-[9px] uppercase tracking-wider" style={{ color: BRAND_COLORS.orbitalCyan }}>connect →</span>
        </a>
        {(["ESPN", "Yahoo"] as const).map((p) => (
          <span key={p} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs" style={{ borderColor: BRAND_COLORS.steelGray, color: "#c8d2dd" }}>
            {p}
            <span className="text-[9px] uppercase tracking-wider text-ink-600">soon</span>
          </span>
        ))}
        <span className="ml-auto text-[10px] text-ink-600">Read-only sync + write-back are founder-gated behind OAuth & compliance.</span>
      </div>

      {/* the dial */}
      <div className="surface-card p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-500">How much do you want to delegate?</p>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {LEVELS.map((l) => {
            const active = l.level === level;
            return (
              <button
                key={l.level}
                type="button"
                onClick={() => setLevel(l.level)}
                className="rounded-lg border p-2.5 text-left transition-colors"
                style={{ borderColor: active ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.steelGray, background: active ? `${BRAND_COLORS.orbitalCyan}12` : "transparent" }}
              >
                <p className="font-mono text-[10px] text-ink-600">L{l.level}</p>
                <p className="text-sm font-semibold" style={{ color: active ? BRAND_COLORS.orbitalCyan : "#fff" }}>{l.name}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: BRAND_COLORS.orbitalCyan }}>We do</p>
            <p className="mt-1 text-sm text-ink-200">{spec.weDo}</p>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: BRAND_COLORS.softUltraviolet }}>You do</p>
            <p className="mt-1 text-sm text-ink-200">{spec.youDo}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border p-3" style={{ borderColor: spec.founderGated ? `${BRAND_COLORS.softUltraviolet}55` : BRAND_COLORS.steelGray, background: spec.founderGated ? `${BRAND_COLORS.softUltraviolet}0c` : "transparent" }}>
          {spec.founderGated && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${BRAND_COLORS.softUltraviolet}22`, color: BRAND_COLORS.softUltraviolet }}>Consent-gated</span>}
          <span className="text-xs text-ink-300">{executionNotice(level)}</span>
        </div>
      </div>

      {/* action queue */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">This week&apos;s proposed actions</p>
          {actions.length > 0 && <p className="text-[11px] text-ink-600">Every action is explained, reversible-tagged, and logged to your GM Ledger.</p>}
        </div>

        {actions.length === 0 ? (
          <div className="surface-card p-6 text-sm text-ink-400">Manual mode — nothing is queued. Dial up to L1 to see the Autopilot&apos;s reads.</div>
        ) : (
          <div className="space-y-2.5">
            {actions.map((a) => {
              const hex = TYPE_HEX[a.type];
              const d = decided.get(a.id);
              return (
                <div key={a.id} className="surface-card p-4" style={{ opacity: d === "skipped" ? 0.5 : 1 }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: hex, background: `${hex}1c` }}>{a.type}</span>
                    <span className="text-sm font-semibold text-white">{a.title}</span>
                    <span className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider" style={{ background: a.reversible ? "rgba(0,229,255,0.12)" : "rgba(255,56,199,0.12)", color: a.reversible ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>
                      {a.reversible ? "reversible" : "commits FAAB"}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-ink-500">{Math.round(a.confidence * 100)}% conf</span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-300">{a.detail}</p>
                  <p className="mt-1 text-[12px] text-ink-400"><span style={{ color: hex }}>▸ </span>{a.rationale}</p>

                  <div className="mt-3 flex items-center gap-2">
                    {d ? (
                      <span className="text-xs font-semibold" style={{ color: d === "approved" ? BRAND_COLORS.orbitalCyan : "#9fb3c8" }}>
                        {d === "approved" ? "✓ Approved — queued to your GM Ledger" : "Skipped"}
                      </span>
                    ) : (
                      <>
                        <button type="button" onClick={() => decide(a.id, "approved")} className="btn btn-primary btn-sm">
                          {spec.approval === "advisory" ? "Mark as done" : "Approve"}
                        </button>
                        <button type="button" onClick={() => decide(a.id, "skipped")} className="btn btn-ghost btn-sm">Skip</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-[10px] leading-relaxed text-ink-600">
              Approving here records the decision to your GM Ledger (process-graded, tamper-evident) and would queue it for
              submission only once live league write-back is enabled for your account. This demo never touches a real league.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
