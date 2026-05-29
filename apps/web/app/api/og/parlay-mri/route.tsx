import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

/**
 * Shareable Parlay MRI verdict card.
 *
 * Query params:
 *   legs     — number of legs (2–8)
 *   verdict  — AVOID | CAUTION | CLEAR
 *   risk     — short risk label ("High correlation", "Margin stack", …)
 *   sports   — comma-separated sports (e.g. "NBA,NFL")
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const legs = searchParams.get("legs") ?? "—";
  const verdict = searchParams.get("verdict")?.toUpperCase() ?? "—";
  const risk = searchParams.get("risk") ?? "";
  const sports = searchParams.get("sports") ?? "";

  const verdictColor =
    verdict === "AVOID" ? "#F87171" : verdict === "CAUTION" ? "#FCD34D" : "#4ADE80";
  const verdictBg =
    verdict === "AVOID"
      ? "rgba(248,113,113,0.10)"
      : verdict === "CAUTION"
        ? "rgba(252,211,77,0.10)"
        : "rgba(74,222,128,0.10)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #08091A 0%, #080A1E 55%, #050608 100%)",
          color: "#F6F7FA",
          padding: "60px 72px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* MRI glow */}
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(50% 50% at 50% 50%, ${verdictColor}15 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#22D3EE",
              display: "flex",
            }}
          >
            {BRAND_NAME.toUpperCase()} · PARLAY MRI
          </div>
          {sports && (
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#4B5563",
                display: "flex",
              }}
            >
              {sports}
            </div>
          )}
        </div>

        {/* Leg count */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 52 }}>
          <div
            style={{
              fontSize: 130,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: "#F6F7FA",
              display: "flex",
            }}
          >
            {legs}
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#6B7280",
              marginBottom: 16,
              display: "flex",
            }}
          >
            LEG{Number(legs) !== 1 ? "S" : ""}
          </div>
        </div>

        {/* Verdict badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 24 }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "10px 28px",
              borderRadius: 12,
              background: verdictBg,
              border: `1px solid ${verdictColor}35`,
              color: verdictColor,
              display: "flex",
            }}
          >
            {verdict}
          </div>
          {risk && (
            <div style={{ fontSize: 28, color: "#9CA3AF", display: "flex" }}>
              {risk}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#374151",
            borderTop: "1px solid rgba(34,211,238,0.14)",
            paddingTop: 24,
          }}
        >
          <span>Structural analysis only · Informational · Gamble responsibly</span>
          <span style={{ color: "#22D3EE" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...SIZE }
  );
}
