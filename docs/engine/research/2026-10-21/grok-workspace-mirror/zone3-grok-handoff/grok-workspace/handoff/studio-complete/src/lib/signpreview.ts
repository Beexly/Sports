export const SIGN_TYPES = [
  { id: "storefront", label: "Storefront" },
  { id: "monument", label: "Monument" },
  { id: "banner", label: "Banner" },
  { id: "window", label: "Window lettering" },
] as const;

export const SIGN_STYLES = [
  { id: "modern", label: "Modern bold" },
  { id: "classic", label: "Classic serif" },
  { id: "neon", label: "Neon" },
  { id: "rustic", label: "Rustic wood" },
] as const;

export type SignType = (typeof SIGN_TYPES)[number]["id"];
export type SignStyle = (typeof SIGN_STYLES)[number]["id"];

const TYPESET: Record<
  SignStyle,
  { family: string; weight: string; color: string; tracking: number; upper: boolean; glow?: string }
> = {
  modern: { family: "Outfit, sans-serif", weight: "700", color: "#f4ede4", tracking: 0.08, upper: true },
  classic: { family: "Instrument Serif, serif", weight: "400", color: "#e9c86e", tracking: 0.04, upper: false },
  neon: { family: "Instrument Serif, serif", weight: "400", color: "#ffe3b3", tracking: 0.02, upper: false, glow: "#c17a4a" },
  rustic: { family: "Instrument Serif, serif", weight: "400", color: "#f5e9d4", tracking: 0.05, upper: false },
};

const ZONES: Record<SignType, { x: number; y: number; w: number; h: number; panel: boolean }> = {
  storefront: { x: 0.5, y: 0.3, w: 0.62, h: 0.18, panel: true },
  monument: { x: 0.5, y: 0.42, w: 0.48, h: 0.22, panel: true },
  banner: { x: 0.5, y: 0.38, w: 0.78, h: 0.2, panel: true },
  window: { x: 0.52, y: 0.48, w: 0.42, h: 0.2, panel: false },
};

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: string,
  maxW: number,
  start: number,
) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 18 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

export function composeSign(
  canvas: HTMLCanvasElement,
  photo: HTMLImageElement,
  opts: { name: string; tagline: string; type: SignType; style: SignStyle },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(photo, 0, 0, W, H);

  const zone = ZONES[opts.type];
  const ts = TYPESET[opts.style];
  const label = ts.upper ? opts.name.toUpperCase() : opts.name;
  const panelW = zone.w * W;
  const panelH = zone.h * H;
  const px = zone.x * W - panelW / 2;
  const py = zone.y * H - panelH / 2;

  if (zone.panel) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, px, py, panelW, panelH, 14);
    ctx.fillStyle = opts.style === "neon" ? "#0e0c0a" : opts.style === "rustic" ? "#3a2a1c" : "#1a1814";
    ctx.fill();
    ctx.restore();
    const sheen = ctx.createLinearGradient(0, py, 0, py + panelH);
    sheen.addColorStop(0, "rgba(255,255,255,0.1)");
    sheen.addColorStop(0.3, "rgba(255,255,255,0)");
    roundRect(ctx, px, py, panelW, panelH, 14);
    ctx.fillStyle = sheen;
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const maxW = panelW * 0.88;
  const size = fitFont(ctx, label, ts.family, ts.weight, maxW, 92);
  const nameY = opts.tagline ? zone.y * H - panelH * 0.12 : zone.y * H;

  ctx.save();
  if (ts.glow) {
    ctx.shadowColor = ts.glow;
    ctx.shadowBlur = size * 0.55;
    ctx.fillStyle = ts.glow;
    ctx.fillText(label, zone.x * W, nameY);
    ctx.shadowBlur = size * 0.2;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = ts.color;
  ctx.fillText(label, zone.x * W, nameY);
  ctx.restore();

  if (opts.tagline) {
    ctx.font = `500 ${Math.max(14, size * 0.28)}px Outfit, sans-serif`;
    ctx.fillStyle = "rgba(244,237,228,0.78)";
    ctx.shadowBlur = 0;
    ctx.fillText(opts.tagline, zone.x * W, nameY + size * 0.55);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
