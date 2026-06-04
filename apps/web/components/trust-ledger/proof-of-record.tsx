"use client";

/**
 * ProofOfRecord — the interactive tamper-evidence demonstration.
 *
 * Shows the published Merkle root (committed at lock time), lets you toggle a
 * "tamper" (quietly flipping a LOSS to a WIN) and watch the recomputed root
 * diverge from the commitment — proving the history can't be rewritten without
 * detection. Also folds a real inclusion proof up to the published root. The
 * hashes are real SHA-256 from the engine; the records are illustrative.
 */

import { useState } from "react";
import type { ProofDemo } from "@/lib/trust-ledger/proof-demo";
import { BRAND_COLORS } from "@/lib/brand";

const RESULT_HEX: Record<string, string> = {
  WIN: BRAND_COLORS.orbitalCyan,
  LOSS: BRAND_COLORS.ionMagenta,
  PUSH: BRAND_COLORS.softUltraviolet,
};

export function ProofOfRecord({ demo }: { demo: ProofDemo }) {
  const [tampered, setTampered] = useState(false);
  const recomputedRoot = tampered ? demo.tamper.recomputedRootShort : demo.publishedRootShort;
  const matches = tampered ? demo.tamper.matches : demo.intactMatches;
  const okColor = BRAND_COLORS.orbitalCyan;
  const badColor = BRAND_COLORS.ionMagenta;

  return (
    <div className="surface-card relative overflow-hidden p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: `${(matches ? okColor : badColor)}1f` }} />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow flex items-center gap-2" style={{ color: okColor }}>
          <span className="live-dot" />
          Proof of record
        </p>
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300" style={{ borderColor: BRAND_COLORS.steelGray }}>
          Illustrative records · real SHA-256
        </span>
      </div>

      {/* published commitment */}
      <div className="relative mt-5 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BRAND_COLORS.steelGray}` }}>
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Published Merkle root · committed at lock time</p>
        <p className="mt-1.5 break-all font-mono text-sm" style={{ color: okColor }}>{demo.publishedRoot}</p>
      </div>

      <div className="relative mt-6 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* the ledger + tamper toggle */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">The committed set · {demo.records.length} picks</p>
            <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND_COLORS.steelGray}` }}>
              <button
                type="button"
                onClick={() => setTampered(false)}
                aria-pressed={!tampered}
                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                style={{ color: !tampered ? BRAND_COLORS.obsidianBlack : "var(--ion-2,#c8d2dd)", background: !tampered ? okColor : "transparent" }}
              >
                Intact
              </button>
              <button
                type="button"
                onClick={() => setTampered(true)}
                aria-pressed={tampered}
                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                style={{ color: tampered ? BRAND_COLORS.obsidianBlack : "var(--ion-2,#c8d2dd)", background: tampered ? badColor : "transparent" }}
              >
                Tamper a result
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {demo.records.map((r) => {
              const isTarget = tampered && r.id === demo.tamper.changedId;
              const shownResult = isTarget ? demo.tamper.to : r.result;
              const color = RESULT_HEX[shownResult] ?? BRAND_COLORS.ionWhite;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                  style={{ background: isTarget ? `${badColor}10` : "rgba(255,255,255,0.02)", boxShadow: isTarget ? `inset 0 0 0 1px ${badColor}55` : "none" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{r.label}</p>
                    <p className="font-mono text-[10px] text-ink-500">{r.market} · {r.selection}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTarget && (
                      <span className="font-mono text-[10px] text-ink-500 line-through">{demo.tamper.from}</span>
                    )}
                    <span className="rounded-full px-2 py-0.5 font-mono text-[11px] font-bold" style={{ color, background: `${color}14`, border: `1px solid ${color}44` }}>
                      {shownResult}
                    </span>
                    {isTarget && <span aria-hidden style={{ color: badColor }}>⚠</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* verification + inclusion proof */}
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: `${(matches ? okColor : badColor)}0c`, border: `1px solid ${(matches ? okColor : badColor)}3a` }}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Recompute the root from the ledger</p>
            <p className="mt-1.5 break-all font-mono text-sm" style={{ color: matches ? okColor : badColor }}>{recomputedRoot}</p>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold" style={{ color: matches ? okColor : badColor }}>
              <span aria-hidden>{matches ? "✓" : "✗"}</span>
              {matches ? "Matches the published commitment — untampered." : "Does not match — the tamper is detected."}
            </p>
            {tampered && (
              <p className="mt-2 text-xs leading-relaxed text-ink-400">
                One record changed ({demo.tamper.changedLabel}: {demo.tamper.field} {demo.tamper.from} → {demo.tamper.to}) and the
                entire root changed. You can&apos;t quietly rewrite a loss into a win after the fact.
              </p>
            )}
          </div>

          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BRAND_COLORS.steelGray}` }}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Inclusion proof · {demo.proof.recordLabel}</p>
            <p className="mt-2 font-mono text-[11px] text-ink-400">leaf <span style={{ color: BRAND_COLORS.orbitalCyan }}>{demo.proof.leafShort}</span></p>
            <ul className="mt-1 space-y-0.5">
              {demo.proof.siblings.map((s, i) => (
                <li key={i} className="font-mono text-[11px] text-ink-500">
                  <span className="text-ink-600">{s.right ? "+R" : "+L"}</span> {s.hashShort}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 flex items-center gap-2 text-sm font-semibold" style={{ color: demo.proof.verified ? okColor : badColor }}>
              <span aria-hidden>{demo.proof.verified ? "✓" : "✗"}</span>
              {demo.proof.verified ? "Folds up to the published root — proven in the set." : "Proof failed."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
