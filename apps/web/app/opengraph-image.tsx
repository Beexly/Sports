import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

/**
 * Default OpenGraph image — Galaxy Sports Edge.
 *
 * 1200×630 — the Twitter / Facebook / LinkedIn standard. Edge runtime so
 * cold starts stay fast. The card features the orbital mark, the GALAXY /
 * SPORTS EDGE lockup, the tagline, and the brand closer.
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
            "radial-gradient(120% 80% at 70% 0%, #1A1D33 0%, #08091A 55%, #050608 100%)",
          color: "#F6F7FA",
          padding: "72px 88px",
          position: "relative",
          fontFamily: "'Exo 2', system-ui, sans-serif",
        }}
      >
        {/* Cyan accent — upper-left orbital glow */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(0,229,255,0.35) 0%, rgba(122,92,255,0.12) 60%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Magenta accent — lower-right signal glow */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -140,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(255,45,214,0.40) 0%, rgba(122,92,255,0.15) 60%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Brand mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg
            width="84"
            height="84"
            viewBox="0 0 48 48"
            fill="none"
            stroke="#F6F7FA"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M 8 30 A 16 16 0 1 0 40 27" />
            <line x1="6" y1="10" x2="42" y2="38" />
            <circle cx="25" cy="22" r="4" fill="#FF2DD6" stroke="none" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "#F6F7FA",
                display: "flex",
              }}
            >
              GALAXY
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "0.30em",
                color: "#00E5FF",
                marginTop: 10,
                display: "flex",
              }}
            >
              SPORTS EDGE
            </div>
          </div>
        </div>

        {/* Eyebrow — founder anchor instead of product chrome */}
        <div
          style={{
            marginTop: 80,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#7A5CFF",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#00E5FF",
              display: "flex",
            }}
          />
          Built by Garrett Baxley · Founder
        </div>

        {/* Tagline — locked copy from Brand Use Pack §7 */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            fontSize: 76,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
            color: "#F6F7FA",
            maxWidth: 980,
          }}
        >
          {BRAND_TAGLINE}
        </div>

        {/* Personal subhead — the reason it exists, in my voice */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1.35,
            color: "#C7CCD9",
            maxWidth: 920,
            fontStyle: "italic",
          }}
        >
          Because I&apos;m tired of paying for picks from people who quietly
          delete the losses.
        </div>

        {/* Footer — a principle, signed */}
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
          <span>If we can&apos;t show our work, we don&apos;t publish.</span>
          <span style={{ color: "#00E5FF" }}>— Garrett</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
