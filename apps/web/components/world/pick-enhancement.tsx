/**
 * PickEnhancement — Before/After demonstration of GSE value-add.
 *
 * Inspired by the Taste-Skill Before/After pattern: side-by-side comparison
 * that makes the product upgrade immediately legible. Before is muted, sparse,
 * and raw; After is rich with reasoning, confidence, and a tamper-evident receipt.
 *
 * Self-contained demo component — no props, no client state.
 * Server component safe.
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

export function PickEnhancement() {
  return (
    <div>
      {/* ── Illustrative-example disclaimer ──
          Non-negotiable rule #2 (no fabricated stats): this is a marketing
          mockup, not a real published pick. Mirrors the SignalCourtroom
          `illustrative` badge so nothing is ever read as a live signal. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "1.25rem",
          padding: "6px 12px",
          borderRadius: 8,
          alignSelf: "flex-start",
          width: "fit-content",
          border: "1px solid rgba(255,180,84,0.35)",
          background: "rgba(255,180,84,0.08)",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 12 }}>⚠️</span>
        <span
          style={{
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#FFB454",
          }}
        >
          Illustrative example — not a real pick
        </span>
      </div>

      {/* ── Before / After split ── */}
      <div
        className="pick-enhancement-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "1.5rem",
          alignItems: "center",
        }}
      >
        <BeforePanel />
        <TransformArrow />
        <AfterPanel />
      </div>

      {/* ── Feature strip ── */}
      <div
        style={{
          marginTop: "2.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.5rem",
        }}
        className="pick-enhancement-features"
      >
        {FEATURES.map((f) => (
          <FeatureCell key={f.title} title={f.title} body={f.body} />
        ))}
      </div>

      {/* ── Responsive overrides ── */}
      <style>{`
        @media (max-width: 768px) {
          .pick-enhancement-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .pick-enhancement-features {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Before panel — muted, sparse, no reasoning
// ─────────────────────────────────────────────────────────────────────────────

function BeforePanel() {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: "24px 22px",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Badge */}
      <span
        style={{
          alignSelf: "flex-start",
          fontFamily: "var(--f-mono, ui-monospace, monospace)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.30)",
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        Before
      </span>

      {/* Pick text — muted but still legible (≥3:1) */}
      <p
        style={{
          margin: 0,
          font: "600 15px/1.4 var(--f-body, system-ui, sans-serif)",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        Generic Player — Over 285.5 Yards
      </p>

      {/* Faded confidence placeholder */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.50)",
          }}
        >
          Confidence
        </span>
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--f-numerals, var(--f-mono, ui-monospace, monospace))",
            fontSize: 22,
            fontWeight: 700,
            color: "rgba(255,255,255,0.30)",
            letterSpacing: "-0.02em",
          }}
        >
          ?
        </span>
      </div>

      {/* No reasoning */}
      <p
        style={{
          margin: 0,
          fontFamily: "var(--f-mono, ui-monospace, monospace)",
          fontSize: 11,
          color: "rgba(255,255,255,0.55)",
          fontStyle: "italic",
        }}
      >
        No reasoning attached.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transform arrow
// ─────────────────────────────────────────────────────────────────────────────

function TransformArrow() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "1px solid rgba(0,229,255,0.30)",
        background: "rgba(0,229,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#00E5FF",
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      →
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// After panel — rich, vibrant, reasoning-forward
// ─────────────────────────────────────────────────────────────────────────────

function AfterPanel() {
  return (
    <div
      style={{
        border: "1px solid rgba(0,229,255,0.35)",
        borderRadius: 16,
        padding: "24px 22px",
        background:
          "linear-gradient(160deg, rgba(0,229,255,0.05) 0%, rgba(122,92,255,0.06) 100%)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 0 32px -8px rgba(0,229,255,0.18)",
      }}
    >
      {/* Badge */}
      <span
        style={{
          alignSelf: "flex-start",
          fontFamily: "var(--f-mono, ui-monospace, monospace)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#00E5FF",
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid rgba(0,229,255,0.35)",
          background: "rgba(0,229,255,0.08)",
        }}
      >
        After · GSE
      </span>

      {/* Bold pick name */}
      <p
        style={{
          margin: 0,
          font: "700 16px/1.35 var(--f-body, system-ui, sans-serif)",
          color: "#F6F7FA",
        }}
      >
        Generic Player — Over 285.5 Passing Yards
      </p>

      {/* Confidence chip */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--f-numerals, var(--f-mono, ui-monospace, monospace))",
            fontSize: 32,
            fontWeight: 700,
            color: "#00E5FF",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          73
        </span>
        <span
          style={{
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 13,
            color: "rgba(0,229,255,0.55)",
            fontWeight: 500,
          }}
        >
          / 100
        </span>
        <span
          style={{
            marginLeft: 6,
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "rgba(0,229,255,0.55)",
          }}
        >
          Confidence
        </span>
      </div>

      {/* Factor trail */}
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: "rgba(0,229,255,0.05)",
          border: "1px solid rgba(0,229,255,0.15)",
        }}
      >
        <p
          style={{
            margin: "0 0 6px",
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "rgba(0,229,255,0.50)",
          }}
        >
          Factor trail
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 11,
            lineHeight: 1.55,
            color: "rgba(246,247,250,0.75)",
          }}
        >
          3 games 300+ yds &middot; favorable secondary &middot; wind &lt; 10 mph
        </p>
      </div>

      {/* Edge chip */}
      <div
        style={{
          alignSelf: "flex-start",
          padding: "5px 10px",
          borderRadius: 4,
          background: "rgba(122,92,255,0.12)",
          border: "1px solid rgba(122,92,255,0.30)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 11,
            fontWeight: 600,
            color: "#9D86FF",
            letterSpacing: "0.04em",
          }}
        >
          +8.2% CLV projected
        </span>
      </div>

      {/* Market line movement */}
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: "rgba(122,92,255,0.05)",
          border: "1px solid rgba(122,92,255,0.15)",
        }}
      >
        <p
          style={{
            margin: "0 0 4px",
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#9D86FF",
          }}
        >
          Market line
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--f-mono, ui-monospace, monospace)",
            fontSize: 11,
            lineHeight: 1.5,
            color: "rgba(246,247,250,0.70)",
          }}
        >
          Opened +110 &rarr; Current -105{" "}
          <span style={{ color: "#9D86FF" }}>(market moved toward us)</span>
        </p>
      </div>

      {/* Receipt footer — sample format, not a real settled receipt */}
      <p
        style={{
          margin: 0,
          fontFamily: "var(--f-mono, ui-monospace, monospace)",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "rgba(246,247,250,0.50)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 10,
        }}
      >
        Sample receipt &middot; model version + issue time stamped at publish
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature strip cell
// ─────────────────────────────────────────────────────────────────────────────

function FeatureCell({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: "20px 18px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--f-mono, ui-monospace, monospace)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "#00E5FF",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: 0,
          font: "400 13px/1.55 var(--f-body, system-ui, sans-serif)",
          color: "rgba(246,247,250,0.66)",
        }}
      >
        {body}
      </p>
    </div>
  );
}
