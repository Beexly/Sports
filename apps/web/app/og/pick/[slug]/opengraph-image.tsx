import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Image({ params }: { params: { slug: string } }) {
  const parts = params.slug.split("-");
  const sport = (parts[0] ?? "SPORT").toUpperCase();
  const home = (parts[1] ?? "HOME").toUpperCase();
  const away = (parts[2] ?? "AWAY").toUpperCase();

  const hasParts = parts.length >= 2;

  return new ImageResponse(
    hasParts ? (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0A0A0F",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 64px",
          fontFamily: "monospace",
        }}
      >
        {/* Top-left brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#9F87FF",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            GALAXY
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Sport + matchup headline */}
          <div
            style={{
              color: "#FFFFFF",
              fontSize: 48,
              fontWeight: 400,
              letterSpacing: "0.05em",
              fontFamily: "monospace",
            }}
          >
            {sport} · {home} vs {away}
          </div>

          {/* Pick line */}
          <div
            style={{
              color: "#FFFFFF",
              fontSize: 72,
              fontWeight: 700,
              fontFamily: "monospace",
              lineHeight: 1,
            }}
          >
            {home} -{parts.length > 3 ? parts[3] : "3.5"}
          </div>

          {/* Confidence chip */}
          <div
            style={{
              display: "flex",
            }}
          >
            <span
              style={{
                background: "#9F87FF",
                color: "#0A0A0F",
                fontSize: 20,
                fontWeight: 700,
                padding: "8px 20px",
                borderRadius: 999,
                letterSpacing: "0.05em",
                fontFamily: "monospace",
              }}
            >
              74% confidence
            </span>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#00E5FF",
              fontSize: 18,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            galaxysportsedge.com
          </span>
          <span
            style={{
              color: "#00E5FF",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            INTELLIGENCE NOT PICKS
          </span>
        </div>
      </div>
    ) : (
      /* Branded fallback */
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0A0A0F",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "monospace",
          gap: 24,
        }}
      >
        <div
          style={{
            color: "#9F87FF",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          GALAXY SPORTS EDGE
        </div>
        <div
          style={{
            color: "#00E5FF",
            fontSize: 20,
            fontFamily: "monospace",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          INTELLIGENCE NOT PICKS
        </div>
        <div
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            fontFamily: "monospace",
            opacity: 0.5,
          }}
        >
          galaxysportsedge.com
        </div>
      </div>
    ),
    { ...size }
  );
}
