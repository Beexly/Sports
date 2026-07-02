/**
 * Galaxy Sports Edge vs. tout services.
 *
 * Brand-safe by construction: names no specific competitor and compares
 * category to category. Makes the anti-tout positioning visible as data,
 * not assertion.
 *
 * Accessibility: rendered as a real <table> with <thead>/<tbody>/<th>/<td>
 * so screen readers programmatically associate the column header with
 * each cell (WCAG 1.3.1 Info & Relationships). The negative CheckMark
 * uses --alert color (≈ 4.9:1 contrast) so the X is visible to all users,
 * not just decorated muted gray.
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

        <div className="tout-table-wrap">
          <table
            className="tout-table"
            aria-label="Galaxy Sports Edge compared with typical tout services"
          >
            <thead>
              <tr>
                <th scope="col">Dimension</th>
                <th scope="col" className="tout-th-galaxy">
                  Galaxy Sports Edge
                </th>
                <th scope="col" className="tout-th-other">
                  Typical tout service
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature}>
                  <th scope="row" className="tout-td-feature">
                    {row.feature}
                  </th>
                  <td className="tout-td-galaxy">
                    <span className="tout-cell-inner">
                      <CheckMark ok={row.galaxyOk} />
                      <span>{row.galaxy}</span>
                    </span>
                  </td>
                  <td className="tout-td-other">
                    <span className="tout-cell-inner">
                      <CheckMark ok={row.toutOk} />
                      <span>{row.tout}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="tout-footnote">
          No specific competitor named here. This is the category contrast.
          If you&apos;ve been around the picks industry, you know the pattern.
          Galaxy Sports Edge is built to do the opposite of it.
        </p>
      </div>

      {/* Scoped styling so the table inherits the brand surface without
          fighting the kit's generic table resets. */}
      <style>{`
        .tout-table-wrap {
          margin-top: 32px;
          border: 1px solid color-mix(in srgb, var(--ion-blue-glow) 18%, transparent);
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(7,10,17,0.72) 0%, rgba(7,10,17,0.45) 100%);
        }
        .tout-table {
          width: 100%;
          border-collapse: collapse;
          font: 400 14px/1.5 var(--f-body);
          color: var(--ion-1);
        }
        .tout-table thead th {
          padding: 16px 20px;
          font: 600 11px/1 var(--f-mono);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--fg-muted);
          border-bottom: 1px solid color-mix(in srgb, var(--ion-1) 10%, transparent);
          text-align: left;
        }
        .tout-table thead th.tout-th-galaxy { color: var(--ion-blue-glow); }
        .tout-table thead th.tout-th-other { color: var(--fg-muted); }
        .tout-table tbody tr {
          border-bottom: 1px solid color-mix(in srgb, var(--ion-1) 5%, transparent);
        }
        .tout-table tbody tr:last-child { border-bottom: none; }
        .tout-table tbody th,
        .tout-table tbody td {
          padding: 20px;
          vertical-align: top;
          text-align: left;
          font-weight: 400;
        }
        .tout-table tbody th.tout-td-feature {
          color: var(--ion-white);
          font-weight: 600;
          padding-right: 20px;
          width: 26%;
        }
        .tout-table tbody td.tout-td-galaxy { color: var(--ion-1); padding-right: 20px; width: 37%; }
        .tout-table tbody td.tout-td-other  { color: var(--fg-muted); width: 37%; }
        .tout-cell-inner {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .tout-footnote {
          margin-top: 22px;
          font: 400 13px/1.5 var(--f-body);
          color: var(--fg-muted);
          max-width: 60ch;
        }
        @media (max-width: 720px) {
          .tout-table thead { display: none; }
          .tout-table tbody tr {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0;
            padding: 18px 16px;
          }
          .tout-table tbody th,
          .tout-table tbody td { padding: 6px 0; width: auto; }
          .tout-table tbody td.tout-td-galaxy::before {
            content: "Galaxy Sports Edge";
            display: block;
            font: 600 10px/1 var(--f-mono);
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--ion-blue-glow);
            margin-bottom: 6px;
          }
          .tout-table tbody td.tout-td-other::before {
            content: "Typical tout service";
            display: block;
            font: 600 10px/1 var(--f-mono);
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--fg-muted);
            margin-bottom: 6px;
          }
        }
      `}</style>
    </section>
  );
}

function CheckMark({ ok }: { ok: boolean }) {
  // WCAG 1.4.1 (use of color) — the negative state now uses --alert
  // (≈ 4.9:1 on dark), not muted gray, so it's visible AND shape-distinct.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={ok ? "var(--ion-blue-glow)" : "var(--alert)"}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={ok ? "Galaxy Sports Edge does this" : "Tout services do this"}
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
