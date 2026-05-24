"use client";

import { RouteError } from "@/components/route/route-error";

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      segment="pricing"
      error={error}
      reset={reset}
      description="Pricing page failed to render. Stripe configuration is unaffected — hit retry."
    />
  );
}
