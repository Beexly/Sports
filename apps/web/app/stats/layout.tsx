import React from "react";
import { notFound } from "next/navigation";
import { isStatsPublic } from "@/lib/statking/public-gate";
import { StatsNav } from "./stats-nav";

/**
 * StatKing public surface. Default: hidden (404) until STATS_PUBLIC=true.
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
