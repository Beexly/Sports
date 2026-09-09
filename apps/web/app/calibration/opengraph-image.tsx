import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

/**
 * OpenGraph image for /calibration — The Proof Room hub.
 *
 * Static + edge runtime, same posture as /performance/opengraph-image.tsx:
 * no live numbers (this page links out to gated, freshness-stamped
 * surfaces), just the brand and the page's own already-published headline
 * so a share of this specific trust page renders its own card instead of
 * silently inheriting the generic homepage image.
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} · The Proof Room`;
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
            "radial-gradient(120% 80% at 30% 0%, #14182A 0%, #08091A 55%, #05070B 100%)",
          color: "#F5F7FF",
          padding: "72px 88px",
          position: "relative",
          fontFamily: "'Exo 2', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            left: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(0,229,255,0.30) 0%, rgba(123,97,255,0.12) 60%, transparent 100%)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="72" height="72" viewBox="0 0 48 48" fill="none" stroke="#F5F7FF" strokeWidth="3" strokeLinecap="round">
            <path d="M 8 30 A 16 16 0 1 0 40 27" />
            <line x1="6" y1="10" x2="42" y2="38" />
            <circle cx="25" cy="22" r="4" fill="#00E5FF" stroke="none" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "0.12em", display: "flex" }}>
              GALAXY
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "0.30em", color: "#00E5FF", marginTop: 8, display: "flex" }}>
              SPORTS EDGE
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 76,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#7B61FF",
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#00E5FF", display: "flex" }} />
          The Proof Room · Galaxy Calibration
        </div>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: "#F5F7FF",
            maxWidth: 980,
          }}
        >
          Trust is an architecture, not a tagline.
        </div>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.3,
            color: "#C7CCD9",
            maxWidth: 940,
          }}
        >
          Every credibility receipt the platform publishes, gathered in one place.
        </div>

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
            borderTop: "1px solid rgba(0, 229, 255, 0.22)",
            paddingTop: 28,
          }}
        >
          <span>No fabricated stats. Every number gated until it&apos;s earned.</span>
          <span style={{ color: "#00E5FF" }}>galaxysportsedge.com/calibration</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
