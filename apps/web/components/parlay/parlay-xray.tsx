"use client";

/**
 * Parlay X-Ray — the public free ticket scanner.
 *
 * Doctrine: 1 free X-Ray for every anonymous visitor → email capture unlocks
 * 3 more → CTA to /packages. All math happens server-side (the engine's
 * fitted same-game dependence model); this component only collects inputs,
 * calls the API and renders plain-language results. Type-only imports from
 * lib/parlay keep the engine out of the client bundle.
 *
 * Copy fence: plain football language only. Chances render as integer XX/100
 * (never a % sign); the hidden hold is described as plain-language extra
 * margin. No win-rate claims, no guarantees.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { XrayResult, XrayRole } from "@/lib/parlay/xray";
import type { XrayQuotaSummary } from "@/lib/parlay/quota";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

interface LegRow {
  id: number;
  label: string;
  odds: string;
  role: XrayRole;
}

const ROLE_OPTIONS: ReadonlyArray<{ value: XrayRole; label: string }> = [
  { value: "QB-WR", label: "Quarterback + his top receiver" },
  { value: "QB-TE", label: "Quarterback + his tight end" },
  { value: "QB-RB", label: "Quarterback + his running back" },
  { value: "OTHER", label: "Other" },
];

const EXAMPLE_LEGS: ReadonlyArray<Omit<LegRow, "id">> = [
  { label: "QB over 275.5 passing yards", odds: "-110", role: "OTHER" },
  { label: "WR1 over 74.5 receiving yards", odds: "-110", role: "QB-WR" },
];
const EXAMPLE_QUOTE = "+170";

/** Restrained synergy accents (brand palette is bone + ember; green/amber are semantic). */
const TONE_COLOR: Record<XrayResult["verdictTone"], string> = {
  help: "#4ADE80",
  fight: "#FFB454",
  hold: "#FF4D2E",
  fair: "#C4BFB6",
};
const REL_COLOR: Record<string, string> = {
  complementary: "#4ADE80",
  cannibalistic: "#FFB454",
  independent: "#C4BFB6",
};

type ExhaustedStage = null | "email" | "upsell";

type XrayApiResponse =
  | { ok: true; result: XrayResult; quota: XrayQuotaSummary }
  | { ok: false; quota: "exhausted"; freeUsed: number; remaining: number; upsell: boolean }
  | { ok: false; error: string };

let nextLegId = 100;

