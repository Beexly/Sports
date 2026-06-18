import type { CommandLane } from "@/lib/cockpit/daily-command/types";
import { LaneShell } from "./lane-shell";

/**
 * The Approval Queue is the only transitionable lane: cards with a taskId carry
 * DecisionActions (rendered by CommandCardView via the shell). Seed/advisory
 * cards carry no taskId and therefore no buttons.
 */
export function LaneApprovalQueue({ lane }: { lane: CommandLane }): JSX.Element {
  return <LaneShell lane={lane} />;
}
