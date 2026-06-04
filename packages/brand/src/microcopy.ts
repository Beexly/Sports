import { identity } from "./identity";

export const microcopy = {
  loading: {
    title: "Reading the board",
    body: "Prices, freshness, and market depth are being checked.",
  },
  empty: {
    title: "Nothing cleared the gate",
    body: "Silence is a decision. If the evidence is thin, the board stays quiet.",
  },
  error: {
    title: "The board did not load",
    body: "Refresh once. If it sticks, the desk will treat it like an incident.",
  },
  disclaimer: {
    short:
      "Sports betting involves risk. Use this as information, not instruction.",
    standard:
      `${identity.productName} publishes market context, not certainty. Bet only what you can afford to lose.`,
    responsible:
      "If betting stops being fun, step away and use the responsible-gaming resources available in your state.",
  },
} as const;
