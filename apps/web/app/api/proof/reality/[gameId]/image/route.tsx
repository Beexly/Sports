import { ImageResponse } from "next/og";
import { loadRealityReceipt } from "@/lib/reality-receipt/load";
import { buildRealityReceiptCard, buildRealityReceiptUnavailableCard, type RealityReceiptCard } from "@/lib/reality-receipt/card";
import { BRAND_NAME } from "@/lib/brand";

/**
 * GET /api/proof/reality/[gameId]/image — the shareable visual leg of the
 * Reality Receipt (W003). DB-backed, so Node runtime (not edge) — a thin JSX
 * shell over `buildRealityReceiptCard`, which carries every content decision
 * (digest truncation, state -> copy, honest unavailable text) and is unit
 * tested independently. No `ImageResponse` rendering test precedent exists
 * in this repo (the three static opengraph-image.tsx files are untested
 * too); this route is covered by the build's type-check/bundle pass plus a
 * manual dev-server smoke curl.
 */

export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };
const BG = "radial-gradient(120% 80% at 30% 0%, #14182A 0%, #08091A 55%, #05070B 100%)";

function render(card: RealityReceiptCard): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: "#F5F7FF",
          padding: "72px 88px",
          fontFamily: "'Exo 2', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "monospace",
            fontSize: 20,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#5FD9A3",
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#5FD9A3", display: "flex" }} />
          <span style={{ display: "flex" }}>{card.eyebrow}</span>
        </div>

        <div style={{ marginTop: 30, fontSize: 52, fontWeight: 700, lineHeight: 1.1, display: "flex" }}>{card.headline}</div>
        <div style={{ marginTop: 10, fontSize: 26, color: "#C7CCD9", display: "flex" }}>{card.subhead}</div>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 14, fontSize: 24 }}>
          {card.lines.map((line) => (
            <div key={line} style={{ display: "flex" }}>
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: 18,
            letterSpacing: "0.14em",
            color: "#8089A0",
            borderTop: "1px solid rgba(95, 217, 163, 0.22)",
            paddingTop: 24,
          }}
        >
          <span style={{ display: "flex" }}>{card.footer}</span>
          <span style={{ display: "flex", color: "#5FD9A3" }}>{BRAND_NAME}</span>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
): Promise<Response> {
  const { gameId } = await params;
  const id = decodeURIComponent(gameId ?? "").trim();
  const result = await loadRealityReceipt(id);
  const card = result.ok ? buildRealityReceiptCard(result.receipt) : buildRealityReceiptUnavailableCard(result.reason);
  return render(card);
}
