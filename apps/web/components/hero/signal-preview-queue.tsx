"use client";

import { useEffect, useState } from "react";

/**
 * Signal Preview Queue — live cinematic preview of how the scoring loop works.
 *
 * Replaces the static EmptyPicksState during the silent-collection phase.
 * Shows eight anonymized matchup rows materializing one at a time, then
 * cycling through states: SCORING → GATED or PUBLISHED. The data is
 * deterministic placeholder content — no real picks, no fabricated stats —
 * but it does the explanatory work that prose alone can't:
 *  - "this is what a signal looks like"
 *  - "this is what 'gated' means"
 *  - "this is the cadence the engine runs at"
 *
 * Brand-safety:
 *  - Every row labeled "PREVIEW — not a live pick"
 *  - No team names, no scores, no betting odds shown
 *  - State sequence drawn from the documented gate model
 *  - Reduced-motion: renders a static snapshot of the queue
 */

type Row = {
  id: string;
  sport: string;
  matchupCode: string;
  books: number;
  movementBps: number;
  freshnessSec: number;
  state: "scoring" | "gated" | "published";
};

const SPORTS = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB", "MLS"] as const;

function makeRow(seed: number): Row {
  // Deterministic from seed so SSR ↔ client match.
  const sport = SPORTS[seed % SPORTS.length] ?? "NFL";
  const code = (seed * 9301 + 49297) % 233280;
  const matchupCode = `M-${code.toString(36).toUpperCase().padStart(5, "0")}`;
  return {
    id: `row-${seed}`,
    sport,
    matchupCode,
    books: 4 + ((seed * 7) % 9),
    movementBps: ((seed * 13) % 60) - 30,
    freshnessSec: 6 + ((seed * 17) % 90),
    state: "scoring",
  };
}

