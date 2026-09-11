import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

/**
 * OpenGraph image for the Galaxy Fantasy surfaces — the shareable "proof" card.
 *
 * 1200×630. Honest by design: leads with "real, cleared data," not a hype claim.
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} · Galaxy Fantasy: Draft & Best Ball on real, cleared data`;
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
            "radial-gradient(120% 80% at 30% 0%, #12141A 0%, #08090C 55%, #08090C 100%)",
          color: "#EDE8E0",
          padding: "72px 88px",
          position: "relative",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(255,77,46,0.38) 0%, rgba(25,28,35,0.35) 60%, transparent 100%)",
            display: "flex",
          }}
        />
        {/* Wordmark */}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "0.12em", color: "#EDE8E0", display: "flex" }}>
            GALAXY
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "0.30em", color: "#FF4D2E", marginTop: 10, display: "flex" }}>
            FANTASY
          </div>
        </div>

        <div
          style={{
            marginTop: 70,
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
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#FF4D2E", display: "flex" }} />
          DFS &amp; season · Best Ball
        </div>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            fontSize: 72,
            fontWeight: 600,
            lineHeight: 1.04,
            letterSpacing: "-0.015em",
            color: "#EDE8E0",
            maxWidth: 1000,
          }}
        >
          Draft & Best Ball on real, cleared data.
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1.35,
            color: "#C7CCD9",
            maxWidth: 940,
          }}
        >
          Roster ceiling, QB stacks, bye structure, with the reasoning. No fabricated projections.
        </div>

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
          <span>Real grades, not fabricated projections.</span>
          <span style={{ color: "#FF4D2E" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
