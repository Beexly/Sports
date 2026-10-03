"use client";

import dynamic from "next/dynamic";

export const SignalCoreLazy = dynamic(
  () => import("./signal-core-environment").then((m) => ({ default: m.SignalCoreEnvironment })),
  { ssr: false }
);