export function ParlayXRay() {
  const [legs, setLegs] = useState<LegRow[]>([
    { id: 1, label: "", odds: "", role: "OTHER" },
    { id: 2, label: "", odds: "", role: "OTHER" },
  ]);
  const [bookQuote, setBookQuote] = useState("");
  const [result, setResult] = useState<XrayResult | null>(null);
  const [stale, setStale] = useState(false);
  const [quota, setQuota] = useState<XrayQuotaSummary | null>(null);
  const [exhausted, setExhausted] = useState<ExhaustedStage>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exampleActive, setExampleActive] = useState(false);

  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDone, setEmailDone] = useState(false);

  // Read the browser's remaining quota on mount (signed httpOnly cookie).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/parlay-mri/xray", { method: "GET" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok?: boolean; quota?: XrayQuotaSummary } | null) => {
        if (cancelled || !data?.ok || !data.quota) return;
        setQuota(data.quota);
        if (data.quota.exhausted) setExhausted(data.quota.upsell ? "upsell" : "email");
      })
      .catch(() => {
        /* quota stays at the doctrine default: 1 free X-Ray */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const touchInputs = useCallback(() => {
    setError(null);
    setExampleActive(false);
    if (result) setStale(true);
  }, [result]);

  const updateLeg = useCallback(
    (id: number, patch: Partial<Omit<LegRow, "id">>) => {
      setLegs((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
      touchInputs();
    },
    [touchInputs],
  );

  const addLeg = useCallback(() => {
    const id = (nextLegId += 1);
    setLegs((rows) =>
      rows.length >= 3 ? rows : [...rows, { id, label: "", odds: "", role: "OTHER" }],
    );
    touchInputs();
  }, [touchInputs]);

  const removeLeg = useCallback(
    (id: number) => {
      setLegs((rows) => (rows.length <= 2 ? rows : rows.filter((row) => row.id !== id)));
      touchInputs();
    },
    [touchInputs],
  );

  const loadExample = useCallback(() => {
    setLegs(EXAMPLE_LEGS.map((leg, i) => ({ ...leg, id: i + 1 })));
    setBookQuote(EXAMPLE_QUOTE);
    setExampleActive(true);
    setStale(false);
    setError(null);
  }, []);

  const runXray = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parlay-mri/xray", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          legs: legs.map((leg) => ({ label: leg.label, americanOdds: leg.odds, role: leg.role })),
          bookQuote,
        }),
      });
      const data = (await res.json()) as XrayApiResponse;
      if (data.ok) {
        setResult(data.result);
        setStale(false);
        setQuota(data.quota);
        setExhausted(data.quota.exhausted ? (data.quota.upsell ? "upsell" : "email") : null);
      } else if ("quota" in data && data.quota === "exhausted") {
        setExhausted(data.upsell ? "upsell" : "email");
        setQuota((q) =>
          q ? { ...q, remaining: 0, exhausted: true, upsell: data.upsell } : q,
        );
      } else {
        setError("error" in data ? data.error : "Something went wrong. Try again.");
      }
    } catch {
      setError("Could not reach the X-Ray. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [legs, bookQuote]);

  const submitEmail = useCallback(async () => {
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/parlay-mri/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as
        | { ok: true; quota: XrayQuotaSummary }
        | { ok: false; error: string };
      if (data.ok) {
        setQuota(data.quota);
        setExhausted(data.quota.exhausted ? (data.quota.upsell ? "upsell" : "email") : null);
        setEmailDone(true);
      } else {
        setEmailError(data.error);
      }
    } catch {
      setEmailError("Could not reach the unlock. Try again.");
    } finally {
      setEmailBusy(false);
    }
  }, [email]);

  const remainingLabel =
    quota === null
      ? "1 free X-Ray"
      : quota.remaining > 0
        ? `${quota.remaining} X-Ray${quota.remaining === 1 ? "" : "s"} left${quota.unlocked ? "" : " free"}`
        : "No X-Rays left";

  const runDisabled = busy || exhausted !== null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow inline-flex items-center gap-2">
          <span className="live-dot" />
          Free ticket X-Ray
        </p>
        <span
          aria-live="polite"
          className={`rounded-full border border-mineral px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${
            exhausted ? "text-caution" : "text-orbital-cyan"
          }`}
        >
          {remainingLabel}
        </span>
      </div>

      {/* Leg inputs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2">
            Your legs · same game
          </p>
          {exampleActive && (
            <span className="rounded-full border border-mineral bg-carbon px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ion-2">
              Example ticket · illustrative odds
            </span>
          )}
        </div>

        {legs.map((leg, i) => (
          <div
            key={leg.id}
            className="grid grid-cols-1 gap-2 rounded-xl border border-mineral bg-carbon/60 p-3 sm:grid-cols-[1fr_7rem_1fr_auto]"
          >
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ion-3">
                Leg {i + 1}
              </span>
              <input
                type="text"
                value={leg.label}
                maxLength={120}
                onChange={(e) => updateLeg(leg.id, { label: e.target.value })}
                placeholder="e.g. QB over 275.5 passing yards"
                className="rounded-lg border border-mineral bg-eclipse px-3 py-2 text-sm text-ion-white placeholder:text-ion-3 focus:border-mineral-hi focus:outline-none"
                aria-label={`Leg ${i + 1} description`}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ion-3">
                Odds
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={leg.odds}
                onChange={(e) => updateLeg(leg.id, { odds: e.target.value })}
                placeholder="-110"
                className={`rounded-lg border border-mineral bg-eclipse px-3 py-2 text-sm text-ion-white placeholder:text-ion-3 focus:border-mineral-hi focus:outline-none ${NUMERIC_TEXT_CLASS}`}
                aria-label={`Leg ${i + 1} American odds`}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ion-3">
                How this leg relates to the QB
              </span>
              <select
                value={leg.role}
                onChange={(e) => updateLeg(leg.id, { role: e.target.value as XrayRole })}
                className="rounded-lg border border-mineral bg-eclipse px-3 py-2 text-sm text-ion-white focus:border-mineral-hi focus:outline-none"
                aria-label={`Leg ${i + 1} pairing`}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeLeg(leg.id)}
                disabled={legs.length <= 2}
                className="rounded-lg border border-mineral px-3 py-2 font-mono text-[11px] text-ion-2 transition-colors hover:border-alert hover:text-alert disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Remove leg ${i + 1}`}
                title={legs.length <= 2 ? "A ticket needs at least 2 legs" : "Remove this leg"}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <p className="text-xs leading-relaxed text-ion-3">
          The quarterback leg picks &ldquo;Other&rdquo;; each skill leg picks its relationship to him.
          2 or 3 legs, American odds like -110 or +150.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addLeg}
            disabled={legs.length >= 3}
            className="btn btn-ghost text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add a leg
          </button>
          <button type="button" onClick={loadExample} className="btn btn-ghost text-xs">
            Load example ticket
          </button>
        </div>
      </div>

      {/* Book quote */}
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2">
          The book&apos;s same-game parlay price
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={bookQuote}
          onChange={(e) => {
            setBookQuote(e.target.value);
            touchInputs();
          }}
          placeholder="+170"
          className={`max-w-xs rounded-lg border border-mineral bg-eclipse px-3 py-2 text-sm text-ion-white placeholder:text-ion-3 focus:border-mineral-hi focus:outline-none ${NUMERIC_TEXT_CLASS}`}
          aria-label="Book same-game parlay American odds"
        />
      </label>

      {/* Run */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runXray}
          disabled={runDisabled}
          aria-busy={busy}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Scanning…" : "Run X-Ray"}
        </button>
        {exhausted === null && stale && result && (
          <span className="text-xs text-ion-2">Inputs changed. Run the X-Ray again to refresh.</span>
        )}
        {exhausted !== null && (
          <span className="text-xs text-caution">
            {exhausted === "email"
              ? "Your free scan is used. Unlock 3 more below."
              : "All 4 X-Rays are used. See Pro below."}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-alert/40 bg-alert/10 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {/* Result */}
      <div aria-live="polite">
        {result && (
          <div
            className={`flex flex-col gap-5 rounded-2xl border border-mineral bg-eclipse/70 p-5 transition-opacity sm:p-6 ${
              stale ? "opacity-60" : ""
            }`}
          >
            <p
              className="font-display text-xl leading-snug sm:text-2xl"
              style={{ color: TONE_COLOR[result.verdictTone] }}
            >
              {result.verdict}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-mineral bg-carbon/70 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-3">
                  Ticket&apos;s real chance
                </p>
                <p className={`mt-1 font-display text-4xl text-ion-white ${NUMERIC_TEXT_CLASS}`}>
                  {result.modelChanceDisplay}
                </p>
                <p className="mt-1 text-xs text-ion-3">
                  Legs moving together, the way they do in a real game.
                </p>
              </div>
              <div className="rounded-xl border border-mineral bg-carbon/70 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-3">
                  The price implies
                </p>
                <p className={`mt-1 font-display text-4xl text-ion-white ${NUMERIC_TEXT_CLASS}`}>
                  {result.bookChanceDisplay}
                </p>
                <p className="mt-1 text-xs text-ion-3">
                  What the book&apos;s {result.bookPriceDisplay} quote says the chance is.
                </p>
              </div>
            </div>

            <p className="text-sm text-ion-1">
              A fair price for this ticket would be around{" "}
              <span className={`font-semibold text-ion-white ${NUMERIC_TEXT_CLASS}`}>
                {result.fairPriceDisplay}
              </span>
              .
            </p>

            {/* Hidden hold */}
            <div className="rounded-xl border border-mineral bg-carbon/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-orbital-cyan">
                The hidden hold
              </p>
              <p className="mt-2 text-base font-semibold text-ion-white">
                {result.hiddenHoldDisplay}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ion-1">
                {result.hiddenHoldExplanation}
              </p>
            </div>

            {/* Per-pair synergy */}
            <div className="flex flex-col gap-3">
              {result.pairs.map((pair) => (
                <div
                  key={`${pair.legAIndex}-${pair.legBIndex}`}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: `${REL_COLOR[pair.relationship]}40`,
                    background: `color-mix(in srgb, ${REL_COLOR[pair.relationship]} 6%, transparent)`,
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: REL_COLOR[pair.relationship] }}
                    >
                      {pair.headline}
                    </p>
                    <p className={`font-mono text-[10px] uppercase tracking-[0.1em] text-ion-3 ${NUMERIC_TEXT_CLASS}`}>
                      Together {pair.pairChanceDisplay} · separate coin flips {pair.naiveChanceDisplay}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-ion-2">
                    {pair.legALabel} + {pair.legBLabel}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ion-1">{pair.detail}</p>
                </div>
              ))}
            </div>

            <p className="text-xs leading-relaxed text-ion-3">
              Estimates from the odds you entered, not a recommendation. The smartest move is
              often the one you don&apos;t make.{" "}
              <Link href="/responsible-play" className="underline hover:text-ion-1">
                Play responsibly
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      {/* Email capture — after the free X-Ray */}
      {exhausted === "email" && !emailDone && (
        <div className="rounded-2xl border border-mineral bg-eclipse/70 p-5 sm:p-6">
          <p className="font-display text-xl text-ion-white">That was your free X-Ray.</p>
          <p className="mt-2 text-sm leading-relaxed text-ion-1">
            Drop your email to unlock 3 more scans, enough to check the rest of Sunday&apos;s
            slip.
          </p>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void submitEmail();
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              placeholder="you@example.com"
              aria-label="Email address"
              className="flex-1 rounded-lg border border-mineral bg-carbon px-3 py-2 text-sm text-ion-white placeholder:text-ion-3 focus:border-mineral-hi focus:outline-none"
            />
            <button
              type="submit"
              disabled={emailBusy || email.trim().length === 0}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {emailBusy ? "Unlocking…" : "Unlock 3 more X-Rays"}
            </button>
          </form>
          {emailError && (
            <p role="alert" className="mt-2 text-sm text-alert">
              {emailError}
            </p>
          )}
          <p className="mt-3 text-xs text-ion-3">
            Submitting your email also joins the GSE waitlist. No spam. Unsubscribe anytime.
          </p>
        </div>
      )}

      {emailDone && exhausted === null && (
        <p className="rounded-lg border border-mineral bg-carbon/70 px-3 py-2 text-sm text-orbital-cyan">
          3 more X-Rays unlocked. Run the next ticket above.
        </p>
      )}

      {/* Upsell — after the email grant is spent */}
      {exhausted === "upsell" && (
        <div className="rounded-2xl border border-mineral bg-eclipse/70 p-5 text-center sm:p-6">
          <p className="font-display text-xl text-ion-white">You&apos;ve used all 4 X-Rays.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ion-1">
            Pro opens the full Parlay MRI: the complete genome of any ticket, with legs you can
            toggle live. Keep scanning before you stake.
          </p>
          <Link href="/packages" className="btn btn-primary mt-4">
            See packages
          </Link>
        </div>
      )}
    </div>
  );
}