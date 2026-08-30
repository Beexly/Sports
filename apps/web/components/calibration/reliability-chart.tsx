/**
 * Reliability diagram — pure SVG.
 * Used on methodology/ops surfaces. Never invents bins; parent supplies data.
 */

export type ReliabilityBin = {
  readonly meanForecast: number;
  readonly observedRate: number;
  readonly count: number;
};

export function ReliabilityChart(props: {
  readonly bins: readonly ReliabilityBin[];
  readonly title?: string;
  readonly className?: string;
}): JSX.Element {
  const { bins, title = "Reliability", className } = props;
  const w = 320;
  const h = 240;
  const pad = 36;
  const inner = w - pad * 2;
  const pts = bins.filter((b) => b.count > 0);

  function xy(f: number, o: number): { x: number; y: number } {
    return {
      x: pad + f * inner,
      y: pad + (1 - o) * inner * (h - pad * 2) / inner,
    };
  }

  return (
    <figure className={className ?? "w-full max-w-md"}>
      <figcaption className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
        {title}
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={title}>
        <rect x={0} y={0} width={w} height={h} fill="transparent" />
        {/* perfect calibration diagonal */}
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={pad}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeDasharray="4 4"
        />
        {/* axes */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" strokeOpacity={0.35} />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="currentColor" strokeOpacity={0.35} />
        {pts.map((b, i) => {
          const { x, y } = xy(b.meanForecast, b.observedRate);
          const r = Math.min(10, 3 + Math.sqrt(b.count));
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill="var(--orbital-cyan, #00E5FF)"
              fillOpacity={0.85}
            />
          );
        })}
        <text x={w / 2} y={h - 8} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.55}>
          forecast p
        </text>
        <text
          x={12}
          y={h / 2}
          textAnchor="middle"
          fontSize={9}
          fill="currentColor"
          opacity={0.55}
          transform={`rotate(-90 12 ${h / 2})`}
        >
          observed rate
        </text>
      </svg>
      {pts.length === 0 && (
        <p className="mt-1 text-xs text-ion-2">No bins yet — collecting settled outcomes.</p>
      )}
    </figure>
  );
}
