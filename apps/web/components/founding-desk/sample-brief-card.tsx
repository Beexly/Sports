import Link from "next/link";
import { BRAND_COLORS } from "@/lib/brand";

/**
 * SampleBriefCard — an inline, clearly-labelled mini-brief teaser.
 *
 * Visitors should SEE the Desk before they consider it, not just read about it.
 * This renders one section of the daily brief (a "No-Bet Watch" / "Market
 * Mirage" excerpt) in the real format, explicitly marked "Sample — illustrative
 * format" so it can never be mistaken for a live signal. The full sample lives
 * at /sample-desk. All content here is illustrative structure, not a wager call.
 */
export function SampleBriefCard(): JSX.Element {
  return (
    <article className="surface-card gw-card-hover relative overflow-hidden p-6 sm:p-7">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)" }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-orbital-cyan">
          No-Bet Watch
        </p>
        <span
          className="rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em]"
          style={{
            color: BRAND_COLORS.ionMagenta,
            border: `1px solid ${BRAND_COLORS.ionMagenta}30`,
            background: `${BRAND_COLORS.ionMagenta}0d`,
          }}
        >
          Sample — illustrative format
        </span>
      </div>

      <h3 className="mt-3 font-display text-xl text-white">
        The game everyone wants action on.
      </h3>

      <p className="mt-3 text-sm leading-relaxed text-ink-300">
        Tonight&apos;s prime slate has a 3-point favorite drawing roughly three of every
        four tickets — and a line that has not moved an inch. When ticket volume runs one
        way and the number stays put, the books are telling you they are comfortable
        holding the other side. The narrative reads like edge; the price says it is already
        spent.
      </p>

      <div
        className="mt-5 rounded-xl px-4 py-3"
        style={{
          border: `1px solid ${BRAND_COLORS.softUltraviolet}26`,
          background: `${BRAND_COLORS.softUltraviolet}0d`,
        }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
          Desk read
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white">
          No-Bet. The remaining signal after you strip out the public story does not clear
          the bar. Declining the action is the position — logged with its reasons, like any
          other call.
        </p>
      </div>

      <p
        className="mt-5 border-t pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        Sample content · not a live signal ·{" "}
        <Link
          href="/sample-desk"
          className="font-semibold normal-case tracking-normal text-orbital-cyan underline underline-offset-4 hover:text-white"
        >
          Read a full sample brief
        </Link>
      </p>
    </article>
  );
}
