import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

/**
 * Default OpenGraph image — rendered on the fly by Next.js.
 *
 * Used as the social card for the root (`/`) when nothing more specific
 * is provided. Individual pages can ship their own `opengraph-image.tsx`
 * to override. Edge runtime keeps cold-start latency low.
 *
 * 1200×630 is the Twitter / Facebook / LinkedIn standard.
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(120% 80% at 50% 0%, #221140 0%, #0a0612 60%, #04060a 100%)",
          color: "#F4F5F8",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* Atmospheric magenta accent in the corner */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -180,
            width: 540,
            height: 540,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(255,45,138,0.55) 0%, rgba(79,168,255,0.18) 60%, transparent 100%)",
            filter: "blur(8px)",
            display: "flex",
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#C7B6FF",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#FF2D8A",
              display: "flex",
            }}
          />
          Intelligence over noise · v5.0
        </div>

        {/* Wordmark */}
        <div
          style={{
            marginTop: 56,
            display: "flex",
            alignItems: "center",
            fontFamily: "sans-serif",
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: "white",
          }}
        >
          {BRAND_NAME}
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            fontFamily: "serif",
            fontStyle: "italic",
            fontSize: 64,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#F4F5F8",
            maxWidth: 940,
          }}
        >
          {BRAND_TAGLINE}
        </div>

        {/* Footer rule */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8089A0",
            borderTop: "1px solid rgba(155, 123, 250, 0.28)",
            paddingTop: 28,
          }}
        >
          <span>Live odds · scored every 30 min</span>
          <span style={{ color: "#FF2D8A" }}>You make the call.</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
