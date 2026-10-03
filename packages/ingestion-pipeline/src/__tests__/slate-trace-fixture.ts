import { reasonAbout } from "../reasoning-trace.js";
import type { SlateAcceptedTrace } from "../signal-slate-options.js";

export function associationTrace(): SlateAcceptedTrace {
  const result = reasonAbout(
    {
      question: "fixture for a slate test",
      unit: "game",
      interference: "UNKNOWN",
      targetFitOnQuestionSample: false,
    },
    [
      { id: "a", readingKind: "PROBABILITY", probability: 0.62, sampleCount: 100, outcome: "home", claim: "fixture" },
      { id: "b", readingKind: "PROBABILITY", probability: 0.63, sampleCount: 80, outcome: "home", claim: "fixture" },
    ],
  );
  if (!result.ok || result.data.conclusion !== "ASSOCIATION_ONLY") {
    throw new Error("slate fixture did not produce an association");
  }
  // The runtime guard above just verified the conclusion; the type-level
  // narrowing mirrors that verified fact (reasonAbout's return type carries
  // the full ReasoningConclusion union).
  return { ...result.data, conclusion: "ASSOCIATION_ONLY" };
}
