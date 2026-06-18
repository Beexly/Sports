import { BRAND_COLORS } from "@/lib/brand";

/**
 * PickEnhancement — Before/After demonstration of GSE value-add.
 *
 * Inspired by the Taste-Skill Before/After pattern: side-by-side comparison
 * that makes the product upgrade immediately legible. Before is muted, sparse,
 * and raw; After is rich with reasoning, confidence, and a tamper-evident receipt.
 *
 * Self-contained demo component — no props, no client state.
 * Server component safe.
 *
 * Styling: Tailwind utilities + canonical palette tokens. Brand colors come
 * from `BRAND_COLORS` (single source of truth in `@/lib/brand`); inline
 * `style` is used only where a specific brand hue needs a tinted background,
 * border, or glow that isn't a clean utility. Small ultraviolet text uses the
 * lighter glow (`#9F87FF`) for WCAG AA, never solid `#7A5CFF`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Feature strip data
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: "Full factor trail",
    body: "Not just the pick, but why. Every signal earns its reasoning.",
  },
  {
    title: "Market movement",
    body: "Opening line to current line to projected close, all tracked.",
  },
  {
    title: "Tamper-evident receipt",
    body: "Issued before the event. The record cannot be quietly edited.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────

export function PickEnhancement(): JSX.Element {
  return (
    <div>
      {/* ── Illustrative-example disclaimer ──
          Non-negotiable rule #2 (no fabricated stats): this is a marketing
          mockup, not a real published pick. Mirrors the SignalCourtroom
          `illustrative` badge so nothing is ever read as a live signal. */}
      <div className="mb-5 flex w-fit items-center gap-2 self-start rounded-lg border border-caution/35 bg-caution/10 px-3 py-1.5">
        <span aria-hidden="true" className="text-xs">
          ⚠️
        </span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-caution">
          Illustrative example — not a real pick
        </span>
      </div>

      {/* ── Before / After split ── */}
      <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        <BeforePanel />
        <TransformArrow />
        <AfterPanel />
      </div>

      {/* ── Feature strip ── */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {FEATURES.map((f) => (
          <FeatureCell key={f.title} title={f.title} body={f.body} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Before panel — muted, sparse, no reasoning
// ─────────────────────────────────────────────────────────────────────────────

function BeforePanel(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-[22px] py-6">
      {/* Badge */}
      <span className="self-start rounded border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
        Before
      </span>

      {/* Pick text — muted but still legible (≥3:1) */}
      <p className="m-0 font-sans text-[15px] font-semibold leading-[1.4] text-white/55">
        Generic Player — Over 285.5 Yards
      </p>

      {/* Faded confidence placeholder */}
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
          Confidence
        </span>
        <span
          aria-hidden="true"
          className="font-numerals text-[22px] font-bold leading-none tracking-[-0.02em] text-white/30"
        >
          ?
        </span>
      </div>

      {/* No reasoning */}
      <p className="m-0 font-mono text-[11px] italic text-white/55">
        No reasoning attached.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transform arrow
// ─────────────────────────────────────────────────────────────────────────────

function TransformArrow(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-orbital-cyan/30 bg-orbital-cyan/[0.06] text-base font-bold leading-none text-orbital-cyan"
    >
      →
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// After panel — rich, vibrant, reasoning-forward
// ─────────────────────────────────────────────────────────────────────────────

function AfterPanel(): JSX.Element {
  return (
    <div
      className="flex flex-col gap-3.5 rounded-2xl border border-orbital-cyan/35 px-[22px] py-6 shadow-[0_0_32px_-8px_rgba(0,229,255,0.18)]"
      style={{
        background: `linear-gradient(160deg, ${BRAND_COLORS.orbitalCyan}0d 0%, ${BRAND_COLORS.softUltraviolet}0f 100%)`,
      }}
    >
      {/* Badge */}
      <span className="self-start rounded border border-orbital-cyan/35 bg-orbital-cyan/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orbital-cyan">
        After · GSE
      </span>

      {/* Bold pick name */}
      <p className="m-0 font-sans text-base font-bold leading-[1.35] text-ion-white-2">
        Generic Player — Over 285.5 Passing Yards
      </p>

      {/* Confidence chip */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-numerals text-[32px] font-bold leading-none tracking-[-0.02em] tabular-nums text-orbital-cyan">
          73
        </span>
        <span className="font-mono text-[13px] font-medium text-orbital-cyan/55">
          / 100
        </span>
        <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-orbital-cyan/55">
          Confidence
        </span>
      </div>

      {/* Factor trail */}
      <div className="rounded-lg border border-orbital-cyan/15 bg-orbital-cyan/5 px-3 py-2.5">
        <p className="mb-1.5 mt-0 font-mono text-[9px] uppercase tracking-[0.18em] text-orbital-cyan/50">
          Factor trail
        </p>
        <p className="m-0 font-mono text-[11px] leading-[1.55] text-ion-white-2/75">
          3 games 300+ yds &middot; favorable secondary &middot; wind &lt; 10 mph
        </p>
      </div>

      {/* Edge chip */}
      <div
        className="self-start rounded px-2.5 py-[5px]"
        style={{
          background: `${BRAND_COLORS.softUltraviolet}1f`,
          borderColor: `${BRAND_COLORS.softUltraviolet}4d`,
          borderWidth: 1,
          borderStyle: "solid",
        }}
      >
        <span className="font-mono text-[11px] font-semibold tracking-[0.04em] text-ultraviolet-glow">
          +8.2% CLV projected
        </span>
      </div>

      {/* Market line movement */}
      <div
        className="rounded-lg px-3 py-2.5"
        style={{
          background: `${BRAND_COLORS.softUltraviolet}0d`,
          borderColor: `${BRAND_COLORS.softUltraviolet}26`,
          borderWidth: 1,
          borderStyle: "solid",
        }}
      >
        <p className="mb-1 mt-0 font-mono text-[9px] uppercase tracking-[0.18em] text-ultraviolet-glow">
          Market line
        </p>
        <p className="m-0 font-mono text-[11px] leading-[1.5] text-ion-white-2/70">
          Opened +110 &rarr; Current -105{" "}
          <span className="text-ultraviolet-glow">(market moved toward us)</span>
        </p>
      </div>

      {/* Receipt footer — sample format, not a real settled receipt */}
      <p className="m-0 border-t border-white/[0.06] pt-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ion-white-2/50">
        Sample receipt &middot; model version + issue time stamped at publish
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature strip cell
// ─────────────────────────────────────────────────────────────────────────────

function FeatureCell({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-[18px] py-5">
      <p className="m-0 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-orbital-cyan">
        {title}
      </p>
      <p className="m-0 font-sans text-[13px] font-normal leading-[1.55] text-ion-white-2/66">
        {body}
      </p>
    </div>
  );
}
