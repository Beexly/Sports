"use client";

import { useState } from "react";
import Link from "next/link";
import type { SealedRow } from "@/lib/week8/types";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

interface SealedTableProps {
  rows: SealedRow[];
  watch?: boolean;
  freeLimit?: number;
}

export function SealedTable({ rows, watch = false, freeLimit }: SealedTableProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setLoading(true);
    try {
      await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const hasLimit = typeof freeLimit === "number" && freeLimit > 0 && freeLimit < rows.length;
  const freeRows = hasLimit ? rows.slice(0, freeLimit) : rows;
  const lockedRows = hasLimit ? rows.slice(freeLimit) : [];

  return (
    <div className="overflow-x-auto border-y border-[#31353F]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm text-[#EDE8E0]">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.12em] text-[#8F8A82]">
            <th className="px-4 py-5 font-medium">Play</th>
            <th className="px-4 py-5 font-medium">Model win prob</th>
            <th className="px-4 py-5 font-medium">Market prob</th>
            <th className="px-4 py-5 font-medium">Edge</th>
            <th className="px-4 py-5 font-medium">Read</th>
            <th className="px-4 py-5 font-medium">{watch ? "Trigger" : "Status"}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {/* Free Teaser Rows with Trench X-Ray */}
          {freeRows.map((row) => (
            <tr key={`${row.matchup}-${row.selection}`} className="border-t border-[#31353F]">
              <td className="px-4 py-8 pr-6 align-top">
                <div className="flex items-center gap-2">
                  <div className="font-display text-2xl uppercase leading-none text-[#EDE8E0]">{row.selection}</div>
                  {hasLimit && (
                    <span className="rounded bg-[#FF4D2E]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF4D2E]">
                      Free Teaser
                    </span>
                  )}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.12em] text-[#FF4D2E]">{row.matchup}</div>
                <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[#C4BFB6]">{row.rationale}</p>
                {hasLimit && (
                  <div className="mt-4 rounded border border-[#FF4D2E]/30 bg-[#16181F] p-3 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#FF4D2E]">Sealed Line Check: </span>
                    <span className="text-[#EDE8E0]">
                      Model win prob {pct(row.model_p)} vs market prob {pct(row.market_p)} · Edge +{pct(row.edge)} · Read {row.confidence_display}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-4 py-8 align-top">{pct(row.model_p)}</td>
              <td className="px-4 py-8 align-top">{pct(row.market_p)}</td>
              <td className="px-4 py-8 align-top text-[#FF4D2E]">{pct(row.edge)}</td>
              <td className="px-4 py-8 align-top font-semibold">{row.confidence_display}</td>
              <td className="px-4 py-8 align-top text-xs uppercase tracking-[0.08em]">
                {row.decision === "PASS" ? "PASS · DO NOT BET" : row.decision}
                {watch && row.trigger_odds != null ? ` · ${row.trigger_odds}` : ""}
              </td>
            </tr>
          ))}

          {/* Inline Email Capture & Paywall Gate Banner */}
          {hasLimit && (
            <tr className="border-t-2 border-[#FF4D2E] bg-[#12141A]">
              <td colSpan={6} className="px-6 py-8">
                <div className="mx-auto max-w-2xl text-center">
                  <span className="inline-block rounded bg-[#FF4D2E]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#FF4D2E]">
                    🔒 Locked Card · {lockedRows.length} Plays Reserved for Members
                  </span>
                  <h3 className="mt-3 font-display text-2xl uppercase tracking-tight text-[#EDE8E0]">
                    Get Weekly NFL Matchup &amp; Injury Notes
                  </h3>
                  <p className="mt-2 text-sm text-[#C4BFB6]">
                    Register your email for weekly NFL game-environment and injury workload notes, or unlock the full Week 10 card on our storefront now.
                  </p>

                  {!submitted ? (
                    <form onSubmit={handleCapture} className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="min-h-[44px] min-w-[260px] rounded border border-[#31353F] bg-[#08090C] px-4 text-sm text-[#EDE8E0] placeholder:text-[#8F8A82] focus:border-[#FF4D2E] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="min-h-[44px] rounded bg-[#FF4D2E] px-6 text-xs font-bold uppercase tracking-wider text-[#08090C] hover:opacity-90"
                      >
                        {loading ? "Registering…" : "Get Matchup Notes →"}
                      </button>
                      <Link
                        href="/packages"
                        className="inline-flex min-h-[44px] items-center rounded border border-[#FF4D2E] px-6 text-xs font-bold uppercase tracking-wider text-[#FF4D2E] hover:bg-[#FF4D2E]/10"
                      >
                        Unlock Full Card (From $19) →
                      </Link>
                    </form>
                  ) : (
                    <div className="mt-4 flex items-center justify-center gap-4 text-sm font-semibold text-[#FF4D2E]">
                      <span>✓ Email registered for weekly NFL matchup &amp; injury notes.</span>
                      <Link href="/packages" className="underline hover:text-white">
                        Unlock Full Card Now →
                      </Link>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          )}

          {/* Locked Card Rows */}
          {lockedRows.map((row) => (
            <tr key={`${row.matchup}-${row.selection}`} className="border-t border-[#31353F] bg-[#0B0D12]/60">
              <td className="px-4 py-6 pr-6 align-top">
                <div className="font-display text-xl uppercase tracking-wide text-[#8F8A82]">
                  🔒 [LOCKED · ALL-ACCESS / PRO PACK ONLY]
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.12em] text-[#FF4D2E]">{row.matchup}</div>
                <p className="mt-2 text-xs text-[#8F8A82]">
                  Tactical trench breakdown, injury reallocation delta, and optimal market trigger reserved for members.
                </p>
              </td>
              <td className="px-4 py-6 align-top text-[#8F8A82]">🔒 Locked</td>
              <td className="px-4 py-6 align-top text-[#8F8A82]">🔒 Locked</td>
              <td className="px-4 py-6 align-top text-[#8F8A82]">🔒 Locked</td>
              <td className="px-4 py-6 align-top font-semibold text-[#EDE8E0]">{row.confidence_display}</td>
              <td className="px-4 py-6 align-top text-xs uppercase tracking-[0.08em]">
                <Link href="/packages" className="font-bold text-[#FF4D2E] hover:underline">
                  UNLOCK →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
