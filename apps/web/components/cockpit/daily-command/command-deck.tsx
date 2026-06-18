import type { DailyCommand, CommandLane } from "@/lib/cockpit/daily-command/types";
import { Reveal } from "@/components/motion/reveal";
import { LaneMoneyNext } from "./lane-money-next";
import { LaneApprovalQueue } from "./lane-approval-queue";
import { LaneAgentActivity } from "./lane-agent-activity";
import { LaneSignals } from "./lane-signals";
import { LaneLessons } from "./lane-lessons";

function laneByKey(command: DailyCommand, key: CommandLane["key"]): CommandLane | undefined {
  return command.lanes.find((l) => l.key === key);
}

/**
 * CommandDeck — the five-lane, exception-based owner command center.
 *
 * Money Next · Approval Queue · Agent Activity · Signals · Lessons.
 * Each lane is wrapped in <Reveal> for the staggered cinematic entrance. The
 * Approval Queue gets the widest column because it is where the owner acts.
 */
export function CommandDeck({ command }: { command: DailyCommand }): JSX.Element {
  const moneyNext = laneByKey(command, "money_next");
  const approvalQueue = laneByKey(command, "approval_queue");
  const agentActivity = laneByKey(command, "agent_activity");
  const signals = laneByKey(command, "signals");
  const lessons = laneByKey(command, "lessons");

  return (
    <div data-testid="command-deck" className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Approval Queue — the action column, widest */}
        {approvalQueue && (
          <Reveal className="lg:col-span-5" delay={0}>
            <LaneApprovalQueue lane={approvalQueue} />
          </Reveal>
        )}
        {/* Money Next + Signals stack in the middle */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {moneyNext && (
            <Reveal delay={80}>
              <LaneMoneyNext lane={moneyNext} />
            </Reveal>
          )}
          {signals && (
            <Reveal delay={160}>
              <LaneSignals lane={signals} gauges={command.signalGauges} />
            </Reveal>
          )}
        </div>
        {/* Agent Activity + Lessons stack on the right */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          {agentActivity && (
            <Reveal delay={120}>
              <LaneAgentActivity lane={agentActivity} />
            </Reveal>
          )}
          {lessons && (
            <Reveal delay={200}>
              <LaneLessons lane={lessons} />
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
}
