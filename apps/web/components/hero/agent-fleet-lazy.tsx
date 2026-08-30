"use client";

import dynamic from "next/dynamic";

export const AgentFleetLazy = dynamic(
  () => import("./agent-fleet").then((m) => ({ default: m.AgentFleet })),
  { ssr: false }
);
