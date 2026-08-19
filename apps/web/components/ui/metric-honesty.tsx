import type { ReactNode } from "react";

export interface MetricHonestyProps {
  readonly measures: ReactNode;
  readonly doesNotMeasure: ReactNode;
  readonly caveat?: ReactNode;
}

export function MetricHonesty({ measures, doesNotMeasure, caveat }: MetricHonestyProps): JSX.Element {
  return (
    <div className="rounded-xl border border-mineral bg-eclipse/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-orbital-cyan">
            What this measures
          </p>
          <p className="mt-1 text-sm leading-6 text-ion-1">{measures}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-2">
            What it does not measure
          </p>
          <p className="mt-1 text-sm leading-6 text-ion-1">{doesNotMeasure}</p>
        </div>
      </div>
      {caveat != null && (
        <p className="mt-3 text-xs leading-5 text-ion-2">{caveat}</p>
      )}
    </div>
  );
}
