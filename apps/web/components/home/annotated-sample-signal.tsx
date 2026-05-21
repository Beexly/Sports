/**
 * Annotated Sample Signal — "this is what a published signal looks like."
 *
 * Concrete artifact. Replaces the abstract "we score every matchup" prose
 * with a real-shaped pick card flanked by labeled callouts explaining each
 * surface. Brand-safe: deterministic placeholder data, no team names, no
 * book-specific odds, the card is explicitly stamped PREVIEW.
 *
 * Composition pattern is the same one Stripe / Linear use to make abstract
 * product capabilities legible on the landing page.
 */

const CALLOUTS_LEFT = [
  {
    label: "01 · Sport + matchup code",
    body: "Every signal is keyed to a specific sport, slate, and matchup. The code is the audit handle — every factor in the trail ties back to it.",
  },
  {
    label: "02 · Grade chip",
    body: "Eclipse Gate is the rarest grade — only signals where every gate cleared by a wide margin. Strong / Solid / Lean are the rest of the ladder. Never used as a promise.",
  },
  {
    label: "03 · Selection + line",
    body: "The actual pick: spread, total, or moneyline. The line value reflects the moment the signal was scored, not the moment you view the card.",
  },
] as const;

const CALLOUTS_RIGHT = [
  {
    label: "04 · Factor trail",
    body: "Every factor the model weighed: market consensus, line movement, book depth, freshness, intelligence layers. You read what the model read.",
  },
  {
    label: "05 · Confidence rating",
    body: "A calibrated 0–100 Edge Index. Not a probability the pick wins — a measure of how much the market is offering vs. what the model thinks the matchup is worth.",
  },
  {
    label: "06 · Variance line",
    body: "Every card carries the reminder that even a 64% confidence signal still loses 36 of 100 times. Variance is described, not hidden.",
  },
] as const;

