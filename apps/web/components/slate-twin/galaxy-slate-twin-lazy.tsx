"use client";

/**
 * Lazy boundary for the Galaxy Slate Twin (Edge Map).
 *
 * The heavy three.js GL instrument is kept out of the route's first-load JS via
 * dynamic ssr:false, and is only mounted once the section scrolls into view
 * (IntersectionObserver). Until then - and while the chunk streams in - the
 * GL-free GalaxySlateTwinStatic stands in, so first paint and LCP never wait on
 * WebGL. The static fallback carries the real slate content, so nothing is lost
 * for users who never scroll here or who run with JS-heavy chunks deferred.
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { TwinSlate } from "@/lib/slate-twin/demo-slate";
import { GalaxySlateTwinStatic } from "./galaxy-slate-twin-static";

const GalaxySlateTwinInner = dynamic(
  () => import("./galaxy-slate-twin").then((m) => ({ default: m.GalaxySlateTwin })),
  { ssr: false, loading: () => null },
);

export function GalaxySlateTwinLazy({ slate }: { slate: TwinSlate }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    // Mount the GL layer a little before it enters the viewport for a seamless swap.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div ref={ref}>
      {show ? <GalaxySlateTwinInner slate={slate} /> : <GalaxySlateTwinStatic slate={slate} />}
    </div>
  );
}
