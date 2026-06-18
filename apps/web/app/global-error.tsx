"use client";

import { useEffect } from "react";

/**
 * ROOT-LAYOUT error boundary (J13 — boot/async resilience).
 *
 * `error.tsx` only catches errors thrown BELOW the root layout. If the root
 * layout itself throws, Next.js renders THIS file instead — and because it
 * replaces the entire layout, it must render its own <html>/<body> and cannot
 * rely on the app stylesheet (globals.css is imported by the root layout, which
 * did not render). So every style here is INLINE and self-contained: the
 * fallback always paints a branded, legible screen rather than the default
 * unstyled crash page. This is the "no surface hangs / always degrades to a
 * visible fallback" principle applied to the worst case — a root crash.
 *
 * Only renders in production builds (in dev, Next shows its error overlay).
 * Copy stays on-brand: no banned phrases, no apologies that read as admissions.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Defensive: the root layout (which normally inits observability) did not
    // render, so init here. Wrapped so a failing capture can NEVER prevent the
    // fallback from showing — that would defeat the entire purpose of this file.
    void (async () => {
      try {
        const obs = await import("@/lib/observability/sentry");
        obs.initObservability();
        obs.captureError(error, { digest: error.digest, boundary: "global-error" });
      } catch {
        /* observability is best-effort here; never block the fallback render */
      }
    })();
    // eslint-disable-next-line no-console
    console.error("[app] root-layout (global-error) boundary caught:", error);
  }, [error]);

  const isProd = process.env.NODE_ENV === "production";
  // In production, server errors arrive sanitized — show only the digest (a
  // Next.js correlation id matchable in logs). In dev, show the full message.
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
          padding: "24px",
          backgroundColor: "#080A0F",
          color: "#C2C8D2",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: "36rem",
            width: "100%",
            borderRadius: "16px",
            border: "1px solid rgba(159, 135, 255, 0.3)",
            backgroundColor: "rgba(159, 135, 255, 0.06)",
            padding: "28px",
            boxSizing: "border-box",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#9F87FF",
            }}
          >
            Galaxy Sports Edge
          </p>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: "22px",
              fontWeight: 700,
              color: "#F6F7FA",
            }}
          >
            Something broke at the root.
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: "#C2C8D2" }}>
            The page hit a runtime error before the layout could load. Reload to try again, or
            head home — the trace was captured either way.
          </p>
          <pre
            style={{
              margin: "16px 0 0",
              overflowX: "auto",
              borderRadius: "10px",
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              padding: "12px",
              fontSize: "11px",
              color: "#9AA3B2",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {visibleDetail}
          </pre>
          <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                borderRadius: "10px",
                border: "1px solid rgba(159, 135, 255, 0.4)",
                backgroundColor: "rgba(159, 135, 255, 0.18)",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#F6F7FA",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <a
              href="/"
              style={{
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "10px 18px",
                fontSize: "14px",
                color: "#C2C8D2",
                textDecoration: "none",
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
