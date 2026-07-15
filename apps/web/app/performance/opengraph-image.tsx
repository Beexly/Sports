import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

/**
 * OpenGraph image for /performance — the track-record / calibration page.
 *
 * A bespoke "graded in public" proof card so sharing the record renders the
 * brand's wedge instead of inheriting the generic site card. Static + edge
 * runtime (no DB), so it stays fast and can't leak gated data. A future Node-
 * runtime version can render the live Brier / win-rate / CLV once canonical
 * history exists; until then the proof posture is the message.
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} · graded in public`;
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
        {/* Verify-mint accent glow — "the receipts" */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(95,217,163,0.30) 0%, rgba(0,229,255,0.10) 60%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Brand mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="72" height="72" viewBox="0 0 48 48" fill="none" stroke="#F5F7FF" strokeWidth="3" strokeLinecap="round">
            <path d="M 8 30 A 16 16 0 1 0 40 27" />
            <line x1="6" y1="10" x2="42" y2="38" />
            <circle cx="25" cy="22" r="4" fill="#FF38C7" stroke="none" />
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

        {/* Eyebrow */}
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
            color: "#5FD9A3",
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#5FD9A3", display: "flex" }} />
          The receipts · Calibration report
        </div>

        {/* Headline */}
        <div
          style={{
            marginTop: 26,
            display: "flex",
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "#F5F7FF",
          }}
        >
          Graded in public.
        </div>

        {/* Subhead */}
        <div
          style={{
            marginTop: 22,
            display: "flex",
            fontSize: 30,
            fontWeight: 400,
            lineHeight: 1.3,
            color: "#C7CCD9",
            maxWidth: 940,
          }}
        >
          Signal strength audited against outcomes. Probability reliability stays dark until the proof receipts support it.
        </div>

        {/* Footer principle */}
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
            borderTop: "1px solid rgba(95, 217, 163, 0.22)",
            paddingTop: 28,
          }}
        >
          <span>Receipts first. Numbers second.</span>
          <span style={{ color: "#5FD9A3" }}>galaxysportsedge.com/performance</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
