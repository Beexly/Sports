import { COST } from "@/lib/doctrine";
import { Meta, Num, Panel, Stamp } from "@/components/keel/ui";

const RUNGS = [
  {
    name: "Local CPU",
    state: "On",
    tone: "good" as const,
    detail:
      "Owns isotonic, Brier, and closing-line value. τ̂ is on this rung and is not defined. No model call leaves this machine for those three.",
  },
  {
    name: "NVIDIA NIM",
    state: "First, if a reviewer is ever armed",
    tone: "flat" as const,
    detail: `Build developer key, OpenAI-compatible at integrate.api.nvidia.com. About ${COST.nimRpm} requests a minute and ${COST.nimDaily.toLocaleString()} a day. Phone verify. Not a production license. This console does not hold a key, so the rung is dark.`,
  },
  {
    name: "Together serverless",
    state: `Overflow, cap $${COST.togetherWeekCap}/week`,
    tone: "warn" as const,
    detail: `gpt-oss-120b near $${COST.togetherIn.toFixed(2)} / $${COST.togetherOut.toFixed(2)} per million tokens. A thousand short reviews are under a dollar. The contract demands JSON in content. Empty content is a miss. Qwen3.5-9B already returned empty content at ${COST.qwenMissTokens} tokens.`,
  },
  {
    name: "Three LoRAs",
    state: "Paid. Not callable.",
    tone: "warn" as const,
    detail: `Each API total_price is ${COST.loraTotalPriceRaw}. If the unit is nanodollars, that is the $${COST.loraEachIfNanodollars} minimum, about $${COST.loraCount * COST.loraEachIfNanodollars} if billing agrees. Confirm that page. A chat to the newest 9B returned model_not_available until a dedicated endpoint exists. Do not start it.`,
  },
  {
    name: "Together H100",
    state: "Off. Stays off.",
    tone: "warn" as const,
    detail: `$${COST.h100Hourly.toFixed(2)} an hour, about $${Math.round(COST.h100Day)} a day if the replica is left up. It was not started. It will not be started for a 20-row probe. NVIDIA AI Enterprise is about $${COST.enterprisePerGpuYear.toLocaleString()} per GPU per year. Do not buy it.`,
  },
];

export function CostView() {
  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <Meta>Unlock</Meta>
        <h2 className="mt-2 text-3xl">No rented card until the closing-line column has 200 settled rows.</h2>
        <p className="mt-3 max-w-3xl text-fg">
          The count is not in the closed record. The gate is shut. A schedule file with one spread is not a bet-time price and a close, so it cannot be used to open the gate. Shin’s de-vig is the method on the shelf. It is not coded here, because a wrong de-vig would invent a probability.
        </p>
        <p className="mt-4 font-mono text-2xl tabular-nums text-accent">
          <Num>0</Num>
          <span className="text-muted"> / {COST.clvRowsRequired} settled</span>
        </p>
        <p className="mt-1 font-mono text-sm text-muted">Shown as zero because the column was never supplied. Not because zero rows were measured.</p>
      </Panel>

      <ol className="flex flex-col gap-3">
        {RUNGS.map((rung, index) => (
          <li key={rung.name}>
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Meta>
                  {index === 0 ? "Always" : `Rung ${index}`} · {rung.name}
                </Meta>
                <Stamp tone={rung.tone}>{rung.state}</Stamp>
              </div>
              <p className="mt-3 text-fg">{rung.detail}</p>
            </Panel>
          </li>
        ))}
      </ol>

      <Panel>
        <Meta>What a reviewer must return, in content</Meta>
        <pre className="mt-4 overflow-x-auto border border-line bg-bg p-4 font-mono text-sm leading-6 text-fg">{`{
  "verdict": "admit" | "hold" | "reject",
  "grain": "play" | "week" | "season" | "market" | "theory",
  "fills_null": false,
  "equation": null,
  "why": "one sentence tied to a law"
}`}</pre>
        <p className="mt-4 text-fg">
          A reasoning trace with an empty content field spends the budget and counts as a miss. This console does not place that call. The sorter you are looking at is the CPU.
        </p>
      </Panel>
    </div>
  );
}
