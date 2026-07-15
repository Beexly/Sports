import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

/**
 * OpenGraph image for the Galaxy Fantasy surfaces — the shareable "proof" card.
 *
 * 1200×630. Honest by design: leads with "real, cleared data," not a hype claim.
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} · Galaxy Fantasy: public tools gated until real data is cleared`;
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
            "radial-gradient(120% 80% at 30% 0%, #101A33 0%, #08091A 55%, #05070B 100%)",
          color: "#F5F7FF",
          padding: "72px 88px",
          position: "relative",
          fontFamily: "'Exo 2', system-ui, sans-serif",
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
              "radial-gradient(50% 50% at 50% 50%, rgba(0,229,255,0.38) 0%, rgba(123,97,255,0.12) 60%, transparent 100%)",
            display: "flex",
          }}
        />
        {/* Wordmark */}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "0.12em", color: "#F5F7FF", display: "flex" }}>
            GALAXY
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "0.30em", color: "#00E5FF", marginTop: 10, display: "flex" }}>
            FANTASY
          </div>
        </div>

        <div
          style={{
            marginTop: 70,
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
          Public data gate
        </div>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            fontSize: 72,
            fontWeight: 600,
            lineHeight: 1.04,
            letterSpacing: "-0.015em",
            color: "#F5F7FF",
            maxWidth: 1000,
          }}
        >
          Fantasy tools stay closed until every player row is real.
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
          Rights, freshness, model receipts, and failure behavior must clear before release.
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
          <span>No fictional players. No placeholder projections.</span>
          <span style={{ color: "#00E5FF" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
