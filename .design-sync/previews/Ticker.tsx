// Authored design-sync preview for Ticker.
import { Ticker } from "sports-prediction-platform";

const items = [
  "Deterministic factor model",
  "No fabricated stats",
  "Every line timestamped",
  "Math you can read",
] as const;

export const Default = () => <Ticker items={items} />;

export const Reverse = () => <Ticker items={items} reverse durationSec={24} />;
