import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

/**
 * Shareable No-Bet artifact image.
 *
 * Query params:
 *   sport   — sport label
 *   game    — matchup string
 *   reason  — primary pass reason (max 80 chars)
 *   date    — date string (e.g. "May 28")
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sport = searchParams.get("sport")?.toUpperCase() ?? "—";
  const game = searchParams.get("game") ?? "—";
  const reason = searchParams.get("reason") ?? "Signal field did not meet the publish threshold.";
  const date = searchParams.get("date") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #08091A 0%, #0D0A06 60%, #050608 100%)",
          color: "#F6F7FA",
          padding: "60px 72px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Amber pass-glow */}
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -80,
            width: 440,
            height: 440,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(245,158,11,0.15) 0%, transparent 70%)",
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
              color: "#F59E0B",
              display: "flex",
            }}
          >
            {BRAND_NAME.toUpperCase()} · NO-BET ENGINE
          </div>
          {date && (
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
              {date}
            </div>
          )}
        </div>

        {/* Game + sport */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 48 }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.20)",
              color: "#D97706",
              display: "flex",
            }}
          >
            {sport}
          </div>
          <div style={{ fontSize: 22, color: "#9CA3AF", display: "flex" }}>
            {game}
          </div>
        </div>

        {/* Pass verdict */}
        <div
          style={{
            marginTop: 36,
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "#F59E0B",
            display: "flex",
          }}
        >
          PASS
        </div>

        {/* Reason */}
        <div
          style={{
            marginTop: 28,
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.4,
            color: "#9CA3AF",
            maxWidth: 860,
            display: "flex",
          }}
        >
          {reason}
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
            borderTop: "1px solid rgba(245,158,11,0.14)",
            paddingTop: 24,
          }}
        >
          <span>A pass is a position · Informational only · Gamble responsibly</span>
          <span style={{ color: "#F59E0B" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...SIZE }
  );
}
