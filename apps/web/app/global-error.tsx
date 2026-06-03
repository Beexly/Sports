"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. Catches errors thrown in the root layout itself
 * (fonts, providers, the JSON-LD blocks) — the one place `app/error.tsx`
 * cannot reach. It must render its own <html>/<body> with INLINE styles,
 * because when the layout throws there is no guarantee globals.css has loaded.
 * Sanitized in production: we surface only the Next.js `digest` correlation id,
 * never a stack trace.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app] root error boundary caught:", error);
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
          padding: "24px",
          background: "#04060a",
          color: "#e6edf6",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "36rem",
            border: "1px solid #3a1620",
            background: "rgba(60,10,20,0.3)",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            Something broke on my side.
          </h1>
          <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "#f3c0c8" }}>
            The site hit a runtime error before it could finish loading. Try
            again, or head home — the observatory has the trace either way.
          </p>
          <pre
            style={{
              marginTop: "12px",
              overflowX: "auto",
              borderRadius: "8px",
              background: "rgba(40,8,14,0.6)",
              padding: "12px",
              fontSize: "11px",
              color: "#f7d6dc",
            }}
          >
            {visibleDetail}
          </pre>
          <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              onClick={() => reset()}
              style={{
                borderRadius: "8px",
                background: "rgba(120,20,30,0.6)",
                border: "none",
                padding: "8px 16px",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                borderRadius: "8px",
                border: "1px solid #3a1620",
                padding: "8px 16px",
                fontSize: "0.875rem",
                color: "#f3c0c8",
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
