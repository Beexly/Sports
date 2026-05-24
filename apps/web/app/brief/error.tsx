"use client";

import { RouteError } from "@/components/route/route-error";

export default function BriefError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      segment="brief"
      error={error}
      reset={reset}
      description="The daily brief failed to render. Hit retry — content is composed fresh each load."
    />
  );
}
