import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

/**
 * Shareable Post-Bet Autopsy artifact image.
 *
 * Query params:
 *   game      — matchup
 *   sport     — sport label
 *   result    — WIN | LOSS | PUSH
 *   clv       — CLV label ("Beat closing line", "Lost CLV", "Near closing")
 *   grade     — process grade (A/B/C/D/F or descriptive)
 *   selection — pick selection shown
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const game = searchParams.get("game") ?? "—";
  const sport = searchParams.get("sport")?.toUpperCase() ?? "—";
  const result = searchParams.get("result")?.toUpperCase() ?? "—";
  const clv = searchParams.get("clv") ?? "";
  const grade = searchParams.get("grade") ?? "";
  const selection = searchParams.get("selection") ?? "";

  const resultColor =
    result === "WIN" ? "#4ADE80" : result === "LOSS" ? "#F87171" : "#FCD34D";
  const resultBg =
    result === "WIN"
      ? "rgba(74,222,128,0.08)"
      : result === "LOSS"
        ? "rgba(248,113,113,0.08)"
        : "rgba(252,211,77,0.08)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #08091A 0%, #0A0C1A 60%, #050608 100%)",
          color: "#F6F7FA",
          padding: "60px 72px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Subtle glow by result */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(50% 50% at 50% 50%, ${resultColor}20 0%, transparent 70%)`,
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
              color: "#A78BFA",
              display: "flex",
            }}
          >
            {BRAND_NAME.toUpperCase()} · POST-BET AUTOPSY
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              padding: "6px 16px",
              borderRadius: 8,
              background: resultBg,
              border: `1px solid ${resultColor}30`,
              color: resultColor,
              display: "flex",
            }}
          >
            {result}
          </div>
        </div>

        {/* Game */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 48 }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: "#D1D5DB",
              display: "flex",
            }}
          >
            {sport}
          </div>
          <div style={{ fontSize: 24, color: "#9CA3AF", display: "flex" }}>
            {game}
          </div>
          {selection && (
            <div style={{ fontSize: 24, color: "#6B7280", display: "flex" }}>
              · {selection}
            </div>
          )}
        </div>

        {/* CLV and grade */}
        <div style={{ display: "flex", gap: 40, marginTop: 44, alignItems: "flex-start" }}>
          {clv && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#4B5563",
                  display: "flex",
                }}
              >
                CLV verdict
              </div>
              <div style={{ fontSize: 38, fontWeight: 700, color: "#22D3EE", display: "flex" }}>
                {clv}
              </div>
            </div>
          )}
          {grade && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#4B5563",
                  display: "flex",
                }}
              >
                Process grade
              </div>
              <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1, color: "#F6F7FA", display: "flex" }}>
                {grade}
              </div>
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
            borderTop: "1px solid rgba(167,139,250,0.18)",
            paddingTop: 24,
          }}
        >
          <span>Process over outcome · CLV is the signal · Informational only</span>
          <span style={{ color: "#A78BFA" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...SIZE }
  );
}
