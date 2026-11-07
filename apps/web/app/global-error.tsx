"use client";

import { useEffect } from "react";
import { BRAND_COLORS, BRAND_NAME } from "@/lib/brand";

/**
 * Last-resort error boundary.
 *
 * `app/error.tsx` is nested INSIDE the root layout, so it can only catch errors
 * thrown by a page or a nested layout. When the ROOT layout itself throws —
 * font loading, a bad env read, a JSON-LD build — React unmounts the whole tree
 * and `app/error.tsx` never renders. Next.js then falls back to its own
 * unstyled default, which in production is a bare white page reading
 * "Application error: a server-side exception has occurred". That is the one
 * place in the journey where a customer could see an unbranded framework
 * string, so this file covers it.
 *
 * `global-error.tsx` REPLACES the root layout, which means globals.css was
 * never loaded and no Tailwind class or CSS variable resolves here. Every style
 * is therefore inline, and the palette is read from the brand source rather
 * than hardcoded. The digest is the only detail shown in production — never a
 * stack trace, never a raw message.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error("[app] root layout error boundary caught:", error);
  }, [error]);

  const isProd = process.env.NODE_ENV === "production";
  const visibleDetail = isProd
    ? error.digest
      ? `Reference: ${error.digest}`
      : "A correlation id was not generated for this error."
    : error.message;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: BRAND_COLORS.obsidianBlack,
          color: BRAND_COLORS.ionWhite,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.625rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: BRAND_COLORS.orbitalCyan,
            }}
          >
            {BRAND_NAME}
          </p>
          <h1 style={{ margin: "1rem 0 0", fontSize: "1.5rem", lineHeight: 1.2 }}>
            Something broke on my side.
          </h1>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", lineHeight: 1.6, opacity: 0.8 }}>
            The whole page failed to start, not just one panel. Hit retry, or head
            home. The observatory has the trace either way.
          </p>
          <pre
            style={{
              margin: "1rem 0 0",
              padding: "0.75rem",
              overflowX: "auto",
              borderRadius: "0.5rem",
              background: "rgba(245, 247, 255, 0.06)",
              fontSize: "0.6875rem",
              textAlign: "left",
              opacity: 0.75,
            }}
          >
            {visibleDetail}
          </pre>
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: "44px",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                background: BRAND_COLORS.orbitalCyan,
                color: BRAND_COLORS.obsidianBlack,
              }}
            >
              Retry
            </button>
            {/* A plain anchor, not next/link: the router tree is gone here. */}
            <a
              href="/"
              style={{
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: `1px solid ${BRAND_COLORS.orbitalCyan}`,
                fontSize: "0.875rem",
                textDecoration: "none",
                color: BRAND_COLORS.orbitalCyan,
              }}
            >
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
