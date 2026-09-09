// design-sync shim: next/image -> plain img.
import * as React from "react";
type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string }; fill?: boolean; priority?: boolean; quality?: number;
  unoptimized?: boolean; sizes?: string; placeholder?: string; blurDataURL?: string;
};
export default function Image({ src, fill, priority, quality, unoptimized, placeholder, blurDataURL, style, ...rest }: ImageProps) {
  const s = typeof src === "string" ? src : src.src;
  const st = fill ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const, ...style } : style;
  return <img src={s} style={st} {...rest} />;
}
