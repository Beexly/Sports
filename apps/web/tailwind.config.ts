import type { Config } from "tailwindcss";

/**
 * Galaxy Sports Edge Tailwind config — FIELD palette (approved 2026-09-10).
 *
 * Canonical palette:
 *  - GROUND #08090C — near-black page canvas
 *  - PANEL  #12141A — cards / raised
 *  - PANEL-2 #191C23 — nested / hover
 *  - BONE   #EDE8E0 — primary text / identity
 *  - FOG    #C4BFB6 — secondary text
 *  - MIST   #8F8A82 — muted meta
 *  - EMBER  #FF4D2E — the single action accent
 *  - LINE   #23262E — hairline borders
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
        // ── FIELD CANONICAL (approved 2026-09-10) ─────────
        "obsidian-black":    "#08090C",
        "ion-white-2":       "#EDE8E0",   // bone identity
        "orbital-cyan":      "#C4BFB6",   // retired → bone-1 (name kept)
        "ion-magenta":       "#FF4D2E",   // Field signal — ember (name kept)
        "soft-ultraviolet":  "#C4BFB6",   // retired → bone-1 (name kept)
        "electric-blue":     "#12141A",   // retired → panel (name kept)
        "nebula-purple":     "#191C23",   // retired → panel-2 (name kept)
        "cosmic-gray":       "#08090C",   // surface → ground
        "steel-gray":        "#191C23",

        // ── RETIRED DECORATIVE FILLS — FLAT (redline: no gradients) ──
        // These four were `backgroundImage` gradients. They are kept under the
        // same `bg-*` names so call sites (bg-signal-fade accent bars,
        // bg-rule-fade hairlines, bg-accent-stripe rules) need no edit; each
        // now resolves to one flat canonical palette value.
        "signal-fade":       "#FF4D2E",   // ember accent rule
        "signal-fade-135":   "#FF4D2E",
        "rule-fade":         "#23262E",   // mineral hairline
        "accent-stripe":     "#FF4D2E",

        // ── ENVIRONMENT — Field dark scale ────────────────
        void:       "#08090C",
        obsidian:   "#08090C",
        carbon:     "#08090C",
        eclipse:    "#12141A",
        titanium:   "#191C23",
        slate:      "#191C23",
        mineral:    "#23262E",
        "mineral-hi": "#31353F",

        // ── BONE / FOG / MIST text ──
        "ion-white": "#EDE8E0",
        ion: {
          DEFAULT: "#EDE8E0",
          1: "#C4BFB6",
          2: "#8F8A82",
          3: "#8F8A82",
        },

        // ── PAPER — LIGHT data-surface scale (ADDITIVE) ───
        paper: {
          DEFAULT: "#F4F1EB",
          raised:  "#FAF8F4",
          sunken:  "#E9E5DC",
          border:  "#D8D2C6",
        },
        "plasma-on-light":       "#B33D22",
        "orbital-cyan-on-light": "#5B6678",
        "ultraviolet-on-light":  "#5B6678",   // retired violet -> = --ultraviolet-on-light
        "verify-on-light":       "#0E1320",
        "alert-on-light":        "#0E1320",
        "alarm-on-light":        "#9A4D00",
        "caution-on-light":      "#9A4D00",

        // ── FIELD EMBER — the single action accent ──────
        plasma: {
          DEFAULT: "#FF4D2E",
          glow: "#FF7A5C",
          deep: "#C22E1A",
          ink: "#1A0703",
        },

        // ── IRIS — RETIRED periwinkle → fog (matches design-tokens --iris) ──
        // No purple in FIELD. Names kept so `text-iris` / `border-iris` call
        // sites keep compiling; every step reads as fog/bone.
        iris: {
          DEFAULT: "#C4BFB6",
          glow: "#EDE8E0",
          deep: "#8F8A82",
        },
        "ion-blue": {
          DEFAULT: "#C4BFB6",
          glow: "#EDE8E0",
          deep: "#8F8A82",
          ink: "#08090C",
        },

        // ── RETIRED VIOLET → bone-1 text ───────────────────
        ultraviolet: {
          DEFAULT: "#C4BFB6",
          glow: "#EDE8E0",
          deep: "#8F8A82",
        },

        // ── RETIRED CYAN → bone-1 ──────────────────────────────
        "ds-cyan": {
          DEFAULT: "#C4BFB6",
          glow: "#EDE8E0",
          deep: "#8F8A82",
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
        // FIELD (owner-approved 2026-09-10) keeps the semantic ladder:
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
          // ── legacy DARK ramp — repointed FIELD ──
          50:   "#EDE8E0",
          100:  "#C4BFB6",
          200:  "#C4BFB6",
          300:  "#8F8A82",
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
          mid:  "#C4BFB6",     // = --conf-solid (fog)
          low:  "#8F8A82",     // = --conf-lean (mist)
        },
        risk: {
          low:  "#5FD9A3",
          mid:  "#C4BFB6",
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
        // RETIRED (redline: no glow, no glass). Names are kept so `shadow-glow-*`
        // / `shadow-glass` call sites keep compiling. Every halo resolves to
        // `none`; the two elevation aliases lose their ember halo and their
        // inset highlight so they read as plain depth, not emitted light.
        "glow-plasma":  "none",
        "glow-ion-blue":"none",
        "glow-uv":      "none",
        "glow-cyan":    "none",
        "glow-lime":    "none",
        "glow-soft":    "none",
        glass: "0 12px 32px -8px rgba(0,0,0,0.6)",
        pop: "0 24px 48px -12px rgba(0,0,0,0.7)",
        modal: "0 24px 64px -16px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
        float: "0 8px 32px -8px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        // RETIRED (redline: no gradients, no glow). The flat ember / mineral
        // fills that replaced signal-fade, signal-fade-135, rule-fade and
        // accent-stripe now live in `colors`, so `bg-*` still paints. The two
        // atmosphere washes have no flat equivalent (they were pure decoration),
        // so their names stay defined as a no-op: `bg-stadium-glow` /
        // `bg-cosmic-sweep` call sites still compile against a real utility.
        "stadium-glow": "none",
        "cosmic-sweep": "none",
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
