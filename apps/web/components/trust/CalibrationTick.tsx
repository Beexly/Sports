/**
 * CalibrationTick — ambient visual heartbeat of the system.
 *
 * A subtle pulse that indicates the calibration layer is alive. Used on
 * T1 surfaces (today, picks, room). Respects prefers-reduced-motion.
 *
 * Visual only. Does not poll the server. The tick is a presence cue,
 * not a network signal — it pulses at a steady cadence to communicate
 * "the data is being watched."
 */

import * as React from "react";

export interface CalibrationTickProps {
  readonly label?: string;
  readonly className?: string;
}

export function CalibrationTick({
  label = "Calibration live",
  className,
}: CalibrationTickProps): JSX.Element {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5",
        className ?? "",
      ].join(" ")}
      aria-label={label}
    >
      <span className="relative inline-flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-70 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
      </span>
      <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-cyan-300/80">
        {label}
      </span>
    </span>
  );
}
