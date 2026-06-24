import type { GameBossDef } from "./types.js";

export const GAME_KERNEL_BOSSES: readonly GameBossDef[] = [
  { id: "public-trap", name: "Public Trap", lesson: "Crowd pressure is context, not a command.", signalPattern: "Resist the lopsided crowd lean and explain the better evidence.", rewardItemId: "risk-band", difficulty: 1, unlockQuestId: "face-the-public-trap", sceneMarkerId: "public-trap-marker" },
  { id: "recency-wraith", name: "Recency Wraith", lesson: "A fresh highlight can hide a larger sample.", signalPattern: "Separate recent noise from repeatable role change.", rewardItemId: "calibration-chip", difficulty: 2, unlockQuestId: "visit-calibration-kiosk", sceneMarkerId: "depths-gate" },
  { id: "injury-fog", name: "Injury Fog", lesson: "Uncertainty should lower confidence before it raises action.", signalPattern: "Mark the missing-info risk and wait for proof.", rewardItemId: "weather-chip", difficulty: 2, unlockQuestId: "mark-injury-fog", sceneMarkerId: "depths-gate" },
  { id: "line-move-mimic", name: "Line-Move Mimic", lesson: "Movement without source context is not enough.", signalPattern: "Map the reason before trusting the move.", rewardItemId: "market-compass", difficulty: 3, unlockQuestId: "check-market-whiplash", sceneMarkerId: "beat-wall-marker" },
  { id: "parlay-hydra", name: "Parlay Hydra", lesson: "Stacked certainty breaks discipline.", signalPattern: "Cut the chain into one explainable read.", rewardItemId: "signal-badge", difficulty: 4, unlockQuestId: "complete-rookie-loop", sceneMarkerId: "public-trap-marker" },
];
