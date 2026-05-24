"use client";

import { RouteError } from "@/components/route/route-error";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      segment="dashboard"
      error={error}
      reset={reset}
      homeHref="/picks"
      description="The dashboard hit a runtime error. Hit retry, or jump straight to today's picks."
    />
  );
}
