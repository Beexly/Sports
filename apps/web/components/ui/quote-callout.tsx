/**
 * QuoteCallout — large italic pull-quote for page flow breaks.
 *
 * Centered italic text, dark, minimal, impactful. Floats as a section break —
 * no outer card border, just a subtle atmospheric wash and a short decorative
 * gradient bar (brand cyan → ultraviolet) above the quote.
 *
 * Usage:
 *   <QuoteCallout cite="Galaxy Sports Edge, Methodology">
 *     The model does not publish when it is not confident. The gate stays closed.
 *   </QuoteCallout>
 */

import type { ReactNode } from "react";
import { BRAND_COLORS } from "@/lib/brand";

export interface QuoteCalloutProps {
  children: ReactNode;
  /** Optional attribution line rendered below the quote. */
  cite?: string;
}

export function QuoteCallout({ children, cite }: QuoteCalloutProps) {
  return (
    <div
      className="px-4"
      style={{
        background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.03), transparent)",
      }}
    >
      <blockquote className="mx-auto flex max-w-2xl flex-col items-center py-14 text-center">
        {/* Decorative gradient bar — centered above the quote text */}
        <div
          aria-hidden="true"
          className="mb-8 h-[60px] w-0.5 shrink-0 rounded-full"
          style={{ background: `linear-gradient(180deg, ${BRAND_COLORS.orbitalCyan}, ${BRAND_COLORS.softUltraviolet})` }}
        />

        {/* Quote body */}
        <p
          className="m-0 font-display italic leading-[1.35] text-white"
          style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.875rem)" }}
        >
          {children}
        </p>

        {/* Optional cite / attribution */}
        {cite ? (
          <cite className="mt-4 block font-mono text-[10px] uppercase not-italic tracking-[0.2em] text-ink-400">
            {cite}
          </cite>
        ) : null}
      </blockquote>
    </div>
  );
}
