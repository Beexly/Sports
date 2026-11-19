import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "edge";
export const alt = `${BRAND_NAME} - The Public Settlement Ledger`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OpenGraph card for `/record`.
 * Flat Redline palette (#08090C ground, #EDE8E0 bone, #FF4D2E ember), pure 7-bit ASCII,
 * compliant with all claim-truth guardrails.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          backgroundColor: "#08090C",
          color: "#EDE8E0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #31353F",
            paddingBottom: "24px",
          }}
        >
          <span
            style={{
              fontSize: 18,
              letterSpacing: "0.22em",
              color: "#FF4D2E",
              textTransform: "uppercase",
            }}
          >
            {BRAND_NAME.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: 16,
              letterSpacing: "0.14em",
              color: "#C4BFB6",
              textTransform: "uppercase",
            }}
          >
            SETTLEMENT LEDGER OF RECORD
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.0,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#EDE8E0",
            }}
          >
            The Sealed Ledger.
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              color: "#C4BFB6",
              maxWidth: "980px",
            }}
          >
            Recomputed straight from the settlement database. Stake-weighted and 1u flat -110 normalized (+25.82u) views side by side.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #31353F",
            paddingTop: "22px",
            fontSize: 18,
            color: "#C4BFB6",
          }}
        >
          <span>Every graded side, total, and prop logged alongside transparent passes</span>
          <span style={{ color: "#EDE8E0" }}>galaxysportsedge.com/record</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
