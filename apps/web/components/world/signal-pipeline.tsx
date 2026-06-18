import { Reveal } from "@/components/motion/reveal";
import { BRAND_COLORS } from "@/lib/brand";

/**
 * SignalPipeline — numbered 5-step "how it works" section for the home page.
 *
 * Inspired by numbered educational infographics (Academic Research Skills,
 * YouTube architecture diagrams). Shows the full journey from raw data intake
 * to settled receipt: INGEST → SCORE → GATE → PUBLISH → RECEIPT.
 *
 * Desktop: 5-column grid with connecting arrow separators.
 * Mobile: vertical stack.
 * Server component — Reveal owns the client boundary internally.
 */

export type PipelineSummary = {
  activeSources: number;
  activeMetrics: number;
  candidateCount: number;
};

type Step = {
  num: string;
  label: string;
  description: string;
  stat?: string;
  color: string;
};

function buildSteps(summary: PipelineSummary): Step[] {
  return [
    {
      num: "01",
      label: "INGEST",
      description:
        "Rights-cleared data feeds polled across multiple books. Structured odds, player data, and media signal — all graded before a byte reaches the engine.",
      stat: `${summary.activeSources} active sources`,
      color: BRAND_COLORS.orbitalCyan,
    },
    {
      num: "02",
      label: "SCORE",
      description:
        "Four-factor model evaluates each game: market opportunity, pricing efficiency, line movement direction, and scheme context.",
      stat: `${summary.activeMetrics} active metrics`,
      color: BRAND_COLORS.softUltraviolet,
    },
    {
      num: "03",
      label: "GATE",
      description:
        "Confidence threshold check + No-Bet discipline + calibration alignment. More picks are rejected here than published — the gate is the product.",
      color: "#FFB454",
    },
    {
      num: "04",
      label: "PUBLISH",
      description:
        "Tiered picks ship with full factor trail, confidence score, and model version tag. Free tier gets the lowest-confidence promoted picks.",
      color: BRAND_COLORS.orbitalCyan,
    },
    {
      num: "05",
      label: "RECEIPT",
      description:
        "Every outcome settled against the closing line, CLV measured, model version logged. The record is tamper-evident from the moment of issue.",
      color: BRAND_COLORS.ionMagenta,
    },
  ];
}

export function SignalPipeline({ summary }: { summary: PipelineSummary }): JSX.Element {
  const steps = buildSteps(summary);

  return (
    <div>
      {/* Steps grid — an ordered sequence, so it's a real <ol> for SR users */}
      <ol className="grid list-none grid-cols-1 gap-8 p-0 lg:grid-cols-5 lg:gap-4">
        {steps.map((step, i) => {
          const next = steps[i + 1];
          return (
          <li key={step.num}>
          <Reveal delay={i * 90}>
            <div className="relative flex flex-col">
              {/* Connector line (desktop only) — right edge of each step except last */}
              {next && (
                <div
                  aria-hidden="true"
                  className="absolute -right-2 top-7 hidden h-px w-4 lg:block"
                  style={{ background: `linear-gradient(90deg, ${step.color}40, ${next.color}40)` }}
                />
              )}

              {/* Badge */}
              <div
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full"
                style={{
                  border: `1.5px solid ${step.color}40`,
                  boxShadow: `0 0 18px 0 ${step.color}28`,
                  background: `${step.color}0d`,
                }}
              >
                <span className="font-mono text-xl font-bold leading-none" style={{ color: step.color }}>
                  {step.num}
                </span>
              </div>

              {/* Label */}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: step.color }}>
                {step.label}
              </p>

              {/* Description */}
              <p className="mt-2 text-sm leading-6 text-ink-300">{step.description}</p>

              {/* Live stat chip */}
              {step.stat !== undefined && (
                <div className="mt-4">
                  <span
                    className="inline-block rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{
                      color: step.color,
                      background: `${step.color}1a`,
                      border: `1px solid ${step.color}33`,
                    }}
                  >
                    {step.stat}
                  </span>
                </div>
              )}
            </div>
          </Reveal>
          </li>
          );
        })}
      </ol>

      {/* Pro Tip callout (YouTube / Microservices pattern) */}
      <Reveal delay={520}>
        <div
          className="mt-10 rounded-xl border-l-4 p-5"
          style={{ borderColor: BRAND_COLORS.orbitalCyan, background: "rgba(0,229,255,0.04)" }}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: BRAND_COLORS.orbitalCyan }}
          >
            Pro Tip
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-300">
            The Gate rejects more picks than it publishes. A low published count is a feature,
            not a bug — it means the model only ships when the edge is real enough to defend.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
