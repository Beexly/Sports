"use client";

import React, { useEffect, useId, useState } from "react";
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
  /** Lead band: line-to-gain edge and larger scale. */
  featured?: boolean;
  /** "solid" for the one ember action on screen; "line" for the rest. */
  ctaTone?: "solid" | "line";
}

function formatConfidenceStrict(raw: string | number): string {
  const cleaned = String(raw).trim().replace(new RegExp("\\x25", "g"), "");
  return cleaned.endsWith("/100") ? cleaned : `${cleaned}/100`;
}

/** What the catalog says this pack contains — never more. */
function insideList(pkg: PickPackageOffering): string[] {
  return [
    "Spread call",
    "Over/Under call",
    ...(pkg.includesProps ? ["Player props"] : []),
    ...(pkg.includesSgp ? ["Same-game parlay"] : []),
    ...(pkg.includesDfs ? ["DFS lineup core"] : []),
  ];
}

/**
 * PaywallRevealCard — one purchase band.
 *
 * Redline Ledger: identity on the left, price and action on the right, picks
 * revealed in-place below the band after purchase. No nested lock boxes, no
 * repeated game previews; the dossiers section carries the free storylines.
 */
export function PaywallRevealCard({
  pkg,
  teasers,
  initialUnlockedWriteups = null,
  initialSessionId,
  featured = false,
  ctaTone = "solid",
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
  const receiptPanelId = useId();
  const receiptInputId = useId();

  const isUnlocked = Boolean(unlockedWriteups && unlockedWriteups.length > 0);
  const forSale = pkg.forSale !== false;
  const standardPrice =
    pkg.standardPriceCents % 100 === 0
      ? (pkg.standardPriceCents / 100).toFixed(0)
      : (pkg.standardPriceCents / 100).toFixed(2);
  const guaranteedPrice = pkg.guaranteedPriceCents
    ? pkg.guaranteedPriceCents % 100 === 0
      ? (pkg.guaranteedPriceCents / 100).toFixed(0)
      : (pkg.guaranteedPriceCents / 100).toFixed(2)
    : null;
  const activePrice = guaranteed && guaranteedPrice ? guaranteedPrice : standardPrice;
  const inside = insideList(pkg);
  const propReads = pkg.includesProps
    ? teasers.reduce((n, t) => n + t.lockedSummary.propsCount, 0)
    : 0;

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
    // `handleInlineVerify` is declared below and closes over `tokenInput`, so
    // listing it here would re-run this on every keystroke in the receipt box.
    // The intent is "when the card mounts or the session/package changes", and
    // the mount-time silent verify only needs the token captured at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <article
      data-testid={`paywall-reveal-card-${pkg.slug}`}
      data-od-id={`pack-band-${pkg.slug}`}
      className={`bg-obsidian ${featured ? "rl-gain-edge" : "border-t border-mineral"}`}
    >
      <div className={`grid gap-10 py-10 sm:py-12 lg:grid-cols-12 lg:gap-12 ${featured ? "lg:py-16" : ""}`}>
        {/* ── Identity ─────────────────────────────────────────── */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <span className="rl-eyebrow">{pkg.badge || formatWindowSlotLabel(pkg.windowSlot)}</span>
            {isUnlocked && <span className="rl-eyebrow text-plasma">UNLOCKED IN-PLACE</span>}
          </div>

          <h3
            className={`rl-display mt-4 max-w-[18ch] ${
              featured
                ? "text-[length:clamp(2.75rem,6vw,4.75rem)]"
                : "text-[length:clamp(2.25rem,4.4vw,3.25rem)]"
            }`}
          >
            {pkg.title}
          </h3>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-ion-1 sm:text-[17px]">
            {sanitizePlainFootballText(pkg.description)}
          </p>
          <p
            data-testid="whats-inside-checklist"
            className="mt-6 max-w-[60ch] text-[15px] leading-relaxed text-ion-white"
          >
            <span className="rl-eyebrow mr-3">What’s inside</span>
            {inside.join(" · ")}
          </p>
          <Link href={`/packages/${pkg.slug}`} className="rl-link mt-6 inline-block text-sm">
            Full game breakdown &amp; pick details
          </Link>
        </div>

        {/* ── Price + action ───────────────────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-4">
          {isUnlocked ? (
            <p className="text-base leading-relaxed text-ion-1">
              Your picks are open below. Keep your receipt ID to reopen them on another device.
            </p>
          ) : forSale ? (
            <>
              <p className="rl-figure flex items-start gap-1 text-ion-white">
                <span className="mt-[0.4em] text-2xl font-semibold">$</span>
                <span
                  className={`font-semibold leading-none tracking-[-0.02em] ${
                    featured
                      ? "text-[length:clamp(4rem,8vw,6rem)]"
                      : "text-[length:clamp(3.25rem,5vw,4rem)]"
                  }`}
                >
                  {activePrice}
                </span>
              </p>
              <p className="rl-figure mt-3 text-sm leading-relaxed text-ion-1">
                {pkg.gamesCount} {pkg.gamesCount === 1 ? "game" : "games"}
                {propReads > 0 ? ` · ${propReads} player prop reads` : ""} · one-time purchase
              </p>

              {guaranteedPrice && (
                <div role="group" aria-label="Price option" className="mt-6 inline-flex border border-mineral-hi">
                  <button
                    type="button"
                    aria-pressed={!guaranteed}
                    onClick={() => setGuaranteed(false)}
                    className={`rl-figure min-h-[44px] px-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                      !guaranteed ? "bg-ion-white text-obsidian" : "text-ion-1 hover:text-ion-white"
                    }`}
                  >
                    Standard ${standardPrice}
                  </button>
                  <button
                    type="button"
                    aria-pressed={guaranteed}
                    onClick={() => setGuaranteed(true)}
                    className={`rl-figure min-h-[44px] px-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                      guaranteed ? "bg-ion-white text-obsidian" : "text-ion-1 hover:text-ion-white"
                    }`}
                  >
                    Credit-Back ${guaranteedPrice}
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={loadingCheckout}
                aria-busy={loadingCheckout}
                onClick={() => void handleOneClickCheckout(guaranteed)}
                className={`rl-btn rl-figure mt-7 w-full ${ctaTone === "solid" ? "rl-btn-solid" : "rl-btn-line"}`}
              >
                {loadingCheckout ? "Opening secure checkout…" : `Unlock Picks Now — $${activePrice}`}
              </button>

              <button
                type="button"
                aria-expanded={showTokenBox}
                aria-controls={receiptPanelId}
                onClick={() => setShowTokenBox((prev) => !prev)}
                className="mt-4 min-h-[44px] text-sm text-ion-1 underline decoration-ion-2 underline-offset-4 transition-colors hover:text-ion-white hover:decoration-plasma"
              >
                {showTokenBox ? "Hide receipt box" : "Already purchased? Enter Receipt ID"}
              </button>

              {showTokenBox && (
                <div id={receiptPanelId} className="mt-3">
                  <label htmlFor={receiptInputId} className="rl-eyebrow block">
                    Stripe receipt ID
                  </label>
                  <div className="mt-3 flex gap-2">
                    <input
                      id={receiptInputId}
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="cs_live_..."
                      autoComplete="off"
                      className="rl-figure min-h-[52px] min-w-0 flex-1 border border-mineral-hi bg-eclipse px-4 text-base text-ion-white placeholder:text-ion-2 focus:border-ion-white focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={loadingUnlock}
                      onClick={() => void handleInlineVerify()}
                      className="rl-btn rl-btn-line px-5"
                    >
                      {loadingUnlock ? "Checking…" : "Unlock"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="rl-eyebrow">Final · not for sale</p>
          )}

          {errorMsg && (
            <p role="alert" className="mt-3 text-sm font-semibold text-plasma">
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      {/* ── UNLOCKED IN-PLACE REVEAL ───────────────────────────── */}
      {isUnlocked && (
        <div className="border-t border-mineral pb-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-6">
            <span className="rl-eyebrow text-ion-white">Live Picks Revealed In-Place</span>
            <span className="rl-eyebrow">Confidence score out of 100</span>
          </div>

          <ol>
            {unlockedWriteups?.map((w) => {
              const sideIsPass = String(w.sideTotalCall.sideDecision) === "PASS";
              const totalIsPass = String(w.sideTotalCall.totalDecision) === "PASS";
              return (
                <li key={w.id} className="grid gap-6 border-t border-mineral py-8 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-4">
                    <h4 className="rl-display text-3xl">{w.matchup}</h4>
                    <p className="rl-eyebrow rl-figure mt-3">{formatWindowSlotLabel(w.windowSlot, w.matchup)}</p>
                  </div>

                  <div className="lg:col-span-8">
                    <dl className="grid gap-6 sm:grid-cols-2">
                      <div className="border-t border-mineral pt-4">
                        <dt className="rl-eyebrow">Best spread bet</dt>
                        <dd className="mt-2 text-xl font-semibold leading-snug text-ion-white">
                          {sideIsPass ? (
                            <span className="text-ion-2">PASS — NO BET</span>
                          ) : (
                            <>
                              <span className="mr-2 text-xs uppercase tracking-[0.12em] text-ion-1">BET THIS:</span>
                              {w.sideTotalCall.sideSelection}
                            </>
                          )}
                        </dd>
                        <dd className="rl-figure mt-1 text-sm text-ion-1">
                          Confidence: {formatConfidenceStrict(w.sideTotalCall.sideConfidence)}
                        </dd>
                      </div>
                      <div className="border-t border-mineral pt-4">
                        <dt className="rl-eyebrow">Best total bet</dt>
                        <dd className="mt-2 text-xl font-semibold leading-snug text-ion-white">
                          {totalIsPass ? (
                            <span className="text-ion-2">PASS — NO BET</span>
                          ) : (
                            <>
                              <span className="mr-2 text-xs uppercase tracking-[0.12em] text-ion-1">BET THIS:</span>
                              {w.sideTotalCall.totalSelection}
                            </>
                          )}
                        </dd>
                        <dd className="rl-figure mt-1 text-sm text-ion-1">
                          Confidence: {formatConfidenceStrict(w.sideTotalCall.totalConfidence)}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-ion-1">
                      <span className="rl-eyebrow mr-3">Why bet this</span>
                      {sanitizePlainFootballText(w.sideTotalCall.rationale)}
                    </p>

                    {w.topProps.length > 0 && (
                      <div className="mt-6">
                        <p className="rl-eyebrow">Best player props</p>
                        <ul className="mt-2">
                          {w.topProps.map((p, idx) => {
                            const propIsPass = String(p.decision) === "PASS";
                            return (
                              <li
                                key={`${p.playerId}-${p.propType}-${idx}`}
                                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-mineral py-3 text-[15px]"
                              >
                                <span className={propIsPass ? "text-ion-2" : "font-semibold text-ion-white"}>
                                  {propIsPass
                                    ? `${p.playerName} — PASS — NO BET (${p.propType})`
                                    : `BET THIS: ${p.playerName} — ${p.side} ${p.line} ${p.propType}`}
                                </span>
                                <span className="rl-figure text-sm text-ion-1">
                                  Confidence: {formatConfidenceStrict(p.confidence)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {w.correlatedSgpTicket && (
                      <div className="mt-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="rl-eyebrow">{sanitizePlainFootballText(w.correlatedSgpTicket.title)}</p>
                          <p className="rl-figure text-sm text-ion-1">
                            Book odds {w.correlatedSgpTicket.marketOdds} · fair odds {w.correlatedSgpTicket.fairOdds}
                          </p>
                        </div>
                        <ol className="mt-2">
                          {w.correlatedSgpTicket.legs.map((leg, idx) => (
                            <li
                              key={idx}
                              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-mineral py-3 text-[15px] text-ion-white"
                            >
                              <span>{sanitizePlainFootballText(leg.description)}</span>
                              <span className="rl-figure text-sm text-ion-1">
                                Confidence: {formatConfidenceStrict(leg.confidence)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </article>
  );
}
