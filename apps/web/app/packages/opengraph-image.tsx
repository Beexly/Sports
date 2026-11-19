import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "edge";
export const alt = `${BRAND_NAME} - NFL Packages & Membership Plans`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OpenGraph card for `/packages`.
 * Flat Redline palette (#08090C ground, #EDE8E0 bone, #FF4D2E ember), pure 7-bit ASCII,
 * zero gradients, and compliant with claim-truth guardrails.
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
            WEEK 11 + THANKSGIVING SLATE
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: 66,
              lineHeight: 1.0,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#EDE8E0",
            }}
          >
            Two doors. One standard.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: "#C4BFB6",
              maxWidth: "980px",
            }}
          >
            Week 11 TNF IND @ HOU ($9) - Thanksgiving 5-Game ($14) - Sunday Full Slate ($29) - Pro ($39/mo) & Elite ($79/mo) with the 30-Day Positive-CLV Pledge.
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
          <span>Five-stage check before release - free pass discipline on every sit-out</span>
          <span style={{ color: "#EDE8E0" }}>galaxysportsedge.com/packages</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
