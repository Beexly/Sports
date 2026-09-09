// design-sync shim: next/image -> plain img. Absolute `/public` paths that components hardcode are
// mapped to inlined data URIs (the design runtime has no apps/web/public to serve them from).
import * as React from "react";
import emblem180 from "../../apps/web/public/brand/gse-emblem-180.png";

const PUBLIC_ASSETS: Record<string, string> = {
  "/brand/gse-emblem-180.png": emblem180,
  // The full-size emblem is 500 KB; the 180px render is visually identical at lockup sizes.
  "/brand/gse-emblem.png": emblem180,
};

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string }; fill?: boolean; priority?: boolean; quality?: number;
  unoptimized?: boolean; sizes?: string; placeholder?: string; blurDataURL?: string;
};
export default function Image({ src, fill, priority, quality, unoptimized, placeholder, blurDataURL, style, ...rest }: ImageProps) {
  const raw = typeof src === "string" ? src : src.src;
  const s = PUBLIC_ASSETS[raw] ?? raw;
  const st = fill ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const, ...style } : style;
  return <img src={s} style={st} {...rest} />;
}
