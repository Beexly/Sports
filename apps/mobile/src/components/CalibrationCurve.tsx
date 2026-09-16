import * as React from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

import { useTheme } from "../theme";
import type { CalibrationBucketInput } from "../lib/calibration";
import { MIN_PUBLISH_BUCKET_SAMPLE } from "../lib/calibration";
import { Body, Eyebrow, Row, Spacer } from "./primitives";

/**
 * The reliability curve.
 *
 * Modelled on `apps/web/components/home/calibration-curve.tsx`, which the brand
 * review singled out as "exemplary, keep as the template" — the diagonal is
 * perfect calibration, the observed-vs-predicted series uses ONE accent, axes
 * are small mono labels, and the empty state is honest.
 *
 * ONE ACCENT COLOUR, per the data-viz contract. Under FIELD the only surviving
 * accent is ember, and the curve does NOT use it: ember is the action colour,
 * and a chart is not an action. Cells use the wayfinding iris for the observed
 * series and fog for the diagonal, which keeps the one-accent rule while
 * keeping ember out of a place where it would read as "click me".
 *
 * NUMERALS FIRST. Every plotted point carries its value as a label, so the
 * chart is a second reading of numbers that are already on the page rather than
 * the only place the numbers exist.
 *
 * SVG is used rather than a charting dependency: a 4-point reliability diagram
 * is ~60 lines of geometry, and a chart library would be the single largest
 * dependency in the binary for it.
 */

export interface CalibrationCurveProps {
  buckets: CalibrationBucketInput[];
  /** Plot size in points. Square, because calibration axes are symmetric. */
  size?: number;
  /** Optional: the viewer's own sample, overlaid as a ghost series. */
  viewerBuckets?: CalibrationBucketInput[] | null;
}

export function CalibrationCurve({
  buckets,
  size = 300,
  viewerBuckets = null,
}: CalibrationCurveProps): React.ReactElement {
  const t = useTheme();

  const padding = { top: 16, right: 16, bottom: 34, left: 34 };
  const plot = size - padding.left - padding.right;
  const toX = (p: number): number => padding.left + p * plot;
  const toY = (p: number): number => padding.top + (1 - p) * plot;

  // Only publishable buckets are plotted. A bucket below the floor is not drawn
  // as a faint point — it is simply absent, and the row above the chart says
  // "collecting". Plotting it would put a mark on a line that is not a finding.
  const points = buckets
    .filter((b) => b.decided >= MIN_PUBLISH_BUCKET_SAMPLE)
    .map((b) => ({
      predicted: b.predicted,
      observed: b.decided > 0 ? b.wins / b.decided : 0,
      label: b.label,
      n: b.decided,
    }))
    .sort((a, b) => a.predicted - b.predicted);

  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View>
      <Row justify="space-between" align="center">
        <Eyebrow tone="meta">Observed vs predicted</Eyebrow>
        <Eyebrow tone="muted">Diagonal is perfect</Eyebrow>
      </Row>
      <Spacer size="s2" />
      <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
          points.length === 0
            ? "Reliability chart: no band has cleared the publish threshold yet."
            : `Reliability chart. ${points.length} bands plotted.`
      }
    >
      <Svg width={size} height={size}>
        {/* Grid — mineral at 20% opacity, per the contract. Subtle by design. */}
        <G>
          {grid.map((g) => (
            <Line
              key={`h-${g}`}
              x1={padding.left}
              y1={toY(g)}
              x2={padding.left + plot}
              y2={toY(g)}
              stroke={t.colors.grid}
              strokeWidth={1}
            />
          ))}
          {grid.map((g) => (
            <Line
              key={`v-${g}`}
              x1={toX(g)}
              y1={padding.top}
              x2={toX(g)}
              y2={padding.top + plot}
              stroke={t.colors.grid}
              strokeWidth={1}
            />
          ))}
        </G>

        {/* The diagonal — perfect calibration. Dashed, fog. */}
        <Line
          x1={toX(0)}
          y1={toY(0)}
          x2={toX(1)}
          y2={toY(1)}
          stroke={t.colors.fgMuted}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Axis labels — small, mono, muted. "The data speaks." */}
        <G>
          {grid.map((g) => (
            <SvgText
              key={`xl-${g}`}
              x={toX(g)}
              y={padding.top + plot + 16}
              fill={t.colors.fgMuted}
              fontSize={9}
              textAnchor="middle"
            >
              {`${Math.round(g * 100)}`}
            </SvgText>
          ))}
          {grid.map((g) => (
            <SvgText
              key={`yl-${g}`}
              x={padding.left - 8}
              y={toY(g) + 3}
              fill={t.colors.fgMuted}
              fontSize={9}
              textAnchor="end"
            >
              {`${Math.round(g * 100)}`}
            </SvgText>
          ))}
          <SvgText
            x={padding.left + plot / 2}
            y={size - 4}
            fill={t.colors.fgMuted}
            fontSize={9}
            textAnchor="middle"
          >
            Confidence score
          </SvgText>
        </G>

        {/* The observed series — ONE accent, rings, with the connecting path. */}
        {points.length > 1 ? (
          <Path
            d={points
              .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.predicted)} ${toY(p.observed)}`)
              .join(" ")}
            fill="none"
            stroke={t.colors.wayfind}
            strokeWidth={1.5}
          />
        ) : null}

        {points.map((p) => (
          <G key={p.label}>
            <Circle
              cx={toX(p.predicted)}
              cy={toY(p.observed)}
              r={5}
              fill={t.colors.raised}
              stroke={t.colors.wayfind}
              strokeWidth={1.5}
            />
            {/* Numerals first: the value is on the chart, not only implied by it. */}
            <SvgText
              x={toX(p.predicted)}
              y={toY(p.observed) - 10}
              fill={t.colors.fgMeta}
              fontSize={9}
              textAnchor="middle"
            >
              {`${Math.round(p.observed * 100)}% n=${p.n}`}
            </SvgText>
          </G>
        ))}

        {/* The viewer's own series, ghosted. Wayfinding tone at low opacity so
            it never competes with the model's line. */}
        {viewerBuckets && viewerBuckets.length > 1
          ? viewerBuckets
              .filter((b) => b.decided >= MIN_PUBLISH_BUCKET_SAMPLE)
              .map((b) => (
                <Circle
                  key={`viewer-${b.label}`}
                  cx={toX(b.predicted)}
                  cy={toY(b.decided > 0 ? b.wins / b.decided : 0)}
                  r={3}
                  fill={t.withAlpha(t.colors.wayfind, 0.35)}
                />
              ))
          : null}
      </Svg>

      {points.length === 0 ? (
        <Body size="bodySm" tone="muted">
          No band has cleared {MIN_PUBLISH_BUCKET_SAMPLE} decided picks yet, so there is
          nothing to plot. We would rather show you an empty frame than a line drawn through
          two points.
        </Body>
      ) : null}
      </View>
    </View>
  );
}