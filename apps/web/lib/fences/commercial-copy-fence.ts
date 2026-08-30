import { scanCommercialCopy } from "@/lib/revenue/banned-copy";

import { block, pass, type FencePlugin } from "./fence-types";

const FENCE_ID = "commercial-copy";

export const commercialCopyFence: FencePlugin = {
  description: "Blocks tout-style betting copy and unsupported commercial proof language.",
  evaluate(input) {
    const text = input.text ?? "";
    if (text.trim().length === 0) return pass(FENCE_ID);

    const scan = scanCommercialCopy(text);
    if (scan.ok) return pass(FENCE_ID);

    return block(
      FENCE_ID,
      [
        ...scan.blockedTerms.map((term) => `Banned commercial phrase: ${term}.`),
        ...scan.evidenceRequiredTerms.map((term) => `Evidence-required phrase needs approval: ${term}.`),
      ],
      [
        "Remove tout language.",
        "Attach source, sample window, approval state, and evidence refs before using performance claims.",
      ],
    );
  },
  id: FENCE_ID,
};
