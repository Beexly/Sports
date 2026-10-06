import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

/**
 * Default OpenGraph image — Galaxy Sports Edge.
 *
 * 1200×630 — Twitter / Facebook / LinkedIn standard. Uses the canonical
 * logo-mark.svg path so social shares match the site identically.
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} · ${BRAND_TAGLINE}`;
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
            "radial-gradient(120% 80% at 70% 0%, #12141A 0%, #08090C 55%, #08090C 100%)",
          color: "#EDE8E0",
          padding: "72px 88px",
          position: "relative",
          fontFamily: "Inter, system-ui, sans-serif",
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
              "radial-gradient(50% 50% at 50% 50%, rgba(255,77,46,0.35) 0%, rgba(25,28,35,0.35) 60%, transparent 100%)",
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
              "radial-gradient(50% 50% at 50% 50%, rgba(255,77,46,0.40) 0%, rgba(25,28,35,0.35) 60%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Canonical brand mark — inline SVG matching logo-mark.svg */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="84" height="84" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="og-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF4D2E" />
                <stop offset="55%" stopColor="#FF4D2E" />
                <stop offset="100%" stopColor="#FF4D2E" />
              </linearGradient>
            </defs>
            <path
              d="M11 38C8 25 18 12 32 12c9.8 0 18 6.7 20.3 15.7"
              stroke="url(#og-grad)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <line x1="10" y1="16" x2="54" y2="50" stroke="url(#og-grad)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="34" cy="30" r="4" fill="#FF4D2E" />
            <circle cx="34" cy="30" r="1.5" fill="#EDE8E0" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "#EDE8E0",
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
                color: "#FF4D2E",
                marginTop: 10,
                display: "flex",
              }}
            >
              SPORTS EDGE
            </div>
          </div>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            marginTop: 80,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 22,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#FF4D2E",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#FF4D2E",
              display: "flex",
            }}
          />
          Sports intelligence · Live edge engine
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            fontSize: 76,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
            color: "#EDE8E0",
            maxWidth: 980,
          }}
        >
          {BRAND_TAGLINE}
        </div>

        {/* Personal subhead */}
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
          Because tout services don&apos;t show the losses.
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8089A0",
            borderTop: "1px solid rgba(255,77,46, 0.22)",
            paddingTop: 28,
          }}
        >
          <span>If the work can&apos;t be shown, it doesn&apos;t get published.</span>
          <span style={{ color: "#FF4D2E" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
