export const MATERIALS = [
  { id: "vinyl", label: "Vinyl lettering", note: "Windows, trucks, short-run storefront type." },
  { id: "acm", label: "ACM panel", note: "Flat storefront cabinets. Weather-honest." },
  { id: "channel", label: "Channel letters", note: "Lit letters. The one they photograph." },
  { id: "monument", label: "Monument", note: "Freestanding at the drive. Permits extra." },
] as const;

export type MaterialId = (typeof MATERIALS)[number]["id"];

export function letterHeightInches(viewingFeet: number) {
  return Math.max(4, Math.round(viewingFeet / 10));
}

export function ballpark(opts: {
  widthFt: number;
  heightFt: number;
  viewFt: number;
  material: MaterialId;
}) {
  const area = Math.max(1, opts.widthFt * opts.heightFt);
  const letters = letterHeightInches(opts.viewFt);
  let low = 0;
  let high = 0;
  if (opts.material === "vinyl") {
    low = area * 12 * 0.75;
    high = area * 12 * 1.35;
  } else if (opts.material === "acm") {
    low = area * 35 + 120;
    high = area * 35 * 1.4 + 280;
  } else if (opts.material === "channel") {
    const inches = letters * 8;
    low = inches * 110 * 0.7;
    high = inches * 110 * 1.2;
  } else {
    low = 4500 + area * 40;
    high = 4500 * 1.4 + area * 40 * 1.5;
  }
  const spec = MATERIALS.find((m) => m.id === opts.material)!;
  return {
    area,
    letters,
    low: Math.round(low / 25) * 25,
    high: Math.round(high / 25) * 25,
    spec,
  };
}
