"use client";

import { RouteError } from "@/components/route/route-error";

export default function PicksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      segment="picks"
      error={error}
      reset={reset}
      description="The picks feed failed to render. Hit retry, or head back to the homepage."
    />
  );
}
