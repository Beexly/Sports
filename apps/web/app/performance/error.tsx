"use client";

import { RouteError } from "@/components/route/route-error";

export default function PerformanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      segment="performance"
      error={error}
      reset={reset}
      description="The performance page failed to render. Underlying stats are unaffected — hit retry."
    />
  );
}
