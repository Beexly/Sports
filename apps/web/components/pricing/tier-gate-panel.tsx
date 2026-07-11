import Link from "next/link";
import { BRAND_COLORS } from "@/lib/brand";
import { getCurrentPricingPhase } from "@/lib/pricing/pricing-phases";

/**
 * TierGatePanel — the cinematic "members only" seal.
 *
 * Rendered server-side IN PLACE of gated content (never over it — the
 * gated data is not loaded at all for under-tier viewers; this is a real
 * server-side paywall, not a blur). The shimmer rows behind the seal are
 * pure skeletons: shape, not data.
 */

const TIER_HEX: Record<"PRO" | "ELITE", string> = {
  PRO: BRAND_COLORS.ionMagenta,
  ELITE: BRAND_COLORS.softUltraviolet,
};

export function TierGatePanel({
  need,
  surface,
  blurb,
}: {
  need: "PRO" | "ELITE";
  surface: string;
  blurb: string;
}) {
  const phase = getCurrentPricingPhase();
  const price = need === "PRO" ? phase.pro.monthly : phase.elite.monthly;
  const hex = TIER_HEX[need];

  return (
    <section
      aria-label={`${surface}: for ${need} members only`}
      className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border p-10 sm:p-14"
      style={{
        borderColor: `${hex}40`,
        background: `radial-gradient(80% 100% at 50% 0%, ${hex}10, transparent 70%), rgba(8, 9, 12, 0.85)`,
        boxShadow: `0 0 60px ${hex}14`,
      }}
    >
      {/* skeleton shimmer — the shape of what's inside, never the data */}
      <div aria-hidden className="pointer-events-none absolute inset-0 p-10 opacity-[0.16]">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="mb-4 animate-pulse rounded-lg"
            style={{
              height: 22,
              width: `${88 - ((i * 17) % 40)}%`,
              background: `linear-gradient(90deg, ${hex}30, ${BRAND_COLORS.orbitalCyan}18)`,
              animationDelay: `${i * 180}ms`,
            }}
          />
        ))}
      </div>

      {/* sealing ring — slow conic sweep behind the badge */}
      <div
        aria-hidden
        className="gse-cine-anim pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full"
        style={{
          border: `1px dashed ${hex}30`,
          background: `conic-gradient(from 0deg, transparent 0 78%, ${hex}22 88%, transparent 96%)`,
          animation: "gw-rotate 22s linear infinite",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.3em]"
          style={{ borderColor: `${hex}66`, color: hex, boxShadow: `0 0 24px ${hex}33` }}
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
              clipRule="evenodd"
            />
          </svg>
          for {need} members only
        </span>

        <h2 className="mt-6 font-display text-2xl font-semibold text-white sm:text-3xl">{surface}</h2>
        <p className="mt-3 max-w-lg text-balance text-sm leading-relaxed text-ink-300">{blurb}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/pricing"
            className="rounded-full px-7 py-3 text-sm font-semibold transition-transform duration-200 hover:scale-[1.03]"
            style={{
              color: BRAND_COLORS.obsidianBlack,
              background: `linear-gradient(110deg, ${BRAND_COLORS.orbitalCyan}, ${hex})`,
              boxShadow: `0 0 32px ${hex}44`,
            }}
          >
            Unlock with {need === "PRO" ? "Pro" : "Elite"} · ${price}/mo
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Already a member? Sign in
          </Link>
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.24em] text-ion-3">
          founding rate · locked for life · 7-day refund window
        </p>
      </div>
    </section>
  );
}
