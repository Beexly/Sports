import type { Config } from "tailwindcss";

/**
 * PickPilot Tailwind config — mirrors the canonical design system.
 *
 * The source of truth for tokens is `design-system/colors_and_type.css`.
 * This file exposes the same values to Tailwind utilities so components
 * can use `bg-carbon`, `text-ion`, `border-mineral`, `text-plasma`, etc.
 *
 * Hard rules from the design system that map into tokens:
 *  - PRIMARY signal is PLASMA MAGENTA (#FF2D8A), NOT cyan or blue.
 *  - SECONDARY is ion-blue (#4FA8FF).
 *  - DEPTH is ultraviolet (#9B7BFA).
 *  - NO gold or amber — explicit rejection of casino energy.
 *  - Lime and cyan are RARE tick accents only (live data, telemetry pings).
 *  - Backgrounds are layered carbon environment, never flat black.
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
        // ── ENVIRONMENT — midnight carbon blue scale ─────
        // Never pure black. Subtle navy undercurrent everywhere.
        void:       "#04060A",
        obsidian:   "#070A11",
        carbon:     "#0B0F18",
        eclipse:    "#11161F",
        titanium:   "#181E28",
        slate:      "#20283A",
        mineral:    "#2E3849",
        "mineral-hi": "#3C4961",

        // ── ION — cool whites & mineral silvers ──────────
        "ion-white": "#EDF2F7",
        ion: {
          DEFAULT: "#D5DDE9",
          1: "#98A3B5",
          2: "#5E6878",
          3: "#3D4555",
        },

        // ── PRIMARY SIGNAL — plasma magenta ──────────────
        plasma: {
          DEFAULT: "#FF2D8A",
          glow: "#FF5BA8",
          deep: "#C81E68",
          ink: "#1A0010",
        },

        // ── SECONDARY — ion blue (cold telemetry) ────────
        "ion-blue": {
          DEFAULT: "#4FA8FF",
          glow: "#7CBFFF",
          deep: "#1F6FCC",
          ink: "#001226",
        },

        // ── DEPTH — soft ultraviolet (model layer) ───────
        ultraviolet: {
          DEFAULT: "#9B7BFA",
          glow: "#BCA4FF",
          deep: "#5A3FCC",
        },

        // ── RARE ACCENTS — data ticks only ───────────────
        lime: {
          DEFAULT: "#D4FF3D",
          glow: "#E8FF6B",
          deep: "#A8CC22",
        },
        "ds-cyan": {
          DEFAULT: "#6FD9FF",
          glow: "#A8E8FF",
          deep: "#2A8FAF",
        },

        // ── INFORMATIONAL ─────────────────────────────────
        verify: "#5FD9A3",
        alert: "#FF6470",

        // ── LEGACY ALIASES — keep older components working
        // Components written before this file existed import `brand-*` and
        // `accent-*`. We re-point those at the canonical signal so the rest
        // of the app picks up the brand without a flag-day refactor.
        brand: {
          50:  "#FFE5F0",
          100: "#FFB8D5",
          200: "#FF8ABA",
          300: "#FF5BA8",
          400: "#FF3F95",
          500: "#FF2D8A",
          600: "#E62277",
          700: "#C81E68",
          800: "#A11954",
          900: "#7A1340",
          950: "#1A0010",
        },
        accent: {
          50:  "#E6F2FF",
          100: "#B8D9FF",
          200: "#8ABFFF",
          300: "#7CBFFF",
          400: "#4FA8FF",
          500: "#3D95F2",
          600: "#1F6FCC",
          700: "#1858A8",
          800: "#114080",
          900: "#0B2D5C",
          950: "#001226",
        },
        ink: {
          // Tailwind-style ink scale that maps to the design system's
          // carbon environment + ion ramps. Used by components written
          // before the design system landed.
          50:   "#EDF2F7",
          100:  "#D5DDE9",
          200:  "#98A3B5",
          300:  "#98A3B5",
          400:  "#5E6878",
          500:  "#3D4555",
          600:  "#2E3849",
          700:  "#20283A",
          800:  "#181E28",
          900:  "#11161F",
          950:  "#070A11",
          1000: "#04060A",
        },
        confidence: {
          high: "#FF2D8A",     // plasma — elite
          mid:  "#4FA8FF",     // ion-blue — strong
          low:  "#98A3B5",     // ion-1 — lean
        },
        risk: {
          low:  "#5FD9A3",
          mid:  "#9B7BFA",
          high: "#FF6470",
        },
      },
      fontFamily: {
        // Mirrors --f-* in colors_and_type.css.
        arch:      ['"Big Shoulders Display"', "Anton", "Impact", "sans-serif"],
        display:   ["Syne", '"Space Grotesk"', "system-ui", "sans-serif"],
        sans:      ["Geist", "Inter", "system-ui", "sans-serif"],
        mono:      ['"Geist Mono"', '"JetBrains Mono"', "ui-monospace", "monospace"],
        numerals:  ['"JetBrains Mono"', '"Geist Mono"', "ui-monospace", "monospace"],
        editorial: ['"Instrument Serif"', '"Iowan Old Style"', "Georgia", "serif"],
      },
      fontSize: {
        "arch-3xl": ["220px", { lineHeight: "0.85" }],
        "arch-2xl": ["160px", { lineHeight: "0.85" }],
        "arch-xl":  ["120px", { lineHeight: "0.88" }],
        "arch-lg":  ["80px",  { lineHeight: "0.92" }],
        "display-2xl": ["clamp(3rem, 8vw, 6rem)", { lineHeight: "0.95", letterSpacing: "-0.02em" }],
        "display-xl":  ["clamp(2.5rem, 6vw, 4rem)", { lineHeight: "1.0", letterSpacing: "-0.02em" }],
        "display-lg":  ["clamp(2rem, 5vw, 3rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        eyebrow:    ["11px", { lineHeight: "1.3", letterSpacing: "0.08em" }],
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
        "glow-plasma":  "0 0 40px -8px rgba(255, 45, 138, 0.45)",
        "glow-ion-blue":"0 0 36px -8px rgba(79, 168, 255, 0.42)",
        "glow-uv":      "0 0 32px -6px rgba(155, 123, 250, 0.38)",
        "glow-lime":    "0 0 32px -8px rgba(212, 255, 61, 0.40)",
        "glow-soft":    "0 0 80px -20px rgba(255, 45, 138, 0.18)",
        glass:
          "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -8px rgba(0,0,0,0.6)",
        pop:
          "0 24px 48px -12px rgba(255,45,138,0.30), 0 0 0 1px rgba(255,45,138,0.20) inset",
        modal: "0 24px 64px -16px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
        float: "0 8px 32px -8px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        "stadium-glow":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,45,138,0.18), transparent 70%)",
        "rule-fade":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
        "accent-stripe":
          "linear-gradient(90deg, transparent 0%, rgba(255,45,138,0.6) 50%, transparent 100%)",
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
