import type { CommandLane } from "@/lib/cockpit/daily-command/types";
import { LaneShell } from "./lane-shell";

export function LaneLessons({ lane }: { lane: CommandLane }): JSX.Element {
  return <LaneShell lane={lane} />;
}
