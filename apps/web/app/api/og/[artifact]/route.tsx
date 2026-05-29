import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND_NAME } from "@/lib/brand";
import {
  getArtifactType,
  isValidArtifactId,
} from "@/lib/galaxy/kernel/artifacts";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

/**
 * Unified shareable artifact OG image.
 *
 * Route: /api/og/[artifact]?[params]
 *
 * Each artifact type drives: background gradient, accent color,
 * label, disclaimer requirement. No factor weights, thresholds, prompt
 * text, or calibration formulas — enforced by the registry.
 *
 * Common query params (artifact-type specific):
 *   title   — primary headline (e.g. "BOS -3.5", "No bet", "Grade: A")
 *   sub     — secondary line (sport, context, etc.)
 *   detail  — optional third line
 *   sport   — sport label (NBA, NFL, etc.)
 *
 * The existing per-type routes (/api/og/pick etc.) remain load-bearing.
 * This route handles the remaining 7 artifact types.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ artifact: string }> }
) {
  const { artifact } = await params;

  if (!isValidArtifactId(artifact)) {
    return new Response("Unknown artifact type", { status: 404 });
  }

  const artifactType = getArtifactType(artifact)!;

  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") ?? artifactType.label;
  const sub = searchParams.get("sub") ?? "";
  const detail = searchParams.get("detail") ?? "";
  const sport = searchParams.get("sport")?.toUpperCase() ?? "";

  const accentRgb = hexToRgb(artifactType.accentHex);
  const glowColor = accentRgb
    ? `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.18)`
    : "rgba(0,229,255,0.18)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, #08091A 0%, #0C0E22 60%, #050608 100%)`,
          color: "#F6F7FA",
          padding: "60px 72px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Accent glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -100,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: `radial-gradient(50% 50% at 50% 50%, ${glowColor} 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Header */}
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
              · {artifactType.label.toUpperCase()}
            </div>
          </div>
          {sport && (
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                padding: "4px 12px",
                borderRadius: 999,
                border: `1px solid ${artifactType.accentHex}40`,
                color: artifactType.accentHex,
                display: "flex",
              }}
            >
              {sport}
            </div>
          )}
        </div>

        {/* Main title */}
        <div
          style={{
            marginTop: 64,
            fontSize: title.length > 20 ? 72 : 96,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "#F6F7FA",
            display: "flex",
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* Sub line */}
        {sub && (
          <div
            style={{
              marginTop: 24,
              fontSize: 24,
              color: "#9CA3AF",
              display: "flex",
            }}
          >
            {sub}
          </div>
        )}

        {/* Detail line */}
        {detail && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: artifactType.accentHex,
                display: "flex",
              }}
            />
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 18,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: artifactType.accentHex,
                display: "flex",
              }}
            >
              {detail}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#374151",
            borderTop: "1px solid rgba(0, 229, 255, 0.14)",
            paddingTop: 20,
          }}
        >
          <span>
            {artifactType.requiresDisclaimer
              ? "Informational only · Not financial advice · Gamble responsibly"
              : "galaxysportsedge.com"}
          </span>
          <span style={{ color: "#22D3EE" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...SIZE }
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : null;
}
