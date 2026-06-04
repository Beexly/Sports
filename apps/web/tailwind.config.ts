import type { Config } from "tailwindcss";

/**
 * Galaxy Sports Edge Tailwind config — cosmic intelligence palette.
 *
 * Canonical palette (verbatim from Brand Use Pack §4):
 *  - OBSIDIAN BLACK  #050608   — primary background
 *  - ION WHITE       #F6F7FA   — primary text / monochrome mark
 *  - ORBITAL CYAN    #00E5FF   — signal, data, active states
 *  - ION MAGENTA     #FF2DD6   — alert signal / emphasis
 *  - SOFT ULTRAVIOLET #7A5CFF  — depth, intelligence, secondary signal
 *  - STEEL GRAY      #1A1D23   — panels, dividers, UI depth
 *
 * Typography is bound to the doctrine CSS variables loaded through
 * next/font in `app/layout.tsx`.
 *
 * Legacy aliases (brand-*, accent-*, plasma-*, ion-blue-*) are kept and
 * REPOINTED to the new palette. No component refactor required.
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
        // ── CANONICAL GALAXY SPORTS EDGE PALETTE ─────────
        "obsidian-black":    "#050608",
        "ion-white-2":       "#F6F7FA",   // distinct from the .ion-white alias
        "orbital-cyan":      "#00E5FF",
        "ion-magenta":       "#FF2DD6",
        "soft-ultraviolet":  "#7A5CFF",
        "steel-gray":        "#1A1D23",

        // ── ENVIRONMENT — cosmic dark scale ───────────────
        // Surfaces step from #050608 (deepest) up to #2E3849 (raised).
        void:       "#050608",
        obsidian:   "#080A0F",
        carbon:     "#0D1117",
        eclipse:    "#11161F",
        titanium:   "#1A1D23",        // Steel Gray sits here
        slate:      "#20283A",
        mineral:    "#2E3849",
        "mineral-hi": "#3C4961",

        // ── ION — cool whites & mineral silvers ───────────
        "ion-white": "#F6F7FA",
        ion: {
          DEFAULT: "#D5DDE9",
          1: "#98A3B5",
          2: "#5E6878",
          3: "#3D4555",
        },

        // ── PRIMARY SIGNAL — ion magenta ──────────────────
        plasma: {
          DEFAULT: "#FF2DD6",
          glow: "#FF66E0",
          deep: "#C81EAA",
          ink: "#1A0014",
        },

        // ── SECONDARY — orbital cyan (live signal) ────────
        "ion-blue": {
          DEFAULT: "#00E5FF",
          glow: "#5BEEFF",
          deep: "#00A8BF",
          ink: "#001226",
        },

        // ── DEPTH — soft ultraviolet (model layer) ────────
        ultraviolet: {
          DEFAULT: "#7A5CFF",
          glow: "#9F87FF",
          deep: "#5942CC",
        },

        // ── ACCENT — orbital cyan (live telemetry pings) ──
        "ds-cyan": {
          DEFAULT: "#00E5FF",
          glow: "#5BEEFF",
          deep: "#00A8BF",
        },
        lime: {
          DEFAULT: "#D4FF3D",
          glow: "#E8FF6B",
          deep: "#A8CC22",
        },

        // ── INFORMATIONAL ─────────────────────────────────
        verify: "#5FD9A3",
        alert: "#FF6470",

        // ── LEGACY ALIASES — repointed to GSE palette ─────
        // Components written under prior brands use `brand-*` and `accent-*`.
        // The scales below resolve to the new tokens automatically, so the
        // whole app inherits Galaxy Sports Edge without a refactor.
        brand: {
          50:  "#FFE3F6",
          100: "#FFB8E8",
          200: "#FF8ADA",
          300: "#FF6FD8",
          400: "#FF55D0",
          500: "#FF3BC7",
          600: "#E62EB1",
          700: "#C81E9C",
          800: "#A11578",
          900: "#7A0E58",
          950: "#1A0014",
        },
        accent: {
          50:  "#E6F8FF",
          100: "#B8EEFF",
          200: "#8AE3FF",
          300: "#5BD8FF",
          400: "#33CEFF",
          500: "#00E5FF",
          600: "#00B8CC",
          700: "#008CA0",
          800: "#005F73",
          900: "#003647",
          950: "#001226",
        },
        ink: {
          50:   "#F5F7FF",
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
          1000: "#05070B",
        },
        confidence: {
          high: "#FF3BC7",     // ion magenta — elite
          mid:  "#7B61FF",     // ultraviolet — strong
          low:  "#98A3B5",     // ion-1 — lean
        },
        risk: {
          low:  "#5FD9A3",
          mid:  "#7B61FF",
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
        "glow-plasma":  "0 0 40px -8px rgba(255, 59, 199, 0.45)",
        "glow-ion-blue":"0 0 36px -8px rgba(42, 107, 255, 0.42)",
        "glow-uv":      "0 0 32px -6px rgba(123, 97, 255, 0.38)",
        "glow-cyan":    "0 0 32px -6px rgba(0, 229, 255, 0.40)",
        "glow-lime":    "0 0 32px -8px rgba(212, 255, 61, 0.40)",
        "glow-soft":    "0 0 80px -20px rgba(0, 229, 255, 0.18)",
        glass:
          "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -8px rgba(0,0,0,0.6)",
        pop:
          "0 24px 48px -12px rgba(255,59,199,0.30), 0 0 0 1px rgba(0,229,255,0.20) inset",
        modal: "0 24px 64px -16px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
        float: "0 8px 32px -8px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        "stadium-glow":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,229,255,0.16), rgba(255,59,199,0.10) 35%, transparent 70%)",
        "cosmic-sweep":
          "linear-gradient(135deg, rgba(0,229,255,0.18) 0%, rgba(123,97,255,0.18) 50%, rgba(255,59,199,0.18) 100%)",
        "rule-fade":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
        "accent-stripe":
          "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.6) 30%, rgba(255,59,199,0.6) 70%, transparent 100%)",
      },
      animation: {
        "live-pulse": "live-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        "marquee-x": "marquee-x 40s linear infinite",
        "ambient-drift": "ambient-drift 22s ease-in-out infinite alternate",
        "signature-spin": "signature-spin 90s linear infinite",
        "cursor-blink": "cursor-blink 1.1s steps(2, end) infinite",

        // ── State-communicating motion system (2026 pass) ──
        // Keyframes are defined once in app/globals.css (single source of
        // truth, same pattern as pp-live-pulse) so raw-CSS / inline-style
        // consumers and these utilities share identical timing. See the
        // motion-system section of globals.css for what each state means.
        boot: "boot 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
        breach: "breach 620ms cubic-bezier(0.2, 0, 0, 1) both",
        scan: "scan 4.6s cubic-bezier(0.45, 0, 0.55, 1) infinite",
        acquire: "acquire 540ms cubic-bezier(0.16, 1, 0.3, 1) both",
        hold: "hold 520ms cubic-bezier(0.2, 0, 0, 1) both",
        "pulse-ring": "pulse-ring 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        orbit: "orbit 48s linear infinite",
        impact: "impact 460ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        autopsy: "autopsy 760ms cubic-bezier(0.16, 1, 0.3, 1) both",
        transmit: "transmit 3.4s ease-in-out infinite",
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
