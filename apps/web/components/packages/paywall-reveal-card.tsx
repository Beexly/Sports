"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { PickPackageOffering } from "@/lib/packages/catalog";
import type { CoachGameWriteup } from "@/lib/writeups/coach-writeup-engine";

export interface RedactedWriteupTeaser {
  id: string;
  gameId: string;
  windowSlot: string;
  matchup: string;
  kickoff: string;
  paceOfPlay: {
    neutralSecPerSnap: number | null;
    noHuddleRate: number | null;
    passEpaPlay: number | null;
    notes: string;
  };
  schemeMatchup: {
    coverageShell: string;
    blitzRateVsPressureToSack: string;
    notes: string;
  };
  lockedSummary: {
    sideConfidence: string;
    sideExpectedClvCents: string;
    totalConfidence: string;
    totalExpectedClvCents: string;
    propsCount: number;
    hasSgp: boolean;
    sgpMarketOdds: string | null;
    hasDfs: boolean;
  };
}

interface PaywallRevealCardProps {
  pkg: PickPackageOffering;
  teasers: RedactedWriteupTeaser[];
  initialUnlockedWriteups?: CoachGameWriteup[] | null;
  initialSessionId?: string;
}

function formatConfidenceStrict(raw: string | number): string {
  const cleaned = String(raw).trim().replace(/%/g, "");
  return cleaned.endsWith("/100") ? cleaned : `${cleaned}/100`;
}

