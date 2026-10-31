"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { PickPackageOffering } from "@/lib/packages/catalog";
import {
  formatWindowSlotLabel,
  sanitizePlainFootballText,
  type CoachGameWriteup,
} from "@/lib/writeups/coach-writeup-engine";

export { sanitizePlainFootballText };

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
  const cleaned = String(raw).trim().replace(new RegExp("\\x25", "g"), "");
  return cleaned.endsWith("/100") ? cleaned : `${cleaned}/100`;
}

/**
 * PaywallRevealCard — the interactive pay-per-slate unit.
 *
 * Redline Ledger: bone ink on panel (#12141A), one ember accent, hairline
 * rules. No rounding, no shadow, no second hue — the ledger row reads as a
 * filed entry that happens to be purchasable in place.
 */
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

  // Check if user returned from Stripe Checkout with ?session_id=cs_... or already unlocked in localStorage
  useEffect(() => {
    if (isUnlocked) return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlSessionId = searchParams.get("session_id") || searchParams.get("whop_token");
      const urlPackage = searchParams.get("package");
      const matchesThisCard =
        !urlPackage || urlPackage === pkg.slug || urlPackage === "week8-all-access";

      const candidateToken =
        initialSessionId ||
        (urlSessionId && matchesThisCard ? urlSessionId : null) ||
        window.localStorage.getItem(`gse_unlock_${pkg.slug}`) ||
        window.localStorage.getItem("gse_unlock_global");

      if (candidateToken) {
        void handleInlineVerify(candidateToken, true);
      }
    } catch {
      // ignore storage errors
    }
  }, [pkg.slug, isUnlocked, initialSessionId]);

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
      const returnToStorefront =
        typeof window !== "undefined" && window.location.pathname === "/packages";
      const res = await fetch("/api/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSlug: pkg.slug,
          guaranteed: useGuaranteed,
          returnToStorefront,
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

  const eyebrow = "font-numerals text-[11px] uppercase tracking-[0.2em] text-ion-1";

  return (
    <div
      data-testid={`paywall-reveal-card-${pkg.slug}`}
      className="flex flex-col justify-between border border-mineral bg-eclipse/60"
    >
      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <span className={eyebrow}>{pkg.badge || pkg.windowSlot}</span>
          {isUnlocked ? (
            <span className="font-numerals text-[11px] uppercase tracking-[0.2em] text-plasma">
              UNLOCKED IN-PLACE
            </span>
          ) : (
            <span className="font-numerals text-3xl font-semibold tabular-nums text-ion-white">
              ${activePrice}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-2xl text-ion-white sm:text-[28px]">
          {pkg.title}
        </h3>
        <p className="mt-2 font-numerals text-[11px] uppercase tracking-[0.2em] tabular-nums text-ion-2">
          {pkg.gamesCount} {pkg.gamesCount === 1 ? "game" : "games"} · Side, Total, Player Props &amp; Same-Game Parlay
        </p>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ion-1">
          {sanitizePlainFootballText(pkg.description)}
        </p>

        {/* ── Free preview — storyline only, zero leaked picks ───── */}
        {teasers.length > 0 && (
          <div className="mt-6 border-t border-mineral pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className={eyebrow}>Matchup Storyline &amp; Film Preview (Free)</span>
              <span className="font-numerals text-[11px] uppercase tracking-[0.2em] text-ion-2">
                Plain-English Matchup Breakdown
              </span>
            </div>

            <div className="mt-4 space-y-6">
              {teasers.slice(0, 2).map((t) => (
                <div key={t.id} className="border-l-2 border-plasma pl-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-display text-lg text-ion-white">{t.matchup}</span>
                    <span className="font-numerals text-[11px] uppercase tracking-[0.2em] tabular-nums text-ion-2">
                      {formatWindowSlotLabel(t.windowSlot, t.matchup)}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-base leading-7 text-ion-1">
                    {sanitizePlainFootballText(t.schemeMatchup.coverageShell || t.schemeMatchup.notes)}
                  </p>
                  {t.paceOfPlay?.notes && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-2">
                      {sanitizePlainFootballText(t.paceOfPlay.notes)}
                    </p>
                  )}
                  <p className="mt-3 font-numerals text-[11px] uppercase tracking-[0.18em] tabular-nums text-ion-2">
                    Locked inside this pack: Official Spread Call · Official Over/Under Call · {t.lockedSummary.propsCount} Player Prop Bets · 3-Leg Same-Game Parlay
                  </p>

                  {/* Blurred locked preview row */}
                  {!isUnlocked && (
                    <div className="relative mt-4 overflow-hidden border border-mineral bg-obsidian p-4">
                      <div
                        aria-hidden="true"
                        className="select-none blur-[5px] pointer-events-none opacity-60 text-sm text-ion-1"
                      >
                        <div className="font-semibold text-ion-white">
                          Official Spread Verdict · Official Over/Under Verdict
                        </div>
                        <div className="mt-1 font-numerals text-[11px] uppercase tracking-[0.18em] tabular-nums text-ion-2">
                          Player Yardage Props ({t.lockedSummary.propsCount} Official Reads) · 3-Leg Same-Game Parlay
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <span className="border border-mineral bg-eclipse px-3 py-1.5 text-xs font-semibold text-ion-1">
                          🔒 Locked Until Purchase — Instant Reveal on This Page
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Paywall callout, or the unlocked picks ─────────────── */}
        {!isUnlocked ? (
          <div className="mt-6 border border-mineral bg-obsidian p-5 sm:p-6">
            <h4 className="font-display text-xl text-ion-white">
              Unlock official picks &amp; exact bet numbers
            </h4>
            <p className="mt-2 max-w-2xl text-base leading-7 text-ion-1">
              Click below for instant access to our official Side bet, Total bet, best Player Props, and Same-Game Parlay right on this screen.
            </p>

            <div
              data-testid="whats-inside-checklist"
              className="mt-4 border-l-2 border-plasma pl-4 text-xs font-semibold tracking-[0.02em] text-ion-1"
            >
              What’s Inside: Spread Call · Over/Under Call · Player Props · Same-Game Parlay
              {pkg.includesDfs ? " · DFS Lineup Core" : ""}
            </div>

            {guaranteedPrice && (
              <div className="mt-4 inline-flex border border-mineral">
                <button
                  type="button"
                  onClick={() => setGuaranteed(false)}
                  className={`px-3 py-1.5 font-numerals text-[11px] uppercase tracking-[0.16em] transition-colors ${
                    !guaranteed ? "bg-plasma text-plasma-ink" : "text-ion-2 hover:text-ion-white"
                  }`}
                >
                  Standard ${standardPrice}
                </button>
                <button
                  type="button"
                  onClick={() => setGuaranteed(true)}
                  className={`px-3 py-1.5 font-numerals text-[11px] uppercase tracking-[0.16em] transition-colors ${
                    guaranteed ? "bg-plasma text-plasma-ink" : "text-ion-2 hover:text-ion-white"
                  }`}
                >
                  Credit-Back ${guaranteedPrice}
                </button>
              </div>
            )}

            <div className="mt-5">
              <button
                type="button"
                disabled={loadingCheckout}
                onClick={() => void handleOneClickCheckout(guaranteed)}
                className="w-full border border-plasma bg-plasma px-6 py-3.5 text-base font-semibold text-plasma-ink transition-colors hover:bg-plasma-glow disabled:opacity-60"
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
                className="font-numerals text-[11px] uppercase tracking-[0.16em] text-ion-2 underline transition-colors hover:text-plasma"
              >
                {showTokenBox ? "Hide Receipt Box" : "Already purchased? Enter Receipt ID"}
              </button>
            </div>
          </div>
        ) : (
          /* ── UNLOCKED IN-PLACE REVEAL ──────────────────────────── */
          <div className="mt-6 border border-mineral bg-obsidian p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-mineral pb-3">
              <span className="font-numerals text-[11px] uppercase tracking-[0.2em] text-plasma">
                Live Picks Revealed In-Place
              </span>
              <span className="font-numerals text-[11px] uppercase tracking-[0.2em] text-ion-2">
                Confidence Score Out of 100
              </span>
            </div>

            {unlockedWriteups?.map((w) => {
              const sideIsPass = String(w.sideTotalCall.sideDecision) === "PASS";
              const totalIsPass = String(w.sideTotalCall.totalDecision) === "PASS";
              return (
                <div
                  key={w.id}
                  className="mt-5 border-t border-mineral pt-5 first:mt-0 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-display text-lg text-ion-white">{w.matchup}</span>
                    <span className="font-numerals text-[11px] uppercase tracking-[0.2em] tabular-nums text-ion-2">
                      {formatWindowSlotLabel(w.windowSlot, w.matchup)}
                    </span>
                  </div>

                  {/* Official Side & Total */}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="border border-mineral bg-eclipse p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
                          Best Spread Bet
                        </span>
                        <span
                          className={`font-numerals text-[11px] uppercase tracking-[0.18em] ${
                            sideIsPass ? "text-ion-2" : "text-plasma"
                          }`}
                        >
                          {sideIsPass ? "PASS — NO BET" : `BET THIS: ${w.sideTotalCall.sideSelection}`}
                        </span>
                      </div>
                      <div className="mt-2 font-display text-lg text-ion-white">
                        {sideIsPass ? "PASS — NO BET" : w.sideTotalCall.sideSelection}
                      </div>
                      <div className="mt-2 font-numerals text-xs tabular-nums text-ion-1">
                        Confidence: {formatConfidenceStrict(w.sideTotalCall.sideConfidence)}
                      </div>
                    </div>

                    <div className="border border-mineral bg-eclipse p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
                          Best Total Bet
                        </span>
                        <span
                          className={`font-numerals text-[11px] uppercase tracking-[0.18em] ${
                            totalIsPass ? "text-ion-2" : "text-plasma"
                          }`}
                        >
                          {totalIsPass ? "PASS — NO BET" : `BET THIS: ${w.sideTotalCall.totalSelection}`}
                        </span>
                      </div>
                      <div className="mt-2 font-display text-lg text-ion-white">
                        {totalIsPass ? "PASS — NO BET" : w.sideTotalCall.totalSelection}
                      </div>
                      <div className="mt-2 font-numerals text-xs tabular-nums text-ion-1">
                        Confidence: {formatConfidenceStrict(w.sideTotalCall.totalConfidence)}
                      </div>
                    </div>
                  </div>

                  {/* Plain-English rationale */}
                  <div className="mt-4 border border-mineral bg-eclipse p-4">
                    <div className="font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
                      Why Bet This
                    </div>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-ion-1">
                      {sanitizePlainFootballText(w.sideTotalCall.rationale)}
                    </p>
                  </div>

                  {/* Best player props */}
                  {w.topProps.length > 0 && (
                    <div className="mt-4 border border-mineral bg-eclipse p-4">
                      <div className="font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
                        Best Player Props
                      </div>
                      <div className="mt-2">
                        {w.topProps.map((p, idx) => {
                          const propIsPass = String(p.decision) === "PASS";
                          return (
                            <div
                              key={`${p.playerId}-${p.propType}-${idx}`}
                              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-mineral py-2 text-sm last:border-b-0 last:pb-0 first:pt-0"
                            >
                              <span className="font-semibold text-ion-white">
                                {propIsPass
                                  ? `${p.playerName} — PASS — NO BET (${p.propType})`
                                  : `BET THIS: ${p.playerName} — ${p.side} ${p.line} ${p.propType}`}
                              </span>
                              <span className="font-numerals text-xs tabular-nums text-ion-1">
                                Confidence: {formatConfidenceStrict(p.confidence)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Correlated same-game parlay */}
                  {w.correlatedSgpTicket && (
                    <div className="mt-4 border border-mineral bg-eclipse p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
                          {sanitizePlainFootballText(w.correlatedSgpTicket.title)}
                        </span>
                        <span className="font-numerals text-xs tabular-nums text-ion-1">
                          Book Odds {w.correlatedSgpTicket.marketOdds} (Fair Odds {w.correlatedSgpTicket.fairOdds})
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-ion-1">
                        {w.correlatedSgpTicket.legs.map((leg, idx) => (
                          <li key={idx}>
                            • {sanitizePlainFootballText(leg.description)} (Confidence: {formatConfidenceStrict(leg.confidence)})
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

        {/* Inline receipt verification drawer */}
        {!isUnlocked && showTokenBox && (
          <div className="mt-4 border border-mineral bg-obsidian p-4">
            <label className="block font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
              Enter Your Stripe Receipt ID for Instant Access
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="cs_live_..."
                className="min-w-0 flex-1 border border-mineral bg-eclipse px-3 py-2 text-sm text-ion-white placeholder:text-ion-2 focus:border-plasma focus:outline-none"
              />
              <button
                type="button"
                disabled={loadingUnlock}
                onClick={() => void handleInlineVerify()}
                className="border border-plasma bg-plasma px-4 py-2 text-sm font-semibold text-plasma-ink transition-colors hover:bg-plasma-glow disabled:opacity-60"
              >
                {loadingUnlock ? "Checking..." : "Unlock"}
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="mt-2 text-xs font-semibold text-caution">{errorMsg}</p>
        )}
      </div>

      {/* ── Footer link ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-mineral px-6 py-4 sm:px-7">
        <Link
          href={`/packages/${pkg.slug}`}
          className="text-sm font-semibold text-plasma transition-colors hover:text-plasma-glow"
        >
          View Full Game Breakdown &amp; Pick Details →
        </Link>
        <span className="font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
          Instant On-Screen Access
        </span>
      </div>
    </div>
  );
}
