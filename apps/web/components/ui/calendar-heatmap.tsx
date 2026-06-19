/**
 * SVG calendar heatmap — pure SVG, zero dependencies.
 * Attribution: Inspired by react-calendar-heatmap (MIT, kevinsqi, github.com/kevinsqi/react-calendar-heatmap)
 * Re-implemented TS-native.
 */

export type HeatmapValue = {
  date: string; // "YYYY-MM-DD"
  count: number; // raw value — 0 = empty, higher = more
};

type HeatmapColor = "green" | "red" | "blue" | "purple";

interface CalendarHeatmapProps {
  /** Data points to display */
  values: HeatmapValue[];
  /** Number of weeks to show (default 12) */
  weeks?: number;
  /** Cell size in px (default 10) */
  cellSize?: number;
  /** Gap between cells in px (default 2) */
  gap?: number;
  /** Color theme */
  color?: HeatmapColor;
  /** Start date (defaults to `weeks` weeks ago) */
  startDate?: Date;
  /** Accessible label */
  "aria-label"?: string;
}

const COLOR_SCALES: Record<HeatmapColor, string[]> = {
  green: ["rgba(255,255,255,0.05)", "#22c55e40", "#22c55e80", "#22c55eb0", "#22c55e"],
  red:   ["rgba(255,255,255,0.05)", "#ef444440", "#ef444480", "#ef4444b0", "#ef4444"],
  blue:  ["rgba(255,255,255,0.05)", "#3b82f640", "#3b82f680", "#3b82f6b0", "#3b82f6"],
  purple:["rgba(255,255,255,0.05)", "#a855f740", "#a855f780", "#a855f7b0", "#a855f7"],
};

function colorForValue(value: number, maxValue: number, color: HeatmapColor): string {
  const scale = COLOR_SCALES[color];
  if (value <= 0) return scale[0]!;
  const idx = Math.ceil((value / maxValue) * (scale.length - 2)) + 1;
  return scale[Math.min(idx, scale.length - 1)]!;
}

export function CalendarHeatmap({
  values,
  weeks = 12,
  cellSize = 10,
  gap = 2,
  color = "green",
  startDate,
  "aria-label": ariaLabel = "Activity calendar",
}: CalendarHeatmapProps) {
  const step = cellSize + gap;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate) : new Date(today);
  if (!startDate) {
    start.setDate(start.getDate() - weeks * 7);
  }

  // Build lookup
  const lookup = new Map<string, number>();
  for (const v of values) {
    lookup.set(v.date, v.count);
  }
  const maxValue = Math.max(1, ...values.map((v) => v.count));

  // Build grid
  const columns: Array<Array<{ dateStr: string; count: number; x: number; y: number }>> = [];
  const current = new Date(start);
  // Align to Sunday
  current.setDate(current.getDate() - current.getDay());

  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().slice(0, 10);
      const count = lookup.get(dateStr) ?? 0;
      col.push({ dateStr, count, x: w * step, y: d * step });
      current.setDate(current.getDate() + 1);
    }
    columns.push(col);
  }

  const width = weeks * step;
  const height = 7 * step;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={ariaLabel}
      role="img"
      style={{ display: "block" }}
    >
      {columns.flatMap((col) =>
        col.map(({ dateStr, count, x, y }) => (
          <rect
            key={dateStr}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={colorForValue(count, maxValue, color)}
          >
            <title>{`${dateStr}: ${count}`}</title>
          </rect>
        ))
      )}
    </svg>
  );
}