const INITIAL_ROWS: Row[] = Array.from({ length: 8 }, (_, i) => makeRow(i + 1));

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SignalPreviewQueue() {
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
  const [visibleCount, setVisibleCount] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const r = prefersReducedMotion();
    setReduced(r);
    if (r) {
      setVisibleCount(INITIAL_ROWS.length);
      setRows((current) =>
        current.map((row, i) => ({
          ...row,
          state: i % 3 === 0 ? "published" : i % 3 === 1 ? "gated" : "scoring",
        })),
      );
      return;
    }

    // Reveal rows one at a time, then begin the gating cycle.
    let mounted = true;
    const revealInterval = window.setInterval(() => {
      if (!mounted) return;
      setVisibleCount((c) => {
        if (c >= INITIAL_ROWS.length) {
          window.clearInterval(revealInterval);
          return c;
        }
        return c + 1;
      });
    }, 520);

    // After the reveal completes, advance row states on a slow loop.
    const advanceInterval = window.setInterval(() => {
      if (!mounted) return;
      setRows((current) =>
        current.map((row, i) => {
          // Stagger transitions so the queue feels organic.
          const phase = (Math.floor(Date.now() / 1000) + i * 3) % 12;
          if (phase < 5) return { ...row, state: "scoring" };
          if (phase < 8) {
            // Two-thirds of rows get gated; one-third published.
            return { ...row, state: i % 3 === 0 ? "published" : "gated" };
          }
          return { ...row, state: "scoring" };
        }),
      );
    }, 1000);

    return () => {
      mounted = false;
      window.clearInterval(revealInterval);
      window.clearInterval(advanceInterval);
    };
  }, []);

  return (
    <div
      data-testid="signal-preview-queue"
      role="region"
      aria-label="Preview of the live signal scoring queue"
      style={{
        gridColumn: "1 / -1",
        background:
          "linear-gradient(180deg, rgba(7,10,17,0.72) 0%, rgba(7,10,17,0.45) 100%)",
        border: "1px solid color-mix(in srgb, var(--ion-blue-glow) 18%, transparent)",
        borderRadius: 16,
        overflow: "hidden",
        padding: "28px 32px 32px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--ion-blue-glow)",
              boxShadow: "0 0 14px var(--ion-blue-glow)",
              animation: reduced ? undefined : "pp-pulse 2.4s ease-in-out infinite",
            }}
          />
          <span
            style={{
              font: "500 11px/1 var(--f-mono)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--ion-1)",
            }}
          >
            Scoring queue · preview mode
          </span>
        </div>
        <span
          style={{
            font: "500 10px/1 var(--f-mono)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
          }}
        >
          Not a live pick · for demonstration
        </span>
      </div>

      {/* Column headings */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 60px 1fr 80px 90px 90px 110px",
          alignItems: "center",
          gap: 16,
          padding: "0 4px 10px",
          borderBottom: "1px solid color-mix(in srgb, var(--ion-1) 8%, transparent)",
          font: "500 10px/1 var(--f-mono)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
        }}
      >
        <span>#</span>
        <span>Sport</span>
        <span>Matchup</span>
        <span style={{ textAlign: "right" }}>Books</span>
        <span style={{ textAlign: "right" }}>Move</span>
        <span style={{ textAlign: "right" }}>Fresh</span>
        <span style={{ textAlign: "right" }}>Gate</span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((row, i) => {
          const isVisible = i < visibleCount;
          return (
            <div
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 60px 1fr 80px 90px 90px 110px",
                alignItems: "center",
                gap: 16,
                padding: "14px 4px",
                borderBottom:
                  i === rows.length - 1
                    ? "none"
                    : "1px solid color-mix(in srgb, var(--ion-1) 4%, transparent)",
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 480ms ease-out, transform 480ms ease-out",
                font: "500 13px/1 var(--f-mono)",
                color: "var(--ion-1)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ color: "var(--fg-muted)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  font: "600 11px/1 var(--f-mono)",
                  letterSpacing: "0.12em",
                  color: "var(--ion-white)",
                  padding: "5px 8px",
                  borderRadius: 4,
                  background:
                    "color-mix(in srgb, var(--ion-blue-glow) 10%, transparent)",
                  display: "inline-block",
                  width: "fit-content",
                }}
              >
                {row.sport}
              </span>
              <span style={{ color: "var(--ion-white)", letterSpacing: "0.04em" }}>
                {row.matchupCode}
              </span>
              <span style={{ textAlign: "right", color: "var(--ion-white)" }}>
                {row.books}
              </span>
              <span
                style={{
                  textAlign: "right",
                  color:
                    row.movementBps < 0
                      ? "var(--plasma)"
                      : row.movementBps > 0
                        ? "var(--ion-blue-glow)"
                        : "var(--fg-muted)",
                }}
              >
                {row.movementBps > 0 ? "+" : ""}
                {row.movementBps}
              </span>
              <span style={{ textAlign: "right", color: "var(--fg-muted)" }}>
                {row.freshnessSec}s
              </span>
              <span style={{ textAlign: "right" }}>
                <GateBadge state={row.state} reduced={reduced} />
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer caption */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid color-mix(in srgb, var(--ion-1) 8%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <p
          style={{
            margin: 0,
            font: "400 13px/1.5 var(--f-body)",
            color: "var(--ion-1)",
            maxWidth: "60ch",
          }}
        >
          Every signal cycles SCORING → GATED or PUBLISHED. The Signal Feed only
          opens once the readiness gate clears — and the gate stays closed when
          the slate doesn&apos;t earn it.
        </p>
        <a
          href="/methodology"
          style={{
            font: "600 12px/1 var(--f-mono)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ion-blue-glow)",
            textDecoration: "none",
            borderBottom: "1px solid var(--ion-blue-glow)",
            paddingBottom: 2,
          }}
        >
          How the gate works →
        </a>
      </div>
    </div>
  );
}

function GateBadge({
  state,
  reduced,
}: {
  state: Row["state"];
  reduced: boolean;
}) {
  const config = {
    scoring: {
      label: "Scoring",
      fg: "var(--ion-blue-glow)",
      bg: "color-mix(in srgb, var(--ion-blue-glow) 12%, transparent)",
      border: "color-mix(in srgb, var(--ion-blue-glow) 35%, transparent)",
      pulse: true,
    },
    gated: {
      label: "Gated",
      fg: "var(--fg-muted)",
      bg: "color-mix(in srgb, var(--ion-1) 6%, transparent)",
      border: "color-mix(in srgb, var(--ion-1) 18%, transparent)",
      pulse: false,
    },
    published: {
      label: "Published",
      fg: "var(--plasma)",
      bg: "color-mix(in srgb, var(--plasma) 12%, transparent)",
      border: "color-mix(in srgb, var(--plasma) 40%, transparent)",
      pulse: false,
    },
  }[state];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.fg,
        font: "600 10px/1 var(--f-mono)",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        transition: "all 240ms ease-out",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: config.fg,
          boxShadow: `0 0 8px ${config.fg}`,
          animation:
            config.pulse && !reduced
              ? "pp-pulse 1.8s ease-in-out infinite"
              : undefined,
        }}
      />
      {config.label}
    </span>
  );
}
