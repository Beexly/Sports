"use client";

import { useEffect } from "react";
import { captureError, initObservability } from "@/lib/observability/sentry";

/**
 * Root-layout error boundary.
 *
 * `app/error.tsx` renders INSIDE the root layout, so it cannot catch a throw
 * from the root layout itself (fonts, JSON-LD, analytics gating, the shell).
 * Only `global-error.tsx` can — and without one, Next falls through to its own
 * unstyled default error page: a white screen with black system text and the
 * brand nowhere in sight.
 *
 * global-error REPLACES the root layout when it renders, so it has to ship its
 * own <html>/<body>. That also means no design tokens, no next/font and no
 * globals.css are guaranteed to be present — everything here is inline and
 * self-sufficient, using the literal palette values (obsidian #05070B,
 * ion-white #F5F7FF, alert #FF6470) rather than token classes that may not
 * have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    initObservability();
    console.error("[app] global error boundary caught:", error);
    captureError(error, { digest: error.digest, scope: "global-error" });
  }, [error]);

  const isProd = process.env.NODE_ENV === "production";
  const detail = isProd
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
          padding: 24,
          background: "#05070B",
          color: "#F5F7FF",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            borderRadius: 16,
            border: "1px solid rgba(255,100,112,0.3)",
            background: "rgba(255,100,112,0.08)",
            padding: 32,
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#FF6470",
              fontWeight: 700,
            }}
          >
            Galaxy Sports Edge
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: 20, fontWeight: 700 }}>
            Something broke on my side.
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#AEB7D2",
            }}
          >
            The page failed before it could render. Hit retry, or head home. The
            observatory has the trace either way.
          </p>
          <pre
            style={{
              margin: "12px 0 0",
              overflowX: "auto",
              borderRadius: 8,
              background: "rgba(13,17,23,0.7)",
              padding: 12,
              fontSize: 11,
              color: "#9AA3C0",
              textAlign: "left",
            }}
          >
            {detail}
          </pre>
          <div
            style={{
              marginTop: 20,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: 44,
                borderRadius: 8,
                border: "1px solid rgba(255,100,112,0.3)",
                background: "rgba(255,100,112,0.2)",
                color: "#F5F7FF",
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <a
              href="/"
              style={{
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 8,
                border: "1px solid rgba(255,100,112,0.3)",
                color: "#AEB7D2",
                padding: "10px 18px",
                fontSize: 14,
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
