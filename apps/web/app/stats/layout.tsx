import React from "react";
import { notFound } from "next/navigation";
import { isStatsPublic } from "@/lib/statking/public-gate";
import { StatsNav } from "./stats-nav";

/**
 * StatKing foundation surface. Default dark (404). Opt-in: STATS_PUBLIC=true only when rights + live readiness clear.
 * Admin StatKing lives under /admin/statking and is auth-gated separately.
 */
export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isStatsPublic()) {
    notFound();
  }

  return (
    <>
      <StatsNav />
      {children}
    </>
  );
}
