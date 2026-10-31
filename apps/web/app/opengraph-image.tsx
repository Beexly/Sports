import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

/**
 * Default OpenGraph / X share card — Galaxy Sports Edge.
 *
 * 1200×630 — Twitter / Facebook / LinkedIn standard. Editorial "Redline
 * Ledger" composition: a masthead, a rule, one display headline, one deck and
 * a ledger footer. Flat ink on flat ground — no atmosphere.
 *
 * THE REDLINE PALETTE — the ONLY three colours permitted on this surface:
 *   ground  #08090C   Field ground (near-black canvas)
 *   bone    #EDE8E0   identity ink
 *   ember   #FF4D2E   signal (rules, eyebrow marker, domain)
 *
 * Redline rules enforced here, deliberately:
 *   - NO gradients, NO glow / bloom / halo, NO atmospheric washes.
 *   - NO Inter, NO retired families (Exo 2, JetBrains Mono, Instrument Serif,
 *     Barlow Condensed, Chakra Petch); the old Inter stack is gone.
 *   - NO off-palette greys (#C7CCD9, #8089A0) and NO alpha-tinted rules.
 *   - Hierarchy comes from type size, weight and tracking — never from colour.
 *
 * Local variable-font bytes are loaded below so Satori renders the same
 * Big Shoulders Display headlines and IBM Plex Sans body/data as the DOM.
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} · ${BRAND_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ── Redline palette (literal values — Satori gets strings, not CSS vars) ────
const GROUND = "#08090C"; // Field ground
const BONE = "#EDE8E0"; // identity ink
const EMBER = "#FF4D2E"; // signal

// ── Design-system family stacks (mirror styles/design-tokens.css) ───────────
// --f-display resolves to Big Shoulders Display; --f-body to IBM Plex Sans.
const DISPLAY_STACK =
  '"Big Shoulders Display", "Big Shoulders", "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
const DATA_STACK =
  '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

const HAIRLINE = `1px solid ${EMBER}`;

export default async function Image() {
  const [displayFont, bodyRegular, bodyMedium, bodySemiBold] = await Promise.all([
    fetch(new URL("./fonts/BigShouldersDisplay-SemiBold.ttf", import.meta.url)).then((res) =>
      res.arrayBuffer(),
    ),
    fetch(new URL("./fonts/IBMPlexSans-Regular.ttf", import.meta.url)).then((res) =>
      res.arrayBuffer(),
    ),
    fetch(new URL("./fonts/IBMPlexSans-Medium.ttf", import.meta.url)).then((res) =>
      res.arrayBuffer(),
    ),
    fetch(new URL("./fonts/IBMPlexSans-SemiBold.ttf", import.meta.url)).then((res) =>
      res.arrayBuffer(),
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: GROUND,
          color: BONE,
          padding: "56px 72px",
          position: "relative",
          fontFamily: DATA_STACK,
        }}
      >
        {/* ── Ledger masthead — canonical emblem, wordmark, ember rule ───── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            paddingBottom: 26,
            borderBottom: HAIRLINE,
          }}
        >
          {/* Canonical mark, flat ember — inline SVG matching logo-mark.svg
              (the retired gradient defs and their <linearGradient> are gone). */}
          <svg width="72" height="72" viewBox="0 0 64 64" fill="none">
            <path
              d="M11 38C8 25 18 12 32 12c9.8 0 18 6.7 20.3 15.7"
              stroke={EMBER}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <line
              x1="10"
              y1="16"
              x2="54"
              y2="50"
              stroke={EMBER}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="34" cy="30" r="4" fill={EMBER} />
            <circle cx="34" cy="30" r="1.5" fill={BONE} />
          </svg>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: DISPLAY_STACK,
                fontSize: 54,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: BONE,
              }}
            >
              GALAXY
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "0.34em",
                color: EMBER,
                marginTop: 8,
              }}
            >
              SPORTS EDGE
            </div>
          </div>
        </div>

        {/* ── Eyebrow — ember ledger marker + category ───────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 44,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: BONE,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 10,
              height: 10,
              background: EMBER,
            }}
          />
          Sports intelligence · Live edge engine
        </div>

        {/* ── Headline — the brand-defining line ─────────────────────────── */}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontFamily: DISPLAY_STACK,
            fontSize: 86,
            fontWeight: 800,
            lineHeight: 0.98,
            letterSpacing: "-0.005em",
            color: BONE,
            maxWidth: 1020,
          }}
        >
          {BRAND_TAGLINE}
        </div>

        {/* ── Deck ───────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.35,
            color: BONE,
            maxWidth: 940,
          }}
        >
          Because tout services don&apos;t show the losses.
        </div>

        {/* ── Ledger footer — ember rule, promise line, domain ───────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            borderTop: HAIRLINE,
            paddingTop: 22,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: BONE,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ display: "flex" }}>
            If the work can&apos;t be shown, it doesn&apos;t get published.
          </span>
          <span style={{ display: "flex", color: EMBER }}>
            galaxysportsedge.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Big Shoulders Display",
          data: displayFont,
          style: "normal",
          weight: 800,
        },
        { name: "IBM Plex Sans", data: bodyRegular, style: "normal", weight: 400 },
        { name: "IBM Plex Sans", data: bodyMedium, style: "normal", weight: 500 },
        { name: "IBM Plex Sans", data: bodySemiBold, style: "normal", weight: 600 },
      ],
    },
  );
}
