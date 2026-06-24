export type DataVisualKind = "signal-trail" | "market-gravity-node" | "player-constellation" | "confidence-ring" | "volatility-fog" | "source-tick" | "clv-trail" | "calibration-ring" | "urgency-tower" | "broadcast-wave";

export interface DataVisualSpec {
  readonly id: string;
  readonly kind: DataVisualKind;
  readonly label: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

export const BEAT_BROADCAST_VISUALS: readonly DataVisualSpec[] = [
  { id: "weather-pulse", kind: "broadcast-wave", label: "Weather pulse", intensity: 0.8, position: [0, 1.8, -3] },
  { id: "proof-source", kind: "source-tick", label: "Proof source", intensity: 0.7, position: [-1.7, 1.2, -3] },
  { id: "urgent-route", kind: "urgency-tower", label: "Urgent route", intensity: 0.65, position: [1.7, 1.2, -3] },
  { id: "confidence-ring", kind: "confidence-ring", label: "Confidence ring", intensity: 0.72, position: [0, 0.12, -1.4] },
  { id: "market-gravity", kind: "market-gravity-node", label: "Market gravity", intensity: 0.58, position: [-3.2, 0.8, -1.8] },
  { id: "clv-trail", kind: "clv-trail", label: "Closing-line trail", intensity: 0.52, position: [3.2, 0.8, -1.8] },
  { id: "calibration-ring", kind: "calibration-ring", label: "Calibration ring", intensity: 0.62, position: [0, 0.1, 1.2] },
  { id: "volatility-fog", kind: "volatility-fog", label: "Volatility fog", intensity: 0.46, position: [0, 0.65, 0.2] },
];

export const BEAT_BROADCAST_INSTRUMENT_LAYERS = [
  "source-ledger-backplane",
  "broadcast-wave-rings",
  "urgency-towers",
  "confidence-calibration-rings",
  "market-gravity-nodes",
  "route-trails",
] as const;
