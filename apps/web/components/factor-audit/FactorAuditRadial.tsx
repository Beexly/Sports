/**
 * Factor-Audit Radial — the signature interactive moment of the Decision Room.
 *
 * Renders a 10-axis radial chart of the pick's factor scores. Includes a
 * side panel showing edge-decay over time (published edge vs. current
 * decayed edge).
 *
 * No methodology leakage: factor names are public (already shipped in the
 * evidence-readiness matrix). Weights are NOT rendered. The radial shows
 * shape, not formula.
 */

import * as React from "react";

export interface FactorAxisScore {
  readonly key: string;
  readonly label: string;
  /** Normalized 0-100. */
  readonly score: number;
}

export interface EdgeDecayPoint {
  readonly t: string; // ISO timestamp
  readonly edge: number; // 0-100
  readonly label: string;
}

export interface FactorAuditRadialProps {
  readonly axes: ReadonlyArray<FactorAxisScore>;
  readonly edgeAtPublication: number;
  readonly currentEdge: number;
  readonly decayTimeline?: ReadonlyArray<EdgeDecayPoint>;
  readonly modelVersion?: string;
  readonly className?: string;
}

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 130;

function axisPoint(index: number, count: number, magnitude: number): { x: number; y: number } {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const r = (magnitude / 100) * RADIUS;
  return {
    x: CENTER + Math.cos(angle) * r,
    y: CENTER + Math.sin(angle) * r,
  };
}

export function FactorAuditRadial({
  axes,
  edgeAtPublication,
  currentEdge,
  decayTimeline,
  modelVersion,
  className,
}: FactorAuditRadialProps): JSX.Element {
  const count = axes.length;
  const decay = edgeAtPublication - currentEdge;
  const decayPct = edgeAtPublication > 0 ? (decay / edgeAtPublication) * 100 : 0;

  // Build the polygon path from axis scores
  const polygonPoints = axes
    .map((axis, i) => {
      const p = axisPoint(i, count, axis.score);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  // Concentric guide circles at 25 / 50 / 75 / 100
  const guides = [25, 50, 75, 100];

  return (
    <section
      aria-label="Factor audit radial"
      className={[
        "rounded-2xl border border-mineral bg-gray-900/60 p-6",
        className ?? "",
      ].join(" ")}
    >
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-blue">
            Factor audit
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">
            10-factor radial · edge decay timeline
          </h3>
        </div>
        {modelVersion && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
            {modelVersion}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ── Radial ─────────────────────────────────────────────────────── */}
        <div>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="auto" role="img" aria-labelledby="radial-title">
            <title id="radial-title">10-factor radial showing per-factor normalized scores.</title>

            {/* Concentric guide circles */}
            {guides.map((g) => (
              <circle
                key={g}
                cx={CENTER}
                cy={CENTER}
                r={(g / 100) * RADIUS}
                fill="none"
                stroke="#374151"
                strokeWidth="0.5"
              />
            ))}

            {/* Spokes */}
            {axes.map((_, i) => {
              const p = axisPoint(i, count, 100);
              return (
                <line
                  key={i}
                  x1={CENTER}
                  y1={CENTER}
                  x2={p.x}
                  y2={p.y}
                  stroke="#374151"
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Filled polygon — the factor footprint */}
            <polygon
              points={polygonPoints}
              fill="#22d3ee"
              fillOpacity="0.18"
              stroke="#22d3ee"
              strokeWidth="1.5"
              className="motion-safe:transition-all motion-safe:duration-700"
            />

            {/* Vertex dots */}
            {axes.map((axis, i) => {
              const p = axisPoint(i, count, axis.score);
              return (
                <circle
                  key={axis.key}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="#22d3ee"
                />
              );
            })}

            {/* Axis labels */}
            {axes.map((axis, i) => {
              const p = axisPoint(i, count, 118);
              return (
                <text
                  key={`${axis.key}-label`}
                  x={p.x}
                  y={p.y}
                  fontSize="9"
                  fill="#9ca3af"
                  fontFamily="monospace"
                  textAnchor={p.x < CENTER - 5 ? "end" : p.x > CENTER + 5 ? "start" : "middle"}
                  dominantBaseline="middle"
                >
                  {axis.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* ── Edge decay panel ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <article className="rounded-xl border border-mineral bg-carbon/60 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              Edge at publication
            </p>
            <p className="mt-2 font-mono text-3xl font-black text-cyan-300">{edgeAtPublication}</p>
          </article>
          <article className="rounded-xl border border-mineral bg-carbon/60 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              Current edge
            </p>
            <p className="mt-2 font-mono text-3xl font-black text-white">{currentEdge}</p>
            <p className="mt-2 text-xs text-gray-500">
              {decay > 0 ? (
                <>
                  Decayed by{" "}
                  <span className="font-mono text-amber-400">
                    -{decay} ({decayPct.toFixed(0)}%)
                  </span>{" "}
                  since publication.
                </>
              ) : decay < 0 ? (
                <>
                  Gained{" "}
                  <span className="font-mono text-emerald-400">+{Math.abs(decay)}</span> since publication.
                </>
              ) : (
                <>No change since publication.</>
              )}
            </p>
          </article>

          {decayTimeline && decayTimeline.length > 0 && (
            <article className="rounded-xl border border-mineral bg-carbon/60 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                Decay timeline
              </p>
              <ol className="mt-3 space-y-2">
                {decayTimeline.map((p) => (
                  <li key={p.t} className="flex items-baseline justify-between text-xs">
                    <span className="font-mono text-gray-400">{p.label}</span>
                    <span className="font-mono text-gray-300">{p.edge}</span>
                  </li>
                ))}
              </ol>
            </article>
          )}
        </div>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-gray-500">
        Factor names are public; per-factor weights are not. The radial shows shape — the relative
        contribution of each evidence stream to the published read. The edge timeline shows how
        the model&apos;s edge moves as the line moves and information arrives.
      </p>
    </section>
  );
}