export function AnnotatedSampleSignal() {
  return (
    <section
      className="section"
      style={{
        background:
          "linear-gradient(180deg, transparent, color-mix(in srgb, var(--ultraviolet) 3%, transparent) 50%, transparent)",
      }}
    >
      <div className="container">
        <div className="section-head">
          <div>
            <p className="section-eyebrow">Anatomy of a signal</p>
            <h2>This is what a published signal looks like.</h2>
          </div>
          <div className="meta">
            Preview render
            <br />
            No live pick attached
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: 32,
            alignItems: "start",
          }}
          className="anatomy-grid"
        >
          {/* LEFT — callouts 01–03 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {CALLOUTS_LEFT.map((c) => (
              <Callout key={c.label} {...c} align="right" />
            ))}
          </div>

          {/* CENTER — the actual sample card */}
          <SampleCard />

          {/* RIGHT — callouts 04–06 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {CALLOUTS_RIGHT.map((c) => (
              <Callout key={c.label} {...c} align="left" />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile fallback — stack the callouts above + below the card */}
      <style>{`
        @media (max-width: 1024px) {
          .anatomy-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </section>
  );
}

function Callout({
  label,
  body,
  align,
}: {
  label: string;
  body: string;
  align: "left" | "right";
}) {
  return (
    <div
      style={{
        textAlign: align,
        paddingLeft: align === "left" ? 18 : 0,
        paddingRight: align === "right" ? 18 : 0,
        borderLeft:
          align === "left"
            ? "1px solid color-mix(in srgb, var(--ion-blue-glow) 28%, transparent)"
            : "none",
        borderRight:
          align === "right"
            ? "1px solid color-mix(in srgb, var(--ion-blue-glow) 28%, transparent)"
            : "none",
      }}
    >
      <p
        style={{
          margin: 0,
          font: "600 11px/1.2 var(--f-mono)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ion-blue-glow)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          font: "400 13px/1.55 var(--f-body)",
          color: "var(--ion-1)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function SampleCard() {
  return (
    <article
      data-testid="annotated-sample-signal-card"
      style={{
        position: "relative",
        background:
          "linear-gradient(180deg, rgba(15,18,26,0.95) 0%, rgba(8,10,15,0.95) 100%)",
        border:
          "1px solid color-mix(in srgb, var(--plasma) 35%, transparent)",
        borderRadius: 18,
        padding: "26px 26px 22px",
        boxShadow:
          "0 24px 60px -20px color-mix(in srgb, var(--plasma) 28%, transparent), 0 1px 0 0 color-mix(in srgb, var(--ion-white) 6%, transparent) inset",
      }}
    >
      {/* PREVIEW stamp */}
      <div
        style={{
          position: "absolute",
          top: -10,
          right: 18,
          background: "var(--obsidian)",
          padding: "4px 10px",
          borderRadius: 4,
          font: "700 9px/1 var(--f-mono)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--ultraviolet-glow)",
          border: "1px solid color-mix(in srgb, var(--ultraviolet) 50%, transparent)",
        }}
      >
        Preview · not a live pick
      </div>

      {/* Row 1: chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <span
          style={{
            font: "700 10px/1 var(--f-mono)",
            letterSpacing: "0.14em",
            color: "var(--ion-white)",
            padding: "5px 9px",
            borderRadius: 4,
            background:
              "color-mix(in srgb, var(--ion-blue-glow) 14%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--ion-blue-glow) 30%, transparent)",
          }}
        >
          NFL
        </span>
        <span
          style={{
            font: "700 10px/1 var(--f-mono)",
            letterSpacing: "0.14em",
            color: "var(--plasma)",
            padding: "5px 9px",
            borderRadius: 4,
            background: "color-mix(in srgb, var(--plasma) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--plasma) 35%, transparent)",
          }}
        >
          Eclipse Gate
        </span>
        <span
          style={{
            marginLeft: "auto",
            font: "500 10px/1 var(--f-mono)",
            letterSpacing: "0.14em",
            color: "var(--fg-muted)",
          }}
        >
          M-2J7XK · 14:23 to kickoff
        </span>
      </div>

      {/* Row 2: matchup */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            font: "800 22px/1 var(--f-display)",
            color: "var(--ion-white)",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            textAlign: "right",
          }}
        >
          Away · 06
        </div>
        <div
          style={{
            font: "500 10px/1 var(--f-mono)",
            letterSpacing: "0.22em",
            color: "var(--fg-muted)",
          }}
        >
          AT
        </div>
        <div
          style={{
            font: "800 22px/1 var(--f-display)",
            color: "var(--ion-white)",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}
        >
          Home · 18
        </div>
      </div>

      {/* Row 3: selection + line */}
      <div
        style={{
          padding: "14px 16px",
          background:
            "color-mix(in srgb, var(--ion-blue-glow) 6%, transparent)",
          border:
            "1px solid color-mix(in srgb, var(--ion-blue-glow) 20%, transparent)",
          borderRadius: 10,
          marginBottom: 18,
        }}
      >
        <p
          style={{
            margin: 0,
            font: "500 10px/1 var(--f-mono)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
          }}
        >
          Pick · spread
        </p>
        <p
          style={{
            margin: "6px 0 0",
            font: "700 20px/1 var(--f-display)",
            color: "var(--ion-white)",
            letterSpacing: "-0.01em",
          }}
        >
          Home -2.5
          <span
            style={{
              marginLeft: 10,
              font: "500 13px/1 var(--f-mono)",
              color: "var(--ion-blue-glow)",
            }}
          >
            (was -1.5 → moved 2h ago)
          </span>
        </p>
      </div>

      {/* Row 4: factor trail */}
      <div style={{ marginBottom: 18 }}>
        <p
          style={{
            margin: 0,
            font: "500 10px/1 var(--f-mono)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
            marginBottom: 10,
          }}
        >
          Factor trail
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px 14px",
            font: "500 12px/1.4 var(--f-mono)",
            color: "var(--ion-1)",
          }}
        >
          <Factor label="Consensus" value="7 of 7 books" tone="up" />
          <Factor label="Line drift" value="-1.0 in 2h" tone="up" />
          <Factor label="Market depth" value="Deep" tone="up" />
          <Factor label="Freshness" value="14s ago" tone="up" />
          <Factor label="Volatility" value="Low" tone="up" />
          <Factor label="Public lean" value="62% home" tone="neutral" />
        </div>
      </div>

      {/* Row 5: confidence */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          background: "color-mix(in srgb, var(--plasma) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--plasma) 32%, transparent)",
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              font: "500 10px/1 var(--f-mono)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
            }}
          >
            Edge Index
          </p>
          <p
            style={{
              margin: "4px 0 0",
              font: "700 26px/1 var(--f-numerals)",
              color: "var(--plasma)",
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            71<span style={{ color: "var(--fg-muted)", fontSize: 14 }}>/100</span>
          </p>
        </div>
        {/* Bar */}
        <div
          style={{
            flex: 1,
            marginLeft: 18,
            height: 6,
            borderRadius: 3,
            background: "color-mix(in srgb, var(--ion-1) 12%, transparent)",
            overflow: "hidden",
            maxWidth: 180,
          }}
        >
          <div
            style={{
              width: "71%",
              height: "100%",
              background:
                "linear-gradient(90deg, var(--ion-blue-glow), var(--plasma))",
            }}
          />
        </div>
      </div>

      {/* Row 6: variance line */}
      <p
        style={{
          margin: 0,
          font: "italic 400 11px/1.5 var(--f-body)",
          color: "var(--fg-muted)",
          textAlign: "center",
        }}
      >
        A 71-confidence signal still loses ~29 of 100. Treat as one input.
      </p>
    </article>
  );
}

function Factor({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
}) {
  const valueColor =
    tone === "up"
      ? "var(--ion-blue-glow)"
      : tone === "down"
        ? "var(--plasma)"
        : "var(--ion-1)";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        paddingBottom: 6,
        borderBottom:
          "1px dashed color-mix(in srgb, var(--ion-1) 12%, transparent)",
      }}
    >
      <span style={{ color: "var(--fg-muted)", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{ color: valueColor, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
