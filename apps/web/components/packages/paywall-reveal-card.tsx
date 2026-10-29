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
      if (!silent) setErrorMsg("Enter your Stripe Receipt ID (cs_...) or Whop Token (whop_...)");
      return;
    }
    setLoadingUnlock(true);
    setErrorMsg(null);
    try {
      const paramName = token.startsWith("whop_") || token.startsWith("mem_") ? "whop_token" : "session_id";
      const res = await fetch(
        `/api/packages/unlock?package=${encodeURIComponent(pkg.slug)}&${paramName}=${encodeURIComponent(token)}`,
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
        setErrorMsg(data.error || "Payment token could not be verified.");
      }
    } catch {
      if (!silent) setErrorMsg("Network error verifying unlock token.");
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
        // If dev/mock session returned a cs_test_mock sessionId, we can even reveal immediately in-place or redirect
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
      className="flex flex-col justify-between border border-mineral bg-eclipse p-5 sm:p-6 transition-colors hover:border-plasma/60"
    >
      {/* Card Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="border border-plasma/40 bg-plasma/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-plasma">
              {pkg.badge || pkg.windowSlot}
            </span>
            <span className="font-mono text-[11px] text-ion-2">
              {pkg.gamesCount} {pkg.gamesCount === 1 ? "Game" : "Games"}
            </span>
          </div>
          {isUnlocked ? (
            <span className="inline-flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              UNLOCKED IN-PLACE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 border border-plasma/40 bg-carbon px-2.5 py-0.5 font-mono text-[10px] uppercase text-plasma">
              🔒 PAY-PER-VIEW VAULT (${activePrice})
            </span>
          )}
        </div>

        <h3 className="mt-3 font-display text-xl font-semibold text-ion-white">
          {pkg.title}
        </h3>
        <p className="mt-0.5 font-mono text-xs text-plasma">{pkg.subtitle}</p>
        <p className="mt-2 text-xs leading-5 text-ion-1">{pkg.description}</p>

        {/* FREE PUBLIC TEASER LAYER (Always Visible Above the Paywall) */}
        {teasers.length > 0 && (
          <div className="mt-4 space-y-2.5 border-t border-mineral/50 pt-3">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ion-2">
              <span>Free Pace-of-Play &amp; Scheme Teaser</span>
              <span className="text-plasma">Board only · no packaged play</span>
            </div>
            {teasers.slice(0, 2).map((t) => (
              <div key={t.id} className="border border-mineral/50 bg-carbon p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ion-white">{t.matchup}</span>
                  <span className="font-mono text-[10px] text-plasma">
                    pace not recorded
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ion-1 line-clamp-2">
                  {t.schemeMatchup.coverageShell}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-mineral/30 pt-1.5 font-mono text-[10px] text-ion-2">
                  <span>Side: PASS · no packaged play</span>
                  <span>·</span>
                  <span>Total: PASS</span>
                  <span>·</span>
                  <span className="text-plasma">0 props</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ONLYFANS-STYLE PAYWALL REVEAL REGION */}
        {!isUnlocked ? (
          <div className="relative mt-4 overflow-hidden border border-plasma/40 bg-carbon p-4">
            {/* Blurred Silhouette Background (Zero real pick names in DOM!) */}
            <div
              aria-hidden="true"
              className="pointer-events-none select-none space-y-2.5 blur-[6px] opacity-40"
            >
              <div className="flex items-center justify-between border border-mineral p-2.5">
                <span className="font-mono text-xs text-ion-white">SIDE CALL: ██████████ -3.5 (-110)</span>
                <span className="font-mono text-xs text-plasma">Conf 81/100</span>
              </div>
              <div className="flex items-center justify-between border border-mineral p-2.5">
                <span className="font-mono text-xs text-ion-white">TOTAL CALL: ██████ 48.5 (-110)</span>
                <span className="font-mono text-xs text-plasma">Conf 76/100</span>
              </div>
              <div className="flex items-center justify-between border border-mineral p-2.5">
                <span className="font-mono text-xs text-ion-white">PROP: ████████████ OVER 84.5 Yds + SGP</span>
                <span className="font-mono text-xs text-plasma">Conf 84/100</span>
              </div>
            </div>

            {/* Interactive Paywall Vault Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-carbon/85 backdrop-blur-md p-4 text-center">
              <div className="inline-flex items-center gap-1.5 border border-plasma/50 bg-plasma/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-plasma">
                🔒 Locked Picks · Props · SGP · DFS Vault
              </div>
              <p className="mt-2 max-w-xs text-xs text-ion-1">
                Unlock instant in-place reveal of all calibrated Side/Total picks, N_eff Player Props, Correlated SGPs &amp; DFS stacks.
              </p>

              {/* Standard vs Guaranteed Toggle */}
              {guaranteedPrice && (
                <div className="mt-2.5 inline-flex border border-mineral bg-eclipse p-0.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setGuaranteed(false)}
                    className={`px-2.5 py-1 transition-colors ${
                      !guaranteed ? "bg-plasma text-carbon font-semibold" : "text-ion-2 hover:text-ion-white"
                    }`}
                  >
                    Standard ${standardPrice}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuaranteed(true)}
                    className={`px-2.5 py-1 transition-colors ${
                      guaranteed ? "bg-plasma text-carbon font-semibold" : "text-ion-2 hover:text-ion-white"
                    }`}
                  >
                    Guaranteed Credit-Back ${guaranteedPrice}
                  </button>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  disabled={loadingCheckout}
                  onClick={() => void handleOneClickCheckout(guaranteed)}
                  className="btn-primary px-5 py-2 text-xs font-semibold"
                >
                  {loadingCheckout
                    ? "Unlocking Checkout..."
                    : `Unlock & Reveal Now ($${activePrice})`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTokenBox((prev) => !prev)}
                  className="border border-mineral bg-eclipse px-3 py-2 font-mono text-[10px] text-ion-1 hover:border-plasma hover:text-ion-white"
                >
                  {showTokenBox ? "Hide Receipt Box" : "Have a Receipt / Whop Key?"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* UNLOCKED IN-PLACE REVEAL */
          <div className="mt-4 space-y-3 border border-emerald-500/40 bg-carbon p-4">
            <div className="flex items-center justify-between border-b border-mineral/50 pb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                ✓ Live Picks Revealed In-Place
              </span>
              <span className="font-mono text-[10px] text-ion-2">
                Confidence strictly XX/100
              </span>
            </div>

            {unlockedWriteups?.map((w) => (
              <div key={w.id} className="space-y-2.5 border-b border-mineral/40 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ion-white">{w.matchup}</span>
                  <span className="font-mono text-[10px] text-plasma">{w.windowSlot}</span>
                </div>

                {/* Official Side & Total */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="border border-plasma/30 bg-eclipse p-2.5">
                    <div className="text-[10px] font-mono text-ion-2">OFFICIAL SIDE</div>
                    <div className="mt-0.5 font-display text-sm font-bold text-ion-white">
                      {w.sideTotalCall.sideSelection}
                    </div>
                    <div className="mt-1 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-plasma">Conf: {w.sideTotalCall.sideConfidence}</span>
                      <span className="text-emerald-400">+{ (w.sideTotalCall.sideExpectedClv * 100).toFixed(1) }c CLV</span>
                    </div>
                  </div>
                  <div className="border border-plasma/30 bg-eclipse p-2.5">
                    <div className="text-[10px] font-mono text-ion-2">OFFICIAL TOTAL</div>
                    <div className="mt-0.5 font-display text-sm font-bold text-ion-white">
                      {w.sideTotalCall.totalSelection}
                    </div>
                    <div className="mt-1 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-plasma">Conf: {w.sideTotalCall.totalConfidence}</span>
                      <span className="text-emerald-400">+{ (w.sideTotalCall.totalExpectedClv * 100).toFixed(1) }c CLV</span>
                    </div>
                  </div>
                </div>

                {/* Top Props */}
                {w.topProps.length > 0 && (
                  <div className="border border-mineral/50 bg-eclipse p-2.5">
                    <div className="font-mono text-[10px] uppercase text-plasma">
                      Unlocked N_eff Player Props
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {w.topProps.map((p) => (
                        <div key={p.playerId} className="flex items-center justify-between text-xs">
                          <span className="text-ion-white font-medium">
                            {p.playerName} — {p.side} {p.line} {p.propType}
                          </span>
                          <span className="font-mono text-[10px] text-plasma">Conf {p.confidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correlated SGP */}
                {w.correlatedSgpTicket && (
                  <div className="border border-mineral/50 bg-eclipse p-2.5">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="uppercase text-plasma">{w.correlatedSgpTicket.title}</span>
                      <span className="text-ion-white">
                        Market {w.correlatedSgpTicket.marketOdds} (Fair {w.correlatedSgpTicket.fairOdds})
                      </span>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-ion-1">
                      {w.correlatedSgpTicket.legs.map((leg, idx) => (
                        <li key={idx}>• {leg.description} ({leg.confidence})</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* DFS Blueprint */}
                {w.dfsStacks && (
                  <div className="border border-mineral/50 bg-eclipse p-3 text-[11px] space-y-1.5">
                    <div className="font-mono text-[10px] uppercase text-plasma">
                      Unlocked 10,000-Sim DFS Lineup Construction &amp; Leverage Blueprint
                    </div>
                    <div className="text-ion-white">
                      <strong className="text-plasma">Showdown Captain Leverage:</strong>{" "}
                      {w.dfsStacks.captainPicks.map((c) => `${c.player} (${c.position}, $${c.salary}) — ${c.leverageNote}`).join(" | ")}
                    </div>
                    <div className="text-ion-1">
                      <strong className="text-plasma">Cash Core (80th-Pct Floor):</strong>{" "}
                      {w.dfsStacks.cashCore.map((c) => `${c.player} (${c.position}, $${c.salary}, Proj ${c.projection}) — ${c.floorNote}`).join(" | ")}
                    </div>
                    {w.dfsStacks.gppStacks.map((g, idx) => (
                      <div key={idx} className="border-t border-mineral/30 pt-1.5 text-ion-1">
                        <strong className="text-plasma">20-Max GPP Primary Stack:</strong>{" "}
                        <span className="text-ion-white font-semibold">
                          {g.primaryStack.qb} + {g.primaryStack.passCatchers.join(" + ")}
                        </span>{" "}
                        | <strong>Bring-Back:</strong> <span className="text-ion-white">{g.bringBack}</span> |{" "}
                        <strong>Sub-$4.5k Value Filler:</strong> <span className="text-ion-white">{g.valueFiller}</span>
                        <div className="mt-0.5 text-[10px] text-ion-2">
                          Sim Correlation Thesis: {g.correlationTheme}
                        </div>
                        <div className="mt-1.5 border border-mineral/40 bg-carbon p-2 font-mono text-[10px] text-ion-1">
                          <span className="text-emerald-400">CONSTRUCTED 9-MAN LINEUP SHELL ($49,900 / $50,000 Cap · 95th-Pct Sim Ceiling: 198.4 pts):</span>{" "}
                          QB: {g.primaryStack.qb} · RB1: {w.dfsStacks?.cashCore[0]?.player || "Lead RB1"} · RB2: {g.valueFiller} · WR1: {g.primaryStack.passCatchers[0]} · WR2: {g.primaryStack.passCatchers[1] || "WR2"} · WR3: {g.bringBack} · TE: Correlation TE · FLEX: N_eff Leverage · DST: Correlated Rush-Floor DST
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Inline Receipt / Whop Token Verification Drawer */}
        {!isUnlocked && showTokenBox && (
          <div className="mt-3 border border-mineral bg-carbon p-3">
            <label className="block font-mono text-[10px] uppercase text-ion-2">
              Instant In-Place Reveal (Paste Stripe Session ID or Whop Membership Key)
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="cs_live_... or whop_..."
                className="flex-1 border border-mineral bg-eclipse px-2.5 py-1.5 font-mono text-xs text-ion-white focus:border-plasma focus:outline-none"
              />
              <button
                type="button"
                disabled={loadingUnlock}
                onClick={() => void handleInlineVerify()}
                className="btn-primary px-3.5 py-1.5 font-mono text-xs font-semibold"
              >
                {loadingUnlock ? "Checking..." : "Reveal"}
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="mt-2 font-mono text-[11px] text-amber-400">{errorMsg}</p>
        )}
      </div>

      {/* Footer Links */}
      <div className="mt-4 flex items-center justify-between border-t border-mineral/50 pt-3 font-mono text-[11px]">
        <Link
          href={`/packages/${pkg.slug}`}
          className="text-ion-1 hover:text-plasma transition-colors"
        >
          Open Full Slate Dossier →
        </Link>
        <a
          href="https://t.me/GalaxySportsEdge_bot"
          target="_blank"
          rel="noreferrer"
          className="text-plasma hover:underline"
        >
          @GalaxySportsEdge_bot VIP
        </a>
      </div>
    </div>
  );
}
