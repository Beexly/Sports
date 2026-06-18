/**
 * QuoteCallout — large italic pull-quote for page flow breaks.
 *
 * Inspired by GitNexus: centered italic text, dark, minimal, impactful.
 * Floats as a section break — no outer card border, just a subtle atmospheric
 * wash and a left decorative gradient bar to ground the quote visually.
 *
 * Usage:
 *   <QuoteCallout cite="Galaxy Sports Edge, Methodology">
 *     The model does not publish when it is not confident. The gate stays closed.
 *   </QuoteCallout>
 */

import type { ReactNode } from "react";

export interface QuoteCalloutProps {
  children: ReactNode;
  /** Optional attribution line rendered below the quote. */
  cite?: string;
}

export function QuoteCallout({ children, cite }: QuoteCalloutProps) {
  return (
    // Outer atmospheric wrapper — subtle top/bottom fade so it blends into the
    // dark page background rather than landing as a hard block.
    <div
      aria-label="pull quote"
      style={{
        background:
          "linear-gradient(to bottom, transparent, rgba(255,255,255,0.03), transparent)",
        padding: "0 1rem",
      }}
    >
      <blockquote
        style={{
          maxWidth: "42rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingTop: "3.5rem",    // py-14
          paddingBottom: "3.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          margin: "0 auto",
        }}
      >
        {/* Decorative gradient bar — centered above the quote text */}
        <div
          aria-hidden="true"
          style={{
            width: 2,
            height: 60,
            background: "linear-gradient(180deg, #00E5FF, #7A5CFF)",
            borderRadius: 1,
            marginBottom: "2rem",
            flexShrink: 0,
          }}
        />

        {/* Quote body */}
        <p
          className="font-display italic leading-[1.35] text-white"
          style={{
            fontSize: "clamp(1.25rem, 2.5vw, 1.875rem)", // text-2xl → md:text-3xl
            margin: 0,
            textAlign: "center",
          }}
        >
          {children}
        </p>

        {/* Optional cite / attribution */}
        {cite && (
          <cite
            className="text-ink-400"
            style={{
              display: "block",
              fontStyle: "normal",
              fontFamily: "var(--f-mono, ui-monospace, monospace)",
              fontSize: "0.625rem",       // 10px
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginTop: "1rem",
              textAlign: "center",
            }}
          >
            {cite}
          </cite>
        )}
      </blockquote>
    </div>
  );
}
