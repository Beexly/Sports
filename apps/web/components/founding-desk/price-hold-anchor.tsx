import { CountUp } from "@/components/ui/count-up";
import { FoundingDeskCta } from "@/components/founding-desk/founding-desk-cta";
import { FOUNDING_DESK_OFFER } from "@/lib/pricing/pricing-phases";

/**
 * PriceHoldAnchor — the above-the-fold founding-price conversion anchor.
 *
 * The previous /founding-desk had no price above the fold and buried the offer
 * in body text. This is the focal commercial element: the founding price as a
 * real visual anchor (animated CountUp, SSR-honest), framed as "held for life —
 * the rate rises for everyone who joins later," sitting beside the live CTA.
 * The CTA preserves its honest 503/inert state.
 *
 * Numbers come straight from FOUNDING_DESK_OFFER — never fabricated.
 */
export function PriceHoldAnchor(): JSX.Element {
  return (
    <div className="mt-9 surface-card gw-card-hover overflow-hidden p-6 sm:p-7">
      <div
        aria-hidden="true"
        className="mb-5 h-0.5 w-full rounded-full"
        style={{ background: "linear-gradient(90deg, rgba(0,229,255,0.85), rgba(122,92,255,0.5) 60%, transparent)" }}
      />
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
        {/* The number — the anchor itself. */}
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-orbital-cyan">
            Founding rate · held for life
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-display-lg font-semibold leading-none text-white">
              <CountUp prefix="$" value={FOUNDING_DESK_OFFER.beta14day} />
            </span>
            <span className="mb-1 text-sm leading-snug text-ink-300">
              for the {FOUNDING_DESK_OFFER.tagline}
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-ink-300">
            This is the floor — the lowest the Desk will ever carry. Yours is held for
            the life of your membership. As the published record grows, the rate rises
            for everyone who joins later. It never rises for you.
          </p>
        </div>

        {/* The action — live CTA (honest inert/503 state preserved) + sample link. */}
        <div className="flex shrink-0 flex-col gap-3 lg:items-end">
          <FoundingDeskCta
            displayPrice={FOUNDING_DESK_OFFER.beta14day}
            offerLabel={FOUNDING_DESK_OFFER.tagline}
          />
        </div>
      </div>
    </div>
  );
}
