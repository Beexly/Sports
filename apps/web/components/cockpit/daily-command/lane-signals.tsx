import type { CommandLane, SignalGauge } from "@/lib/cockpit/daily-command/types";
import { RingGauge } from "@/components/ui/ring-gauge";
import { LaneShell } from "./lane-shell";

const TONE_COLOR: Record<SignalGauge["tone"], string> = {
  ok: "#34d399",
  warn: "#fbbf24",
  critical: "#fb7185",
};

export function LaneSignals({
  lane,
  gauges,
}: {
  lane: CommandLane;
  gauges: readonly SignalGauge[];
}): JSX.Element {
  return (
    <LaneShell lane={lane}>
      {gauges.length > 0 && (
        <div className="mb-3 flex flex-wrap justify-center gap-4">
          {gauges.map((g) => (
            <RingGauge
              key={g.label}
              value={g.value}
              display={g.display}
              caption={`${g.label} · ${g.caption}`}
              size={104}
              color={TONE_COLOR[g.tone]}
            />
          ))}
        </div>
      )}
    </LaneShell>
  );
}
