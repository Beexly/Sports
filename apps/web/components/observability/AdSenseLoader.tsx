"use client";

import React from "react";
import { usePathname } from "next/navigation";

export const ADSENSE_SCRIPT_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8151105906877749";

export function isEmbedPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/embed" || pathname.startsWith("/embed/");
}

export function AdSenseLoader({
  src = ADSENSE_SCRIPT_SRC,
}: {
  src?: string;
}): React.ReactElement | null {
  const pathname = usePathname();
  if (isEmbedPathname(pathname)) {
    return null;
  }
  return <script async src={src} crossOrigin="anonymous" />;
}
