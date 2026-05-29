import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

/**
 * Shareable pick artifact image.
 *
 * Query params:
 *   sport      — sport label (NBA, NFL, MLB …)
 *   selection  — pick selection (e.g. "BOS -3.5")
 *   type       — SPREAD | MONEYLINE | TOTAL
 *   tier       — FREE | PRO | ELITE
 *   confidence — label (High, Elite, Moderate, Low)
 *   game       — optional matchup string ("BOS @ NYK")
 *
 * Never exposes model weights, confidence scores (numeric), or
 * internal factor breakdown — only the publishable surface.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sport = searchParams.get("sport")?.toUpperCase() ?? "—";
  const selection = searchParams.get("selection") ?? "—";
  const type = searchParams.get("type")?.toUpperCase() ?? "SPREAD";
  const tier = searchParams.get("tier")?.toUpperCase() ?? "FREE";
  const confidenceLabel = searchParams.get("confidence") ?? "";
  const game = searchParams.get("game") ?? "";

  const typeColor = type === "MONEYLINE" ? "#A78BFA" : type === "TOTAL" ? "#FB923C" : "#60A5FA";
  const tierColor = tier === "ELITE" ? "#C084FC" : tier === "PRO" ? "#22D3EE" : "#9CA3AF";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #08091A 0%, #0C0E22 60%, #050608 100%)",
          color: "#F6F7FA",
          padding: "60px 72px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Cyan orbital glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -100,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(0,229,255,0.18) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#00E5FF",
                display: "flex",
              }}
            >
              {BRAND_NAME.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#4B5563",
                display: "flex",
              }}
            >
              · SIGNAL
            </div>
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 999,
              border: `1px solid ${tierColor}40`,
              color: tierColor,
              display: "flex",
            }}
          >
            {tier}
          </div>
        </div>

        {/* Sport + type row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 48 }}>
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
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: typeColor,
              display: "flex",
            }}
          >
            {type}
          </div>
          {game && (
            <div
              style={{
                fontSize: 18,
                color: "#6B7280",
                display: "flex",
              }}
            >
              {game}
            </div>
          )}
        </div>

        {/* Selection — the main event */}
        <div
          style={{
            marginTop: 32,
            fontSize: 110,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "#F6F7FA",
            display: "flex",
          }}
        >
          {selection}
        </div>

        {/* Confidence label */}
        {confidenceLabel && (
          <div
            style={{
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#22D3EE",
                display: "flex",
              }}
            />
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 18,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#22D3EE",
                display: "flex",
              }}
            >
              {confidenceLabel} confidence · Galaxy model
            </div>
          </div>
        )}

        {/* Disclaimer footer */}
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
            borderTop: "1px solid rgba(0, 229, 255, 0.14)",
            paddingTop: 24,
          }}
        >
          <span>Informational only · Not financial advice · Gamble responsibly</span>
          <span style={{ color: "#22D3EE" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...SIZE }
  );
}
