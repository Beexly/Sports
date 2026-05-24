"use client";

import { RouteError } from "@/components/route/route-error";

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      segment="blog"
      error={error}
      reset={reset}
      description="The blog index failed to render. Hit retry, or browse from the homepage."
    />
  );
}
