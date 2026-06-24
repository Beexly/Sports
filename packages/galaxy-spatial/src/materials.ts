import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import type { Scene } from "@babylonjs/core/scene.js";

export const SPATIAL_COLORS = {
  obsidian: "#05070d",
  stadiumGold: "#f4c95d",
  signalCyan: "#00e5ff",
  ultraviolet: "#7a5cff",
  cyberMagenta: "#ff2dd6",
  verifyTeal: "#20d6b5",
  alertAmber: "#ffb020",
  fog: "#8091b3",
  glass: "#162033",
  grid: "#23304d",
  cardGlow: "#f6d77a",
  weatherRookieHeat: "#f4c95d",
  weatherInjuryFog: "#7a5cff",
  weatherUpsetStorm: "#ff2dd6",
  weatherMarketWhiplash: "#ffb020",
} as const;

export type SpatialMaterialToken = keyof typeof SPATIAL_COLORS;

export const WEATHER_OVERLAY_COLORS = {
  upset_storm: SPATIAL_COLORS.cyberMagenta,
  rookie_heat: SPATIAL_COLORS.stadiumGold,
  injury_fog: SPATIAL_COLORS.ultraviolet,
  trade_shock: SPATIAL_COLORS.signalCyan,
  playoff_pressure: SPATIAL_COLORS.stadiumGold,
  public_collapse: SPATIAL_COLORS.cyberMagenta,
  card_heat: SPATIAL_COLORS.cardGlow,
  rivalry_surge: SPATIAL_COLORS.cyberMagenta,
  deadline_shock: SPATIAL_COLORS.signalCyan,
  championship_gravity: SPATIAL_COLORS.stadiumGold,
  fantasy_waiver_surge: SPATIAL_COLORS.signalCyan,
  slump_watch: SPATIAL_COLORS.ultraviolet,
  breakout_signal: SPATIAL_COLORS.verifyTeal,
  market_whiplash: SPATIAL_COLORS.alertAmber,
} as const;

export function createSpatialMaterial(scene: Scene, token: SpatialMaterialToken, alpha = 1): StandardMaterial {
  const material = new StandardMaterial(`galaxy-${token}`, scene);
  material.diffuseColor = Color3.FromHexString(SPATIAL_COLORS[token]);
  material.emissiveColor = Color3.FromHexString(SPATIAL_COLORS[token]).scale(token === "obsidian" ? 0.04 : 0.18);
  material.specularColor = Color3.FromHexString("#ffffff").scale(0.16);
  material.alpha = alpha;
  return material;
}
