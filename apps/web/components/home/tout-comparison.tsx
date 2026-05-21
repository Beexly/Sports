/**
 * Galaxy Sports Edge vs. tout services.
 *
 * Brand-safe by construction: names no specific competitor and compares
 * category to category. Makes the anti-tout positioning visible as data,
 * not assertion.
 */

const ROWS = [
  {
    feature: "Win-rate / public record",
    galaxy: "Gated until enough settled history exists to publish a defensible number",
    galaxyOk: true,
    tout: "Published from day one, often curated to the wins",
    toutOk: false,
  },
  {
    feature: "Reasoning behind each pick",
    galaxy: "Full factor trail on every signal: consensus, line movement, depth, freshness",
    galaxyOk: true,
    tout: "Vibes, narrative, occasional stat reference",
    toutOk: false,
  },
  {
    feature: "Losing picks",
    galaxy: "Logged, settled, and counted toward the record",
    galaxyOk: true,
    tout: "Often quietly deleted or excluded",
    toutOk: false,
  },
  {
    feature: "Source of truth",
    galaxy: "Live odds from dozens of sportsbooks, ingested every 30 minutes",
    galaxyOk: true,
    tout: "Often a single book or a screenshot",
    toutOk: false,
  },
  {
    feature: "Premium tier framing",
    galaxy: "Pro = every signal, with reasoning; Elite = same plus alerts",
    galaxyOk: true,
    tout: "Pick-of-the-day hype / VIP plays / pay-per-pick",
    toutOk: false,
  },
  {
    feature: "What the model says when it is not confident",
    galaxy: "Does not publish: the gate stays closed",
    galaxyOk: true,
    tout: "Publishes anyway: there is always a pick of the day",
    toutOk: false,
  },
] as const;

export function ToutComparison() {
  return (
    <section
      className="section"
      style={{
        background:
          "linear-gradient(180deg, transparent, color-mix(in srgb, var(--ion-blue-glow) 4%, transparent) 50%, transparent)",
      }}
    >
      <div className="container">
        <div className="section-head">
          <div>
            <p className="section-eyebrow">The difference</p>
            <h2>Galaxy Sports Edge vs. a tout service.</h2>
          </div>
          <div className="meta">
            Category vs. category
            <br />
            No competitor named
          </div>
        </div>

        <div
          role="table"
          aria-label="Galaxy Sports Edge compared with typical tout services"
          style={{
            marginTop: 32,
            border:
              "1px solid color-mix(in srgb, var(--ion-blue-glow) 18%, transparent)",
            borderRadius: 16,
            overflow: "hidden",
            background:
              "linear-gradient(180deg, rgba(7,10,17,0.72) 0%, rgba(7,10,17,0.45) 100%)",
          }}
        >
          <div
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.4fr) minmax(0, 1.4fr)",
              gap: 0,
              padding: "16px 20px",
              borderBottom:
                "1px solid color-mix(in srgb, var(--ion-1) 10%, transparent)",
              font: "600 11px/1 var(--f-mono)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
            }}
          >
            <span role="columnheader">Dimension</span>
            <span role="columnheader" style={{ color: "var(--ion-blue-glow)" }}>
              Galaxy Sports Edge
            </span>
            <span role="columnheader" style={{ color: "var(--fg-muted)" }}>
              Typical tout service
            </span>
          </div>

          {ROWS.map((row, i) => (
            <div
              key={row.feature}
              role="row"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.4fr) minmax(0, 1.4fr)",
                gap: 0,
                padding: "20px",
                borderBottom:
                  i === ROWS.length - 1
                    ? "none"
                    : "1px solid color-mix(in srgb, var(--ion-1) 5%, transparent)",
                font: "400 14px/1.5 var(--f-body)",
              }}
            >
              <span
                role="cell"
                style={{
                  color: "var(--ion-white)",
                  fontWeight: 600,
                  paddingRight: 20,
                }}
              >
                {row.feature}
              </span>
              <span
                role="cell"
                style={{
                  color: "var(--ion-1)",
                  paddingRight: 20,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <CheckMark ok={row.galaxyOk} />
                <span>{row.galaxy}</span>
              </span>
              <span
                role="cell"
                style={{
                  color: "var(--fg-muted)",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <CheckMark ok={row.toutOk} />
                <span>{row.tout}</span>
              </span>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 22,
            font: "400 13px/1.5 var(--f-body)",
            color: "var(--fg-muted)",
            maxWidth: "60ch",
          }}
        >
          I&apos;m not naming a specific competitor here. This is the category
          contrast. If you&apos;ve been around the picks industry, you know the
          pattern. I built Galaxy Sports Edge to do the opposite of it.
        </p>
      </div>
    </section>
  );
}

function CheckMark({ ok }: { ok: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={ok ? "var(--ion-blue-glow)" : "var(--fg-muted)"}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 3 }}
    >
      {ok ? (
        <path d="M4.5 12.75l6 6 9-13.5" />
      ) : (
        <path d="M6 18 18 6M6 6l12 12" />
      )}
    </svg>
  );
}
