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
        // Softened working cyan (hsl 191,68%,52%); `orbital-cyan-pure` keeps
        // full-saturation #00E5FF for the rare single-CTA accent per screen.
        "orbital-cyan":      "#2BC4DD",
        "orbital-cyan-pure": "#00E5FF",
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

        // ── SURFACE — CANONICAL unified dark elevation scale (ADDITIVE) ──
        // New token group ported from canonical. ONE base black + a premium
        // elevation ladder. Mirrors the --surface-* CSS vars in
        // design-tokens.css. No existing deploy key references these names.
        //   bg-surface / -base / -raised / -sunken / -overlay,
        //   border-surface-line / -line-strong
        surface: {
          DEFAULT: "#0D1117",  // base canvas → bg-surface
          base:    "#0D1117",  // explicit base → bg-surface-base
          raised:  "#161B22",  // cards/tables → bg-surface-raised
          sunken:  "#0A0D12",  // tracks/wells → bg-surface-sunken
          overlay: "#1C2128",  // overlays → bg-surface-overlay
          line:    "#30363D",  // hairline → border-surface-line
          "line-strong": "#3C4961", // stronger divider → border-surface-line-strong
        },

        // ── DATA PALETTE — "data is the color" on dark (ADDITIVE) ────────
        // Bar/dot FILLS and AA signal TEXT for the viz kit. New group; no
        // existing deploy key references these names.
        data: {
          "good":         "#34D399",  // emerald-400 — positive FILL
          "good-text":    "#6EE7B7",  // emerald-300 — AA signal TEXT on dark
          "bad":          "#FB7185",  // rose-400 — negative FILL
          "bad-text":     "#FDA4AF",  // rose-300 — AA signal TEXT on dark
          "neutral":      "#5B6678",  // muted — "no signal" FILL
          "neutral-text": "#9AA6B8",  // ion-2 — AA muted meta TEXT on dark
          "track":        "#0A0D12",  // == surface-sunken — bar TRACK
        },

        // ── ION — cool whites & mineral silvers (DARK SCALE) ──
        // Marketing / cinematic text on carbon #0D1117. ion-2 / ion-3 were
        // re-valued to pass WCAG AA (>=4.5:1) as text; see design-tokens.css.
        "ion-white": "#F6F7FA",
        ion: {
          DEFAULT: "#D5DDE9", // 13.83:1 on carbon
          1: "#98A3B5",       // 7.43:1 on carbon
          2: "#9AA6B8",       // was #5E6878 (3.36:1 FAIL) → 7.68:1 PASS
          3: "#8B97AB",       // was #3D4555 (1.97:1 FAIL) → 6.41:1 PASS
        },

        // ── PAPER — LIGHT data-surface scale (ADDITIVE) ───
        // New light-surface token group ported from canonical for data
        // surfaces (tables/tools/boards). No existing deploy key references
        // these names. Accents-on-light are AA text accents on paper.
        paper: {
          DEFAULT: "#F7F8FB",  // page bg → bg-paper
          raised:  "#FFFFFF",  // cards → bg-paper-raised
          sunken:  "#F0F2F6",  // zebra → bg-paper-sunken
          border:  "#D9DEE7",  // hairline → border-paper-border
        },
        "plasma-on-light":       "#B0118C", // 5.98:1 on paper — text accent
        "orbital-cyan-on-light": "#06748A", // 5.11:1 on paper — text accent
        "ultraviolet-on-light":  "#5B43C9", // 6.40:1 on paper — text accent

        // ── PRIMARY SIGNAL — ion magenta ──────────────────
        plasma: {
          DEFAULT: "#FF2DD6",
          glow: "#FF66E0",
          deep: "#C81EAA",
          ink: "#1A0014",
        },

        // ── SECONDARY — orbital cyan (live signal) ────────
        // Softened from hsl(191,100%,52%) #00E5FF → hsl(191,68%,52%) #2BC4DD
        // per audit Option B (long-session eye strain). `pure` keeps the full
        // saturation for the ONE primary CTA per screen the doc allows.
        "ion-blue": {
          DEFAULT: "#2BC4DD",
          glow: "#6FDDEE",
          deep: "#1A93A8",
          pure: "#00E5FF",
          ink: "#001226",
        },
        "accent-cyan": {
          DEFAULT: "#2BC4DD",
          glow: "#6FDDEE",
          deep: "#1A93A8",
          pure: "#00E5FF",
        },

        // ── DEPTH — soft ultraviolet (model layer) ────────
        ultraviolet: {
          DEFAULT: "#7A5CFF",
          glow: "#9F87FF",
          deep: "#5942CC",
        },

        // ── ACCENT — orbital cyan (live telemetry pings) ──
        // Softened to match the working accent; `pure` for rare full-sat CTA.
        "ds-cyan": {
          DEFAULT: "#2BC4DD",
          glow: "#6FDDEE",
          deep: "#1A93A8",
          pure: "#00E5FF",
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
          500: "#2BC4DD",   // softened from #00E5FF (audit Option B)
          600: "#1A93A8",
          700: "#137585",
          800: "#005F73",
          900: "#003647",
          950: "#001226",
        },
        ink: {
          // LIGHT body inks for the PAPER data-surface scale (ADDITIVE).
          // text-ink / text-ink-1 / text-ink-2 — all WCAG AA on --paper.
          // No prior usages of these names; numeric ramp below is untouched.
          DEFAULT: "#0E1320",  // body — 17.46:1 on paper
          1:    "#3A4356",     // secondary — 9.34:1 on paper
          2:    "#5B6678",     // muted meta — 5.47:1 on paper
          // ── legacy DARK ramp (unchanged) — ink-50..ink-1000 ──
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
        // Mid/small display steps complete the editorial headline ramp so data
        // pages have a confident section-title scale (mirrors --t-display-md/sm).
        "display-md":  ["clamp(1.5rem, 3vw, 2rem)", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        "display-sm":  ["clamp(1.25rem, 2vw, 1.5rem)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
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
