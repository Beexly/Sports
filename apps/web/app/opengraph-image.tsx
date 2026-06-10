import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

/**
 * Default OpenGraph image — Galaxy Sports Edge.
 *
 * 1200×630 — the Twitter / Facebook / LinkedIn standard. Edge runtime so
 * cold starts stay fast. The card features the orbital mark, the GALAXY /
 * SPORTS EDGE lockup, the tagline, and the brand closer.
 *
 * COLOR — matured system (mirrors styles/design-tokens.css, audit Option B):
 *   The working cyan is the SOFTENED accent family, not the original
 *   full-saturation orbital cyan. Satori cannot read CSS variables, so the
 *   token values are hardcoded here; if design-tokens.css changes, this
 *   file must follow.
 *     accent-cyan        #2BC4DD   working accent (wordmark, domain, rule)
 *     accent-cyan-pure   #00E5FF   the ONE full-saturation accent allowed
 *                                  per screen — spent on the live dot only
 *     plasma             #FF2DD6   ion magenta (mark core + edge vector)
 *     ultraviolet-glow   #9F87FF   eyebrow + secondary orbit (AA on dark;
 *                                  base #7A5CFF is 4.4:1 and fails as text)
 *     ion-white          #F6F7FA   display text        (17.7:1 — AA)
 *     ion                #D5DDE9   subhead             (13.8:1 — AA)
 *     ion-1              #98A3B5   footer meta         ( 7.4:1 — AA)
 *     surfaces           #11161F → #0A0D12 → #050608 (eclipse → sunken →
 *                                  obsidian, replacing the old blue-violet
 *                                  #1A1D33 wash)
 *
 * FONT — deliberate system fallback, documented decision:
 *   Satori cannot use next/font, and `next/og` bundles exactly one face:
 *   Noto Sans regular. Loading Syne (the site's --f-display) would require
 *   either (a) a request-time fetch of a font CDN at the edge — a flaky
 *   network dependency on every cold social-card render — or (b) committing
 *   a font binary to the repo. Neither passes the no-new-dependency bar, so
 *   this card intentionally renders in the bundled Noto Sans and carries
 *   the brand through the lockup's tracking, case, scale, and color
 *   instead. The previous `fontFamily: "'Exo 2', …"` / `fontWeight`
 *   declarations were dead code (Satori silently ignores families and
 *   weights it has not loaded) and were removed rather than left implying
 *   they render.
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(120% 80% at 70% 0%, #11161F 0%, #0A0D12 55%, #050608 100%)",
          color: "#F6F7FA",
          padding: "72px 88px",
          position: "relative",
        }}
      >
        {/* Cyan accent — upper-left orbital glow (softened accent family) */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(43,196,221,0.32) 0%, rgba(122,92,255,0.12) 60%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Magenta accent — lower-right signal glow */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -140,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(255,45,214,0.36) 0%, rgba(122,92,255,0.15) 60%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Brand mark + wordmark — geometry ported from BrandLockup's
            GalaxyMark (components/brand/brand-lockup.tsx) so the card
            matches the mark the nav and footer actually render. */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="92" height="92" viewBox="0 0 64 64" fill="none">
            <path
              d="M11 38C8 25 18 12 32 12c9.8 0 18 6.7 20.3 15.7"
              stroke="#F6F7FA"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <path
              d="M53 25c3 13-7 27-21 27-8.7 0-16.2-5.4-19.3-13"
              stroke="#9F87FF"
              strokeWidth="3.8"
              strokeLinecap="round"
              opacity="0.72"
            />
            <path
              d="M10 16l44 34"
              stroke="#FF2DD6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M18 51l30-39"
              stroke="#2BC4DD"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.92"
            />
            <circle cx="34" cy="30" r="6" fill="#FF2DD6" />
            <circle cx="48" cy="15" r="3" fill="#2BC4DD" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <div
              style={{
                fontSize: 56,
                letterSpacing: "0.14em",
                color: "#F6F7FA",
                display: "flex",
              }}
            >
              GALAXY
            </div>
            <div
              style={{
                fontSize: 28,
                letterSpacing: "0.30em",
                color: "#2BC4DD",
                marginTop: 10,
                display: "flex",
              }}
            >
              SPORTS EDGE
            </div>
          </div>
        </div>

        {/* Eyebrow — founder anchor instead of product chrome. The dot is
            the card's single full-saturation cyan accent. */}
        <div
          style={{
            marginTop: 80,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#9F87FF",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#00E5FF",
              display: "flex",
            }}
          />
          Sports intelligence · Live edge engine
        </div>

        {/* Tagline — locked copy from Brand Use Pack §7 */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            fontSize: 76,
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
            color: "#F6F7FA",
            maxWidth: 980,
          }}
        >
          {BRAND_TAGLINE}
        </div>

        {/* Personal subhead — the reason it exists, in my voice */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            fontSize: 26,
            lineHeight: 1.35,
            color: "#D5DDE9",
            maxWidth: 920,
            fontStyle: "italic",
          }}
        >
          Because tout services don&apos;t show the losses.
        </div>

        {/* Footer — a principle, signed */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#98A3B5",
            borderTop: "1px solid rgba(43, 196, 221, 0.22)",
            paddingTop: 28,
          }}
        >
          <span>If the work can&apos;t be shown, it doesn&apos;t get published.</span>
          <span style={{ color: "#2BC4DD" }}>galaxysportsedge.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
