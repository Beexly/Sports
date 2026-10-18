"use client";

/**
 * FieldRecordPanel — calm reliability diagram. Motion only draws the line once
 * on view; no bouncing, no neon. Shows n and honest gated / thin states.
 */

import { useMemo, useState } from "react";
import { CalibrationCurve } from "@/components/home/calibration-curve";

type Point = {
  label: string;
  expectedWinRate: number;
  observedWinRate: number;
  sampleSize: number;
  sufficientSample: boolean;
};

export function FieldRecordPanel({
  sampleSize,
  gated,
  publicMessage,
  buckets,
}: {
  sampleSize: number;
  gated: boolean;
  publicMessage: string;
  buckets: readonly Point[];
}) {
  const [hover, setHover] = useState(false);
  const plotted = useMemo(() => buckets.filter((b) => b.sufficientSample), [buckets]);

  return (
    <div
      className="border border-mineral bg-eclipse p-5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          Reliability · settled sample
        </p>
        <p className="font-mono text-[11px] tabular-nums text-ion-1">
          n {sampleSize}
        </p>
      </div>
      {gated || plotted.length === 0 ? (
        <div className="mt-6 flex min-h-[200px] flex-col justify-center gap-2 border border-mineral/60 p-5">
          <p className="font-display text-xl text-ion-white">Not published yet</p>
          <p className="text-sm leading-6 text-ion-1">{publicMessage}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ion-2">
            {sampleSize} settled · curve stays dark until eligible
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <CalibrationCurve points={plotted} sampleSize={sampleSize} />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ion-2">
            Diagonal = perfect calibration · buckets need 30+ settled
          </p>
        </div>
      )}
      <p
        className="mt-4 border-t border-mineral pt-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors"
        style={{ color: hover ? "#FF4D2E" : "#8F8A82" }}
      >
        Open full record →
      </p>
    </div>
  );
}
