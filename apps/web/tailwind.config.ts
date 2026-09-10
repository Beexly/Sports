import type { Config } from "tailwindcss";

/**
 * Galaxy Sports Edge Tailwind config — NEBULA v7 palette (approved 2026-09-10).
 *
 * Canonical palette (NEBULA v7 commit):
 *  - GROUND #060F0E — teal-black page canvas
 *  - PANEL  #131022 — violet-black cards / raised
 *  - PANEL-2 #1B1530 — violet lift, nested / hover
 *  - BONE   #EDE8E0 — primary text / identity
 *  - FOG    #C9D4CE — secondary text
 *  - MIST   #A7B8B2 — muted meta
 *  - EMBER  #FF4D2E — the single action accent
 *  - LINE   #2A3532 — hairline borders
 *  verify/alert/caution ladder kept for settlement + data states only.
 *
 * Legacy names (brand-*, accent-*, plasma-*, ion-blue-*, orbital-cyan, …)
 * are kept and REPOINTED. No component refactor required.
 */

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── NEBULA v7 CANONICAL (approved 2026-09-10) ─────────
        "obsidian-black":    "#060F0E",
        "ion-white-2":       "#EDE8E0",   // bone identity
        "orbital-cyan":      "#C9D4CE",   // retired → fog (name kept, call sites compile)
        "ion-magenta":       "#FF4D2E",   // retired → ember (name kept)
        "soft-ultraviolet":  "#C9D4CE",   // retired → fog (name kept)
        "electric-blue":     "#131022",   // retired → panel (name kept)
        "nebula-purple":     "#1B1530",   // retired → panel-2 (name kept)
        "cosmic-gray":       "#060F0E",   // surface → ground
        "steel-gray":        "#1B1530",

        // ── ENVIRONMENT — nebula dark scale ────────────────
        void:       "#060F0E",
        obsidian:   "#060F0E",
        carbon:     "#060F0E",
        eclipse:    "#131022",
        titanium:   "#1B1530",
        slate:      "#1B1530",
        mineral:    "#2A3532",
        "mineral-hi": "#3A4A46",

        // ── BONE / FOG / MIST text ──
        "ion-white": "#EDE8E0",
        ion: {
          DEFAULT: "#EDE8E0", // 15.91:1 on ground
          1: "#C9D4CE",       // fog
          2: "#A7B8B2",       // mist
          3: "#A7B8B2",       // mist
        },

        // ── PAPER — LIGHT data-surface scale (ADDITIVE) ───
        // Data surfaces (tables/tools/boards). All text tokens pass WCAG AA
        // on paper; accents-on-light are darkened for AA text use only.
        paper: {
          DEFAULT: "#F7F8FB",  // page bg → bg-paper
          raised:  "#FFFFFF",  // cards → bg-paper-raised
          sunken:  "#F0F2F6",  // zebra → bg-paper-sunken
          border:  "#D9DEE7",  // hairline → border-paper-border
        },
        "plasma-on-light":       "#B0118C", // 5.98:1 on paper — text accent
        "orbital-cyan-on-light": "#06748A", // 5.11:1 on paper — text accent
        "ultraviolet-on-light":  "#5B43C9", // 6.40:1 on paper — text accent
        // Semantic-on-light — the paper-surface half of Law 2.
        // Outcome carries no colour here either: verify/alert resolve to the
        // paper text colour. Only `caution-on-light` keeps a hue, because it is
        // system state (stale / degraded), not a result.
        "verify-on-light":       "#0E1320", // = --ink, 17.46:1 on paper. Neutral.
        "alert-on-light":        "#0E1320", // = --ink, 17.46:1 on paper. Neutral.
        "alarm-on-light":        "#9A4D00", // 5.76:1 on paper — system failure only
        "caution-on-light":      "#9A4D00", // 5.76:1 on paper — system state

        // ── NEBULA v7 EMBER — the single action accent ──────
        plasma: {
          DEFAULT: "#FF4D2E",
          glow: "#FF7A5C",
          deep: "#C22E1A",
          ink: "#1A0703",
        },

        // ── RETIRED CYAN → fog (calm text, never action) ───
        "ion-blue": {
          DEFAULT: "#C9D4CE",
          glow: "#E4EBE7",
          deep: "#A7B8B2",
          ink: "#060F0E",
        },

        // ── RETIRED VIOLET → fog text ───────────────────────
        ultraviolet: {
          DEFAULT: "#C9D4CE",
          glow: "#E4EBE7",
          deep: "#A7B8B2",
        },

        // ── RETIRED CYAN → fog ──────────────────────────────
        "ds-cyan": {
          DEFAULT: "#C9D4CE",
          glow: "#E4EBE7",
          deep: "#A7B8B2",
        },
        lime: {
          DEFAULT: "#FF4D2E",
          glow: "#FF7A5C",
          deep: "#C22E1A",
        },

        // ── OUTCOME — NEUTRALISED (design contract Law 2) ──
        // "Nothing reacts to outcome." A win, a loss, a push and a void are set
        // in the same type, size, weight and colour; only the WORD differs. So
        // `verify` and `alert` resolve to the ordinary text colour and carry no
        // valence at all.
        //
        // Kept as hex, not var(), on purpose: 564 uses across the app carry
        // Tailwind opacity modifiers (bg-alert/20, text-caution/50) and a var()
        // colour breaks every one of them. Hex keeps them all compiling.
        //
        // Deliberately repointed rather than deleted. Deleting would touch 150
        // files; repointing enforces Law 2 everywhere at once and lets call
        // sites be cleaned up incrementally. A `text-alert` that renders as body
        // text is correct under Law 2, not a bug.
        //
        // Genuine system failure is NOT an outcome — see `alarm` below.
        // NEBULA v7 (owner-approved 2026-09-10) keeps the semantic ladder:
        // verify/alert carry hue for settlement + data states only, never brand.
        // This supersedes the Law-2 neutralization; `alarm` (system failure)
        // stays as the louder tier.
        verify: "#5FD9A3", // settlement W
        alert: "#FF6470", // settlement L / critical

        // ── SYSTEM STATE — the only thing that may still shout ──
        // Source outage, stale feed, settlement lag. Never a result.
        // `caution` is repointed here: "incomplete data / review needed" was
        // always system state, never outcome, so it survives Law 2 intact.
        alarm: {
          DEFAULT: "#FFB454",
          deep: "#B5781F",
        },
        caution: {
          DEFAULT: "#FFB454",
          deep: "#B5781F",
        },

        // ── LEGACY ALIASES — repointed to GSE palette ─────
        // Components written under prior brands use `brand-*` and `accent-*`.
        // The scales below resolve to the new tokens automatically, so the
        // whole app inherits Galaxy Sports Edge without a refactor.
        brand: {
          50:  "#FDEEE9",
          100: "#FAC9BB",
          200: "#F7A48D",
          300: "#F47F60",
          400: "#F7613F",
          500: "#FF4D2E",
          600: "#D63A1F",
          700: "#A82D18",
          800: "#722013",
          900: "#3D120B",
          950: "#1A0703",
        },
        accent: {
          50:  "#FDEEE9",
          100: "#FAC9BB",
          200: "#F7A48D",
          300: "#F47F60",
          400: "#F7613F",
          500: "#FF4D2E",
          600: "#D63A1F",
          700: "#A82D18",
          800: "#722013",
          900: "#3D120B",
          950: "#1A0703",
        },
        ink: {
          // LIGHT body inks for the PAPER data-surface scale (ADDITIVE).
          // text-ink / text-ink-1 / text-ink-2 — all WCAG AA on --paper.
          // (No prior usages of these names; numeric ramp below is untouched.)
          DEFAULT: "#0E1320",  // body — 17.46:1 on paper
          1:    "#3A4356",     // secondary — 9.34:1 on paper
          2:    "#5B6678",     // muted meta — 5.47:1 on paper
          // ── legacy DARK ramp — repointed NEBULA v7 ──
          50:   "#EDE8E0",
          100:  "#C9D4CE",
          200:  "#C9D4CE",
          300:  "#A7B8B2",
          400:  "#5E6878",
          500:  "#3D4555",
          600:  "#2E3849",
          700:  "#20283A",
          800:  "#181E28",
          900:  "#11161F",
          950:  "#070A11",
          1000: "#05070B",
        },
        // Repointed to canonical --conf-* hexes (design-tokens.css) — was
        // drifted (#FF3BC7 vs canonical plasma #FF38C7) and unused; kept as
        // a legacy 3-tier alias so it can't silently diverge again.
        confidence: {
          high: "#FF4D2E",     // = --conf-elite (ember)
          mid:  "#C9D4CE",     // = --conf-solid (fog)
          low:  "#A7B8B2",     // = --conf-lean (mist)
        },
        risk: {
          low:  "#5FD9A3",
          mid:  "#C9D4CE",
          high: "#FF6470",
        },
      },
      fontFamily: {
        arch: ["var(--f-arch)"],
        display: ["var(--f-display)"],
        sans: ["var(--f-body)"],
        mono: ["var(--f-mono)"],
        numerals: ["var(--f-numerals)"],
        editorial: ["var(--f-editorial)"],
      },
      fontSize: {
        "arch-3xl": ["220px", { lineHeight: "0.85" }],
        "arch-2xl": ["160px", { lineHeight: "0.85" }],
        "arch-xl":  ["120px", { lineHeight: "0.88" }],
        "arch-lg":  ["80px",  { lineHeight: "0.92" }],
        "display-2xl": ["clamp(3rem, 8vw, 6rem)", { lineHeight: "0.95", letterSpacing: "-0.02em" }],
        "display-xl":  ["clamp(2.5rem, 6vw, 4rem)", { lineHeight: "1.0", letterSpacing: "-0.02em" }],
        "display-lg":  ["clamp(2rem, 5vw, 3rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        eyebrow:    ["12px", { lineHeight: "1.3", letterSpacing: "0.08em" }], // floor bumped 11→12px
        "eyebrow-lg": ["13px", { lineHeight: "1.3", letterSpacing: "0.08em" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      spacing: {
        "ds-1": "4px",
        "ds-2": "8px",
        "ds-3": "12px",
        "ds-4": "16px",
        "ds-5": "20px",
        "ds-6": "24px",
        "ds-8": "32px",
        "ds-10": "40px",
        "ds-12": "48px",
        "ds-16": "64px",
        "ds-20": "80px",
        "ds-24": "96px",
        "ds-30": "120px",
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      borderRadius: {
        "ds-xs":  "3px",
        "ds-sm":  "6px",
        "ds-md":  "10px",
        "ds-lg":  "14px",
        "2.5xl":  "1.25rem",
      },
      boxShadow: {
        "glow-plasma":  "0 0 40px -8px rgba(255, 77, 46, 0.45)",
        "glow-ion-blue":"0 0 36px -8px rgba(27, 21, 48, 0.9)",
        "glow-uv":      "0 0 32px -6px rgba(27, 21, 48, 0.9)",
        "glow-cyan":    "0 0 32px -6px rgba(201, 212, 206, 0.25)",
        "glow-lime":    "0 0 32px -8px rgba(255, 77, 46, 0.40)",
        "glow-soft":    "0 0 80px -20px rgba(255, 77, 46, 0.20)",
        glass:
          "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -8px rgba(0,0,0,0.6)",
        pop:
          "0 24px 48px -12px rgba(255,77,46,0.30), 0 0 0 1px rgba(201,212,206,0.20) inset",
        modal: "0 24px 64px -16px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
        float: "0 8px 32px -8px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        // NEBULA v7: the signature gradient is retired. signal-fade resolves
        // to flat ember (rules/wordmark accents); atmosphere bands carry the
        // violet depth instead of decorative color washes.
        "signal-fade":
          "linear-gradient(90deg, #FF4D2E 0%, #FF4D2E 100%)",
        "signal-fade-135":
          "linear-gradient(135deg, #FF4D2E 0%, #FF4D2E 100%)",
        "stadium-glow":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(27,21,48,0.9), rgba(255,77,46,0.10) 35%, transparent 70%)",
        "cosmic-sweep":
          "linear-gradient(135deg, rgba(27,21,48,0.6) 0%, rgba(19,16,34,0.6) 50%, rgba(255,77,46,0.08) 100%)",
        "rule-fade":
          "linear-gradient(90deg, transparent 0%, rgba(237,232,224,0.14) 50%, transparent 100%)",
        "accent-stripe":
          "linear-gradient(90deg, transparent 0%, rgba(255,77,46,0.7) 30%, rgba(255,77,46,0.7) 70%, transparent 100%)",
      },
      animation: {
        "live-pulse": "live-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        "marquee-x": "marquee-x 40s linear infinite",
        "ambient-drift": "ambient-drift 22s ease-in-out infinite alternate",
        "signature-spin": "signature-spin 90s linear infinite",
        "cursor-blink": "cursor-blink 1.1s steps(2, end) infinite",
      },
      keyframes: {
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(1.6)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "marquee-x": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "ambient-drift": {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "100%": { transform: "translate3d(8%, 6%, 0) scale(1.08)" },
        },
        "signature-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "cursor-blink": {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ds-out": "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