export function PaywallRevealCard({
  pkg,
  teasers,
  initialUnlockedWriteups = null,
  initialSessionId,
}: PaywallRevealCardProps): JSX.Element {
  const [unlockedWriteups, setUnlockedWriteups] = useState<CoachGameWriteup[] | null>(
    initialUnlockedWriteups,
  );
  const [tokenInput, setTokenInput] = useState<string>(initialSessionId || "");
  const [showTokenBox, setShowTokenBox] = useState<boolean>(false);
  const [loadingUnlock, setLoadingUnlock] = useState<boolean>(false);
  const [loadingCheckout, setLoadingCheckout] = useState<boolean>(false);
  const [guaranteed, setGuaranteed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isUnlocked = Boolean(unlockedWriteups && unlockedWriteups.length > 0);
  const standardPrice = (pkg.standardPriceCents / 100).toFixed(0);
  const guaranteedPrice = pkg.guaranteedPriceCents
    ? (pkg.guaranteedPriceCents / 100).toFixed(0)
    : null;
  const activePrice = guaranteed && guaranteedPrice ? guaranteedPrice : standardPrice;

  // Check if user already unlocked this package or an all-access pass in localStorage
  useEffect(() => {
    if (isUnlocked) return;
    try {
      const savedToken =
        window.localStorage.getItem(`gse_unlock_${pkg.slug}`) ||
        window.localStorage.getItem("gse_unlock_global");
      if (savedToken) {
        void handleInlineVerify(savedToken, true);
      }
    } catch {
      // ignore storage errors
    }
  }, [pkg.slug, isUnlocked]);

  async function handleInlineVerify(overrideToken?: string, silent = false) {
    const token = (overrideToken ?? tokenInput).trim();
    if (!token) {
      if (!silent) setErrorMsg("Enter your Stripe Receipt ID (cs_...)");
      return;
    }
    setLoadingUnlock(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/packages/unlock?package=${encodeURIComponent(pkg.slug)}&session_id=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      if (res.ok && data.unlocked && Array.isArray(data.writeups)) {
        setUnlockedWriteups(data.writeups);
        try {
          window.localStorage.setItem(`gse_unlock_${pkg.slug}`, token);
          window.localStorage.setItem("gse_unlock_global", token);
        } catch {
          // ignore
        }
      } else if (!silent) {
        setErrorMsg(data.error || "Receipt ID could not be verified.");
      }
    } catch {
      if (!silent) setErrorMsg("Network error verifying receipt ID.");
    } finally {
      setLoadingUnlock(false);
    }
  }

  async function handleOneClickCheckout(useGuaranteed: boolean) {
    setLoadingCheckout(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSlug: pkg.slug,
          guaranteed: useGuaranteed,
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (data.sessionId && String(data.sessionId).startsWith("cs_test_mock_")) {
          await handleInlineVerify(String(data.sessionId), false);
          setLoadingCheckout(false);
          return;
        }
        window.location.href = data.url;
        return;
      }
      setErrorMsg(data.error || "Unable to start checkout.");
    } catch {
      setErrorMsg("Checkout connection error.");
    } finally {
      setLoadingCheckout(false);
    }
  }

  return (
    <div
      data-testid={`paywall-reveal-card-${pkg.slug}`}
      className="flex flex-col justify-between bg-slate-900 border-2 border-slate-700 hover:border-amber-400 rounded-xl p-6 shadow-xl transition-colors"
    >
      {/* Card Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-md border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            {pkg.badge || pkg.windowSlot}
          </span>
          <div className="flex items-center gap-2">
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                UNLOCKED IN-PLACE
              </span>
            ) : (
              <span className="text-2xl font-bold text-amber-400">
                ${activePrice}
              </span>
            )}
          </div>
        </div>

        <h3 className="mt-3 font-display text-2xl font-bold text-white">
          {pkg.title}
        </h3>
        <p className="mt-1 text-sm font-semibold text-amber-300">
          {pkg.gamesCount} {pkg.gamesCount === 1 ? "Game" : "Games"} · Side, Total, Player Props &amp; Same-Game Parlay
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{pkg.description}</p>

        {/* FREE PREVIEW BOX (Plain English, High Contrast) */}
        {teasers.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-slate-700 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Why We Like This Game (Free Preview)
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                10,000 Game Simulations
              </span>
            </div>
            {teasers.slice(0, 2).map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-700 bg-slate-800/90 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white">{t.matchup}</span>
                  <span className="text-xs font-semibold text-amber-300">
                    {t.windowSlot}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-200 leading-relaxed">
                  {t.schemeMatchup.coverageShell || t.schemeMatchup.notes}
                </p>
                <div className="mt-3 rounded-md bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 border border-slate-700">
                  Inside This Pack: Side Confidence {formatConfidenceStrict(t.lockedSummary.sideConfidence)} · Total Confidence {formatConfidenceStrict(t.lockedSummary.totalConfidence)} · {t.lockedSummary.propsCount} Player Props
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HIGH-CONTRAST PAYWALL CALLOUT OR UNLOCKED PICKS */}
        {!isUnlocked ? (
          <div className="mt-5 rounded-xl border-2 border-amber-500/60 bg-slate-800 p-5 text-center shadow-inner">
            <h4 className="text-lg font-bold text-white">
              🔒 Unlock Official Picks &amp; Exact Bet Numbers
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Click below for instant access to our official Side bet, Total bet, best Player Props, and Same-Game Parlay right on this screen.
            </p>

            {guaranteedPrice && (
              <div className="mt-3 inline-flex rounded-lg border border-slate-600 bg-slate-900 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setGuaranteed(false)}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    !guaranteed ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Standard ${standardPrice}
                </button>
                <button
                  type="button"
                  onClick={() => setGuaranteed(true)}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    guaranteed ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Credit-Back ${guaranteedPrice}
                </button>
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                disabled={loadingCheckout}
                onClick={() => void handleOneClickCheckout(guaranteed)}
                className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base py-3 px-6 shadow-md transition-all"
              >
                {loadingCheckout
                  ? "Opening Secure Checkout..."
                  : `Unlock Picks Now — $${activePrice}`}
              </button>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowTokenBox((prev) => !prev)}
                className="text-xs font-semibold text-slate-300 underline hover:text-amber-300"
              >
                {showTokenBox ? "Hide Receipt Box" : "Already purchased? Enter Receipt ID"}
              </button>
            </div>
          </div>
        ) : (
          /* UNLOCKED IN-PLACE REVEAL */
          <div className="mt-5 space-y-4 rounded-xl border-2 border-emerald-500/60 bg-slate-950 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                ✓ Live Picks Revealed In-Place
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Confidence Score Out of 100
              </span>
            </div>

            {unlockedWriteups?.map((w) => {
              const sideIsPass = String(w.sideTotalCall.sideDecision) === "PASS";
              const totalIsPass = String(w.sideTotalCall.totalDecision) === "PASS";
              return (
                <div key={w.id} className="space-y-4 border-b border-slate-800 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-white">{w.matchup}</span>
                    <span className="text-xs font-bold uppercase text-amber-400">{w.windowSlot}</span>
                  </div>

                  {/* Official Side & Total */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="bg-slate-800 border border-emerald-500/50 rounded-lg p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        BEST SPREAD BET
                      </div>
                      <div className="mt-1 text-lg font-bold text-white">
                        {sideIsPass ? "PASS — Market Efficient" : w.sideTotalCall.sideSelection}
                      </div>
                      <div className="mt-2 text-xs font-semibold text-emerald-300">
                        Confidence: {formatConfidenceStrict(w.sideTotalCall.sideConfidence)}
                      </div>
                    </div>

                    <div className="bg-slate-800 border border-emerald-500/50 rounded-lg p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        BEST TOTAL BET
                      </div>
                      <div className="mt-1 text-lg font-bold text-white">
                        {totalIsPass ? "PASS — Market Efficient" : w.sideTotalCall.totalSelection}
                      </div>
                      <div className="mt-2 text-xs font-semibold text-emerald-300">
                        Confidence: {formatConfidenceStrict(w.sideTotalCall.totalConfidence)}
                      </div>
                    </div>
                  </div>

                  {/* Plain-English Rationale */}
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      WHY BET THIS:
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                      {w.sideTotalCall.rationale}
                    </p>
                  </div>

                  {/* Best Player Props */}
                  {w.topProps.length > 0 && (
                    <div className="bg-slate-800 border border-emerald-500/50 rounded-lg p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        BEST PLAYER PROPS
                      </div>
                      <div className="mt-2 space-y-2">
                        {w.topProps.map((p, idx) => {
                          const propIsPass = String(p.decision) === "PASS";
                          return (
                            <div
                              key={`${p.playerId}-${p.propType}-${idx}`}
                              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/70 pb-2 last:border-b-0 last:pb-0 text-sm"
                            >
                              <span className="font-bold text-white">
                                {propIsPass
                                  ? `${p.playerName} — PASS — Market Efficient (${p.propType})`
                                  : `${p.playerName} — ${p.side} ${p.line} ${p.propType}`}
                              </span>
                              <span className="text-xs font-semibold text-emerald-300">
                                Confidence: {formatConfidenceStrict(p.confidence)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Correlated Same-Game Parlay */}
                  {w.correlatedSgpTicket && (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                          {w.correlatedSgpTicket.title}
                        </span>
                        <span className="text-xs font-bold text-white">
                          Book Odds {w.correlatedSgpTicket.marketOdds} (Fair Odds {w.correlatedSgpTicket.fairOdds})
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-200">
                        {w.correlatedSgpTicket.legs.map((leg, idx) => (
                          <li key={idx}>
                            • {leg.description} (Confidence: {formatConfidenceStrict(leg.confidence)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Inline Receipt Verification Drawer */}
        {!isUnlocked && showTokenBox && (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-4">
            <label className="block text-xs font-bold uppercase text-slate-200">
              Enter Your Stripe Receipt ID for Instant Access
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="cs_live_..."
                className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={loadingUnlock}
                onClick={() => void handleInlineVerify()}
                className="rounded-md bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950"
              >
                {loadingUnlock ? "Checking..." : "Unlock"}
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="mt-2 text-xs font-semibold text-amber-400">{errorMsg}</p>
        )}
      </div>

      {/* Footer Link */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-xs font-semibold">
        <Link
          href={`/packages/${pkg.slug}`}
          className="text-amber-400 hover:text-amber-300 transition-colors"
        >
          View Full Game Breakdown &amp; Pick Details →
        </Link>
        <span className="text-slate-400">Instant On-Screen Access</span>
      </div>
    </div>
  );
}
